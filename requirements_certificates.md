# Academic Certificate Management System — Requirements
*Version: 1.0 – 2025-07-04*

## 1&nbsp;&nbsp;Purpose
Provide a secure, decentralized platform that enables higher‑education institutions to issue, store, and manage academic certificates
on a public blockchain while allowing students to retrieve their records and third‑party verifiers to confirm authenticity using the
document’s cryptographic hash.

## 2&nbsp;&nbsp;Scope
The system covers the complete life‑cycle of certificate data:
issuance, on‑chain anchoring, off‑chain storage, student self‑service access, third‑party verification, revocation, and audit logging.
Out‑of‑scope items include student enrollment workflows and payment processing.

## 3&nbsp;&nbsp;Stakeholders
| Role | Description |
|------|-------------|
| **Issuer / Registrar** | Authorized institutional unit that creates and revokes certificates |
| **Student** | Certificate owner who can view and download credentials |
| **Verifier** | Employer, university, or agency validating a certificate via its hash |
| **System Administrator** | Operates infrastructure, manages keys, monitors performance |

## 4&nbsp;&nbsp;Definitions and Abbreviations
| Term | Meaning |
|------|---------|
| **CID** | Content Identifier returned by IPFS for an uploaded file |
| **IPFS** | InterPlanetary File System, used for off‑chain storage |
| **SHA‑256** | Cryptographic hash algorithm producing a 32‑byte digest |
| **Smart Contract** | Solidity code deployed to Ethereum that records certificate metadata |
| **Revocation** | Action that permanently marks a certificate as invalid |

## 5&nbsp;&nbsp;Functional Requirements
### 5.1 Issuance
* **FR‑01**: The system shall allow an Issuer to upload a certificate file (PDF) together with metadata (student ID, program, date).
* **FR‑02**: Upon upload, the backend shall calculate a SHA‑256 hash of the file.
* **FR‑03**: The backend shall store the file in IPFS and obtain its CID.
* **FR‑04**: The backend shall call `registerCertificate` on the smart contract, persisting: issuer address, recipient address, file hash, CID, and timestamp.
* **FR‑05**: The smart contract shall emit a `CertificateRegistered` event with the same data.

### 5.2 Retrieval (Student)
* **FR‑06**: The system shall authenticate a Student via institutional SSO or blockchain wallet signature.
* **FR‑07**: The Student dashboard shall list all certificates issued to the student, including status and download links.
* **FR‑08**: The Student shall be able to download the certificate file directly from IPFS via gateway or pinned node.

### 5.3 Verification (Third‑Party)
* **FR‑09**: A Verifier shall be able to input a certificate hash (or QR code) into a public verification portal.
* **FR‑10**: The portal shall retrieve on‑chain metadata, recompute the file hash from IPFS, and display authenticity status (✓/✗).
* **FR‑11**: Verification shall complete without requiring the Verifier to create a blockchain wallet or pay gas.

### 5.4 Revocation and Expiry
* **FR‑12**: An Issuer shall revoke a certificate by calling `revokeCertificate(hash)` on the smart contract.
* **FR‑13**: The contract shall emit a `CertificateRevoked` event and update the status mapping.
* **FR‑14**: The verification portal shall flag revoked certificates as invalid.

### 5.5 Access Control
* **FR‑15**: Only addresses flagged as `issuer` in the contract shall execute issuance or revocation functions.
* **FR‑16**: The backend API shall expose JWT‑protected endpoints for student actions.
* **FR‑17**: All public on‑chain data shall remain readable without authentication.

### 5.6 Audit and Logging
* **FR‑18**: Every issuance and revocation transaction shall be permanently logged on‑chain via events.
* **FR‑19**: The backend shall record off‑chain access logs (student downloads, verification look‑ups) in an immutable append‑only datastore.

## 6&nbsp;&nbsp;Non‑Functional Requirements
| Category | Requirement |
|----------|-------------|
| **Security** | End‑to‑end TLS; private keys stored in HSM; contract follows OpenZeppelin best practices |
| **Privacy**  | No personally identifiable information stored on‑chain; documents remain off‑chain to satisfy FERPA/GDPR |
| **Performance** | Verification response time ≤ 3 s under normal load; issuance throughput ≥ 50 certificates/min |
| **Cost** | Gas per issuance ≤ 0.005 ETH (mainnet equivalent) via layer‑2 or testnet deployment |
| **Scalability** | Support 1 M certificates without contract refactoring; IPFS cluster with horizontal pinning |
| **Availability** | 99.9 % monthly uptime for backend API and IPFS gateway |
| **Maintainability** | Modular micro‑services; CI/CD pipeline with unit and integration tests |
| **Compliance** | Align with FERPA (US), GDPR (EU), and NYU information‑security policies |

## 7&nbsp;&nbsp;Technology Stack
* **Blockchain**: Ethereum (Goerli/Sepolia testnet; later mainnet or layer‑2 Optimism)
* **Smart Contracts**: Solidity ≥0.8.20, Hardhat for compilation and tests
* **Storage**: IPFS cluster (Kubo) with pinned nodes on‑premises and in the cloud
* **Backend**: Python 3.12, Django‑Ninja, web3.py, Postgres for user/session data
* **Frontend**: React 18 (TypeScript) with Elastic UI; Ethers.js for wallet interactions
* **Infrastructure**: Docker Compose for local dev; Kubernetes (K3s) for staging/prod

## 8&nbsp;&nbsp;API Endpoints (REST)
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/certificates/` | Upload and issue a new certificate |
| `GET`  | `/api/certificates/{hash}` | Retrieve on‑chain metadata |
| `GET`  | `/api/certificates/{hash}/file` | Stream certificate file from IPFS |
| `POST` | `/api/certificates/{hash}/revoke` | Revoke a certificate (issuer only) |
| `GET`  | `/api/verify/{hash}` | Public verification endpoint |

## 9&nbsp;&nbsp;Smart Contract Interface
```solidity
event CertificateRegistered(bytes32 indexed hash, address indexed issuer,
                             address indexed student, string cid, uint256 timestamp);
event CertificateRevoked(bytes32 indexed hash, address issuer, uint256 timestamp);

function registerCertificate(bytes32 hash, address student, string calldata cid) external onlyIssuer;
function revokeCertificate(bytes32 hash) external onlyIssuer;
function getCertificate(bytes32 hash) external view returns (Certificate memory);
```

## 10&nbsp;&nbsp;Certificate Life‑Cycle
1. **Issue** → 2. **Store** (IPFS) → 3. **Anchor** (Blockchain) → 4. **Download/Verify** →
   5. **Revoke** (optional) → 6. **Audit**

## 11&nbsp;&nbsp;Regulatory and Legal Considerations
* Comply with **FERPA** for U.S. student records.
* Support **GDPR** data‑erasure requests by storing only hashes on‑chain.
* Provide accessibility features in the web portal per WCAG 2.1 AA.

## 12&nbsp;&nbsp;Future Enhancements
* Layer‑2 rollups to further reduce gas costs.
* NFT wrapper (ERC‑721) for wallet‑friendly representation.
* Chainlink Functions oracle to auto‑validate off‑chain storage integrity.
