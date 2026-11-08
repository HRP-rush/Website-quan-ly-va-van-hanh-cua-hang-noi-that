import axios from 'axios';

const API_URL = 'http://localhost:5000/api/thanh-toan';

export const taoUrlVNPay = async (donHangData) => {
  const response = await axios.post(`${API_URL}/tao-url-vnpay`, donHangData);
  return response.data;
};

export const xacNhanVNPay = async (params) => {
  const response = await axios.get(`${API_URL}/vnpay-return`, { params });
  return response.data;
};