import './style/ForgotPassword.css';
import { Link } from 'react-router-dom';
import { useForgotPassword } from '../../hooks';

const ForgotPassword = () => {
  const { email, setEmail, handleSubmit } = useForgotPassword();

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <h1 className="auth-heading">Forgot your password?</h1>
          
          <p className="forgot-password-description">
            Enter your email and we'll send instructions on how to reset your password.
          </p>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <input
                type="email"
                id="email"
                className="form-input"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <button type="submit" className="auth-button">
              Reset password
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

