import React, { useEffect, useState } from 'react';
import {
  EuiPanel,
  EuiText,
  EuiPageHeader,
  EuiPageTemplate,
  EuiSpacer,
  EuiBasicTable,
  EuiCallOut,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { useAuth } from '../contexts/AuthContext';
import { fetchCertificates } from '../services/api';

const certificateColumns = [
  { field: 'hash', name: 'Certificate Hash', width: '40%' },
  { field: 'issuer', name: 'Issuer', width: '30%' },
  { field: 'timestamp', name: 'Issued At', render: (item: any) => new Date(item.timestamp * 1000).toLocaleString() },
  { field: 'is_revoked', name: 'Revoked', render: (revoked: boolean) => (revoked ? 'Yes' : 'No') },
];

const CertificatesList = () => {
  const { isAuthenticated } = useAuth();
  const [certificates, setCertificates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      const fetchCertificatesList = async () => {
        try {
          setLoading(true);
          const certificatesData = await fetchCertificates();
          setCertificates(certificatesData);
        } catch (err: any) {
          setError(err.response?.data?.error || 'Failed to load certificates.');
        } finally {
          setLoading(false);
        }
      };

      fetchCertificatesList();
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <EuiPanel style={{ maxWidth: 800, margin: '40px auto' }}>
        <EuiCallOut color="primary" title="Please Login">
          <p>You need to log in with your wallet to view your certificates.</p>
        </EuiCallOut>
      </EuiPanel>
    );
  }

  if (loading) {
    return (
      <EuiPanel style={{ maxWidth: 800, margin: '40px auto', textAlign: 'center' }}>
        <EuiLoadingSpinner size="xl" />
        <EuiSpacer />
        <EuiText>Loading your certificates...</EuiText>
      </EuiPanel>
    );
  }

  if (error) {
    return (
      <EuiPanel style={{ maxWidth: 800, margin: '40px auto' }}>
        <EuiCallOut color="danger" title="Error">
          <p>{error}</p>
        </EuiCallOut>
      </EuiPanel>
    );
  }

  return (
    <EuiPageTemplate>
      <EuiPageHeader pageTitle="My Certificates" />
      <EuiSpacer />
      <EuiPanel>
        <EuiBasicTable
          items={certificates}
          columns={certificateColumns}
          noItemsMessage={loading ? 'Loading certificates...' : 'You have no certificates registered to your address.'}
        />
      </EuiPanel>
    </EuiPageTemplate>
  );
};

export default CertificatesList;
