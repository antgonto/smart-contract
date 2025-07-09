from ninja import Router
from typing import List

from app.api.authorization import JWTAuth
from pydantic import BaseModel
from rest_framework_simplejwt.tokens import RefreshToken
from django.conf import settings

from app.api.smartcontract.contract_manager import ContractManager

manager = ContractManager()
manager.refresh()



router = Router(tags=["student"])  # Removed auth=JWTAuth() to make endpoints public

# --- Pydantic Schemas ---
class CertificateDetails(BaseModel):
    hash: str
    issuer: str
    student: str
    timestamp: int
    is_revoked: bool

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
        certificate_hashes = contract.functions.getCertificatesByStudent(student_address).call()

        certificates = []
        for cert_hash_bytes in certificate_hashes:
            cert_hash_hex = "0x" + cert_hash_bytes.hex()
            cert_data = contract.functions.getCertificate(cert_hash_bytes).call()
            # cert_data is a tuple: (issuer, student, timestamp, isRevoked)
            issuer, student, timestamp, is_revoked = cert_data

            certificates.append(
                CertificateDetails(
                    hash=cert_hash_hex,
                    issuer=issuer,
                    student=student,
                    timestamp=timestamp,
                    is_revoked=is_revoked
                )
            )
        return certificates
    except Exception as e:
        # In a real app, you'd want to log this error.
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
