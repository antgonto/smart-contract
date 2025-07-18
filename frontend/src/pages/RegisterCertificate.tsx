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
  EuiCallOut,
  EuiRadioGroup,
} from '@elastic/eui';
import { registerCertificate } from '../services/api';

const RegisterCertificate = () => {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [recipient, setRecipient] = useState('');
  const [storageMode, setStorageMode] = useState('OFF_CHAIN');
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
      const result = await registerCertificate(recipient, pdfFile, storageMode);
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
      <EuiSpacer size="l" />
      <EuiForm component="form" onSubmit={handleRegister}>
        <EuiFormRow label="Recipient Ethereum Address">
          <EuiFieldText value={recipient} onChange={e => setRecipient(e.target.value)} />
        </EuiFormRow>
        <EuiFormRow label="PDF File">
          <EuiFilePicker
            id="pdfFilePicker"
            initialPromptText="Select or drag and drop a PDF file"
            onChange={files => setPdfFile(files && files.length > 0 ? files[0] : null)}
            accept="application/pdf"
            display="default"
          />
        </EuiFormRow>
        <EuiFormRow label="Storage Type">
          <EuiRadioGroup
            options={[
              { id: 'ON_CHAIN', label: 'On-Chain' },
              { id: 'OFF_CHAIN', label: 'Off-Chain (IPFS)' },
            ]}
            idSelected={storageMode}
            onChange={id => setStorageMode(id)}
            name="storageMode"
          />
        </EuiFormRow>
        <EuiSpacer size="m" />
        <EuiButton type="submit" isLoading={registerLoading} fill>Register Certificate</EuiButton>
      </EuiForm>
      <EuiSpacer size="m" />
      {registerError && <EuiCallOut color="danger" title="Error">{registerError}</EuiCallOut>}
      {registerSuccess && <EuiCallOut color="success" title="Success">Certificate registered successfully!</EuiCallOut>}
    </EuiPanel>
  );
};

export default RegisterCertificate;
