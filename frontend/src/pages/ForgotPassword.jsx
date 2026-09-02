/**
 * ForgotPassword Page — SmartDocs AI
 * 2-Step interactive password recovery and reset flow:
 * Step 1: Enter registered email to generate reset token.
 * Step 2: Set new password with real-time security requirements and confirm validation.
 */

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, ArrowRight, CheckCircle, AlertCircle, Check, X, Eye, EyeOff, KeyRound } from 'lucide-react'
import api from '../api'

const validateEmail = (emailStr) => {
  if (!emailStr || emailStr.length === 0) return 'Enter a valid email address.'
  const trimmed = emailStr.trim()
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

export default function ForgotPassword() {
  const [step, setStep] = useState(1) // 1 = Enter Email, 2 = Set New Password, 3 = Success
  const [email, setEmail] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [touched, setTouched] = useState({
    email: false,
    newPassword: false,
    confirmPassword: false
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const emailError = touched.email ? validateEmail(email) : ''
  const isEmailValid = validateEmail(email) === ''

  const reqs = getPasswordRequirements(newPassword)
  const isPasswordValid = reqs.length && reqs.upper && reqs.lower && reqs.number && reqs.special
  const isConfirmValid = confirmPassword.length > 0 && confirmPassword === newPassword

  // Step 1: Request Token
  const handleRequestToken = async (e) => {
    e.preventDefault()
    setError('')
    setTouched((prev) => ({ ...prev, email: true }))

    if (!isEmailValid) return

    setLoading(true)
    try {
      const res = await api.post('/forgot-password', { email: email.trim().toLowerCase() })
      setResetToken(res.data.reset_token)
      setSuccessMsg('Verification token generated! Please set your new password.')
      setStep(2)
    } catch (err) {
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Could not find an account with this email.')
    } finally {
      setLoading(false)
    }
  }

  // Step 2: Reset Password
  const handleResetPassword = async (e) => {
    e.preventDefault()
    setError('')
    setTouched({ email: true, newPassword: true, confirmPassword: true })

    if (!isPasswordValid || !isConfirmValid || !resetToken) {
      if (!isConfirmValid && confirmPassword) {
        setError('Passwords do not match.')
      }
      return
    }

    setLoading(true)
    try {
      await api.post('/reset-password', {
        token: resetToken,
        new_password: newPassword
      })
      setStep(3)
    } catch (err) {
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Failed to reset password. Token may have expired.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-surface-950 via-surface-900 to-surface-950 relative overflow-hidden">
      {/* Background glow elements */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 animate-fade-in">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary-500/20 to-purple-500/20 border border-primary-500/30 rounded-2xl mb-4 shadow-lg shadow-primary-500/10 animate-float">
            <KeyRound className="w-8 h-8 text-primary-400" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {step === 1 && 'Forgot Password?'}
            {step === 2 && 'Reset Password'}
            {step === 3 && 'Password Changed!'}
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            {step === 1 && 'Enter your registered email to reset your credentials'}
            {step === 2 && `Setting new password for ${email}`}
            {step === 3 && 'Your password has been successfully updated'}
          </p>
        </div>

        {/* Card Container */}
        <div className="glass-card p-8 shadow-2xl border border-white/10">
          {error && (
            <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-sm text-rose-400 flex items-center gap-3 animate-shake">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && step === 2 && (
            <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-400 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* STEP 1: Enter Email */}
          {step === 1 && (
            <form onSubmit={handleRequestToken} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2" htmlFor="forgot-email">
                  Registered Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    id="forgot-email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      if (!touched.email) setTouched((prev) => ({ ...prev, email: true }))
                    }}
                    onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
                    placeholder="you@example.com"
                    required
                    className={`input-field pl-11 pr-10 ${
                      touched.email ? (isEmailValid ? 'input-field-valid' : 'input-field-invalid') : ''
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

              <button
                type="submit"
                disabled={loading || !isEmailValid}
                className="btn-primary w-full flex items-center justify-center gap-2 mt-6"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Continue
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* STEP 2: New Password */}
          {step === 2 && (
            <form onSubmit={handleResetPassword} className="space-y-5">
              {/* New Password */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2" htmlFor="new-password">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    id="new-password"
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value)
                      if (!touched.newPassword) setTouched((prev) => ({ ...prev, newPassword: true }))
                    }}
                    placeholder="••••••••"
                    required
                    className="input-field pl-11 pr-20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-1"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password Requirements List */}
                <div className="mt-3 p-3 bg-surface-900/60 rounded-xl border border-white/5 space-y-1.5 text-xs text-gray-400">
                  <div className="flex items-center gap-2">
                    {reqs.length ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <X className="w-3.5 h-3.5 text-gray-500" />}
                    <span className={reqs.length ? 'text-emerald-300' : ''}>8–64 characters</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {reqs.upper && reqs.lower ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <X className="w-3.5 h-3.5 text-gray-500" />}
                    <span className={reqs.upper && reqs.lower ? 'text-emerald-300' : ''}>Uppercase & Lowercase letters</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {reqs.number ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <X className="w-3.5 h-3.5 text-gray-500" />}
                    <span className={reqs.number ? 'text-emerald-300' : ''}>At least 1 number (0-9)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {reqs.special ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <X className="w-3.5 h-3.5 text-gray-500" />}
                    <span className={reqs.special ? 'text-emerald-300' : ''}>At least 1 special character (!@#$%^&*)</span>
                  </div>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2" htmlFor="confirm-new-password">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    id="confirm-new-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value)
                      if (!touched.confirmPassword) setTouched((prev) => ({ ...prev, confirmPassword: true }))
                    }}
                    placeholder="••••••••"
                    required
                    className="input-field pl-11 pr-20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-1"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {touched.confirmPassword && !isConfirmValid && confirmPassword && (
                  <p className="mt-1.5 text-xs text-rose-400 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Passwords do not match
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !isPasswordValid || !isConfirmValid}
                className="btn-primary w-full flex items-center justify-center gap-2 mt-6"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Reset Password
                    <Check className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* STEP 3: Success Screen */}
          {step === 3 && (
            <div className="text-center space-y-6 py-4">
              <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500/30 rounded-2xl mx-auto flex items-center justify-center text-emerald-400 shadow-lg">
                <CheckCircle className="w-10 h-10" />
              </div>
              <p className="text-sm text-gray-300">
                Your password has been updated securely. You can now sign in with your new password.
              </p>
              <Link
                to="/login"
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                Go to Sign In
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}

          {/* Return to Login link */}
          {step !== 3 && (
            <div className="mt-6 text-center">
              <Link
                to="/login"
                className="text-xs text-gray-400 hover:text-white transition-colors"
              >
                ← Back to Sign In
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
