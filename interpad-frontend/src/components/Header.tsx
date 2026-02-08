import './Header.css';
import { Link } from 'react-router-dom';
import { useMenu } from '../hooks/useMenu';

const Header = () => {
  const { isMenuOpen, toggleMenu } = useMenu();

  return (
    <>
      <header className="header">
        <div className="header-container">
          <div className="header-left">
            <div className="logo">
              <span className="logo-text">Interpad</span>
            </div>
          </div>
          
          <nav className="header-middle">
            <a href="#home" className="nav-link">Home</a>
            <a href="#about" className="nav-link">About</a>
            <a href="#features" className="nav-link">Features</a>
            <a href="#contribute" className="nav-link">Contribute</a>
            <a href="#links" className="nav-link">Links</a>
          </nav>
          
          <div className="header-right">
            <button className="btn-get-started">Get Started</button>
            <Link to="/login" className="btn-login">Login</Link>
          </div>
          
          <button className="hamburger-menu" onClick={toggleMenu}>
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </header>
      
      <div className={`sidebar ${isMenuOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo">
            <span className="logo-text">Interpad</span>
          </div>
          <button className="sidebar-close" onClick={toggleMenu}>×</button>
        </div>
        <nav className="sidebar-nav">
          <a href="#home" className="sidebar-link" onClick={toggleMenu}>Home</a>
          <a href="#about" className="sidebar-link" onClick={toggleMenu}>About</a>
          <a href="#features" className="sidebar-link" onClick={toggleMenu}>Features</a>
          <a href="#contribute" className="sidebar-link" onClick={toggleMenu}>Contribute</a>
          <a href="#links" className="sidebar-link" onClick={toggleMenu}>Links</a>
        </nav>
        <div className="sidebar-buttons">
          <button className="btn-get-started">Get Started</button>
          <Link to="/login" className="btn-login" onClick={toggleMenu}>Login</Link>
        </div>
      </div>
      
      {isMenuOpen && <div className="sidebar-overlay" onClick={toggleMenu}></div>}
    </>
  );
};

export default Header;

