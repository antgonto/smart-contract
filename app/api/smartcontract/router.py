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
from app.api.smartcontract import SEEDWeb3
from app.api.smartcontract.contract_manager import ContractManager
from django.http import HttpResponse
from django.contrib.sessions.models import Session
from django.utils import timezone
from app.api.wallet.router import get_balance
import traceback
from django.conf import settings
from ninja import Schema
from ninja.responses import Response
from typing import List

router = Router(tags=["smartcontract"])

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
    student: str
    issued_at: int
    ipfs_cid: str
    is_revoked: bool
    role: str
    gas_used: int | None = None


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
    gas_used: int | None = None


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
    active_users: int
    issuers: int
    verifiers: int
    active_sessions: int
    total_gas_spent: int | None = None
    gas_balance: int | None = None
    wallet_gas_balance: str | None = None


class DashboardWalletBalanceRequest(Schema):
    address: str
    rpc_url: str


class RolesResponse(Schema):
    roles: List[str]


class ErrorResponse(Schema):
    error: str


class CheckRolesRequest(BaseModel):
    address: str
    signature: str | None = None


class StudentRoleRequest(BaseModel):
    address: str


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
    meta_dict = {
        "title": metadata.title,
        "author": metadata.author,
        "subject": metadata.subject,
        "producer": metadata.producer,
        "created": str(metadata.creation_date),
    }
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
        tx_hash = contract.functions.registerCertificate(
            cert_hash_bytes,
            Web3.to_checksum_address(recipient),
            ipfs_hash
        ).transact({"from": issuer})
        receipt = manager.web3.eth.get_transaction_receipt(tx_hash)
        gas_used = receipt['gasUsed']
        # Fetch all certificate details from the contract
        cert_details = contract.functions.getCertificateWithRole(cert_hash_bytes).call()
        # cert_details: (issuer, student, issuedAt, isRevoked, role)
        return CertificateOut(
            cert_hash=cert_hash,
            issuer=cert_details[0],
            student=cert_details[1],
            issued_at=cert_details[2],
            ipfs_cid=ipfs_hash,
            is_revoked=cert_details[3],
            role=cert_details[4],
            gas_used=gas_used
        )
    except Exception as e:
        from web3.exceptions import ContractLogicError
        import logging
        logging.error(f"Certificate registration failed: {e}")
        if isinstance(e, ContractLogicError):
            if "Certificate already exists" in str(e):
                raise HttpError(409, "Certificate already exists for this hash.")
            elif "revert" in str(e):
                raise HttpError(400, f"Smart contract reverted: {str(e)}")
        if "invalid address" in str(e).lower():
            raise HttpError(400, f"Invalid Ethereum address: {recipient}")
        # Add more detailed error for debugging
        raise HttpError(500, f"Certificate registration failed: {str(e)}. Please check if the issuer has the correct role and the contract is deployed.")


