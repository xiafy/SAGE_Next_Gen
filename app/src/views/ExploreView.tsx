import { useState, useRef, useEffect } from 'react';
import { useAppState } from '../hooks/useAppState';
import { TopBar } from '../components/TopBar';
import { Chip } from '../components/Chip';
import { Card3D } from '../components/Card3D';
import { Button3D } from '../components/Button3D';
import { MascotImage } from '../components/MascotImage';

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
    const activeEl = container.querySelector('[aria-pressed="true"]');
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [activeCategory]);

  // Empty state
  if (!state.menuData) {
    return (
      <div className="flex flex-col h-dvh bg-[var(--color-sage-bg)]">
        <TopBar
          title={isZh ? '菜单' : 'Explore'}
          onBack={() => dispatch({ type: 'NAV_TO', view: 'home' })}
        />
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
          <MascotImage expression="confused" size={120} />
          <p className="text-[var(--color-sage-text-secondary)] text-center font-semibold">
            {isZh ? '还没有扫描菜单哦' : 'No menu scanned yet'}
          </p>
          <p className="text-sm text-[var(--color-sage-text-secondary)] text-center">
            {isZh ? '拍张菜单照片，Sage 帮你翻译' : 'Take a photo of the menu and let Sage help'}
          </p>
          <Button3D
            onClick={() => dispatch({ type: 'NAV_TO', view: 'scanner' })}
          >
            {isZh ? '去扫描' : 'Scan Menu'}
          </Button3D>
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
    <div className="flex flex-col h-dvh bg-[var(--color-sage-bg)]">
      <TopBar
        title={isZh ? '菜单' : 'Explore'}
        onBack={() => dispatch({ type: 'NAV_TO', view: 'chat' })}
        rightAction={
          state.orderItems.length > 0 ? (
            <button
              onClick={() => dispatch({ type: 'NAV_TO', view: 'order' })}
              className="relative text-[var(--color-sage-text-secondary)] hover:text-[var(--color-sage-text)] transition-colors text-sm"
              aria-label={isZh ? '查看点单' : 'View order'}
            >
              🍽
              <span className="absolute -top-1 -right-2 bg-[var(--color-sage-primary)] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {state.orderItems.length}
              </span>
            </button>
          ) : undefined
        }
      />

      {/* Category tabs — horizontal scrolling Chip */}
      <div ref={tabsRef} className="flex gap-2 px-4 py-3 overflow-x-auto no-scrollbar">
        <Chip
          selected={activeCategory === 'all'}
          onClick={() => setActiveCategory('all')}
          aria-label={isZh ? '全部分类' : 'All categories'}
        >
          {isZh ? '全部' : 'All'}
        </Chip>
        {categories.map((cat) => (
          <Chip
            key={cat.id}
            selected={activeCategory === cat.id}
            onClick={() => setActiveCategory(cat.id)}
            aria-label={isZh ? cat.nameTranslated : cat.nameOriginal}
          >
            {isZh ? cat.nameTranslated : cat.nameOriginal}
          </Chip>
        ))}
      </div>

      {/* Item list */}
      <div className="flex-1 overflow-y-auto px-4 pb-24">
        {dedupedItems.length === 0 ? (
          <p className="text-[var(--color-sage-text-secondary)] text-sm text-center py-8">
            {isZh ? '该分类暂无菜品' : 'No items in this category'}
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {dedupedItems.map((item) => {
              const displayTags = item.tags.slice(0, 2);
              return (
                <Card3D key={item.id} className="!p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-[var(--color-sage-text)]">
                        {item.nameTranslated}
                      </p>
                      <p className="text-xs text-[var(--color-sage-text-secondary)]">{item.nameOriginal}</p>
                      {item.descriptionTranslated && (
                        <p className="text-xs text-[var(--color-sage-text-secondary)] mt-0.5 line-clamp-2">
                          {item.descriptionTranslated}
                        </p>
                      )}
                      {displayTags.length > 0 && (
                        <div className="flex gap-1 mt-1.5">
                          {displayTags.map((tag) => (
                            <span
                              key={tag}
                              className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--color-sage-primary-light)] text-[var(--color-sage-primary)] font-medium"
                            >
                              {isZh ? TAG_LABELS[tag]?.zh ?? tag : TAG_LABELS[tag]?.en ?? tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0 ml-3">
                      {item.priceText && (
                        <span className="text-sm font-bold text-[var(--color-sage-primary)]">
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
                                className="w-7 h-7 rounded-full border-2 border-[var(--color-sage-border)] flex items-center justify-center text-[var(--color-sage-text-secondary)] hover:border-[var(--color-sage-primary)] hover:text-[var(--color-sage-primary)] transition-colors text-sm"
                              >−</button>
                              <span className="text-sm font-bold w-4 text-center">{orderItem.quantity}</span>
                              <button
                                onClick={() => dispatch({ type: 'UPDATE_ORDER_QTY', itemId: item.id, quantity: orderItem.quantity + 1 })}
                                className="w-7 h-7 rounded-full bg-[var(--color-sage-primary)] hover:bg-[var(--color-sage-primary-dark)] text-white flex items-center justify-center transition-colors text-sm"
                              >+</button>
                            </div>
                          );
                        }
                        return (
                          <Button3D
                            size="sm"
                            onClick={() => dispatch({ type: 'ADD_TO_ORDER', item })}
                            aria-label={isZh ? `添加 ${item.nameTranslated} 到点单` : `Add ${item.nameTranslated} to order`}
                          >
                            {isZh ? '加入' : 'Add'}
                          </Button3D>
                        );
                      })()}
                    </div>
                  </div>
                </Card3D>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
