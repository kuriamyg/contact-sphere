import { avatarColour, initials } from '@/lib/avatar';

const SIZES = {
  sm: 'size-10 text-sm',
  md: 'size-14 text-lg',
  lg: 'size-20 text-2xl',
  xl: 'size-24 text-3xl',
} as const;

/**
 * A circle with a person's initials. `ring` adds the brand ring used on the
 * profile. Decorative: the name is always shown next to it as text.
 */
export function Avatar({
  name,
  colourKey,
  size = 'sm',
  ring = false,
}: {
  name: string;
  colourKey?: string;
  size?: keyof typeof SIZES;
  ring?: boolean;
}) {
  const circle = (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold select-none ${SIZES[size]} ${avatarColour(colourKey ?? name)}`}
    >
      {initials(name)}
    </span>
  );
  if (!ring) return circle;
  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 rounded-full bg-gradient-to-br from-emerald-400 via-teal-500 to-emerald-700 p-[3px]"
    >
      <span className="rounded-full bg-background p-[3px]">{circle}</span>
    </span>
  );
}
