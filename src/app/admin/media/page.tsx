import type { Metadata } from 'next';

import { listMediaAssets } from '@/services/media';
import { PageHeader } from '@components/shared';
import { UPLOAD_FOLDERS, type UploadPurpose } from '@lib/constants';
import { pageParam, param, type SearchParams } from '@lib/search-params';

import { ListToolbar } from '../components/list-toolbar';
import { MediaLibrary } from './components/media-library';

export const metadata: Metadata = { title: 'Media Library' };

const PURPOSES = Object.keys(UPLOAD_FOLDERS) as UploadPurpose[];

export default async function MediaLibraryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const purposeParam = param(sp, 'purpose');
  const purpose = PURPOSES.find((p) => p === purposeParam);

  const data = await listMediaAssets({
    q: param(sp, 'q'),
    purpose,
    from: param(sp, 'from'),
    to: param(sp, 'to'),
    page: pageParam(sp),
  });

  return (
    <>
      <PageHeader
        title="Media Library"
        description="Manage all uploaded images across products, categories, banners, and expenses."
      />
      <ListToolbar
        searchPlaceholder="Search by filename…"
        filters={[
          {
            name: 'purpose',
            label: 'All folders',
            options: PURPOSES.map((p) => ({
              value: p,
              label: p.charAt(0).toUpperCase() + p.slice(1),
            })),
          },
        ]}
      />
      <MediaLibrary data={data} />
    </>
  );
}
