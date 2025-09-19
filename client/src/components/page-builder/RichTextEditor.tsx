import { useCallback, useEffect, useState } from 'react';
import { $getRoot, $getSelection, createEditor, EditorState, LexicalEditor } from 'lexical';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { PlainTextPlugin } from '@lexical/react/LexicalPlainTextPlugin';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $generateHtmlFromNodes, $generateNodesFromDOM } from '@lexical/html';
import { $getRoot as $getRootUtils } from '@lexical/utils';
import LexicalErrorBoundary from '@lexical/react/LexicalErrorBoundary';

interface RichTextEditorProps {
  initialContent?: string;
  placeholder?: string;
  onContentChange?: (content: string) => void;
  onBlur?: () => void;
  onFocus?: () => void;
  className?: string;
  style?: React.CSSProperties;
  isRichText?: boolean; // Toggle between rich text and plain text
  autoFocus?: boolean;
}

const theme = {
  paragraph: 'mb-2',
  heading: {
    h1: 'text-4xl font-bold mb-4',
    h2: 'text-3xl font-bold mb-3',
    h3: 'text-2xl font-bold mb-2',
    h4: 'text-xl font-bold mb-2',
    h5: 'text-lg font-bold mb-1',
    h6: 'text-base font-bold mb-1',
  },
  text: {
    bold: 'font-bold',
    italic: 'italic',
    underline: 'underline',
  },
  link: 'text-blue-600 underline hover:text-blue-800',
};

export function RichTextEditor({
  initialContent = '',
  placeholder = 'Digite seu texto...',
  onContentChange,
  onBlur,
  onFocus,
  className = '',
  style,
  isRichText = true,
  autoFocus = false,
}: RichTextEditorProps) {
  const [isEditable, setIsEditable] = useState(true);

  const initialConfig = {
    namespace: 'RichTextEditor',
    theme,
    onError: (error: Error) => {
      console.error('Lexical error:', error);
    },
    editorState: initialContent ? 
      (editor: LexicalEditor) => {
        const parser = new DOMParser();
        const dom = parser.parseFromString(initialContent, 'text/html');
        const nodes = $generateNodesFromDOM(editor, dom);
        const root = $getRoot();
        root.clear();
        root.append(...nodes);
      } : undefined,
  };

  const handleChange = useCallback((editorState: EditorState, editor: LexicalEditor) => {
    editorState.read(() => {
      const htmlString = $generateHtmlFromNodes(editor, null);
      onContentChange?.(htmlString);
    });
  }, [onContentChange]);

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className={`rich-text-editor ${className}`} style={style}>
        {isRichText ? (
          <RichTextPlugin
            contentEditable={
              <ContentEditable
                className="outline-none min-h-[1.5em] leading-relaxed"
                placeholder={placeholder}
                onFocus={onFocus}
                onBlur={onBlur}
              />
            }
            placeholder={
              <div className="absolute text-gray-400 pointer-events-none">
                {placeholder}
              </div>
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
        ) : (
          <PlainTextPlugin
            contentEditable={
              <ContentEditable
                className="outline-none min-h-[1.5em] leading-relaxed"
                placeholder={placeholder}
                onFocus={onFocus}
                onBlur={onBlur}
              />
            }
            placeholder={
              <div className="absolute text-gray-400 pointer-events-none">
                {placeholder}
              </div>
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
        )}
        
        <HistoryPlugin />
        <OnChangePlugin onChange={handleChange} />
        {autoFocus && <AutoFocusPlugin />}
      </div>
    </LexicalComposer>
  );
}

// Auto Focus Plugin
function AutoFocusPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    editor.focus();
  }, [editor]);

  return null;
}

// Simplified Inline Text Editor for quick edits
interface InlineTextEditorProps {
  content: string;
  onSave: (content: string) => void;
  onCancel: () => void;
  className?: string;
  style?: React.CSSProperties;
  multiline?: boolean;
}

