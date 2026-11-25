import { cn } from '@lib/utils';

const COLORS = ['#219ebc', '#fb8500', '#023047', '#136780', '#d96f00', '#5fb6d8'];

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return (
    (parts[0]?.[0] ?? '') + (parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '')
  ).toUpperCase();
}

/** Initials avatar with a stable palette colour per name, or an image when `src` is provided. */
export function UserAvatar({
  name,
  src,
  color,
  size = 36,
  className,
}: {
  name: string;
  src?: string | null;
  color?: string;
  size?: number;
  className?: string;
}) {
  const hash = [...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  const bg = color ?? COLORS[hash % COLORS.length]!;
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        className={cn('shrink-0 rounded-full object-cover', className)}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className={cn(
        'grid shrink-0 place-items-center rounded-full font-bold text-white',
        className,
      )}
      style={{ width: size, height: size, background: bg, fontSize: Math.max(10, size * 0.36) }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}
