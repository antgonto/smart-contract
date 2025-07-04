from ninja import Router
from web3 import Web3
from django.conf import settings
from pydantic import BaseModel
import os

router = Router(tags=["admin"])

class RoleRequest(BaseModel):
    address: str

# --- Contract Setup ---
w3 = Web3(Web3.HTTPProvider(os.environ.get('WEB3_RPC')))
contract_address = os.environ.get('CERTIFICATE_REGISTRY_ADDRESS')
with open(os.path.join(settings.BASE_DIR, 'contracts/CertificateRegistry.abi')) as f:
    abi = f.read()
contract = w3.eth.contract(address=contract_address, abi=abi)
ISSUER_ROLE = w3.keccak(text="ISSUER_ROLE")

# --- Admin-Only Functions ---
def is_owner(request):
    # For simplicity, we'll check against an environment variable.
    # In a real app, this would involve more robust checks.
    return request.headers.get("X-Admin-Auth") == os.environ.get("ADMIN_SECRET")

@router.post("/grant_issuer_role")
def grant_issuer_role(request, data: RoleRequest):
    if not is_owner(request):
        return {"success": False, "error": "Unauthorized"}

    owner_address = os.environ.get('CONTRACT_OWNER_ADDRESS')
    private_key = os.environ.get('CONTRACT_OWNER_PRIVATE_KEY')

    tx = contract.functions.grantRole(ISSUER_ROLE, data.address).build_transaction({
        'from': owner_address,
        'nonce': w3.eth.get_transaction_count(owner_address),
    })
    signed_tx = w3.eth.account.sign_transaction(tx, private_key)
    tx_hash = w3.eth.send_raw_transaction(signed_tx.rawTransaction)

    return {"success": True, "tx_hash": tx_hash.hex()}

@router.post("/revoke_issuer_role")
def revoke_issuer_role(request, data: RoleRequest):
    if not is_owner(request):
        return {"success": False, "error": "Unauthorized"}

    owner_address = os.environ.get('CONTRACT_OWNER_ADDRESS')
    private_key = os.environ.get('CONTRACT_OWNER_PRIVATE_KEY')

    tx = contract.functions.revokeRole(ISSUER_ROLE, data.address).build_transaction({
        'from': owner_address,
        'nonce': w3.eth.get_transaction_count(owner_address),
    })
    signed_tx = w3.eth.account.sign_transaction(tx, private_key)
    tx_hash = w3.eth.send_raw_transaction(signed_tx.rawTransaction)

    return {"success": True, "tx_hash": tx_hash.hex()}

