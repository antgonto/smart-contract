import React, { useState } from 'react';
import {
  EuiPage, EuiPageBody, EuiPageSection, EuiPageHeader, EuiTitle, EuiCard,
  EuiForm, EuiFormRow, EuiFieldText, EuiButton, EuiSpacer, EuiCallOut, EuiLoadingSpinner
} from '@elastic/eui';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { ethers } from 'ethers';

export const IssuerDashboard: React.FC = () => {
  const { isAuthenticated, roles } = useAuth();

  // State for issuing
  const [studentAddress, setStudentAddress] = useState('');
  const [certificateHash, setCertificateHash] = useState('');
  const [ipfsCid, setIpfsCid] = useState('');
  const [issueLoading, setIssueLoading] = useState(false);
  const [issueError, setIssueError] = useState('');
  const [issueTxHash, setIssueTxHash] = useState<string | null>(null);

  // State for revoking
  const [revokeHash, setRevokeHash] = useState('');
  const [revokeLoading, setRevokeLoading] = useState(false);
  const [revokeError, setRevokeError] = useState('');
  const [revokeTxHash, setRevokeTxHash] = useState<string | null>(null);

  const handleIssue = async () => {
    setIssueLoading(true);
    setIssueError('');
    setIssueTxHash(null);
    try {
      if (!window.ethereum) {
        setIssueError('MetaMask is not installed.');
        return;
      }

      const unsignedTxResponse = await api.post('/issuer/certificates', {
        student_address: studentAddress,
        certificate_hash: certificateHash,
        ipfs_cid: ipfsCid,
      });
      const unsignedTx = unsignedTxResponse.data;

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const tx = await signer.sendTransaction(unsignedTx);
      setIssueTxHash(tx.hash);
      await tx.wait();
    } catch (err: any) {
      setIssueError(err.response?.data?.error || err.message || 'Failed to issue certificate.');
    } finally {
      setIssueLoading(false);
    }
  };

  const handleRevoke = async () => {
    if (!revokeHash) {
      setRevokeError('Please enter a certificate hash to revoke.');
      return;
    }
    setRevokeLoading(true);
    setRevokeError('');
    setRevokeTxHash(null);
    try {
      if (!window.ethereum) {
        setRevokeError('MetaMask is not installed.');
        return;
      }

      const unsignedTxResponse = await api.post('/issuer/certificates/revoke', {
        certificate_hash: revokeHash,
      });
      const unsignedTx = unsignedTxResponse.data;

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const tx = await signer.sendTransaction(unsignedTx);
      setRevokeTxHash(tx.hash);
      await tx.wait();
    } catch (err: any) {
      setRevokeError(err.response?.data?.error || err.message || 'Failed to revoke certificate.');
    } finally {
      setRevokeLoading(false);
    }
  };

  if (!isAuthenticated || !roles.includes('issuer')) {
    return (
      <EuiPage>
        <EuiPageBody>
          <EuiPageSection>
            <EuiCallOut color="danger" title="Access Denied">
              <p>You must be logged in as an issuer to view this dashboard.</p>
            </EuiCallOut>
          </EuiPageSection>
        </EuiPageBody>
      </EuiPage>
    );
  }

  return (
    <EuiPage>
      <EuiPageBody component="div">
        <EuiPageHeader>
          <EuiTitle size="l"><h1>Issuer Dashboard</h1></EuiTitle>
        </EuiPageHeader>
        <EuiPageSection>
          <EuiCard title="Issue New Certificate">
            <EuiForm component="form">
              <EuiFormRow label="Student Address">
                <EuiFieldText placeholder="0x..." value={studentAddress} onChange={e => setStudentAddress(e.target.value)} />
              </EuiFormRow>
              <EuiFormRow label="Certificate Hash">
                <EuiFieldText placeholder="0x..." value={certificateHash} onChange={e => setCertificateHash(e.target.value)} />
              </EuiFormRow>
              <EuiFormRow label="IPFS CID">
                <EuiFieldText placeholder="Qm..." value={ipfsCid} onChange={e => setIpfsCid(e.target.value)} />
              </EuiFormRow>
              <EuiSpacer />
              <EuiButton onClick={handleIssue} isLoading={issueLoading} fill>Issue Certificate</EuiButton>
            </EuiForm>
            <EuiSpacer />
            {issueError && <EuiCallOut title="Error" color="danger">{issueError}</EuiCallOut>}
            {issueTxHash && (
              <EuiCallOut color="success" title="Transaction Sent!">
                <p>Transaction Hash: {issueTxHash}</p>
                {issueLoading && <EuiLoadingSpinner size="m" />}
                {!issueLoading && <p>Transaction has been confirmed.</p>}
              </EuiCallOut>
            )}
          </EuiCard>
          <EuiSpacer />
          <EuiCard title="Revoke Certificate">
            <EuiForm component="form">
              <EuiFormRow label="Certificate Hash to Revoke">
                <EuiFieldText placeholder="0x..." value={revokeHash} onChange={e => setRevokeHash(e.target.value)} />
              </EuiFormRow>
              <EuiSpacer />
              <EuiButton onClick={handleRevoke} isLoading={revokeLoading} color="danger" fill>Revoke Certificate</EuiButton>
            </EuiForm>
            <EuiSpacer />
            {revokeError && <EuiCallOut title="Error" color="danger">{revokeError}</EuiCallOut>}
            {revokeTxHash && (
              <EuiCallOut color="success" title="Transaction Sent!">
                <p>Transaction Hash: {revokeTxHash}</p>
                {revokeLoading && <EuiLoadingSpinner size="m" />}
                {!revokeLoading && <p>Transaction has been confirmed.</p>}
              </EuiCallOut>
            )}
          </EuiCard>
        </EuiPageSection>
      </EuiPageBody>
    </EuiPage>
  );
};
