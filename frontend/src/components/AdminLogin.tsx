import React, { useState } from 'react';
import { EuiCard, EuiForm, EuiFormRow, EuiFieldText, EuiFieldPassword, EuiButton, EuiCallOut } from '@elastic/eui';
import { useAuth } from '../contexts/AuthContext';

const AdminLogin = () => {
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const { adminLogin, loading, error, success } = useAuth();

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    await adminLogin(adminUsername, adminPassword);
  };

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
};

export default AdminLogin;

