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


### 5.5 Access Control / Authorization

**High‑Level Principle**  
Achieve least‑privilege access by combining _on‑chain_ role enforcement for immutable
operations (issuance, revocation) with _off‑chain_ token‑based policies for dynamic,
fine‑grained actions (downloads, dashboard queries).

#### 5.5.1 Actors and Roles
| Role | Identifier | Privileges (summary) |
|------|------------|----------------------|
| **Issuer / Registrar** | `ISSUER_ROLE` (bytes32) | Issue and revoke certificates on‑chain; access issuer API endpoints |
| **Student** | Wallet address linked to certificate OR university SSO ID | View personal certificates, download files |
| **Verifier (3rd Party)** | _Public_ (no wallet required) | Validate certificate authenticity via hash or QR code |
| **System Admin** | Contract owner / multisig | Grant or revoke `ISSUER_ROLE`; manage API keys, secrets |

#### 5.5.2 Functional Requirements
* **AC‑01**: The smart contract **shall** implement RBAC using `AccessControl` from OpenZeppelin; only addresses with `ISSUER_ROLE` may call `registerCertificate` or `revokeCertificate`.
* **AC‑02**: The contract **shall** expose `grantRole` and `revokeRole` functions restricted to the owner (multisig) for governance.
* **AC‑03**: The backend API **shall** require OAuth 2.0 /JWT bearer tokens; each token **shall** include a `role` claim (`issuer`, `student`) and an expiry ≤ 60 min.
* **AC‑04**: The `POST /api/certificates/` endpoint **shall** validate that the caller's token role == `issuer` _and_ the wallet signature matches the JWT `sub` claim.
* **AC‑05**: The `GET /api/certificates/{hash}/file` endpoint **shall** allow access only if `(caller.role == issuer)` **OR** `(caller.role == student ∧ caller.address == onChain.studentAddress)`.
* **AC‑06**: The public verification endpoint **shall** be rate‑limited to 100 requests / IP / hr and protected by reCAPTCHA to deter scraping.
* **AC‑07**: All API responses **shall** include an `x‑trace‑id` header to correlate with audit logs.
* **AC‑08**: Attempts to call restricted smart‑contract functions without proper role **shall** revert with a clear error code (`AC01`).

#### 5.5.3 Non‑Functional Requirements
| Category | Requirement |
|----------|-------------|
| **Tamper‑proofing (On‑Chain)** | Role assignments are immutable once mined; any role change is logged via `RoleGranted` / `RoleRevoked` events. |
| **Granularity (Off‑Chain)** | Backend policy engine **shall** support attribute‑based rules (e.g.\ department, program, certificate type) loaded from an external policy store without redeploying contracts. |
| **Latency** | Off‑chain authorization decision ≤ 50 ms at P95; on‑chain role check gas cost ≤ 25 000 gas. |
| **Revocation Propagation** | JWT blacklist cache refresh ≤ 5 min; contract role revocation effective immediately after block confirmation. |
| **Compliance** | Access‑control implementation **shall** meet FERPA “school official” exception and GDPR data‑minimization principles. |

#### 5.5.4 Trade‑Off Summary
* **On‑Chain**: +Immutable, auditable, composable with other contracts; −High gas for frequent changes, coarse‑grained.
* **Off‑Chain**: +Dynamic, fine‑grained, zero‑gas; −Requires trusted backend and robust audit logging.

> **Design Decision** Use on‑chain RBAC exclusively for high‑impact actions (issue/revoke).  
> Delegate user‑centric operations (download, dashboard queries) to the backend, enforced by short‑lived JWTs and API‑gateway rate limits.

## 5.6 User Interface Screens

Based on the access control requirements, the following user interface screens are necessary to support each stakeholder.

### 5.6.1 Public Verification Portal

This screen is for third-party **Verifiers** and does not require authentication.

*   **Purpose:** To allow anyone to verify the authenticity of a certificate.
*   **Key Features:**
    *   A simple interface with a single input field to paste a certificate hash or upload a certificate file/QR code.
    *   A "Verify" button that submits the data to the public verification endpoint.
    *   The interface must display the validation result clearly: "Valid," "Revoked," or "Not Found."
    *   If valid, it should display non-sensitive certificate details (e.g., Student Name, Program, Issuance Date).
    *   This screen must be protected by reCAPTCHA and be rate-limited to prevent scraping, as per **AC-06**.

### 5.6.2 Student Dashboard

This screen is for **Students** and requires authentication (e.g., via university SSO or wallet signature) to obtain a JWT, as per **AC-03**.

*   **Purpose:** To provide students with a secure view of their academic certificates.
*   **Key Features:**
    *   A login mechanism to authenticate the student.
    *   A personalized dashboard listing all certificates issued to the student.
    *   For each certificate, the student can:
        *   View detailed information.
        *   Download the certificate file (e.g., PDF). This action is authorized by the backend, which checks for the `student` role and matching wallet address, as per **AC-05**.
        *   View the on-chain transaction details on a block explorer.

### 5.6.3 Issuer Dashboard

This screen is for the **Issuer/Registrar** and requires authentication to obtain a JWT with an `issuer` role claim, as per **AC-03** and **AC-04**.

*   **Purpose:** To provide a comprehensive interface for managing the lifecycle of academic certificates.
*   **Key Features:**
    *   A secure login portal for issuer staff.
    *   A main dashboard displaying a searchable and filterable list of all certificates issued by the institution.
    *   **Issue Certificate Form:** A dedicated form to issue a new certificate. This form will trigger a backend request that calls the `registerCertificate` smart contract function, enforced by on-chain `ISSUER_ROLE` checks (**AC-01**) and off-chain JWT validation (**AC-04**).
    *   **Certificate Revocation:** An option on each certificate's detail view to revoke it. This action must be clearly marked as irreversible and will call the `revokeCertificate` function, also protected by **AC-01**.

### 5.6.4 Admin Governance Dashboard

This screen is for the **System Admin** (e.g., contract owner or multisig wallet holder) and requires the highest level of authentication.

*   **Purpose:** To manage the access control system itself, including roles and security configurations.
*   **Key Features:**
    *   **Role Management Interface:**
        *   A view listing all addresses currently assigned the `ISSUER_ROLE`.
        *   A form to grant the `ISSUER_ROLE` to a new address by calling the `grantRole` function.
        *   A button to revoke the `ISSUER_ROLE` from an address by calling the `revokeRole` function.
        *   These actions are restricted to the contract owner, as per **AC-02**.
    *   **API Key and Secrets Management:** An interface for managing credentials used by the backend services.
    *   **Audit Log Viewer:** A view that displays critical system and on-chain events, such as `RoleGranted` and `RoleRevoked`, to ensure transparency and security monitoring.

### 5.7 Audit and Logging
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
