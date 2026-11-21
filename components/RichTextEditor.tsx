'use client';

import { useEditor, EditorContent, Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TextAlign from '@tiptap/extension-text-align'
import {
  Bold, Italic, Underline as UnderlineIcon,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Quote, Minus, Undo, Redo, Eraser
} from 'lucide-react'
import { useEffect, useState, useRef } from 'react';

import Highlight from '@tiptap/extension-highlight'
import Typography from '@tiptap/extension-typography'
import Underline from '@tiptap/extension-underline'

const extensions = [
  StarterKit.configure({
    bulletList: {
      keepMarks: true,
      keepAttributes: false,
    },
    orderedList: {
      keepMarks: true,
      keepAttributes: false,
    },
  }),
  Underline,
  Highlight,
  Typography,
  TextAlign.configure({
    types: ['heading', 'paragraph'],
    defaultAlignment: 'left',
  }),
];

export type { Editor };

export function RichTextEditor({ 
  value, 
  onChange, 
  placeholder,
  disabled = false,
  variant = 'default',
  onEditorFocus,
  className = '',
}: { 
  value: string; 
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  variant?: 'default' | 'inline';
  onEditorFocus?: (editor: Editor) => void;
  className?: string;
}) {
  const [isMounted, setIsMounted] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const editor = useEditor({
    extensions,
    content: value,
    immediatelyRender: false,
    editable: !disabled,
    onFocus: ({ editor }) => {
      setIsFocused(true);
      onEditorFocus?.(editor);
    },
    onBlur: () => {
      setIsFocused(false);
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        onChange(html);
      }, 350);
    },
    editorProps: {
      attributes: {
        class: variant === 'inline'
          ? `prose prose-sm prose-slate max-w-none focus:outline-none min-h-[24px] leading-snug ${className}`
          : `prose prose-sm prose-slate max-w-none focus:outline-none min-h-[72px] ${className}`,
      },
    },
  });

  // Keep content in sync only if value prop changes from an external source
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      if (!editor.isFocused) {
        editor.commands.setContent(value, { emitUpdate: false });
      }
    }
  }, [value, editor]);

  useEffect(() => {
    if (editor) {
      editor.setEditable(!disabled);
    }
  }, [disabled, editor]);

  if (!isMounted || !editor) {
    return (
      <div className={variant === 'inline' ? 'min-h-[24px] rounded bg-slate-50/50 animate-pulse' : 'min-h-[72px] border border-slate-200 rounded animate-pulse bg-slate-50'} />
    );
  }

  if (variant === 'inline') {
    const isEmpty = !value || value === '<p></p>' || value.trim() === '';
    return (
      <div className={`relative group/rte rounded transition-all ${
        disabled 
          ? 'cursor-default' 
          : isFocused 
            ? 'bg-blue-50/30 ring-1 ring-blue-400/60 px-1.5 py-0.5 -mx-1.5 -my-0.5' 
            : 'hover:bg-slate-100/70 px-1.5 py-0.5 -mx-1.5 -my-0.5 cursor-text'
      }`}>
        {isEmpty && !isFocused && placeholder && (
          <div 
            onClick={() => !disabled && editor.commands.focus()}
            className="text-slate-400 italic pointer-events-none select-none absolute inset-y-0.5 left-1.5 flex items-center text-[11px]"
          >
            {placeholder}
          </div>
        )}
        <EditorContent editor={editor} />
      </div>
    );
  }

  const toggleBtnClass = "p-1.5 rounded hover:bg-slate-200 text-slate-700 transition-colors";
  const activeBtnClass = "p-1.5 rounded bg-blue-100 text-blue-700 transition-colors";

  return (
    <div className={`border rounded-lg overflow-hidden shadow-2xs transition-all ${disabled ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-300 focus-within:border-blue-600 focus-within:ring-1 focus-within:ring-blue-600'}`}>
      {!disabled && (
        <div className="bg-slate-50 border-b border-slate-200 p-1 flex gap-0.5 items-center flex-wrap">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={editor.isActive('bold') ? activeBtnClass : toggleBtnClass}
            title="Kalın"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={editor.isActive('italic') ? activeBtnClass : toggleBtnClass}
            title="İtalik"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={editor.isActive('underline') ? activeBtnClass : toggleBtnClass}
            title="Altı Çizili"
          >
            <UnderlineIcon className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-4 bg-slate-300 mx-1"></div>

          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            className={editor.isActive({ textAlign: 'left' }) ? activeBtnClass : toggleBtnClass}
            title="Sola Hizala"
          >
            <AlignLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            className={editor.isActive({ textAlign: 'center' }) ? activeBtnClass : toggleBtnClass}
            title="Ortala"
          >
            <AlignCenter className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            className={editor.isActive({ textAlign: 'right' }) ? activeBtnClass : toggleBtnClass}
            title="Sağa Hizala"
          >
            <AlignRight className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign('justify').run()}
            className={editor.isActive({ textAlign: 'justify' }) ? activeBtnClass : toggleBtnClass}
            title="İki Yana Yasla"
          >
            <AlignJustify className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-4 bg-slate-300 mx-1"></div>

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={editor.isActive('bulletList') ? activeBtnClass : toggleBtnClass}
            title="Madde İşaretli Liste"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={editor.isActive('orderedList') ? activeBtnClass : toggleBtnClass}
            title="Numaralı Liste"
          >
            <ListOrdered className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={editor.isActive('blockquote') ? activeBtnClass : toggleBtnClass}
            title="Alıntı"
          >
            <Quote className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            className={toggleBtnClass}
            title="Yatay Çizgi"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-4 bg-slate-300 mx-1"></div>

          <button
            type="button"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            className={toggleBtnClass + " disabled:opacity-30"}
            title="Geri Al"
          >
            <Undo className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            className={toggleBtnClass + " disabled:opacity-30"}
            title="İleri Al"
          >
            <Redo className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
            className={toggleBtnClass}
            title="Formatı Temizle"
          >
            <Eraser className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      <div className="p-2.5">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