@router.post("/compile/", response=CompileResponse)
def compile_contract(request):
    print("Compiling contracts...")
    success_process = []
    output_process = []
    # Ensure contracts directory exists (create parent dirs if needed)
    if not os.path.exists(manager.contracts_dir):
        os.makedirs(manager.contracts_dir, exist_ok=True)
    print(f"Compiling contracts in directory: {manager.contracts_dir}")
    contract_files = [
        os.path.join(manager.contracts_dir, file_name)
        for file_name in sorted(os.listdir(manager.contracts_dir))
        if os.path.isfile(os.path.join(manager.contracts_dir, file_name)) and file_name.endswith(".sol")
    ]
    print(f"Found contract files: {contract_files}")
    for file_name in contract_files:
        try:
            print(f"Compiling contract: {file_name}")
            result = run(
                [
                    "solc",
                    "--overwrite",
                    "--bin",
                    "--abi",
                    file_name,
                    "-o",
                    manager.contracts_dir,
                    "--base-path", "/opt/project",
                    "--include-path", "/opt/project/node_modules",
                    "--include-path", "/opt/project/contracts"
                ],
                capture_output=True,
                text=True,
            )
            print(f"solc output for {file_name}:\n{result.stdout}\n{result.stderr}")
        except FileNotFoundError as e:
            import traceback
            tb = traceback.format_exc()
            print(f"solc compiler not found. Traceback:\n{tb}")
            raise HttpError(
                500,
                "solc compiler not found. Please install solc and ensure it is in your PATH. Traceback: " + tb,
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
    manager.connect_web3()
    if not manager.web3:
        print("Deploying contracts...")
        raise HttpError(500, "Web3 provider is not initialized. Cannot deploy contracts.")
    contract_files = [
        os.path.join(manager.contracts_dir, file_name)
        for file_name in sorted(os.listdir(manager.contracts_dir))
        if os.path.isfile(os.path.join(manager.contracts_dir, file_name)) and file_name.endswith(".sol")
    ]
    print(manager.contracts_dir)
    deployed_contracts = []
    errors = []
    for file_name in contract_files:
        base_filename = os.path.basename(file_name).rsplit(".", 1)[0]
        abi_file = os.path.join(manager.contracts_dir, f"{base_filename}.abi")
        bin_file = os.path.join(manager.contracts_dir, f"{base_filename}.bin")
        # Only deploy if both ABI and BIN exist (i.e., contract has been compiled)
        if not (os.path.exists(abi_file) and os.path.exists(bin_file)):
            errors.append(f"Contract {base_filename} has not been compiled. Skipping deployment.")
            continue
        try:
            # Use the first account for all deployments
            sender_account = manager.web3.eth.accounts[0]

            # Special handling for Lock.sol constructor argument
            args = None
            if base_filename == "Lock":
                # Set unlockTime to 1 hour in the future
                args = int(datetime.datetime.now(datetime.timezone.utc).timestamp()) + 3600

            addr = SEEDWeb3.deploy_contract(manager.web3, sender_account, abi_file, bin_file, args)

            addr_file_path = os.path.join(manager.contracts_dir, f"{base_filename}.txt")
            with open(addr_file_path, "w") as fd:
                fd.write(addr)
            deployed_contracts.append(f"Contract deployed successfully: {addr}")
        except Exception as e:
            tb = traceback.format_exc()
            print(f"Error deploying {file_name}: {e}\n{tb}")
            errors.append(f"failed processing contract file: {file_name}. Error: {e}. Traceback: {tb}")
    if errors and not deployed_contracts:
        raise HttpError(500, " | ".join(errors))
    # Refresh contract manager state after deployment (address may have changed)
    manager.refresh()
    return DeployResponse(success=[True]*len(deployed_contracts), output=deployed_contracts + errors)

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
        if contract is None:
            raise HttpError(500, f"Contract not loaded: {manager.get_error()}")
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
            gas_used = None
            if transaction_hash:
                try:
                    receipt = manager.web3.eth.get_transaction_receipt(transaction_hash)
                    gas_used = receipt['gasUsed']
                except Exception:
                    gas_used = None
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
                "gas_used": gas_used,
            })
        return CertificateListResponse(certificates=certificates)
    except Exception as e:
        import traceback
        print('Exception in list_certificates:', e)
        traceback.print_exc()
        raise HttpError(500, f"Failed to list certificates: {str(e)}") from e


