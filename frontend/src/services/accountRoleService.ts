import axios from 'axios';

export async function fetchAccountRoles(address: string): Promise<string[]> {
  try {
    const res = await axios.get(`/app/v1/smartcontracts/wallet/account/roles`, {
      params: { address },
    });
    return res.data;
  } catch (error) {
    // Optionally handle/log error
    return [];
  }
}

