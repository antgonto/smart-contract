import React, { useState } from 'react';
import {
  EuiPage, EuiPageBody, EuiCard,
  EuiForm, EuiFormRow, EuiFieldText, EuiButton, EuiCallOut, EuiFieldPassword
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
  const [walletRole, setWalletRole] = useState<'Issuer' | 'Student' | 'Admin'>('Student');
  const [wallets, setWallets] = useState<any[]>([]);
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletError, setWalletError] = useState('');
  const [walletSuccess, setWalletSuccess] = useState('');
  const [blockchainAdminVerified, setBlockchainAdminVerified] = useState(false);

  const isAdmin = isAuthenticated && roles && roles.includes('Admin');

  // Dropdown options for roles
  const roleOptions = [
    { value: 'Issuer', text: 'Issuer' },
    { value: 'Student', text: 'Student' },
    { value: 'Admin', text: 'Admin' },
  ];

  // Add Admin to the role selection
  const handleRoleChange = async (action: 'grant' | 'revoke') => {
    try {
      const endpoint = `/app/v1/smartcontracts/${action}_role/`;
      const res = await axios.post(endpoint, { address, role: walletRole });
      if (res.data.success) {
        setWalletSuccess(`Successfully ${action}ed ${walletRole.toUpperCase()}_ROLE for ${address}. Tx: ${res.data.tx_hash}`);
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
    // After Django login, check blockchain admin role
    try {
      const res = await axios.post('/app/v1/smartcontracts/check_admin_role/', { address: adminUsername });
      if (res.data.is_admin) {
        setBlockchainAdminVerified(true);
        setWalletError('');
      } else {
        setBlockchainAdminVerified(false);
        setWalletError('This account does not have the Admin role on the blockchain.');
      }
    } catch (err: any) {
      setBlockchainAdminVerified(false);
      setWalletError('Blockchain admin role verification failed.');
    }
  };

  // Add similar blockchain role check for Issuer and Student logins
  // This logic should be in your main login handler (not just admin)
  // Example implementation for a unified login handler:
  //
  // const handleUnifiedLogin = async (address, password) => {
  //   // ...existing login logic (Django or JWT)...
  //   const res = await axios.post('/app/v1/smartcontracts/check_roles/', { address });
  //   if (res.data.roles && res.data.roles.length > 0) {
  //     // Set roles in context based on blockchain roles
  //     // e.g., login(token, res.data.roles)
  //   } else {
  //     // Show error: No blockchain role assigned
  //   }
  // }

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
    if (isAdmin) {
      fetchWallets();
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

  if (!isAdmin || !blockchainAdminVerified) {
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
        {walletError && <EuiCallOut color="danger" title="Error">{walletError}</EuiCallOut>}
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
