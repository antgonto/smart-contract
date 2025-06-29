import React, { useEffect, useState } from 'react';
import { fetchCertificates, downloadCertificateOffchain } from '../services/api';
import { EuiBasicTable, EuiPageTemplate, EuiTitle, EuiSpacer, EuiLoadingSpinner } from '@elastic/eui';

const CertificatesList = () => {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCertificates()
      .then((data) => {
        setCertificates(data.certificates.map((item: any, idx: number) => ({ id: idx + 1, ...item })));
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to fetch certificates');
        setLoading(false);
      });
  }, []);

  const handleDownload = async (ipfsHash: string) => {
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

  const columns = [
    { field: 'id', name: 'ID' },
    { field: 'cert_hash', name: 'Certificate Hash' },
    { field: 'issuer', name: 'Issuer' },
    { field: 'recipient', name: 'Recipient' },
    {
      field: 'ipfs_hash',
      name: 'IPFS Hash',
      render: (item: any) => <span style={{ wordBreak: 'break-all' }}>{item.ipfs_hash ?? ''}</span>,
    },
    {
      name: 'Offchain Download',
      render: (item: any) => (
        item.ipfs_hash ? (
          <button onClick={() => handleDownload(item.ipfs_hash)}>Download PDF</button>
        ) : (
          <span style={{ color: '#888' }}>Not available</span>
        )
      ),
    },
    { field: 'block_number', name: 'Block Number' },
    {
      field: 'transaction_hash',
      name: 'Transaction Hash',
      render: (item: any) => <span style={{ wordBreak: 'break-all' }}>{item.transaction_hash ?? ''}</span>,
    },
    { field: 'log_index', name: 'Log Index' },
  ];


// Debug: log the certificates to verify data structure
  React.useEffect(() => {
    if (!loading) {
      console.log('Certificates:', certificates);
    }
  }, [loading, certificates]);

  return (
    <EuiPageTemplate>
      <EuiPageTemplate.Section>
        <EuiTitle size="l"><h1>Certificates</h1></EuiTitle>
        <EuiSpacer size="l" />
        {loading ? (
          <EuiLoadingSpinner size="xl" />
        ) : error ? (
          <div>{error}</div>
        ) : certificates.length === 0 ? (
          <div>No certificates found.</div>
        ) : (
          <EuiBasicTable
            items={certificates}
            columns={columns}
            rowHeader="id"
          />
        )}
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
};

export default CertificatesList;
