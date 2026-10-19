'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import {
  answerQuestionAction,
  deleteQuestionAction,
  setQuestionHiddenAction,
} from '@/actions/admin';
import type { Paginated, QuestionDTO } from '@/types';
import { Pager } from '@components/common/pager';
import { Icon } from '@components/icon/icon';
import { ConfirmDialog, EmptyState, StatusBadge } from '@components/shared';
import { Button } from '@components/ui/button';
import { Textarea } from '@components/ui/textarea';
import { useUrlFilters } from '@hooks/use-url-filters';
import { handleActionResult } from '@lib/action-client';
import { formatStoreDateTime } from '@lib/utils';

export function QuestionsList({ data }: { data: Paginated<QuestionDTO> }) {
  const router = useRouter();
  const { params } = useUrlFilters();
  const [deleting, setDeleting] = React.useState<QuestionDTO | null>(null);

  if (data.items.length === 0)
    return <EmptyState title="No questions" description="Customer questions will appear here." />;

  const hrefFor = (page: number) => {
    const next = new URLSearchParams(params.toString());
    if (page === 1) next.delete('page');
    else next.set('page', String(page));
    return `/admin/questions?${next.toString()}`;
  };

  return (
    <>
      <ul className="grid gap-3">
        {data.items.map((q) => (
          <QuestionCard
            key={q.id}
            q={q}
            onDelete={() => setDeleting(q)}
            onChanged={() => router.refresh()}
          />
        ))}
      </ul>
      <Pager className="mt-6" page={data.page} pageCount={data.pageCount} hrefFor={hrefFor} />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        tone="danger"
        title="Delete this question?"
        confirmLabel="Delete"
        onConfirm={async () => {
          if (!deleting) return;
          const res = await deleteQuestionAction(deleting.id);
          if (handleActionResult(res)) router.refresh();
        }}
      />
    </>
  );
}

function QuestionCard({
  q,
  onDelete,
  onChanged,
}: {
  q: QuestionDTO;
  onDelete: () => void;
  onChanged: () => void;
}) {
  const [answer, setAnswer] = React.useState(q.answer ?? '');
  const [editing, setEditing] = React.useState(!q.answer);
  const [busy, setBusy] = React.useState(false);

  return (
    <li className="bg-panel hairline rounded-xl2 p-5">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {q.answer ? (
              <StatusBadge status="ok" label="Answered" />
            ) : (
              <StatusBadge status="warn" label="Awaiting answer" />
            )}
            {q.isHidden && <StatusBadge status="neutral" label="Hidden" />}
            <span className="text-subtle text-xs">
              {q.userName} · {formatStoreDateTime(q.createdAt)}
            </span>
          </div>
          {q.productSlug && (
            <Link
              href={`/products/${q.productSlug}`}
              target="_blank"
              className="text-accent mt-1 inline-flex items-center gap-1 text-[12.5px] font-semibold hover:underline"
            >
              {q.productName} <Icon name="external" size={11} />
            </Link>
          )}
          <p className="text-ink mt-2 font-medium">Q: {q.question}</p>
        </div>
        <div className="flex gap-1.5">
          <Button
            size="sm"
            variant="secondary"
            onClick={async () => {
              const res = await setQuestionHiddenAction(q.id, !q.isHidden);
              if (handleActionResult(res)) onChanged();
            }}
          >
            <Icon name={q.isHidden ? 'eye' : 'eyeOff'} size={14} /> {q.isHidden ? 'Show' : 'Hide'}
          </Button>
          <Button size="sm" variant="ghost" onClick={onDelete} aria-label="Delete question">
            <Icon name="trash" size={14} />
          </Button>
        </div>
      </div>

      {editing ? (
        <div className="mt-3 space-y-2">
          <Textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            rows={2}
            placeholder="Write your answer…"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="primary"
              disabled={busy || !answer.trim()}
              onClick={async () => {
                setBusy(true);
                const res = await answerQuestionAction({ questionId: q.id, answer });
                setBusy(false);
                if (handleActionResult(res)) {
                  setEditing(false);
                  onChanged();
                }
              }}
            >
              {q.answer ? 'Update answer' : 'Publish answer'}
            </Button>
            {q.answer && (
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-surface mt-3 flex items-start gap-3 rounded-xl px-4 py-3">
          <p className="text-base-700 flex-1 text-sm">
            <span className="font-semibold text-[var(--status-ok-fg)]">A:</span> {q.answer}
          </p>
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
            <Icon name="pencil" size={13} /> Edit
          </Button>
        </div>
      )}
    </li>
  );
}
