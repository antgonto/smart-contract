import datetime
import os
from subprocess import run

import web3
from web3 import Web3
import ipfshttpclient
from django.contrib.auth import get_user_model
from ninja import Router, Schema
from ninja.errors import HttpError
from pydantic import BaseModel
import hashlib
from PyPDF2 import PdfReader
from ninja.files import UploadedFile
from app.api import SEEDWeb3
from app.api.contract_manager import ContractManager
from django.http import HttpResponse
from django.contrib.sessions.models import Session
from django.utils import timezone

router = Router()

manager = ContractManager()
manager.refresh()

IPFS_API_URL = os.getenv("IPFS_API_URL", "/dns/ipfs/tcp/5001/http")


class CertificateIn(BaseModel):
    cert_hash: str
    recipient: str
    metadata: str
    content: str = ""


class CertificateOut(BaseModel):
    cert_hash: str
    issuer: str
    recipient: str
    ipfs_hash: str
    created: str


class CertificateUploadIn(BaseModel):
    recipient: str
    metadata: str = ""


class DeployResponse(Schema):
    success: list[bool]
    output: list[str]


class CompileResponse(Schema):
    success: list[bool]
    output: list[str]


class CertificateResponse(Schema):
    ipfs_hash: str
    cert_hash: str
    tx_hash: str | None = None
    message: str | None = None


class CertificateListItem(Schema):
    cert_hash: str
    issuer: str | None = None
    recipient: str | None = None
    metadata: str | None = None
    content: str | None = None
    ipfs_hash: str | None = None
    block_number: int | None = None
    transaction_hash: str | None = None
    log_index: int | None = None


class CertificateListResponse(Schema):
    certificates: list[CertificateListItem]


class DashboardMetrics(Schema):
    total_certificates: int
    onchain_certificates: int
    offchain_certificates: int
    recent_registrations: int
    revocations: int
    signature_verifications: int
    nfts_minted: int
    nfts_transferred: int
    oracle_calls: int
    blockchain_node_status: str
    ipfs_node_status: str
    backend_status: str
    queue_status: str
    recent_operations: list
    logs: list
    total_users: int
    issuers: int
    active_sessions: int


@router.post("/register/", response=CertificateOut)
def register_certificate_from_pdf(request, file: UploadedFile, recipient: str):
    contract = manager.get_contract()
    if contract is None:
        raise HttpError(500, f"Contract not loaded: {manager.get_error()}")
    # 1. Read PDF bytes
    pdf_bytes = file.read()
    # 2. Calculate hash
    cert_hash = hashlib.sha256(pdf_bytes).hexdigest()
    # 3. Extract metadata
    reader = PdfReader(file)
    metadata = reader.metadata
    print(metadata)

    meta_dict = {
        "title": metadata.title,
        "author": metadata.author,
        "subject": metadata.subject,
        "producer": metadata.producer,
        "created": str(metadata.creation_date),
    }
    print("meta_dict: ", meta_dict)
    # 4. Upload to IPFS (offchain) and get IPFS hash
    with ipfshttpclient.connect(IPFS_API_URL) as client:
        res = client.add_bytes(pdf_bytes)
        ipfs_hash = res
    # 5. Register on blockchain, storing the IPFS hash as metadata
    issuer = manager.web3.eth.accounts[0]
    cert_hash_bytes = bytes.fromhex(cert_hash[2:] if cert_hash.startswith('0x') else cert_hash)
    if not (isinstance(recipient, str) and recipient.startswith('0x') and len(recipient) == 42):
        raise HttpError(400, f"Recipient must be a valid Ethereum address (got: {recipient})")
    try:
        contract.functions.registerCertificate(
            cert_hash_bytes,
            Web3.to_checksum_address(recipient),
            ipfs_hash,  # Store IPFS hash as metadata
            str(meta_dict),  # Optionally store metadata as content
        ).transact({"from": issuer})
    except Exception as e:
        from web3.exceptions import ContractLogicError
        if isinstance(e, ContractLogicError) and "Certificate already exists" in str(e):
            raise HttpError(409, "Certificate already exists for this hash.")
        raise
    return CertificateOut(
        cert_hash=cert_hash,
        issuer=issuer,
        recipient=recipient,
        ipfs_hash=ipfs_hash,  # Return IPFS hash as metadata
        created=str(metadata.creation_date)
    )


@router.post("/compile/", response=CompileResponse)
def compile_contract(request):
    success_process = []
    output_process = []
    contract_files = [
        os.path.join(manager.contracts_dir, file_name)
        for file_name in sorted(os.listdir(manager.contracts_dir))
        if os.path.isfile(os.path.join(manager.contracts_dir, file_name)) and file_name.endswith(".sol")
    ]
    for file_name in contract_files:
        try:
            print(f"Compiling contract: {file_name}")
            result = run(
                ["solc", "--overwrite", "--bin", "--abi", file_name, "-o", manager.contracts_dir],
                capture_output=True,
                text=True,
            )
            print(result.stdout)
        except FileNotFoundError as e:
            raise HttpError(
                500,
                "solc compiler not found. Please install solc and ensure it is in your PATH.",
            ) from e
        success = result.returncode == 0
        output = result.stdout if success else result.stderr
        success_process.append(success)
        output_process.append(output)
    # Refresh contract manager state after compilation (ABI may have changed)
    manager.refresh()
    return CompileResponse(success=success_process, output=output_process)


