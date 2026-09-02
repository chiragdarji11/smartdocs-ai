/**
 * Login Page — SmartDocs AI
 * Features strict client validation, real-time feedback, show/hide password toggle,
 * focus management, generic security error messages, and loading state protection.
 */

import { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Shield, Mail, Lock, ArrowRight, AlertCircle, Check, X, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const validateEmail = (emailStr) => {
  if (!emailStr || emailStr.length === 0) return 'Enter a valid email address.'
  const trimmed = emailStr.trim()
  const strictEmailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  if (!strictEmailRegex.test(trimmed)) return 'Enter a valid email address.'
  return ''
}

const validatePassword = (pwd) => {
  if (!pwd || pwd.trim().length === 0) return 'Password is required.'
  return ''
}

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  
  const [touched, setTouched] = useState({
    email: false,
    password: false
  })

  const [serverError, setServerError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  // Refs for automatic focus management
  const emailRef = useRef(null)
  const passwordRef = useRef(null)

  // Real-time Errors
  const emailError = touched.email ? validateEmail(email) : ''
  const passwordError = touched.password ? validatePassword(password) : ''

  // Validity checks
  const isEmailValid = validateEmail(email) === ''
  const isPasswordValid = validatePassword(password) === ''
  const isFormValid = isEmailValid && isPasswordValid

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }))
  }

  const focusFirstInvalidField = () => {
    setTouched({ email: true, password: true })
    if (!isEmailValid) {
      emailRef.current?.focus()
      return false
    }
    if (!isPasswordValid) {
      passwordRef.current?.focus()
      return false
    }
    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setServerError('')

    if (!focusFirstInvalidField()) {
      return
    }

    const trimmedEmail = email.trim().toLowerCase()
    setLoading(true)

    try {
      await login(trimmedEmail, password)
      navigate('/dashboard')
    } catch (err) {
      const detail = err.response?.data?.detail
      setServerError(typeof detail === 'string' ? detail : 'Incorrect email or password.')
      // Always focus email field on failed login attempt
      emailRef.current?.focus()
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (!isFormValid) {
        e.preventDefault()
        focusFirstInvalidField()
      }
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative animate-slide-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-primary-500/30 animate-float">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold gradient-text">Welcome Back</h1>
          <p className="text-gray-400 mt-2">Sign in to SmartDocs AI</p>
        </div>

        {/* Login Form */}
        <div className="glass-card p-8">
          <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="space-y-5" noValidate>
            {/* Global Error Message */}
            {serverError && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-400 animate-slide-up">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{serverError}</span>
              </div>
            )}

            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2" htmlFor="email">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  ref={emailRef}
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (!touched.email) setTouched((prev) => ({ ...prev, email: true }))
                  }}
                  onBlur={() => handleBlur('email')}
                  placeholder="john@gmail.com"
                  required
                  className={`input-field pl-11 pr-10 ${
                    touched.email
                      ? isEmailValid
                        ? 'input-field-valid'
                        : 'input-field-invalid'
                      : ''
                  }`}
                />
                {touched.email && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    {isEmailValid ? (
                      <Check className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <X className="w-5 h-5 text-rose-400" />
                    )}
                  </div>
                )}
              </div>
              {emailError && (
                <p className="mt-1.5 text-xs text-rose-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {emailError}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-300" htmlFor="password">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-primary-400 hover:text-primary-300 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  ref={passwordRef}
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (!touched.password) setTouched((prev) => ({ ...prev, password: true }))
                  }}
                  onBlur={() => handleBlur('password')}
                  placeholder="••••••••"
                  required
                  className={`input-field pl-11 pr-20 ${
                    touched.password
                      ? isPasswordValid
                        ? 'input-field-valid'
                        : 'input-field-invalid'
                      : ''
                  }`}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="text-gray-400 hover:text-white transition-colors focus:outline-none p-1 rounded-md hover:bg-white/10"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  {touched.password && (
                    <div className="pointer-events-none">
                      {isPasswordValid ? (
                        <Check className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <X className="w-5 h-5 text-rose-400" />
                      )}
                    </div>
                  )}
                </div>
              </div>
              {passwordError && (
                <p className="mt-1.5 text-xs text-rose-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {passwordError}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !isFormValid}
              className="btn-primary w-full flex items-center justify-center gap-2 mt-6"
              id="login-submit"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Register Link */}
          <p className="text-center text-sm text-gray-400 mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary-400 hover:text-primary-300 font-medium transition-colors">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
