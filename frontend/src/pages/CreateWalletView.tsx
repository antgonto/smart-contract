import React, { useState } from 'react';
import {
  EuiCard, EuiForm, EuiFormRow, EuiFieldText, EuiButton, EuiCallOut, EuiFieldPassword, EuiSelect
} from '@elastic/eui';
import axios from 'axios';
import { grantStudentRole } from '../services/api';

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
      const res = await axios.post(
        '/app/v1/smartcontracts/wallet/create',
        {
          name: walletName,
          role: walletRole,
        },
        { headers: { 'Content-Type': 'application/json' } }
      );
      const walletAddress = res.data.address;

      if (!walletAddress) {
        setWalletError(
          `Wallet created (${res.data.name}), but the server did not return a valid address. Cannot grant Student role.`
        );
        setWalletLoading(false);
        return;
      }

      setWalletSuccess(`Wallet created: ${res.data.name} - Address: ${walletAddress}`);

      if (walletRole === 'Student') {
        try {
          const roleResponse = await grantStudentRole({ address: walletAddress });
          if (roleResponse.success) {
            setWalletSuccess(
              `Wallet created: ${res.data.name} and Student role granted. Tx: ${roleResponse.tx_hash}`
            );
          } else {
            setWalletError(
              `Wallet created, but failed to grant Student role: ${
                roleResponse.error || 'Unknown error'
              }`
            );
          }
        } catch (roleError: any) {
          setWalletError(
            `Wallet created, but failed to grant Student role: ${
              roleError.response?.data?.error || roleError.message
            }`
          );
        }
      }

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
