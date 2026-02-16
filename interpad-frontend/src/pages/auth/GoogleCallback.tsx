import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import './style/GoogleCallback.css';

type GoogleCallbackProps = {
  onAuthenticated: () => void;
};

const GoogleCallback = ({ onAuthenticated }: GoogleCallbackProps) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get('token');
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    const userDataParam = searchParams.get('user');

    if (success === 'true' && token) {
      // Hapi 7 – Google login: si "remember me" (default), ruaj në localStorage dhe pastro sessionStorage
      sessionStorage.removeItem('token');
      localStorage.setItem('token', token);

      // Ruaj user data në localStorage nëse është e disponueshme
      if (userDataParam) {
        try {
          const userData = JSON.parse(decodeURIComponent(userDataParam));
          localStorage.setItem('user', JSON.stringify(userData));
        } catch (err) {
          console.error('Failed to parse user data:', err);
        }
      }
      
      // Lajmëro App-in që user-i është i autentikuar
      onAuthenticated();
      
      // Ridrejto te faqja Docs
      navigate('/docs', { replace: true });
    } else if (success === 'false' || error) {
      // Nëse ka error, ridrejto te login me mesazh error
      const errorMessage = error || 'Google authentication failed';
      navigate('/login?error=' + encodeURIComponent(errorMessage), { replace: true });
    } else {
      // Nëse nuk ka token ose success, ridrejto te login
      navigate('/login?error=' + encodeURIComponent('Authentication failed'), { replace: true });
    }
  }, [searchParams, navigate, onAuthenticated]);

  return (
    <div className="google-callback-container">
      <div className="google-callback-content">
        <div className="spinner"></div>
        <p>Completing Google authentication...</p>
      </div>
    </div>
  );
};

export default GoogleCallback;

