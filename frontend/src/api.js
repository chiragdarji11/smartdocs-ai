/**
 * Axios API client configured for the backend.
 * Automatically attaches JWT token to all requests.
 */

import axios from 'axios'

const API_HOST = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
const RAW_URL = import.meta.env.VITE_API_URL || `http://${API_HOST}:8001`
const BASE_URL = RAW_URL.replace(/\/+$/, '')

// Create axios instance pointing to the FastAPI backend
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor: attach JWT token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    // If request payload is FormData (file upload), delete default JSON header
    // so the browser automatically sets 'multipart/form-data' with boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type']
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor: handle 401 errors (expired/invalid token)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Do not redirect to login if the 401 is from the login endpoint itself
      const isLoginRequest = error.config && error.config.url && error.config.url.includes('/login')
      if (!isLoginRequest) {
        // Clear token and redirect to login
        localStorage.removeItem('token')
        localStorage.removeItem('username')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api
