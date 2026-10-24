import React, { useState } from 'react';
import { AuthLayout } from './AuthLayout';
import { requestPasswordReset } from '../../services/api';
import type { AuthPageView } from '../../types';
import { Mail, Send, Link2, KeyRound, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';

interface ForgotPasswordPageProps {
  currentLanguage: string;
  onLanguageChange: (lang: string) => void;
  onNavigateAuth: (view: AuthPageView) => void;
}

export const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({
  currentLanguage,
  onLanguageChange,
  onNavigateAuth,
}) => {
  const isHindi = currentLanguage === 'hi';

  const [email, setEmail] = useState('');
  const [method, setMethod] = useState<'link' | 'code'>('link');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError(isHindi ? 'कृपया एक मान्य ईमेल पता दर्ज करें।' : 'Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    try {
      await requestPasswordReset({
        email: cleanEmail,
        method,
      });
      setIsSubmitted(true);
    } catch (err: any) {
      setError(
        err.message ||
          (isHindi
            ? 'अनुरोध संसाधित करने में विफल। कृपया पुनः प्रयास करें।'
            : 'Failed to process request. Please try again.')
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title={isHindi ? 'पासवर्ड पुनर्प्राप्ति' : 'Recover Password'}
      subtitle={
        isHindi
          ? 'अपना पंजीकृत ईमेल दर्ज करें और पुनर्प्राप्ति विधि चुनें।'
          : 'Enter your registered email address and select your recovery method.'
      }
      currentLanguage={currentLanguage}
      onLanguageChange={onLanguageChange}
    >
      {isSubmitted ? (
        <div className="auth-success-state">
          <div className="auth-success-icon-badge">
            <CheckCircle2 size={36} className="text-emerald-600" />
          </div>
          <h2 className="auth-success-title">
            {isHindi ? 'निर्देश भेजे गए' : 'Instructions Dispatched'}
          </h2>
          <p className="auth-success-text">
            {isHindi
              ? 'यदि इस ईमेल पते के लिए कोई खाता मौजूद है, तो आपका पासवर्ड रीसेट करने के निर्देश शीघ्र ही भेजे जाएंगे।'
              : 'If an account exists for this email address, instructions to reset your password will be sent shortly.'}
          </p>
          <div className="auth-success-notice">
            <p>
              {method === 'code'
                ? isHindi
                  ? `हमने ${email} पर 6-अंकीय कोड भेजा है। नया पासवर्ड सेट करने के लिए नीचे दिए गए बटन पर क्लिक करें।`
                  : `A 6-digit recovery code was sent to ${email}. Click below to enter your code and set a new password.`
                : isHindi
                  ? `हमने ${email} पर एक एकल-उपयोग पासवर्ड रीसेट लिंक भेजा है। यह लिंक 15 मिनट में समाप्त हो जाएगा।`
                  : `A single-use password reset link was sent to ${email}. The link expires in 15 minutes.`}
            </p>
          </div>
          <div className="auth-success-actions">
            {method === 'code' ? (
              <button
                type="button"
                className="btn-auth-primary"
                onClick={() => onNavigateAuth('reset_password')}
              >
                <span>{isHindi ? 'रिकवरी कोड दर्ज करें' : 'Enter Recovery Code'}</span>
                <ArrowRight size={16} />
              </button>
            ) : null}
            <button
              type="button"
              className="btn-auth-secondary"
              onClick={() => onNavigateAuth('login')}
            >
              {isHindi ? 'साइन इन पृष्ठ पर लौटें' : 'Return to Sign In'}
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

          {/* Email Address */}
          <div className="form-group">
            <label htmlFor="forgot-email" className="form-label">
              {isHindi ? 'पंजीकृत ईमेल पता' : 'Registered Email Address'}
            </label>
            <div className="input-with-icon">
              <Mail size={16} className="input-icon" />
              <input
                id="forgot-email"
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

          {/* Recovery Method Selection */}
          <div className="form-group">
            <label className="form-label">
              {isHindi ? 'पुनर्प्राप्ति विधि चुनें' : 'Select Recovery Method'}
            </label>
            <div className="recovery-method-cards">
              <label
                className={`recovery-method-card ${method === 'link' ? 'selected' : ''}`}
              >
                <input
                  type="radio"
                  name="recoveryMethod"
                  value="link"
                  checked={method === 'link'}
                  onChange={() => setMethod('link')}
                  disabled={isLoading}
                  className="sr-only"
                />
                <div className="recovery-method-icon">
                  <Link2 size={18} />
                </div>
                <div className="recovery-method-text">
                  <div className="recovery-method-title">
                    {isHindi ? 'रीसेट लिंक भेजें' : 'Send Reset Link'}
                  </div>
                  <div className="recovery-method-desc">
                    {isHindi
                      ? 'अपने इनबॉक्स में 1-क्लिक सुरक्षित पासवर्ड रीसेट लिंक प्राप्त करें'
                      : 'Receive a secure 1-click password reset link in your inbox'}
                  </div>
                </div>
              </label>

              <label
                className={`recovery-method-card ${method === 'code' ? 'selected' : ''}`}
              >
                <input
                  type="radio"
                  name="recoveryMethod"
                  value="code"
                  checked={method === 'code'}
                  onChange={() => setMethod('code')}
                  disabled={isLoading}
                  className="sr-only"
                />
                <div className="recovery-method-icon">
                  <KeyRound size={18} />
                </div>
                <div className="recovery-method-text">
                  <div className="recovery-method-title">
                    {isHindi ? '6-अंकीय कोड भेजें' : 'Send 6-Digit Code'}
                  </div>
                  <div className="recovery-method-desc">
                    {isHindi
                      ? 'स्क्रीन पर तुरंत दर्ज करने के लिए एक-बार का कोड प्राप्त करें'
                      : 'Receive a one-time code to enter directly on the screen'}
                  </div>
                </div>
              </label>
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
                <span>{isHindi ? 'अनुरोध भेजा जा रहा है...' : 'Sending instructions...'}</span>
              </span>
            ) : (
              <>
                <Send size={16} />
                <span>
                  {method === 'link'
                    ? isHindi
                      ? 'रीसेट लिंक भेजें'
                      : 'Send Reset Link'
                    : isHindi
                      ? 'रिकवरी कोड भेजें'
                      : 'Send Recovery Code'}
                </span>
              </>
            )}
          </button>

          {/* Return to Sign in */}
          <div className="auth-alternate-action">
            <button
              type="button"
              className="btn-text-link font-semibold"
              onClick={() => onNavigateAuth('login')}
            >
              {isHindi ? '← साइन इन पृष्ठ पर लौटें' : '← Return to Sign In'}
            </button>
          </div>
        </form>
      )}
    </AuthLayout>
  );
};
