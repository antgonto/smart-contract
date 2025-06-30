import React, { useEffect, useState } from 'react';
import {
  EuiPanel,
  EuiTitle,
  EuiText,
  EuiPageHeader,
  EuiPageTemplate,
  EuiSpacer,
  EuiBasicTable,
} from '@elastic/eui';
import {
  fetchCertificates,
  downloadCertificateOffchain, fetchDashboardMetrics
} from '../services/api';

const recentOpsColumns = [
  { field: 'timestamp', name: 'Timestamp' },
  { field: 'actor', name: 'Actor' },
  { field: 'operation', name: 'Operation' },
  { field: 'type', name: 'Type' },
  { field: 'gas_used', name: 'Gas Used' },
];

  const downloadCertificate = async(ipfsHash: string) => {
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
      alert('Failed to download certificate.');
    }
  };

const certificateColumns = [
  { field: 'id', name: 'ID', width: '2%' },
  { field: 'block_number', name: 'Block Number', width: '8%' },
  { field: 'cert_hash', name: 'On-chain Certificate Hash', width: '40%' },
  { field: 'ipfs_hash', name: 'Off-chain Certificate Hash', width: '30%'},
  { field: 'gas_used', name: 'Gas Used' },
  {
    name: 'Download Offchain',
    render: (item: any) => (
      item.ipfs_hash ? (
        <button onClick={() => downloadCertificate(item.ipfs_hash)}>Download PDF</button>
      ) : (
        <span style={{ color: '#888' }}>Not available</span>
      )
    ),
  },
];

const CertificatesList  = () => {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [certificates, setCertificates] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardMetrics()
      .then(data => {
        setMetrics(data);
        setLoading(false);
      })
      .catch(err => {
        setError('Failed to load dashboard metrics');
        setLoading(false);
      });
    fetchCertificates()
      .then((data) => {
        setCertificates(data.certificates.map((item: any, idx: number) => ({ id: idx + 1, ...item })));
        setLoading(false);
      })
      .catch(() => setCertificates([]));
  }, []);



  if (loading) return <EuiText><p>Loading dashboard...</p></EuiText>;
  if (error) return <EuiText color="danger"><p>{error}</p></EuiText>;

  return (
    <>
      <EuiPageHeader>
        <EuiTitle size="l">
          <h1>Certificate Dashboard</h1>
        </EuiTitle>
      </EuiPageHeader>
      <EuiPageTemplate>
        <EuiSpacer size="l" />
        {/* Recent Operations Table */}
        <EuiPanel paddingSize="l">
          <EuiTitle size="s"><h2>Recent Operations</h2></EuiTitle>
          <EuiSpacer size="m" />
          <EuiBasicTable items={metrics.recent_operations} columns={recentOpsColumns} />
        </EuiPanel>
        <EuiSpacer size="l" />
        {/* Certificates Table */}
        <EuiPanel paddingSize="l">
          <EuiTitle size="s"><h2>Certificates</h2></EuiTitle>
          <EuiSpacer size="m" />
          <EuiBasicTable
            items={certificates}
            columns={certificateColumns}
            rowHeader="id"
            tableLayout="auto"
          />
        </EuiPanel>
        <EuiSpacer size="l" />
      </EuiPageTemplate>
    </>
  );
};

export default CertificatesList ;
