import { useMemo } from 'react';
import { useAppState } from '../hooks/useAppState';
import { TopBar } from '../components/TopBar';
import { Card3D } from '../components/Card3D';
import { Button3D } from '../components/Button3D';
import { MascotImage } from '../components/MascotImage';

function usePriceFormatter(currency?: string, language?: string) {
  return useMemo(() => {
    const code = currency?.toUpperCase() && /^[A-Z]{3}$/.test(currency?.toUpperCase() ?? '') ? currency!.toUpperCase() : 'CNY';
    const locale = language === 'zh' ? 'zh-CN' : 'en-US';
    try {
      return new Intl.NumberFormat(locale, { style: 'currency', currency: code, maximumFractionDigits: 0 });
    } catch {
      return new Intl.NumberFormat(locale, { style: 'decimal', maximumFractionDigits: 0 });
    }
  }, [currency, language]);
}

export function OrderCardView() {
  const { state, dispatch } = useAppState();
  const fmt = usePriceFormatter(state.menuData?.currency, state.preferences.language);
  const isZh = state.preferences.language === 'zh';

  const totalQty = state.orderItems.reduce((sum, oi) => sum + oi.quantity, 0);
  const totalPrice = state.orderItems.reduce(
    (sum, oi) => sum + (oi.menuItem.price ?? 0) * oi.quantity,
    0,
  );

  return (
    <div className="flex flex-col min-h-dvh bg-[var(--color-sage-bg)]">
      <TopBar
        title={isZh ? '点餐单' : 'Order Card'}
        onBack={() => dispatch({ type: 'NAV_TO', view: 'chat' })}
      />

      {/* Order items */}
      <div className="flex-1 px-4 py-4 space-y-3">
        {state.orderItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <MascotImage expression="confused" size={160} />
            <p className="text-base font-bold text-[var(--color-sage-text)]">
              {isZh ? '还没有加入菜品' : 'No dishes yet'}
            </p>
            <p className="text-sm text-[var(--color-sage-text-secondary)]">
              {isZh ? '去扫描菜单，让 AI 帮你推荐！' : 'Scan a menu and let AI recommend dishes!'}
            </p>
            <Button3D onClick={() => dispatch({ type: 'NAV_TO', view: 'scanner' })}>
              {isZh ? '去扫描菜单' : 'Scan Menu'}
            </Button3D>
          </div>
        ) : (
          state.orderItems.map((oi) => (
            <Card3D key={oi.menuItem.id} className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-[var(--color-sage-text)]">
                  {oi.menuItem.nameOriginal}
                </p>
                <p className="text-xs text-[var(--color-sage-text-secondary)]">{oi.menuItem.nameTranslated}</p>
              </div>

              {/* Quantity controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    dispatch({
                      type: 'UPDATE_ORDER_QTY',
                      itemId: oi.menuItem.id,
                      quantity: oi.quantity - 1,
                    })
                  }
                  className="btn-3d btn-3d-secondary w-8 h-8 !p-0 flex items-center justify-center rounded-full text-sm"
                  aria-label={isZh ? `减少 ${oi.menuItem.nameOriginal}` : `Decrease ${oi.menuItem.nameOriginal}`}
                >
                  −
                </button>
                <span className="text-sm font-bold w-5 text-center text-[var(--color-sage-text)]">
                  {oi.quantity}
                </span>
                <button
                  onClick={() =>
                    dispatch({
                      type: 'UPDATE_ORDER_QTY',
                      itemId: oi.menuItem.id,
                      quantity: oi.quantity + 1,
                    })
                  }
                  className="btn-3d btn-3d-secondary w-8 h-8 !p-0 flex items-center justify-center rounded-full text-sm"
                  aria-label={isZh ? `增加 ${oi.menuItem.nameOriginal}` : `Increase ${oi.menuItem.nameOriginal}`}
                >
                  +
                </button>
              </div>

              <p className="text-sm font-bold text-[var(--color-sage-text)] w-16 text-right">
                {fmt.format((oi.menuItem.price ?? 0) * oi.quantity)}
              </p>

              {/* Delete button */}
              <button
                onClick={() => dispatch({ type: 'REMOVE_FROM_ORDER', itemId: oi.menuItem.id })}
                className="ml-1 w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-[var(--color-sage-text-secondary)] hover:text-[var(--color-sage-error)] hover:bg-[var(--color-sage-error)]/10 transition-colors text-sm"
                aria-label={isZh ? `删除 ${oi.menuItem.nameOriginal}` : `Remove ${oi.menuItem.nameOriginal}`}
              >
                ✕
              </button>
            </Card3D>
          ))
        )}
      </div>

      {/* Footer */}
      {state.orderItems.length > 0 && (
        <div className="px-4 pb-8 pt-4 border-t-2 border-[var(--color-sage-border)]">
          <div className="flex items-center justify-between mb-4">
            <span className="text-base font-bold text-[var(--color-sage-text-secondary)]">
              {isZh ? `共 ${totalQty} 道菜` : `${totalQty} items`}
            </span>
            <span className="text-2xl font-extrabold text-[var(--color-sage-primary)]">{fmt.format(totalPrice)}</span>
          </div>
          <Button3D
            size="lg"
            className="w-full text-lg"
            onClick={() => dispatch({ type: 'NAV_TO', view: 'waiter' })}
          >
            {isZh ? '展示给服务员' : 'Show to Waiter'}
          </Button3D>
        </div>
      )}
    </div>
  );
}
