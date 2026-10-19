'use client';

import * as React from 'react';

import { ProductImage } from '@/features/products/product-image';
import type { ImageDTO } from '@/types';
import { Icon } from '@components/icon/icon';
import { Spinner } from '@components/shared';
import { Button } from '@components/ui/button';
import { ACCEPTED_IMAGE_TYPES, MAX_UPLOAD_BYTES, type UploadPurpose } from '@lib/constants';
import { toast } from '@lib/toast';
import { cn } from '@lib/utils';

export async function uploadFiles(files: File[], purpose: UploadPurpose): Promise<ImageDTO[]> {
  const body = new FormData();
  body.set('purpose', purpose);
  files.forEach((f) => body.append('files', f));
  const res = await fetch('/api/upload', { method: 'POST', body });
  const json = (await res.json().catch(() => ({}))) as { images?: ImageDTO[]; error?: string };
  if (!res.ok || !json.images) throw new Error(json.error ?? 'Upload failed');
  return json.images;
}

type Props = {
  value: ImageDTO[];
  onChange: (images: ImageDTO[]) => void;
  purpose: UploadPurpose;
  max?: number;
  /** Allow pasting external image URLs (admin: supplier product photos). */
  allowUrl?: boolean;
  /** Allow drag-reordering; the first image is the cover. */
  sortable?: boolean;
  disabled?: boolean;
  className?: string;
};

/**
 * Multi-image field: upload to Cloudinary and/or add external URLs, mixed
 * freely in one ordered list. The first image is the cover.
 */
export function ImageUploader({
  value,
  onChange,
  purpose,
  max = 10,
  allowUrl = false,
  sortable = false,
  disabled,
  className,
}: Props) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(0);
  const [dragOver, setDragOver] = React.useState(false);
  const [url, setUrl] = React.useState('');
  const [dragIndex, setDragIndex] = React.useState<number | null>(null);
  const remaining = max - value.length;

  const handleFiles = async (list: FileList | null) => {
    if (!list?.length) return;
    let files = Array.from(list);
    const bad = files.find(
      (f) => !ACCEPTED_IMAGE_TYPES.includes(f.type) || f.size > MAX_UPLOAD_BYTES,
    );
    if (bad) {
      toast.error('Unsupported image', { description: 'Use JPG, PNG, WebP or AVIF under 5 MB.' });
      files = files.filter((f) => f !== bad);
    }
    if (files.length > remaining) {
      toast.warning(`Only ${remaining} more image(s) allowed`);
      files = files.slice(0, Math.max(0, remaining));
    }
    if (!files.length) return;

    setUploading(files.length);
    try {
      const uploaded = await uploadFiles(files, purpose);
      onChange([...value, ...uploaded]);
    } catch (e) {
      toast.error('Upload failed', { description: e instanceof Error ? e.message : undefined });
    } finally {
      setUploading(0);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const addUrl = () => {
    const trimmed = url.trim();
    if (!/^https?:\/\/\S+$/i.test(trimmed)) {
      toast.error('Enter a full image URL starting with https://');
      return;
    }
    if (remaining <= 0) return;
    onChange([...value, { type: 'external', url: trimmed }]);
    setUrl('');
  };

  const move = (from: number, to: number) => {
    if (from === to) return;
    const next = [...value];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item!);
    onChange(next);
  };

  return (
    <div className={cn('space-y-3', className)}>
      {(value.length > 0 || uploading > 0) && (
        <ul className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5">
          {value.map((img, i) => (
            <li
              key={`${img.url}-${i}`}
              draggable={sortable && !disabled}
              onDragStart={() => setDragIndex(i)}
              onDragOver={(e) => sortable && e.preventDefault()}
              onDrop={() => {
                if (dragIndex !== null) move(dragIndex, i);
                setDragIndex(null);
              }}
              className={cn(
                'group bg-well hairline relative aspect-square overflow-hidden rounded-xl',
                sortable && 'cursor-grab active:cursor-grabbing',
                dragIndex === i && 'opacity-40',
              )}
            >
              <ProductImage src={img.url} alt={img.alt ?? ''} fill sizes="140px" />
              <span className="absolute bottom-1.5 left-1.5 flex gap-1">
                {i === 0 && sortable && (
                  <span className="bg-noir rounded-full px-2 py-0.5 text-[10px] font-semibold text-white">
                    Cover
                  </span>
                )}
                <span className="text-ink rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-medium">
                  {img.type === 'cloudinary' ? 'Uploaded' : 'URL'}
                </span>
              </span>
              {!disabled && (
                <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
                  {sortable && i > 0 && (
                    <button
                      type="button"
                      onClick={() => move(i, 0)}
                      aria-label="Make cover image"
                      title="Make cover"
                      className="bg-ink/70 grid size-7 place-items-center rounded-full text-white"
                    >
                      <Icon name="star" size={13} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onChange(value.filter((_, j) => j !== i))}
                    aria-label="Remove image"
                    className="bg-ink/70 grid size-7 place-items-center rounded-full text-white"
                  >
                    <Icon name="x" size={13} />
                  </button>
                </div>
              )}
            </li>
          ))}
          {Array.from({ length: uploading }).map((_, i) => (
            <li
              key={`up-${i}`}
              className="bg-well hairline grid aspect-square place-items-center rounded-xl"
            >
              <Spinner size="md" />
            </li>
          ))}
        </ul>
      )}

      {remaining > 0 && !disabled && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) =>
            (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), inputRef.current?.click())
          }
          onDragOver={(e) => {
            if (e.dataTransfer.types.includes('Files')) {
              e.preventDefault();
              setDragOver(true);
            }
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            if (!e.dataTransfer.files.length) return;
            e.preventDefault();
            setDragOver(false);
            void handleFiles(e.dataTransfer.files);
          }}
          className={cn(
            'focus-ring flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed px-4 py-6 text-center transition',
            dragOver
              ? 'border-brand bg-brand-soft'
              : 'border-line-2 hover:border-brand-400 hover:bg-well/60',
          )}
        >
          <Icon name="upload" size={20} className="text-accent" />
          <p className="text-ink text-[13px] font-semibold">
            {uploading ? 'Uploading…' : 'Click or drop images to upload'}
          </p>
          <p className="text-subtle text-[11.5px]">
            JPG, PNG, WebP · max 5 MB · {remaining} more allowed
          </p>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_IMAGE_TYPES.join(',')}
            multiple={max > 1}
            hidden
            onChange={(e) => void handleFiles(e.target.files)}
          />
        </div>
      )}

      {allowUrl && remaining > 0 && !disabled && (
        <div className="flex gap-2">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addUrl();
              }
            }}
            placeholder="…or paste an image URL (e.g. from the supplier site)"
            aria-label="Image URL"
            className="input-flat h-10 min-w-0 flex-1 px-3 text-sm"
          />
          <Button type="button" variant="secondary" onClick={addUrl}>
            <Icon name="link" size={15} /> Add URL
          </Button>
        </div>
      )}
    </div>
  );
}
