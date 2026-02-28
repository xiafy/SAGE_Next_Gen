import type { ViewName } from '../types';

interface BottomNavProps {
  currentView: ViewName;
  onNavigate: (view: ViewName) => void;
  isZh: boolean;
  orderCount?: number;
}

const tabs: Array<{
  view: ViewName;
  zh: string;
  en: string;
  icon: string;
}> = [
  { view: 'home', zh: '首页', en: 'Home', icon: '🏠' },
  { view: 'order', zh: '点餐单', en: 'Order', icon: '🍽' },
  { view: 'settings', zh: '设置', en: 'Settings', icon: '⚙' },
];

export function BottomNav({ currentView, onNavigate, isZh, orderCount = 0 }: BottomNavProps) {
  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t-2 border-[var(--color-sage-border)] z-40"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-center justify-around h-16">
        {tabs.map((tab) => {
          const isActive =
            tab.view === currentView ||
            (tab.view === 'home' && (currentView === 'chat' || currentView === 'explore'));
          return (
            <button
              key={tab.view}
              onClick={() => onNavigate(tab.view)}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors relative ${
                isActive
                  ? 'text-[var(--color-sage-primary)]'
                  : 'text-[var(--color-sage-text-secondary)]'
              }`}
              aria-label={isZh ? tab.zh : tab.en}
            >
              {isActive && (
                <span className="absolute top-0 w-6 h-1 rounded-b-full bg-[var(--color-sage-primary)]" />
              )}
              <span className="text-xl relative">
                {tab.icon}
                {tab.view === 'order' && orderCount > 0 && (
                  <span className="absolute -top-1 -right-2 bg-[var(--color-sage-primary)] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {orderCount}
                  </span>
                )}
              </span>
              <span className="text-xs font-semibold">{isZh ? tab.zh : tab.en}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
