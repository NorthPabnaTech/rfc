import { Icon, type IconRegistryKey } from '@components/icon/icon';
import { cn } from '@lib/utils';

/*
 * Product imagery. Real images (http/data URLs) render as <img>; the mock
 * catalog uses "art:<n>" tokens which draw a themed illustration tile — a
 * gradient from the palette with the category icon — so the demo works
 * offline without external image hosts.
 */

const GRADIENTS = [
  ['#8ecae6', '#219ebc'],
  ['#ffb703', '#fb8500'],
  ['#219ebc', '#023047'],
  ['#c6e8f2', '#5fb6d8'],
  ['#ffcb52', '#ffb703'],
  ['#5fb6d8', '#136780'],
  ['#fb8500', '#d96f00'],
  ['#e3f4f9', '#8ecae6'],
] as const;

export function ProductImage({
  src,
  alt,
  icon = 'box',
  className,
  iconSize,
  rounded = 'rounded-xl',
}: {
  src?: string;
  alt: string;
  icon?: string;
  className?: string;
  iconSize?: number;
  rounded?: string;
}) {
  if (src && !src.startsWith('art:')) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt} className={cn('object-cover', rounded, className)} loading="lazy" />
    );
  }
  const n = Number(src?.split(':')[1] ?? 0) || 0;
  const [a, b] = GRADIENTS[n % GRADIENTS.length]!;
  const angle = 120 + ((n * 37) % 90);
  return (
    <div
      role="img"
      aria-label={alt}
      className={cn('relative grid place-items-center overflow-hidden', rounded, className)}
      style={{ background: `linear-gradient(${angle}deg, ${a}, ${b})` }}
    >
      <span
        className="absolute -top-1/4 -right-1/4 size-3/4 rounded-full bg-white/20 blur-2xl"
        aria-hidden
      />
      <span
        className="absolute bottom-0 left-0 h-1/3 w-full bg-gradient-to-t from-black/10 to-transparent"
        aria-hidden
      />
      <Icon
        name={(icon as IconRegistryKey) ?? 'box'}
        size={iconSize ?? 40}
        stroke={1.4}
        className="relative text-white drop-shadow-[0_2px_6px_rgba(2,48,71,0.35)]"
      />
    </div>
  );
}
