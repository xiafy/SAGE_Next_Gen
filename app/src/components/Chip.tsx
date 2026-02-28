import type { ButtonHTMLAttributes } from 'react';

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
}

export function Chip({
  selected = false,
  className = '',
  children,
  ...rest
}: ChipProps) {
  return (
    <button
      className={`chip ${selected ? 'chip-selected' : ''} ${className}`}
      aria-pressed={selected}
      {...rest}
    >
      {children}
    </button>
  );
}
