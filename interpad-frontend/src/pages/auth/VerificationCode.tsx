import { useState } from 'react';
import './style/VerificationCode.css';
import { Link, useNavigate } from 'react-router-dom';
import { verifyAuthCode, resendVerificationCode } from '../../services';

type VerificationCodeProps = {
  onVerified: () => void;
};

const VerificationCode = ({ onVerified }: VerificationCodeProps) => {
  const [codes, setCodes] = useState<string[]>(['', '', '', '', '', '']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleCodeChange = (index: number, value: string) => {
    // Allow only single digit
    if (value.length > 1) return;
    
    const newCodes = [...codes];
    newCodes[index] = value;
    setCodes(newCodes);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`code-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle backspace to go to previous input
    if (e.key === 'Backspace' && !codes[index] && index > 0) {
      const prevInput = document.getElementById(`code-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    const newCodes = pastedData.split('').concat(Array(6 - pastedData.length).fill(''));
    setCodes(newCodes);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setError(null);

    const code = codes.join('');
    if (code.length !== 6) {
      setError('Please enter the 6-digit code.');
      return;
    }

    const pendingEmail = localStorage.getItem('pendingEmail');
    if (!pendingEmail) {
      setError('No pending verification found. Please log in again.');
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await verifyAuthCode({
        email: pendingEmail,
        code,
      });

      // Nëse verifikimi është i suksesshëm, ruaj token-in dhe pastro pending
      if (response.token) {
        // Për thjeshtësi, ruajmë gjithmonë në localStorage
        localStorage.setItem('token', response.token);
      }

      localStorage.removeItem('pendingEmail');
      localStorage.removeItem('pendingUserId');

      // Informo App-in që verifikimi përfundoi
      onVerified();

      // Shko te editori pas verifikimit
      navigate('/editor');
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    setError(null);

    const pendingEmail = localStorage.getItem('pendingEmail');
    if (!pendingEmail) {
      setError('No pending verification found. Please log in again.');
      return;
    }

    try {
      await resendVerificationCode({ email: pendingEmail });
      setError('A new verification code has been sent to your email.');
    } catch (err: any) {
      setError(err.message || 'Failed to resend verification code.');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <h1 className="auth-heading">Verification code</h1>
          
          <p className="verification-description">
            Enter the code that was sent to your email
          </p>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="verification-codes">
              {codes.map((code, index) => (
                <input
                  key={index}
                  id={`code-${index}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  className="code-input"
                  value={code}
                  onChange={(e) => handleCodeChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={index === 0 ? handlePaste : undefined}
                  autoFocus={index === 0}
                />
              ))}
            </div>

            {error && <p className="auth-error">{error}</p>}

            <button type="submit" className="auth-button" disabled={isSubmitting}>
              {isSubmitting ? 'Verifying...' : 'Verify'}
            </button>
          </form>

          <p className="auth-footer">
            Didn't receive code?{' '}
            <button
              type="button"
              onClick={handleResend}
              className="resend-link"
            >
              Resend
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default VerificationCode;

