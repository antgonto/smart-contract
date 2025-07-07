import React, { useState, useCallback } from 'react';
import {
  EuiPage, EuiPageBody, EuiPageSection, EuiPageHeader, EuiTitle, EuiCard,
  EuiForm, EuiFormRow, EuiFieldText, EuiButton, EuiSpacer, EuiCallOut, EuiBasicTable,
  EuiBasicTableColumn
} from '@elastic/eui';
import api from '../services/api';

type Certificate = {
  hash: string;
  issuer: string;
  timestamp: string | number;
  is_revoked: boolean;
};

const StudentDashboard: React.FC = () => {
  const [studentAddress, setStudentAddress] = useState('');
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchCertificates = useCallback(async () => {
    if (!studentAddress) {
      setError('Please enter a student address.');
      return;
    }
    setLoading(true);
    setError('');
    setCertificates([]);
    try {
      const res = await api.get(`/app/v1/smartcontracts/student/certificates/${studentAddress}`);
      setCertificates(res.data);
      if (res.data.length === 0) {
        setError('No certificates found for this address.');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to fetch certificates.');
    }
    setLoading(false);
  }, [studentAddress]);

  const columns: EuiBasicTableColumn<Certificate>[] = [
    { field: 'hash', name: 'Hash', truncateText: true },
    { field: 'issuer', name: 'Issuer Address', truncateText: true },
    { field: 'timestamp', name: 'Timestamp' },
    { field: 'is_revoked', name: 'Revoked', dataType: 'boolean' },
    {
      name: 'Download',
      actions: [
        {
          name: 'Download',
          description: 'Download certificate file',
          type: 'icon',
          icon: 'download',
          onClick: (item: Certificate) => alert(`Downloading file for hash: ${item.hash}`),
        },
      ],
    },
  ];

  return (
    <EuiPage>
      <EuiPageBody component="div">
        <EuiPageHeader>
          <EuiTitle size="l"><h1>Student Dashboard</h1></EuiTitle>
        </EuiPageHeader>
        <EuiPageSection>
          <EuiCard title="View Your Certificates">
            <EuiForm component="form">
              <EuiFormRow label="Your Wallet Address">
                <EuiFieldText
                  placeholder="0x..."
                  value={studentAddress}
                  onChange={e => setStudentAddress(e.target.value)}
                />
              </EuiFormRow>
              <EuiSpacer />
              <EuiButton onClick={fetchCertificates} isLoading={loading} fill>
                Fetch Certificates
              </EuiButton>
            </EuiForm>
          </EuiCard>
          <EuiSpacer />
          {error && <EuiCallOut title="Error" color="danger">{error}</EuiCallOut>}
          <EuiSpacer />
          {certificates.length > 0 && (
            <EuiCard title="Your Certificates">
              <EuiBasicTable
                items={certificates}
                columns={columns}
                rowHeader="hash"
              />
            </EuiCard>
          )}
        </EuiPageSection>
      </EuiPageBody>
    </EuiPage>
  );
};

export default StudentDashboard;
