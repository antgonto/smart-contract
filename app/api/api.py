from ninja import NinjaAPI, Swagger


api = NinjaAPI(
    title="Contracts API",
    version="1.0.0",
    auth=None,
    docs=Swagger(
        settings={
            "tryItOutEnabled": True,
            "displayRequestDuration": True,
        }
    ),
    urls_namespace="api",
)

# Only add routers if they haven't been added already
routers = [
    ("/smartcontract/", "app.api.smartcontract.router.router", ["smartcontract"]),
    ("/wallet/", "app.api.wallet.router.router", ["wallet"]),
]

# Track which routers have been added
added_routers = set()

for path, router, tags in routers:
    # Check if router already added
    if path not in added_routers:
        try:
            api.add_router(path, router, tags=tags)
            added_routers.add(path)
        except Exception as e:
            # Skip if already attached
            if "has already been attached" not in str(e):
                # Re-raise if it's a different error
                raise

import os
import random
import string
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from eth_account.messages import encode_defunct
from eth_account import Account as EthAccount
from django.core.cache import cache
from django.contrib.auth import login
from app.models import CustomUser, Account
from django.db import transaction as db_transaction
from django.utils.decorators import method_decorator
from ninja.security import HttpBearer
from ninja import Router
from web3 import Web3

class TokenAuth(HttpBearer):
    def authenticate(self, request, token):
        # Example: check token in user session or DB
        user = CustomUser.objects.filter(auth_token=token).first()
        if user:
            request.user = user
            return token
        return None

# --- Signing Endpoints with TokenAuth ---
auth_router = Router(auth=TokenAuth())

@api.get("/auth/challenge/{address}/")
def get_challenge(request, address: str):
    # Generate a random nonce
    nonce = ''.join(random.choices(string.ascii_letters + string.digits, k=24))
    # Store nonce in cache for 5 minutes
    cache.set(f"auth_nonce_{address}", nonce, timeout=300)
    return {"nonce": nonce}

@api.post("/auth/verify/")
def verify_signature(request, address: str, signature: str):
    nonce = cache.get(f"auth_nonce_{address}")
    if not nonce:
        return JsonResponse({"success": False, "error": "No challenge found for this address."}, status=400)
    message = encode_defunct(text=nonce)
    try:
        recovered = EthAccount.recover_message(message, signature=signature)
        if recovered.lower() == address.lower():
            # Optionally, log the user in or create a session here
            cache.delete(f"auth_nonce_{address}")
            return {"success": True, "address": address}
        else:
            return {"success": False, "error": "Signature does not match address."}
    except Exception as e:
        return {"success": False, "error": str(e)}

@api.post("/auth/verify/auto_create/")
def verify_signature_auto_create(request, address: str, signature: str):
    nonce = cache.get(f"auth_nonce_{address}")
    if not nonce:
        return JsonResponse({"success": False, "error": "No challenge found for this address."}, status=400)
    message = encode_defunct(text=nonce)
    try:
        recovered = EthAccount.recover_message(message, signature=signature)
        if recovered.lower() == address.lower():
            cache.delete(f"auth_nonce_{address}")
            # Option 1: Auto-create user/account if not linked
            with db_transaction.atomic():
                account = Account.objects.filter(address=address).first()
                if account:
                    user = account.user
                else:
                    # Create new user and account
                    user = CustomUser.objects.create_user(username=address)
                    account = Account.objects.create(user=user, name=address, address=address, private_key="", mnemonic="")
                login(request, user)
            return {"success": True, "address": address, "user_id": user.id}
        else:
            return {"success": False, "error": "Signature does not match address."}
    except Exception as e:
        return {"success": False, "error": str(e)}

@api.post("/auth/verify/linked_only/")
def verify_signature_linked_only(request, address: str, signature: str):
    nonce = cache.get(f"auth_nonce_{address}")
    if not nonce:
        return JsonResponse({"success": False, "error": "No challenge found for this address."}, status=400)
    message = encode_defunct(text=nonce)
    try:
        recovered = EthAccount.recover_message(message, signature=signature)
        if recovered.lower() == address.lower():
            cache.delete(f"auth_nonce_{address}")
            # Option 2: Only allow login for already-linked addresses
            account = Account.objects.filter(address=address).first()
            if not account or not account.user:
                return {"success": False, "error": "Address not linked to any user."}
            user = account.user
            login(request, user)
            return {"success": True, "address": address, "user_id": user.id}
        else:
            return {"success": False, "error": "Signature does not match address."}
    except Exception as e:
        return {"success": False, "error": str(e)}

@auth_router.post("/sign_transaction")
@csrf_exempt
def sign_transaction(request):
    if not hasattr(request, 'user') or not request.user.is_authenticated:
        return JsonResponse({'error': 'Unauthorized'}, status=401)
    data = request.json if hasattr(request, 'json') else request.data
    account_id = data.get('account_id')
    tx = data.get('tx')  # dict: to, value, data, gas, gasPrice, nonce, chainId
    if not account_id or not tx:
        return JsonResponse({'error': 'Missing account_id or tx'}, status=400)
    try:
        account = Account.objects.get(id=account_id, user=request.user)
    except Account.DoesNotExist:
        return JsonResponse({'error': 'Account not found'}, status=404)
    w3 = Web3()
    signed = w3.eth.account.sign_transaction(tx, private_key=account.private_key)
    return JsonResponse({'rawTransaction': signed.rawTransaction.hex(), 'hash': signed.hash.hex()})

@auth_router.post("/sign_message")
@csrf_exempt
def sign_message(request):
    if not hasattr(request, 'user') or not request.user.is_authenticated:
        return JsonResponse({'error': 'Unauthorized'}, status=401)
    data = request.json if hasattr(request, 'json') else request.data
    account_id = data.get('account_id')
    message = data.get('message')
    if not account_id or not message:
        return JsonResponse({'error': 'Missing account_id or message'}, status=400)
    try:
        account = Account.objects.get(id=account_id, user=request.user)
    except Account.DoesNotExist:
        return JsonResponse({'error': 'Account not found'}, status=404)
    w3 = Web3()
    msg = encode_defunct(text=message)
    signed = w3.eth.account.sign_message(msg, private_key=account.private_key)
    return JsonResponse({'signature': signed.signature.hex()})

# Register the router with authentication
api.add_router("/auth", auth_router)
