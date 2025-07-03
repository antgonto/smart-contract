import axios from 'axios';

const API_BASE = 'http://localhost:8000/app/v1/smartcontracts/wallet';

export async function createWallet(walletName: string) {
  const res = await axios.post(`${API_BASE}/create`, { wallet_name: walletName });
  return res.data;
}

export async function importWallet(mnemonic: string) {
  const res = await axios.post(`${API_BASE}/import`, { mnemonic });
  return res.data;
}

export async function getBalance(address: string, rpc_url: string) {
  const res = await axios.post(`${API_BASE}/balance`, { address, rpc_url });
  return res.data;
}

export async function importWalletPrivateKey(private_key: string) {
  const res = await axios.post(`${API_BASE}/import_private_key`, { private_key });
  return res.data;
}

export async function generateAccountsAndFund(params: {
  wallet_private_key: string;
  rpc_url: string;
  num_accounts: number;
  fund_amount_wei: number;
}) {
  const res = await axios.post(`${API_BASE}/generate_accounts`, params);
  return res.data;
}

export async function listWallets() {
  const res = await axios.get(`${API_BASE}/list`);
  return res.data;
}
