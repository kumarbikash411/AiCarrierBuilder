import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        try {
          const { data } = await api.get('/auth/me');
          setUser(data);
        } catch {
          await AsyncStorage.removeItem('authToken');
        }
      }
      setLoading(false);
    })();
  }, []);

  async function login(email, password) {
    const { data } = await api.post('/auth/login', { email, password });
    await AsyncStorage.setItem('authToken', data.token);
    setUser(data.user);
  }

  async function register(name, email, password) {
    const { data } = await api.post('/auth/register', { name, email, password });
    await AsyncStorage.setItem('authToken', data.token);
    setUser(data.user);
  }

  // Phone/OTP flow: step 1 just triggers an SMS, no token yet
  async function sendOtp(phone) {
    await api.post('/auth/otp/send', { phone });
  }

  // Step 2: verifying the code logs the user in (creating the account on
  // first-ever login with this phone number)
  async function verifyOtp(phone, code, name) {
    const { data } = await api.post('/auth/otp/verify', { phone, code, name });
    await AsyncStorage.setItem('authToken', data.token);
    setUser(data.user);
  }

  async function logout() {
    await AsyncStorage.removeItem('authToken');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, sendOtp, verifyOtp, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
