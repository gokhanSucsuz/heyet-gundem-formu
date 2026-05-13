'use client';

import { useEditor, EditorContent } from '@tiptap/react'
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
  Highlight,
  Typography,
  TextAlign.configure({
    types: ['heading', 'paragraph'],
    defaultAlignment: 'left',
  }),
];

export function RichTextEditor({ 
  value, 
  onChange, 
  placeholder,
  disabled = false
}: { 
  value: string; 
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const editor = useEditor({
    extensions,
    content: value,
    immediatelyRender: false,
    editable: !disabled,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        onChange(html);
      }, 500);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm prose-slate max-w-none focus:outline-none min-h-[80px]',
      },
    },
  });

  // Keep content in sync only if value prop changes from an external source
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      // Small optimization: only update if the change is significant
      // and we are not currently focused (to avoid jumping while typing)
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
    return <div className="min-h-[80px] border border-slate-200 rounded animate-pulse bg-slate-50"></div>;
  }

  const toggleBtnClass = "p-1.5 rounded hover:bg-slate-200 text-slate-700 transition-colors";
  const activeBtnClass = "p-1.5 rounded bg-blue-100 text-blue-700 transition-colors";

  return (
    <div className={`border rounded overflow-hidden shadow-sm transition-all ${disabled ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-300 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500'}`}>
      {!disabled && (
        <div className="bg-slate-100 border-b border-slate-300 p-1 flex gap-1 items-center flex-wrap">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive('bold') ? activeBtnClass : toggleBtnClass}
          title="Kalın"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive('italic') ? activeBtnClass : toggleBtnClass}
          title="İtalik"
        >
          <Italic className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={editor.isActive('underline') ? activeBtnClass : toggleBtnClass}
          title="Altı Çizili"
        >
          <UnderlineIcon className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-slate-300 mx-1"></div>

        <button
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          className={editor.isActive({ textAlign: 'left' }) ? activeBtnClass : toggleBtnClass}
          title="Sola Hizala"
        >
          <AlignLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          className={editor.isActive({ textAlign: 'center' }) ? activeBtnClass : toggleBtnClass}
          title="Ortala"
        >
          <AlignCenter className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          className={editor.isActive({ textAlign: 'right' }) ? activeBtnClass : toggleBtnClass}
          title="Sağa Hizala"
        >
          <AlignRight className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}
          className={editor.isActive({ textAlign: 'justify' }) ? activeBtnClass : toggleBtnClass}
          title="Yasla"
        >
          <AlignJustify className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-slate-300 mx-1"></div>

        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive('bulletList') ? activeBtnClass : toggleBtnClass}
          title="Madde İşaretli Liste"
        >
          <List className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={editor.isActive('orderedList') ? activeBtnClass : toggleBtnClass}
          title="Numaralı Liste"
        >
          <ListOrdered className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={editor.isActive('blockquote') ? activeBtnClass : toggleBtnClass}
          title="Alıntı"
        >
          <Quote className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          className={toggleBtnClass}
          title="Yatay Çizgi"
        >
          <Minus className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-slate-300 mx-1"></div>

        <button
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className={toggleBtnClass + " disabled:opacity-30"}
          title="Geri Al"
        >
          <Undo className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className={toggleBtnClass + " disabled:opacity-30"}
          title="İleri Al"
        >
          <Redo className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
          className={toggleBtnClass}
          title="Formatı Temizle"
        >
          <Eraser className="w-4 h-4" />
        </button>
      </div>
      )}
      <div className="p-3">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
