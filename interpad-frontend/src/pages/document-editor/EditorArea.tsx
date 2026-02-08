import './style/EditorArea.css';

const EditorArea = () => {
  return (
    <div className="editor-area-wrapper">
      <div className="editor-area-container">
        <div 
          className="editor-area"
          contentEditable={true}
          suppressContentEditableWarning={true}
          role="textbox"
          aria-label="Document editor"
          spellCheck={true}
        >
          <p>Start typing your document here...</p>
        </div>
      </div>
    </div>
  );
};

export default EditorArea;

