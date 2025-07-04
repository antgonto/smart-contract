import React, { useState, useCallback } from 'react';
import {
  EuiPage, EuiPageBody, EuiPageContent, EuiPageHeader, EuiTitle, EuiCard,
  EuiForm, EuiFormRow, EuiFieldText, EuiButton, EuiSpacer, EuiCallOut, EuiBasicTable
} from '@elastic/eui';
import axios from 'axios';

const API_BASE = '/app/v1/smartcontracts/student';

const StudentDashboard: React.FC = () => {
  const [studentAddress, setStudentAddress] = useState('');
  const [certificates, setCertificates] = useState([]);
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
      const res = await axios.get(`${API_BASE}/certificates/${studentAddress}`);
      setCertificates(res.data);
      if (res.data.length === 0) {
        setError('No certificates found for this address.');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to fetch certificates.');
    }
    setLoading(false);
  }, [studentAddress]);

  const columns = [
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
          onClick: (item: any) => alert(`Downloading file for hash: ${item.hash}`), // Placeholder
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
        <EuiPageContent>
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
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
};

export default StudentDashboard;

