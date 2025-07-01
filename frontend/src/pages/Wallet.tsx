import React, { useState, useEffect } from 'react';
import { EuiButton, EuiFieldText, EuiText, EuiSpacer, EuiTitle, EuiCallOut } from '@elastic/eui';
import { ethers } from 'ethers';
import api from '../services/api';

const Wallet: React.FC = () => {
  const [address, setAddress] = useState<string>('');
  const [balance, setBalance] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [toAddress, setToAddress] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [isMetaMask, setIsMetaMask] = useState<boolean>(false);

  // Connect MetaMask
  const connectMetaMask = async () => {
    setError('');
    setSuccess('');
    if ((window as any).ethereum) {
      try {
        const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
        setAddress(accounts[0]);
        setIsMetaMask(true);
      } catch (err: any) {
        setError('MetaMask connection failed');
      }
    } else {
      setError('MetaMask not detected');
    }
  };

  // Fetch balance
  const fetchBalance = async (addr: string) => {
    setError('');
    setSuccess('');
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const bal = await provider.getBalance(addr);
      setBalance(ethers.formatEther(bal));
    } catch (err) {
      setError('Failed to fetch balance');
    }
  };

  useEffect(() => {
    if (address && isMetaMask) {
      fetchBalance(address);
    }
  }, [address, isMetaMask]);

  // Send transaction via MetaMask
  const sendTransaction = async () => {
    setError('');
    setSuccess('');
    if (!ethers.isAddress(toAddress)) {
      setError('Invalid recipient address');
      return;
    }
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const tx = await signer.sendTransaction({
        to: toAddress,
        value: ethers.parseEther(amount)
      });
      setSuccess('Transaction sent! Hash: ' + tx.hash);
      setToAddress('');
      setAmount('');
      fetchBalance(address);
    } catch (err: any) {
      setError('Transaction failed: ' + (err.message || ''));
    }
  };

  // Create backend wallet
  const createBackendWallet = async () => {
    setError('');
    setSuccess('');
    try {
      const res = await api.post('/wallet/create', {});
      setSuccess('Backend wallet created: ' + res.data.address);
    } catch (err: any) {
      setError('Backend wallet creation failed');
    }
  };

  return (
    <div style={{ maxWidth: 500, margin: '0 auto', padding: 24 }}>
      <EuiTitle size="l"><h1>Wallet Management</h1></EuiTitle>
      <EuiSpacer size="l" />
      <EuiButton fill onClick={connectMetaMask} style={{ marginBottom: 16 }}>
        Connect MetaMask
      </EuiButton>
      {address && (
        <>
          <EuiText><b>Connected Address:</b> {address}</EuiText>
          <EuiText><b>Balance:</b> {balance} ETH</EuiText>
        </>
      )}
      <EuiSpacer size="l" />
      <EuiTitle size="s"><h2>Send Transaction</h2></EuiTitle>
      <EuiFieldText
        placeholder="Recipient Address"
        value={toAddress}
        onChange={e => setToAddress(e.target.value)}
        style={{ marginBottom: 8 }}
      />
      <EuiFieldText
        placeholder="Amount in ETH"
        value={amount}
        onChange={e => setAmount(e.target.value)}
        style={{ marginBottom: 8 }}
      />
      <EuiButton onClick={sendTransaction} isDisabled={!address || !amount || !toAddress}>
        Send
      </EuiButton>
      <EuiSpacer size="l" />
      <EuiTitle size="s"><h2>Backend Wallet</h2></EuiTitle>
      <EuiButton onClick={createBackendWallet}>
        Create Backend Wallet
      </EuiButton>
      <EuiSpacer size="l" />
      {error && <EuiCallOut title="Error" color="danger">{error}</EuiCallOut>}
      {success && <EuiCallOut title="Success" color="success">{success}</EuiCallOut>}
    </div>
  );
};

export default Wallet;
