import axios from 'axios';
import { currentBaseUrl } from "@/utils/env";

const service = axios.create({
  baseURL: currentBaseUrl,
  timeout: 20000,
  headers: {
    "Content-Type": "application/json;charset=utf-8",
    "Accept-Language": "en",
  },
});

service.interceptors.request.use(
  config => {
    const accessToken = localStorage.getItem("token");
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  error => {
    console.error('request error:', error);
    return Promise.reject(error);
  }
);

service.interceptors.response.use(
  response => {
    const { code, data, message } = response.data;
    if (code === 401) {
    }
    if (code === 200) {
      return response.data;
    }
    return Promise.reject(new Error(message || "Error"));
  },
  error => {
    return Promise.reject(error.message);
  }
);

export default service;
