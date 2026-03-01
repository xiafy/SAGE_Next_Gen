import { useState, useRef, useEffect, useMemo } from 'react';
import { useAppState } from '../hooks/useAppState';
import { TopBar } from '../components/TopBar';
import { Chip } from '../components/Chip';
import { Button3D } from '../components/Button3D';
import { MascotImage } from '../components/MascotImage';
import { DishCard } from '../components/DishCard';
import { mapDietaryToAllergens } from '../utils/allergenMapping';

export function ExploreView() {
  const { state, dispatch } = useAppState();
  const isZh = state.preferences.language === 'zh';
  const [activeCategory, setActiveCategory] = useState('all');
  const tabsRef = useRef<HTMLDivElement>(null);

  // Map dietary prefs to AllergenType values for DishCard allergen matching
  const userAllergens = useMemo(() => {
    return mapDietaryToAllergens(state.preferences.dietary);
  }, [state.preferences.dietary]);

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

  // 建立有效 itemId 集合（items[] 中实际存在的 id）
  const validItemIdSet = new Set(items.map(it => it.id));

  // 过滤掉没有任何有效 item 的 category（KI-005）
  const validCategories = categories.filter(cat =>
    cat.itemIds.some(id => validItemIdSet.has(id))
  );

  // 找出孤儿 items（不被任何 category 引用，KI-004）
  const referencedIds = new Set(validCategories.flatMap(c => c.itemIds));
  const orphanItems = items.filter(it => !referencedIds.has(it.id));

  const dedupeByNameOriginal = <T extends { nameOriginal: string }>(list: T[]) => {
    const seen = new Set<string>();
    return list.filter((item) => {
      const key = item.nameOriginal.trim().toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const groupedItems = [
    ...validCategories.map((cat) => {
      const catItems = cat.itemIds
        .map((id) => items.find((item) => item.id === id))
        .filter((item): item is typeof items[number] => Boolean(item));
      return {
        id: cat.id,
        title: isZh ? cat.nameTranslated : cat.nameOriginal,
        items: dedupeByNameOriginal(catItems),
      };
    }).filter((group) => group.items.length > 0),
    ...(orphanItems.length > 0
      ? [{
          id: '__other__',
          title: isZh ? '其他' : 'Other',
          items: dedupeByNameOriginal(orphanItems),
        }]
      : []),
  ];

  // Filter items by active category
  const filteredItems =
    activeCategory === 'all'
      ? items
      : activeCategory === '__orphan__'
      ? orphanItems
      : items.filter((item) => {
          const cat = validCategories.find((c) => c.id === activeCategory);
          return cat?.itemIds.includes(item.id);
        });

  // Deduplicate by nameOriginal (AI may generate duplicates with different IDs)
  const dedupedItems = dedupeByNameOriginal(filteredItems);

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
        {validCategories.map((cat) => (
          <Chip
            key={cat.id}
            selected={activeCategory === cat.id}
            onClick={() => setActiveCategory(cat.id)}
            aria-label={isZh ? cat.nameTranslated : cat.nameOriginal}
          >
            {isZh ? cat.nameTranslated : cat.nameOriginal}
          </Chip>
        ))}
        {orphanItems.length > 0 && (
          <Chip
            key="__orphan__"
            selected={activeCategory === '__orphan__'}
            onClick={() => setActiveCategory('__orphan__')}
            aria-label={isZh ? '其他' : 'Other'}
          >
            {isZh ? '其他' : 'Other'}
          </Chip>
        )}
      </div>

      {/* Item list */}
      <div className="flex-1 overflow-y-auto px-4 pb-24">
        {activeCategory === 'all' ? (
          groupedItems.length === 0 ? (
            <p className="text-[var(--color-sage-text-secondary)] text-sm text-center py-8">
              {isZh ? '暂无菜品' : 'No items available'}
            </p>
          ) : (
            <div className="flex flex-col gap-5">
              {groupedItems.map((group) => (
                <section key={group.id} className="flex flex-col gap-2">
                  <h3 className="text-sm font-bold text-[var(--color-sage-text-secondary)] px-1">
                    {group.title}
                  </h3>
                  <div className="flex flex-col gap-3">
                    {group.items.map((item) => {
                      const orderItem = state.orderItems.find(oi => oi.menuItem.id === item.id);
                      return (
                        <DishCard
                          key={item.id}
                          item={item}
                          isZh={isZh}
                          userAllergens={userAllergens}
                          orderItem={orderItem}
                          onAdd={() => dispatch({ type: 'ADD_TO_ORDER', item })}
                          onUpdateQty={(qty) => dispatch({ type: 'UPDATE_ORDER_QTY', itemId: item.id, quantity: qty })}
                        />
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )
        ) : (
          dedupedItems.length === 0 ? (
            <p className="text-[var(--color-sage-text-secondary)] text-sm text-center py-8">
              {isZh ? '该分类暂无菜品' : 'No items in this category'}
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {dedupedItems.map((item) => {
                const orderItem = state.orderItems.find(oi => oi.menuItem.id === item.id);
                return (
                  <DishCard
                    key={item.id}
                    item={item}
                    isZh={isZh}
                    userAllergens={userAllergens}
                    orderItem={orderItem}
                    onAdd={() => dispatch({ type: 'ADD_TO_ORDER', item })}
                    onUpdateQty={(qty) => dispatch({ type: 'UPDATE_ORDER_QTY', itemId: item.id, quantity: qty })}
                  />
                );
              })}
            </div>
          )
        )}
      </div>
    </div>
  );
}
