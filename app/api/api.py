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
