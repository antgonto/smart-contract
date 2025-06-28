// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract CertificateRegistry {
    struct Certificate {
        bytes32 certHash;
        address issuer;
        address recipient;
        uint256 issuedAt;
        string metadata; // Optional: e.g., IPFS hash or description
        string content; // Optional: full certificate content (use with caution)
    }

    mapping(bytes32 => Certificate) public certificates;
    mapping(address => bytes32[]) public certificatesByRecipient;
    event CertificateRegistered(bytes32 indexed certHash, address indexed issuer, address indexed recipient, uint256 issuedAt, string metadata);

    function registerCertificate(bytes32 certHash, address recipient, string calldata metadata, string calldata content) external {
        require(certificates[certHash].issuedAt == 0, "Certificate already exists");
        Certificate memory cert = Certificate({
            certHash: certHash,
            issuer: msg.sender,
            recipient: recipient,
            issuedAt: block.timestamp,
            metadata: metadata,
            content: content
        });
        certificates[certHash] = cert;
        certificatesByRecipient[recipient].push(certHash);
        emit CertificateRegistered(certHash, msg.sender, recipient, block.timestamp, metadata);
    }

    function getCertificate(bytes32 certHash) external view returns (Certificate memory) {
        require(certificates[certHash].issuedAt != 0, "Certificate does not exist");
        return certificates[certHash];
    }

    function getCertificatesByRecipient(address recipient) external view returns (bytes32[] memory) {
        return certificatesByRecipient[recipient];
    }
}
