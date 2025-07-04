from ninja import Router, Schema
from web3 import Web3

import cid

from app.api.auth import JWTAuth


router = Router(tags=["issuer"], auth=JWTAuth())

class UnsignedTx(Schema):
    to: str
    data: str
    value: int
    gas: int
    gasPrice: int
    nonce: int
    chainId: int

class IssueRequest(Schema):
    student_address: str
    certificate_hash: str
    ipfs_cid: str

class RevokeRequest(Schema):
    certificate_hash: str

@router.post("/certificates", response=UnsignedTx)
def issue_certificate(request, data: IssueRequest):
    if 'issuer' not in request.auth_roles:
        return 403, {"error": "Permission denied. Issuer role required."}

    issuer_address = request.user.account.address

    tx_data = certificate_registry_contract.functions.registerCertificate(
        w3.to_bytes(hexstr=data.certificate_hash),
        Web3.to_checksum_address(data.student_address),
        data.ipfs_cid
    ).build_transaction({
        'from': issuer_address,
        'nonce': w3.eth.get_transaction_count(issuer_address),
        'gas': 2000000, # Placeholder, estimate gas properly
        'gasPrice': w3.eth.gas_price,
        'chainId': w3.eth.chain_id
    })

    return tx_data

@router.post("/certificates/revoke", response=UnsignedTx)
def revoke_certificate(request, data: RevokeRequest):
    if 'issuer' not in request.auth_roles:
        return 403, {"error": "Permission denied. Issuer role required."}

    issuer_address = request.user.account.address

    tx_data = certificate_registry_contract.functions.revokeCertificate(
        w3.to_bytes(hexstr=data.certificate_hash)
    ).build_transaction({
        'from': issuer_address,
        'nonce': w3.eth.get_transaction_count(issuer_address),
        'gas': 2000000,
        'gasPrice': w3.eth.gas_price,
        'chainId': w3.eth.chain_id
    })

    return tx_data

@router.get("/certificates/{certificate_hash}/file")
def get_certificate_file(request, certificate_hash: str):
    try:
        cert_data = certificate_registry_contract.functions.getCertificate(w3.to_bytes(hexstr=certificate_hash)).call()
        on_chain_student_address = cert_data[1]
        ipfs_cid_str = cert_data[4] # Assuming ipfsCid is at index 4

        # Access Control Check
        is_issuer = 'issuer' in request.auth_roles
        is_student_owner = request.user.account.address.lower() == on_chain_student_address.lower()

        if not (is_issuer or is_student_owner):
            return 403, {"error": "Permission denied."}

        # Fetch from IPFS (this is a placeholder for actual IPFS fetching logic)
        # In a real app, you would use an IPFS client to get the file.
        # For now, we'll just return the CID.
        return {"message": "File access granted", "ipfs_cid": ipfs_cid_str}

    except Exception as e:
        return 500, {"error": str(e)}
