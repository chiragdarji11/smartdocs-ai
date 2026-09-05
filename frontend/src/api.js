/**
 * Axios API client configured for the backend.
 * Automatically attaches JWT token to all requests.
 */

import axios from 'axios'

const IS_LOCAL = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
const DEFAULT_URL = IS_LOCAL ? 'http://localhost:8001' : 'https://smartdocs-ai-e544.onrender.com'
const RAW_URL = import.meta.env.VITE_API_URL || DEFAULT_URL
const BASE_URL = RAW_URL.replace(/\/+$/, '')

// Create axios instance pointing to the FastAPI backend
const api = axios.create({
  baseURL: BASE_URL,
})

// Request interceptor: attach JWT token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    // If request payload is FormData (file upload), ensure browser sets multipart boundary
    if (config.data instanceof FormData) {
      if (config.headers) {
        if (typeof config.headers.delete === 'function') {
          config.headers.delete('Content-Type')
        }
        delete config.headers['Content-Type']
      }
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
