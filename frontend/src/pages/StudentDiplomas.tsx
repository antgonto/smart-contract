import React, { useEffect, useState } from 'react';
import {
  EuiPanel,
  EuiTitle,
  EuiText,
  EuiPageHeader,
  EuiPageTemplate,
  EuiSpacer,
  EuiBasicTable,
  EuiCallOut,
} from '@elastic/eui';
import { fetchStudentDiplomas, downloadCertificateOffchain } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const diplomaColumns = [
  { field: 'id', name: 'ID', width: '5%' },
  { field: 'cert_hash', name: 'On-chain Certificate Hash', width: '35%' },
  { field: 'ipfs_hash', name: 'IPFS CID', width: '35%' },
  { field: 'issue_date', name: 'Issue Date', width: '15%',
    render: (item: any) => (
      item.issue_date ? new Date(item.issue_date * 1000).toLocaleDateString() : '-' // assuming issue_date is a unix timestamp
    )
  },
  {
    name: 'Download',
    render: (item: any) => (
      item.ipfs_hash ? (
        <button onClick={() => downloadDiploma(item.ipfs_hash)}>Download PDF</button>
      ) : (
        <span style={{ color: '#888' }}>Not available</span>
      )
    ),
  },
];

const downloadDiploma = async (ipfsHash: string) => {
  try {
    const blob = await downloadCertificateOffchain(ipfsHash);
    const url = window.URL.createObjectURL(new Blob([blob]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${ipfsHash}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (e) {
    alert('Failed to download diploma.');
  }
};

const StudentDiplomas = () => {
  const { isAuthenticated, roles, address } = useAuth();
  const [diplomas, setDiplomas] = useState<any[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated || !roles.includes('Student')) {
      setError('Access denied: Only students can view their diplomas.');
      return;
    }
    const fetchDiplomas = async () => {
      try {
        const data = await fetchStudentDiplomas(address);
        setDiplomas(data);
      } catch (e) {
        setError('Failed to fetch diplomas.');
      }
    };
    fetchDiplomas();
  }, [isAuthenticated, roles, address]);

  if (error) {
    return <EuiCallOut title="Error" color="danger">{error}</EuiCallOut>;
  }

  return (
    <EuiPageTemplate>
      <EuiPageHeader pageTitle="My Diplomas" />
      <EuiSpacer size="l" />
      <EuiPanel paddingSize="l">
        <EuiTitle size="s"><h2>Diplomas</h2></EuiTitle>
        <EuiSpacer size="m" />
        <EuiBasicTable
          items={diplomas}
          columns={diplomaColumns}
          rowHeader="id"
          tableLayout="auto"
        />
      </EuiPanel>
    </EuiPageTemplate>
  );
};

export default StudentDiplomas;
