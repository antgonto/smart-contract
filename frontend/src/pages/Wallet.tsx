import React, { useState } from 'react';
import {
  EuiFlexGrid,
  EuiFlexItem,
  EuiCard,
  EuiIcon,
  EuiSpacer,
  EuiCallOut,
  EuiFieldText,
} from '@elastic/eui';
import { ethers } from 'ethers';
import { walletService } from '../services/api';

const actions = [
  {
    id: 'create-wallet',
    title: 'Create Wallet',
    iconType: 'plusInCircle',
    handler: 'handleCreateWallet',
    successMsg: 'Wallet created: ',
    errorMsg: 'Wallet creation failed',
  },
  {
    id: 'connect-metamask',
    title: 'Connect MetaMask',
    iconType: 'discoverApp',
    handler: 'handleConnectMetaMask',
    successMsg: 'MetaMask connected successfully.',
    errorMsg: 'MetaMask connection failed: ',
  },
  {
    id: 'fetch-balance',
    title: 'Fetch Balance',
    iconType: 'lensApp',
    handler: 'handleFetchBalance',
    successMsg: 'Balance fetched: ',
    errorMsg: 'Failed to fetch balance',
  },
  {
    id: 'send',
    title: 'Send Transaction',
    iconType: 'sortRight',
    handler: 'handleSend',
    successMsg: 'Transaction sent! Hash: ',
    errorMsg: 'Transaction failed: ',
  },
];

const Wallet: React.FC = () => {
  const [address, setAddress] = useState('');
  const [balance, setBalance] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [toAddress, setToAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [isMetaMask, setIsMetaMask] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState('mainnet');
  const [fundTxHash, setFundTxHash] = useState('');

  const networks = [
    { id: 'mainnet', name: 'Ethereum Mainnet', chainId: '0x1' },
    { id: 'goerli', name: 'Goerli Testnet', chainId: '0x5' },
    { id: 'sepolia', name: 'Sepolia Testnet', chainId: '0xaa36a7' },
    { id: 'ganache', name: 'Ganache Local', chainId: '0x539' },
    // Add more networks as needed
  ];

  const handleCreateWallet = async () => {
    setError(''); setSuccess(''); setFundTxHash('');
    try {
      // Pass the selected network to the backend
      const res = await walletService.create({ network: selectedNetwork });
      if (res.data.address) setAddress(res.data.address);
      if (res.data.fund_tx_hash) setFundTxHash(res.data.fund_tx_hash);
      if (res.data.error) setError(res.data.error);
      else setSuccess(actions[0].successMsg + res.data.address);
    } catch (err: any) {
      setError(actions[0].errorMsg + (err?.message || ''));
    }
  };

  const handleConnectMetaMask = async () => {
    setError(''); setSuccess('');
    if ((window as any).ethereum) {
      try {
        // Switch to selected network before connecting
        const network = networks.find(n => n.id === selectedNetwork);
        if (network) {
          try {
            await (window as any).ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: network.chainId }],
            });
          } catch (switchError: any) {
            // If the network is not added to MetaMask, try to add it
            if (switchError.code === 4902) {
              await (window as any).ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [{
                  chainId: network.chainId,
                  chainName: network.name,
                  rpcUrls: ['http://localhost:8545'], // You may want to customize this per network
                }],
              });
            } else {
              throw switchError;
            }
          }
        }
        const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
        setAddress(accounts[0]);
        setIsMetaMask(true);
        setSuccess(actions[1].successMsg + ` Connected to ${network?.name}`);
      } catch (err: any) {
        setError(actions[1].errorMsg + (err?.message || ''));
      }
    } else {
      setError('MetaMask not detected');
    }
  };

  const handleFetchBalance = async () => {
    setError(''); setSuccess('');
    if (!address) { setError('No address set'); return; }
    try {
      if (isMetaMask) {
        const provider = new ethers.BrowserProvider((window as any).ethereum);
        const bal = await provider.getBalance(address);
        setBalance(ethers.formatEther(bal));
        setSuccess(actions[2].successMsg + ethers.formatEther(bal) + ' ETH');
      } else {
        const res = await walletService.balance(address);
        setBalance(res.data.balance);
        setSuccess(actions[2].successMsg + res.data.balance + ' ETH');
      }
    } catch {
      setError(actions[2].errorMsg);
    }
  };

  const handleSend = async () => {
    setError(''); setSuccess('');
    if (!ethers.isAddress(toAddress)) {
      setError('Invalid recipient address');
      return;
    }
    if (!amount) {
      setError('Amount required');
      return;
    }
    try {
      if (isMetaMask) {
        const provider = new ethers.BrowserProvider((window as any).ethereum);
        const signer = await provider.getSigner();
        const tx = await signer.sendTransaction({
          to: toAddress,
          value: ethers.parseEther(amount)
        });
        setSuccess(actions[3].successMsg + tx.hash);
      } else {
        // For backend wallet, you would need to prompt for private key or have it stored securely
        setError('Wallet send not implemented (private key required)');
        return;
      }
      setToAddress('');
      setAmount('');
      handleFetchBalance();
    } catch (err: any) {
      setError(actions[3].errorMsg + (err?.message || ''));
    }
  };

  const handleAction = (handler: string) => {
    switch (handler) {
      case 'handleCreateWallet':
        handleCreateWallet(); break;
      case 'handleConnectMetaMask':
        handleConnectMetaMask(); break;
      case 'handleFetchBalance':
        handleFetchBalance(); break;
      case 'handleSend':
        handleSend(); break;
      default:
        break;
    }
  };

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: 24 }}>
      <EuiSpacer size="xl" />
      {/* Network selection dropdown */}
      <div style={{ marginBottom: 16 }}>
        <label htmlFor="network-select"><b>Select Network:</b></label>
        <select
          id="network-select"
          value={selectedNetwork}
          onChange={e => setSelectedNetwork(e.target.value)}
          style={{ marginLeft: 8, padding: 4 }}
        >
          {networks.map(net => (
            <option key={net.id} value={net.id}>{net.name}</option>
          ))}
        </select>
      </div>
      {address && (
        <EuiCallOut title="Connected Address" color="primary"><p>{address}</p></EuiCallOut>
      )}
      {fundTxHash && (
        <EuiCallOut title="Funding Transaction Hash" color="success"><p>{fundTxHash}</p></EuiCallOut>
      )}
      {balance && (
        <EuiCallOut title="Balance" color="success"><p>{balance} ETH</p></EuiCallOut>
      )}
      {error && <EuiCallOut title="Error" color="danger">{error}</EuiCallOut>}
      {success && <EuiCallOut title="Success" color="success">{success}</EuiCallOut>}
      <EuiSpacer size="xl" />
      <EuiFlexGrid columns={2} gutterSize="l">
        {actions.map(action => (
          <EuiFlexItem key={action.id} style={{ minHeight: 180 }}>
            <EuiCard
              icon={<EuiIcon type={action.iconType} size="xxl" />}
              title={action.title}
              textAlign="center"
              paddingSize="l"
              onClick={() => handleAction(action.handler)}
            />
            {action.id === 'send' && (
              <div style={{ marginTop: 16 }}>
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
              </div>
            )}
          </EuiFlexItem>
        ))}
      </EuiFlexGrid>
    </div>
  );
};

export default Wallet;
