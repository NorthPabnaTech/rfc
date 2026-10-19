/**
 * Shared size scale for field-shaped controls (input, select, textarea, date /
 * time pickers) and used to keep buttons aligned. `lg` is the system default —
 * larger, more comfortable controls; `md` is the compact variant; `sm` is for
 * dense internal UI (e.g. the table page-size picker), not a form variant.
 */
export type FieldSize = 'lg' | 'md' | 'sm';

/** Control height per size. */
export const FIELD_HEIGHT: Record<FieldSize, string> = {
  lg: 'h-10',
  md: 'h-9',
  sm: 'h-8',
};

/** Control text size per size. */
export const FIELD_TEXT: Record<FieldSize, string> = {
  lg: 'text-sm',
  md: 'text-[13px]',
  sm: 'text-[12px]',
};
