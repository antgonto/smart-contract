import ipfshttpclient
from ninja import Router
from web3 import Web3
from pydantic import BaseModel
import os
from subprocess import run, PIPE
from ninja import Schema
from typing import Dict, List, Optional
from ninja.errors import HttpError
from django.contrib.auth import get_user_model
import datetime

router = Router()

# Configure Web3 connection (update with your settings)
WEB3_PROVIDER_URI = os.getenv("WEB3_PROVIDER_URI", "http://localhost:8545")
w3 = Web3(Web3.HTTPProvider(WEB3_PROVIDER_URI))

CONTRACTS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../contracts'))
CONTRACT_NAME = 'CertificateRegistry'
ABI_PATH = os.path.join(CONTRACTS_DIR, f'{CONTRACT_NAME}.abi')
SOL_PATH = os.path.join(CONTRACTS_DIR, f'{CONTRACT_NAME}.sol')


# Helper to compile contract if ABI is missing
def ensure_abi_exists():
    if not os.path.exists(ABI_PATH):
        result = run([
            "solc", "--bin", "--abi", SOL_PATH
        ], stdout=PIPE, stderr=PIPE, text=True)
        if result.returncode != 0:
            raise FileNotFoundError(f"ABI not found and compilation failed: {result.stderr}")
        # solc will output .abi and .bin in the same directory as the .sol file
        if not os.path.exists(ABI_PATH):
            raise FileNotFoundError(f"ABI still not found after compilation: {ABI_PATH}")

try:
    ensure_abi_exists()
    with open(ABI_PATH, 'r') as f:
        CONTRACT_ABI = f.read()
    CONTRACT_ADDRESS = os.getenv("CERT_REGISTRY_ADDRESS")
    contract = w3.eth.contract(address=Web3.to_checksum_address(CONTRACT_ADDRESS), abi=CONTRACT_ABI)
    if not contract:
        raise ValueError(f"Contract not found at address {CONTRACT_ADDRESS}")
except Exception as e:
    CONTRACT_ABI = None
    contract = None
    CONTRACT_ADDRESS = None
    abi_load_error = str(e)

IPFS_API_URL = os.getenv("IPFS_API_URL", "/dns/localhost/tcp/5001/http")

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

class CompileRequest(Schema):
    contract_path: str

class CompileResponse(Schema):
    success: bool
    output: str

class CertificateResponse(Schema):
    ipfs_hash: str
    cert_hash: str
    tx_hash: Optional[str] = None
    message: Optional[str] = None

class CertificateListResponse(Schema):
    onchain: List[str]
    offchain: List[str]

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

@router.post("/register", response=CertificateOut)
def register_certificate(request, payload: CertificateIn):
    if contract is None:
        raise HttpError(500, f"Contract not loaded: {abi_load_error}")
    # This assumes the app is the issuer and has access to a private key
    issuer = w3.eth.accounts[0]
    tx = contract.functions.registerCertificate(
        Web3.to_bytes(hexstr=payload.cert_hash),
        Web3.to_checksum_address(payload.recipient),
        payload.metadata,
        payload.content
    ).transact({'from': issuer})
    receipt = w3.eth.wait_for_transaction_receipt(tx)
    cert = contract.functions.getCertificate(Web3.to_bytes(hexstr=payload.cert_hash)).call()
    return CertificateOut(
        cert_hash=payload.cert_hash,
        issuer=issuer,
        recipient=payload.recipient,
        issued_at=0,
        metadata=payload.metadata,
        content=payload.content
    )

@router.post("/compile", response=CompileResponse)
def compile_contract(request, data: CompileRequest):
    contract_path = data.contract_path
    try:
        result = run([
            "solc", "--bin", "--abi", contract_path
        ], stdout=PIPE, stderr=PIPE, text=True)
    except FileNotFoundError:
        raise HttpError(500, "solc compiler not found. Please install solc and ensure it is in your PATH.")
    success = result.returncode == 0
    output = result.stdout if success else result.stderr
    return CompileResponse(success=success, output=output)

