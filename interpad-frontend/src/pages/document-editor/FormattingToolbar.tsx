import { useState } from 'react';
import './style/FormattingToolbar.css';

const FormattingToolbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="formatting-toolbar">
      {/* Mobile Menu Toggle Button */}
      <button
        className="toolbar-mobile-toggle"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        aria-label="Toggle formatting options"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="3" y1="12" x2="21" y2="12"/>
          <line x1="3" y1="6" x2="21" y2="6"/>
          <line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
        <span>Format</span>
      </button>

      {/* Desktop Toolbar */}
      <div className="formatting-toolbar-container toolbar-desktop">
        {/* Formatting Buttons: Bold, Italic, Underline */}
        <div className="toolbar-group">
          <button className="toolbar-btn" title="Bold">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/>
              <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/>
            </svg>
          </button>
          <button className="toolbar-btn" title="Italic">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="19" y1="4" x2="10" y2="4"/>
              <line x1="14" y1="20" x2="5" y2="20"/>
              <line x1="15" y1="4" x2="9" y2="20"/>
            </svg>
          </button>
          <button className="toolbar-btn" title="Underline">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3"/>
              <line x1="4" y1="21" x2="20" y2="21"/>
            </svg>
          </button>
        </div>

        <div className="toolbar-divider"></div>

        {/* Font Selection Dropdown */}
        <div className="toolbar-group">
          <select className="toolbar-dropdown font-select">
            <option value="Quicksand">Quicksand</option>
            <option value="Arial">Arial</option>
            <option value="Times New Roman">Times New Roman</option>
            <option value="Courier New">Courier New</option>
            <option value="Georgia">Georgia</option>
            <option value="Verdana">Verdana</option>
            <option value="Helvetica">Helvetica</option>
            <option value="Comic Sans MS">Comic Sans MS</option>
          </select>
        </div>

        <div className="toolbar-divider"></div>

        {/* Font Size Dropdown */}
        <div className="toolbar-group">
          <select className="toolbar-dropdown font-size-select">
            <option value="8">8</option>
            <option value="9">9</option>
            <option value="10">10</option>
            <option value="11">11</option>
            <option value="12">12</option>
            <option value="14">14</option>
            <option value="16" selected>16</option>
            <option value="18">18</option>
            <option value="20">20</option>
            <option value="24">24</option>
            <option value="28">28</option>
            <option value="32">32</option>
            <option value="36">36</option>
            <option value="48">48</option>
            <option value="72">72</option>
          </select>
        </div>

        <div className="toolbar-divider"></div>

        {/* Color Pickers */}
        <div className="toolbar-group">
          <div className="color-picker-wrapper">
            <button className="toolbar-btn color-picker-btn" title="Text Color">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="16 2 16 8 22 8"/>
                <path d="M21 10v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V10"/>
              </svg>
              <span className="color-indicator text-color-indicator" style={{ backgroundColor: '#000000' }}></span>
            </button>
            <button className="toolbar-btn color-picker-btn" title="Background Color">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              </svg>
              <span className="color-indicator bg-color-indicator" style={{ backgroundColor: '#ffffff', border: '1px solid #ccc' }}></span>
            </button>
          </div>
        </div>

        <div className="toolbar-divider"></div>

        {/* Alignment Buttons */}
        <div className="toolbar-group">
          <button className="toolbar-btn" title="Align Left">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="21" y1="10" x2="7" y2="10"/>
              <line x1="21" y1="6" x2="3" y2="6"/>
              <line x1="21" y1="14" x2="3" y2="14"/>
              <line x1="21" y1="18" x2="7" y2="18"/>
            </svg>
          </button>
          <button className="toolbar-btn" title="Align Center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="10" x2="6" y2="10"/>
              <line x1="21" y1="6" x2="3" y2="6"/>
              <line x1="21" y1="14" x2="3" y2="14"/>
              <line x1="18" y1="18" x2="6" y2="18"/>
            </svg>
          </button>
          <button className="toolbar-btn" title="Align Right">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="21" y1="10" x2="7" y2="10"/>
              <line x1="21" y1="6" x2="3" y2="6"/>
              <line x1="21" y1="14" x2="3" y2="14"/>
              <line x1="21" y1="18" x2="7" y2="18"/>
            </svg>
          </button>
          <button className="toolbar-btn" title="Justify">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="21" y1="10" x2="3" y2="10"/>
              <line x1="21" y1="6" x2="3" y2="6"/>
              <line x1="21" y1="14" x2="3" y2="14"/>
              <line x1="21" y1="18" x2="3" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="toolbar-divider"></div>

        {/* List Buttons */}
        <div className="toolbar-group">
          <button className="toolbar-btn" title="Bullet List">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="8" cy="6" r="2"/>
              <circle cx="8" cy="12" r="2"/>
              <circle cx="8" cy="18" r="2"/>
              <line x1="12" y1="6" x2="20" y2="6"/>
              <line x1="12" y1="12" x2="20" y2="12"/>
              <line x1="12" y1="18" x2="20" y2="18"/>
            </svg>
          </button>
          <button className="toolbar-btn" title="Numbered List">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="8" y1="6" x2="21" y2="6"/>
              <line x1="8" y1="12" x2="21" y2="12"/>
              <line x1="8" y1="18" x2="21" y2="18"/>
              <line x1="3" y1="6" x2="3.01" y2="6"/>
              <line x1="3" y1="12" x2="3.01" y2="12"/>
              <line x1="3" y1="18" x2="3.01" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="toolbar-divider"></div>

        {/* Indent/Outdent Buttons */}
        <div className="toolbar-group">
          <button className="toolbar-btn" title="Decrease Indent">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="7 13 3 9 7 5"/>
              <line x1="3" y1="9" x2="21" y2="9"/>
            </svg>
          </button>
          <button className="toolbar-btn" title="Increase Indent">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="17 13 21 9 17 5"/>
              <line x1="21" y1="9" x2="3" y2="9"/>
            </svg>
          </button>
        </div>

        <div className="toolbar-divider"></div>

        {/* Link and Image Buttons */}
        <div className="toolbar-group">
          <button className="toolbar-btn" title="Insert Link">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
            </svg>
          </button>
          <button className="toolbar-btn" title="Insert Image">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
          </button>
        </div>

        <div className="toolbar-divider"></div>

        {/* Undo/Redo Buttons */}
        <div className="toolbar-group">
          <button className="toolbar-btn" title="Undo">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 7v6h6"/>
              <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>
            </svg>
          </button>
          <button className="toolbar-btn" title="Redo">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 7v6h-6"/>
              <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      <div className={`toolbar-mobile-menu ${isMobileMenuOpen ? 'mobile-menu-open' : ''}`}>
        <div className="toolbar-mobile-menu-content">
          {/* Formatting Buttons */}
          <div className="mobile-menu-section">
            <div className="mobile-menu-section-title">Text Formatting</div>
            <div className="mobile-menu-buttons">
              <button className="toolbar-btn mobile-btn" title="Bold">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/>
                  <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/>
                </svg>
                <span>Bold</span>
              </button>
              <button className="toolbar-btn mobile-btn" title="Italic">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="19" y1="4" x2="10" y2="4"/>
                  <line x1="14" y1="20" x2="5" y2="20"/>
                  <line x1="15" y1="4" x2="9" y2="20"/>
                </svg>
                <span>Italic</span>
              </button>
              <button className="toolbar-btn mobile-btn" title="Underline">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3"/>
                  <line x1="4" y1="21" x2="20" y2="21"/>
                </svg>
                <span>Underline</span>
              </button>
            </div>
          </div>

          {/* Font & Size */}
          <div className="mobile-menu-section">
            <div className="mobile-menu-section-title">Font</div>
            <div className="mobile-menu-dropdowns">
              <select className="toolbar-dropdown mobile-dropdown">
                <option value="Quicksand">Quicksand</option>
                <option value="Arial">Arial</option>
                <option value="Times New Roman">Times New Roman</option>
              </select>
              <select className="toolbar-dropdown mobile-dropdown">
                <option value="16">16px</option>
                <option value="14">14px</option>
                <option value="18">18px</option>
                <option value="20">20px</option>
              </select>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mobile-menu-section">
            <div className="mobile-menu-section-title">Quick Actions</div>
            <div className="mobile-menu-buttons">
              <button className="toolbar-btn mobile-btn" title="Insert Link">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                </svg>
                <span>Link</span>
              </button>
              <button className="toolbar-btn mobile-btn" title="Insert Image">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
                <span>Image</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FormattingToolbar;

