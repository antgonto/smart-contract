import axios from 'axios';

const api = axios.create({
    baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000',
});

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export const walletService = {
  balance: (address: string) => api.get(`/app/v1/smartcontracts/wallet/balance/${address}`),
  create: (data: { network: string }) => api.post('/app/v1/smartcontracts/wallet/create', data),
  send: (from_address: string, to_address: string, amount: number, private_key: string) =>
      api.post('/app/v1/smartcontracts/wallet/send', {from_address, to_address, amount, private_key}),
};

export const fetchDashboardMetrics = async () => {
  const response = await api.get('/app/v1/smartcontracts/smartcontract/dashboard/metrics');
  return response.data;
};

export const registerCertificate = async (recipient: string, pdfFile: File, storageMode: string) => {
  const formData = new FormData();
  formData.append('file', pdfFile);
  formData.append('recipient', recipient);
  formData.append('storage_mode', storageMode);

  const response = await api.post('/app/v1/smartcontracts/smartcontract/register_certificate/', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const fetchCertificates = async () => {
  const response = await api.get('/app/v1/smartcontracts/smartcontract/list_certificates');
  return response.data;
};

export const verifyCertificateDetails = async (certHash: string) => {
    const response = await api.get(`/app/v1/smartcontracts/smartcontract/verify_certificate_details/${certHash}`);
    return response.data;
};

export const downloadCertificateOffchain = async (ipfsHash: string) => {
  const response = await api.get(`/app/v1/smartcontracts/smartcontract/download_offchain/${ipfsHash}`, {
    responseType: 'blob',
  });
  return response.data;
};

export const downloadCertificateOnchain = async (certHash: string) => {
  const response = await verifyCertificateDetails(certHash);
  if (response.pdf_on_chain) {
    const hex = response.pdf_on_chain;
    const bytes = new Uint8Array(hex.match(/.{1,2}/g)!.map((byte: string) => parseInt(byte, 16)));
    return new Blob([bytes], { type: 'application/pdf' });
  }
  throw new Error('No on-chain PDF data found.');
};

export const downloadOnchainCertificate = async (certHash: string) => {
  // This will trigger a file download in the browser
  const url = `${api.defaults.baseURL}/app/v1/smartcontracts/smartcontract/download_onchain/${certHash}`;
  window.open(url, '_blank');
};

export const checkRoles = async (address: string) => {
  const response = await api.get(`/app/v1/smartcontracts/smartcontract/check_roles/${address}`);
  return response.data;
};

export const grantStudentRole = async (data: { address: string }) => {
  const response = await api.post('/app/v1/smartcontracts/smartcontract/grant_student_role/', data, {
    headers: { 'Content-Type': 'application/json' },
  });
  return response.data;
};

export const revokeStudentRole = async (data: { address: string }) => {
  const response = await api.post('/app/v1/smartcontracts/smartcontract/revoke_student_role/', data);
  return response.data;
};

export const persistAccount = async (account: any) => {
  return api.post('/api/accounts/', account);
};

export const persistTransaction = async (transaction: any) => {
  return api.post('/api/transactions/', transaction);
};

export const fetchStudentDiplomas = async (studentAddress: string) => {
  if (!studentAddress) {
    throw new Error('Student address is required');
  }
  const response = await api.get('/app/v1/student/certificates', {
    params: { student_address: studentAddress },
  });
  console.log("Response", response)
  // Accept both response.data.certificates and response.data (array)
  const items = Array.isArray(response.data)
    ? response.data
    : (response.data.certificates || []);
  // Map backend fields to expected frontend fields (including issue_date)
  return items.map((item: any, idx: number) => ({
    id: idx + 1,
    cert_hash: item.cert_hash || item.hash,
    ipfs_hash: item.ipfs_hash,
    issue_date: item.issue_date || item.timestamp || item.block_number,
    ...item,
  }));
};

export default api;
