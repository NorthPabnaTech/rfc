'use client';

import 'quill/dist/quill.snow.css';

import * as React from 'react';
import Quill from 'quill';

import { cn } from '@lib/utils';

export interface RichTextEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  readOnly?: boolean;
}

export function RichTextEditor({
  value = '',
  onChange,
  placeholder = 'Write your notes or special instructions...',
  className,
  readOnly = false,
}: RichTextEditorProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const quillRef = React.useRef<Quill | null>(null);
  const isInternalChangeRef = React.useRef(false);

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Clean any prior contents
    container.innerHTML = '';

    const editorDiv = document.createElement('div');
    container.appendChild(editorDiv);

    const quill = new Quill(editorDiv, {
      theme: 'snow',
      placeholder: readOnly ? '' : placeholder,
      readOnly,
      modules: {
        toolbar: readOnly
          ? false
          : [
              [{ header: [1, 2, 3, false] }],
              ['bold', 'italic', 'underline', 'strike'],
              [{ list: 'ordered' }, { list: 'bullet' }],
              ['blockquote', 'code-block'],
              ['link'],
              ['clean'],
            ],
      },
    });

    quillRef.current = quill;

    if (value) {
      quill.root.innerHTML = value;
    }

    quill.on('text-change', () => {
      isInternalChangeRef.current = true;
      const html = quill.root.innerHTML;
      const cleanHtml = html === '<p><br></p>' ? '' : html;
      onChange?.(cleanHtml);
      setTimeout(() => {
        isInternalChangeRef.current = false;
      }, 0);
    });

    return () => {
      quillRef.current = null;
      container.innerHTML = '';
    };
    // Initializes Quill once on mount; `value`/`onChange`/`placeholder`/`readOnly`
    // are intentionally read only at init time (synced separately below).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep editor synced with external updates if any
  React.useEffect(() => {
    if (!quillRef.current || isInternalChangeRef.current) return;
    const currentHtml = quillRef.current.root.innerHTML;
    if (value !== currentHtml && (value || currentHtml !== '<p><br></p>')) {
      quillRef.current.root.innerHTML = value || '';
    }
  }, [value]);

  return (
    <div
      className={cn(
        'rich-text-editor border-line text-ink overflow-hidden rounded-lg border bg-white',
        readOnly && 'bg-well/20',
        '[&_.ql-toolbar]:border-line [&_.ql-toolbar]:bg-well/30 [&_.ql-toolbar]:border-0 [&_.ql-toolbar]:border-b [&_.ql-toolbar]:px-3 [&_.ql-toolbar]:py-2',
        '[&_.ql-container]:border-0 [&_.ql-container]:font-sans [&_.ql-container]:text-xs sm:[&_.ql-container]:text-sm',
        '[&_.ql-editor.ql-blank::before]:text-muted [&_.ql-editor]:min-h-[140px] [&_.ql-editor]:px-4 [&_.ql-editor]:py-3 [&_.ql-editor.ql-blank::before]:font-normal [&_.ql-editor.ql-blank::before]:not-italic',
        readOnly && '[&_.ql-editor]:min-h-[90px] [&_.ql-editor]:cursor-default',
        className,
      )}
    >
      <div ref={containerRef} />
    </div>
  );
}
