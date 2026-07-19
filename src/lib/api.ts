import axios from "axios";

// Create Axios client with default configuration
const api = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Automatically inject JWT Bearer Token on outgoing queries
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("college_token");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle session timeouts elegantly
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Clear token and reload if unauthorized
      console.warn("Session expired or unauthorized access request.");
    }
    return Promise.reject(error);
  }
);

export default api;
