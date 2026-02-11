import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import './style/Login.css';
import { linkGoogleAccount } from '../../services';

type LinkGoogleAccountProps = {
  onAuthenticated: () => void;
};

const LinkGoogleAccount = ({ onAuthenticated }: LinkGoogleAccountProps) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const email = searchParams.get('email');

  useEffect(() => {
    if (!email) {
      navigate('/login?error=' + encodeURIComponent('Email is required'), { replace: true });
    }
  }, [email, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      setError('Email is required');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const response = await linkGoogleAccount({ email, password });

      if (response.success && response.token) {
        // Ruaj token-in
        localStorage.setItem('token', response.token);
        
        // Ruaj user data në localStorage
        if (response.user) {
          localStorage.setItem('user', JSON.stringify(response.user));
        }

        // Lajmëro App-in që user-i është i autentikuar
        onAuthenticated();

        // Nëse ka redirectUrl, përdor atë, përndryshe shko te editor
        if (response.redirectUrl) {
          window.location.href = response.redirectUrl;
        } else {
          navigate('/editor', { replace: true });
        }
      } else {
        setError(response.message || 'Failed to link Google account');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while linking Google account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  if (!email) {
    return null;
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <h1 className="auth-heading">Link Google Account</h1>
          <p className="auth-description" style={{ marginBottom: '1.5rem', color: '#666' }}>
            An account with email <strong>{email}</strong> already exists. 
            Please enter your password to link your Google account.
          </p>
          
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="password" className="form-label">
                Enter your password
              </label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  className="form-input"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={togglePasswordVisibility}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {error && <p className="auth-error">{error}</p>}

            <button type="submit" className="auth-button" disabled={isSubmitting}>
              {isSubmitting ? 'Linking account...' : 'Link Account'}
            </button>
          </form>

          <p className="auth-footer">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="auth-link"
              style={{ background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Back to login
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LinkGoogleAccount;

