'use client';

import * as React from 'react';

import { listMediaAssetsAction } from '@/actions/admin';
import { ProductImage } from '@/features/products/product-image';
import type { ImageDTO, MediaAssetDTO } from '@/types';
import { Icon } from '@components/icon/icon';
import { Spinner } from '@components/shared';
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
import { cn } from '@lib/utils';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purpose: UploadPurpose;
  maxSelect: number;
  selectedUrls: string[];
  onSelect: (images: ImageDTO[]) => void;
};

export function MediaPickerDialog({
  open,
  onOpenChange,
  purpose,
  maxSelect,
  selectedUrls,
  onSelect,
}: Props) {
  const [items, setItems] = React.useState<MediaAssetDTO[]>([]);
  const [pageCount, setPageCount] = React.useState(1);
  const [page, setPage] = React.useState(1);
  const [q, setQ] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [picked, setPicked] = React.useState<Record<string, MediaAssetDTO>>({});

  const loadPage = React.useCallback(
    async (nextPage: number, nextQ: string) => {
      setLoading(true);
      const res = await listMediaAssetsAction({
        purpose,
        page: nextPage,
        q: nextQ.trim() || undefined,
      });
      setLoading(false);
      if (!res.ok || !res.data) {
        toast.error(res.ok ? 'Failed to load media library' : res.error);
        return;
      }
      setItems(res.data.items);
      setPageCount(res.data.pageCount);
      setPage(res.data.page);
    },
    [purpose],
  );

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
    if (nextOpen) {
      setPicked({});
      setQ('');
      void loadPage(1, '');
    }
  };

  // Trigger initial load when controlled `open` flips to true from parent.
  const prevOpen = React.useRef(false);
  React.useEffect(() => {
    if (open && !prevOpen.current) {
      prevOpen.current = true;
      void (async () => {
        const res = await listMediaAssetsAction({ purpose, page: 1 });
        if (res.ok && res.data) {
          setItems(res.data.items);
          setPageCount(res.data.pageCount);
          setPage(res.data.page);
        }
      })();
    } else if (!open) {
      prevOpen.current = false;
    }
  }, [open, purpose]);

  const togglePick = (asset: MediaAssetDTO) => {
    if (selectedUrls.includes(asset.url)) return;
    setPicked((prev) => {
      if (prev[asset.id]) {
        const copy = { ...prev };
        delete copy[asset.id];
        return copy;
      }
      const count = Object.keys(prev).length;
      if (maxSelect === 1) return { [asset.id]: asset };
      if (count >= maxSelect) {
        toast.error(`You can select at most ${maxSelect} more image${maxSelect === 1 ? '' : 's'}`);
        return prev;
      }
      return { ...prev, [asset.id]: asset };
    });
  };

  const confirmSelection = () => {
    const chosen = Object.values(picked).map<ImageDTO>((a) => ({
      type: 'cloudinary',
      url: a.url,
      publicId: a.publicId,
      width: a.width,
      height: a.height,
    }));
    if (chosen.length) onSelect(chosen);
    setPicked({});
    onOpenChange(false);
  };

  const pickedCount = Object.keys(picked).length;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Choose from Media Library</DialogTitle>
          <DialogDescription>
            Select existing {purpose} images to reuse without uploading duplicates.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void loadPage(1, q);
            }}
            className="flex gap-2"
          >
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by filename…"
              className="input-flat h-10 min-w-0 flex-1 px-3 text-sm"
            />
            <Button type="submit" variant="secondary" disabled={loading}>
              <Icon name="search" size={15} /> Search
            </Button>
          </form>

          {loading ? (
            <div className="grid place-items-center py-12">
              <Spinner size="md" />
            </div>
          ) : items.length === 0 ? (
            <p className="text-subtle py-10 text-center text-sm">
              No {purpose} images found in the media library yet.
            </p>
          ) : (
            <div className="grid max-h-[360px] grid-cols-3 gap-3 overflow-y-auto pr-1 sm:grid-cols-4 md:grid-cols-5">
              {items.map((asset) => {
                const alreadyAdded = selectedUrls.includes(asset.url);
                const isPicked = Boolean(picked[asset.id]);
                return (
                  <button
                    key={asset.id}
                    type="button"
                    disabled={alreadyAdded}
                    onClick={() => togglePick(asset)}
                    className={cn(
                      'group bg-well relative overflow-hidden rounded-xl border text-left transition',
                      alreadyAdded && 'cursor-not-allowed opacity-45',
                      isPicked
                        ? 'border-brand ring-brand/30 ring-2'
                        : 'border-line hover:border-brand-400',
                    )}
                  >
                    <div className="aspect-square w-full overflow-hidden">
                      <ProductImage
                        src={asset.url}
                        alt={asset.filename}
                        width={200}
                        height={200}
                        className="size-full object-cover"
                      />
                    </div>
                    <div className="p-1.5">
                      <p className="text-ink truncate text-[11px] font-medium">{asset.filename}</p>
                    </div>
                    {isPicked && (
                      <span className="bg-brand text-brand-ink absolute top-1.5 right-1.5 grid size-5 place-items-center rounded-full">
                        <Icon name="check" size={12} />
                      </span>
                    )}
                    {alreadyAdded && (
                      <span className="bg-ink/75 absolute inset-x-1.5 top-1.5 rounded px-1.5 py-0.5 text-center text-[10px] font-medium text-white">
                        Selected
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {pageCount > 1 && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-subtle">
                Page {page} of {pageCount}
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={page <= 1 || loading}
                  onClick={() => void loadPage(page - 1, q)}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={page >= pageCount || loading}
                  onClick={() => void loadPage(page + 1, q)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </DialogBody>

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={pickedCount === 0} onClick={confirmSelection}>
            Use {pickedCount > 0 ? `${pickedCount} ` : ''}image{pickedCount === 1 ? '' : 's'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
