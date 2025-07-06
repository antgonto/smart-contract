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


router = Router(tags=["auth"])

class LoginRequest(BaseModel):
    address: str
    signature: str

class ChallengeResponse(BaseModel):
    nonce: str

class SignChallengeRequest(BaseModel):
    private_key: str
    nonce: str

class TokenResponse(BaseModel):
    access: str
    refresh: str

def get_tokens_for_user(user, roles=[]):
    refresh = RefreshToken.for_user(user)
    # Add custom claims
    account = user.account_set.first()
    refresh['roles'] = roles
    if account:
        refresh['address'] = account.address
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }

@router.get("/challenge/{address}", response=ChallengeResponse)
def get_challenge(request, address: str):
    nonce = ''.join(random.choices(string.ascii_letters + string.digits, k=32))
    cache.set(f"auth_nonce_{address.lower()}", nonce, timeout=300) # 5-minute expiry
    return {"nonce": nonce}

@router.post("/sign_challenge")
def sign_challenge_with_key(request, data: SignChallengeRequest):
    try:
        account = EthAccount.from_key(data.private_key)
        signed_message = account.sign_message(encode_defunct(text=data.nonce))
        return {"signature": signed_message.signature.hex()}
    except Exception as e:
        # In a real app, log the error and return a more generic message
        return JSONResponse(status_code=400, content={"error": f"Failed to sign message: {e}"})

@router.post("/login", response=TokenResponse)
def login(request, login_data: LoginRequest):
    address = Web3.to_checksum_address(login_data.address)
    nonce = cache.get(f"auth_nonce_{address.lower()}")

    if not nonce:
        return 400, {"error": "Challenge expired or not found."}

    message = encode_defunct(text=nonce)

    try:
        recovered_address = EthAccount.recover_message(message, signature=login_data.signature)
        if recovered_address.lower() != address.lower():
            return 401, {"error": "Signature verification failed."}
    except Exception:
        return 400, {"error": "Invalid signature format."}

    # Signature is valid, proceed with login/user creation
    cache.delete(f"auth_nonce_{address.lower()}")

    user, created = CustomUser.objects.get_or_create(username=address.lower())

    # Ensure an account exists for the address and is linked to the user.
    account, account_created = UserAccount.objects.get_or_create(
        address=address,
        defaults={'user': user, 'name': f"Account for {address[:6]}"}
    )

    if not account_created and not account.user:
        # If the account existed but wasn't linked to a user, link it now.
        account.user = user
        account.save()

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
