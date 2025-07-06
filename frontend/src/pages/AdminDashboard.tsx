import React, { useState } from 'react';
import {
  EuiPage, EuiPageBody, EuiPageSection, EuiCard,
  EuiForm, EuiFormRow, EuiFieldText, EuiButton, EuiSpacer, EuiCallOut, EuiFieldPassword,
  EuiSelect, EuiBasicTable, EuiFlexGroup, EuiFlexItem
} from '@elastic/eui';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const API_BASE = '/app/v1/smartcontracts/admin';

const AdminDashboard: React.FC = () => {
  const { adminLogin, loading, error, success, isAuthenticated, roles } = useAuth();
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [address, setAddress] = useState('');
  const [adminSecret, setAdminSecret] = useState('');
  const [walletName, setWalletName] = useState('');
  const [walletRole, setWalletRole] = useState<'Issuer' | 'Student'>('Student');
  const [wallets, setWallets] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletError, setWalletError] = useState('');
  const [walletSuccess, setWalletSuccess] = useState('');
  const [showAccountsTable, setShowAccountsTable] = useState(false);

  const isAdmin = isAuthenticated && roles && roles.includes('admin');

  const handleRoleChange = async (action: 'grant' | 'revoke') => {
    try {
      const endpoint = action === 'grant' ? '/grant_issuer_role' : '/revoke_issuer_role';
      const res = await axios.post(`${API_BASE}${endpoint}`,
        { address },
        { headers: { 'X-Admin-Auth': adminSecret } }
      );
      if (res.data.success) {
        setWalletSuccess(`Successfully ${action}ed ISSUER_ROLE for ${address}. Tx: ${res.data.tx_hash}`);
        setWalletError('');
      } else {
        setWalletError(res.data.error || 'An unknown error occurred.');
        setWalletSuccess('');
      }
    } catch (err: any) {
      setWalletError(err.response?.data?.error || err.message || 'Failed to submit transaction.');
      setWalletSuccess('');
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    await adminLogin(adminUsername, adminPassword);
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

  const fetchAccounts = async () => {
    setWalletLoading(true);
    setWalletError('');
    try {
      const res = await axios.get('/app/v1/smartcontracts/account/list');
      setAccounts(res.data);
    } catch (err: any) {
      setWalletError('Failed to fetch accounts.');
    }
    setWalletLoading(false);
  };

  React.useEffect(() => {
    if (isAdmin) {
      fetchWallets();
      fetchAccounts();
    }
  }, [isAdmin]);

  const handleCreateWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    setWalletLoading(true);
    setWalletError('');
    setWalletSuccess('');
    try {
      const res = await axios.post('/app/v1/smartcontracts/wallet/create', {
        name: walletName,
        role: walletRole, // Now sends 'Issuer' or 'Student'
      });
      setWalletSuccess(`Wallet created: ${res.data.name}`);
      setWalletName('');
      fetchWallets();
    } catch (err: any) {
      setWalletError(err.response?.data?.error || err.message || 'Failed to create wallet.');
    }
    setWalletLoading(false);
  };

  const accountColumns = [
    { field: 'name', name: 'Name' },
    { field: 'address', name: 'Address' },
    { field: 'balance', name: 'Balance (ETH)' },
    { field: 'created_at', name: 'Created At' },
    {
      field: 'transactions',
      name: 'Transactions',
      render: (transactions: any[]) => (
        <EuiBasicTable
          items={transactions}
          columns={[
            { field: 'hash', name: 'Tx Hash' },
            { field: 'from', name: 'From' },
            { field: 'to', name: 'To' },
            { field: 'value', name: 'Value (ETH)' },
            { field: 'timestamp', name: 'Timestamp' },
          ]}
          noItemsMessage="No transactions found."
          pagination={false}
          sorting={false}
        />
      ),
    },
  ];

  if (!isAdmin) {
    return (
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
    );
  }

  return (
    <EuiPage style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <EuiPageBody component="div" style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>

      </EuiPageBody>
    </EuiPage>
  );
};

export default AdminDashboard;
