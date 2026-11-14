'use client';

import * as React from 'react';
import Image from 'next/image';

export function CustomerAvatar({ name, avatarUrl }: { name: string; avatarUrl?: string }) {
  const [failed, setFailed] = React.useState(false);
  const initial = name.trim().charAt(0).toUpperCase() || 'U';

  return (
    <span className="bg-brand/15 text-brand border-line relative grid size-14 shrink-0 place-items-center overflow-hidden rounded-full border text-xl font-bold">
      {avatarUrl && !failed ? (
        <Image
          src={avatarUrl}
          alt=""
          fill
          sizes="56px"
          className="object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        initial
      )}
    </span>
  );
}