@router.post("/deploy/", response=DeployResponse)
def deploy_contract(request):
    contract_files = [
        os.path.join(manager.contracts_dir, file_name)
        for file_name in sorted(os.listdir(manager.contracts_dir))
        if os.path.isfile(os.path.join(manager.contracts_dir, file_name)) and (file_name.endswith(".abi") or file_name.endswith(".bin"))
    ]
    deployed_contracts = []
    errors = []
    for file_name in contract_files:
        try:
            base_filename = file_name.split(".")[0]
            abi_file = f"{base_filename}.abi"
            bin_file = f"{base_filename}.bin"

            if not os.path.exists(abi_file) or not os.path.exists(bin_file):
                raise Exception(f"ABI or BIN file missing for {base_filename}")

            # Use the correct web3 instance and get accounts from it
            sender_account = manager.web3.eth.accounts[1]
            addr = SEEDWeb3.deploy_contract(manager.web3, sender_account, abi_file, bin_file, None)

            with open(f"{base_filename}.txt", "w") as fd:
                fd.write(addr)
            deployed_contracts.append(f"Contract deployed successfully: {addr}")

        except Exception as e:
            import traceback
            tb = traceback.format_exc()
            print(f"Error deploying {file_name}: {e}\n{tb}")
            errors.append(f"failed processing contract file: {file_name}. Error: {e}")
    if errors:
        raise HttpError(500, " | ".join(errors))
    # Refresh contract manager state after deployment (address may have changed)
    manager.refresh()
    return DeployResponse(success=[True], output=deployed_contracts)

@router.post("/upload_offchain", response=CertificateResponse)
def upload_certificate_offchain(request, file, payload):
    try:
        with ipfshttpclient.connect(IPFS_API_URL) as client:
            res = client.add(file.file)
            ipfs_hash = res["Hash"]
    except Exception as e:
        raise HttpError(500, f"IPFS upload failed: {str(e)}") from e
    try:
        cert_hash = Web3.keccak(text=ipfs_hash).hex()
        issuer = web3.eth.accounts[0]
        tx = manager.contract.functions.registerCertificate(
            Web3.to_bytes(hexstr=cert_hash),
            Web3.to_checksum_address(payload.recipient),
            ipfs_hash,
            "",
        ).transact({"from": issuer})
        web3.eth.wait_for_transaction_receipt(tx)
        # TODO: Log to PostgreSQL (certificate, tx hash, user info)
        return CertificateResponse(
            ipfs_hash=ipfs_hash, cert_hash=cert_hash, tx_hash=tx.hex()
        )
    except Exception as e:
        raise HttpError(500, f"Blockchain registration failed: {str(e)}") from e
