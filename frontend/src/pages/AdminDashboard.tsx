import React, { useState } from 'react';
import {
  EuiPage, EuiPageBody, EuiPageContent, EuiPageHeader, EuiTitle, EuiCard,
  EuiForm, EuiFormRow, EuiFieldText, EuiButton, EuiSpacer, EuiCallOut
} from '@elastic/eui';
import axios from 'axios';

const API_BASE = '/app/v1/smartcontracts/admin';

const AdminDashboard: React.FC = () => {
  const [address, setAddress] = useState('');
  const [adminSecret, setAdminSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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

  return (
    <EuiPage>
      <EuiPageBody component="div">
        <EuiPageHeader>
          <EuiTitle size="l"><h1>Admin Governance Dashboard</h1></EuiTitle>
        </EuiPageHeader>
        <EuiPageContent>
          <EuiCard title="Manage Issuer Role">
            <EuiForm component="form">
              <EuiFormRow label="Admin Secret">
                <EuiFieldText
                  placeholder="Enter your admin secret"
                  value={adminSecret}
                  onChange={e => setAdminSecret(e.target.value)}
                  type="password"
                />
              </EuiFormRow>
              <EuiFormRow label="Issuer Address">
                <EuiFieldText
                  placeholder="0x..."
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                />
              </EuiFormRow>
              <EuiSpacer />
              {error && <EuiCallOut title="Error" color="danger">{error}</EuiCallOut>}
              {success && <EuiCallOut title="Success" color="success">{success}</EuiCallOut>}
              <EuiSpacer />
              <EuiButton onClick={() => handleRoleChange('grant')} isLoading={loading} fill>
                Grant Issuer Role
              </EuiButton>
              <EuiSpacer size="s" />
              <EuiButton onClick={() => handleRoleChange('revoke')} isLoading={loading} color="danger">
                Revoke Issuer Role
              </EuiButton>
            </EuiForm>
          </EuiCard>
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
};

export default AdminDashboard;

