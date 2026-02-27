import type { Message } from '../types';

interface ChatBubbleProps {
  message: Message;
}

export function ChatBubble({ message }: ChatBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-brand flex items-center justify-center shrink-0 mt-1 mr-2">
          <span className="text-white text-xs font-semibold">S</span>
        </div>
      )}
      <div
        className={`max-w-[75%] px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? 'bg-brand text-white rounded-[16px_16px_4px_16px]'
            : 'bg-surface-secondary text-text-primary rounded-[16px_16px_16px_4px] shadow-card'
        }`}
      >
        {message.content}
      </div>
    </div>
  );
}
