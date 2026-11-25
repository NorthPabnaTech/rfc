import type { Metadata } from 'next';

import { listTags } from '@/services/catalog';
import { PageHeader } from '@components/shared';
import { requireAdminPage } from '@lib/auth/current-user';

import { TagsManager } from './components/tags-manager';

export const metadata: Metadata = { title: 'Tags' };

export default async function TagsPage() {
  await requireAdminPage();
  const tags = await listTags();
  return (
    <>
      <PageHeader
        title="Tags"
        description="Short labels customers can filter by, e.g. “Gift idea”, “Leather”, “Summer”."
      />
      <TagsManager tags={tags} />
    </>
  );
}
