from ninja import Router, Schema
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
from django.conf import settings
import os
import json

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

def get_tokens_for_user(user, roles=[], address=None):
    refresh = RefreshToken.for_user(user)
    # Add custom claims
    refresh['roles'] = roles
    if address:
        refresh['address'] = address
    else:
        account = user.account_set.first()
        if account:
            refresh['address'] = account.address
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }

@router.get("/challenge/{address}", response=ChallengeResponse)
def get_challenge(request, address: str):
    nonce = ''.join(random.choices(string.ascii_letters + string.digits, k=32))
    cache.set(f"auth_nonce_{address.lower()}", nonce, timeout=300)  # 5-minute expiry
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

# Helper to get contract details
def get_certificate_registry_contract():
    CONTRACTS_DIR = os.path.join(settings.BASE_DIR, 'contracts')
    CONTRACT_ABI_PATH = os.path.join(CONTRACTS_DIR, 'CertificateRegistry.abi')
    CONTRACT_ADDRESS_PATH = os.path.join(CONTRACTS_DIR, 'CertificateRegistry.txt')
    if not os.path.exists(CONTRACT_ABI_PATH) or not os.path.exists(CONTRACT_ADDRESS_PATH):
        raise FileNotFoundError("Contract ABI or address not found. Please compile and deploy.")
    with open(CONTRACT_ABI_PATH) as f:
        abi = json.load(f)
    with open(CONTRACT_ADDRESS_PATH) as f:
        address = f.read().strip()
    return abi, address

# Helper to get the funder/admin account from Ganache
def get_ganache_funder(w3):
    accounts = w3.eth.accounts
    if not accounts:
        return None, None
    admin_address = accounts[0]

    # This is a simplified way to get the private key for the dev environment
    # In a real app, use a secure key management system
    ganache_keys_path = os.path.join(settings.BASE_DIR, 'ganache_keys')
    try:
        with open(ganache_keys_path, 'r') as f:
            lines = f.read().splitlines()
            # Find the private key for the first account (0)
            pk_line_index = lines.index('(0) 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', 12) # Search after the accounts list
            if pk_line_index != -1:
                private_key = lines[pk_line_index].split(' ')[1]
                return admin_address, private_key
    except Exception:
        pass # Fallback to environment variable if file parsing fails

    return admin_address, os.environ.get('GANACHE_FUNDER_PRIVATE_KEY')


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

    # Special check to ensure the default account has the ISSUER_ROLE
    if address.lower() == "0xf39fd6e51aad88f6f4ce6ab8827279cffFb92266".lower():
        try:
            w3 = Web3(Web3.HTTPProvider('http://ganache:8545'))
            abi, contract_address = get_certificate_registry_contract()
            contract = w3.eth.contract(address=contract_address, abi=abi)
            ISSUER_ROLE = w3.keccak(text='ISSUER_ROLE')

            if not contract.functions.hasRole(ISSUER_ROLE, address).call():
                print(f"Granting ISSUER_ROLE to default admin account {address}...")
                funder_address, funder_private_key = get_ganache_funder(w3)
                if funder_address and funder_private_key and funder_address.lower() == address.lower():
                    admin_account = w3.eth.account.from_key(funder_private_key)
                    nonce = w3.eth.get_transaction_count(address)
                    tx = contract.functions.grantRole(ISSUER_ROLE, address).build_transaction({
                        'from': address,
                        'nonce': nonce,
                        'gas': 200000,
                        'gasPrice': w3.to_wei('2', 'gwei'),
                    })
                    signed_tx = admin_account.sign_transaction(tx)
                    tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
                    w3.eth.wait_for_transaction_receipt(tx_hash)
                    print(f"Successfully granted ISSUER_ROLE to {address}. Tx: {tx_hash.hex()}")
                else:
                    print("Could not grant ISSUER_ROLE: Admin private key not found or address mismatch.")
        except Exception as e:
            print(f"Error during automatic role assignment for admin: {e}")
            # Do not block login if role assignment fails, but log it.

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
            tokens = get_tokens_for_user(user, roles, address)
            return TokenResponse(access=tokens["access"], refresh=tokens["refresh"], roles=roles)
        except Exception as e:
            print(f"Error in token generation: {e}")
            raise e

    except Exception as e:
        print(f"Unhandled error in login endpoint: {e}")
        return Response({"error": "An unexpected error occurred during login."}, status=500)