#
#
@router.get("/download_offchain/{ipfs_hash}")
def download_certificate_offchain(request, ipfs_hash: str):
    try:
        with ipfshttpclient.connect(IPFS_API_URL) as client:
            data = client.cat(ipfs_hash)
        # Return as a file response
        response = HttpResponse(data, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{ipfs_hash}.pdf"'
        return response
    except Exception as e:
        raise HttpError(404, f"IPFS download failed: {str(e)}") from e


@router.get("/list_certificates", response=CertificateListResponse)
def list_certificates(request):
    certificates = []
    try:
        manager.refresh()
        contract = manager.get_contract()
        events = contract.events.CertificateRegistered().get_logs(fromBlock=0)
        for event in events:
            cert_hash = event.args.certHash.hex()
            issuer = getattr(event.args, 'issuer', None)
            recipient = getattr(event.args, 'recipient', None)
            metadata = getattr(event.args, 'metadata', None)
            content = getattr(event.args, 'content', None)
            ipfs_hash = metadata if isinstance(metadata, str) and len(metadata) >= 46 and metadata.startswith("Qm") else None
            block_number = getattr(event, 'blockNumber', None)
            transaction_hash = event.transactionHash.hex() if hasattr(event, 'transactionHash') else None
            log_index = getattr(event, 'logIndex', None)
            certificates.append({
                "cert_hash": cert_hash,
                "issuer": issuer,
                "recipient": recipient,
                "metadata": metadata,
                "content": content,
                "ipfs_hash": ipfs_hash,
                "block_number": block_number,
                "transaction_hash": transaction_hash,
                "log_index": log_index,
            })
        return CertificateListResponse(certificates=certificates)
    except Exception as e:
        raise HttpError(500, f"Failed to list certificates: {str(e)}") from e


@router.get("/dashboard/metrics", response=DashboardMetrics)
def dashboard_metrics(request):
    contract = manager.get_contract()
    onchain = 0
    offchain = 0
    total_certificates = 0
    recent_registrations = 0
    recent_registrations_details = []
    try:
        if contract is not None:
            # Fetch CertificateRegistered events
            reg_events = contract.events.CertificateRegistered().get_logs(fromBlock=0)
            onchain = len(reg_events)
            offchain = 0
            for event in reg_events:
                metadata = event.args.metadata
                if isinstance(metadata, str) and len(metadata) >= 46 and metadata.startswith("Qm"):
                    offchain += 1
            total_certificates = onchain
            # Fetch CertificateRevoked events if available
            try:
                rev_events = contract.events.CertificateRevoked().get_logs(fromBlock=0)
            except Exception:
                rev_events = []
            # Combine all events for recent operations
            all_events = []
            for event in reg_events:
                all_events.append({
                    "event": "CertificateRegistered",
                    "blockNumber": getattr(event, 'blockNumber', 0),
                    "actor": getattr(event.args, 'issuer', 'unknown') if hasattr(event.args, 'issuer') else 'unknown',
                    "operation": "Issued Certificate",
                    "type": "On-chain",
                    "event_obj": event
                })
            for event in rev_events:
                all_events.append({
                    "event": "CertificateRevoked",
                    "blockNumber": getattr(event, 'blockNumber', 0),
                    "actor": getattr(event.args, 'issuer', 'unknown') if hasattr(event.args, 'issuer') else 'unknown',
                    "operation": "Revoked Certificate",
                    "type": "On-chain",
                    "event_obj": event
                })
            # Sort all events by blockNumber descending
            all_events_sorted = sorted(all_events, key=lambda e: e['blockNumber'], reverse=True)
            # Prepare recent_registrations and recent_operations
            recent_registrations = min(8, len([e for e in all_events_sorted if e['event'] == 'CertificateRegistered']))
            recent_operations = []
            for e in all_events_sorted:
                block_number = e['blockNumber']
                timestamp = None
                if block_number is not None:
                    try:
                        block = manager.web3.eth.get_block(block_number)
                        timestamp = datetime.datetime.fromtimestamp(block.timestamp).isoformat()
                    except Exception:
                        timestamp = None
                recent_operations.append({
                    "timestamp": timestamp,
                    "actor": e['actor'],
                    "operation": e['operation'],
                    "type": e['type'],
                })
    except Exception as e:
        print(f"Error fetching certificate stats: {e}")
        onchain = 0
        offchain = 0
        total_certificates = 0
        recent_registrations = 0
        recent_operations = []
    # System activity (real data)
    revocations = len([e for e in recent_operations if e['operation'] == 'Revoked Certificate'])
    # For signature_verifications, nfts_minted, nfts_transferred, oracle_calls, try to get from contract if available, else set to 0
    def get_contract_stat(func_name):
        try:
            func = getattr(contract.functions, func_name, None)
            return func().call() if func else 0
        except Exception:
            return 0

    signature_verifications = get_contract_stat("getSignatureVerifications")
    nfts_minted = get_contract_stat("getNFTsMinted")
    nfts_transferred = get_contract_stat("getNFTsTransferred")
    oracle_calls = get_contract_stat("getOracleCalls")

    try:
        blockchain_node_status = "Online" if manager.web3.is_connected() else "Offline"
    except Exception:
        blockchain_node_status = "Unknown"

    try:
        with ipfshttpclient.connect(IPFS_API_URL) as client:
            ipfs_node_status = "Online" if client.id() else "Offline"
    except Exception:
        ipfs_node_status = "Offline"
    backend_status = "Healthy"  # If this endpoint works, backend is healthy
    queue_status = "Idle"  # If you have a queue system, replace with real status
    logs = []  # If you have logs, fetch from DB or file
    # User/issuer stats (real data)
    try:
        User = get_user_model()
        total_users = User.objects.count()
        issuers = User.objects.filter(is_staff=True).count() if hasattr(User, 'is_staff') else 0
        # Count active sessions using Django's session framework
        active_sessions = Session.objects.filter(expire_date__gt=timezone.now()).count()
    except Exception:
        total_users = 0
        issuers = 0
        active_sessions = 0
    return DashboardMetrics(
        total_certificates=total_certificates,
        onchain_certificates=onchain,
        offchain_certificates=offchain,
        recent_registrations=recent_registrations,
        revocations=revocations,
        signature_verifications=signature_verifications,
        nfts_minted=nfts_minted,
        nfts_transferred=nfts_transferred,
        oracle_calls=oracle_calls,
        blockchain_node_status=blockchain_node_status,
        ipfs_node_status=ipfs_node_status,
        backend_status=backend_status,
        queue_status=queue_status,
        recent_operations=recent_operations,
        logs=logs,
        total_users=total_users,
        issuers=issuers,
        active_sessions=active_sessions,
    )
