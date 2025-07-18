import React, { useState } from 'react';
import {
  EuiPage, EuiPageBody, EuiPageHeader, EuiTitle, EuiForm, EuiFormRow, EuiFieldText, EuiButton, EuiCallOut, EuiSpacer, EuiText
} from '@elastic/eui';
import { verifyCertificateDetails, downloadCertificateOffchain, downloadOnchainCertificate } from '../services/api';
import ReCAPTCHAWidget from '../components/ReCAPTCHA';
import { saveAs } from 'file-saver';

const VerifyCertificate: React.FC = () => {
  const [certificateHash, setCertificateHash] = useState('');
  const [recaptchaToken, setRecaptchaToken] = useState('');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResult(null);
    setLoading(true);
    try {
      // Using verifyCertificateDetails which provides more info
      const res = await verifyCertificateDetails(certificateHash);
      setResult(res);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Verification failed.');
    }
    setLoading(false);
  };

  // Add download handler
  const handleDownload = async () => {
    if (!result) return;
    if (result.storage_mode === 'OFF_CHAIN' && result.ipfs_hash) {
      try {
        const blob = await downloadCertificateOffchain(result.ipfs_hash);
        saveAs(blob, `${result.ipfs_hash}.pdf`);
      } catch (e) {
        alert('Failed to download off-chain certificate.');
      }
    } else if (result.storage_mode === 'ON_CHAIN' && result.exists && result.pdf_on_chain) {
      try {
        await downloadOnchainCertificate(certificateHash);
      } catch (e) {
        alert('Failed to download on-chain certificate.');
      }
    } else {
      alert('Certificate is not available for download.');
    }
  };

  return (
    <EuiPage>
      <EuiPageBody component="div">
        <EuiPageHeader>
          <EuiTitle size="l"><h1>Verify Certificate</h1></EuiTitle>
        </EuiPageHeader>
        <EuiForm component="form" onSubmit={handleVerify}>
          <EuiFormRow label="Certificate Hash On-Chain">
            <EuiFieldText
              placeholder="Enter certificate hash"
              value={certificateHash}
              onChange={e => setCertificateHash(e.target.value)}
              disabled={loading}
            />
          </EuiFormRow>
          <EuiFormRow label="reCAPTCHA">
            <ReCAPTCHAWidget onChange={token => setRecaptchaToken(token || '')} />
          </EuiFormRow>
          <EuiButton type="submit" isLoading={loading} fill>Verify</EuiButton>
        </EuiForm>
        <EuiSpacer size="l" />
        {error && <EuiCallOut color="danger" title="Error">{error}</EuiCallOut>}
        {result && (
          <>
            <EuiCallOut
              color={result.exists && !result.is_revoked ? 'success' : 'warning'}
              title={
                result.exists && !result.is_revoked
                  ? 'Certificate is valid'
                  : 'Certificate is invalid or revoked'
              }
            >
              <EuiText><p><b>Issuer:</b> {result.issuer}</p></EuiText>
              <EuiText><p><b>Student:</b> {result.student}</p></EuiText>
              <EuiText><p><b>Issued At:</b> {new Date(result.issued_at * 1000).toLocaleString()}</p></EuiText>
              <EuiText><p><b>Storage Mode:</b> {result.storage_mode}</p></EuiText>
              <EuiText><p><b>Revoked:</b> {result.is_revoked ? 'Yes' : 'No'}</p></EuiText>
              {result.ipfs_hash && <EuiText><p><b>IPFS Hash:</b> {result.ipfs_hash}</p></EuiText>}
              {result.error && <EuiText color="danger"><b>Error:</b> {result.error}</EuiText>}
            </EuiCallOut>
            <EuiSpacer size="l" />
            <EuiCallOut title="Certificate Details" color="success">
              <pre>{JSON.stringify(result, null, 2)}</pre>
              <EuiButton onClick={handleDownload} fill>Download PDF</EuiButton>
            </EuiCallOut>
          </>
        )}
      </EuiPageBody>
    </EuiPage>
  );
};

export default VerifyCertificate;
