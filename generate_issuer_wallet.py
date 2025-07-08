from eth_account import Account
import json

# Enable mnemonic features
Account.enable_unaudited_hdwallet_features()

# Generate a new wallet with mnemonic
acct, mnemonic = Account.create_with_mnemonic()

wallet_data = {
    "address": acct.address,
    "private_key": acct.key.hex(),
    "mnemonic": mnemonic
}

with open("admin_wallet.json", "w") as f:
    json.dump(wallet_data, f, indent=2)

print(f"Admin wallet generated: {wallet_data['address']}")

