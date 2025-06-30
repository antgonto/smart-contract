import React, { useState } from 'react';
import {
  EuiPanel,
  EuiTitle,
  EuiSpacer,
  EuiForm,
  EuiFormRow,
  EuiFieldText,
  EuiFilePicker,
  EuiButton,
  EuiCallOut
} from '@elastic/eui';
import { registerCertificateFromPdf } from '../services/api';

const RegisterCertificate = () => {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [recipient, setRecipient] = useState('');
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [registerSuccess, setRegisterSuccess] = useState<any>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError(null);
    setRegisterSuccess(null);
    if (!pdfFile) {
      setRegisterError('Please select a PDF file.');
      return;
    }
    if (!recipient) {
      setRegisterError('Please enter a recipient Ethereum address.');
      return;
    }
    setRegisterLoading(true);
    try {
      const result = await registerCertificateFromPdf(pdfFile, recipient);
      setRegisterSuccess(result);
    } catch (err: any) {
      setRegisterError(err?.response?.data?.detail || 'Registration failed.');
    } finally {
      setRegisterLoading(false);
    }
  };

  return (
    <EuiPanel style={{ maxWidth: 600, margin: '40px auto' }}>
      <EuiTitle size="l"><h2>Register Certificate from PDF</h2></EuiTitle>
      <EuiSpacer size="m" />
      <EuiForm component="form" onSubmit={handleRegister}>
        <EuiFormRow label="PDF File" fullWidth>
          <EuiFilePicker
            id="pdfFilePicker"
            initialPromptText="Select a PDF file"
            onChange={files => setPdfFile(files && files.length > 0 ? files[0] : null)}
            accept="application/pdf"
            fullWidth
          />
        </EuiFormRow>
        <EuiFormRow label="Recipient Ethereum Address" fullWidth>
          <EuiFieldText
            placeholder="0x..."
            value={recipient}
            onChange={e => setRecipient(e.target.value)}
            fullWidth
          />
        </EuiFormRow>
        <EuiButton type="submit" isLoading={registerLoading} fill>Register Certificate</EuiButton>
      </EuiForm>
      {registerError && <EuiCallOut color="danger" title="Error" iconType="alert">{registerError}</EuiCallOut>}
      {registerSuccess && (
        <EuiCallOut color="success" title="Certificate Registered!" iconType="check">
          <div>Hash: {registerSuccess.cert_hash}</div>
          <div>Issuer: {registerSuccess.issuer}</div>
          <div>Recipient: {registerSuccess.recipient}</div>
          <div>Issued At: {new Date(registerSuccess.issued_at * 1000).toLocaleString()}</div>
          <div>Metadata: {registerSuccess.metadata}</div>
          <div>IPFS: {registerSuccess.content}</div>
        </EuiCallOut>
      )}
    </EuiPanel>
  );
};

export default RegisterCertificate;

