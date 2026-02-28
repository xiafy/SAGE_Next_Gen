import { useState } from 'react';
import { useAppState } from '../hooks/useAppState';
import { MascotImage } from '../components/MascotImage';
import { Button3D } from '../components/Button3D';

function getGreeting(isZh: boolean): string {
  const hour = new Date().getHours();

  if (isZh) {
    if (hour >= 5 && hour < 11) return '早安';
    if (hour >= 11 && hour < 14) return '午好';
    if (hour >= 14 && hour < 17) return '下午好';
    if (hour >= 17 && hour < 22) return '晚好';
    return '深夜好';
  } else {
    if (hour >= 5 && hour < 11) return 'Good morning';
    if (hour >= 11 && hour < 17) return 'Good afternoon';
    if (hour >= 17 && hour < 22) return 'Good evening';
    return 'Good night';
  }
}

export function HomeView() {
  const { state, dispatch } = useAppState();
  const isZh = state.preferences.language === 'zh';
  const greeting = getGreeting(isZh);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  function handleChatPlaceholder() {
    setToastMsg(isZh ? '即将推出' : 'Coming soon');
    setTimeout(() => setToastMsg(null), 2000);
  }

  return (
    <div className="flex flex-col items-center min-h-dvh bg-[var(--color-sage-bg)] px-6 pt-12 pb-24">
      {/* Mascot */}
      <div className="animate-bounce-in">
        <MascotImage expression="default" size={200} />
      </div>

      {/* Greeting */}
      <h1 className="text-[28px] font-extrabold text-[var(--color-sage-text)] mt-4 text-center">
        {greeting}{isZh ? '！' : '!'}
      </h1>
      <p className="text-base font-semibold text-[var(--color-sage-text-secondary)] mt-1 text-center">
        {isZh ? '今天想吃什么？' : 'What are you craving today?'}
      </p>

      {/* Actions */}
      <div className="w-full flex flex-col gap-4 mt-10">
        <Button3D
          variant="primary"
          size="lg"
          className="w-full"
          onClick={() => dispatch({ type: 'NAV_TO', view: 'scanner' })}
          aria-label={isZh ? '扫描菜单' : 'Scan Menu'}
        >
          <span className="flex flex-col items-center gap-0.5">
            <span>{isZh ? '📷 扫描菜单' : '📷 Scan Menu'}</span>
            <span className="text-sm font-semibold opacity-80">
              {isZh ? '拍照识别，智能推荐' : 'Snap a photo, get smart picks'}
            </span>
          </span>
        </Button3D>

        <Button3D
          variant="secondary"
          size="md"
          className="w-full"
          onClick={handleChatPlaceholder}
          aria-label={isZh ? '随便聊聊' : 'Just Chat'}
        >
          <span className="flex flex-col items-center gap-0.5">
            <span>{isZh ? '💬 随便聊聊' : '💬 Just Chat'}</span>
            <span className="text-sm font-semibold opacity-60">
              {isZh ? '不看菜单，直接推荐' : 'Skip the menu, get recs'}
            </span>
          </span>
        </Button3D>
      </div>

      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 bg-[var(--color-sage-text)] text-white text-sm px-4 py-2.5 rounded-[var(--radius-md)] shadow-sage z-50 text-center animate-fade-in">
          {toastMsg}
        </div>
      )}
    </div>
  );
}
