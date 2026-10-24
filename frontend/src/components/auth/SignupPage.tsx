import React, { useState } from 'react';
import { AuthLayout } from './AuthLayout';
import { registerAccount } from '../../services/api';
import type { AuthPageView } from '../../types';
import { User, Mail, Lock, Eye, EyeOff, UserPlus, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';

interface SignupPageProps {
  currentLanguage: string;
  onLanguageChange: (lang: string) => void;
  onNavigateAuth: (view: AuthPageView, state?: { email?: string }) => void;
}

export const SignupPage: React.FC<SignupPageProps> = ({
  currentLanguage,
  onLanguageChange,
  onNavigateAuth,
}) => {
  const isHindi = currentLanguage === 'hi';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [emailDelivered, setEmailDelivered] = useState<boolean>(true);
  const [alreadyVerified, setAlreadyVerified] = useState<boolean>(false);
  const [submittedEmail, setSubmittedEmail] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName || cleanName.length < 2) {
      setError(isHindi ? 'कृपया अपना पूरा नाम दर्ज करें (कम से कम 2 अक्षर)।' : 'Please enter your full name (minimum 2 characters).');
      return;
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError(isHindi ? 'कृपया एक मान्य ईमेल पता दर्ज करें।' : 'Please enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      setError(isHindi ? 'पासवर्ड कम से कम 8 वर्णों का होना चाहिए।' : 'Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError(isHindi ? 'पासवर्ड और पुष्टिकरण पासवर्ड मेल नहीं खाते।' : 'Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await registerAccount({
        name: cleanName,
        email: cleanEmail,
        password,
        confirmPassword,
      });

      setSubmittedEmail(cleanEmail);
      try {
        sessionStorage.setItem('suchnasetu_pending_verification_email', cleanEmail);
      } catch {}

      const isAlready = !!res.already_verified;
      setAlreadyVerified(isAlready);
      const isDelivered = res.email_delivered !== false && !isAlready;
      setEmailDelivered(isDelivered);

      setSuccessMessage(
        res.message ||
          (isAlready
            ? isHindi
              ? 'खाता पहले से सक्रिय और सत्यापित है। कृपया सीधे लॉगिन करें।'
              : 'Account is already verified and active. Please sign in directly.'
            : isDelivered
              ? isHindi
                ? 'आपका खाता सफलतापूर्वक बनाया गया! सत्यापन लिंक के लिए कृपया अपना ईमेल इनबॉक्स जांचें।'
                : 'Your account was created successfully! Please check your email for the verification link.'
              : isHindi
                ? 'खाता बनाया गया, लेकिन सत्यापन ईमेल नहीं भेजा जा सका। कृपया सत्यापन पृष्ठ पर पुनः प्रयास करें।'
                : 'Account created, but verification email delivery is pending. Please proceed to verify or retry.')
      );
    } catch (err: any) {
      setError(
        err.message ||
          (isHindi
            ? 'खाता निर्माण में त्रुटि हुई। कृपया पुनः प्रयास करें।'
            : 'Failed to create account. Please try again.')
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title={isHindi ? 'नया नागरिक खाता बनाएं' : 'Create Citizen Account'}
      subtitle={
        isHindi
          ? 'सरकारी अधिसूचनाओं के विश्लेषण और व्यक्तिगत नागरिक चेकलिस्ट के लिए अपना निःशुल्क खाता बनाएं।'
          : 'Create your account to analyze circulars, track eligibility, and generate printable action dossiers.'
      }
      currentLanguage={currentLanguage}
      onLanguageChange={onLanguageChange}
    >
      {successMessage ? (
        <div className="auth-success-state">
          <div className={emailDelivered ? 'auth-success-icon-badge' : 'auth-success-icon-badge warning'}>
            {emailDelivered ? (
              <CheckCircle2 size={36} className="text-emerald-600" />
            ) : (
              <AlertCircle size={36} className="text-amber-600" />
            )}
          </div>
          <h2 className="auth-success-title">
            {alreadyVerified
              ? isHindi
                ? 'खाता पहले से सत्यापित है'
                : 'Account Already Verified'
              : emailDelivered
                ? isHindi
                  ? 'सत्यापन ईमेल भेजा गया'
                  : 'Verification Email Dispatched'
                : isHindi
                  ? 'खाता बनाया गया — ईमेल वितरण लंबित'
                  : 'Account Created — Delivery Pending'}
          </h2>
          <p className="auth-success-text">{successMessage}</p>
          <div className="auth-success-notice">
            <p>
              {alreadyVerified
                ? isHindi
                  ? `ईमेल ${submittedEmail} से संबद्ध खाता पहले से ही सत्यापित है। सत्यापन कोड की आवश्यकता नहीं है, आप सीधे अपने पासवर्ड के साथ लॉगिन कर सकते हैं।`
                  : `An active and verified citizen account already exists for ${submittedEmail}. You do not need to enter a verification code; you can sign in directly.`
                : emailDelivered
                  ? isHindi
                    ? `हमने ${submittedEmail} पर एक सुरक्षित सत्यापन लिंक और 6-अंकीय कोड भेजा है। खाता सक्रिय करने के बाद आप तुरंत प्रवेश कर सकते हैं।`
                    : `We sent a single-use verification link and a 6-digit code to ${submittedEmail}. Once verified, you can sign in immediately.`
                  : isHindi
                    ? `आपका खाता ${submittedEmail} के लिए सुरक्षित रूप से पंजीकृत है। अस्थायी मेल सर्वर समस्या के कारण सत्यापन संदेश तुरंत नहीं भेजा जा सका। कृपया सत्यापन स्क्रीन पर जाएं और 'सत्यापन लिंक पुनः भेजें' पर क्लिक करें।`
                    : `Your citizen account for ${submittedEmail} is safely registered. Due to mail server connectivity, delivery could not be completed immediately. Please proceed to the verification screen and click 'Resend verification email' to retry.`}
            </p>
          </div>
          <div className="auth-success-actions">
            {alreadyVerified ? (
              <button
                type="button"
                className="btn-auth-primary"
                onClick={() => onNavigateAuth('login')}
              >
                <span>{isHindi ? 'सीधे लॉगिन करें' : 'Sign In Directly'}</span>
                <ArrowRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                className="btn-auth-primary"
                onClick={() => onNavigateAuth('verify_email', { email: submittedEmail })}
              >
                <span>{isHindi ? 'सत्यापन कोड दर्ज करें' : 'Enter Verification Code'}</span>
                <ArrowRight size={16} />
              </button>
            )}
            <button
              type="button"
              className="btn-auth-secondary"
              onClick={() => onNavigateAuth('login')}
            >
              {isHindi ? 'लॉगिन पृष्ठ पर जाएं' : 'Return to Sign In'}
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

          {/* Full Name */}
          <div className="form-group">
            <label htmlFor="signup-name" className="form-label">
              {isHindi ? 'पूरा नाम' : 'Full Name'}
            </label>
            <div className="input-with-icon">
              <User size={16} className="input-icon" />
              <input
                id="signup-name"
                type="text"
                className="form-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={isHindi ? 'उदा. अमित कुमार शर्मा' : 'e.g. Arjun Sharma'}
                autoComplete="name"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Email Address */}
          <div className="form-group">
            <label htmlFor="signup-email" className="form-label">
              {isHindi ? 'ईमेल पता' : 'Email Address'}
            </label>
            <div className="input-with-icon">
              <Mail size={16} className="input-icon" />
              <input
                id="signup-email"
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

          {/* Password */}
          <div className="form-group">
            <label htmlFor="signup-password" className="form-label">
              {isHindi ? 'पासवर्ड (कम से कम 8 वर्ण)' : 'Password (min. 8 characters)'}
            </label>
            <div className="input-with-icon">
              <Lock size={16} className="input-icon" />
              <input
                id="signup-password"
                type={showPassword ? 'text' : 'password'}
                className="form-input pr-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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

          {/* Confirm Password */}
          <div className="form-group">
            <label htmlFor="signup-confirm-password" className="form-label">
              {isHindi ? 'पासवर्ड की पुष्टि करें' : 'Confirm Password'}
            </label>
            <div className="input-with-icon">
              <Lock size={16} className="input-icon" />
              <input
                id="signup-confirm-password"
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
                <span>{isHindi ? 'खाता बनाया जा रहा है...' : 'Creating account...'}</span>
              </span>
            ) : (
              <>
                <UserPlus size={16} />
                <span>{isHindi ? 'खाता बनाएं' : 'Create Account'}</span>
              </>
            )}
          </button>

          {/* Alternate Link */}
          <div className="auth-alternate-action">
            <span>{isHindi ? 'पहले से खाता है?' : 'Already have an account?'}</span>
            <button
              type="button"
              className="btn-text-link font-semibold"
              onClick={() => onNavigateAuth('login')}
            >
              {isHindi ? 'प्रवेश करें' : 'Sign In'}
            </button>
          </div>
        </form>
      )}
    </AuthLayout>
  );
};
