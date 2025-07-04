import React, { useState } from 'react';
import { ethers } from 'ethers';
import {
  EuiPanel,
  EuiTitle,
  EuiSpacer,
  EuiForm,
  EuiFormRow,
  EuiFieldText,
  EuiButton,
  EuiCallOut,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const RegisterCertificate = () => {
  const { isAuthenticated, roles } = useAuth();
  const [studentAddress, setStudentAddress] = useState('');
  const [certificateHash, setCertificateHash] = useState('');
  const [ipfsCid, setIpfsCid] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setTxHash(null);

    if (!studentAddress || !certificateHash || !ipfsCid) {
      setError('Please fill out all fields.');
      return;
    }

    setLoading(true);

    try {
      if (!window.ethereum) {
        setError('MetaMask is not installed.');
        return;
      }

      // 1. Get unsigned transaction from the backend
      const unsignedTxResponse = await api.post('/issuer/certificates', {
        student_address: studentAddress,
        certificate_hash: certificateHash,
        ipfs_cid: ipfsCid,
      });

      const unsignedTx = unsignedTxResponse.data;

      // 2. Get signer and send transaction
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const tx = await signer.sendTransaction(unsignedTx);
      setTxHash(tx.hash);

      // 3. Wait for transaction confirmation
      await tx.wait();

    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated || !roles.includes('issuer')) {
    return (
      <EuiPanel style={{ maxWidth: 600, margin: '40px auto' }}>
        <EuiCallOut color="danger" title="Access Denied">
          <p>You must be logged in as an issuer to register a certificate.</p>
        </EuiCallOut>
      </EuiPanel>
    );
  }

  return (
    <EuiPanel style={{ maxWidth: 600, margin: '40px auto' }}>
      <EuiTitle size="l"><h2>Register Certificate</h2></EuiTitle>
      <EuiSpacer size="m" />
      <EuiForm component="form" onSubmit={handleRegister}>
        <EuiFormRow label="Student Wallet Address" fullWidth>
          <EuiFieldText
            placeholder="0x..."
            value={studentAddress}
            onChange={e => setStudentAddress(e.target.value)}
            fullWidth
          />
        </EuiFormRow>
        <EuiFormRow label="Certificate Hash (bytes32)" fullWidth>
          <EuiFieldText
            placeholder="0x..."
            value={certificateHash}
            onChange={e => setCertificateHash(e.target.value)}
            fullWidth
          />
        </EuiFormRow>
        <EuiFormRow label="IPFS Content ID (CID)" fullWidth>
          <EuiFieldText
            placeholder="Qm..."
            value={ipfsCid}
            onChange={e => setIpfsCid(e.target.value)}
            fullWidth
          />
        </EuiFormRow>
        <EuiSpacer />
        <EuiButton type="submit" isLoading={loading} fill>Register Certificate</EuiButton>
      </EuiForm>
      <EuiSpacer />
      {error && <EuiCallOut color="danger" title="Error">{error}</EuiCallOut>}
      {txHash && (
        <EuiCallOut color="success" title="Transaction Sent!">
          <p>Transaction Hash: {txHash}</p>
          {loading && <EuiLoadingSpinner size="m" />}
          {!loading && <p>Transaction has been confirmed.</p>}
        </EuiCallOut>
      )}
    </EuiPanel>
  );
};

export default RegisterCertificate;
