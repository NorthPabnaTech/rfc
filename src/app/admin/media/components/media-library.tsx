'use client';

import * as React from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useRouter } from 'nextjs-toploader/app';

import {
  checkMediaReferencesAction,
  deleteMediaAssetAction,
  syncCloudinaryMediaAction,
} from '@/actions/admin';
import { ProductImage } from '@/features/products/product-image';
import { ImageUploader } from '@/features/uploads/image-uploader';
import type { ImageDTO, MediaAssetDTO, MediaReferenceDTO, Paginated } from '@/types';
import { Icon } from '@components/icon/icon';
import { Callout, EmptyState, Spinner } from '@components/shared';
import { Badge } from '@components/ui/badge';
import { Button } from '@components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@components/ui/dialog';
import type { UploadPurpose } from '@lib/constants';
import { toast } from '@lib/toast';
import { formatDate } from '@lib/utils';

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

const UPLOAD_PURPOSE_OPTIONS: { value: UploadPurpose; label: string }[] = [
  { value: 'products', label: 'Products' },
  { value: 'categories', label: 'Categories' },
  { value: 'banners', label: 'Banners' },
  { value: 'expenses', label: 'Expenses' },
];

export function MediaLibrary({ data }: { data: Paginated<MediaAssetDTO> }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [preview, setPreview] = React.useState<MediaAssetDTO | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<MediaAssetDTO | null>(null);
  const [checkingRefs, setCheckingRefs] = React.useState(false);
  const [refs, setRefs] = React.useState<MediaReferenceDTO[]>([]);
  const [deleting, setDeleting] = React.useState(false);
  const [syncing, setSyncing] = React.useState(false);
  const [uploadOpen, setUploadOpen] = React.useState(false);
  const [uploadPurpose, setUploadPurpose] = React.useState<UploadPurpose>('products');
  const [uploadedPreview, setUploadedPreview] = React.useState<ImageDTO[]>([]);

  const goToPage = (nextPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (nextPage <= 1) params.delete('page');
    else params.set('page', String(nextPage));
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Media URL copied to clipboard');
    } catch {
      toast.error('Could not copy URL');
    }
  };

  const openDelete = async (asset: MediaAssetDTO) => {
    setDeleteTarget(asset);
    setRefs([]);
    setCheckingRefs(true);
    const res = await checkMediaReferencesAction(asset.id);
    setCheckingRefs(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setRefs(res.data ?? []);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await deleteMediaAssetAction(deleteTarget.id);
    setDeleting(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success('Media file deleted from storage and library');
    setDeleteTarget(null);
    if (preview?.id === deleteTarget.id) setPreview(null);
    router.refresh();
  };

  const handleSync = async () => {
    setSyncing(true);
    const res = await syncCloudinaryMediaAction();
    setSyncing(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    const imported = res.data?.imported ?? 0;
    toast.success(
      imported > 0
        ? `Imported ${imported} existing image${imported === 1 ? '' : 's'} from Cloudinary`
        : 'Media library is already up to date with Cloudinary',
    );
    router.refresh();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-subtle text-sm">
          {data.total} {data.total === 1 ? 'file' : 'files'} in library
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="secondary" onClick={handleSync} disabled={syncing}>
            <Icon name="refresh" size={15} className={syncing ? 'animate-spin' : undefined} />
            {syncing ? 'Syncing…' : 'Sync Cloudinary'}
          </Button>
          <Button
            type="button"
            onClick={() => {
              setUploadedPreview([]);
              setUploadOpen(true);
            }}
          >
            <Icon name="upload" size={15} /> Upload Media
          </Button>
        </div>
      </div>

      {data.items.length === 0 ? (
        <EmptyState
          title="No media files found"
          description="Upload images from here or any product, category, banner, or expense form—or sync existing files from Cloudinary."
          action={
            <Button type="button" variant="secondary" onClick={handleSync} disabled={syncing}>
              <Icon name="refresh" size={15} /> Sync from Cloudinary
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {data.items.map((asset) => (
            <div
              key={asset.id}
              className="group bg-surface hairline flex flex-col overflow-hidden rounded-2xl transition hover:shadow-sm"
            >
              <button
                type="button"
                onClick={() => setPreview(asset)}
                className="bg-well relative aspect-square w-full overflow-hidden text-left"
              >
                <ProductImage
                  src={asset.url}
                  alt={asset.filename}
                  width={300}
                  height={300}
                  className="size-full object-cover transition duration-300 group-hover:scale-105"
                />
                <span className="bg-ink/70 absolute top-2 left-2 rounded-md px-1.5 py-0.5 text-[10px] font-semibold text-white uppercase">
                  {asset.format ?? 'img'}
                </span>
              </button>

              <div className="flex flex-1 flex-col justify-between gap-2 p-3">
                <div className="min-w-0">
                  <p className="text-ink truncate text-xs font-semibold" title={asset.filename}>
                    {asset.filename}
                  </p>
                  <p className="text-subtle mt-0.5 text-[11px]">
                    {formatBytes(asset.bytes)}
                    {asset.width && asset.height ? ` · ${asset.width}×${asset.height}` : ''}
                  </p>
                  <div className="mt-1.5 flex items-center justify-between gap-1">
                    <Badge tone="neutral" className="text-[10px] capitalize">
                      {asset.purpose}
                    </Badge>
                    <span className="text-subtle text-[10px]">{formatDate(asset.createdAt)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-1 border-t border-black/5 pt-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setPreview(asset)}
                    aria-label="Preview media"
                    className="h-7 px-2 text-xs"
                  >
                    <Icon name="eye" size={13} />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => void copyUrl(asset.url)}
                    aria-label="Copy URL"
                    className="h-7 px-2 text-xs"
                  >
                    <Icon name="copy" size={13} />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => void openDelete(asset)}
                    aria-label="Delete media"
                    className="text-danger hover:text-danger h-7 px-2 text-xs"
                  >
                    <Icon name="trash" size={13} />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {data.pageCount > 1 && (
        <div className="flex items-center justify-between border-t border-black/5 pt-4 text-sm">
          <span className="text-subtle">
            Page {data.page} of {data.pageCount}
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={data.page <= 1}
              onClick={() => goToPage(data.page - 1)}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={data.page >= data.pageCount}
              onClick={() => goToPage(data.page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      <Dialog open={Boolean(preview)} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="truncate">{preview?.filename ?? 'Media Preview'}</DialogTitle>
            <DialogDescription>
              Uploaded {preview ? formatDate(preview.createdAt) : ''}
              {preview?.uploadedByName ? ` by ${preview.uploadedByName}` : ''}
            </DialogDescription>
          </DialogHeader>
          {preview && (
            <DialogBody className="space-y-4">
              <div className="bg-well flex max-h-[360px] items-center justify-center overflow-hidden rounded-xl p-2">
                <ProductImage
                  src={preview.url}
                  alt={preview.filename}
                  width={preview.width ?? 800}
                  height={preview.height ?? 800}
                  className="max-h-[340px] w-auto rounded-lg object-contain"
                />
              </div>

              <dl className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                <div className="bg-well rounded-lg p-2.5">
                  <dt className="text-subtle">Folder</dt>
                  <dd className="text-ink mt-0.5 font-semibold capitalize">{preview.purpose}</dd>
                </div>
                <div className="bg-well rounded-lg p-2.5">
                  <dt className="text-subtle">Format</dt>
                  <dd className="text-ink mt-0.5 font-semibold uppercase">
                    {preview.format ?? preview.mimeType ?? '—'}
                  </dd>
                </div>
                <div className="bg-well rounded-lg p-2.5">
                  <dt className="text-subtle">File Size</dt>
                  <dd className="text-ink mt-0.5 font-semibold">{formatBytes(preview.bytes)}</dd>
                </div>
                <div className="bg-well rounded-lg p-2.5">
                  <dt className="text-subtle">Dimensions</dt>
                  <dd className="text-ink mt-0.5 font-semibold">
                    {preview.width && preview.height ? `${preview.width} × ${preview.height}` : '—'}
                  </dd>
                </div>
              </dl>

              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={preview.url}
                  aria-label="Media URL"
                  className="input-flat h-9 min-w-0 flex-1 px-3 text-xs"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => void copyUrl(preview.url)}
                >
                  <Icon name="copy" size={14} /> Copy URL
                </Button>
              </div>
            </DialogBody>
          )}
          <DialogFooter>
            {preview && (
              <Button
                type="button"
                variant="danger"
                onClick={() => void openDelete(preview)}
                className="mr-auto"
              >
                <Icon name="trash" size={14} /> Delete
              </Button>
            )}
            <Button type="button" variant="secondary" onClick={() => setPreview(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal with Reference Checking */}
      <Dialog open={Boolean(deleteTarget)} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Media File</DialogTitle>
            <DialogDescription>
              This permanently removes the file from Cloudinary storage and the media library.
            </DialogDescription>
          </DialogHeader>
          {deleteTarget && (
            <DialogBody className="space-y-4">
              <div className="bg-well flex items-center gap-3 rounded-xl p-3">
                <ProductImage
                  src={deleteTarget.url}
                  alt={deleteTarget.filename}
                  width={64}
                  height={64}
                  className="size-14 shrink-0 rounded-lg object-cover"
                />
                <div className="min-w-0">
                  <p className="text-ink truncate text-sm font-semibold">{deleteTarget.filename}</p>
                  <p className="text-subtle text-xs">
                    {deleteTarget.purpose} · {formatBytes(deleteTarget.bytes)}
                  </p>
                </div>
              </div>

              {checkingRefs ? (
                <div className="flex items-center gap-2 text-sm">
                  <Spinner size="sm" />
                  <span className="text-subtle">Checking where this media is used…</span>
                </div>
              ) : refs.length > 0 ? (
                <Callout tone="danger" title="This file is actively in use">
                  <p className="mb-2">
                    Deletion is blocked to prevent broken images. Remove or replace it in these
                    items first:
                  </p>
                  <ul className="list-disc space-y-1 pl-4 text-xs">
                    {refs.map((r) => (
                      <li key={`${r.kind}-${r.id}`}>
                        <span className="font-semibold">{r.kind}:</span> {r.label}
                      </li>
                    ))}
                  </ul>
                </Callout>
              ) : (
                <Callout tone="warn" title="No active references found">
                  This file is not referenced by any product, category, banner, expense, or review.
                  Are you sure you want to delete it permanently?
                </Callout>
              )}
            </DialogBody>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              disabled={deleting}
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={checkingRefs || deleting || refs.length > 0}
              onClick={() => void confirmDelete()}
            >
              {deleting ? 'Deleting…' : 'Delete Permanently'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Modal */}
      <Dialog
        open={uploadOpen}
        onOpenChange={(o) => {
          setUploadOpen(o);
          if (!o && uploadedPreview.length > 0) router.refresh();
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload to Media Library</DialogTitle>
            <DialogDescription>
              Files are deduplicated automatically and stored in Cloudinary.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <div>
              <label className="text-ink mb-1.5 block text-xs font-semibold">Target Folder</label>
              <select
                value={uploadPurpose}
                onChange={(e) => setUploadPurpose(e.target.value as UploadPurpose)}
                className="input-flat h-10 w-full px-3 text-sm"
              >
                {UPLOAD_PURPOSE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <ImageUploader
              value={uploadedPreview}
              onChange={(imgs) => setUploadedPreview(imgs)}
              purpose={uploadPurpose}
              max={10}
            />
          </DialogBody>
          <DialogFooter>
            <Button
              type="button"
              onClick={() => {
                setUploadOpen(false);
                if (uploadedPreview.length > 0) router.refresh();
              }}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
