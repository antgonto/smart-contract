from ninja import Router
from pydantic import BaseModel
import random
import string
from django.core.cache import cache
from eth_account import Account as EthAccount
from eth_account.messages import encode_defunct
from rest_framework_simplejwt.tokens import RefreshToken
from web3 import Web3

from app.api.smartcontract.contract_manager import ContractManager
from app.models import CustomUser, Account as UserAccount


manager = ContractManager()
manager.refresh()


router = Router(tags=["authentication"])

class LoginRequest(BaseModel):
    address: str
    signature: str

class ChallengeResponse(BaseModel):
    nonce: str

class TokenResponse(BaseModel):
    access: str
    refresh: str

def get_tokens_for_user(user, roles=[]):
    refresh = RefreshToken.for_user(user)
    # Add custom claims
    refresh['roles'] = roles
    refresh['address'] = user.account.address
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }

@router.get("/challenge/{address}", response=ChallengeResponse)
def get_challenge(request, address: str):
    nonce = ''.join(random.choices(string.ascii_letters + string.digits, k=32))
    cache.set(f"auth_nonce_{address.lower()}", nonce, timeout=300) # 5-minute expiry
    return {"nonce": nonce}

@router.post("/login", response=TokenResponse)
def login(request, data: LoginRequest):
    address = Web3.to_checksum_address(data.address)
    nonce = cache.get(f"auth_nonce_{address.lower()}")

    if not nonce:
        return 400, {"error": "Challenge expired or not found."}

    message = encode_defunct(text=nonce)

    try:
        recovered_address = EthAccount.recover_message(message, signature=data.signature)
        if recovered_address.lower() != address.lower():
            return 401, {"error": "Signature verification failed."}
    except Exception:
        return 400, {"error": "Invalid signature format."}

    # Signature is valid, proceed with login/user creation
    cache.delete(f"auth_nonce_{address.lower()}")

    user, created = CustomUser.objects.get_or_create(username=address.lower())
    if created:
        UserAccount.objects.create(user=user, address=address, name=f"Account for {address[:6]}")

    # Check for roles
    roles = []
    try:
        contract = manager.get_contract()
        issuer_role =     contract.functions.ISSUER_ROLE().call()
        if     contract.functions.hasRole(issuer_role, address).call():
            roles.append("issuer")
    except Exception as e:
        # Could fail if contract not deployed or other issue. Log this.
        print(f"Could not check issuer role for {address}: {e}")

    # For now, we can assume any user with a certificate is a student
    # A more robust check would be needed in a real application
    if not roles:
        roles.append("student")

    tokens = get_tokens_for_user(user, roles)
    return tokens

