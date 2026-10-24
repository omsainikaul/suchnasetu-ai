import React, { useState } from 'react';
import { AuthLayout } from './AuthLayout';
import { completePasswordReset } from '../../services/api';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Mail, KeyRound, LogIn } from 'lucide-react';

interface ResetPasswordPageProps {
  currentLanguage: string;
  onLanguageChange: (lang: string) => void;
  onResetSuccess: () => void;
  onNavigateLogin: () => void;
}

export const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({
  currentLanguage,
  onLanguageChange,
  onResetSuccess,
  onNavigateLogin,
}) => {
  const isHindi = currentLanguage === 'hi';

  const [token] = useState<string | null>(() => {
    try {
      return new URLSearchParams(window.location.search).get('token');
    } catch {
      return null;
    }
  });
  const [email, setEmail] = useState<string>(() => {
    try {
      return new URLSearchParams(window.location.search).get('email') || '';
    } catch {
      return '';
    }
  });
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate inputs
    if (!token) {
      if (!email.trim() || !email.includes('@')) {
        setError(isHindi ? 'कृपया एक मान्य ईमेल पता दर्ज करें।' : 'Please enter a valid email address.');
        return;
      }
      if (code.trim().length !== 6) {
        setError(isHindi ? 'कृपया 6-अंकीय सत्यापन कोड दर्ज करें।' : 'Please enter the 6-digit recovery code.');
        return;
      }
    }

    if (newPassword.length < 8) {
      setError(isHindi ? 'पासवर्ड कम से कम 8 वर्णों का होना चाहिए।' : 'New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(isHindi ? 'पासवर्ड और पुष्टिकरण पासवर्ड मेल नहीं खाते।' : 'Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      await completePasswordReset({
        token: token || undefined,
        email: email.trim() || undefined,
        code: code.trim() || undefined,
        newPassword,
        confirmPassword,
      });
      setIsSuccess(true);
    } catch (err: any) {
      setError(
        err.message ||
          (isHindi
            ? 'पासवर्ड रीसेट करने में विफल। लिंक या कोड अमान्य अथवा समाप्त हो सकता है।'
            : 'Password reset failed. The link or code may be invalid or expired.')
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title={isHindi ? 'नया पासवर्ड सेट करें' : 'Set New Password'}
      subtitle={
        isHindi
          ? 'अपने खाते के लिए एक मजबूत और सुरक्षित नया पासवर्ड चुनें।'
          : 'Choose a strong, secure passphrase for your citizen account.'
      }
      currentLanguage={currentLanguage}
      onLanguageChange={onLanguageChange}
    >
      {isSuccess ? (
        <div className="auth-success-state">
          <div className="auth-success-icon-badge">
            <CheckCircle2 size={40} className="text-emerald-600" />
          </div>
          <h2 className="auth-success-title">
            {isHindi ? 'पासवर्ड सफलतापूर्वक बदला गया!' : 'Password Reset Successfully!'}
          </h2>
          <p className="auth-success-text">
            {isHindi
              ? 'आपका पासवर्ड सफलतापूर्वक अपडेट कर दिया गया है। सुरक्षा कारणों से अन्य सभी सक्रिय सत्र साइन आउट कर दिए गए हैं। अब आप अपने नए पासवर्ड से प्रवेश कर सकते हैं।'
              : 'Your password has been securely updated. All existing sessions have been signed out for security. You can now sign in with your new password.'}
          </p>
          <div className="auth-success-actions">
            <button
              type="button"
              className="btn-auth-primary"
              onClick={onResetSuccess}
            >
              <LogIn size={16} />
              <span>{isHindi ? 'नए पासवर्ड से साइन इन करें' : 'Sign In with New Password'}</span>
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          {error && (
            <div className="auth-error-banner" role="alert">
              <AlertCircle size={16} className="error-icon" />
              <div className="error-text">{error}</div>
            </div>
          )}

          {/* If no URL token, collect Email and Code */}
          {!token && (
            <>
              <div className="form-group">
                <label htmlFor="reset-email" className="form-label">
                  {isHindi ? 'पंजीकृत ईमेल पता' : 'Registered Email Address'}
                </label>
                <div className="input-with-icon">
                  <Mail size={16} className="input-icon" />
                  <input
                    id="reset-email"
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

              <div className="form-group">
                <label htmlFor="reset-code" className="form-label">
                  {isHindi ? '6-अंकीय रिकवरी कोड' : '6-Digit Recovery Code'}
                </label>
                <div className="input-with-icon">
                  <KeyRound size={16} className="input-icon" />
                  <input
                    id="reset-code"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    className="form-input text-center font-mono font-bold tracking-widest text-lg"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>
            </>
          )}

          {/* New Password */}
          <div className="form-group">
            <label htmlFor="reset-new-password" className="form-label">
              {isHindi ? 'नया पासवर्ड (कम से कम 8 वर्ण)' : 'New Password (min. 8 characters)'}
            </label>
            <div className="input-with-icon">
              <Lock size={16} className="input-icon" />
              <input
                id="reset-new-password"
                type={showPassword ? 'text' : 'password'}
                className="form-input pr-10"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••••••"
                autoComplete="new-password"
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

          {/* Confirm New Password */}
          <div className="form-group">
            <label htmlFor="reset-confirm-password" className="form-label">
              {isHindi ? 'नए पासवर्ड की पुष्टि करें' : 'Confirm New Password'}
            </label>
            <div className="input-with-icon">
              <Lock size={16} className="input-icon" />
              <input
                id="reset-confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                className="form-input pr-10"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••••••"
                autoComplete="new-password"
                required
                disabled={isLoading}
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
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
                <span>{isHindi ? 'पासवर्ड अपडेट हो रहा है...' : 'Updating password...'}</span>
              </span>
            ) : (
              <>
                <CheckCircle2 size={16} />
                <span>{isHindi ? 'पासवर्ड सहेजें' : 'Save New Password'}</span>
              </>
            )}
          </button>

          {/* Return to Sign in */}
          <div className="auth-alternate-action">
            <button
              type="button"
              className="btn-text-link font-semibold"
              onClick={onNavigateLogin}
            >
              {isHindi ? '← साइन इन पृष्ठ पर लौटें' : '← Return to Sign In'}
            </button>
          </div>
        </form>
      )}
    </AuthLayout>
  );
};
