'use client';

import { PlatformLogo } from '@components/common/platform-logo';
import { LanguageSwitcher, ThemeSwitcher } from '@components/platform/switchers';

export function AuthTopbar() {
  return (
    <div className="flex h-16 items-center justify-between px-4 sm:px-8">
      <PlatformLogo size="sm" />
      <div className="flex items-center gap-1">
        <LanguageSwitcher />
        <ThemeSwitcher />
      </div>
    </div>
  );
}
