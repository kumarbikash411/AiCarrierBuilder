import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Keep the API URL in app.json/EAS extra so production builds use the same
// backend as the test track. The fallback supports older Expo manifest shapes.
const apiBaseUrl =
  Constants.expoConfig?.extra?.apiBaseUrl ||
  Constants.manifest?.extra?.apiBaseUrl;

const api = axios.create({
  baseURL: apiBaseUrl?.replace(/\/$/, ''),
  timeout: 20000,
  headers: { Accept: 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('authToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
