import './App.css'
import { Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import Footer from './components/Footer'
import LandingPage from './pages/landing-page/LandingPage'
import { Login, Register, ForgotPassword, VerificationCode } from './pages/auth'
import { DocumentEditorPage } from './pages/document-editor'

function App() {
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
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/verification-code" element={<VerificationCode />} />
      <Route path="/editor" element={<DocumentEditorPage />} />
      <Route path="/editor/:documentId" element={<DocumentEditorPage />} />
    </Routes>
  )
}

export default App
