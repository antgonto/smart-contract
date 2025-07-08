# CertificateRegistry Smart Contract Analysis

## 1. Roles

- **Issuer:** A university or institution (wallet address) with the `ISSUER_ROLE`.
- **Student:** Each student has a wallet address.
- **Verifier:** Public; any party can verify a diploma via its hash or metadata.

## 2. Diploma Representation

- **On-chain:** Stores a hash of the diploma PDF (certHash) and the IPFS CID.
- **Off-chain:** The actual PDF is stored on IPFS.
- **Metadata:** Includes student wallet address, issue date, issuer address, and a `role` string.

## 3. Current Implementation (from CertificateRegistry.sol)

### Implemented Features

| Feature                                 | Status         | Notes                                                      |
|------------------------------------------|---------------|------------------------------------------------------------|
| Issuer registers diploma                 | Implemented   | `registerDiploma` (not shown, but implied in excerpt)      |
| Student can access diplomas              | Implemented   | `getCertificatesByStudent(address)`                        |
| Public verification                      | Implemented   | `getCertificate`, `getCertificateWithRole`                 |
| Only issuer can register                 | Implemented   | `onlyRole(ISSUER_ROLE)`                                    |
| Diplomas assigned to student at creation | Implemented   | `certificatesByStudent[student].push(certHash)`            |
| Revocation                              | Implemented   | `revokeCertificate`                                        |
| IPFS CID stored                         | Implemented   | `ipfsCid` in Certificate struct                            |

### Functions in the Excerpt

- `revokeCertificate(bytes32 certHash)`: Allows issuers to revoke a certificate.
- `getCertificate(bytes32 certHash)`: Returns issuer, student, timestamp, and revocation status.
- `getCertificateWithRole(bytes32 certHash)`: Returns issuer, student, timestamp, revocation status, and role.
- `getCertificatesByStudent(address student)`: Returns all certificate hashes for a student.
- `getRoles(address account)`: Returns the roles of an address.

### Observations

- **Student Access:** `getCertificatesByStudent` is public; there is no `getMyDiplomas()` restricted to the student.
- **Public Verification:** Anyone can call `getCertificate` or `getCertificateWithRole` to verify a diploma.
- **PDF Retrieval:** The IPFS CID is stored in the Certificate struct, but not returned by `getCertificate` or `getCertificateWithRole` in the provided excerpt.
- **Degree Type:** Not present in the Certificate struct in the provided excerpt.

## 4. Missing or To Be Confirmed

- **Degree Type in Metadata:** Not present; should be added if required.
- **getMyDiplomas():** Not present; would restrict access to `msg.sender`.
- **Explicit verifyDiploma(hash):** Not present, but verification can be done via `getCertificate`.
- **IPFS CID Retrieval:** Not returned by current getter functions; should be added for PDF access.

## 5. Access Control

- **Student Access:** Anyone can call `getCertificatesByStudent(address)`. For privacy, a `getMyDiplomas()` function could be added.
- **Public Verification:** Fully supported.
- **Issuer Controls:** Only issuers can register or revoke diplomas.

---

## Summary Table

| Requirement                            | Status         | Notes                                                      |
|-----------------------------------------|---------------|------------------------------------------------------------|
| Issuer registers diploma                | Implemented   |                                                            |
| Student can access diplomas             | Implemented   | Public, not restricted                                     |
| Public verification                     | Implemented   |                                                            |
| Only issuer can register                | Implemented   |                                                            |
| Only student can view own diplomas      | Missing       | `getMyDiplomas()` not present                              |
| Anyone can verify                       | Implemented   |                                                            |
| PDF retrieval (IPFS CID)                | Missing       | Not returned by getter functions                           |
| Degree type in metadata                 | Missing       | Not present in Certificate struct                          |

---

## Next Steps

1. **Add degree type** to the Certificate struct and registration process if required.
2. **Add getMyDiplomas()** function restricted to `msg.sender` for student privacy.
3. **Add IPFS CID retrieval** in getter functions for PDF access.
4. **Optionally, add verifyDiploma(hash)** as a public function for clarity.

---

Let me know if you want to proceed with any of the missing features or need further analysis!