export function InlineTextEditor({
  content,
  onSave,
  onCancel,
  className = '',
  style,
  multiline = false,
}: InlineTextEditorProps) {
  const [text, setText] = useState(content);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault();
      onSave(text);
    } else if (e.key === 'Enter' && e.metaKey) {
      e.preventDefault();
      onSave(text);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  const handleBlur = () => {
    if (text !== content) {
      onSave(text);
    } else {
      onCancel();
    }
  };

  return multiline ? (
    <textarea
      value={text}
      onChange={(e) => setText(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      className={`outline-none resize-none ${className}`}
      style={style}
      autoFocus
      rows={3}
    />
  ) : (
    <input
      type="text"
      value={text}
      onChange={(e) => setText(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      className={`outline-none w-full ${className}`}
      style={style}
      autoFocus
    />
  );
}

// Toolbar for rich text formatting
interface TextToolbarProps {
  onFormat: (format: string) => void;
  activeFormats: Set<string>;
}

export function TextToolbar({ onFormat, activeFormats }: TextToolbarProps) {
  const buttons = [
    { format: 'bold', label: 'B', title: 'Negrito (Ctrl+B)' },
    { format: 'italic', label: 'I', title: 'Itálico (Ctrl+I)' },
    { format: 'underline', label: 'U', title: 'Sublinhado (Ctrl+U)' },
  ];

  return (
    <div className="flex items-center gap-1 p-2 bg-white border border-gray-200 rounded-lg shadow-sm">
      {buttons.map((button) => (
        <button
          key={button.format}
          onClick={() => onFormat(button.format)}
          className={`px-2 py-1 text-sm font-medium rounded ${
            activeFormats.has(button.format)
              ? 'bg-blue-100 text-blue-700'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
          title={button.title}
        >
          {button.label}
        </button>
      ))}
    </div>
  );
}

// Hook for using the rich text editor in components
export function useRichTextEditor() {
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState('');
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set());

  const startEditing = useCallback((initialContent: string = '') => {
    setContent(initialContent);
    setIsEditing(true);
  }, []);

  const stopEditing = useCallback(() => {
    setIsEditing(false);
    setActiveFormats(new Set());
  }, []);

  const handleFormat = useCallback((format: string) => {
    // This would integrate with Lexical's formatting commands
    console.log('Format:', format);
  }, []);

  return {
    isEditing,
    content,
    activeFormats,
    startEditing,
    stopEditing,
    handleFormat,
    setContent,
  };
}

// Smart Text Component that switches between display and edit modes
interface SmartTextProps {
  content: string;
  onUpdate: (content: string) => void;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  multiline?: boolean;
  richText?: boolean;
  elementType?: 'heading' | 'text' | 'button';
}

export function SmartText({
  content,
  onUpdate,
  placeholder = 'Clique para editar...',
  className = '',
  style,
  multiline = false,
  richText = false,
  elementType = 'text',
}: SmartTextProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [localContent, setLocalContent] = useState(content);

  useEffect(() => {
    setLocalContent(content);
  }, [content]);

  const handleDoubleClick = () => {
    setIsEditing(true);
  };

  const handleSave = (newContent: string) => {
    setLocalContent(newContent);
    onUpdate(newContent);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setLocalContent(content);
    setIsEditing(false);
  };

  if (isEditing) {
    if (richText && multiline) {
      return (
        <RichTextEditor
          initialContent={localContent}
          placeholder={placeholder}
          onContentChange={setLocalContent}
          onBlur={() => handleSave(localContent)}
          className={className}
          style={style}
          autoFocus
        />
      );
    } else {
      return (
        <InlineTextEditor
          content={localContent}
          onSave={handleSave}
          onCancel={handleCancel}
          className={className}
          style={style}
          multiline={multiline}
        />
      );
    }
  }

  const displayContent = localContent || placeholder;
  const isPlaceholder = !localContent;

  return (
    <div
      onDoubleClick={handleDoubleClick}
      className={`${className} ${isPlaceholder ? 'text-gray-400' : ''} cursor-text hover:bg-gray-50 rounded px-1 transition-colors`}
      style={style}
      title="Clique duas vezes para editar"
    >
      {elementType === 'heading' ? (
        <span dangerouslySetInnerHTML={{ __html: displayContent }} />
      ) : (
        <span dangerouslySetInnerHTML={{ __html: displayContent }} />
      )}
    </div>
  );
}