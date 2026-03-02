import type { AllergyBannerData } from '../../../shared/types';

interface WaiterAllergyBannerProps {
  allergyData: AllergyBannerData;
  isZh: boolean;
}

export function WaiterAllergyBanner({ allergyData, isZh }: WaiterAllergyBannerProps) {
  if (allergyData.items.length === 0) return null;

  return (
    <div className="bg-gradient-to-r from-orange-600 to-red-600 px-5 py-4 rounded-xl mx-4 mt-4">
      <p className="text-white/80 text-sm font-medium mb-2">
        {isZh ? '⚠️ 过敏/饮食禁忌提醒' : '⚠️ Allergy / Dietary Alert'}
      </p>
      <div className="flex flex-col gap-2">
        {allergyData.items.map((item) => (
          <div key={item.type} className="flex items-center gap-2">
            <span className="text-[22px]">{item.icon}</span>
            <span className="text-white text-[20px] font-bold leading-tight">
              {item.labelEn}
              {item.labelLocal && item.labelLocal !== item.labelEn && (
                <span className="text-white/80"> · {item.labelLocal}</span>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
