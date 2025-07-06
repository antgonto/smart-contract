import React, { useEffect, useState } from 'react';
import { EuiCard, EuiButton, EuiBasicTable, EuiCallOut, EuiSpacer } from '@elastic/eui';
import axios from 'axios';

const accountColumns = [
  { field: 'name', name: 'Name', width: '10%' },
  { field: 'address', name: 'Address', width: '30%' },
  { field: 'balance', name: 'Balance (ETH)', width: '15%',
    render: (balance) => {
      if (!balance || isNaN(Number(balance))) return balance || '-';
      return (Number(balance) / 1e18).toFixed(4);
    }
  },
  { field: 'created_at', name: 'Created At', width: '15%' },
  {
    field: 'transactions',
    name: 'Transactions',
    render: (txs) => (
      <ul style={{margin:0, padding:0, listStyle:'none'}}>
        {txs && txs.length > 0 ? txs.map((tx, i) => (
          <li key={i} style={{marginBottom:8}}>
            <b>Hash:</b> {tx.tx_hash}<br/>
            <b>To:</b> {tx.to_address}<br/>
            <b>Amount:</b> {tx.amount}<br/>
            <b>Status:</b> {tx.status}<br/>
            <b>Time:</b> {tx.timestamp}
          </li>
        )) : <span>No transactions</span>}
      </ul>
    )
  }
];

const AllAccountsView = () => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchAccounts = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get('/app/v1/smartcontracts/wallet/all-accounts');
      setAccounts(res.data);
    } catch (err) {
      setError('Failed to fetch accounts.');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  return (
    <EuiCard title="All Wallets & Accounts">
      <EuiButton onClick={fetchAccounts} fill size="s" style={{ marginBottom: 16 }}>
        Refresh
      </EuiButton>
      <EuiBasicTable
        items={accounts}
        columns={accountColumns}
        loading={loading}
        noItemsMessage="No accounts found."
      />
      {error && <EuiCallOut color="danger" title="Error">{error}</EuiCallOut>}
      <EuiSpacer size="l" />
    </EuiCard>
  );
};

export default AllAccountsView;
