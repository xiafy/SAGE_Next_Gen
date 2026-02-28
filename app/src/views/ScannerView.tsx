import { useState, useRef, useEffect } from 'react';
import { useAppState } from '../hooks/useAppState';
import { Button3D } from '../components/Button3D';
import { Card3D } from '../components/Card3D';
import { MascotImage } from '../components/MascotImage';
import { dlog } from '../utils/debugLog';

interface ScannerViewProps {
  isSupplementing?: boolean;
}

export function ScannerView({ isSupplementing = false }: ScannerViewProps) {
  const { state, dispatch } = useAppState();
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isZh = state.preferences.language === 'zh';

  useEffect(() => {
    return () => {
      previews.forEach((url) => URL.revokeObjectURL(url));
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleConfirm() {
    if (files.length === 0) return;
    dlog('scanner', '✅ handleConfirm:', files.length, 'files');
    dispatch({ type: 'NAV_TO', view: 'chat' });
    dispatch({ type: 'START_ANALYZE', files });
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files;
    dlog('scanner', '📸 handleFileChange triggered, files:', selected?.length || 0);

    if (!selected || selected.length === 0) return;

    const remaining = 5 - files.length;
    const newFiles = Array.from(selected).slice(0, remaining);

    if (newFiles.length < selected.length) {
      alert(isZh ? '最多只能上传 5 张图片' : 'Maximum 5 images allowed');
    }

    if (newFiles.length === 0) {
      e.target.value = '';
      return;
    }

    const newPreviews = newFiles.map((f) => URL.createObjectURL(f));
    e.target.value = '';

    setFiles((prev) => [...prev, ...newFiles].slice(0, 5));
    setPreviews((prev) => [...prev, ...newPreviews].slice(0, 5));
  }

  function removeFile(index: number) {
    const url = previews[index];
    if (url) URL.revokeObjectURL(url);
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  }

  function handleBack() {
    dispatch({ type: 'NAV_TO', view: isSupplementing ? 'chat' : 'home' });
  }

  const atLimit = files.length >= 5;

  return (
    <div className="flex flex-col min-h-dvh bg-[var(--color-sage-bg)]">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3">
        <button
          onClick={handleBack}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center text-[var(--color-sage-text)] hover:text-[var(--color-sage-primary)] transition-colors text-base font-bold"
        >
          ← {isZh ? '返回' : 'Back'}
        </button>
        <span className="text-[var(--color-sage-text-secondary)] text-sm font-bold">
          {files.length}/5
        </span>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center px-5 pt-4 pb-8 gap-6">

        {/* Upload area */}
        {files.length === 0 ? (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex-1 max-h-[420px]"
          >
            <Card3D className="w-full h-full min-h-[320px] flex flex-col items-center justify-center gap-4 border-dashed !border-2 !border-[var(--color-sage-border)] hover:!border-[var(--color-sage-primary)] transition-colors cursor-pointer">
              <MascotImage expression="thinking" size={120} />
              <p className="text-[var(--color-sage-text)] font-bold text-lg">
                {isZh ? '拍照或选择菜单照片' : 'Take or choose menu photos'}
              </p>
              <p className="text-[var(--color-sage-text-secondary)] text-sm">
                {isZh ? '支持 1-5 张，AI 会自动识别菜品' : '1-5 photos, AI auto-recognizes dishes'}
              </p>
            </Card3D>
          </button>
        ) : (
          <>
            {/* Photo grid */}
            <div className="w-full">
              <div className="flex gap-3 overflow-x-auto pb-2">
                {previews.map((url, idx) => (
                  <div key={url} className="relative shrink-0">
                    <img
                      src={url}
                      alt={`${isZh ? '菜单照片' : 'Menu photo'} ${idx + 1}`}
                      className="w-28 h-28 rounded-2xl object-cover border-2 border-[var(--color-sage-border)]"
                    />
                    <button
                      onClick={() => removeFile(idx)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-[var(--color-sage-error)] rounded-full text-white text-sm font-bold flex items-center justify-center shadow-md"
                    >
                      ×
                    </button>
                  </div>
                ))}

                {/* Add more button */}
                {!atLimit && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-28 h-28 shrink-0 rounded-2xl border-2 border-dashed border-[var(--color-sage-border)] flex flex-col items-center justify-center gap-1 hover:border-[var(--color-sage-primary)] transition-colors"
                  >
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-sage-text-secondary)" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M12 5V19M5 12H19" />
                    </svg>
                    <span className="text-[var(--color-sage-text-secondary)] text-xs font-bold">
                      {isZh ? '添加' : 'Add'}
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* Mascot encouragement */}
            <div className="flex items-center gap-3">
              <MascotImage expression="excited" size={56} />
              <p className="text-[var(--color-sage-text-secondary)] text-sm font-semibold">
                {isZh
                  ? `已选 ${files.length} 张照片${files.length < 3 ? '，多拍几张识别更准确哦' : '，看起来不错！'}`
                  : `${files.length} photo${files.length > 1 ? 's' : ''} selected${files.length < 3 ? '. More photos = better results!' : '. Looks good!'}`
                }
              </p>
            </div>
          </>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Action buttons */}
        <div className="w-full flex flex-col gap-3">
          {files.length === 0 ? (
            <Button3D
              onClick={() => fileInputRef.current?.click()}
              className="w-full"
              size="lg"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="inline-block mr-2 -mt-0.5">
                <path d="M23 19C23 19.5304 22.7893 20.0391 22.4142 20.4142C22.0391 20.7893 21.5304 21 21 21H3C2.46957 21 1.96086 20.7893 1.58579 20.4142C1.21071 20.0391 1 19.5304 1 19V8C1 7.46957 1.21071 6.96086 1.58579 6.58579C1.96086 6.21071 2.46957 6 3 6H7L9 3H15L17 6H21C21.5304 6 22.0391 6.21071 22.4142 6.58579C22.7893 6.96086 23 7.46957 23 8V19Z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              {isZh ? '拍照或选择照片' : 'Take or Choose Photos'}
            </Button3D>
          ) : (
            <Button3D
              onClick={handleConfirm}
              className="w-full"
              size="lg"
            >
              {isZh ? `确认并分析（${files.length}张）` : `Analyze ${files.length} Photo${files.length > 1 ? 's' : ''}`}
            </Button3D>
          )}
        </div>
      </div>
    </div>
  );
}
