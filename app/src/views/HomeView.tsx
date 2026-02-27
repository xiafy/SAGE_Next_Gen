import { useAppState } from '../hooks/useAppState';

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

  return (
    <div className="flex flex-col items-center justify-between min-h-dvh px-6 py-8">
      {/* Settings icon */}
      <div className="w-full flex justify-end">
        <button
          onClick={() => dispatch({ type: 'NAV_TO', view: 'settings' })}
          className="w-10 h-10 flex items-center justify-center rounded-full text-text-secondary hover:bg-surface-secondary transition-colors"
          aria-label={isZh ? '设置' : 'Settings'}
        >
          ⚙
        </button>
      </div>

      {/* Center branding */}
      <div className="flex flex-col items-center gap-3 -mt-8">
        <h1 className="text-5xl font-bold text-brand tracking-tight">SAGE</h1>
        <p className="text-text-secondary text-base">
          {isZh ? '你的智能点餐伙伴' : 'Your dining companion'}
        </p>
      </div>

      {/* Bottom actions */}
      <div className="w-full flex flex-col items-center gap-4">
        {/* Dynamic greeting */}
        <p className="text-text-primary text-sm">
          {greeting}
          {isZh ? '，今天想吃什么？' : ', what are you craving today?'}
        </p>

        <button
          onClick={() => dispatch({ type: 'NAV_TO', view: 'scanner' })}
          className="w-full py-4 bg-brand hover:bg-brand-hover text-white font-semibold text-base rounded-button transition-colors"
          aria-label={isZh ? '扫描菜单' : 'Scan Menu'}
        >
          {isZh ? '📷 扫描菜单' : '📷 Scan Menu'}
        </button>
        <p className="text-text-muted text-xs">
          {isZh ? '拍照，发现美食' : 'Point camera at the menu'}
        </p>
      </div>
    </div>
  );
}
