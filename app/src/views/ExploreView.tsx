import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useAppState } from '../hooks/useAppState';
import { TopBar } from '../components/TopBar';
import { Chip } from '../components/Chip';
import { Button3D } from '../components/Button3D';
import { MascotImage } from '../components/MascotImage';
import { DishCard } from '../components/DishCard';
import { mapDietaryToAllergens } from '../utils/allergenMapping';
import type { SelectedDishSummary, SelectedDishesPayload, MenuItem } from '../types';
import type { OrderItem } from '../types';

export function ExploreView() {
  const { state, dispatch } = useAppState();
  const isZh = state.preferences.language === 'zh';
  const [activeCategory, setActiveCategory] = useState('all');
  const tabsRef = useRef<HTMLDivElement>(null);

  // T8.2: Track newly selected dishes and order snapshot
  const [newlySelected, setNewlySelected] = useState<SelectedDishSummary[]>([]);
  const [orderSnapshotOnEnter] = useState<OrderItem[]>(() => [...state.orderItems]);

  // BUG-004: Track local explore quantities (decoupled from global order)
  const [exploreQty, setExploreQty] = useState<Record<string, number>>({});
  const baseQtyMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const oi of orderSnapshotOnEnter) {
      map[oi.menuItem.id] = oi.quantity;
    }
    return map;
  }, [orderSnapshotOnEnter]);

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

  // T8.2: Helper to build SelectedDishSummary from MenuItem
  const toSummary = useCallback((item: MenuItem): SelectedDishSummary => {
    const cat = state.menuData?.categories.find(c => c.itemIds.includes(item.id));
    return {
      dishId: item.id,
      name: item.nameTranslated,
      nameOriginal: item.nameOriginal,
      price: item.price ?? null,
      category: cat ? (isZh ? cat.nameTranslated : cat.nameOriginal) : '',
    };
  }, [state.menuData, isZh]);

  // T8.2: Add dish handler (BUG-004: also track local explore qty)
  const handleAddDish = useCallback((item: MenuItem) => {
    dispatch({ type: 'ADD_TO_ORDER', item });
    setExploreQty(prev => ({ ...prev, [item.id]: (prev[item.id] ?? 0) + 1 }));
    setNewlySelected(prev => {
      if (prev.some(d => d.dishId === item.id)) return prev;
      return [...prev, toSummary(item)];
    });
  }, [dispatch, toSummary]);

  // T8.2: Update qty handler (BUG-004: translate local qty to global)
  const handleUpdateQty = useCallback((itemId: string, newLocalQty: number) => {
    const base = baseQtyMap[itemId] ?? 0;
    dispatch({ type: 'UPDATE_ORDER_QTY', itemId, quantity: base + newLocalQty });
    if (newLocalQty <= 0) {
      setExploreQty(prev => {
        const { [itemId]: _, ...rest } = prev;
        return rest;
      });
      setNewlySelected(prev => prev.filter(d => d.dishId !== itemId));
    } else {
      setExploreQty(prev => ({ ...prev, [itemId]: newLocalQty }));
    }
  }, [dispatch, baseQtyMap]);

  // T8.3: Navigate to AI chat with payload
  const handleConsultAI = useCallback(() => {
    const payload: SelectedDishesPayload = {
      newlySelected,
      existingOrder: orderSnapshotOnEnter.map(oi => toSummary(oi.menuItem)),
    };
    dispatch({ type: 'SET_NAV_PAYLOAD', payload });
    dispatch({ type: 'NAV_TO', view: 'chat' });
  }, [newlySelected, orderSnapshotOnEnter, toSummary, dispatch]);

  // T8.1: Navigate to waiter mode
  const handleShowToWaiter = useCallback(() => {
    dispatch({ type: 'NAV_TO', view: 'waiter' });
  }, [dispatch]);

  const hasSelectedDishes = newlySelected.length > 0;

  // Empty state: no menuData
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

  // T8.4: Empty state for items
  if (items.length === 0) {
    return (
      <div className="flex flex-col h-dvh bg-[var(--color-sage-bg)]">
        <TopBar
          title={isZh ? '菜单' : 'Explore'}
          onBack={() => dispatch({ type: 'NAV_TO', view: 'chat' })}
        />
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
          <MascotImage expression="confused" size={120} />
          <p className="text-[var(--color-sage-text-secondary)] text-center font-semibold">
            {isZh ? '还没有扫描菜单哦，先去拍一张？' : 'No dishes found. Try taking another photo?'}
          </p>
          <Button3D
            onClick={() => dispatch({ type: 'NAV_TO', view: 'scanner' })}
          >
            {isZh ? '📷 重新拍摄' : '📷 Retake Photo'}
          </Button3D>
        </div>
      </div>
    );
  }

  // 建立有效 itemId 集合
  const validItemIdSet = new Set(items.map(it => it.id));

  // 过滤掉没有任何有效 item 的 category
  const validCategories = categories.filter(cat =>
    cat.itemIds.some(id => validItemIdSet.has(id))
  );

  // 找出孤儿 items
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

  const filteredItems =
    activeCategory === 'all'
      ? items
      : activeCategory === '__orphan__'
      ? orphanItems
      : items.filter((item) => {
          const cat = validCategories.find((c) => c.id === activeCategory);
          return cat?.itemIds.includes(item.id);
        });

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

      {/* Category tabs */}
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
      <div className="flex-1 overflow-y-auto px-4 pb-32">
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
                      const localQty = exploreQty[item.id] ?? 0;
                      const virtualOrderItem = localQty > 0 ? { menuItem: item, quantity: localQty } as OrderItem : undefined;
                      return (
                        <DishCard
                          key={item.id}
                          item={item}
                          isZh={isZh}
                          userAllergens={userAllergens}
                          currency={state.menuData?.currency}
                          orderItem={virtualOrderItem}
                          onAdd={() => handleAddDish(item)}
                          onUpdateQty={(qty) => handleUpdateQty(item.id, qty)}
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
                const localQty = exploreQty[item.id] ?? 0;
                const virtualOrderItem = localQty > 0 ? { menuItem: item, quantity: localQty } as OrderItem : undefined;
                return (
                  <DishCard
                    key={item.id}
                    item={item}
                    isZh={isZh}
                    userAllergens={userAllergens}
                    orderItem={virtualOrderItem}
                    onAdd={() => handleAddDish(item)}
                    onUpdateQty={(qty) => handleUpdateQty(item.id, qty)}
                  />
                );
              })}
            </div>
          )
        )}
      </div>

      {/* T8.1: Bottom action bar with dual exit */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-[var(--color-sage-border)] px-4 py-3 flex gap-3 safe-area-bottom">
        <Button3D
          variant="secondary"
          size="sm"
          onClick={handleShowToWaiter}
          disabled={state.orderItems.length === 0}
          className="flex-1"
        >
          {isZh ? '展示给服务员' : 'Show to Waiter'}
        </Button3D>
        <Button3D
          variant="primary"
          size="sm"
          onClick={handleConsultAI}
          disabled={!hasSelectedDishes}
          className="flex-1"
        >
          {isZh ? '🤖 咨询 AI' : '🤖 Ask AI'}
        </Button3D>
      </div>
    </div>
  );
}
