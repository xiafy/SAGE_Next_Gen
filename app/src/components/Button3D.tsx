import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'white';
type Size = 'sm' | 'md' | 'lg';

interface Button3DProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button3D({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...rest
}: Button3DProps) {
  return (
    <button
      className={`btn-3d btn-3d-${variant} btn-3d-${size} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
