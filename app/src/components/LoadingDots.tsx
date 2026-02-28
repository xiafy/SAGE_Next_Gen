import { MascotImage } from './MascotImage';

interface LoadingDotsProps {
  text?: string;
}

export function LoadingDots({ text }: LoadingDotsProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <MascotImage expression="thinking" size={40} className="rounded-full" />
      <div className="flex items-center gap-2">
        {text && (
          <span className="text-sm font-semibold text-[var(--color-sage-text-secondary)]">
            {text}
          </span>
        )}
        <div className="flex gap-1">
          <span className="w-2 h-2 rounded-full bg-[var(--color-sage-primary)] animate-bounce [animation-delay:0ms]" />
          <span className="w-2 h-2 rounded-full bg-[var(--color-sage-primary)] animate-bounce [animation-delay:150ms]" />
          <span className="w-2 h-2 rounded-full bg-[var(--color-sage-primary)] animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}
