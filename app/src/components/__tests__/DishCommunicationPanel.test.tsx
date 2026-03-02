import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DishCommunicationPanel } from '../DishCommunicationPanel';
import type { MenuItem } from '../../../../shared/types';

function makeDish(): MenuItem {
  return {
    id: 'd1',
    nameOriginal: 'ผัดไทย',
    nameTranslated: 'Pad Thai',
    tags: [],
    brief: '',
    allergens: [],
    dietaryFlags: [],
    spiceLevel: 0,
    calories: null,
  };
}

const baseProps = {
  dish: makeDish(),
  detectedLanguage: 'th',
  isZh: false,
  onAction: vi.fn(),
  onClose: vi.fn(),
};

describe('DishCommunicationPanel', () => {
  it('renders 4 action buttons', () => {
    render(<DishCommunicationPanel {...baseProps} />);
    expect(screen.getByText('Sold out')).toBeInTheDocument();
    expect(screen.getByText('Change this')).toBeInTheDocument();
    expect(screen.getByText('One more')).toBeInTheDocument();
    expect(screen.getByText('Other question')).toBeInTheDocument();
  });

  it('click option → shows confirmation screen', () => {
    render(<DishCommunicationPanel {...baseProps} />);
    fireEvent.click(screen.getByText('Sold out'));
    // Confirm screen shows combined sentence
    expect(screen.getByText(/sold out/i)).toBeInTheDocument();
  });

  it('confirmation screen shows dish name + action (combined sentence)', () => {
    render(<DishCommunicationPanel {...baseProps} />);
    fireEvent.click(screen.getByText('Sold out'));
    // Should contain "Pad Thai is sold out" (English user line, dish is nameOriginal for user since isZh=false)
    expect(screen.getByText(/ผัดไทย is sold out/)).toBeInTheDocument();
  });

  it('confirmation screen shows bilingual (local language)', () => {
    render(<DishCommunicationPanel {...baseProps} />);
    fireEvent.click(screen.getByText('Sold out'));
    // Local (Thai) line
    expect(screen.getByText(/ผัดไทย ไม่มี/)).toBeInTheDocument();
  });

  it('confirm → calls onAction', () => {
    const onAction = vi.fn();
    render(<DishCommunicationPanel {...baseProps} onAction={onAction} />);
    fireEvent.click(screen.getByText('Sold out'));
    fireEvent.click(screen.getByText(/Confirm/));
    expect(onAction).toHaveBeenCalledWith('sold_out', expect.objectContaining({ id: 'd1' }));
  });

  it('back → returns to options panel', () => {
    render(<DishCommunicationPanel {...baseProps} />);
    fireEvent.click(screen.getByText('Sold out'));
    fireEvent.click(screen.getByText(/Back/));
    // Should see options again
    expect(screen.getByText('Sold out')).toBeInTheDocument();
    expect(screen.getByText('Change this')).toBeInTheDocument();
  });

  it('back then choose different option → new confirmation', () => {
    render(<DishCommunicationPanel {...baseProps} />);
    fireEvent.click(screen.getByText('Sold out'));
    fireEvent.click(screen.getByText(/Back/));
    fireEvent.click(screen.getByText('One more'));
    expect(screen.getByText(/One more ผัดไทย/)).toBeInTheDocument();
  });

  it('unknown detectedLanguage → fallback English (no crash)', () => {
    render(<DishCommunicationPanel {...baseProps} detectedLanguage="xx" />);
    fireEvent.click(screen.getByText('Sold out'));
    // Should still render without crash, English fallback
    expect(screen.getByText(/sold out/i)).toBeInTheDocument();
  });
});