@router.get("/dashboard/metrics", response=DashboardMetrics)
def dashboard_metrics(request):
    contract = manager.get_contract()
    onchain = 0
    offchain = 0
    total_certificates = 0
    recent_registrations = 0
    total_gas_spent = 0
    cumulative_gas = 0
    gas_balance = 0
    recent_operations = []
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

            for e in all_events_sorted:
                block_number = e['blockNumber']
                timestamp = None
                gas_used = None
                tx_hash = getattr(e['event_obj'], 'transactionHash', None)
                if block_number is not None:
                    try:
                        block = manager.web3.eth.get_block(block_number)
                        timestamp = datetime.datetime.fromtimestamp(block.timestamp).isoformat()
                    except Exception:
                        timestamp = None
                if tx_hash is not None:
                    try:
                        receipt = manager.web3.eth.get_transaction_receipt(tx_hash.hex() if hasattr(tx_hash, 'hex') else tx_hash)
                        gas_used = receipt['gasUsed']
                        total_gas_spent += gas_used
                    except Exception:
                        gas_used = None
                # Calculate cumulative gas
                if gas_used is not None:
                    cumulative_gas += gas_used
                recent_operations.append({
                    "timestamp": timestamp,
                    "actor": e['actor'],
                    "operation": e['operation'],
                    "type": e['type'],
                    "gas_used": gas_used,
                    "cumulative_gas": cumulative_gas if gas_used is not None else None,
                })
            # Get gas balance from the first account
            try:
                gas_balance = manager.web3.eth.get_balance(manager.web3.eth.accounts[0])
            except Exception:
                gas_balance = None
    except Exception as e:
        print(f"Error fetching certificate stats: {e}")
        onchain = 0
        offchain = 0
        total_certificates = 0
        recent_registrations = 0
        recent_operations = []
        total_gas_spent = 0
        gas_balance = 0
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
        # Active users: unique user IDs with active sessions
        session_keys = Session.objects.filter(expire_date__gt=timezone.now())
        user_ids = set()
        for session in session_keys:
            data = session.get_decoded()
            uid = data.get('_auth_user_id')
            if uid:
                user_ids.add(uid)
        active_users = len(user_ids)
        # Issuers: is_staff or group 'issuer'
        issuers = User.objects.filter(is_staff=True).count() if hasattr(User, 'is_staff') else 0
        # Verifiers: group 'verifier' or boolean field
        try:
            from django.contrib.auth.models import Group
            verifier_group = Group.objects.get(name='verifier')
            verifiers = verifier_group.user_set.count()
        except Exception:
            verifiers = User.objects.filter(is_verifier=True).count() if hasattr(User, 'is_verifier') else 0
        active_sessions = session_keys.count()
    except Exception:
        total_users = 0
        active_users = 0
        issuers = 0
        verifiers = 0
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
        active_users=active_users,
        issuers=issuers,
        verifiers=verifiers,
        active_sessions=active_sessions,
        total_gas_spent=total_gas_spent,
        gas_balance=gas_balance,
    )


@router.post("/dashboard/wallet_gas_balance", response=DashboardMetrics)
def dashboard_wallet_gas_balance(request, data: DashboardWalletBalanceRequest):
    # Use the wallet balance endpoint logic
    balance_response = get_balance(request, data)
    return DashboardMetrics(wallet_gas_balance=balance_response.balance)


@router.post("/check_admin_role/")
def check_admin_role(request, address: str):
    """Check if the given address has the Admin role (DEFAULT_ADMIN_ROLE) on the blockchain."""
    try:
        manager.connect_web3('ganache')
        manager.load_abi()
        manager.load_address()
        manager.update_contract()
        contract = manager.contract
        if not contract:
            raise Exception("Contract not loaded")
        DEFAULT_ADMIN_ROLE = Web3.keccak(text='DEFAULT_ADMIN_ROLE').hex()
        has_role = contract.functions.hasRole(DEFAULT_ADMIN_ROLE, Web3.to_checksum_address(address)).call()
        return {"is_admin": has_role}
    except Exception as e:
        return {"error": str(e)}


@router.post("/grant_role/")
def grant_role(request, address: str, role: str):
    """Grant a role (Admin, Issuer) to an address."""
    try:
        manager.connect_web3('http://ganache:8545')
        manager.load_abi()
        manager.load_address()
        manager.update_contract()
        contract = manager.contract
        if not contract:
            raise Exception("Contract not loaded")
        if role == 'Admin':
            role_hash = Web3.keccak(text='DEFAULT_ADMIN_ROLE').hex()
        elif role == 'Issuer':
            role_hash = contract.functions.ISSUER_ROLE().call()
        else:
            raise Exception("Invalid role. Can only be 'Admin' or 'Issuer'.")

        admin_address = manager.web3.eth.accounts[0]
        tx_hash = contract.functions.grantRole(role_hash, Web3.to_checksum_address(address)).transact({'from': admin_address})

        return {"success": True, "tx_hash": tx_hash.hex()}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.post("/revoke_role/")
