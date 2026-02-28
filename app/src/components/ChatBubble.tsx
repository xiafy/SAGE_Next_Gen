import type { Message } from '../types';
import { MascotImage } from './MascotImage';

interface ChatBubbleProps {
  message: Message;
}

export function ChatBubble({ message }: ChatBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3 animate-slide-up`}>
      {!isUser && (
        <div className="shrink-0 mt-1 mr-2">
          <MascotImage expression="default" size={32} className="rounded-full" />
        </div>
      )}
      <div
        className={`max-w-[75%] px-4 py-2.5 text-[15px] leading-relaxed font-semibold ${
          isUser
            ? 'bg-[var(--color-sage-primary)] text-white rounded-[var(--radius-md)_var(--radius-md)_4px_var(--radius-md)] shadow-[0_4px_0_var(--color-sage-primary-dark)]'
            : 'bg-white text-[var(--color-sage-text)] rounded-[var(--radius-md)_var(--radius-md)_var(--radius-md)_4px] border-2 border-[var(--color-sage-border)] shadow-[0_4px_0_var(--color-sage-border)]'
        }`}
      >
        {message.content}
      </div>
    </div>
  );
}
