import { useMemo } from 'react';
import { useAppState } from '../hooks/useAppState';
import { TopBar } from '../components/TopBar';

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
    <div className="flex flex-col min-h-dvh bg-surface">
      <TopBar
        title={isZh ? '点餐单' : 'Order Card'}
        onBack={() => dispatch({ type: 'NAV_TO', view: 'chat' })}
      />

      {/* Order items */}
      <div className="flex-1 px-4 py-4">
        {state.orderItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-text-muted">
            <span className="text-4xl">🍽</span>
            <p className="text-sm">{isZh ? '还没有加入菜品，去和 AI 聊聊吧～' : 'No dishes yet — chat with AI to get started!'}</p>
            <button
              onClick={() => dispatch({ type: 'NAV_TO', view: 'chat' })}
              className="text-sm text-brand hover:text-brand-hover transition-colors"
            >
              {isZh ? '去聊聊' : 'Start chatting'}
            </button>
          </div>
        ) : (
          state.orderItems.map((oi) => (
            <div
              key={oi.menuItem.id}
              className="flex items-center justify-between py-4 border-b border-border"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary">
                  {oi.menuItem.nameOriginal}
                </p>
                <p className="text-xs text-text-muted">{oi.menuItem.nameTranslated}</p>
              </div>

              {/* Quantity controls */}
              <div className="flex items-center gap-3 mx-4">
                <button
                  onClick={() =>
                    dispatch({
                      type: 'UPDATE_ORDER_QTY',
                      itemId: oi.menuItem.id,
                      quantity: oi.quantity - 1,
                    })
                  }
                  className="w-7 h-7 rounded-full border border-border flex items-center justify-center text-text-secondary hover:border-brand hover:text-brand transition-colors text-sm"
                  aria-label={isZh ? `减少 ${oi.menuItem.nameOriginal}` : `Decrease ${oi.menuItem.nameOriginal}`}
                >
                  −
                </button>
                <span className="text-sm font-medium w-5 text-center">
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
                  className="w-7 h-7 rounded-full border border-border flex items-center justify-center text-text-secondary hover:border-brand hover:text-brand transition-colors text-sm"
                  aria-label={isZh ? `增加 ${oi.menuItem.nameOriginal}` : `Increase ${oi.menuItem.nameOriginal}`}
                >
                  +
                </button>
              </div>

              <p className="text-sm font-semibold text-text-primary w-16 text-right">
                {fmt.format((oi.menuItem.price ?? 0) * oi.quantity)}
              </p>

              {/* Delete button */}
              <button
                onClick={() => dispatch({ type: 'REMOVE_FROM_ORDER', itemId: oi.menuItem.id })}
                className="ml-2 w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-text-muted hover:text-red-500 hover:bg-red-50 transition-colors text-sm"
                aria-label={isZh ? `删除 ${oi.menuItem.nameOriginal}` : `Remove ${oi.menuItem.nameOriginal}`}
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      {state.orderItems.length > 0 && (
        <div className="px-4 pb-8 pt-4 border-t border-border">
          <div className="flex items-center justify-between mb-4">
            <span className="text-base font-medium text-text-secondary">
              {isZh ? `共 ${totalQty} 道菜` : `${totalQty} items`}
            </span>
            <span className="text-xl font-bold text-text-primary">{fmt.format(totalPrice)}</span>
          </div>
          <button
            onClick={() => dispatch({ type: 'NAV_TO', view: 'waiter' })}
            className="w-full py-4 bg-brand hover:bg-brand-hover text-white font-semibold rounded-button transition-colors"
          >
            {isZh ? '展示给服务员' : 'Show to waiter'}
          </button>
        </div>
      )}
    </div>
  );
}
