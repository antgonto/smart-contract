from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group

class Command(BaseCommand):
    help = 'Create default admin user, verifier group, and set is_verifier'

    def handle(self, *args, **options):
        User = get_user_model()
        username = 'admin'
        password = 'admin'
        email = 'admin@example.com'
        group_name = 'verifier'
        print()
        # Create superuser if not exists
        if not User.objects.filter(username=username).exists():
            user = User.objects.create_superuser(username=username, password=password, email=email)
            self.stdout.write(self.style.SUCCESS(f'Created superuser {username}'))
        else:
            user = User.objects.get(username=username)
            self.stdout.write(self.style.WARNING(f'Superuser {username} already exists'))

        # Create verifier group if not exists
        group, created = Group.objects.get_or_create(name=group_name)
        if created:
            self.stdout.write(self.style.SUCCESS(f'Created group {group_name}'))
        else:
            self.stdout.write(self.style.WARNING(f'Group {group_name} already exists'))

        # Add user to verifier group
        user.groups.add(group)
        self.stdout.write(self.style.SUCCESS(f'Added {username} to group {group_name}'))

        # Set is_verifier to True if field exists
        if hasattr(user, 'is_verifier'):
            user.is_verifier = True
            user.save()
            self.stdout.write(self.style.SUCCESS(f'Set is_verifier=True for {username}'))
        else:
            self.stdout.write(self.style.WARNING(f'User model has no is_verifier field'))

        # --- Blockchain contract deployment and admin role setup ---
        try:
            from web3 import Web3
            import json
            import os
            GANACHE_URL = 'http://localhost:8545'
            CONTRACTS_DIR = 'contracts'
            CONTRACT_NAME = 'CertificateRegistry'
            CONTRACT_ADDRESS_PATH = os.path.join(CONTRACTS_DIR, f'{CONTRACT_NAME}.txt')
            ABI_PATH = os.path.join(CONTRACTS_DIR, f'{CONTRACT_NAME}.abi')
            BIN_PATH = os.path.join(CONTRACTS_DIR, f'{CONTRACT_NAME}.bin')
            w3 = Web3(Web3.HTTPProvider(GANACHE_URL))
            admin_account = w3.eth.accounts[0]
            # Deploy contract if not already deployed
            if not os.path.exists(CONTRACT_ADDRESS_PATH):
                self.stdout.write(self.style.WARNING(f"Contract address file not found. Deploying {CONTRACT_NAME}..."))
                with open(ABI_PATH, 'r') as f:
                    abi = json.load(f)
                with open(BIN_PATH, 'r') as f:
                    bytecode = f.read().strip()
                contract = w3.eth.contract(abi=abi, bytecode=bytecode)
                tx_hash = contract.constructor().transact({'from': admin_account})
                tx_receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
                contract_address = tx_receipt.contractAddress
                with open(CONTRACT_ADDRESS_PATH, 'w') as f:
                    f.write(contract_address)
                self.stdout.write(self.style.SUCCESS(f"Deployed {CONTRACT_NAME} at {contract_address}"))
            else:
                with open(CONTRACT_ADDRESS_PATH, 'r') as f:
                    contract_address = f.read().strip()
                self.stdout.write(self.style.SUCCESS(f"{CONTRACT_NAME} already deployed at {contract_address}"))
                with open(ABI_PATH, 'r') as f:
                    abi = json.load(f)
            contract = w3.eth.contract(address=contract_address, abi=abi)
            DEFAULT_ADMIN_ROLE = w3.keccak(text="DEFAULT_ADMIN_ROLE")
            has_role = contract.functions.hasRole(DEFAULT_ADMIN_ROLE, admin_account).call()
            if not has_role:
                self.stdout.write(self.style.WARNING(f"Granting DEFAULT_ADMIN_ROLE to {admin_account} on blockchain..."))
                tx = contract.functions.grantRole(DEFAULT_ADMIN_ROLE, admin_account).transact({'from': admin_account})
                w3.eth.wait_for_transaction_receipt(tx)
                self.stdout.write(self.style.SUCCESS(f"Granted DEFAULT_ADMIN_ROLE to {admin_account} on blockchain."))
            else:
                self.stdout.write(self.style.SUCCESS(f"Account {admin_account} already has DEFAULT_ADMIN_ROLE on blockchain."))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Blockchain contract deployment/admin role setup failed: {e}"))
