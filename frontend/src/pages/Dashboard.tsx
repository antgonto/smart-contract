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
  EuiFlexGroup,
} from '@elastic/eui';
import {
  fetchDashboardMetrics,
} from '../services/api';
import { useAuth } from '../contexts/AuthContext';

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

const logsColumns = [
  { field: 'time', name: 'Time' },
  { field: 'event', name: 'Event' },
  { field: 'details', name: 'Details' },
];

const Dashboard = () => {
  const { isAuthenticated } = useAuth();
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchDashboardMetrics()
      .then(data => {
        setMetrics(data);
        setLoading(false);
      })
      .catch(err => {
        setError('Failed to load dashboard metrics');
        setLoading(false);
      });
  }, [isAuthenticated]);

  const systemStats = [
    { label: 'Revocations', value: metrics?.revocations ?? 0 },
    { label: 'Signature Verifications', value: metrics?.signature_verifications ?? 0 },
    { label: 'NFTs Minted', value: metrics?.nfts_minted ?? 0 },
    { label: 'NFTs Transferred', value: metrics?.nfts_transferred ?? 0 },
    { label: 'Oracle Calls', value: metrics?.oracle_calls ?? 0 },
    { label: 'Recent Registrations', value: metrics?.recent_registrations ?? 0 },
  ];

  const statusPanels = [
    { label: 'Ethereum Node', status: 'Operational', color: 'success' },
    { label: 'IPFS Gateway', status: 'Operational', color: 'success' },
    { label: 'Oracle Service', status: 'Degraded', color: 'warning' },
    { label: 'Database', status: 'Down', color: 'danger' },
  ];

  const userStats = [
    { label: 'Total Users', value: metrics?.total_users ?? 0 },
    { label: 'Active Users', value: metrics?.active_users ?? 0 },
    { label: 'Issuers', value: metrics?.issuers ?? 0 },
    { label: 'Verifiers', value: metrics?.verifiers ?? 0 },
  ];

  if (!isAuthenticated) {
    if (loading) setLoading(false);
    return <EuiText><p>Please log in to view the dashboard.</p></EuiText>;
  }
  if (loading) return <EuiText><p>Loading dashboard...</p></EuiText>;
  if (error) return <EuiText color="danger"><p>{error}</p></EuiText>;

  return (
    <>
      <EuiPageHeader>
        <EuiTitle size="l">
          <h1>Telemetry Dashboard</h1>
        </EuiTitle>
      </EuiPageHeader>
      <EuiPageTemplate>
        <EuiSpacer size="l" />
        <div style={{ marginLeft: '2rem' }}>
          <EuiFlexGrid columns={3} gutterSize="l">
            <EuiFlexItem>
              <EuiStat
                title={metrics?.total_certificates ?? 0}
                description="Total Certificates"
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiStat
                title={metrics?.onchain_certificates ?? 0}
                description="On-chain Certificates"
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiStat
                title={metrics?.offchain_certificates ?? 0}
                description="Off-chain Certificates"
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiStat
                title={metrics?.total_gas_spent ?? 0}
                description="Total Gas Spent"
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiStat
                title={metrics?.gas_balance ?? 0}
                description="Gas Balance"
              />
            </EuiFlexItem>
          </EuiFlexGrid>
        </div>
        <EuiSpacer size="l" />
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
      </EuiPageTemplate>
    </>
  );
};

export default Dashboard;