@router.get("/by_hash/{cert_hash}", response=CertificateOut)
def get_certificate(request, cert_hash: str):
    if contract is None:
        raise HttpError(500, f"Contract not loaded: {abi_load_error}")
    cert = contract.functions.getCertificate(Web3.to_bytes(hexstr=cert_hash)).call()
    return CertificateOut(
        cert_hash=cert_hash,
        issuer=cert[1],
        recipient=cert[2],
        issued_at=cert[3],
        metadata=cert[4],
        content=cert[5]
    )

@router.get("/by_recipient/{recipient}", response=List[str])
def get_certificates_by_recipient(request, recipient: str):
    if contract is None:
        raise HttpError(500, f"Contract not loaded: {abi_load_error}")
    cert_hashes = contract.functions.getCertificatesByRecipient(Web3.to_checksum_address(recipient)).call()
    return [w3.to_hex(h) for h in cert_hashes]

@router.post("/upload_offchain", response=CertificateResponse)
def upload_certificate_offchain(request, file, payload):
    try:
        with ipfshttpclient.connect(IPFS_API_URL) as client:
            res = client.add(file.file)
            ipfs_hash = res["Hash"]
    except Exception as e:
        raise HttpError(500, f"IPFS upload failed: {str(e)}")
    try:
        cert_hash = Web3.keccak(text=ipfs_hash).hex()
        issuer = w3.eth.accounts[0]
        tx = contract.functions.registerCertificate(
            Web3.to_bytes(hexstr=cert_hash),
            Web3.to_checksum_address(payload.recipient),
            ipfs_hash,
            ""
        ).transact({'from': issuer})
        w3.eth.wait_for_transaction_receipt(tx)
        # TODO: Log to PostgreSQL (certificate, tx hash, user info)
        return CertificateResponse(ipfs_hash=ipfs_hash, cert_hash=cert_hash, tx_hash=tx.hex())
    except Exception as e:
        raise HttpError(500, f"Blockchain registration failed: {str(e)}")

@router.get("/download_offchain/{ipfs_hash}")
def download_certificate_offchain(request, ipfs_hash: str):
    try:
        with ipfshttpclient.connect(IPFS_API_URL) as client:
            data = client.cat(ipfs_hash)
        return data  # Ninja will handle as binary response
    except Exception as e:
        raise HttpError(404, f"IPFS download failed: {str(e)}")

@router.get("/list_certificates", response=CertificateListResponse)
def list_certificates(request):
    all_cert_hashes = []
    all_offchain_hashes = []
    try:
        event_filter = contract.events.CertificateRegistered.createFilter(fromBlock=0)
        events = event_filter.get_all_entries()
        for event in events:
            cert_hash = event.args.certHash.hex()
            metadata = event.args.metadata
            all_cert_hashes.append(cert_hash)
            if len(metadata) >= 46 and metadata.startswith('Qm'):
                all_offchain_hashes.append(cert_hash)
        return CertificateListResponse(onchain=all_cert_hashes, offchain=all_offchain_hashes)
    except Exception as e:
        raise HttpError(500, f"Failed to list certificates: {str(e)}")

@router.get("/dashboard/metrics", response=DashboardMetrics)
def dashboard_metrics(request):
    # Certificate stats
    try:
        event_filter = contract.events.CertificateRegistered.createFilter(fromBlock=0)
        events = event_filter.get_all_entries()
        onchain = len(events)
        offchain = 0
        for event in events:
            metadata = event.args.metadata
            if len(metadata) >= 46 and metadata.startswith('Qm'):
                offchain += 1
    except Exception:
        onchain = 0
        offchain = 0
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
        {"timestamp": str(datetime.datetime.now()), "actor": "alice", "operation": "Issued Certificate", "type": "On-chain"},
        {"timestamp": str(datetime.datetime.now()), "actor": "bob", "operation": "Revoked Certificate", "type": "Off-chain"},
        {"timestamp": str(datetime.datetime.now()), "actor": "carol", "operation": "Verified Signature", "type": "On-chain"},
    ]
    # Logs (mocked)
    logs = [
        {"time": str(datetime.datetime.now()), "event": "ContractEvent", "details": "Certificate #123 issued"},
        {"time": str(datetime.datetime.now()), "event": "AccessLog", "details": "User bob viewed certificate #122"},
    ]
    # User/issuer stats (mocked, replace with real DB queries if available)
    User = get_user_model()
    total_users = User.objects.count() if hasattr(User, 'objects') else 24
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
        active_sessions=active_sessions
    )
