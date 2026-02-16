import './App.css';
import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import LandingPage from './pages/landing-page/LandingPage';
import { Login, Register, ForgotPassword, VerificationCode, ResetPassword, GoogleCallback, LinkGoogleAccount } from './pages/auth';
import { DocumentEditorPage } from './pages/document-editor';
import { DocsHomePage } from './pages/docs-home';
import { validateAuthToken } from './services';

type AuthStatus = 'pending' | 'authenticated' | 'unauthenticated';

function App() {
  const [authStatus, setAuthStatus] = useState<AuthStatus>('pending');
  const [needsVerification, setNeedsVerification] = useState(false);
  const [pendingUserEmail, setPendingUserEmail] = useState<string | null>(null);

  // Hapi 1 + 3 – Në ngarkim: nëse ka token, verifikoje me backend; nëse jo, kontrollo pending verification
  useEffect(() => {
    const storedToken = localStorage.getItem('token') || sessionStorage.getItem('token');

    if (!storedToken) {
      setAuthStatus('unauthenticated');
      const storedPendingEmail = localStorage.getItem('pendingEmail');
      if (storedPendingEmail) {
        setNeedsVerification(true);
        setPendingUserEmail(storedPendingEmail);
      }
      return;
    }

    // Hapi 3 – Verifikim i token-it me backend (skaduar/invalid → pastro storage dhe dil nga auth)
    validateAuthToken()
      .then((valid) => {
        setAuthStatus(valid ? 'authenticated' : 'unauthenticated');
        if (valid) {
          setNeedsVerification(false);
          setPendingUserEmail(null);
        }
      })
      .catch(() => {
        setAuthStatus('unauthenticated');
      });
  }, []);

  const isAuthenticated = authStatus === 'authenticated';

  return (
    <Routes>
      {/* Hapi 5 – Përdoruesi i autentikuar që hap / ridrejtohet automatikisht te /docs */}
      <Route
        path="/"
        element={
          isAuthenticated ? (
            <Navigate to="/docs" replace />
          ) : (
            <>
              <Header />
              <LandingPage />
              <Footer />
            </>
          )
        }
      />
      <Route
        path="/login"
        element={
          authStatus === 'pending' ? (
            <div className="app-auth-loading">Loading...</div>
          ) : (
            <Login
              onRequireVerification={(email, userId) => {
                setNeedsVerification(true);
                setAuthStatus('unauthenticated');
                setPendingUserEmail(email);

                // Ruaj në storage që verifikimi është në pritje
                localStorage.setItem('pendingEmail', email);
                if (userId) {
                  localStorage.setItem('pendingUserId', userId);
                }
              }}
              onAuthenticated={() => {
                setAuthStatus('authenticated');
                setNeedsVerification(false);
                setPendingUserEmail(null);

                // Pas autentikimit të suksesshëm, pastro pending data
                localStorage.removeItem('pendingEmail');
                localStorage.removeItem('pendingUserId');
              }}
            />
          )
        }
      />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route
        path="/auth/google/callback"
        element={
          authStatus === 'pending' ? (
            <div className="app-auth-loading">Loading...</div>
          ) : (
            <GoogleCallback
              onAuthenticated={() => {
                setAuthStatus('authenticated');
                setNeedsVerification(false);
                setPendingUserEmail(null);
              }}
            />
          )
        }
      />
      <Route
        path="/auth/google/link-account"
        element={
          authStatus === 'pending' ? (
            <div className="app-auth-loading">Loading...</div>
          ) : (
            <LinkGoogleAccount
              onAuthenticated={() => {
                setAuthStatus('authenticated');
                setNeedsVerification(false);
                setPendingUserEmail(null);
              }}
            />
          )
        }
      />
      <Route
        path="/verification-code"
        element={
          authStatus === 'pending' ? (
            <div className="app-auth-loading">Loading...</div>
          ) : (
            <VerificationCode
              onVerified={() => {
                setAuthStatus('authenticated');
                setNeedsVerification(false);
                setPendingUserEmail(null);

                localStorage.removeItem('pendingEmail');
                localStorage.removeItem('pendingUserId');
              }}
            />
          )
        }
      />
      <Route
        path="/docs"
        element={
          authStatus === 'pending' ? (
            <div className="app-auth-loading">Loading...</div>
          ) : isAuthenticated ? (
            <DocsHomePage />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/editor"
        element={
          authStatus === 'pending' ? (
            <div className="app-auth-loading">Loading...</div>
          ) : isAuthenticated ? (
            <DocumentEditorPage />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/editor/:documentId"
        element={
          authStatus === 'pending' ? (
            <div className="app-auth-loading">Loading...</div>
          ) : isAuthenticated ? (
            <DocumentEditorPage />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
    </Routes>
  );
}

export default App;
