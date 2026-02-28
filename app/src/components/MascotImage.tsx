type MascotExpression =
  | 'default'
  | 'thinking'
  | 'excited'
  | 'eating'
  | 'confused'
  | 'celebrating'
  | 'waving'
  | 'sleeping';

interface MascotImageProps {
  expression?: MascotExpression;
  size?: number;
  className?: string;
}

export function MascotImage({
  expression = 'default',
  size = 200,
  className = '',
}: MascotImageProps) {
  return (
    <img
      src={`/mascot/generated/sage-${expression}.png`}
      alt={`Sage ${expression}`}
      width={size}
      height={size}
      className={`object-contain ${className}`}
      draggable={false}
    />
  );
}
