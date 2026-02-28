import type { HTMLAttributes } from 'react';

interface Card3DProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function Card3D({ className = '', children, ...rest }: Card3DProps) {
  return (
    <div className={`card-3d ${className}`} {...rest}>
      {children}
    </div>
  );
}