def revoke_role(request, address: str, role: str):
    """Revoke a role (Admin, Issuer) from an address."""
    try:
        manager.connect_web3('http://ganache:8545')
        manager.load_abi()
        manager.load_address()
        manager.update_contract()
        contract = manager.contract
        if not contract:
            raise Exception("Contract not loaded")
        if role == 'Admin':
            role_hash = Web3.keccak(text='DEFAULT_ADMIN_ROLE').hex()
        elif role == 'Issuer':
            role_hash = contract.functions.ISSUER_ROLE().call()
        else:
            raise Exception("Invalid role. Can only be 'Admin' or 'Issuer'.")

        admin_address = manager.web3.eth.accounts[0]
        tx_hash = contract.functions.revokeRole(role_hash, Web3.to_checksum_address(address)).transact({'from': admin_address})

        return {"success": True, "tx_hash": tx_hash.hex()}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.post("/grant_student_role/")
def grant_student_role(request, payload: StudentRoleRequest):
    """Grants the STUDENT_ROLE to a given address. Must be called by an account with ISSUER_ROLE."""
    print(f"Received payload for grant_student_role: {request.body}")  # Debugging line
    try:
        manager.connect_web3('http://ganache:8545')
        manager.load_abi()
        manager.load_address()
        manager.update_contract()
        contract = manager.contract
        if not contract:
            return Response({"error": "Contract not loaded"}, status=400)

        # Using the admin account which also has ISSUER_ROLE
        issuer_address = manager.web3.eth.accounts[0]

        # Check if the function exists on the contract
        if not hasattr(contract.functions, 'grantStudentRole'):
            return Response({"error": "grantStudentRole function not found on contract."}, status=400)

        tx_hash = contract.functions.grantStudentRole(Web3.to_checksum_address(payload.address)).transact({'from': issuer_address})

        # Wait for the transaction to be mined
        receipt = manager.web3.eth.wait_for_transaction_receipt(tx_hash)

        if receipt.status == 0:
            # The transaction failed
            return Response({"error": "Transaction to grant student role failed."}, status=400)

        return {"success": True, "tx_hash": tx_hash.hex()}
    except Exception as e:
        return Response({"error": str(e)}, status=400)


@router.post("/revoke_student_role/")
def revoke_student_role(request, payload: StudentRoleRequest):
    """Revokes the STUDENT_ROLE from a given address. Must be called by an account with ISSUER_ROLE."""
    try:
        manager.connect_web3('http://ganache:8545')
        manager.load_abi()
        manager.load_address()
        manager.update_contract()
        contract = manager.contract
        if not contract:
            raise Exception("Contract not loaded")

        issuer_address = manager.web3.eth.accounts[0]
        tx_hash = contract.functions.revokeStudentRole(Web3.to_checksum_address(payload.address)).transact({'from': issuer_address})

        return {"success": True, "tx_hash": tx_hash.hex()}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.get("/check_roles/{address}", response={200: RolesResponse, 400: ErrorResponse})
def check_roles(request, address: str):
    """Return all blockchain roles (Admin, Issuer, Student) for a given address."""
    # Optionally, you can verify the signature here if needed
    try:
        manager.connect_web3('http://ganache:8545')
        manager.load_abi()
        manager.load_address()
        manager.update_contract()
        contract = manager.contract
        if not contract:
            return Response({"error": "Contract not loaded"}, status=400)
        roles = []
        # The DEFAULT_ADMIN_ROLE in OpenZeppelin's AccessControl is bytes32(0)
        DEFAULT_ADMIN_ROLE = b'\x00' * 32
        # Check Admin
        try:
            if contract.functions.hasRole(DEFAULT_ADMIN_ROLE, Web3.to_checksum_address(address)).call():
                roles.append('Admin')
        except Exception:
            pass # Ignore if role check fails
        # Check Issuer
        try:
            issuer_role_hash = Web3.keccak(text='ISSUER_ROLE')
            if contract.functions.hasRole(issuer_role_hash, Web3.to_checksum_address(address)).call():
                roles.append('Issuer')
        except Exception:
            pass # Ignore if role check fails
        # Check Student (if implemented)
        try:
            student_role_hash = Web3.keccak(text='STUDENT_ROLE')
            if contract.functions.hasRole(student_role_hash, Web3.to_checksum_address(address)).call():
                roles.append('Student')
        except Exception:
            pass
        return {"roles": roles}
    except Exception as e:
        return Response({"error": str(e)}, status=400)
