import axios from 'axios';

// Email verification / password reset flows.
// The session JWT lives in an HttpOnly cookie managed by the backend;
// no token is ever returned to or stored by the frontend.

export const verifyEmail = async (token) => {
  const { data } = await axios.get(`/auth/verify-email/${token}`);
  return data;
};

export const resendVerification = async (email) => {
  const { data } = await axios.post('/auth/resend-verification', { email });
  return data;
};

export const forgotPassword = async (email) => {
  const { data } = await axios.post('/auth/forgot-password', { email });
  return data;
};

export const resetPassword = async (token, password) => {
  const { data } = await axios.post(`/auth/reset-password/${token}`, { password });
  return data;
};
