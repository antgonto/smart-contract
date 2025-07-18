// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/access/AccessControl.sol";

contract CertificateRegistry is AccessControl {
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");
    bytes32 public constant STUDENT_ROLE = keccak256("STUDENT_ROLE");

    enum StorageMode { ON_CHAIN, OFF_CHAIN }

    struct Certificate {
        bytes32 diplomaId;
        address issuer;
        address student;
        uint256 issuedAt;
        string metadata;
        StorageMode storageMode;
        bytes pdfOnChain;
        string ipfsHash;
        bool isRevoked;
        string role;
    }

    mapping(bytes32 => Certificate) public certificates;
    mapping(address => bytes32[]) public certificatesByStudent;

    event DiplomaIssued(
        bytes32 indexed diplomaId,
        address indexed issuer,
        address indexed student,
        uint256 issuedAt,
        string metadata,
        StorageMode storageMode,
        string ipfsHash,
        bytes pdfOnChain
    );
    event CertificateRevoked(bytes32 indexed certHash);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ISSUER_ROLE, msg.sender);
    }

    function registerCertificate(
        bytes32 diplomaId,
        address student,
        string calldata metadata,
        StorageMode storageMode,
        bytes calldata pdfOnChain,
        string calldata ipfsHash
    ) external onlyRole(ISSUER_ROLE) {
        require(student != address(0), "Invalid student address");
        require(certificates[diplomaId].issuedAt == 0, "Certificate already exists");

        if (storageMode == StorageMode.ON_CHAIN) {
            require(pdfOnChain.length > 0, "PDF data is required for on-chain storage");
        } else {
            require(bytes(ipfsHash).length > 0, "IPFS hash is required for off-chain storage");
        }

        certificates[diplomaId] = Certificate({
            diplomaId: diplomaId,
            issuer: msg.sender,
            student: student,
            issuedAt: block.timestamp,
            metadata: metadata,
            storageMode: storageMode,
            pdfOnChain: pdfOnChain,
            ipfsHash: ipfsHash,
            isRevoked: false,
            role: "Issuer"
        });

        certificatesByStudent[student].push(diplomaId);

        if (!hasRole(STUDENT_ROLE, student)) {
            _grantRole(STUDENT_ROLE, student);
        }

        emit DiplomaIssued(diplomaId, msg.sender, student, block.timestamp, metadata, storageMode, ipfsHash, pdfOnChain);
    }

    function revokeCertificate(bytes32 certHash) external onlyRole(ISSUER_ROLE) {
        require(certificates[certHash].issuedAt != 0, "Certificate does not exist");
        require(!certificates[certHash].isRevoked, "Certificate already revoked");

        certificates[certHash].isRevoked = true;
        emit CertificateRevoked(certHash);
    }

    function getCertificate(bytes32 certHash) external view returns (address issuer, address student, uint256 timestamp, bool isRevoked) {
        require(certificates[certHash].issuedAt != 0, "Certificate does not exist");
        Certificate memory cert = certificates[certHash];
        return (cert.issuer, cert.student, cert.issuedAt, cert.isRevoked);
    }

    function getCertificatesByStudent(address student) external view returns (bytes32[] memory) {
        return certificatesByStudent[student];
    }

    function verifyCertificate(bytes32 diplomaId) external view returns (
        bool exists,
        address issuer,
        address student,
        uint256 issuedAt,
        string memory metadata,
        StorageMode storageMode,
        bytes memory pdfOnChain,
        string memory ipfsHash,
        bool isRevoked
    ) {
        Certificate storage cert = certificates[diplomaId];
        exists = cert.issuedAt != 0;
        if (exists) {
            issuer = cert.issuer;
            student = cert.student;
            issuedAt = cert.issuedAt;
            metadata = cert.metadata;
            storageMode = cert.storageMode;
            pdfOnChain = cert.pdfOnChain;
            ipfsHash = cert.ipfsHash;
            isRevoked = cert.isRevoked;
        }
    }

    function grantStudentRole(address account) public onlyRole(ISSUER_ROLE) {
        _grantRole(STUDENT_ROLE, account);
    }

    function revokeStudentRole(address account) public onlyRole(ISSUER_ROLE) {
        _revokeRole(STUDENT_ROLE, account);
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return interfaceId == type(IAccessControl).interfaceId || super.supportsInterface(interfaceId);
    }
}