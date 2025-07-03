import React, { useState, useEffect } from 'react';
import {
  EuiFlexGrid,
  EuiFlexItem,
  EuiCard,
  EuiForm,
  EuiFormRow,
  EuiFieldText,
  EuiButton,
  EuiSpacer,
  EuiCallOut,
  EuiText,
  EuiTitle,
  EuiCopy,
  EuiIcon,
  EuiRadioGroup,
  EuiBasicTable,
} from '@elastic/eui';
import { createWallet, importWallet, getBalance, importWalletPrivateKey, generateAccountsAndFund, listWallets } from '../services/walletService';
import { persistAccount, persistTransaction } from '../services/api';
import { useWallet } from '../contexts/WalletContext';

const DEFAULT_RPC_URL = process.env.NODE_ENV === 'development' ? 'http://localhost:8545' : 'http://ganache:8545';

const Wallet: React.FC = () => {
  const [walletName, setWalletName] = useState('');
  const [importMnemonic, setImportMnemonic] = useState('');
  const [importPrivKey, setImportPrivKey] = useState('');
  const [balance, setBalance] = useState('');
  const [rpcUrl, setRpcUrl] = useState(DEFAULT_RPC_URL);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [numAccounts, setNumAccounts] = useState(1);
  const [fundAmount, setFundAmount] = useState('0');
  const [generatedAccounts, setGeneratedAccounts] = useState<string[]>([]);
  const [fundTxHashes, setFundTxHashes] = useState<string[]>([]);
  const { accounts, setAccounts, selectedAccountIdx, setSelectedAccountIdx, selectedAccount } = useWallet();
  const [accountBalances, setAccountBalances] = useState<string[]>([]);
  const [backendAccounts, setBackendAccounts] = useState<any[]>([]);
  const [selectedBackendAccountIdx, setSelectedBackendAccountIdx] = useState(0);

  // Fetch balances for all accounts when accounts or rpcUrl changes
  useEffect(() => {
    async function fetchBalances() {
      if (accounts.length === 0) { setAccountBalances([]); return; }
      const balances = await Promise.all(accounts.map(async acc => {
        try {
          const res = await getBalance(acc.address, rpcUrl);
          return res.balance;
        } catch {
          return 'Error';
        }
      }));
      setAccountBalances(balances);
    }
    fetchBalances();
  }, [accounts, rpcUrl]);

  // On mount, fetch wallets/accounts from backend
  useEffect(() => {
    async function fetchWallets() {
      try {
        const wallets = await listWallets();
        setBackendAccounts(wallets);
        // Optionally, set the first account as selected
        if (wallets.length > 0) setSelectedBackendAccountIdx(0);
      } catch (e) {
        setError('Failed to load wallets from backend');
      }
    }
    fetchWallets();
  }, []);

  // Helper to refresh backend accounts
  const refreshBackendAccounts = async () => {
    try {
      const wallets = await listWallets();
      setBackendAccounts(wallets);
      if (wallets.length > 0) setSelectedBackendAccountIdx(0);
    } catch (e) {
      setError('Failed to load wallets from backend');
    }
  };

  const handleCreate = async () => {
    setError(''); setSuccess('');
    if (!walletName) { setError('Please enter a wallet name.'); return; }
    try {
      const res = await createWallet(walletName);
      const newAccount = { name: walletName, address: res.address, private_key: res.private_key, mnemonic: res.mnemonic };
      // Immediately update backendAccounts state so the new account appears without refresh
      setBackendAccounts(prev => [newAccount, ...prev]);
      const updatedAccounts = [...accounts, newAccount];
      setAccounts(updatedAccounts);
      setSelectedAccountIdx(updatedAccounts.length - 1); // select the new account
      setSuccess('Wallet created successfully!');
      // Optionally, also refresh from backend to get all info (including balance/txs)
      await refreshBackendAccounts();
    } catch (e) {
      setError('Failed to create wallet');
    }
  };

  const handleImportMnemonic = async () => {
    setError(''); setSuccess('');
    try {
      const res = await importWallet(importMnemonic);
      const newAccount = { name: 'Imported (mnemonic)', address: res.address, privateKey: res.private_key, mnemonic: importMnemonic };
      const updatedAccounts = [...accounts, newAccount];
      setAccounts(updatedAccounts);
      setSelectedAccountIdx(updatedAccounts.length - 1);
      setSuccess('Wallet imported from mnemonic!');
      await refreshBackendAccounts(); // Refresh backend accounts list
    } catch (e) {
      setError('Failed to import wallet from mnemonic');
    }
  };

  const handleImportPrivateKey = async () => {
    setError(''); setSuccess('');
    try {
      const res = await importWalletPrivateKey(importPrivKey);
      const newAccount = { name: 'Imported (private key)', address: res.address, privateKey: res.private_key };
      const updatedAccounts = [...accounts, newAccount];
      setAccounts(updatedAccounts);
      setSelectedAccountIdx(updatedAccounts.length - 1);
      setSuccess('Wallet imported from private key!');
      await refreshBackendAccounts(); // Refresh backend accounts list
    } catch (e) {
      setError('Failed to import wallet from private key');
    }
  };

  // Fetch wallets/accounts from backend on mount
  useEffect(() => {
    async function fetchWallets() {
      try {
        const wallets = await listWallets();
        setBackendAccounts(wallets);
        if (wallets.length > 0) setSelectedBackendAccountIdx(0);
      } catch (e) {
        setError('Failed to load wallets from backend');
      }
    }
    fetchWallets();
  }, []);

  const handleGetBalance = async () => {
    setError(''); setSuccess('');
    const account = backendAccounts[selectedBackendAccountIdx];
    if (!account) {
      setError('No active account.');
      return;
    }
    try {
      const res = await getBalance(account.address, rpcUrl);
      setBalance(res.balance);
      setSuccess('Balance fetched!');
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || 'Failed to fetch balance');
    }
  };

  const handleGenerateAccounts = async () => {
    setError(''); setSuccess('');
    const account = backendAccounts[selectedBackendAccountIdx];
    if (!account || !account.private_key) {
      setError('No active account with private key.');
      return;
    }
    try {
      const res = await generateAccountsAndFund({
        wallet_private_key: account.private_key,
        rpc_url: rpcUrl,
        num_accounts: numAccounts,
        fund_amount_wei: parseInt(fundAmount, 10) || 0
      });
      setGeneratedAccounts(res.accounts);
      setFundTxHashes(res.tx_hashes);
      setSuccess('Accounts generated' + (res.funded ? ' and funded!' : '!'));
      // Persist generated accounts
      for (const acc of res.accounts) {
        await persistAccount({
          address: acc.address,
          private_key: acc.privateKey,
          mnemonic: acc.mnemonic,
          name: acc.name || '',
        });
      }
      // Persist transaction history
      for (const tx of res.tx_hashes) {
        await persistTransaction({
          tx_hash: tx,
          account_address: res.accounts[0]?.address,
        });
      }
      await refreshBackendAccounts(); // Refresh backend accounts list
      // Optionally, wait a bit and refresh balances
      setTimeout(() => {
        fetchBalances();
      }, 2000);
    } catch (e) {
      setError('Failed to generate/fund accounts or persist data');
    }
  };

  // Table columns for accounts
  const accountColumns = [
    { field: 'name', name: 'Name' },
    { field: 'address', name: 'Address' },
    { field: 'balance', name: 'Balance (wei)' },
    { field: 'private_key', name: 'Private Key' },
    { field: 'mnemonic', name: 'Mnemonic' },
    { field: 'created_at', name: 'Created At' },
    {
      field: 'transactions',
      name: 'Transactions',
      render: (txs: any[]) => (
        <ul style={{margin:0, padding:0, listStyle:'none'}}>
          {txs && txs.length > 0 ? txs.map((tx, i) => (
            <li key={i}>
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

  return (
    <div style={{ maxWidth: 1400, margin: 'auto', padding: 20 }}>
      <EuiTitle size="l"><h2>Wallet Management</h2></EuiTitle>
      <EuiSpacer size="l" />
      {error && <EuiCallOut title="Error" color="danger" iconType="alert">{error}</EuiCallOut>}
      {success && <EuiCallOut title="Success" color="success" iconType="check">{success}</EuiCallOut>}
      <EuiSpacer size="m" />
      <EuiCard title="Your Accounts" layout="vertical">
        <EuiBasicTable
          items={backendAccounts}
          columns={accountColumns}
          rowHeader="name"
        />
      </EuiCard>
      <EuiSpacer size="l" />
      {backendAccounts[selectedBackendAccountIdx] && (
        <EuiCard
          title="Selected Account Details"
          description="Copy and store your credentials securely."
          layout="vertical"
        >
          <EuiText><b>Address:</b> <EuiCopy textToCopy={backendAccounts[selectedBackendAccountIdx].address}>{(copy) => (<span style={{cursor:'pointer'}} onClick={copy}>{backendAccounts[selectedBackendAccountIdx].address}</span>)}</EuiCopy></EuiText>
          <EuiText><b>Private Key:</b> <EuiCopy textToCopy={backendAccounts[selectedBackendAccountIdx].private_key}>{(copy) => (<span style={{cursor:'pointer'}} onClick={copy}>{backendAccounts[selectedBackendAccountIdx].private_key}</span>)}</EuiCopy></EuiText>
          {backendAccounts[selectedBackendAccountIdx].mnemonic && <EuiText><b>Mnemonic:</b> <EuiCopy textToCopy={backendAccounts[selectedBackendAccountIdx].mnemonic}>{(copy) => (<span style={{cursor:'pointer'}} onClick={copy}>{backendAccounts[selectedBackendAccountIdx].mnemonic}</span>)}</EuiCopy></EuiText>}
          <EuiSpacer size="m" />
          <EuiFormRow label="RPC URL">
            <EuiFieldText value={rpcUrl} onChange={e => setRpcUrl(e.target.value)} />
          </EuiFormRow>
          <EuiButton onClick={handleGetBalance} isDisabled={!backendAccounts[selectedBackendAccountIdx]}>Get Balance</EuiButton>
          {balance && <EuiText><b>Balance (wei):</b> {balance}</EuiText>}
        </EuiCard>
      )}
      <EuiSpacer size="l" />
      <EuiCard title="Generate & Fund Accounts" layout="vertical">
        <EuiForm component="form">
          <EuiFormRow label="Number of Accounts">
            <EuiFieldText type="number" value={numAccounts} onChange={e => setNumAccounts(Number(e.target.value))} min={1} />
          </EuiFormRow>
          <EuiFormRow label="Fund Amount (wei, per account)">
            <EuiFieldText type="number" value={fundAmount} onChange={e => setFundAmount(e.target.value)} min={0} />
          </EuiFormRow>
          <EuiButton fill onClick={handleGenerateAccounts} isDisabled={!backendAccounts[selectedBackendAccountIdx] || !backendAccounts[selectedBackendAccountIdx].private_key}>Generate & Fund</EuiButton>
        </EuiForm>
        {generatedAccounts.length > 0 && (
          <>
            <EuiSpacer size="m" />
            <EuiText><b>Generated Accounts:</b></EuiText>
            {generatedAccounts.map((acc, i) => (
              <EuiText key={i}>
                {acc}
                {fundTxHashes && fundTxHashes[i] && (
                  <span> (Tx {fundTxHashes[i]})</span>
                )}
              </EuiText>
            ))}
          </>
        )}
      </EuiCard>
      <EuiSpacer size="l" />
      {/* Wallet Creation and Import Section */}
      <EuiCard title="Create or Import Wallet" layout="vertical">
        <EuiForm component="form">
          <EuiFormRow label="Wallet Name (for new wallet)">
            <EuiFieldText value={walletName} onChange={e => setWalletName(e.target.value)} placeholder="Enter wallet name" />
          </EuiFormRow>
          <EuiButton fill onClick={handleCreate} isDisabled={!walletName}>Create Wallet</EuiButton>
          <EuiSpacer size="m" />
          <EuiFormRow label="Import Wallet by Mnemonic">
            <EuiFieldText value={importMnemonic} onChange={e => setImportMnemonic(e.target.value)} placeholder="Enter mnemonic phrase" />
          </EuiFormRow>
          <EuiButton onClick={handleImportMnemonic} isDisabled={!importMnemonic}>Import by Mnemonic</EuiButton>
          <EuiSpacer size="m" />
          <EuiFormRow label="Import Wallet by Private Key">
            <EuiFieldText value={importPrivKey} onChange={e => setImportPrivKey(e.target.value)} placeholder="Enter private key" />
          </EuiFormRow>
          <EuiButton onClick={handleImportPrivateKey} isDisabled={!importPrivKey}>Import by Private Key</EuiButton>
        </EuiForm>
      </EuiCard>
      <EuiSpacer size="l" />
    </div>
  );
};

export default Wallet;
