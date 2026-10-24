import React, { useState } from 'react';
import { AuthLayout } from './AuthLayout';
import { loginAccount } from '../../services/api';
import type { UserProfile, AuthPageView } from '../../types';
import { Mail, Lock, Eye, EyeOff, LogIn, AlertCircle, Sparkles, ArrowRight } from 'lucide-react';

interface LoginPageProps {
  currentLanguage: string;
  onLanguageChange: (lang: string) => void;
  onLoginSuccess: (user: UserProfile) => void;
  onNavigateAuth: (view: AuthPageView) => void;
  onContinueAsGuest?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  currentLanguage,
  onLanguageChange,
  onLoginSuccess,
  onNavigateAuth,
  onContinueAsGuest,
}) => {
  const isHindi = currentLanguage === 'hi';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError(isHindi ? 'कृपया एक मान्य ईमेल पता दर्ज करें।' : 'Please enter a valid email address.');
      return;
    }
    if (!password) {
      setError(isHindi ? 'कृपया अपना पासवर्ड दर्ज करें।' : 'Please enter your password.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await loginAccount({
        email: cleanEmail,
        password,
        rememberMe,
      });

      if (res.user) {
        onLoginSuccess(res.user);
      } else {
        // Fallback user object if backend returned user inside response
        onLoginSuccess({
          id: 'user_active',
          email: cleanEmail,
          name: cleanEmail.split('@')[0],
          is_verified: true,
          created_at: new Date().toISOString(),
        });
      }
    } catch (err: any) {
      setError(
        err.message ||
          (isHindi
            ? 'ईमेल या पासवर्ड अमान्य है। कृपया पुनः प्रयास करें।'
            : 'Invalid email or password. Please try again.')
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title={isHindi ? 'नागरिक पोर्टल में प्रवेश करें' : 'Sign in to SuchnaSetu AI'}
      subtitle={
        isHindi
          ? 'सरकारी सूचनाओं, परिपत्रों और छात्रवृत्ति अधिसूचनाओं की साक्ष्य-आधारित कार्य योजना तक पहुंचें।'
          : 'Access source-grounded notice intelligence, plain-language summaries, and actionable checklists.'
      }
      currentLanguage={currentLanguage}
      onLanguageChange={onLanguageChange}
    >
      <form onSubmit={handleSubmit} className="auth-form" noValidate>
        {error && (
          <div className="auth-error-banner" role="alert">
            <AlertCircle size={16} className="error-icon" />
            <div className="error-text">{error}</div>
          </div>
        )}

        {/* Email Field */}
        <div className="form-group">
          <label htmlFor="login-email" className="form-label">
            {isHindi ? 'ईमेल पता' : 'Email Address'}
          </label>
          <div className="input-with-icon">
            <Mail size={16} className="input-icon" />
            <input
              id="login-email"
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="citizen@example.gov.in"
              autoComplete="email"
              required
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Password Field */}
        <div className="form-group">
          <div className="form-label-row">
            <label htmlFor="login-password" className="form-label">
              {isHindi ? 'पासवर्ड' : 'Password'}
            </label>
            <button
              type="button"
              className="btn-text-link"
              onClick={() => onNavigateAuth('forgot_password')}
            >
              {isHindi ? 'पासवर्ड भूल गए?' : 'Forgot password?'}
            </button>
          </div>
          <div className="input-with-icon">
            <Lock size={16} className="input-icon" />
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              className="form-input pr-10"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              autoComplete="current-password"
              required
              disabled={isLoading}
            />
            <button
              type="button"
              className="password-toggle-btn"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* Remember Me Checkbox */}
        <div className="form-options-row">
          <label className="checkbox-label">
            <input
              type="checkbox"
              className="form-checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              disabled={isLoading}
            />
            <span>{isHindi ? 'मुझे इस डिवाइस पर याद रखें' : 'Remember me on this device'}</span>
          </label>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="btn-auth-primary"
          disabled={isLoading}
        >
          {isLoading ? (
            <span className="btn-loading-content">
              <span className="btn-spinner" />
              <span>{isHindi ? 'प्रवेश हो रहा है...' : 'Signing in...'}</span>
            </span>
          ) : (
            <>
              <LogIn size={16} />
              <span>{isHindi ? 'प्रवेश करें' : 'Sign In'}</span>
            </>
          )}
        </button>

        {/* Divider */}
        <div className="auth-divider">
          <span>{isHindi ? 'या' : 'OR'}</span>
        </div>

        {/* Sign Up Link */}
        <div className="auth-alternate-action">
          <span>{isHindi ? 'नया खाता बनाना चाहते हैं?' : "Don't have an account?"}</span>
          <button
            type="button"
            className="btn-text-link font-semibold"
            onClick={() => onNavigateAuth('signup')}
          >
            {isHindi ? 'खाता बनाएं' : 'Create an Account'}
          </button>
        </div>

        {/* Continue as Demo / Guest Button */}
        {onContinueAsGuest && (
          <div className="auth-guest-option">
            <button
              type="button"
              className="btn-auth-secondary"
              onClick={onContinueAsGuest}
            >
              <Sparkles size={14} className="text-emerald-600" />
              <span>{isHindi ? 'अतिथि के रूप में डेमो देखें' : 'Explore Public Demo Library'}</span>
              <ArrowRight size={14} />
            </button>
          </div>
        )}
      </form>
    </AuthLayout>
  );
};
