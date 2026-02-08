import './style/VerificationCode.css';
import { Link } from 'react-router-dom';
import { useVerificationCode } from '../../hooks';

const VerificationCode = () => {
  const {
    codes,
    handleCodeChange,
    handleKeyDown,
    handlePaste,
    handleSubmit,
    handleResend,
  } = useVerificationCode();

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

