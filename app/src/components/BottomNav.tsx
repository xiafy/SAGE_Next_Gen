import type { ViewName } from '../types';

interface BottomNavProps {
  currentView: ViewName;
  onNavigate: (view: ViewName) => void;
  isZh: boolean;
  orderCount?: number;
}

function IconHome({ active }: { active: boolean }) {
  const color = active ? 'var(--color-sage-primary)' : 'var(--color-sage-text-secondary)';
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12L5 10M5 10L12 3L19 10M5 10V20C5 20.55 5.45 21 6 21H9M19 10L21 12M19 10V20C19 20.55 18.55 21 18 21H15M9 21C9.55 21 10 20.55 10 20V16C10 15.45 10.45 15 11 15H13C13.55 15 14 15.45 14 16V20C14 20.55 14.45 21 15 21M9 21H15" />
    </svg>
  );
}

function IconOrder({ active }: { active: boolean }) {
  const color = active ? 'var(--color-sage-primary)' : 'var(--color-sage-text-secondary)';
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5H7C5.89543 5 5 5.89543 5 7V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V7C19 5.89543 18.1046 5 17 5H15" />
      <path d="M9 5C9 3.89543 9.89543 3 11 3H13C14.1046 3 15 3.89543 15 5C15 6.10457 14.1046 7 13 7H11C9.89543 7 9 6.10457 9 5Z" />
      <path d="M9 12H15" />
      <path d="M9 16H13" />
    </svg>
  );
}

function IconSettings({ active }: { active: boolean }) {
  const color = active ? 'var(--color-sage-primary)' : 'var(--color-sage-text-secondary)';
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.22 2H11.78C11.2496 2 10.7409 2.21071 10.3658 2.58579C9.99072 2.96086 9.78 3.46957 9.78 4V4.18C9.77964 4.53073 9.68706 4.87519 9.51154 5.17884C9.33602 5.48248 9.08374 5.73464 8.78 5.91L8.35 6.16C8.04596 6.33554 7.70108 6.42795 7.35 6.4282C6.99893 6.42846 6.6540 6.33652 6.35 6.16L6.2 6.08C5.74107 5.81526 5.19584 5.74344 4.684 5.88031C4.17217 6.01717 3.73555 6.35154 3.47 6.81L3.25 7.19C2.98526 7.64893 2.91345 8.19416 3.05031 8.706C3.18717 9.21783 3.52154 9.65446 3.98 9.92L4.13 10.02C4.43228 10.1945 4.68362 10.4451 4.85876 10.7468C5.0339 11.0486 5.12665 11.3908 5.12665 11.74C5.12665 12.0892 5.0339 12.4314 4.85876 12.7332C4.68362 13.0349 4.43228 13.2855 4.13 13.46L3.98 13.56C3.52154 13.8255 3.18717 14.2622 3.05031 14.774C2.91345 15.2858 2.98526 15.8311 3.25 16.29L3.47 16.67C3.73555 17.1285 4.17217 17.4628 4.684 17.5997C5.19584 17.7366 5.74107 17.6647 6.2 17.4L6.35 17.32C6.6540 17.1535 6.99893 17.0615 7.35 17.0618C7.70108 17.0621 8.04596 17.1545 8.35 17.33L8.78 17.58C9.08374 17.7554 9.33602 18.0075 9.51154 18.3112C9.68706 18.6148 9.77964 18.9593 9.78 19.31V19.5C9.78 20.0304 9.99072 20.5391 10.3658 20.9142C10.7409 21.2893 11.2496 21.5 11.78 21.5H12.22C12.7504 21.5 13.2591 21.2893 13.6342 20.9142C14.0093 20.5391 14.22 20.0304 14.22 19.5V19.31C14.2204 18.9593 14.3129 18.6148 14.4885 18.3112C14.664 18.0075 14.9163 17.7554 15.22 17.58L15.65 17.33C15.954 17.1545 16.2989 17.0621 16.65 17.0618C17.0011 17.0615 17.346 17.1535 17.65 17.32L17.8 17.4C18.2589 17.6647 18.8042 17.7366 19.316 17.5997C19.8278 17.4628 20.2645 17.1285 20.53 16.67L20.75 16.29C21.0147 15.8311 21.0866 15.2858 20.9497 14.774C20.8128 14.2622 20.4785 13.8255 20.02 13.56L19.87 13.46C19.5677 13.2855 19.3164 13.0349 19.1412 12.7332C18.9661 12.4314 18.8734 12.0892 18.8734 11.74C18.8734 11.3908 18.9661 11.0486 19.1412 10.7468C19.3164 10.4451 19.5677 10.1945 19.87 10.02L20.02 9.92C20.4785 9.65446 20.8128 9.21783 20.9497 8.706C21.0866 8.19416 21.0147 7.64893 20.75 7.19L20.53 6.81C20.2645 6.35154 19.8278 6.01717 19.316 5.88031C18.8042 5.74344 18.2589 5.81526 17.8 6.08L17.65 6.16C17.346 6.33652 17.0011 6.42846 16.65 6.4282C16.2989 6.42795 15.954 6.33554 15.65 6.16L15.22 5.91C14.9163 5.73464 14.664 5.48248 14.4885 5.17884C14.3129 4.87519 14.2204 4.53073 14.22 4.18V4C14.22 3.46957 14.0093 2.96086 13.6342 2.58579C13.2591 2.21071 12.7504 2 12.22 2Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IconCamera({ active }: { active: boolean }) {
  const color = active ? 'var(--color-sage-primary)' : 'var(--color-sage-text-secondary)';
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19C23 19.5304 22.7893 20.0391 22.4142 20.4142C22.0391 20.7893 21.5304 21 21 21H3C2.46957 21 1.96086 20.7893 1.58579 20.4142C1.21071 20.0391 1 19.5304 1 19V8C1 7.46957 1.21071 6.96086 1.58579 6.58579C1.96086 6.21071 2.46957 6 3 6H7L9 3H15L17 6H21C21.5304 6 22.0391 6.21071 22.4142 6.58579C22.7893 6.96086 23 7.46957 23 8V19Z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

const tabs = [
  { view: 'home' as ViewName, zh: '首页', en: 'Home', Icon: IconHome },
  { view: 'order' as ViewName, zh: '点餐单', en: 'Order', Icon: IconOrder },
  { view: 'settings' as ViewName, zh: '设置', en: 'Settings', Icon: IconSettings },
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
              <span className="relative">
                <tab.Icon active={isActive} />
                {tab.view === 'order' && orderCount > 0 && (
                  <span className="absolute -top-1 -right-2 bg-[var(--color-sage-primary)] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {orderCount}
                  </span>
                )}
              </span>
              <span className="text-xs font-bold">{isZh ? tab.zh : tab.en}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export { IconCamera };
