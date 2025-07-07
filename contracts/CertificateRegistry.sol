// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/access/AccessControl.sol";

contract CertificateRegistry is AccessControl {
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");
    bytes32 public constant STUDENT_ROLE = keccak256("STUDENT_ROLE");

    struct Certificate {
        bytes32 certHash;
        address issuer;
        address student;
        uint256 issuedAt;
        string ipfsCid;
        bool isRevoked;
        string role;
    }

    mapping(bytes32 => Certificate) public certificates;
    mapping(address => bytes32[]) public certificatesByStudent; // Changed from certificatesByRecipient

    event CertificateRegistered(bytes32 indexed certHash, address indexed issuer, address indexed student, uint256 issuedAt, string ipfsCid);
    event CertificateRevoked(bytes32 indexed certHash);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ISSUER_ROLE, msg.sender);
    }

    function registerCertificate(bytes32 certHash, address student, string calldata ipfsCid) external onlyRole(ISSUER_ROLE) {
        require(certificates[certHash].issuedAt == 0, "Certificate already exists");

        Certificate memory cert = Certificate({
            certHash: certHash,
            issuer: msg.sender,
            student: student,
            issuedAt: block.timestamp,
            ipfsCid: ipfsCid,
            isRevoked: false,
            role: "Issuer" // Capitalized
        });

        certificates[certHash] = cert;
        certificatesByStudent[student].push(certHash);

        // Grant the student role if they don't have it already
        if (!hasRole(STUDENT_ROLE, student)) {
            _grantRole(STUDENT_ROLE, student);
        }

        emit CertificateRegistered(certHash, msg.sender, student, block.timestamp, ipfsCid);
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

    function getCertificateWithRole(bytes32 certHash) external view returns (address issuer, address student, uint256 timestamp, bool isRevoked, string memory role) {
        require(certificates[certHash].issuedAt != 0, "Certificate does not exist");
        Certificate memory cert = certificates[certHash];
        return (cert.issuer, cert.student, cert.issuedAt, cert.isRevoked, cert.role);
    }

    function getCertificatesByStudent(address student) external view returns (bytes32[] memory) {
        return certificatesByStudent[student];
    }

    // Returns the roles of an address (issuer, student, or both)
    function getRoles(address account) external view returns (string[] memory) {
        string[] memory rolesTmp = new string[](3); // Increased size to 3 for Admin, Issuer, Student
        uint count = 0;

        if (hasRole(DEFAULT_ADMIN_ROLE, account)) {
            rolesTmp[count] = "Admin";
            count++;
        }
        if (hasRole(ISSUER_ROLE, account)) {
            rolesTmp[count] = "Issuer";
            count++;
        }
        if (hasRole(STUDENT_ROLE, account)) {
            rolesTmp[count] = "Student";
            count++;
        }

        string[] memory roles = new string[](count);
        for (uint i = 0; i < count; i++) {
            roles[i] = rolesTmp[i];
        }
        return roles;
    }

    // Add a function to allow admin to grant ISSUER_ROLE to an address
    function grantIssuerRole(address account) public onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(ISSUER_ROLE, account);
    }

    // Add a function to allow admin to revoke ISSUER_ROLE from an address
    function revokeIssuerRole(address account) public onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(ISSUER_ROLE, account);
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