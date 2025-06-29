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
    { field: 'id', name: 'ID', width: '2%' },
    { field: 'block_number', name: 'Block Number', width: '5%' },
    { field: 'cert_hash', name: 'Certificate Hash', width: '18%' },
    { field: 'issuer', name: 'Issuer', width: '18%' },
    { field: 'recipient', name: 'Recipient', width: '18%' },
    { field: 'ipfs_hash', name: 'IPFS Hash', width: '18%' },
    {
      name: 'Offchain Download',
      width: '14%',
      render: (item: any) => (
        item.ipfs_hash ? (
          <button onClick={() => handleDownload(item.ipfs_hash)}>Download PDF</button>
        ) : (
          <span style={{ color: '#888' }}>Not available</span>
        )
      ),
    },
  ];

  // Debug: log the certificates to verify data structure
  React.useEffect(() => {
    if (!loading) {
      console.log('Certificates:', certificates);
    }
  }, [loading, certificates]);

  return (
    <EuiPageTemplate restrictWidth={false} style={{ width: '100%', maxWidth: '100%' }}>
      <EuiPageTemplate.Section style={{ maxWidth: 'none', width: '100%', padding: 0 }}>
        <EuiTitle size="l"><h1>Certificates</h1></EuiTitle>
        <EuiSpacer size="l" />
        {loading ? (
          <EuiLoadingSpinner size="xl" />
        ) : error ? (
          <div>{error}</div>
        ) : certificates.length === 0 ? (
          <div>No certificates found.</div>
        ) : (
          <div style={{ overflowX: 'auto', width: '100%' }}>
            <EuiBasicTable
              items={certificates}
              columns={columns}
              rowHeader="id"
              style={{ width: '100%' }}
            />
          </div>
        )}
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
};

export default CertificatesList;
