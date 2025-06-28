import axios from 'axios';

const raw = process.env.REACT_APP_API_URL?.trim();
const API_URL = raw && raw !== '' ? raw : 'http://localhost:8000';



const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});


export const fetchDashboardMetrics = async () => {
  const response = await api.get('/app/v1/smartcontracts/dashboard/metrics');
  return response.data;
};

export const registerCertificateFromPdf = async (file: File, recipient: string) => {
  const formData = new FormData();
  formData.append('file', file);
  // recipient is sent as a query param
  const response = await api.post(`/app/v1/smartcontracts/register/?recipient=${encodeURIComponent(recipient)}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};


export default api;
