interface QuickRepliesProps {
  replies: string[];
  onSelect: (reply: string) => void;
}

export function QuickReplies({ replies, onSelect }: QuickRepliesProps) {
  return (
    <div className="flex gap-2 overflow-x-auto px-4 py-2 no-scrollbar">
      {replies.map((reply) => (
        <button
          key={reply}
          onClick={() => onSelect(reply)}
          className="btn-3d btn-3d-secondary btn-3d-sm shrink-0 whitespace-nowrap"
        >
          {reply}
        </button>
      ))}
    </div>
  );
}
