from ninja import NinjaAPI, Swagger, Schema
from django.http import JsonResponse
import os


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
    ("/auth/", "app.api.auth.router.router", ["auth"]),
    ("/smartcontract/", "app.api.smartcontract.router.router", ["smartcontract"]),
    ("/wallet/", "app.api.wallet.router.router", ["wallet"]),
    ("/admin/", "app.api.admin.router.router", ["admin"]),
    ("/issuer/", "app.api.issuer.router.router", ["issuer"]),
    ("/student/", "app.api.student.router.router", ["student"]),
    ("/public/", "app.api.public.router.router", ["public"]),
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


class AddressRequest(Schema):
    address: str


@api.post("/logged-address")
def set_logged_address(request, payload: AddressRequest):
    try:
        logged_path = os.path.join(os.path.dirname(__file__), '../logged.txt')
        # Always delete and recreate the file to ensure only the last student address is stored
        if os.path.exists(logged_path):
            os.remove(logged_path)
        with open(logged_path, 'w') as f:
            f.write(payload.address)
        return JsonResponse({"status": "ok"})
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=500)


@api.get("/logged-address-get")
def get_logged_address(request):
    import os
    logged_path = os.path.join(os.path.dirname(__file__), '../logged.txt')
    try:
        with open(logged_path, 'r') as f:
            address = f.read().strip()
        return {"address": address}
    except Exception:
        return {"address": None}
