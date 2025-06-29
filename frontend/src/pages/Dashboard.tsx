import React, { useEffect, useState } from 'react';
import {
  EuiFlexGrid,
  EuiFlexItem,
  EuiPanel,
  EuiStat,
  EuiTitle,
  EuiText,
    EuiPageHeader,
  EuiPageTemplate,
  EuiSpacer,
  EuiHealth,
  EuiBasicTable,
  EuiProgress,
  EuiFlexGroup,
  EuiForm,
  EuiFormRow,
  EuiFieldText,
  EuiFilePicker,
  EuiButton,
  EuiCallOut
} from '@elastic/eui';
import { fetchDashboardMetrics, registerCertificateFromPdf, fetchCertificates } from '../services/api';

const tradeoffMetrics = [
  { key: 'gasCost', label: 'Gas Cost', onChain: 0.021, offChain: 0.002, unit: 'ETH' },
  { key: 'latency', label: 'Latency', onChain: 2.1, offChain: 0.3, unit: 's' },
  { key: 'privacy', label: 'Privacy', onChain: 'Public', offChain: 'Private', unit: '' },
  { key: 'tamper', label: 'Tamper Resistance', onChain: 'Immutable', offChain: 'Mutable', unit: '' },
  { key: 'performance', label: 'Performance', onChain: 120, offChain: 1000, unit: 'tx/s' },
  { key: 'ux', label: 'User Experience', onChain: 6, offChain: 9, unit: '/10' },
  { key: 'complexity', label: 'Complexity', onChain: 'High', offChain: 'Medium', unit: '' },
  { key: 'compliance', label: 'Compliance', onChain: 'Partial', offChain: 'Full', unit: '' },
];

const recentOpsColumns = [
  { field: 'timestamp', name: 'Timestamp' },
  { field: 'actor', name: 'Actor' },
  { field: 'operation', name: 'Operation' },
  { field: 'type', name: 'Type' },
];
const logsColumns = [
  { field: 'time', name: 'Time' },
  { field: 'event', name: 'Event' },
  { field: 'details', name: 'Details' },
];

