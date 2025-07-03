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
