import { useState } from 'react';
import { useAppState } from '../hooks/useAppState';
import { Card3D } from '../components/Card3D';
import { Button3D } from '../components/Button3D';
import { Chip } from '../components/Chip';

const DIETARY_OPTIONS: Array<{
  key: string;
  zh: string;
  en: string;
}> = [
  { key: 'vegetarian', zh: '素食', en: 'Vegetarian' },
  { key: 'vegan', zh: '纯素', en: 'Vegan' },
  { key: 'gluten_free', zh: '无麸质', en: 'Gluten Free' },
  { key: 'contains_nuts', zh: '坚果过敏', en: 'Nut Allergy' },
  { key: 'contains_seafood', zh: '海鲜过敏', en: 'Seafood Allergy' },
  { key: 'contains_pork', zh: '不吃猪肉', en: 'No Pork' },
  { key: 'halal', zh: '清真', en: 'Halal' },
  { key: 'kosher', zh: '犹太洁食', en: 'Kosher' },
];

const FLAVOR_OPTIONS: Array<{
  key: string;
  zh: string;
  en: string;
}> = [
  { key: 'spicy', zh: '辣', en: 'Spicy' },
  { key: 'mild', zh: '清淡', en: 'Mild' },
  { key: 'sweet', zh: '甜', en: 'Sweet' },
  { key: 'sour', zh: '酸', en: 'Sour' },
  { key: 'savory', zh: '咸香', en: 'Savory' },
  { key: 'umami', zh: '鲜', en: 'Umami' },
  { key: 'bitter', zh: '微苦', en: 'Bitter' },
  { key: 'rich', zh: '浓郁', en: 'Rich' },
  { key: 'light', zh: '清爽', en: 'Light' },
];

