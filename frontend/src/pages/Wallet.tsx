import React, { useState, useEffect, useCallback } from 'react';
import {
  EuiCard,
  EuiForm,
  EuiFormRow,
  EuiFieldText,
  EuiButton,
  EuiSpacer,
  EuiCallOut,
  EuiText,
  EuiTitle,
  EuiRadioGroup,
  EuiBasicTable,
  EuiSelect,
} from '@elastic/eui';
import { createWallet, importWallet, getBalance, importWalletPrivateKey, generateAccountsAndFund, listWallets, signTransaction, signMessage } from '../services/walletService';
import { persistAccount, persistTransaction } from '../services/api';
import { useWallet } from '../contexts/WalletContext';
import axios from "axios";


const DEFAULT_RPC_URL = process.env.NODE_ENV === 'development' ? 'http://localhost:8545' : 'http://ganache:8545';

const API_BASE = '/app/v1/smartcontracts/wallet'; // Use relative path for proxy compatibility

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
  const { accounts, setAccounts } = useWallet();
  const [backendAccounts, setBackendAccounts] = useState<any[]>([]);
  const [selectedBackendAccountIdx, setSelectedBackendAccountIdx] = useState(0);
  const [accountBalances, setAccountBalances] = useState<string[]>([]);

  // Wallet selection dropdown and account radio button list
  const [wallets, setWallets] = useState<any[]>([]); // List of wallets
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);
  const [walletAccounts, setWalletAccounts] = useState<any[]>([]); // Accounts for selected wallet
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  // Move fetchBalances to top-level so it can be called anywhere
  const fetchBalances = useCallback(async () => {
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
  }, [accounts, rpcUrl]);

  // Fetch balances for all accounts when accounts or rpcUrl changes
  useEffect(() => {
    fetchBalances();
  }, [accounts, rpcUrl, fetchBalances]);


  // On mount, fetch wallets/accounts from backend
  useEffect(() => {
    async function fetchWallets() {
      try {
        const wallets = await listWallets();
        if (!Array.isArray(wallets)) throw new Error('Wallets response is not an array');
        setBackendAccounts(wallets);
        // Optionally, set the first account as selected
        if (wallets.length > 0) setSelectedBackendAccountIdx(0);
      } catch (e) {
        setError('Failed to load wallets from backend');
      }
    }
    fetchWallets();
  }, []);

  // Fetch wallets on mount
  useEffect(() => {
    async function fetchWalletsList() {
      try {
        // Replace with your backend call to list wallets
        const walletsList = await listWallets();
        setWallets(walletsList);
        // Only set selectedWalletId if wallets exist
        if (walletsList.length > 0) {
          setSelectedWalletId(walletsList[0].id || walletsList[0]._id || walletsList[0].address);
        } else {
          setSelectedWalletId(null);
        }
        // Do not set error if just empty
      } catch (e) {
        setError('Failed to load wallets');
      }
    }
    fetchWalletsList();
  }, []);

  // Fetch accounts for selected wallet
  useEffect(() => {
    async function fetchAccountsForWallet() {
      if (!selectedWalletId) return;
      try {
        // Replace with your backend call to list accounts for a wallet `${API_BASE}/import`
        const res = await fetch(`${API_BASE}/account/list?wallet_id=${selectedWalletId}`);
        if (!res.ok) throw new Error('Failed to fetch accounts');
        const accounts = await res.json();
        setWalletAccounts(accounts);
        if (accounts.length > 0) setSelectedAccountId(accounts[0].address);
      } catch (e) {
        setError('Failed to load accounts for wallet');
      }
    }
    fetchAccountsForWallet();
  }, [selectedWalletId]);

  // Fetch balance for selected account
  useEffect(() => {
    async function fetchSelectedAccountBalance() {
      if (!selectedAccountId) { setBalance(''); return; }
      try {
        const res = await fetch(await axios.post(`${API_BASE}/account/balance?address=${selectedAccountId}&rpc_url=${rpcUrl}`));
        if (!res.ok) throw new Error('Failed to fetch balance');
        const bal = await res.text();
        setBalance((parseFloat(bal) / 1e18).toFixed(4) + ' ETH');
      } catch (e) {
        setBalance('Error');
      }
    }
    fetchSelectedAccountBalance();
  }, [selectedAccountId, rpcUrl]);

  // Account addition modal state
  const [isAddAccountModalOpen, setIsAddAccountModalOpen] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');
  const [addAccountLoading, setAddAccountLoading] = useState(false);
  const [addAccountError, setAddAccountError] = useState('');

  // Handle add account
  const handleAddAccount = async () => {
    setAddAccountLoading(true);
    setAddAccountError('');
    try {
      // Call backend to generate and fund a new account
      const res = await fetch(`${API_BASE}/generate_accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet_private_key: '', // backend will use Ganache funder if blank
          rpc_url: rpcUrl,
          num_accounts: 1,
          fund_amount_wei: String(1e18), // 1 ETH, adjust as needed
          name: newAccountName, // send user-defined name
        })
      });
      if (!res.ok) throw new Error('Failed to create account');
      setIsAddAccountModalOpen(false);
      setNewAccountName('');
      // Refresh accounts
      const accountsRes = await fetch(`${API_BASE}/account/list?wallet_id=${selectedWalletId}`);
      setWalletAccounts(await accountsRes.json());
    } catch (e: any) {
      setAddAccountError(e.message || 'Failed to add account');
    } finally {
      setAddAccountLoading(false);
    }
  };

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
      const newAccount = { name: walletName, address: res.address, private_key: res.private_key, mnemonic: res.mnemonic, created_at: new Date().toISOString() };
      // Immediately update backendAccounts state so the new account appears without refresh
      setBackendAccounts(prev => [newAccount, ...prev]);
      const updatedAccounts = [...accounts, newAccount];
      setAccounts(updatedAccounts);
      setSelectedBackendAccountIdx(updatedAccounts.length - 1); // select the new account
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
      const newAccount = { name: 'Imported (mnemonic)', address: res.address, privateKey: res.private_key, mnemonic: importMnemonic, created_at: new Date().toISOString() };
      const updatedAccounts = [...accounts, newAccount];
      setAccounts(updatedAccounts);
      setSelectedBackendAccountIdx(updatedAccounts.length - 1);
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
      const newAccount = { name: 'Imported (private key)', address: res.address, privateKey: res.private_key, created_at: new Date().toISOString() };
      const updatedAccounts = [...accounts, newAccount];
      setAccounts(updatedAccounts);
      setSelectedBackendAccountIdx(updatedAccounts.length - 1);
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
        if (!Array.isArray(wallets)) throw new Error('Wallets response is not an array');
        setBackendAccounts(wallets);
        if (wallets.length > 0) setSelectedBackendAccountIdx(0);
      } catch (e) {
        setError('Failed to load wallets from backend');
      }
    }
    fetchWallets();
  }, []);


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
          created_at: new Date().toISOString(),
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
    { field: 'name', name: 'Name', width: '10%' },
    { field: 'address', name: 'Address', width: '30%' },
    { field: 'balance', name: 'Balance (ETH)', width: '15%',
      render: (balance: string) => {
        // Convert from wei to ETH (if not error)
        if (!balance || isNaN(Number(balance))) return balance || '-';
        return (Number(balance) / 1e18).toFixed(4);
      }
    },
    { field: 'created_at', name: 'Created At', width: '15%' },
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

  // Wallet selection dropdown UI
  // Render wallet dropdown
  const walletOptions = Array.isArray(wallets) ? wallets.map(w => ({
    value: w.id || w._id || w.address,
    inputDisplay: w.name || w.address || w.id
  })) : [];

  // Render account radio button list
  const accountRadioOptions = Array.isArray(walletAccounts) ? walletAccounts.map(acc => ({
    id: acc.address,
    label: acc.name + ' (' + acc.address.slice(0, 8) + '...)',
  })) : [];

  // --- Signing UI State ---
  const [signingTab, setSigningTab] = useState<'tx' | 'msg'>('tx');
  const [signTxData, setSignTxData] = useState('');
  const [signMsg, setSignMsg] = useState('');
  const [signResult, setSignResult] = useState<string | null>(null);
  const [signLoading, setSignLoading] = useState(false);
  const [signError, setSignError] = useState('');
  const [authToken, setAuthToken] = useState(''); // You may want to get this from context or login

  // --- Signing Handlers ---
  const handleSignTransaction = async () => {
    setSignLoading(true); setSignError(''); setSignResult(null);
    try {
      const tx = JSON.parse(signTxData);
      const res = await signTransaction(selectedAccountId!, tx, authToken);
      setSignResult(JSON.stringify(res, null, 2));
    } catch (e: any) {
      setSignError(e.message || 'Failed to sign transaction. Ensure valid JSON and authentication.');
    } finally {
      setSignLoading(false);
    }
  };
  const handleSignMessage = async () => {
    setSignLoading(true); setSignError(''); setSignResult(null);
    try {
      const res = await signMessage(selectedAccountId!, signMsg, authToken);
      setSignResult(JSON.stringify(res, null, 2));
    } catch (e: any) {
      setSignError(e.message || 'Failed to sign message.');
    } finally {
      setSignLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 1400, margin: 'auto', padding: 20 }}>
      <EuiTitle size="l"><h2>Wallet Management</h2></EuiTitle>
      <EuiSpacer size="l" />
      {error && <EuiCallOut title="Error" color="danger" iconType="alert">{error}</EuiCallOut>}
      {success && <EuiCallOut title="Success" color="success" iconType="check">{success}</EuiCallOut>}
      <EuiSpacer size="m" />

      {selectedAccountId && (
        <EuiCallOut title="Selected Account Details" color="primary">
          <div><b>Name:</b> {walletAccounts.find(a => a.address === selectedAccountId)?.name}</div>
          <div><b>Address:</b> {selectedAccountId}</div>
          <div><b>Balance:</b> {balance}</div>
        </EuiCallOut>
      )}
      {/* Wallet Creation and Import Section */}
      <EuiCard title="Wallets" layout="vertical">
          <EuiSpacer size="l" />
            <EuiFormRow label="Select Wallet">
              <EuiSelect
                options={walletOptions.map(opt => ({ value: opt.value, text: opt.inputDisplay }))}
                value={selectedWalletId || ''}
                onChange={e => setSelectedWalletId(e.target.value)}
                fullWidth
                disabled={walletOptions.length === 0}
                aria-label="Select a wallet"
              />
            </EuiFormRow>
          <EuiSpacer size="l" />
        <EuiForm component="form">
            <EuiFormRow label="Wallet Name (for new wallet)">
              <>
                <EuiFieldText
                  value={walletName}
                  onChange={e => setWalletName(e.target.value)}
                  placeholder="Enter wallet name"
                />
                <EuiButton fill onClick={handleCreate} isDisabled={!walletName}>
                  Create Wallet
                </EuiButton>
              </>
            </EuiFormRow>

            <EuiSpacer size="m" />

            <EuiFormRow label="Import Wallet by Mnemonic">
              <>
                <EuiFieldText
                  value={importMnemonic}
                  onChange={e => setImportMnemonic(e.target.value)}
                  placeholder="Enter mnemonic phrase"
                />
                <EuiButton onClick={handleImportMnemonic} isDisabled={!importMnemonic}>
                  Import by Mnemonic
                </EuiButton>
              </>
            </EuiFormRow>

            <EuiSpacer size="m" />

            <EuiFormRow label="Import Wallet by Private Key">
              <>
                <EuiFieldText
                  value={importPrivKey}
                  onChange={e => setImportPrivKey(e.target.value)}
                  placeholder="Enter private key"
                />
                <EuiButton onClick={handleImportPrivateKey} isDisabled={!importPrivKey}>
                  Import by Private Key
                </EuiButton>
              </>
            </EuiFormRow>
        </EuiForm>
      </EuiCard>
      <EuiSpacer size="m" />
      <div style={{ display: 'flex', flexDirection: 'row', gap: '16px' }}>
        <div style={{ flex: 1 }}>
          <EuiCard title="Accounts" layout="vertical">
              {walletAccounts.length > 0 ? (
                <EuiRadioGroup
                  options={accountRadioOptions}
                  idSelected={selectedAccountId || ''}
                  onChange={id => setSelectedAccountId(id)}
                  name="accountRadios"
                />
              ) : <span>No accounts for this wallet.</span>}
            <EuiSpacer size="m" />
            <EuiButton size="s" style={{ marginTop: 8 }} onClick={() => setIsAddAccountModalOpen(true)}>
              + Add Account
            </EuiButton>
            <EuiSpacer    size="m" />
            <EuiFormRow label="RPC URL">
              <EuiFieldText value={rpcUrl} onChange={e => setRpcUrl(e.target.value)} />
            </EuiFormRow>
          </EuiCard>
        </div>
        <div style={{ flex: 1 }}>
          {isAddAccountModalOpen && (
            <EuiCard title="Add New Account">
                <EuiSpacer size="m" />
                <div style={{ marginBottom: 16 }}>
                  <label htmlFor="newAccountName"><b>Account Name</b></label>
                  <EuiFieldText id="newAccountName" value={newAccountName} onChange={e => setNewAccountName(e.target.value)} />
                </div>
                {addAccountError && <EuiCallOut title="Error" color="danger">{addAccountError}</EuiCallOut>}
                <EuiSpacer size="m" />
                <EuiButton onClick={handleAddAccount} isLoading={addAccountLoading} fill>
                  Create & Fund Account
                </EuiButton>
                <EuiButton color="danger" onClick={() => setIsAddAccountModalOpen(false)} style={{ marginLeft: 8 }}>
                  Cancel
                </EuiButton>
            </EuiCard>
          )}
        </div>
      </div>
      <EuiSpacer size="m" />
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
        <EuiSpacer size="l" />
      </EuiCard>
      <EuiSpacer size="m" />
      <EuiCard title="Accounts Details" layout="vertical">
        <EuiBasicTable
          items={Array.isArray(backendAccounts) ? backendAccounts : []}
          columns={accountColumns}
          rowHeader="name"
        />
      </EuiCard>
      <EuiSpacer size="l" />

      <EuiSpacer size="l" />
      <EuiCard title="Sign Transaction / Message" layout="vertical">
        <div style={{ marginBottom: 16 }}>
          <EuiButton size="s" fill={signingTab === 'tx'} onClick={() => setSigningTab('tx')}>Sign Transaction</EuiButton>
          <EuiButton size="s" fill={signingTab === 'msg'} onClick={() => setSigningTab('msg')} style={{ marginLeft: 8 }}>Sign Message</EuiButton>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label><b>Auth Token</b></label>
          <EuiFieldText value={authToken} onChange={e => setAuthToken(e.target.value)} placeholder="Paste your auth token (JWT) here" />
        </div>
        {signingTab === 'tx' ? (
          <>
            <div style={{ marginBottom: 8 }}>
              <label><b>Transaction JSON</b></label>
              <EuiFieldText value={signTxData} onChange={e => setSignTxData(e.target.value)} placeholder='{"to":"0x...","value":0,"data":"0x...","gas":21000,"gasPrice":1000000000,"nonce":0,"chainId":1337}' />
            </div>
            <EuiButton onClick={handleSignTransaction} isLoading={signLoading} isDisabled={!selectedAccountId || !signTxData || !authToken}>Sign Transaction</EuiButton>
          </>
        ) : (
          <>
            <div style={{ marginBottom: 8 }}>
              <label><b>Message</b></label>
              <EuiFieldText value={signMsg} onChange={e => setSignMsg(e.target.value)} placeholder="Message to sign" />
            </div>
            <EuiButton onClick={handleSignMessage} isLoading={signLoading} isDisabled={!selectedAccountId || !signMsg || !authToken}>Sign Message</EuiButton>
          </>
        )}
        {signError && <EuiCallOut title="Error" color="danger">{signError}</EuiCallOut>}
        {signResult && <EuiCallOut title="Signature Result" color="success"><pre style={{whiteSpace:'pre-wrap',wordBreak:'break-all'}}>{signResult}</pre></EuiCallOut>}
      </EuiCard>
    </div>
  );
};

export default Wallet;
