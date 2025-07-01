from eth_account import Account

# Create a new wallet
wallet = Account.create()

print("Address:", wallet.address)
print("Private Key:", wallet.key.hex())
