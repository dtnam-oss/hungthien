import type { ReactNode } from 'react';
import { SearchableMultiSelect } from './SearchableMultiSelect';

export interface SearchableOption {
  value: string | number;
  label: string;
  sublabel?: string;
}

interface SearchableSelectProps {
  options: SearchableOption[];
  value: string | number;
  onChange: (value: string | number, option?: SearchableOption) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  error?: boolean;
  size?: 'sm' | 'md';
  className?: string;
  renderOption?: (option: SearchableOption) => ReactNode;
}

/** Chọn một có ô tìm — lớp mỏng trên SearchableMultiSelect (mode="single") */
export function SearchableSelect({ value, onChange, ...rest }: SearchableSelectProps) {
  return (
    <SearchableMultiSelect<string | number>
      {...rest}
      mode="single"
      searchable
      allowClear
      value={value}
      onChange={onChange}
    />
  );
}
