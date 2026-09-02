/**
 * Register Page — SmartDocs AI
 * Features strict real-time client validation, visual feedback, security standards,
 * password complexity indicators, show/hide password toggle, and automatic focus management.
 */

import { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Shield, User, Mail, Lock, ArrowRight, CheckCircle, AlertCircle, Check, X, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

// Validation Helper Functions
const validateFullName = (name) => {
  if (!name || name.length === 0) return 'Please enter your full name.'
  const trimmed = name.trim()
  if (trimmed.length < 3 || trimmed.length > 50) return 'Name must be between 3 and 50 characters.'
  if (!/^[a-zA-Z0-9\s._-]+$/.test(trimmed)) return 'Name can contain only letters, numbers, and spaces.'
  return ''
}

const validateEmail = (emailStr) => {
  if (!emailStr || emailStr.length === 0) return 'Enter a valid email address.'
  const trimmed = emailStr.trim()
  if (trimmed.length > 100) return 'Email must be 100 characters or less.'
  const strictEmailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  if (!strictEmailRegex.test(trimmed)) return 'Enter a valid email address.'
  return ''
}

const getPasswordRequirements = (pwd) => {
  return {
    length: pwd.length >= 8 && pwd.length <= 64,
    upper: /[A-Z]/.test(pwd),
    lower: /[a-z]/.test(pwd),
    number: /[0-9]/.test(pwd),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?~]/.test(pwd)
  }
}

const validatePassword = (pwd) => {
  if (!pwd) return 'Password is required.'
  const reqs = getPasswordRequirements(pwd)
  if (!reqs.length) return 'Password must be between 8 and 64 characters.'
  if (!reqs.upper || !reqs.lower || !reqs.number || !reqs.special) {
    return 'Password must meet all security requirements below.'
  }
  return ''
}

const validateConfirmPassword = (confirmPwd, pwd) => {
  if (!confirmPwd) return 'Please confirm your password.'
  if (confirmPwd !== pwd) return 'Passwords do not match.'
  return ''
}

