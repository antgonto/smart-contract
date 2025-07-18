from ninja import Router
from typing import List

from app.api.authorization import JWTAuth
from pydantic import BaseModel
from rest_framework_simplejwt.tokens import RefreshToken
from django.conf import settings

from app.api.smartcontract.contract_manager import ContractManager

manager = ContractManager()
# manager.refresh()



router = Router(tags=["student"])  # Removed auth=JWTAuth() to make endpoints public

# --- Pydantic Schemas ---
class CertificateDetails(BaseModel):
    hash: str
    issuer: str
    student: str
    timestamp: int
    is_revoked: bool
    ipfs_hash: str
    storage_mode: str
    pdf_on_chain: str | None = None

class ErrorSchema(BaseModel):
    error: str

class StudentLoginRequest(BaseModel):
    address: str

class StudentTokenResponse(BaseModel):
    access: str
    refresh: str

@router.get(
    "/certificates",
    response={200: List[CertificateDetails], 400: ErrorSchema, 500: ErrorSchema}
)
def get_my_certificates(request, student_address: str):
    contract = manager.get_contract()
    try:
        # Use the event logs to get all certificates, then filter by student_address
        events = contract.events.DiplomaIssued().get_logs(fromBlock=0)
        certificates = []
        for event in events:
            cert_hash = event.args.diplomaId.hex()
            issuer = getattr(event.args, 'issuer', None)
            student = getattr(event.args, 'student', None)
            ipfs_hash = getattr(event.args, 'ipfsHash', None)
            timestamp = getattr(event.args, 'issuedAt', None)
            storage_mode_int = getattr(event.args, 'storageMode', 1)  # Default to OFF_CHAIN
            storage_mode = "ON_CHAIN" if storage_mode_int == 0 else "OFF_CHAIN"
            pdf_on_chain_bytes = getattr(event.args, 'pdfOnChain', None)
            pdf_on_chain_hex = pdf_on_chain_bytes.hex() if pdf_on_chain_bytes else None
            is_revoked = False  # You may want to check for revocation events if needed
            if student and student.lower() == student_address.lower():
                certificates.append(
                    CertificateDetails(
                        hash=cert_hash,
                        issuer=issuer,
                        student=student,
                        timestamp=timestamp if timestamp is not None else 0,
                        is_revoked=is_revoked,
                        ipfs_hash=ipfs_hash or "",
                        storage_mode=storage_mode,
                        pdf_on_chain=pdf_on_chain_hex
                    )
                )
        return certificates
    except Exception as e:
        print(f"Error fetching certificates for {student_address}: {e}")
        return 500, {"error": "Could not retrieve certificates from the blockchain."}

@router.post(
    "/login",
    response={200: StudentTokenResponse, 400: ErrorSchema}
)
def student_login(request, data: StudentLoginRequest):
    # Here you could add signature verification if needed
    address = data.address
    # Optionally, check if the address exists in your system
    try:
        refresh = RefreshToken.for_user(None)  # No user object, so we use custom payload
        # Add custom claims
        refresh["address"] = address
        access = refresh.access_token
        access["address"] = address
        return 200, StudentTokenResponse(access=str(access), refresh=str(refresh))
    except Exception as e:
        return 400, {"error": f"Login failed: {str(e)}"}
