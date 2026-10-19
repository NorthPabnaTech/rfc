import { Tabs } from '@components/ui/tabs';

export type ViewMode = 'grid' | 'list';

type Props = {
  size?: 'sm' | 'md' | 'lg';
  value: ViewMode;
  onChange: (next: ViewMode) => void;
};

export function ViewToggle({ size = 'lg', value, onChange }: Props) {
  return (
    <Tabs<ViewMode>
      size={size}
      value={value}
      aria-label="View mode"
      onValueChange={onChange}
      items={[
        { value: 'grid', label: 'Grid', icon: 'grid' },
        { value: 'list', label: 'List', icon: 'list' },
      ]}
    />
  );
}
