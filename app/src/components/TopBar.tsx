interface TopBarProps {
  title: string;
  onBack?: () => void;
  rightAction?: React.ReactNode;
}

export function TopBar({ title, onBack, rightAction }: TopBarProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface">
      <div className="w-10">
        {onBack && (
          <button
            onClick={onBack}
            className="text-text-secondary hover:text-text-primary transition-colors text-lg"
            aria-label="Go back"
          >
            ←
          </button>
        )}
      </div>
      <h1 className="text-base font-semibold text-text-primary">{title}</h1>
      <div className="w-10 flex justify-end">{rightAction}</div>
    </div>
  );
}
