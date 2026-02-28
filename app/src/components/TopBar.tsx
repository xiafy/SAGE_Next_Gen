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
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-[var(--color-sage-primary-light)] text-[var(--color-sage-primary)] hover:bg-[var(--color-sage-primary)] hover:text-white active:scale-90 transition-all font-bold"
            aria-label="Go back"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18L9 12L15 6"/></svg>
          </button>
        )}
      </div>
      <h1 className="text-base font-bold text-[var(--color-sage-text)]">{title}</h1>
      <div className="w-10 flex justify-end">{rightAction}</div>
    </div>
  );
}
