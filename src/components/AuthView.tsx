import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import {
  Sparkles,
  Shield,
  Lock,
  Mail,
  User,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  ArrowLeft,
} from 'lucide-react';

interface AuthViewProps {
  onOpenResetPassword?: (token?: string) => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ onOpenResetPassword }) => {
  const { login, loginWithGoogle, sendRegistrationOtp, verifyRegistrationOtp, sendForgotPassword } = useAuth();

  // Screen states
  const [isRegister, setIsRegister] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  // OTP Verification state for registration
  const [isAwaitingOtp, setIsAwaitingOtp] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpNotice, setOtpNotice] = useState<string | null>(null);
  const [devOtpCode, setDevOtpCode] = useState<string | null>(null);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);

  // Status & Error
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Google sign-in
  const [googleLoading, setGoogleLoading] = useState(false);
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
  const [googleCustomEmail, setGoogleCustomEmail] = useState('');
  const [googleCustomName, setGoogleCustomName] = useState('');

  // Forgot Password modal
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);
  const [devResetLink, setDevResetLink] = useState<string | null>(null);

  // Handle standard login or initiate registration with OTP
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isRegister) {
      // Registration flow: Send OTP first
      if (!fullName.trim()) {
        setError('Please enter your full name.');
        return;
      }
      if (password.length < 8) {
        setError('Password must be at least 8 characters long.');
        return;
      }
      if (!email.trim() || !email.includes('@')) {
        setError('Please enter a valid email address.');
        return;
      }

      try {
        setLoading(true);
        const result = await sendRegistrationOtp(email.trim(), password, fullName.trim());
        setIsAwaitingOtp(true);
        setOtpNotice(result.message);
        if (result.devOtp) {
          setDevOtpCode(result.devOtp);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to dispatch verification code. Please verify your email address.');
      } finally {
        setLoading(false);
      }
    } else {
      // Direct sign-in flow
      try {
        setLoading(true);
        await login(email.trim(), password);
      } catch (err: any) {
        setError(err.message || 'Invalid email or password.');
      } finally {
        setLoading(false);
      }
    }
  };

  // Handle OTP confirmation during registration
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim()) {
      setError('Please enter the 6-digit confirmation code.');
      return;
    }

    try {
      setOtpVerifying(true);
      setError(null);
      await verifyRegistrationOtp(email.trim(), otpCode.trim());
    } catch (err: any) {
      setError(err.message || 'Invalid or expired confirmation code.');
    } finally {
      setOtpVerifying(false);
    }
  };

  // Resend OTP code
  const handleResendOtp = async () => {
    try {
      setOtpSending(true);
      setError(null);
      const res = await sendRegistrationOtp(email.trim(), password, fullName.trim());
      setOtpNotice(res.message);
      if (res.devOtp) {
        setDevOtpCode(res.devOtp);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to resend confirmation code.');
    } finally {
      setOtpSending(false);
    }
  };

  // Google sign in execution (OTP NOT required for Google sign in as requested)
  const handleExecuteGoogleSignIn = async (emailToUse: string, nameToUse?: string) => {
    try {
      setGoogleLoading(true);
      setError(null);
      await loginWithGoogle({ email: emailToUse, name: nameToUse || emailToUse.split('@')[0] });
      setIsGoogleModalOpen(false);
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed');
    } finally {
      setGoogleLoading(false);
    }
  };

  // Handle Forgot Password submission
  const handleSendForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      setError('Please enter your account email.');
      return;
    }

    try {
      setForgotLoading(true);
      setError(null);
      const res = await sendForgotPassword(forgotEmail.trim());
      setForgotSuccess(res.message);
      if (res.devResetLink) {
        setDevResetLink(res.devResetLink);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send reset link.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 text-slate-100">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 shadow-xl shadow-indigo-600/30 mb-4">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-indigo-200">
            NUDGE
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-2 font-medium tracking-wide">
            Keep Moving forward
          </p>
        </div>

        {/* Main Card */}
        <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl">
          {/* STEP 2: REGISTRATION OTP CONFIRMATION SCREEN */}
          {isRegister && isAwaitingOtp ? (
            <div>
              <div className="mb-6 text-center sm:text-left">
                <div className="inline-flex items-center space-x-2 text-xs font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2.5 py-1 rounded-full mb-3">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Email Verification Required</span>
                </div>
                <h2 className="text-xl font-bold text-white tracking-tight">Confirm Verification Code</h2>
                <p className="text-xs text-slate-400 mt-1">
                  We sent a 6-digit confirmation code to{' '}
                  <strong className="text-slate-200 font-semibold">{email}</strong> to avoid suspicious accounts.
                </p>
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-200 text-xs flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {otpNotice && (
                <div className="mb-4 p-3 rounded-xl bg-indigo-950/50 border border-indigo-800/70 text-indigo-300 text-xs flex items-start space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span>{otpNotice}</span>
                    {devOtpCode && (
                      <div className="mt-2 pt-2 border-t border-indigo-800/60 flex items-center justify-between font-mono text-[11px] text-indigo-200">
                        <span>Your 6-digit code:</span>
                        <span className="font-bold text-base tracking-widest bg-indigo-900/80 px-2 py-0.5 rounded text-white border border-indigo-700">
                          {devOtpCode}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    6-Digit Verification Code
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="123456"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full text-center tracking-[0.5em] text-xl font-mono font-bold py-3 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-600"
                  />
                  <span className="text-[11px] text-slate-500 mt-1.5 block text-center">
                    Enter the code received in your inbox or spam folder
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={otpVerifying || otpCode.length < 6}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs sm:text-sm transition flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/30 cursor-pointer active:scale-[0.99]"
                >
                  {otpVerifying ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span>Confirm & Activate Account</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-5 flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsAwaitingOtp(false);
                    setError(null);
                  }}
                  className="text-slate-400 hover:text-slate-200 transition inline-flex items-center space-x-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Change Details</span>
                </button>

                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={otpSending}
                  className="text-indigo-400 hover:text-indigo-300 font-medium transition inline-flex items-center space-x-1 disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${otpSending ? 'animate-spin' : ''}`} />
                  <span>Resend Code</span>
                </button>
              </div>
            </div>
          ) : (
            /* STANDARD SIGN IN OR REGISTRATION FORM */
            <div>
              {/* Screen Title */}
              <div className="mb-6 text-center sm:text-left">
                <h2 className="text-xl font-bold text-white tracking-tight">
                  {isRegister ? 'Create your account' : 'Sign in to your account'}
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  {isRegister
                    ? 'All standard email providers (Gmail, Outlook, Yahoo, Proton, EDU, etc.) are verified'
                    : 'Enter your credentials to access your daily mastery schedule'}
                </p>
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-200 text-xs flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Main Credentials Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {isRegister && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                      <input
                        type="text"
                        required
                        placeholder="Alex"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      placeholder="user@example.com (or @gmail, @outlook, @yahoo...)"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-300">
                      Password
                    </label>
                    {!isRegister && (
                      <button
                        type="button"
                        onClick={() => {
                          setForgotEmail(email);
                          setForgotSuccess(null);
                          setError(null);
                          setIsForgotOpen(true);
                        }}
                        className="text-[11px] text-indigo-400 hover:text-indigo-300 cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-9 pr-10 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      tabIndex={-1}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      title={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200 focus:text-white transition p-0.5 rounded cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {isRegister && (
                    <span className="text-[11px] text-slate-500 mt-1 block">
                      Must be at least 8 characters. Verified with OTP email.
                    </span>
                  )}
                </div>

                {/* Primary Sign In / Register Action Bar */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs sm:text-sm transition flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/30 mt-6 active:scale-[0.99] cursor-pointer"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span>{isRegister ? 'Continue to Email Verification' : 'Sign In'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Create Account / Sign In small switch text under the sign-in bar */}
              <div className="mt-4 text-center">
                {isRegister ? (
                  <p className="text-xs text-slate-400">
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setIsRegister(false);
                        setIsAwaitingOtp(false);
                        setError(null);
                      }}
                      className="font-medium text-indigo-400 hover:text-indigo-300 transition hover:underline cursor-pointer"
                    >
                      Sign in
                    </button>
                  </p>
                ) : (
                  <p className="text-xs text-slate-400">
                    Don't have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setIsRegister(true);
                        setIsAwaitingOtp(false);
                        setError(null);
                      }}
                      className="font-medium text-indigo-400 hover:text-indigo-300 transition hover:underline cursor-pointer"
                    >
                      Create account
                    </button>
                  </p>
                )}
              </div>

              {/* CONTINUE WITH GOOGLE MOVED DOWN AT THE BOTTOM */}
              <div className="mt-6 pt-5 border-t border-slate-800">
                <div className="relative my-3">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-800/80"></div>
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase tracking-wider">
                    <span className="bg-slate-900 px-3 text-slate-500 font-semibold">Or</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsGoogleModalOpen(true)}
                  disabled={loading || googleLoading}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-800/80 hover:bg-slate-750 border border-slate-700 hover:border-slate-600 text-slate-200 font-semibold text-xs sm:text-sm transition flex items-center justify-center space-x-3 shadow-md hover:text-white group active:scale-[0.99] cursor-pointer"
                >
                  {googleLoading ? (
                    <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <svg className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.14z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.25 21.36 7.33 24 12 24z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.94 0 12s.46 3.84 1.26 5.42l4.02-3.15z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.25 2.64 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                        />
                      </svg>
                      <span>Continue with Google</span>
                    </>
                  )}
                </button>
                <div className="mt-2 text-center">
                  <span className="text-[10px] text-slate-500">
                    Google sign-in is instant (no OTP required)
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Security footnote */}
          <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-center space-x-2 text-[11px] text-slate-500">
            <Shield className="w-3.5 h-3.5 text-indigo-400" />
            <span>Strict server-side isolation • HttpOnly sessions</span>
          </div>
        </div>

        {/* Google Sign-In Account Selector Modal */}
        {isGoogleModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-sm p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl">
              <div className="flex items-center space-x-3 mb-3">
                <div className="p-2 bg-slate-800 rounded-xl">
                  <svg className="w-6 h-6" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.14z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.25 21.36 7.33 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.94 0 12s.46 3.84 1.26 5.42l4.02-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.25 2.64 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Sign in with Google</h3>
                  <p className="text-xs text-slate-400">Choose an account to continue</p>
                </div>
              </div>

              {/* Quick 1-Click Profile Selection */}
              <div className="space-y-2 mt-4">
                <button
                  type="button"
                  onClick={() => handleExecuteGoogleSignIn('alex@gmail.com', 'Alex')}
                  disabled={googleLoading}
                  className="w-full p-3 rounded-xl bg-slate-800/80 hover:bg-slate-750 border border-slate-700 text-left flex items-center space-x-3 transition hover:border-indigo-500/60 group cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center font-bold text-white text-sm shrink-0">
                    A
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white group-hover:text-indigo-300 transition">Alex</p>
                    <p className="text-[11px] text-slate-400 truncate">alex@gmail.com</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white transition shrink-0" />
                </button>

                {email && email.includes('@') && (
                  <button
                    type="button"
                    onClick={() => handleExecuteGoogleSignIn(email, fullName || 'Google User')}
                    disabled={googleLoading}
                    className="w-full p-3 rounded-xl bg-slate-800/80 hover:bg-slate-750 border border-slate-700 text-left flex items-center space-x-3 transition hover:border-indigo-500/60 group cursor-pointer"
                  >
                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center font-bold text-white text-sm shrink-0">
                      {(fullName || email)[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white group-hover:text-emerald-300 transition">
                        {fullName || 'Entered Account'}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">{email}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white transition shrink-0" />
                  </button>
                )}
              </div>

              {/* Or enter custom Google account */}
              <div className="mt-4 pt-4 border-t border-slate-800">
                <p className="text-xs font-medium text-slate-300 mb-2">Or enter another Google account:</p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!googleCustomEmail.trim()) return;
                    handleExecuteGoogleSignIn(googleCustomEmail.trim(), googleCustomName.trim() || undefined);
                  }}
                  className="space-y-2.5"
                >
                  <input
                    type="email"
                    required
                    placeholder="your-google-account@gmail.com"
                    value={googleCustomEmail}
                    onChange={(e) => setGoogleCustomEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <input
                    type="text"
                    placeholder="Your Name (e.g. Alex)"
                    value={googleCustomName}
                    onChange={(e) => setGoogleCustomName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />

                  <div className="flex justify-end space-x-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsGoogleModalOpen(false)}
                      className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={googleLoading || !googleCustomEmail.trim()}
                      className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer"
                    >
                      {googleLoading ? (
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <span>Sign In</span>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* FORGOT PASSWORD MODAL WITH EMAIL DISPATCH */}
        {isForgotOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-sm p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl">
              <h3 className="font-bold text-white text-base">Account Recovery</h3>
              <p className="text-xs text-slate-400 mt-1">
                Enter your account email to receive a dedicated link for resetting your password.
              </p>

              {error && (
                <div className="mt-3 p-3 rounded-lg bg-rose-950/70 border border-rose-800 text-rose-200 text-xs flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {forgotSuccess ? (
                <div className="mt-4 space-y-3">
                  <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-800 text-emerald-300 text-xs">
                    <div className="flex items-center space-x-1.5 font-semibold text-white mb-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Reset Link Dispatched</span>
                    </div>
                    {forgotSuccess}
                  </div>

                  {devResetLink && (
                    <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-800/60 text-xs text-indigo-300">
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-indigo-400 mb-1">
                        Dedicated Reset Link
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setIsForgotOpen(false);
                          if (onOpenResetPassword) {
                            const url = new URL(devResetLink, window.location.origin);
                            const tokenParam = url.searchParams.get('resetToken') || url.searchParams.get('token');
                            onOpenResetPassword(tokenParam || undefined);
                          } else {
                            window.location.href = devResetLink;
                          }
                        }}
                        className="w-full mt-2 py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center space-x-1.5 cursor-pointer shadow"
                      >
                        <span>Open Reset Password Page</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => setIsForgotOpen(false)}
                      className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSendForgotPassword} className="mt-4 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="account@domain.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="flex justify-end space-x-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsForgotOpen(false)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={forgotLoading}
                      className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer"
                    >
                      {forgotLoading ? (
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <span>Send Reset Link</span>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
