'use client';

import * as React from 'react';

import { Icon } from '@components/icon/icon';
import { cn } from '@lib/utils';

/* ─────────────────────────────────────────────────────────────────────────
 * ImageUpload — single-image drag-and-drop / click-to-browse control.
 * No backend, so a dropped/selected file is read as a data URL and that
 * string becomes the field value (works interchangeably with a plain image
 * URL, so existing mock records render unchanged).
 * ──────────────────────────────────────────────────────────────────────── */

type Props = {
  value?: string;
  onChange?: (value: string | undefined) => void;
  onBlur?: () => void;
  id?: string;
  disabled?: boolean;
  className?: string;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
};

export function ImageUpload({ value, onChange, onBlur, id, disabled, className, ...aria }: Props) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = React.useState(false);

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => onChange?.(reader.result as string);
    reader.readAsDataURL(file);
  };

  if (value) {
    return (
      <div
        className={cn(
          'group border-line bg-well relative overflow-hidden rounded-lg border',
          className,
        )}
      >
        <img src={value} alt="" className="h-32 w-full object-cover" />
        <button
          type="button"
          onClick={() => onChange?.(undefined)}
          disabled={disabled}
          aria-label="Remove image"
          className="bg-ink/70 absolute top-2 right-2 grid size-7 place-items-center rounded-full text-white opacity-0 transition-opacity group-hover:opacity-100 disabled:pointer-events-none"
        >
          <Icon name="x" size={14} className="text-white" />
        </button>
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      id={id}
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={(e) => {
        if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (!disabled) handleFiles(e.dataTransfer.files);
      }}
      onBlur={onBlur}
      className={cn(
        'border-line bg-well hover:bg-well/70 flex h-32 w-full flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed text-center transition-colors',
        !disabled && 'cursor-pointer',
        dragOver && 'border-brand bg-brand-soft/40',
        disabled && 'pointer-events-none opacity-50',
        className,
      )}
      {...aria}
    >
      <Icon name="upload" size={20} className="text-subtle" />
      <p className="text-ink text-[12.5px] font-medium">Click to upload or drag and drop</p>
      <p className="text-subtle text-[11px]">PNG or JPG, up to 5MB</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        disabled={disabled}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
