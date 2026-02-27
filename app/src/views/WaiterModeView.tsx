import { useEffect, useMemo, useRef, useState } from 'react';
import { useAppState } from '../hooks/useAppState';

interface WakeLockSentinelLike {
  released: boolean;
  release: () => Promise<void>;
  addEventListener: (type: 'release', listener: () => void) => void;
}

export function WaiterModeView() {
  const { state, dispatch } = useAppState();
  const wakeLockRef = useRef<WakeLockSentinelLike | null>(null);
  const [wakeLockUnavailable, setWakeLockUnavailable] = useState(false);
  const isZh = state.preferences.language === 'zh';

  const currencyCode = useMemo(() => {
    const candidate = state.menuData?.currency?.toUpperCase();
    return candidate && /^[A-Z]{3}$/.test(candidate) ? candidate : 'CNY';
  }, [state.menuData?.currency]);

  const priceFormatter = useMemo(() => {
    try {
      return new Intl.NumberFormat(state.preferences.language === 'zh' ? 'zh-CN' : 'en-US', {
        style: 'currency',
        currency: currencyCode,
        maximumFractionDigits: 2,
      });
    } catch {
      return new Intl.NumberFormat(state.preferences.language === 'zh' ? 'zh-CN' : 'en-US', {
        style: 'decimal',
        maximumFractionDigits: 2,
      });
    }
  }, [currencyCode, state.preferences.language]);

  const total = useMemo(
    () => state.orderItems.reduce((sum, oi) => sum + (oi.menuItem.price ?? 0) * oi.quantity, 0),
    [state.orderItems],
  );

  useEffect(() => {
    const wakeLockApi = (navigator as Navigator & { wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinelLike> } }).wakeLock;
    if (!wakeLockApi) {
      setWakeLockUnavailable(true);
      return;
    }

    let active = true;

    const requestWakeLock = async () => {
      try {
        const sentinel = await wakeLockApi.request('screen');
        if (!active) {
          await sentinel.release().catch(() => undefined);
          return;
        }
        wakeLockRef.current = sentinel;
        sentinel.addEventListener('release', () => {
          wakeLockRef.current = null;
        });
      } catch {
        if (active) setWakeLockUnavailable(true);
      }
    };

    requestWakeLock();

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !wakeLockRef.current) {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      active = false;
      document.removeEventListener('visibilitychange', onVisibilityChange);
      wakeLockRef.current?.release().catch(() => undefined);
      wakeLockRef.current = null;
    };
  }, []);

  return (
    <div className="flex flex-col min-h-dvh bg-black text-white">
      {/* Menu items — large text for waiter readability */}
      <div className="flex-1 flex flex-col justify-center px-8 py-12 gap-6">
        {state.orderItems.map((oi) => (
          <div key={oi.menuItem.id} className="flex items-baseline justify-between">
            <div className="min-w-0">
              <span className="text-[30px] leading-tight font-semibold break-words">{oi.menuItem.nameOriginal}</span>
              <p className="text-lg text-white/60">×{oi.quantity}</p>
            </div>
            <span className="text-[28px] font-medium ml-4 shrink-0">
              {priceFormatter.format((oi.menuItem.price ?? 0) * oi.quantity)}
            </span>
          </div>
        ))}
        {state.orderItems.length === 0 && (
          <p className="text-white/40 text-center text-lg">{isZh ? '暂无点单' : 'No items ordered'}</p>
        )}
        {state.orderItems.length > 0 && (
          <div className="pt-4 border-t border-white/20 flex items-center justify-between">
            <span className="text-xl text-white/70">{isZh ? '合计' : 'Total'}</span>
            <span className="text-[30px] font-bold">{priceFormatter.format(total)}</span>
          </div>
        )}
        {wakeLockUnavailable && (
          <p className="text-sm text-white/40 text-center">
            {isZh
              ? '屏幕常亮不可用，请保持手动唤醒'
              : 'Wake Lock is unavailable. Keep screen awake manually.'}
          </p>
        )}
      </div>

      {/* Done button */}
      <div className="px-6 pb-10">
        <button
          onClick={() => dispatch({ type: 'NAV_TO', view: 'order' })}
          className="w-full py-4 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-button transition-colors text-base"
        >
          {isZh ? '完成' : 'Done'}
        </button>
      </div>
    </div>
  );
}
