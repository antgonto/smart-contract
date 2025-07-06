import React, { useState } from 'react';
import {
  EuiPage, EuiPageBody, EuiPageSection, EuiCard,
  EuiForm, EuiFormRow, EuiFieldText, EuiButton, EuiSpacer, EuiCallOut, EuiFieldPassword,
  EuiSelect, EuiBasicTable, EuiFlexGroup, EuiFlexItem
} from '@elastic/eui';
import axios from 'axios';
import VerificationPortal from '../components/VerificationPortal';

const API_BASE = '/app/v1/smartcontracts/admin';

const AdminDashboard: React.FC = () => {
  const [address, setAddress] = useState('');
  const [adminSecret, setAdminSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [adminAuthenticated, setAdminAuthenticated] = useState(false);
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [walletName, setWalletName] = useState('');
  const [walletRole, setWalletRole] = useState<'issuer' | 'student'>('student');
  const [wallets, setWallets] = useState<any[]>([]);
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletError, setWalletError] = useState('');
  const [walletSuccess, setWalletSuccess] = useState('');

  const handleRoleChange = async (action: 'grant' | 'revoke') => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const endpoint = action === 'grant' ? '/grant_issuer_role' : '/revoke_issuer_role';
      const res = await axios.post(`${API_BASE}${endpoint}`,
        { address },
        { headers: { 'X-Admin-Auth': adminSecret } }
      );
      if (res.data.success) {
        setSuccess(`Successfully ${action}ed ISSUER_ROLE for ${address}. Tx: ${res.data.tx_hash}`);
      } else {
        setError(res.data.error || 'An unknown error occurred.');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to submit transaction.');
    }
    setLoading(false);
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      // Use new Django API endpoint for admin login
      const res = await axios.post('/api/admin/login/', {
        username: adminUsername,
        password: adminPassword
      });
      if (res.data.success) {
        setAdminAuthenticated(true);
        setSuccess('Admin login successful.');
      } else {
        setError(res.data.error || 'Invalid admin credentials.');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to login as admin.');
    }
    setLoading(false);
  };

  const fetchWallets = async () => {
    setWalletLoading(true);
    setWalletError('');
    try {
      const res = await axios.get('/app/v1/smartcontracts/wallet/list');
      setWallets(res.data);
    } catch (err: any) {
      setWalletError('Failed to fetch wallets.');
    }
    setWalletLoading(false);
  };

  React.useEffect(() => {
    if (adminAuthenticated) fetchWallets();
  }, [adminAuthenticated]);

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
      fetchWallets();
    } catch (err: any) {
      setWalletError(err.response?.data?.error || err.message || 'Failed to create wallet.');
    }
    setWalletLoading(false);
  };

  return (
    <EuiPage style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <EuiPageBody component="div" style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <EuiPageSection style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          {!adminAuthenticated ? (
            <EuiCard title="Admin Login">
              <EuiForm component="form" onSubmit={handleAdminLogin}>
                <EuiFormRow label="Username">
                  <EuiFieldText
                    placeholder="Enter Django admin username"
                    value={adminUsername}
                    onChange={e => setAdminUsername(e.target.value)}
                    disabled={loading}
                  />
                </EuiFormRow>
                <EuiFormRow label="Password">
                  <EuiFieldPassword
                    placeholder="Enter Django admin password"
                    value={adminPassword}
                    onChange={e => setAdminPassword(e.target.value)}
                    disabled={loading}
                    type="dual"
                  />
                </EuiFormRow>
                <EuiButton type="submit" isLoading={loading} fill>Login</EuiButton>
              </EuiForm>
              {error && <EuiCallOut color="danger" title="Error">{error}</EuiCallOut>}
              {success && <EuiCallOut color="success" title="Success">{success}</EuiCallOut>}
            </EuiCard>
          ) : (
            <>
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
                        { value: 'student', text: 'Student' },
                        { value: 'issuer', text: 'Issuer' },
                      ]}
                      value={walletRole}
                      onChange={e => setWalletRole(e.target.value as 'issuer' | 'student')}
                      disabled={walletLoading}
                    />
                  </EuiFormRow>
                  <EuiButton type="submit" isLoading={walletLoading} fill>Create Wallet & Account</EuiButton>
                </EuiForm>
                {walletError && <EuiCallOut color="danger" title="Error">{walletError}</EuiCallOut>}
                {walletSuccess && <EuiCallOut color="success" title="Success">{walletSuccess}</EuiCallOut>}
              </EuiCard>
              <EuiSpacer size="l" />
              <EuiCard title="All Wallets & Accounts">
                <EuiBasicTable
                  items={wallets}
                  columns={[
                    { field: 'name', name: 'Name' },
                    { field: 'created_at', name: 'Created At' },
                    { field: 'balance', name: 'Balance (ETH)' },
                  ]}
                  loading={walletLoading}
                  noItemsMessage="No wallets/accounts found."
                />
                {walletError && <EuiCallOut color="danger" title="Error">{walletError}</EuiCallOut>}
              </EuiCard>
            </>
          )}
        </EuiPageSection>
      </EuiPageBody>
    </EuiPage>
  );
};

export default AdminDashboard;
