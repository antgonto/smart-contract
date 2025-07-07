from ninja import Router
from ninja.responses import JsonResponse, Response
from pydantic import BaseModel
import random
import string
from django.core.cache import cache
from eth_account import Account as EthAccount
from eth_account.messages import encode_defunct
from rest_framework_simplejwt.tokens import RefreshToken
from web3 import Web3

from app.api.smartcontract.contract_manager import ContractManager
from app.models import CustomUser, Account as UserAccount, AccountRole

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
    roles: list[str]

class ErrorResponse(BaseModel):
    error: str

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
        return JsonResponse(status_code=400, content={"error": f"Failed to sign message: {e}"})

@router.post("/login", response={200: TokenResponse, 400: ErrorResponse, 401: ErrorResponse})
def login(request, login_data: LoginRequest):
    address = Web3.to_checksum_address(login_data.address)
    nonce = cache.get(f"auth_nonce_{address.lower()}")

    if not nonce:
        return Response({"error": "Challenge expired or not found."}, status=400)

    message = encode_defunct(text=nonce)

    try:
        recovered_address = EthAccount.recover_message(message, signature=login_data.signature)
        print(f"Recovered address: {recovered_address}")
        if recovered_address.lower() != address.lower():
            print(f"Signature verification failed. Expected {address.lower()}, got {recovered_address.lower()}")
            return Response({"error": "Signature verification failed."}, status=401)
    except Exception as e:
        print(f"Error during signature recovery: {e}")
        return Response({"error": "Invalid signature format."}, status=400)

    # Signature is valid, proceed with login/user creation
    print("Signature verified successfully.")
    cache.delete(f"auth_nonce_{address.lower()}")

    try:
        # Block 1: User creation
        try:
            user, created = CustomUser.objects.get_or_create(username=address.lower())
        except Exception as e:
            print(f"Error in User creation: {e}")
            raise e

        # Block 2: Account creation/linking
        try:
            account, account_created = UserAccount.objects.get_or_create(
                address=address,
                defaults={'user': user, 'name': f"Account for {address[:6]}"}
            )
            if not account_created and not account.user:
                account.user = user
                account.save()
        except Exception as e:
            print(f"Error in Account creation/linking: {e}")
            raise e

        # Block 3: Role fetching
        try:
            roles = list(AccountRole.objects.filter(account=account).values_list('role', flat=True))
            roles = [role.capitalize() for role in roles]
            if not roles:
                roles.append("Student")
        except Exception as e:
            print(f"Error in role fetching: {e}")
            raise e

        # Block 4: Token generation
        try:
            tokens = get_tokens_for_user(user, roles)
            return TokenResponse(access=tokens["access"], refresh=tokens["refresh"], roles=roles)
        except Exception as e:
            print(f"Error in token generation: {e}")
            raise e

    except Exception as e:
        print(f"Unhandled error in login endpoint: {e}")
        return Response({"error": "An unexpected error occurred during login."}, status=500)