const Dashboard = () => {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [recipient, setRecipient] = useState('');
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [registerSuccess, setRegisterSuccess] = useState<any>(null);
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
      .then(data => setCertificates(data.certificates || []))
      .catch(() => setCertificates([]));
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError(null);
    setRegisterSuccess(null);
    if (!pdfFile) {
      setRegisterError('Please select a PDF file.');
      return;
    }
    if (!recipient) {
      setRegisterError('Please enter a recipient Ethereum address.');
      return;
    }
    setRegisterLoading(true);
    try {
      const result = await registerCertificateFromPdf(pdfFile, recipient);
      setRegisterSuccess(result);
    } catch (err: any) {
      setRegisterError(err?.response?.data?.detail || 'Registration failed.');
    } finally {
      setRegisterLoading(false);
    }
  };

  const downloadCertificate = (ipfsHash: string) => {
    if (!ipfsHash) return;
    const url = `https://ipfs.io/ipfs/${ipfsHash}`;
    window.open(url, '_blank');
  };

  if (loading) return <EuiText><p>Loading dashboard...</p></EuiText>;
  if (error) return <EuiText color="danger"><p>{error}</p></EuiText>;
  if (!metrics || typeof metrics !== 'object') return <EuiText color="danger"><p>Dashboard data is unavailable or malformed.</p></EuiText>;

  // System stats for the grid
  const systemStats = [
    { label: 'Certificates Issued (On-chain)', value: metrics.onchain_certificates },
    { label: 'Certificates Issued (Off-chain)', value: metrics.offchain_certificates },
    { label: 'Recent Registrations', value: metrics.recent_registrations },
    { label: 'Revocations/Expiries', value: metrics.revocations },
    { label: 'Signature Verifications', value: metrics.signature_verifications },
    { label: 'NFTs Minted', value: metrics.nfts_minted },
    { label: 'NFTs Transferred', value: metrics.nfts_transferred },
    { label: 'Oracle Calls', value: metrics.oracle_calls },
  ];
  const statusPanels = [
    { label: 'Blockchain Node', status: metrics.blockchain_node_status, color: metrics.blockchain_node_status === 'Online' ? 'success' : 'danger' },
    { label: 'IPFS Node', status: metrics.ipfs_node_status, color: metrics.ipfs_node_status === 'Online' ? 'success' : 'danger' },
    { label: 'Backend/API', status: metrics.backend_status, color: metrics.backend_status === 'Healthy' ? 'success' : 'danger' },
    { label: 'Queue (Celery/Redis)', status: metrics.queue_status, color: metrics.queue_status === 'Idle' ? 'primary' : 'warning' },
  ];
  const userStats = [
    { label: 'Total Users', value: metrics.total_users },
    { label: 'Issuers', value: metrics.issuers },
    { label: 'Certificates', value: metrics.total_certificates },
    { label: 'Active Sessions', value: metrics.active_sessions },
  ];

  return (
    <>
      <EuiPageHeader>
        <EuiTitle size="l">
          <h1>Certificate Management Dashboard</h1>
        </EuiTitle>
      </EuiPageHeader>
      <EuiPageTemplate>
        {/* Trade-Off Metrics Overview */}
        <EuiPanel paddingSize="l">
          <EuiTitle size="s"><h2>Trade-Off Metrics Overview</h2></EuiTitle>
          <EuiSpacer size="m" />
          <EuiBasicTable
            items={tradeoffMetrics}
            columns={[
              { field: 'label', name: 'Metric' },
              { field: 'onChain', name: 'On-Chain' },
              { field: 'offChain', name: 'Off-Chain' },
              { field: 'unit', name: 'Unit' },
            ]}
          />
        </EuiPanel>
        <EuiSpacer size="l" />
        {/* System Activity & Operations */}
        <EuiPanel paddingSize="l">
          <EuiTitle size="s"><h2>System Activity & Operations</h2></EuiTitle>
          <EuiSpacer size="m" />
          <EuiFlexGrid columns={4} gutterSize="m">
            {systemStats.map(stat => (
              <EuiFlexItem key={stat.label}>
                <EuiStat title={stat.value} description={stat.label} titleColor="primary" textAlign="center" />
              </EuiFlexItem>
            ))}
          </EuiFlexGrid>
        </EuiPanel>
        <EuiSpacer size="l" />
        {/* Real-Time Status Panels */}
        <EuiPanel paddingSize="l">
          <EuiTitle size="s"><h2>Real-Time Status</h2></EuiTitle>
          <EuiSpacer size="m" />
          <EuiFlexGroup gutterSize="m">
            {statusPanels.map(panel => (
              <EuiFlexItem key={panel.label} grow={false}>
                <EuiPanel>
                  <EuiText><strong>{panel.label}</strong></EuiText>
                  <EuiSpacer size="xs" />
                  <EuiHealth color={panel.color}>{panel.status}</EuiHealth>
                </EuiPanel>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </EuiPanel>

        <EuiSpacer size="l" />
        {/* Recent Operations Table */}
        <EuiPanel paddingSize="l">
          <EuiTitle size="s"><h2>Recent Operations</h2></EuiTitle>
          <EuiSpacer size="m" />
          <EuiBasicTable items={metrics.recent_operations} columns={recentOpsColumns} />
        </EuiPanel>
        <EuiSpacer size="l" />
        {/* Logs & Audit Trails */}
        <EuiPanel paddingSize="l">
          <EuiTitle size="s"><h2>Logs & Audit Trails</h2></EuiTitle>
          <EuiSpacer size="m" />
          <EuiBasicTable items={metrics.logs} columns={logsColumns} />
        </EuiPanel>
        <EuiSpacer size="l" />
        {/* User/Issuer Stats */}
        <EuiPanel paddingSize="l">
          <EuiTitle size="s"><h2>User & Issuer Stats</h2></EuiTitle>
          <EuiSpacer size="m" />
          <EuiFlexGrid columns={4} gutterSize="m">
            {userStats.map(stat => (
              <EuiFlexItem key={stat.label}>
                <EuiStat title={stat.value} description={stat.label} titleColor="accent" textAlign="center" />
              </EuiFlexItem>
            ))}
          </EuiFlexGrid>
        </EuiPanel>
        <EuiSpacer size="l" />
        {/* Certificates Table */}
        <EuiPanel paddingSize="l">
          <EuiTitle size="s"><h2>On-chain Certificates</h2></EuiTitle>
          <EuiSpacer size="m" />
          <EuiBasicTable
            items={certificates}
            columns={[
              { field: 'cert_hash', name: 'Certificate Hash' },
              {
                name: 'Download',
                render: (item: any) => (
                  item.ipfs_hash ? (
                    <button onClick={() => downloadCertificate(item.ipfs_hash)}>Download PDF</button>
                  ) : (
                    <span style={{ color: '#888' }}>Not available</span>
                  )
                ),
              },
            ]}
          />
        </EuiPanel>
        <EuiSpacer size="l" />
        {/* Register Certificate from PDF */}
        {/* Moved to its own screen */}
      </EuiPageTemplate>
    </>
  );
};

export default Dashboard;
