import './style/Customize.css';

const Customize = () => {
  return (
    <section className="customize-section">
      <div className="customize-container">
        <div className="customize-content">
          <h2 className="customize-heading">
            <span className="heading-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20.71 4.63L19.37 3.29C19 2.9 18.35 2.9 17.96 3.29L9 12.25L11.75 15L20.71 6.04C21.1 5.65 21.1 5 20.71 4.63Z" stroke="#44b492" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 12.25L3.04 3.29C2.65 2.9 2 2.9 1.63 3.29L2.97 4.63C3.36 5.02 3.36 5.67 2.97 6.06L9 12.25" stroke="#44b492" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 12.25L15 15" stroke="#44b492" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M18.5 2.5C18.5 2.5 19 4.5 20.5 6C22 7.5 24 8 24 8" stroke="#44b492" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M18.5 2.5C18.5 2.5 17 3 15.5 4.5C14 6 13.5 7.5 13.5 7.5" stroke="#44b492" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M21 12V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H12" stroke="#44b492" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
            Customize Appearance
          </h2>
          
          <div className="customize-preview">
            <img 
              src="/customizeappearence.PNG" 
              alt="Interpad Customize Appearance" 
              className="customize-image"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Customize;

