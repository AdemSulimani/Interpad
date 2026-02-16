import './style/Features.css';

const Features = () => {
  return (
    <section className="features-section">
      <div className="features-container">
        <div className="features-content">
          <h2 className="features-heading">
            <span className="heading-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="#44b492" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 17L12 22L22 17" stroke="#44b492" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12L12 17L22 12" stroke="#44b492" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
            Add Functionalities
          </h2>
          
          <p className="features-description">
            Interpad is very customizable through plugins. Instructions can be found in the <span className="highlighted-link">plugin wiki article</span>.
          </p>
          
          <div className="features-preview">
            <img 
              src="/addfunctionalities.PNG" 
              alt="Interpad Editor with Plugins" 
              className="features-image"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Features;

