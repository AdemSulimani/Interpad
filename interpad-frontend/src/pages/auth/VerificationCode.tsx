import { useState } from 'react';
import './style/VerificationCode.css';
import { Link } from 'react-router-dom';

const VerificationCode = () => {
  const [codes, setCodes] = useState<string[]>(['', '', '', '', '', '']);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Frontend only - no logic implementation
  };

  const handleResend = () => {
    // Frontend only - no logic implementation
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

            <button type="submit" className="auth-button">
              Verify
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

