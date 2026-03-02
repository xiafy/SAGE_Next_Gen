import { useEffect, useMemo, useRef, useState } from 'react';
import { useAppState } from '../hooks/useAppState';
import { MascotImage } from '../components/MascotImage';
import { Button3D } from '../components/Button3D';
import { WaiterAllergyBanner } from '../components/WaiterAllergyBanner';
import { AllergenWarningSheet } from '../components/AllergenWarningSheet';
import { DishCommunicationPanel } from '../components/DishCommunicationPanel';
import { mapDietaryToAllergens } from '../utils/allergenMapping';
import { getAllergyLabel, getAllergyIcon } from '../utils/localLanguage';
import type { MenuItem, CommunicationAction, AllergyBannerData } from '../../../shared/types';

interface WakeLockSentinelLike {
  released: boolean;
  release: () => Promise<void>;
  addEventListener: (type: 'release', listener: () => void) => void;
}

// 🔴-1: Secondary action types for post-confirm flows
type SecondaryActionType =
  | { kind: 'sold_out_recommend'; dishName: string }
  | { kind: 'change_choice'; dishName: string }
  | { kind: 'empty_order' };

export function WaiterModeView() {
  const { state, dispatch } = useAppState();
  const wakeLockRef = useRef<WakeLockSentinelLike | null>(null);
  const [wakeLockUnavailable, setWakeLockUnavailable] = useState(false);
  const [showWarningSheet, setShowWarningSheet] = useState(false);
  const [selectedDish, setSelectedDish] = useState<MenuItem | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [secondaryAction, setSecondaryAction] = useState<SecondaryActionType | null>(null);
  const isZh = state.preferences.language === 'zh';

  const detectedLanguage = state.menuData?.detectedLanguage ?? 'en';
  const userAllergens = useMemo(
    () => mapDietaryToAllergens(state.preferences.dietary),
    [state.preferences.dietary],
  );

  // Build allergy banner data
  const allergyBannerData: AllergyBannerData = useMemo(() => {
    const items = userAllergens.map((a) => ({
      type: a,
      icon: getAllergyIcon(a),
      labelEn: getAllergyLabel(a, 'en'),
      labelLocal: getAllergyLabel(a, detectedLanguage),
    }));
    const dietaryRestrictions = state.preferences.dietary.filter((d) =>
      ['vegetarian', 'halal', 'vegan'].includes(d),
    );
    for (const d of dietaryRestrictions) {
      if (!items.find((i) => i.type === d)) {
        items.push({
          type: d,
          icon: getAllergyIcon(d),
          labelEn: getAllergyLabel(d, 'en'),
          labelLocal: getAllergyLabel(d, detectedLanguage),
        });
      }
    }
    return { items, detectedLanguage };
  }, [userAllergens, detectedLanguage, state.preferences.dietary]);

  // 🔴-2: Compute risk items with uncertain info
  const riskItems = useMemo(() => {
    if (userAllergens.length === 0) return [];
    return state.orderItems
      .map((oi) => {
        const matched = (oi.menuItem.allergens ?? [])
          .filter((a) => userAllergens.includes(a.type))
          .map((a) => ({ type: a.type as string, uncertain: a.uncertain }));
        return matched.length > 0 ? { menuItem: oi.menuItem, allergens: matched } : null;
      })
      .filter((x): x is { menuItem: MenuItem; allergens: { type: string; uncertain: boolean }[] } => x !== null);
  }, [state.orderItems, userAllergens]);

  // 🔴-3: On mount check allergen risks (session-level persistence)
  useEffect(() => {
    if (!state.waiterAllergyConfirmed && riskItems.length > 0) {
      setShowWarningSheet(true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Toast auto-dismiss
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  // Wake Lock
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

  // 🔴-1: Handle communication actions with full flows
  const handleCommAction = (action: CommunicationAction, dish: MenuItem) => {
    const dishName = isZh ? dish.nameTranslated : dish.nameOriginal;

    switch (action) {
      case 'sold_out': {
        // 1. Remove from order
        dispatch({ type: 'REMOVE_FROM_ORDER', itemId: dish.id });
        setToast(isZh ? `已移除 ${dish.nameTranslated}` : `Removed ${dish.nameOriginal}`);

        // Check if order will be empty after removal
        const remainingItems = state.orderItems.filter(oi => oi.menuItem.id !== dish.id);
        if (remainingItems.length === 0) {
          // 🟡-5: Empty order prompt
          setSecondaryAction({ kind: 'empty_order' });
        } else {
          // 3. Ask if AI should recommend replacement
          setSecondaryAction({ kind: 'sold_out_recommend', dishName });
        }
        break;
      }
      case 'change': {
        // Don't remove from order (user might not end up changing)
        setSecondaryAction({ kind: 'change_choice', dishName });
        break;
      }
      case 'add_more':
        dispatch({ type: 'ADD_TO_ORDER', item: dish });
        setToast(isZh ? `${dish.nameTranslated} +1` : `${dish.nameOriginal} +1`);
        break;
      case 'other':
        // Navigate to Chat, no auto-message
        dispatch({ type: 'NAV_TO', view: 'chat' });
        break;
    }
    setSelectedDish(null);
  };

  // Helper: navigate to chat with auto-message
  const goToChatWithMessage = (message: string) => {
    // Add a user message to chat
    dispatch({
      type: 'ADD_MESSAGE',
      message: {
        id: `auto-${Date.now()}`,
        role: 'user',
        content: message,
        timestamp: Date.now(),
      },
    });
    dispatch({ type: 'NAV_TO', view: 'chat' });
  };

  return (
    <div className="flex flex-col min-h-dvh bg-black text-white">
      {/* Mascot header */}
      <div className="flex justify-center pt-6">
        <MascotImage expression="waving" size={48} />
      </div>

      {/* Allergy Banner */}
      <WaiterAllergyBanner allergyData={allergyBannerData} isZh={isZh} />

      {/* Menu items — large text for waiter readability */}
      <div className="flex-1 flex flex-col justify-center px-8 py-8 gap-4">
        {state.orderItems.map((oi) => (
          <button
            key={oi.menuItem.id}
            onClick={() => setSelectedDish(oi.menuItem)}
            className="flex items-baseline justify-between rounded-xl bg-white/5 px-5 py-4 text-left w-full hover:bg-white/10 transition-colors"
          >
            <div className="min-w-0">
              <span className="text-[30px] leading-tight font-semibold break-words">{oi.menuItem.nameOriginal}</span>
              {oi.menuItem.nameTranslated !== oi.menuItem.nameOriginal && (
                <span className="block text-[20px] text-white/50">{oi.menuItem.nameTranslated}</span>
              )}
            </div>
            <span className="text-[28px] font-medium ml-4 shrink-0">
              ×{oi.quantity}
            </span>
          </button>
        ))}
        {state.orderItems.length === 0 && (
          <p className="text-white/40 text-center text-lg">{isZh ? '暂无点单' : 'No items ordered'}</p>
        )}
        {state.orderItems.length > 0 && (
          <div className="pt-4 border-t border-white/20 flex items-center justify-center">
            <span className="text-xl text-white/70">{isZh ? `共 ${state.orderItems.reduce((s, o) => s + o.quantity, 0)} 道菜` : `${state.orderItems.reduce((s, o) => s + o.quantity, 0)} items`}</span>
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

      {/* Action buttons — dual exit */}
      <div className="px-6 pb-10 flex flex-col gap-3">
        <Button3D
          variant="white"
          className="w-full"
          onClick={() => dispatch({ type: 'NAV_TO', view: 'order' })}
        >
          {isZh ? '继续点菜' : 'Edit Order'}
        </Button3D>
        <button
          className="w-full py-3 rounded-2xl text-white/60 text-sm font-bold hover:text-white/90 hover:bg-white/10 transition-colors"
          onClick={() => setShowEndConfirm(true)}
        >
          {isZh ? '结束用餐' : 'End Meal'}
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 bg-white/90 text-black px-6 py-3 rounded-2xl font-bold text-base shadow-lg z-50 animate-fade-in">
          {toast}
        </div>
      )}

      {/* End Meal Confirmation */}
      {showEndConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowEndConfirm(false)} />
          <div className="relative bg-white rounded-3xl px-8 py-6 max-w-sm w-[90%]">
            <p className="text-center text-lg font-bold text-gray-900 mb-2">
              {isZh ? '确认结束用餐？' : 'End this meal?'}
            </p>
            <p className="text-center text-sm text-gray-500 mb-5">
              {isZh ? '所有数据将被清空' : 'All data will be cleared'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowEndConfirm(false)}
                className="flex-1 py-3 rounded-2xl border-2 border-gray-200 text-gray-700 font-bold hover:bg-gray-50 transition-colors"
              >
                {isZh ? '取消' : 'Cancel'}
              </button>
              <button
                onClick={() => {
                  dispatch({ type: 'RESET_SESSION' });
                  dispatch({ type: 'NAV_TO', view: 'home' });
                }}
                className="flex-1 py-3 rounded-2xl bg-red-500 text-white font-bold hover:bg-red-600 transition-colors"
              >
                {isZh ? '确认结束' : 'End Meal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🔴-3: Allergen Warning Sheet (session-level persistence) */}
      {showWarningSheet && (
        <AllergenWarningSheet
          riskItems={riskItems}
          isZh={isZh}
          onConfirm={() => {
            setShowWarningSheet(false);
            dispatch({ type: 'SET_WAITER_ALLERGY_CONFIRMED', confirmed: true });
          }}
          onCancel={() => {
            setShowWarningSheet(false);
            dispatch({ type: 'NAV_TO', view: 'order' });
          }}
        />
      )}

      {/* Dish Communication Panel */}
      {selectedDish && (
        <DishCommunicationPanel
          dish={selectedDish}
          detectedLanguage={detectedLanguage}
          isZh={isZh}
          onAction={handleCommAction}
          onClose={() => setSelectedDish(null)}
        />
      )}

      {/* 🔴-1: Secondary Action Dialogs */}
      {secondaryAction && secondaryAction.kind === 'sold_out_recommend' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative bg-white rounded-3xl px-8 py-6 max-w-sm w-[90%]">
            <p className="text-center text-lg font-bold text-gray-900 mb-2">
              {isZh ? '需要 AI 推荐替代品吗？' : 'Want AI to recommend a replacement?'}
            </p>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setSecondaryAction(null)}
                className="flex-1 py-3 rounded-2xl border-2 border-gray-200 text-gray-700 font-bold hover:bg-gray-50 transition-colors"
              >
                {isZh ? '不用了' : 'No thanks'}
              </button>
              <button
                onClick={() => {
                  const msg = isZh
                    ? `刚才的 ${secondaryAction.dishName} 没有了，请推荐一道替代品`
                    : `${secondaryAction.dishName} is sold out, please recommend a replacement`;
                  setSecondaryAction(null);
                  goToChatWithMessage(msg);
                }}
                className="flex-1 py-3 rounded-2xl bg-indigo-500 text-white font-bold hover:bg-indigo-600 transition-colors"
              >
                {isZh ? '好的' : 'Yes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {secondaryAction && secondaryAction.kind === 'change_choice' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative bg-white rounded-3xl px-8 py-6 max-w-sm w-[90%]">
            <p className="text-center text-lg font-bold text-gray-900 mb-2">
              {isZh ? '怎么换？' : 'How to change?'}
            </p>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => {
                  setSecondaryAction(null);
                  dispatch({ type: 'NAV_TO', view: 'explore' });
                }}
                className="flex-1 py-3 rounded-2xl border-2 border-gray-200 text-gray-700 font-bold hover:bg-gray-50 transition-colors"
              >
                {isZh ? '自己选' : 'Browse'}
              </button>
              <button
                onClick={() => {
                  const msg = isZh
                    ? `我想把 ${secondaryAction.dishName} 换成别的，请推荐`
                    : `I want to replace ${secondaryAction.dishName}, please recommend`;
                  setSecondaryAction(null);
                  goToChatWithMessage(msg);
                }}
                className="flex-1 py-3 rounded-2xl bg-indigo-500 text-white font-bold hover:bg-indigo-600 transition-colors"
              >
                {isZh ? '让 AI 推荐' : 'AI Suggest'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🟡-5: Empty order prompt */}
      {secondaryAction && secondaryAction.kind === 'empty_order' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative bg-white rounded-3xl px-8 py-6 max-w-sm w-[90%]">
            <p className="text-center text-lg font-bold text-gray-900 mb-2">
              {isZh ? '点菜单已空' : 'Order is empty'}
            </p>
            <p className="text-center text-sm text-gray-500 mb-5">
              {isZh ? '需要继续加菜吗？' : 'Would you like to add more dishes?'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setSecondaryAction(null)}
                className="flex-1 py-3 rounded-2xl border-2 border-gray-200 text-gray-700 font-bold hover:bg-gray-50 transition-colors"
              >
                {isZh ? '暂不' : 'Not now'}
              </button>
              <button
                onClick={() => {
                  setSecondaryAction(null);
                  dispatch({ type: 'NAV_TO', view: 'explore' });
                }}
                className="flex-1 py-3 rounded-2xl bg-indigo-500 text-white font-bold hover:bg-indigo-600 transition-colors"
              >
                {isZh ? '去加菜' : 'Add dishes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
