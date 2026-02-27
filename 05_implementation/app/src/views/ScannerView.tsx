import { useState, useRef, useEffect } from 'react';
import { useAppState } from '../hooks/useAppState';
import { dlog } from '../utils/debugLog';
type ScannerMode = 'single' | 'multi';

interface ScannerViewProps {
  isSupplementing?: boolean;
}

export function ScannerView({ isSupplementing = false }: ScannerViewProps) {
  const { state, dispatch } = useAppState();
  const [scannerMode, setScannerMode] = useState<ScannerMode>('single');
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [cameraError, setCameraError] = useState<'denied' | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const albumInputRef = useRef<HTMLInputElement>(null);

  const isZh = state.preferences.language === 'zh';

  // Cleanup previews on unmount
  useEffect(() => {
    return () => {
      previews.forEach((url) => URL.revokeObjectURL(url));
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Simple handleConfirm function (not wrapped in useCallback)
  function handleConfirm(filesToConfirm: File[]) {
    if (filesToConfirm.length === 0) return;
    dlog('scanner', '✅ handleConfirm:', filesToConfirm.length, 'files');
    filesToConfirm.forEach((file, idx) => {
      dlog('scanner', `  confirm[${idx}]: name="${file.name}", type="${file.type}", size=${file.size}`);
    });
    dlog('scanner', 'dispatching NAV_TO chat + START_ANALYZE');
    dispatch({ type: 'NAV_TO', view: 'chat' });
    dispatch({ type: 'START_ANALYZE', files: filesToConfirm });
    dlog('scanner', 'dispatch done');
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files;
    dlog('scanner', '📸 handleFileChange triggered, files:', selected?.length || 0);

    if (!selected || selected.length === 0) {
      dlog('scanner', '⚠️ no files selected (user cancelled?)');
      return;
    }

    Array.from(selected).forEach((file, idx) => {
      dlog('scanner', `file[${idx}]: name="${file.name}", type="${file.type}", size=${file.size}`);
    });

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
    setCameraError(null);
    e.target.value = '';

    if (scannerMode === 'single') {
      // Single mode: immediately confirm and navigate
      const firstFile = newFiles[0] as File;
      const firstPreview = newPreviews[0] as string;
      // Clean up unused previews
      newPreviews.slice(1).forEach((url) => URL.revokeObjectURL(url));
      setFiles([firstFile]);
      setPreviews([firstPreview]);
      dlog('scanner', '🔄 single mode: auto-confirming');
      handleConfirm([firstFile]);
    } else {
      // Multi mode: append to existing
      setFiles((prev) => [...prev, ...newFiles].slice(0, 5));
      setPreviews((prev) => [...prev, ...newPreviews].slice(0, 5));
      console.log('[SAGE Scanner] multi mode: added', newFiles.length, 'files, total:', files.length + newFiles.length);
    }
  }

  function openCameraPicker() {
    console.log('[SAGE Scanner] opening camera picker');
    cameraInputRef.current?.click();
  }

  function openAlbumPicker() {
    console.log('[SAGE Scanner] opening album picker');
    albumInputRef.current?.click();
  }

  function removeFile(index: number) {
    const url = previews[index];
    if (url) URL.revokeObjectURL(url);
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
    console.log('[SAGE Scanner] removed file at index', index);
  }

  function handleBack() {
    if (isSupplementing) {
      dispatch({ type: 'NAV_TO', view: 'chat' });
    } else {
      dispatch({ type: 'NAV_TO', view: 'home' });
    }
  }

  const atLimit = files.length >= 5;

  return (
    <div className="flex flex-col min-h-dvh bg-[#1a1a2e] text-white">
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        multiple
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={albumInputRef}
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
          className="text-white/80 hover:text-white transition-colors text-lg"
          aria-label={isZh ? '返回' : 'Go back'}
        >
          ← {isZh ? '返回' : 'Back'}
        </button>
        <span className="text-white/60 text-sm">
          {files.length}/5
        </span>
      </div>

      {/* Main area */}
      <div className="flex-1 flex items-center justify-center px-6">
        {files.length === 0 && !cameraError ? (
          <button
            onClick={openCameraPicker}
            className="w-full aspect-[3/4] border-2 border-dashed border-white/30 rounded-2xl flex flex-col items-center justify-center gap-3 hover:border-white/50 transition-colors"
          >
            <span className="text-4xl">📷</span>
            <p className="text-white/50 text-sm">
              {isZh ? '点击拍摄或选择菜单照片' : 'Tap to capture or select menu photos'}
            </p>
            <p className="text-white/30 text-xs">
              {isZh ? '最多 5 张' : 'Up to 5 images'}
            </p>
          </button>
        ) : cameraError ? (
          <div className="flex flex-col items-center gap-4 bg-white/10 rounded-2xl px-6 py-8 w-full">
            <span className="text-4xl">⚠️</span>
            <p className="text-white/70 text-sm text-center">
              {isZh
                ? '相机权限被拒绝。请在系统设置中允许相机访问后重试。'
                : 'Camera permission is denied. Please allow camera access in system settings.'}
            </p>
            <p className="text-white/50 text-xs text-center">
              {isZh
                ? '你仍然可以继续从相册选择菜单照片。'
                : 'You can still continue by selecting menu photos from your album.'}
            </p>
            <button
              onClick={openAlbumPicker}
              className="px-5 py-2.5 bg-white/20 hover:bg-white/30 rounded-button text-sm font-medium transition-colors"
            >
              {isZh ? '从相册选择' : 'Choose from Album'}
            </button>
          </div>
        ) : null}
      </div>

      {/* Thumbnail strip + Analyze button (multi mode only) */}
      {scannerMode === 'multi' && files.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-2">
          <div className="flex gap-2 overflow-x-auto flex-1">
            {previews.map((url, idx) => (
              <div key={url} className="relative shrink-0">
                <img
                  src={url}
                  alt={`${isZh ? '菜单照片' : 'Menu photo'} ${idx + 1}`}
                  className="w-14 h-14 rounded-lg object-cover"
                />
                <button
                  onClick={() => removeFile(idx)}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center leading-none"
                  aria-label={`${isZh ? '删除照片' : 'Remove photo'} ${idx + 1}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={() => handleConfirm(files)}
            className="shrink-0 px-4 py-2 bg-brand hover:bg-brand-hover text-white text-sm font-semibold rounded-button transition-colors"
          >
            {isZh ? '去分析' : 'Analyze'}
          </button>
        </div>
      )}

      {/* Bottom toolbar */}
      <div className="flex flex-col items-center gap-3 px-6 pb-8 pt-4">
        {/* Single/Multi toggle */}
        <div className="flex bg-white/10 rounded-full p-0.5">
          <button
            onClick={() => setScannerMode('single')}
            className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${
              scannerMode === 'single'
                ? 'bg-white text-gray-900'
                : 'text-white/70 hover:text-white'
            }`}
          >
            {isZh ? '单页' : 'Single'}
          </button>
          <button
            onClick={() => setScannerMode('multi')}
            className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${
              scannerMode === 'multi'
                ? 'bg-white text-gray-900'
                : 'text-white/70 hover:text-white'
            }`}
          >
            {isZh ? '多页' : 'Multi'}
          </button>
        </div>

        {/* Shutter row: album (left) + shutter (center) + placeholder (right) */}
        <div className="flex items-center gap-8">
          <button
            onClick={openAlbumPicker}
            className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-white/80 hover:bg-white/20 transition-colors disabled:opacity-40"
            aria-label={isZh ? '从相册选择' : 'Upload from album'}
            disabled={atLimit}
          >
            🖼
          </button>

          <button
            onClick={openCameraPicker}
            className="w-18 h-18 rounded-full border-4 border-white flex items-center justify-center disabled:opacity-40"
            aria-label={isZh ? '拍照' : 'Take photo'}
            disabled={atLimit || cameraError === 'denied'}
          >
            <div className="w-14 h-14 rounded-full bg-white" />
          </button>

          <div className="w-12" />
        </div>
      </div>
    </div>
  );
}