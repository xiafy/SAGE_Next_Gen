import { useAppState } from '../hooks/useAppState';

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

export function SettingsView() {
  const { state, dispatch } = useAppState();
  const isZh = state.preferences.language === 'zh';

  function handleToggleDietary(key: string) {
    if (state.preferences.dietary.includes(key)) {
      dispatch({ type: 'REMOVE_DIETARY', restriction: key });
    } else {
      dispatch({ type: 'ADD_DIETARY', restriction: key });
    }
  }

  function handleReset() {
    dispatch({ type: 'RESET_SESSION' });
    dispatch({ type: 'NAV_TO', view: 'home' });
  }

  return (
    <div className="flex flex-col h-dvh bg-surface">
      {/* TopBar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface">
        <div className="w-10">
          <button
            onClick={() => dispatch({ type: 'NAV_TO', view: 'home' })}
            className="text-text-secondary hover:text-text-primary transition-colors text-lg"
            aria-label={isZh ? '关闭设置' : 'Close settings'}
          >
            ✕
          </button>
        </div>
        <h1 className="text-base font-semibold text-text-primary">
          {isZh ? '设置' : 'Settings'}
        </h1>
        <div className="w-10" />
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Section 1: Language */}
        <div className="px-4 py-5">
          <h2 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-3">
            {isZh ? '语言' : 'Language'}
          </h2>
          <div className="flex gap-3">
            <button
              onClick={() => dispatch({ type: 'SET_LANGUAGE', language: 'zh' })}
              className={`flex-1 py-3 rounded-[var(--border-radius-card)] border-2 text-sm font-medium transition-colors ${
                state.preferences.language === 'zh'
                  ? 'border-brand bg-brand-light text-brand'
                  : 'border-border bg-surface-secondary text-text-secondary hover:border-text-muted'
              }`}
              aria-label="切换为中文"
            >
              中文
            </button>
            <button
              onClick={() => dispatch({ type: 'SET_LANGUAGE', language: 'en' })}
              className={`flex-1 py-3 rounded-[var(--border-radius-card)] border-2 text-sm font-medium transition-colors ${
                state.preferences.language === 'en'
                  ? 'border-brand bg-brand-light text-brand'
                  : 'border-border bg-surface-secondary text-text-secondary hover:border-text-muted'
              }`}
              aria-label="Switch to English"
            >
              English
            </button>
          </div>
        </div>

        <div className="h-px bg-border mx-4" />

        {/* Section 2: Dietary Preferences */}
        <div className="px-4 py-5">
          <h2 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-1">
            {isZh ? '饮食偏好' : 'Dietary Preferences'}
          </h2>
          <p className="text-xs text-text-muted mb-3">
            {isZh ? '点击切换饮食限制' : 'Tap to toggle restrictions'}
          </p>
          <div className="flex flex-wrap gap-2">
            {DIETARY_OPTIONS.map((opt) => {
              const selected = state.preferences.dietary.includes(opt.key);
              return (
                <button
                  key={opt.key}
                  onClick={() => handleToggleDietary(opt.key)}
                  className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                    selected
                      ? 'border-brand bg-brand-light text-brand font-medium'
                      : 'border-border text-text-secondary hover:border-text-muted'
                  }`}
                  aria-label={`${selected ? (isZh ? '移除' : 'Remove') : (isZh ? '添加' : 'Add')} ${isZh ? opt.zh : opt.en}`}
                  aria-pressed={selected}
                >
                  {isZh ? opt.zh : opt.en}
                </button>
              );
            })}
          </div>
        </div>

        <div className="h-px bg-border mx-4" />

        {/* Section 3: About */}
        <div className="px-4 py-5">
          <h2 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-3">
            {isZh ? '关于' : 'About'}
          </h2>
          <p className="text-sm text-text-secondary">SAGE v0.1.0 — Dining Agent</p>
          <p className="text-xs text-text-muted mt-1">Powered by Alibaba Cloud Bailian</p>
        </div>

        <div className="h-px bg-border mx-4" />

        {/* Section 4: Reset */}
        <div className="px-4 py-5">
          <h2 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-3">
            {isZh ? '重置' : 'Reset'}
          </h2>
          <button
            onClick={handleReset}
            className="w-full py-3 bg-error/10 hover:bg-error/20 text-error font-medium text-sm rounded-button transition-colors"
            aria-label={isZh ? '开始新会话' : 'Start new session'}
          >
            {isZh ? '开始新会话' : 'Start New Session'}
          </button>
        </div>
      </div>
    </div>
  );
}
