interface TopBarProps {
  title: string;
  onBack?: () => void;
  rightAction?: React.ReactNode;
}

export function TopBar({ title, onBack, rightAction }: TopBarProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b-2 border-[var(--color-sage-border)] bg-white">
      <div className="w-10">
        {onBack && (
          <button
            onClick={onBack}
            className="w-10 h-10 flex items-center justify-center rounded-full text-[var(--color-sage-text-secondary)] hover:text-[var(--color-sage-text)] hover:bg-[var(--color-sage-primary-light)] transition-colors text-lg"
            aria-label="Go back"
          >
            ←
          </button>
        )}
      </div>
      <h1 className="text-base font-bold text-[var(--color-sage-text)]">{title}</h1>
      <div className="w-10 flex justify-end">{rightAction}</div>
    </div>
  );
}
