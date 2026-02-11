import { useState } from 'react';
import './style/ForgotPassword.css';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../../services';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setError(null);
    setSuccess(false);
    setIsSubmitting(true);

    try {
      await forgotPassword({ email });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <h1 className="auth-heading">Forgot your password?</h1>
          
          <p className="forgot-password-description">
            Enter your email and we'll send instructions on how to reset your password.
          </p>

          <form onSubmit={handleSubmit} className="auth-form">
            {error && (
              <div className="error-message" style={{ color: 'red', marginBottom: '1rem' }}>
                {error}
              </div>
            )}
            
            {success && (
              <div className="success-message" style={{ color: 'green', marginBottom: '1rem' }}>
                Password reset instructions have been sent to your email.
              </div>
            )}

            <div className="form-group">
              <input
                type="email"
                id="email"
                className="form-input"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isSubmitting || success}
              />
            </div>

            <button 
              type="submit" 
              className="auth-button"
              disabled={isSubmitting || success}
            >
              {isSubmitting ? 'Sending...' : 'Reset password'}
            </button>
          </form>

          <p className="auth-footer">
            Remembered password?{' '}
            <Link to="/login" className="auth-link">
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;

