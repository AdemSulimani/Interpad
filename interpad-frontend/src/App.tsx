import './App.css';
import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import LandingPage from './pages/landing-page/LandingPage';
import { Login, Register, ForgotPassword, VerificationCode, ResetPassword, GoogleCallback, LinkGoogleAccount } from './pages/auth';
import { DocumentEditorPage } from './pages/document-editor';
import { DocsHomePage } from './pages/docs-home';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [pendingUserEmail, setPendingUserEmail] = useState<string | null>(null);

  // Inicializo gjendjen nga storage kur hapet aplikacioni
  useEffect(() => {
    const storedToken = localStorage.getItem('token') || sessionStorage.getItem('token');

    if (storedToken) {
      setIsAuthenticated(true);
      setNeedsVerification(false);
      setPendingUserEmail(null);
      return;
    }

    const storedPendingEmail = localStorage.getItem('pendingEmail');
    if (storedPendingEmail) {
      setPendingUserEmail(storedPendingEmail);
      setNeedsVerification(true);
    }
  }, []);

  return (
    <Routes>
      <Route
        path="/"
        element={
          <>
            <Header />
            <LandingPage />
            <Footer />
          </>
        }
      />
      <Route
        path="/login"
        element={
          <Login
            onRequireVerification={(email, userId) => {
              setNeedsVerification(true);
              setIsAuthenticated(false);
              setPendingUserEmail(email);

              // Ruaj në storage që verifikimi është në pritje
              localStorage.setItem('pendingEmail', email);
              if (userId) {
                localStorage.setItem('pendingUserId', userId);
              }
            }}
            onAuthenticated={() => {
              setIsAuthenticated(true);
              setNeedsVerification(false);
              setPendingUserEmail(null);

              // Pas autentikimit të suksesshëm, pastro pending data
              localStorage.removeItem('pendingEmail');
              localStorage.removeItem('pendingUserId');
            }}
          />
        }
      />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route
        path="/auth/google/callback"
        element={
          <GoogleCallback
            onAuthenticated={() => {
              setIsAuthenticated(true);
              setNeedsVerification(false);
              setPendingUserEmail(null);
            }}
          />
        }
      />
      <Route
        path="/auth/google/link-account"
        element={
          <LinkGoogleAccount
            onAuthenticated={() => {
              setIsAuthenticated(true);
              setNeedsVerification(false);
              setPendingUserEmail(null);
            }}
          />
        }
      />
      <Route
        path="/verification-code"
        element={
          <VerificationCode
            onVerified={() => {
              setIsAuthenticated(true);
              setNeedsVerification(false);
              setPendingUserEmail(null);

              localStorage.removeItem('pendingEmail');
              localStorage.removeItem('pendingUserId');
            }}
          />
        }
      />
      <Route
        path="/docs"
        element={
          isAuthenticated ? <DocsHomePage /> : <Navigate to="/login" replace />
        }
      />
      <Route
        path="/editor"
        element={
          isAuthenticated ? <DocumentEditorPage /> : <Navigate to="/login" replace />
        }
      />
      <Route
        path="/editor/:documentId"
        element={
          isAuthenticated ? <DocumentEditorPage /> : <Navigate to="/login" replace />
        }
      />
    </Routes>
  );
}

export default App;
