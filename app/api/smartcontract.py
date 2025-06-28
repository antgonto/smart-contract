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
    issued_at: int
    metadata: str
    content: str


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


class CertificateListResponse(Schema):
    onchain: list[str]
    offchain: list[str]


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
    # Example: extract title, author, etc.
    meta_dict = {
        "title": metadata.title,
        "author": metadata.author,
        "subject": metadata.subject,
        "producer": metadata.producer,
        "created": str(metadata.creation_date),
    }
    # 4. Upload to IPFS
    with ipfshttpclient.connect(IPFS_API_URL) as client:
        res = client.add_bytes(pdf_bytes)
        ipfs_hash = res
    # 5. Register on blockchain
    issuer = manager.web3.eth.accounts[0]
    # Ensure cert_hash is a hex string (with or without 0x prefix)
    cert_hash_bytes = bytes.fromhex(cert_hash[2:] if cert_hash.startswith('0x') else cert_hash)
    # Validate recipient is a valid Ethereum address
    if not (isinstance(recipient, str) and recipient.startswith('0x') and len(recipient) == 42):
        raise HttpError(400, f"Recipient must be a valid Ethereum address (got: {recipient})")
    try:
        contract.functions.registerCertificate(
            cert_hash_bytes,
            Web3.to_checksum_address(recipient),
            str(meta_dict),
            ipfs_hash,
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
        issued_at=int(datetime.datetime.now().timestamp()),
        metadata=str(meta_dict),
        content=ipfs_hash,
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

# @router.get("/by_hash/{cert_hash}", response=CertificateOut)
# def get_certificate(request, cert_hash: str):
#     if contract is None:
#         raise HttpError(500, f"Contract not loaded: {abi_load_error}")
#     cert = contract.functions.getCertificate(Web3.to_bytes(hexstr=cert_hash)).call()
#     return CertificateOut(
#         cert_hash=cert_hash,
#         issuer=cert[1],
#         recipient=cert[2],
#         issued_at=cert[3],
#         metadata=cert[4],
#         content=cert[5],
#     )
#
#
# @router.get("/by_recipient/{recipient}", response=list[str])
# def get_certificates_by_recipient(request, recipient: str):
#     if contract is None:
#         raise HttpError(500, f"Contract not loaded: {abi_load_error}")
#     cert_hashes = contract.functions.getCertificatesByRecipient(
#         Web3.to_checksum_address(recipient)
#     ).call()
#     return [web3.to_hex(h) for h in cert_hashes]
#
#
# @router.post("/upload_offchain", response=CertificateResponse)
# def upload_certificate_offchain(request, file, payload):
#     try:
#         with ipfshttpclient.connect(IPFS_API_URL) as client:
#             res = client.add(file.file)
#             ipfs_hash = res["Hash"]
#     except Exception as e:
#         raise HttpError(500, f"IPFS upload failed: {str(e)}") from e
#     try:
#         cert_hash = Web3.keccak(text=ipfs_hash).hex()
#         issuer = web3.eth.accounts[0]
#         tx = contract.functions.registerCertificate(
#             Web3.to_bytes(hexstr=cert_hash),
#             Web3.to_checksum_address(payload.recipient),
#             ipfs_hash,
#             "",
#         ).transact({"from": issuer})
#         web3.eth.wait_for_transaction_receipt(tx)
#         # TODO: Log to PostgreSQL (certificate, tx hash, user info)
#         return CertificateResponse(
#             ipfs_hash=ipfs_hash, cert_hash=cert_hash, tx_hash=tx.hex()
#         )
#     except Exception as e:
#         raise HttpError(500, f"Blockchain registration failed: {str(e)}") from e
#
#
# @router.get("/download_offchain/{ipfs_hash}")
# def download_certificate_offchain(request, ipfs_hash: str):
#     try:
#         with ipfshttpclient.connect(IPFS_API_URL) as client:
#             data = client.cat(ipfs_hash)
#         return data  # Ninja will handle as binary response
#     except Exception as e:
#         raise HttpError(404, f"IPFS download failed: {str(e)}") from e
#
#
# @router.get("/list_certificates", response=CertificateListResponse)
# def list_certificates(request):
#     all_cert_hashes = []
#     all_offchain_hashes = []
#     try:
#         event_filter = contract.events.CertificateRegistered.createFilter(fromBlock=0)
#         events = event_filter.get_all_entries()
#         for event in events:
#             cert_hash = event.args.certHash.hex()
#             metadata = event.args.metadata
#             all_cert_hashes.append(cert_hash)
#             if len(metadata) >= 46 and metadata.startswith("Qm"):
#                 all_offchain_hashes.append(cert_hash)
#         return CertificateListResponse(
#             onchain=all_cert_hashes, offchain=all_offchain_hashes
#         )
#     except Exception as e:
#         raise HttpError(500, f"Failed to list certificates: {str(e)}") from e


@router.get("/dashboard/metrics", response=DashboardMetrics)
def dashboard_metrics(request):
    onchain = 0
    offchain = 0
    # # Certificate stats
    # try:
    #     event_filter = contract.events.CertificateRegistered.createFilter(fromBlock=0)
    #     events = event_filter.get_all_entries()
    #     onchain = len(events)
    #     offchain = 0
    #     for event in events:
    #         metadata = event.args.metadata
    #         if len(metadata) >= 46 and metadata.startswith("Qm"):
    #             offchain += 1
    # except Exception:
    #     onchain = 0
    #     offchain = 0
    total_certificates = onchain
    # System activity (mocked for now)
    recent_registrations = min(8, total_certificates)
    revocations = 2
    signature_verifications = 56
    nfts_minted = 15
    nfts_transferred = 7
    oracle_calls = 12
    # Real-time status (mocked)
    blockchain_node_status = "Online"
    ipfs_node_status = "Online"
    backend_status = "Healthy"
    queue_status = "Idle"
    # Recent operations (mocked)
    recent_operations = [
        {
            "timestamp": str(datetime.datetime.now()),
            "actor": "alice",
            "operation": "Issued Certificate",
            "type": "On-chain",
        },
        {
            "timestamp": str(datetime.datetime.now()),
            "actor": "bob",
            "operation": "Revoked Certificate",
            "type": "Off-chain",
        },
        {
            "timestamp": str(datetime.datetime.now()),
            "actor": "carol",
            "operation": "Verified Signature",
            "type": "On-chain",
        },
    ]
    # Logs (mocked)
    logs = [
        {
            "time": str(datetime.datetime.now()),
            "event": "ContractEvent",
            "details": "Certificate #123 issued",
        },
        {
            "time": str(datetime.datetime.now()),
            "event": "AccessLog",
            "details": "User bob viewed certificate #122",
        },
    ]
    # User/issuer stats (mocked, replace with real DB queries if available)
    user = get_user_model()
    total_users = user.objects.count() if hasattr(user, "objects") else 24
    issuers = 4
    active_sessions = 5
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
