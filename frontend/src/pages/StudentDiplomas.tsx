import React, { useEffect, useState } from 'react';
import {
  EuiPanel,
  EuiTitle,
  EuiPageHeader,
  EuiPageTemplate,
  EuiSpacer,
  EuiBasicTable,
  EuiCallOut,
} from '@elastic/eui';
import { fetchStudentDiplomas, downloadCertificateOffchain, downloadCertificateOnchain } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { saveAs } from 'file-saver';

const downloadDiploma = async (item: any) => {
    if (item.storage_mode === 'OFF_CHAIN' && item.ipfs_hash) {
        try {
            const blob = await downloadCertificateOffchain(item.ipfs_hash);
            saveAs(blob, `${item.ipfs_hash}.pdf`);
        } catch (e) {
            alert('Failed to download off-chain diploma.');
        }
    } else if (item.storage_mode === 'ON_CHAIN' && item.cert_hash) {
        try {
            const blob = await downloadCertificateOnchain(item.cert_hash);
            saveAs(blob, `${item.cert_hash}.pdf`);
        } catch (e) {
            alert('Failed to download on-chain diploma.');
        }
    } else {
        alert('Diploma is not available for download.');
    }
};

const diplomaColumns = [
  { field: 'id', name: 'ID', width: '5%' },
  { field: 'cert_hash', name: 'Certificate Hash', width: '30%' },
  { field: 'ipfs_hash', name: 'IPFS Hash', width: '30%' },
  { field: 'storage_mode', name: 'Storage Mode', width: '15%' },
  { field: 'issue_date', name: 'Issue Date', width: '10%',
    render: (value: any) => (
      value ? new Date(value * 1000).toLocaleDateString() : '-'
    )
  },
  {
    name: 'Download',
    width: '10%',
    render: (item: any) => (
        <button onClick={() => downloadDiploma(item)}>Download PDF</button>
    ),
  },
];

const StudentDiplomas = () => {
  const { isAuthenticated, roles } = useAuth();
  const [diplomas, setDiplomas] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !roles.includes('Student')) {
      setError('Access denied: Only students can view their diplomas.');
      return;
    }
    // Use the address from logged.txt via backend endpoint
    const fetchLoggedAddressAndDiplomas = async () => {
      try {
        const res = await fetch('/app/v1/auth/logged-address');
        const data = await res.json();
        if (data.address) {
          const diplomasData = await fetchStudentDiplomas(data.address);
          setDiplomas(diplomasData);
        } else {
          setError('No logged address found.');
        }
      } catch (e: any) {
        if (typeof e?.message === 'string') {
          setError(e.message);
        } else {
          setError('An unknown error occurred while fetching diplomas.');
        }
      }
    };
    fetchLoggedAddressAndDiplomas();
  }, [isAuthenticated, roles]);

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
