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
  const hasSession = !!state.menuData;

  return (
    <div className="relative flex flex-col items-center min-h-dvh bg-[var(--color-sage-bg)] px-6 pt-12 pb-24">
      {/* Settings gear – top right */}
      <button
        className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full text-xl text-[var(--color-sage-text-secondary)] hover:bg-black/5 active:bg-black/10 transition-colors"
        onClick={() => dispatch({ type: 'NAV_TO', view: 'settings' })}
        aria-label={isZh ? '设置' : 'Settings'}
      >
        ⚙
      </button>

      {/* Mascot */}
      <div className="animate-bounce-in">
        <MascotImage expression="default" size={200} />
      </div>

      {/* Greeting */}
      <h1 data-testid="sage-home-greeting" className="text-[28px] font-extrabold text-[var(--color-sage-text)] mt-4 text-center">
        {greeting}{isZh ? '！' : '!'}
      </h1>
      <p className="text-base font-semibold text-[var(--color-sage-text-secondary)] mt-1 text-center">
        {isZh ? '今天想吃什么？' : 'What are you craving today?'}
      </p>

      {/* Actions */}
      <div className="w-full flex flex-col gap-4 mt-10">
        {hasSession ? (
          <>
            <Button3D
              variant="primary"
              size="lg"
              className="w-full"
              onClick={() => dispatch({ type: 'NAV_TO', view: 'chat' })}
              aria-label={isZh ? '继续上次用餐' : 'Continue last meal'}
              data-testid="sage-home-continue-btn"
            >
              {isZh ? '🍽 继续上次用餐' : '🍽 Continue Last Meal'}
            </Button3D>

            <Button3D
              variant="secondary"
              size="md"
              className="w-full"
              onClick={() => {
                dispatch({ type: 'RESET_SESSION' });
                dispatch({ type: 'NAV_TO', view: 'scanner' });
              }}
              aria-label={isZh ? '新的一餐' : 'New meal'}
            >
              {isZh ? '🔄 新的一餐' : '🔄 New Meal'}
            </Button3D>
          </>
        ) : (
          <Button3D
            variant="primary"
            size="lg"
            className="w-full"
            onClick={() => dispatch({ type: 'NAV_TO', view: 'scanner' })}
            aria-label={isZh ? '扫描菜单' : 'Scan Menu'}
            data-testid="sage-home-scan-btn"
          >
            <span className="flex flex-col items-center gap-0.5">
              <span>{isZh ? '📷 扫描菜单' : '📷 Scan Menu'}</span>
              <span className="text-sm font-semibold opacity-80">
                {isZh ? '拍照识别，智能推荐' : 'Snap a photo, get smart picks'}
              </span>
            </span>
          </Button3D>
        )}
      </div>
    </div>
  );
}
