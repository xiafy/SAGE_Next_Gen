export function LoadingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-2">
      <div className="w-7 h-7 rounded-full bg-brand flex items-center justify-center shrink-0 mr-2">
        <span className="text-white text-xs font-semibold">S</span>
      </div>
      <div className="flex gap-1">
        <span className="w-2 h-2 rounded-full bg-brand animate-bounce [animation-delay:0ms]" />
        <span className="w-2 h-2 rounded-full bg-brand animate-bounce [animation-delay:150ms]" />
        <span className="w-2 h-2 rounded-full bg-brand animate-bounce [animation-delay:300ms]" />
      </div>
    </div>
  );
}
