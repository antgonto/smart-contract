import React, { useState } from 'react';
import {
  EuiCard, EuiForm, EuiFormRow, EuiFieldText, EuiButton, EuiCallOut, EuiFieldPassword, EuiSelect
} from '@elastic/eui';
import axios from 'axios';

const CreateWalletView: React.FC = () => {
  const [walletName, setWalletName] = useState('');
  const [walletRole, setWalletRole] = useState<'Issuer' | 'Student'>('Student');
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletError, setWalletError] = useState('');
  const [walletSuccess, setWalletSuccess] = useState('');

  const handleCreateWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    setWalletLoading(true);
    setWalletError('');
    setWalletSuccess('');
    try {
      const res = await axios.post('/app/v1/smartcontracts/wallet/create', {
        name: walletName,
        role: walletRole,
      });
      setWalletSuccess(`Wallet created: ${res.data.name}`);
      setWalletName('');
    } catch (err: any) {
      setWalletError(err.response?.data?.error || err.message || 'Failed to create wallet.');
    }
    setWalletLoading(false);
  };

  return (
    <EuiCard title="Create Wallet & Account">
      <EuiForm component="form" onSubmit={handleCreateWallet}>
        <EuiFormRow label="Wallet Name">
          <EuiFieldText
            placeholder="Enter wallet name"
            value={walletName}
            onChange={e => setWalletName(e.target.value)}
            disabled={walletLoading}
          />
        </EuiFormRow>
        <EuiFormRow label="Role">
          <EuiSelect
            options={[
              { value: 'Student', text: 'Student' },
              { value: 'Issuer', text: 'Issuer' },
            ]}
            value={walletRole}
            onChange={e => setWalletRole(e.target.value as 'Issuer' | 'Student')}
            disabled={walletLoading}
          />
        </EuiFormRow>
        <EuiButton type="submit" isLoading={walletLoading} fill>Create Wallet & Account</EuiButton>
      </EuiForm>
      {walletError && <EuiCallOut color="danger" title="Error">{walletError}</EuiCallOut>}
      {walletSuccess && <EuiCallOut color="success" title="Success">{walletSuccess}</EuiCallOut>}
    </EuiCard>
  );
};

export default CreateWalletView;

