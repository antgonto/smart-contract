import React, { useState } from 'react';
import {
  EuiPage, EuiPageBody, EuiPageHeader, EuiTitle, EuiForm, EuiFormRow, EuiFieldText, EuiButton, EuiCallOut, EuiSpacer, EuiText
} from '@elastic/eui';
import axios from 'axios';
import ReCAPTCHAWidget from '../components/ReCAPTCHA';

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
      const res = await axios.post(`/app/v1/smartcontracts/public/verify/${certificateHash}`, {
        recaptchaToken,
      });
      setResult(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Verification failed.');
    }
    setLoading(false);
  };

  return (
    <EuiPage>
      <EuiPageBody component="div">
        <EuiPageHeader>
          <EuiTitle size="l"><h1>Verify Certificate</h1></EuiTitle>
        </EuiPageHeader>
        <EuiForm component="form" onSubmit={handleVerify}>
          <EuiFormRow label="Certificate Hash">
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
          <EuiCallOut color={result.is_valid ? 'success' : 'warning'} title={result.is_valid ? 'Certificate is valid' : 'Certificate is invalid or revoked'}>
            <EuiText><p><b>Issuer:</b> {result.issuer}</p></EuiText>
            <EuiText><p><b>Student:</b> {result.student}</p></EuiText>
            <EuiText><p><b>Timestamp:</b> {result.timestamp}</p></EuiText>
            <EuiText><p><b>Revoked:</b> {result.is_revoked ? 'Yes' : 'No'}</p></EuiText>
            {result.error && <EuiText color="danger"><b>Error:</b> {result.error}</EuiText>}
          </EuiCallOut>
        )}
      </EuiPageBody>
    </EuiPage>
  );
};

export default VerifyCertificate;
