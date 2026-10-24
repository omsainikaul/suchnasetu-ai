import React, { useState, useEffect } from 'react';
import { AuthLayout } from './AuthLayout';
import { verifyEmailAddress, resendEmailVerification } from '../../services/api';
import { CheckCircle2, AlertCircle, RefreshCw, Mail, KeyRound, LogIn } from 'lucide-react';

interface VerifyEmailPageProps {
  initialEmail?: string;
  currentLanguage: string;
  onLanguageChange: (lang: string) => void;
  onVerificationSuccess: () => void;
  onNavigateLogin: () => void;
  onNavigateSignup?: () => void;
}

export const VerifyEmailPage: React.FC<VerifyEmailPageProps> = ({
  initialEmail,
  currentLanguage,
  onLanguageChange,
  onVerificationSuccess,
  onNavigateLogin,
  onNavigateSignup,
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
      const urlEmail = new URLSearchParams(window.location.search).get('email');
      if (urlEmail) return urlEmail.trim().toLowerCase();
      if (initialEmail) return initialEmail.trim().toLowerCase();
      return (sessionStorage.getItem('suchnasetu_pending_verification_email') || '').trim().toLowerCase();
    } catch {
      return (initialEmail || '').trim().toLowerCase();
    }
  });

  // Keep track of the email for which the token/code was issued
  const [boundEmail, setBoundEmail] = useState<string>(() => {
    try {
      const urlEmail = new URLSearchParams(window.location.search).get('email');
      if (urlEmail) return urlEmail.trim().toLowerCase();
      if (initialEmail) return initialEmail.trim().toLowerCase();
      return (sessionStorage.getItem('suchnasetu_pending_verification_email') || '').trim().toLowerCase();
    } catch {
      return (initialEmail || '').trim().toLowerCase();
    }
  });

  const [isEditingEmail, setIsEditingEmail] = useState<boolean>(() => !email);
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState<boolean>(() => Boolean(token));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendStatus, setResendStatus] = useState<string | null>(null);
  const [resendWarning, setResendWarning] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Automatically verify if link token was provided in URL on load
  useEffect(() => {
    if (!token) return;
    let isMounted = true;
    verifyEmailAddress({ token })
      .then(() => {
        if (isMounted) {
          setIsSuccess(true);
          try {
            sessionStorage.removeItem('suchnasetu_pending_verification_email');
          } catch {}
          onVerificationSuccess();
        }
      })
      .catch((err: any) => {
        if (isMounted) {
          setError(
            err.message ||
              (isHindi
                ? 'सत्यापन लिंक अमान्य या समाप्त हो चुका है। कृपया नया लिंक का अनुरोध करें।'
                : 'Verification link is invalid or has expired. Please request a new link.')
          );
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [token, isHindi, onVerificationSuccess]);

  // Cooldown countdown timer for resend
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const handleEmailChange = (newVal: string) => {
    const cleaned = newVal.trim().toLowerCase();
    setEmail(newVal);
    // If the displayed email changes, invalidate the entered code to avoid submitting an existing code to a different address
    if (cleaned !== boundEmail) {
      setCode('');
      setError(null);
    }
  };

  const handleManualCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || isLoading) return;
    setError(null);
    setResendStatus(null);
    setResendWarning(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.trim().replace(/\D/g, '');

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError(isHindi ? 'कृपया एक मान्य ईमेल पता दर्ज करें।' : 'Please enter a valid email address.');
      return;
    }
    if (cleanCode.length !== 6) {
      setError(isHindi ? 'कृपया 6-अंकीय सत्यापन कोड दर्ज करें।' : 'Please enter the 6-digit verification code.');
      return;
    }

    if (boundEmail && cleanEmail !== boundEmail) {
      setError(
        isHindi
          ? 'ईमेल बदल दिया गया है। कृपया नए ईमेल पर कोड प्राप्त करने के लिए "सत्यापन लिंक पुनः भेजें" पर क्लिक करें।'
          : 'Email address was modified. Please click "Resend verification email" to dispatch a fresh code to this address.'
      );
      return;
    }

    setIsSubmitting(true);
    setIsLoading(true);
    try {
      await verifyEmailAddress({
        email: cleanEmail,
        code: cleanCode,
      });
      setIsSuccess(true);
      try {
        sessionStorage.removeItem('suchnasetu_pending_verification_email');
      } catch {}
      onVerificationSuccess();
    } catch (err: any) {
      setError(
        err.message ||
          (isHindi
            ? 'सत्यापन कोड अमान्य है या समाप्त हो गया है।'
            : 'Invalid or expired verification code.')
      );
    } finally {
      setIsSubmitting(false);
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || isLoading || isSubmitting) return;

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError(isHindi ? 'पुनः भेजने के लिए कृपया एक मान्य ईमेल पता दर्ज करें।' : 'Please enter a valid email address to resend verification.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResendStatus(null);
    setResendWarning(null);

    try {
      const res = await resendEmailVerification(cleanEmail);
      // Bind token/code to this newly confirmed address
      setBoundEmail(cleanEmail);
      setIsEditingEmail(false);
      try {
        sessionStorage.setItem('suchnasetu_pending_verification_email', cleanEmail);
      } catch {}

      if (res.already_verified) {
        setResendStatus(
          res.message ||
            (isHindi
              ? 'यह खाता पहले से ही सत्यापित और सक्रिय है। आप सीधे लॉगिन कर सकते हैं।'
              : 'This account is already verified and active. You can sign in directly.')
        );
      } else if (res.email_delivered === false) {
        setResendWarning(
          res.message ||
            (isHindi
              ? 'मेल सर्वर समस्या के कारण सत्यापन ईमेल नहीं भेजा जा सका। आपका वर्तमान कोड सक्रिय है।'
              : 'Unable to deliver verification email at this time due to mail server connectivity. Your existing code remains active.')
        );
      } else {
        setResendStatus(
          res.message ||
            (isHindi
              ? 'नया सत्यापन संदेश ईमेल पर भेज दिया गया है।'
              : 'A fresh verification link and 6-digit code have been dispatched.')
        );
      }
      setResendCooldown(60);
    } catch (err: any) {
      const errMsg = err.message || '';
      setError(
        errMsg ||
          (isHindi
            ? 'सत्यापन ईमेल पुनः भेजने में विफल। कृपया पुनः प्रयास करें।'
            : 'Failed to resend verification email. Please try again.')
      );
      if (errMsg.includes('60 seconds') || errMsg.includes('wait') || errMsg.includes('Too many')) {
        setResendCooldown(60);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title={isHindi ? 'ईमेल सत्यापन' : 'Verify Email Address'}
      subtitle={
        isHindi
          ? 'अपने खाते को सक्रिय करने के लिए अपने ईमेल पर भेजे गए लिंक या 6-अंकीय कोड का उपयोग करें।'
          : 'Confirm your registered email address using the secure link or 6-digit code.'
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
            {isHindi ? 'ईमेल सफलतापूर्वक सत्यापित!' : 'Email Verified Successfully!'}
          </h2>
          <p className="auth-success-text">
            {isHindi
              ? 'आपका SuchnaSetu AI खाता अब पूरी तरह से सक्रिय है। आप सभी कार्यक्षेत्रों और परिपत्र खुफिया सुविधाओं का उपयोग कर सकते हैं।'
              : 'Your citizen account is now active. You can sign in and explore the notice intelligence dashboard.'}
          </p>
          <div className="auth-success-actions">
            <button
              type="button"
              className="btn-auth-primary"
              onClick={onNavigateLogin}
            >
              <LogIn size={16} />
              <span>{isHindi ? 'साइन इन करें' : 'Sign In Now'}</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="verify-flow-container">
          {error && (
            <div className="auth-error-banner" role="alert">
              <AlertCircle size={16} className="error-icon" />
              <div className="error-text">{error}</div>
            </div>
          )}

          {resendStatus && (
            <div className="auth-info-banner" role="status">
              <CheckCircle2 size={16} className="text-emerald-600" />
              <div className="info-text">{resendStatus}</div>
            </div>
          )}

          {resendWarning && (
            <div className="auth-error-banner" style={{ backgroundColor: '#fffbeb', borderColor: '#fef3c7', color: '#92400e' }} role="status">
              <AlertCircle size={16} className="text-amber-600" />
              <div className="info-text">{resendWarning}</div>
            </div>
          )}

          {token && isLoading ? (
            <div className="auth-verifying-spinner-box">
              <div className="btn-spinner large" />
              <p>{isHindi ? 'आपके सत्यापन लिंक की पुष्टि की जा रही है...' : 'Verifying your email token...'}</p>
            </div>
          ) : (
            <form onSubmit={handleManualCodeSubmit} className="auth-form" noValidate>
              <p className="auth-code-instruction">
                {isHindi
                  ? 'अपने पंजीकृत ईमेल पर भेजा गया 6-अंकीय सत्यापन कोड दर्ज करें:'
                  : 'Enter the 6-digit verification code sent to your registered email address:'}
              </p>

              {/* Email Address Section */}
              <div className="form-group">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <label htmlFor="verify-email" className="form-label" style={{ marginBottom: 0 }}>
                    {isHindi ? 'पंजीकृत ईमेल पता' : 'Registered Email Address'}
                  </label>
                  {email && !isEditingEmail && (
                    <button
                      type="button"
                      className="btn-text-link"
                      style={{ fontSize: '0.75rem', fontWeight: 600 }}
                      onClick={() => setIsEditingEmail(true)}
                    >
                      {isHindi ? 'ईमेल बदलें' : 'Change Email'}
                    </button>
                  )}
                </div>

                {!isEditingEmail && email ? (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '0.875rem',
                      color: '#0f172a',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Mail size={16} className="text-emerald-600" />
                      <span className="font-mono font-medium">{email}</span>
                    </div>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        backgroundColor: '#ecfdf5',
                        color: '#047857',
                        padding: '2px 8px',
                        borderRadius: '9999px',
                        border: '1px solid #a7f3d0',
                      }}
                    >
                      {isHindi ? 'पंजीकृत गंतव्य' : 'Registered'}
                    </span>
                  </div>
                ) : (
                  <div>
                    <div className="input-with-icon">
                      <Mail size={16} className="input-icon" />
                      <input
                        id="verify-email"
                        type="email"
                        className="form-input"
                        value={email}
                        onChange={(e) => handleEmailChange(e.target.value)}
                        placeholder="citizen@example.gov.in"
                        autoComplete="email"
                        required
                        disabled={isLoading || isSubmitting}
                      />
                    </div>
                    {boundEmail && email !== boundEmail && (
                      <p style={{ fontSize: '0.75rem', color: '#b45309', marginTop: '4px', lineHeight: 1.4 }}>
                        {isHindi
                          ? 'चेतावनी: ईमेल पता बदल दिया गया है। इस नए पते पर कोड पाने के लिए कृपया "सत्यापन लिंक पुनः भेजें" पर क्लिक करें।'
                          : 'Note: Email address modified. Verification codes are bound to the recipient address; click "Resend verification email" to dispatch a fresh code.'}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* 6-Digit Code */}
              <div className="form-group">
                <label htmlFor="verify-code" className="form-label">
                  {isHindi ? '6-अंकीय सत्यापन कोड' : '6-Digit Verification Code'}
                </label>
                <div className="input-with-icon">
                  <KeyRound size={16} className="input-icon" />
                  <input
                    id="verify-code"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    className="form-input text-center font-mono font-bold tracking-widest text-lg"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="123456"
                    required
                    disabled={isLoading || isSubmitting}
                    autoComplete="one-time-code"
                  />
                </div>
              </div>

              {/* Submit Code */}
              <button
                type="submit"
                className="btn-auth-primary"
                disabled={isLoading || isSubmitting || code.length !== 6 || !email.trim()}
              >
                {isLoading || isSubmitting ? (
                  <span className="btn-loading-content">
                    <span className="btn-spinner" />
                    <span>{isHindi ? 'सत्यापित किया जा रहा है...' : 'Verifying...'}</span>
                  </span>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    <span>{isHindi ? 'कोड सत्यापित करें' : 'Verify Code'}</span>
                  </>
                )}
              </button>

              {/* Resend Link with rate limiting */}
              <div className="auth-resend-row">
                <button
                  type="button"
                  className="btn-text-link"
                  onClick={handleResend}
                  disabled={isLoading || isSubmitting || resendCooldown > 0 || !email.trim()}
                >
                  <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                  <span>
                    {resendCooldown > 0
                      ? isHindi
                        ? `पुनः भेजें (${resendCooldown}s)`
                        : `Resend link (${resendCooldown}s)`
                      : isHindi
                        ? 'सत्यापन लिंक पुनः भेजें'
                        : 'Resend verification email'}
                  </span>
                </button>
              </div>

              {/* Navigation Options */}
              <div className="auth-alternate-action" style={{ flexDirection: 'column', gap: '8px', marginTop: '1rem' }}>
                <button
                  type="button"
                  className="btn-text-link font-semibold"
                  onClick={onNavigateLogin}
                >
                  {isHindi ? '← साइन इन पृष्ठ पर लौटें' : '← Return to Sign In'}
                </button>
                {onNavigateSignup && (
                  <button
                    type="button"
                    className="btn-text-link"
                    style={{ color: '#64748b', fontSize: '0.75rem' }}
                    onClick={onNavigateSignup}
                  >
                    {isHindi ? 'नया खाता पंजीकृत करें' : 'Register a new citizen account'}
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
      )}
    </AuthLayout>
  );
};
