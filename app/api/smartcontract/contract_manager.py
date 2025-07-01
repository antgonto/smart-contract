import os
import json
from web3 import Web3
from app.api.smartcontract import SEEDWeb3


class ContractManager:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance.abi = None
            cls._instance.address = None
            cls._instance.contract = None
            cls._instance.abi_load_error = None
            cls._instance.web3 = None  # Do not connect on instantiation
            cls._instance.contracts_dir = os.path.abspath(
                os.path.join(os.path.dirname(__file__), "../../../contracts")
            )
            cls._instance.contract_name = "CertificateRegistry"
        return cls._instance

    def connect_web3(self, url="http://ganache:8545"):
        if self.web3 is None:
            self.web3 = SEEDWeb3.connect_to_geth_poa(url)
        return self.web3

    def load_abi(self, abi_path=None):
        if abi_path is None:
            abi_path = os.path.join(self.contracts_dir, f"{self.contract_name}.abi")
        try:
            with open(abi_path, 'r') as f:
                abi_content = f.read()
                try:
                    self.abi = json.loads(abi_content)
                except Exception:
                    import ast
                    self.abi = ast.literal_eval(abi_content)
        except Exception as e:
            self.abi = None
            self.abi_load_error = str(e)

    def load_address(self, address_path=None):
        if address_path is None:
            address_path = os.path.join(self.contracts_dir, f"{self.contract_name}.txt")
        try:
            with open(address_path, 'r') as f:
                self.address = f.read().strip()
        except Exception as e:
            self.address = None
            self.abi_load_error = str(e)

    def update_contract(self):
        if self.abi and self.address:
            try:
                self.contract = self.web3.eth.contract(address=Web3.to_checksum_address(self.address), abi=self.abi)
            except Exception as e:
                self.contract = None
                self.abi_load_error = str(e)
        else:
            self.contract = None

    def refresh(self):
        self.load_abi()
        self.load_address()
        self.update_contract()

    def set_contract_name(self, name):
        self.contract_name = name
        self.refresh()

    def get_contract(self):
        return self.contract

    def get_abi(self):
        return self.abi

    def get_address(self):
        return self.address

    def get_error(self):
        return self.abi_load_error

# Usage example:
# manager = ContractManager()
# manager.refresh()
# contract = manager.get_contract()
# print(manager.get_abi())
# print(manager.get_address())
