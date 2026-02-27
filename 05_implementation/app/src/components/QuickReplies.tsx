interface QuickRepliesProps {
  replies: string[];
  onSelect: (reply: string) => void;
}

export function QuickReplies({ replies, onSelect }: QuickRepliesProps) {
  return (
    <div className="flex gap-2 overflow-x-auto px-4 py-2 scrollbar-none">
      {replies.map((reply) => (
        <button
          key={reply}
          onClick={() => onSelect(reply)}
          className="shrink-0 px-4 py-1.5 text-sm rounded-full border border-brand text-brand bg-surface hover:bg-brand-light transition-colors whitespace-nowrap"
        >
          {reply}
        </button>
      ))}
    </div>
  );
}