export function SettingsView() {
  const { state, dispatch } = useAppState();
  const isZh = state.preferences.language === 'zh';
  const [otherInput, setOtherInput] = useState('');

  function handleToggleDietary(key: string) {
    if (state.preferences.dietary.includes(key)) {
      dispatch({ type: 'REMOVE_DIETARY', restriction: key });
    } else {
      dispatch({ type: 'ADD_DIETARY', restriction: key });
    }
  }

  function handleToggleFlavor(key: string) {
    const flavors = state.preferences.flavors ?? [];
    if (flavors.includes(key)) {
      dispatch({
        type: 'UPDATE_PREFERENCES',
        updates: [{ type: 'flavor', action: 'remove', value: key }],
      });
    } else {
      dispatch({
        type: 'UPDATE_PREFERENCES',
        updates: [{ type: 'flavor', action: 'add', value: key }],
      });
    }
  }

  function handleAddOther() {
    const val = otherInput.trim();
    if (!val) return;
    const others = state.preferences.other ?? [];
    if (!others.includes(val)) {
      dispatch({
        type: 'UPDATE_PREFERENCES',
        updates: [{ type: 'other', action: 'add', value: val }],
      });
    }
    setOtherInput('');
  }

  function handleRemoveOther(val: string) {
    dispatch({
      type: 'UPDATE_PREFERENCES',
      updates: [{ type: 'other', action: 'remove', value: val }],
    });
  }

  function handleReset() {
    dispatch({ type: 'RESET_SESSION' });
    dispatch({ type: 'NAV_TO', view: 'home' });
  }

  return (
    <div className="flex flex-col h-dvh bg-[var(--color-sage-bg)]">
      {/* TopBar */}
      <div className="flex items-center justify-between px-4 py-3 border-b-2 border-[var(--color-sage-border)] bg-white">
        <div className="w-10">
          <button
            onClick={() => dispatch({ type: 'NAV_TO', view: 'home' })}
            className="w-10 h-10 flex items-center justify-center rounded-full text-[var(--color-sage-text-secondary)] hover:text-[var(--color-sage-text)] hover:bg-[var(--color-sage-primary-light)] transition-colors text-lg"
            aria-label={isZh ? '关闭设置' : 'Close settings'}
          >
            ✕
          </button>
        </div>
        <h1 className="text-base font-bold text-[var(--color-sage-text)]">
          {isZh ? '设置' : 'Settings'}
        </h1>
        <div className="w-10" />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
        {/* Section 1: Language */}
        <Card3D>
          <h2 className="text-sm font-bold text-[var(--color-sage-text)] mb-3">
            {isZh ? '语言' : 'Language'}
          </h2>
          <div className="flex gap-3">
            <Button3D
              variant={state.preferences.language === 'zh' ? 'primary' : 'secondary'}
              className="flex-1"
              onClick={() => dispatch({ type: 'SET_LANGUAGE', language: 'zh' })}
              aria-label="切换为中文"
            >
              中文
            </Button3D>
            <Button3D
              variant={state.preferences.language === 'en' ? 'primary' : 'secondary'}
              className="flex-1"
              onClick={() => dispatch({ type: 'SET_LANGUAGE', language: 'en' })}
              aria-label="Switch to English"
            >
              English
            </Button3D>
          </div>
        </Card3D>

        {/* Section 2: Dietary Restrictions */}
        <Card3D>
          <h2 className="text-sm font-bold text-[var(--color-sage-text)] mb-1">
            {isZh ? '饮食限制' : 'Dietary Restrictions'}
          </h2>
          <p className="text-xs text-[var(--color-sage-text-secondary)] mb-3">
            {isZh ? '选择你的饮食限制，AI 会自动避开相关菜品' : 'AI will avoid dishes that conflict with your restrictions'}
          </p>
          <div className="flex flex-wrap gap-2">
            {DIETARY_OPTIONS.map((opt) => {
              const selected = state.preferences.dietary.includes(opt.key);
              return (
                <Chip
                  key={opt.key}
                  selected={selected}
                  onClick={() => handleToggleDietary(opt.key)}
                  aria-label={`${selected ? (isZh ? '移除' : 'Remove') : (isZh ? '添加' : 'Add')} ${isZh ? opt.zh : opt.en}`}
                >
                  {isZh ? opt.zh : opt.en}
                </Chip>
              );
            })}
          </div>
        </Card3D>

        {/* Section 3: Flavor Preferences */}
        <Card3D>
          <h2 className="text-sm font-bold text-[var(--color-sage-text)] mb-1">
            {isZh ? '口味偏好' : 'Flavor Preferences'}
          </h2>
          <p className="text-xs text-[var(--color-sage-text-secondary)] mb-3">
            {isZh ? '选择你喜欢的口味，AI 会优先推荐' : 'AI will prioritize dishes matching your tastes'}
          </p>
          <div className="flex flex-wrap gap-2">
            {FLAVOR_OPTIONS.map((opt) => {
              const selected = (state.preferences.flavors ?? []).includes(opt.key);
              return (
                <Chip
                  key={opt.key}
                  selected={selected}
                  onClick={() => handleToggleFlavor(opt.key)}
                  aria-label={`${selected ? (isZh ? '移除' : 'Remove') : (isZh ? '添加' : 'Add')} ${isZh ? opt.zh : opt.en}`}
                >
                  {isZh ? opt.zh : opt.en}
                </Chip>
              );
            })}
          </div>
        </Card3D>

        {/* Section 4: Other Preferences */}
        <Card3D>
          <h2 className="text-sm font-bold text-[var(--color-sage-text)] mb-1">
            {isZh ? '其他偏好' : 'Other Preferences'}
          </h2>
          <p className="text-xs text-[var(--color-sage-text-secondary)] mb-3">
            {isZh ? '添加自定义偏好，如"不要太油"、"喜欢芝士"' : 'Add custom preferences like "not too oily", "love cheese"'}
          </p>

          {/* Existing tags */}
          {(state.preferences.other ?? []).length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {(state.preferences.other ?? []).map((val) => (
                <Chip key={val} selected>
                  {val}
                  <button
                    onClick={() => handleRemoveOther(val)}
                    className="ml-1 text-[var(--color-sage-primary)]/60 hover:text-[var(--color-sage-primary)]"
                    aria-label={`${isZh ? '移除' : 'Remove'} ${val}`}
                  >
                    ✕
                  </button>
                </Chip>
              ))}
            </div>
          )}

          {/* Add new */}
          <div className="flex gap-2">
            <input
              type="text"
              value={otherInput}
              onChange={(e) => setOtherInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddOther();
                }
              }}
              placeholder={isZh ? '输入偏好…' : 'Type preference…'}
              className="flex-1 rounded-2xl border-2 border-[var(--color-sage-border)] bg-white px-4 py-2 text-sm text-[var(--color-sage-text)] placeholder:text-[var(--color-sage-text-secondary)] focus:border-[var(--color-sage-primary)] focus:outline-none transition-colors"
              maxLength={30}
            />
            <Button3D
              size="sm"
              onClick={handleAddOther}
              disabled={!otherInput.trim()}
              aria-label={isZh ? '添加' : 'Add'}
            >
              {isZh ? '添加' : 'Add'}
            </Button3D>
          </div>
        </Card3D>

        {/* Section 5: About */}
        <Card3D>
          <h2 className="text-sm font-bold text-[var(--color-sage-text)] mb-3">
            {isZh ? '关于' : 'About'}
          </h2>
          <p className="text-sm text-[var(--color-sage-text-secondary)]">SAGE v0.1.0 — Dining Agent</p>
          <p className="text-xs text-[var(--color-sage-text-secondary)] mt-1">Powered by Alibaba Cloud Bailian</p>
        </Card3D>

        {/* Section 6: Reset */}
        <div className="pt-2 pb-4">
          <Button3D
            variant="danger"
            className="w-full"
            onClick={handleReset}
            aria-label={isZh ? '开始新会话' : 'Start new session'}
          >
            {isZh ? '开始新会话' : 'Start New Session'}
          </Button3D>
        </div>
      </div>
    </div>
  );
}
