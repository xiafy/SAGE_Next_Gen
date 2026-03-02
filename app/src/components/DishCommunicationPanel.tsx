import { useState } from 'react';
import type { MenuItem, CommunicationAction } from '../../../shared/types';
import { COMM_ICONS, getPhrase } from '../utils/localLanguage';

interface DishCommunicationPanelProps {
  dish: MenuItem;
  detectedLanguage: string;
  isZh: boolean;
  onAction: (action: CommunicationAction, dish: MenuItem) => void;
  onClose: () => void;
}

const ACTIONS: CommunicationAction[] = ['sold_out', 'change', 'add_more', 'other'];

export function DishCommunicationPanel({
  dish,
  detectedLanguage,
  isZh,
  onAction,
  onClose,
}: DishCommunicationPanelProps) {
  const [confirmAction, setConfirmAction] = useState<CommunicationAction | null>(null);

  const userLang = isZh ? 'zh' : 'en';
  const localLang = detectedLanguage !== userLang ? detectedLanguage : null;

  // ─── Confirmation Screen ───
  if (confirmAction) {
    const userPhrase = getPhrase(confirmAction, userLang);
    const localPhrase = localLang ? getPhrase(confirmAction, localLang) : null;
    const icon = COMM_ICONS[confirmAction];

    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center px-8">
        <span className="text-6xl mb-6">{icon}</span>

        {/* User language - big */}
        <p className="text-white text-[36px] font-bold text-center leading-tight mb-2">
          {userPhrase}
        </p>

        {/* Local language - big */}
        {localPhrase && localPhrase !== userPhrase && (
          <p className="text-white/80 text-[32px] font-bold text-center leading-tight mb-4">
            {localPhrase}
          </p>
        )}

        {/* Dish name */}
        <p className="text-white/70 text-2xl text-center mt-4">{dish.nameOriginal}</p>
        {dish.nameTranslated !== dish.nameOriginal && (
          <p className="text-white/50 text-xl text-center">{dish.nameTranslated}</p>
        )}

        {/* Buttons */}
        <div className="flex gap-4 mt-10 w-full max-w-sm">
          <button
            onClick={() => setConfirmAction(null)}
            className="flex-1 py-4 rounded-2xl border-2 border-white/30 text-white text-lg font-bold hover:bg-white/10 transition-colors"
          >
            ← {isZh ? '返回' : 'Back'}
          </button>
          <button
            onClick={() => {
              onAction(confirmAction, dish);
            }}
            className="flex-1 py-4 rounded-2xl bg-green-500 text-white text-lg font-bold hover:bg-green-600 transition-colors"
          >
            ✓ {isZh ? '确认' : 'Confirm'}
          </button>
        </div>
      </div>
    );
  }

  // ─── Options Screen ───
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-gray-900 rounded-t-3xl px-6 py-6 animate-slide-up">
        {/* Dish name header */}
        <div className="text-center mb-5">
          <p className="text-white text-[26px] font-bold">{dish.nameOriginal}</p>
          {dish.nameTranslated !== dish.nameOriginal && (
            <p className="text-white/60 text-lg">{dish.nameTranslated}</p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-3 mb-5">
          {ACTIONS.map((action) => {
            const icon = COMM_ICONS[action];
            const userLabel = getPhrase(action, userLang);
            const localLabel = localLang ? getPhrase(action, localLang) : null;

            return (
              <button
                key={action}
                onClick={() => setConfirmAction(action)}
                className="w-full min-h-[56px] px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 transition-colors text-left flex items-center gap-4"
              >
                <span className="text-3xl shrink-0">{icon}</span>
                <div>
                  <p className="text-white text-[22px] font-bold leading-tight">{userLabel}</p>
                  {localLabel && localLabel !== userLabel && (
                    <p className="text-white/60 text-[20px] leading-tight">{localLabel}</p>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="w-full py-3 rounded-2xl border-2 border-white/20 text-white/60 font-bold text-base hover:bg-white/10 transition-colors"
        >
          × {isZh ? '关闭' : 'Close'}
        </button>
      </div>
    </div>
  );
}
