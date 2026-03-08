import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WaiterAllergyBanner } from '../WaiterAllergyBanner';
import type { AllergyBannerData } from '../../../../shared/types';

function makeBannerData(items: AllergyBannerData['items'] = []): AllergyBannerData {
  return { items, detectedLanguage: 'th' };
}

describe('F08-AC7: WaiterAllergyBanner — allergy banner in waiter mode', () => {
  it('renders allergen icon + English + local language', () => {
    render(
      <WaiterAllergyBanner
        allergyData={makeBannerData([
          { type: 'peanut', icon: '🥜', labelEn: 'Peanut allergy', labelLocal: 'ไม่ทานถั่ว' },
        ])}
        isZh={false}
      />,
    );
    expect(screen.getByText('🥜')).toBeInTheDocument();
    expect(screen.getByText(/Peanut allergy/)).toBeInTheDocument();
    expect(screen.getByText(/ไม่ทานถั่ว/)).toBeInTheDocument();
  });

  it('multiple allergens → all displayed', () => {
    render(
      <WaiterAllergyBanner
        allergyData={makeBannerData([
          { type: 'peanut', icon: '🥜', labelEn: 'Peanut allergy', labelLocal: 'ไม่ทานถั่ว' },
          { type: 'dairy', icon: '🥛', labelEn: 'Dairy allergy', labelLocal: 'แพ้นม' },
        ])}
        isZh={false}
      />,
    );
    expect(screen.getByText('🥜')).toBeInTheDocument();
    expect(screen.getByText('🥛')).toBeInTheDocument();
  });

  it('empty items → returns null', () => {
    const { container } = render(
      <WaiterAllergyBanner allergyData={makeBannerData([])} isZh={false} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('text is large enough (≥18px via className)', () => {
    render(
      <WaiterAllergyBanner
        allergyData={makeBannerData([
          { type: 'peanut', icon: '🥜', labelEn: 'Peanut allergy', labelLocal: 'ไม่ทานถั่ว' },
        ])}
        isZh={false}
      />,
    );
    // The component uses text-[20px] for the label
    const labelEl = screen.getByText(/Peanut allergy/).closest('span');
    expect(labelEl?.className).toContain('text-[20px]');
  });
});
