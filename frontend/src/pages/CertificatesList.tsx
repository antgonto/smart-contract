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
  { field: 'block_number', name: 'Block Number', width: '7%' },
  { field: 'cert_hash', name: 'On-chain Certificate Hash', width: '35%' },
  { field: 'ipfs_hash', name: 'Off-chain Certificate Hash', width: '30%'},
  {
    name: 'Recipient Address',
    width: '20%',
    render: (item: any) => (item && (item.recipient_address || item.recipient || item.student)) || '-',
  },
  { field: 'gas_used', name: 'Gas Used', width: '6%' },
  { field: 'cumulative_gas', name: 'Cumulative Gas', width: '10%' },
  {
    name: 'Download Off-chain',
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

  // Compute cumulative gas for recent operations
  let cumulativeGas = 0;
  const recentOpsWithCumulative = metrics?.recent_operations?.map((op: any) => {
    cumulativeGas += op.gas_used || 0;
    return { ...op, cumulative_gas: cumulativeGas };
  }) || [];

  // Compute cumulative gas for certificates
  let certCumulativeGas = 0;
  const certificatesWithCumulative = certificates.map((cert: any) => {
    certCumulativeGas += cert.gas_used || 0;
    return { ...cert, cumulative_gas: certCumulativeGas };
  });

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
        {/* Certificates Table */}
        <EuiPanel paddingSize="l">
          <EuiTitle size="s"><h2>Certificates</h2></EuiTitle>
          <EuiSpacer size="m" />
          <EuiBasicTable
            items={certificatesWithCumulative}
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