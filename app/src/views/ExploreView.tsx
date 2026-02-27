import { useState, useRef, useEffect } from 'react';
import { useAppState } from '../hooks/useAppState';
import { TopBar } from '../components/TopBar';

const TAG_LABELS: Record<string, { zh: string; en: string }> = {
  vegetarian: { zh: '素食', en: 'Vegetarian' },
  vegan: { zh: '纯素', en: 'Vegan' },
  spicy: { zh: '辣', en: 'Spicy' },
  popular: { zh: '人气', en: 'Popular' },
  signature: { zh: '招牌', en: 'Signature' },
  gluten_free: { zh: '无麸质', en: 'GF' },
  contains_nuts: { zh: '坚果', en: 'Nuts' },
  contains_seafood: { zh: '海鲜', en: 'Seafood' },
  contains_pork: { zh: '猪肉', en: 'Pork' },
  contains_alcohol: { zh: '含酒精', en: 'Alcohol' },
};

export function ExploreView() {
  const { state, dispatch } = useAppState();
  const isZh = state.preferences.language === 'zh';
  const [activeCategory, setActiveCategory] = useState('all');
  const tabsRef = useRef<HTMLDivElement>(null);

  // Scroll active tab into view
  useEffect(() => {
    const container = tabsRef.current;
    if (!container) return;
    const activeEl = container.querySelector('[data-active="true"]');
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [activeCategory]);

  // Empty state
  if (!state.menuData) {
    return (
      <div className="flex flex-col h-dvh bg-surface">
        <TopBar
          title={isZh ? '菜单' : 'Explore'}
          onBack={() => dispatch({ type: 'NAV_TO', view: 'home' })}
        />
        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6">
          <div className="text-6xl">📋</div>
          <p className="text-text-secondary text-center">
            {isZh ? '还没有菜单' : 'No menu scanned yet'}
          </p>
          <button
            onClick={() => dispatch({ type: 'NAV_TO', view: 'scanner' })}
            className="px-8 py-3 bg-brand hover:bg-brand-hover text-white font-semibold rounded-button transition-colors"
            aria-label={isZh ? '扫描菜单' : 'Scan menu'}
          >
            {isZh ? '扫描菜单' : 'Scan Menu'}
          </button>
        </div>
      </div>
    );
  }

  const { categories, items } = state.menuData;

  // Filter items by active category
  const filteredItems =
    activeCategory === 'all'
      ? items
      : items.filter((item) => {
          const cat = categories.find((c) => c.id === activeCategory);
          return cat?.itemIds.includes(item.id);
        });

  // Deduplicate by nameOriginal (AI may generate duplicates with different IDs)
  const seen = new Set<string>();
  const dedupedItems = filteredItems.filter((item) => {
    const key = item.nameOriginal.trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return (
    <div className="flex flex-col h-dvh bg-surface">
      <TopBar
        title={isZh ? '菜单' : 'Explore'}
        onBack={() => dispatch({ type: 'NAV_TO', view: 'chat' })}
        rightAction={
          state.orderItems.length > 0 ? (
            <button
              onClick={() => dispatch({ type: 'NAV_TO', view: 'order' })}
              className="relative text-text-secondary hover:text-text-primary transition-colors text-sm"
              aria-label={isZh ? '查看点单' : 'View order'}
            >
              🍽
              <span className="absolute -top-1 -right-2 bg-brand text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {state.orderItems.length}
              </span>
            </button>
          ) : undefined
        }
      />

      {/* Category tabs */}
      <div ref={tabsRef} className="flex gap-2 px-4 py-3 overflow-x-auto no-scrollbar">
        <button
          data-active={activeCategory === 'all'}
          onClick={() => setActiveCategory('all')}
          className={`shrink-0 px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${
            activeCategory === 'all'
              ? 'bg-brand text-white'
              : 'bg-surface-secondary text-text-secondary hover:text-text-primary'
          }`}
          aria-label={isZh ? '全部分类' : 'All categories'}
        >
          {isZh ? '全部' : 'All'}
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            data-active={activeCategory === cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`shrink-0 px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${
              activeCategory === cat.id
                ? 'bg-brand text-white'
                : 'bg-surface-secondary text-text-secondary hover:text-text-primary'
            }`}
            aria-label={isZh ? cat.nameTranslated : cat.nameOriginal}
          >
            {isZh ? cat.nameTranslated : cat.nameOriginal}
          </button>
        ))}
      </div>

      {/* Item list */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {dedupedItems.length === 0 ? (
          <p className="text-text-muted text-sm text-center py-8">
            {isZh ? '该分类暂无菜品' : 'No items in this category'}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {dedupedItems.map((item) => {
              const displayTags = item.tags.slice(0, 2);
              return (
                <div
                  key={item.id}
                  className="flex items-start justify-between bg-surface-secondary border border-border rounded-[var(--border-radius-card)] p-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary">
                      {item.nameTranslated}
                    </p>
                    <p className="text-xs text-text-muted">{item.nameOriginal}</p>
                    {item.descriptionTranslated && (
                      <p className="text-xs text-text-muted mt-0.5 line-clamp-2">
                        {item.descriptionTranslated}
                      </p>
                    )}
                    {displayTags.length > 0 && (
                      <div className="flex gap-1 mt-1.5">
                        {displayTags.map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] px-1.5 py-0.5 rounded-full bg-brand-light text-brand font-medium"
                          >
                            {isZh ? TAG_LABELS[tag]?.zh ?? tag : TAG_LABELS[tag]?.en ?? tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0 ml-3">
                    {item.priceText && (
                      <span className="text-sm font-semibold text-text-primary">
                        {item.priceText}
                      </span>
                    )}
                    {(() => {
                      const orderItem = state.orderItems.find(oi => oi.menuItem.id === item.id);
                      if (orderItem) {
                        return (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => dispatch({ type: 'UPDATE_ORDER_QTY', itemId: item.id, quantity: orderItem.quantity - 1 })}
                              className="w-7 h-7 rounded-full border border-border flex items-center justify-center text-text-secondary hover:border-brand hover:text-brand transition-colors text-sm"
                            >−</button>
                            <span className="text-sm font-medium w-4 text-center">{orderItem.quantity}</span>
                            <button
                              onClick={() => dispatch({ type: 'UPDATE_ORDER_QTY', itemId: item.id, quantity: orderItem.quantity + 1 })}
                              className="w-7 h-7 rounded-full bg-brand hover:bg-brand-hover text-white flex items-center justify-center transition-colors text-sm"
                            >+</button>
                          </div>
                        );
                      }
                      return (
                        <button
                          onClick={() => dispatch({ type: 'ADD_TO_ORDER', item })}
                          className="w-8 h-8 rounded-full bg-brand hover:bg-brand-hover text-white flex items-center justify-center transition-colors text-lg leading-none"
                          aria-label={isZh ? `添加 ${item.nameTranslated} 到点单` : `Add ${item.nameTranslated} to order`}
                        >+</button>
                      );
                    })()}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
