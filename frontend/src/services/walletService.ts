import axios from 'axios';

const API_BASE = '/app/v1/smartcontracts/wallet'; // Use relative path for proxy compatibility

export async function createWallet(walletName: string, role: string) {
  const res = await axios.post(`${API_BASE}/create`, { name: walletName, role });
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
  name?: string;
}) {
  const res = await axios.post(`${API_BASE}/generate_accounts`, params);
  return res.data;
}

export async function listWallets() {
  try {
    const res = await axios.get(`${API_BASE}/list`);
    return Array.isArray(res.data) ? res.data : [];
  } catch (err: any) {
    if (err.response && err.response.status === 404) {
      // Treat 404 as empty list (no wallets/accounts)
      return [];
    }
    throw err;
  }
}

// --- Signing Endpoints ---
const AUTH_API_BASE = '/app/v1/smartcontracts/auth'; // Adjust if your proxy or base path differs

export async function signTransaction(accountId: string, tx: any, token: string) {
  const res = await axios.post(
    `${AUTH_API_BASE}/sign_transaction`,
    { account_id: accountId, tx },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.data;
}

export async function signMessage(accountId: string, message: string, token: string) {
  const res = await axios.post(
    `${AUTH_API_BASE}/sign_message`,
    { account_id: accountId, message },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.data;
}