export default function Register() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Show / Hide Password visibility toggles
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [touched, setTouched] = useState({
    fullName: false,
    email: false,
    password: false,
    confirmPassword: false
  })

  const [serverError, setServerError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const { register } = useAuth()
  const navigate = useNavigate()

  // Refs for automatic focus management
  const fullNameRef = useRef(null)
  const emailRef = useRef(null)
  const passwordRef = useRef(null)
  const confirmPasswordRef = useRef(null)

  // Real-time Errors
  const fullNameError = touched.fullName ? validateFullName(fullName) : ''
  const emailError = touched.email ? validateEmail(email) : ''
  const passwordError = touched.password ? validatePassword(password) : ''
  const confirmPasswordError = touched.confirmPassword ? validateConfirmPassword(confirmPassword, password) : ''

  // Password requirement checklist status
  const pwdReqs = getPasswordRequirements(password)

  // Strict Overall Form Validity check
  const isFullNameValid = validateFullName(fullName) === ''
  const isEmailValid = validateEmail(email) === ''
  const isPasswordValid = validatePassword(password) === ''
  const isConfirmPasswordValid = validateConfirmPassword(confirmPassword, password) === ''
  const isFormValid = isFullNameValid && isEmailValid && isPasswordValid && isConfirmPasswordValid

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }))
  }

  const focusFirstInvalidField = () => {
    setTouched({ fullName: true, email: true, password: true, confirmPassword: true })
    if (!isFullNameValid) {
      fullNameRef.current?.focus()
      return false
    }
    if (!isEmailValid) {
      emailRef.current?.focus()
      return false
    }
    if (!isPasswordValid) {
      passwordRef.current?.focus()
      return false
    }
    if (!isConfirmPasswordValid) {
      confirmPasswordRef.current?.focus()
      return false
    }
    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setServerError('')
    setSuccess('')

    if (!focusFirstInvalidField()) {
      return
    }

    const trimmedFullName = fullName.trim()
    const trimmedEmail = email.trim().toLowerCase()

    setLoading(true)

    try {
      await register(trimmedFullName, trimmedEmail, password)
      setSuccess('Registration successful! Redirecting to login...')
      setTimeout(() => navigate('/login'), 1500)
    } catch (err) {
      const detail = err.response?.data?.detail
      if (typeof detail === 'string') {
        setServerError(detail)
      } else if (Array.isArray(detail)) {
        setServerError(detail.map((d) => d.msg || d).join(', '))
      } else {
        setServerError('Registration failed. Please verify server is running and try again.')
      }
      // Focus appropriate field on known server errors
      if (typeof detail === 'string') {
        if (detail.toLowerCase().includes('email')) {
          emailRef.current?.focus()
        } else if (detail.toLowerCase().includes('name')) {
          fullNameRef.current?.focus()
        }
      }
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
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative animate-slide-up my-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-primary-500/30 animate-float">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold gradient-text">Create Account</h1>
          <p className="text-gray-400 mt-2">Join SmartDocs AI platform</p>
        </div>

        {/* Registration Form */}
        <div className="glass-card p-8">
          <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="space-y-5" noValidate>
            {/* Global Server Error */}
            {serverError && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-400 animate-slide-up">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{serverError}</span>
              </div>
            )}

            {/* Global Success Message */}
            {success && (
              <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-sm text-emerald-400 animate-slide-up">
                <CheckCircle className="w-5 h-5 flex-shrink-0" />
                <span>{success}</span>
              </div>
            )}

            {/* Full Name Field */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2" htmlFor="fullname">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  ref={fullNameRef}
                  id="fullname"
                  type="text"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value)
                    if (!touched.fullName) setTouched((prev) => ({ ...prev, fullName: true }))
                  }}
                  onBlur={() => handleBlur('fullName')}
                  placeholder="John Doe"
                  required
                  className={`input-field pl-11 pr-10 ${
                    touched.fullName
                      ? isFullNameValid
                        ? 'input-field-valid'
                        : 'input-field-invalid'
                      : ''
                  }`}
                />
                {touched.fullName && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    {isFullNameValid ? (
                      <Check className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <X className="w-5 h-5 text-rose-400" />
                    )}
                  </div>
                )}
              </div>
              {fullNameError && (
                <p className="mt-1.5 text-xs text-rose-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {fullNameError}
                </p>
              )}
            </div>

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
              <label className="block text-sm font-medium text-gray-300 mb-2" htmlFor="password">
                Password
              </label>
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
                  placeholder="SmartDocs@123"
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

              {/* Password Requirement Checklist */}
              <div className="mt-3 p-3 bg-white/5 border border-white/10 rounded-xl text-xs space-y-1.5 text-gray-400">
                <p className="font-medium text-gray-300 mb-1">Password must contain at least:</p>
                <div className="grid grid-cols-2 gap-1.5">
                  <div className={`flex items-center gap-1.5 ${pwdReqs.length ? 'text-emerald-400' : 'text-gray-400'}`}>
                    {pwdReqs.length ? <Check className="w-3.5 h-3.5" /> : <span className="w-3.5 h-3.5 inline-block text-center">•</span>}
                    <span>8 to 64 characters</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${pwdReqs.upper ? 'text-emerald-400' : 'text-gray-400'}`}>
                    {pwdReqs.upper ? <Check className="w-3.5 h-3.5" /> : <span className="w-3.5 h-3.5 inline-block text-center">•</span>}
                    <span>One uppercase letter</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${pwdReqs.lower ? 'text-emerald-400' : 'text-gray-400'}`}>
                    {pwdReqs.lower ? <Check className="w-3.5 h-3.5" /> : <span className="w-3.5 h-3.5 inline-block text-center">•</span>}
                    <span>One lowercase letter</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${pwdReqs.number ? 'text-emerald-400' : 'text-gray-400'}`}>
                    {pwdReqs.number ? <Check className="w-3.5 h-3.5" /> : <span className="w-3.5 h-3.5 inline-block text-center">•</span>}
                    <span>One number</span>
                  </div>
                  <div className={`flex items-center gap-1.5 col-span-2 ${pwdReqs.special ? 'text-emerald-400' : 'text-gray-400'}`}>
                    {pwdReqs.special ? <Check className="w-3.5 h-3.5" /> : <span className="w-3.5 h-3.5 inline-block text-center">•</span>}
                    <span>One special character (@!#$%^&*)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Confirm Password Field */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2" htmlFor="confirmPassword">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  ref={confirmPasswordRef}
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value)
                    if (!touched.confirmPassword) setTouched((prev) => ({ ...prev, confirmPassword: true }))
                  }}
                  onBlur={() => handleBlur('confirmPassword')}
                  placeholder="SmartDocs@123"
                  required
                  className={`input-field pl-11 pr-20 ${
                    touched.confirmPassword
                      ? isConfirmPasswordValid
                        ? 'input-field-valid'
                        : 'input-field-invalid'
                      : ''
                  }`}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    tabIndex={-1}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    className="text-gray-400 hover:text-white transition-colors focus:outline-none p-1 rounded-md hover:bg-white/10"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  {touched.confirmPassword && (
                    <div className="pointer-events-none">
                      {isConfirmPasswordValid ? (
                        <Check className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <X className="w-5 h-5 text-rose-400" />
                      )}
                    </div>
                  )}
                </div>
              </div>
              {confirmPasswordError && (
                <p className="mt-1.5 text-xs text-rose-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {confirmPasswordError}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !isFormValid}
              className="btn-primary w-full flex items-center justify-center gap-2 mt-6"
              id="register-submit"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Create Account
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Login Link */}
          <p className="text-center text-sm text-gray-400 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
