import { useState, useEffect, useRef, useMemo } from 'react';
import { useAppState } from '../hooks/useAppState';
import { TopBar } from '../components/TopBar';
import { ChatBubble } from '../components/ChatBubble';
import { QuickReplies } from '../components/QuickReplies';
import { LoadingDots } from '../components/LoadingDots';
import { MascotImage } from '../components/MascotImage';
import { Button3D } from '../components/Button3D';
import { DishCard } from '../components/DishCard';
import { streamChat, buildChatParams } from '../api/chat';
import { analyzeMenu } from '../api/analyze';
import { transcribeAudio } from '../api/transcribe';
import type { Message, PreferenceUpdate } from '../types';
import { toUserFacingError } from '../utils/errorMessage';
import { dlog } from '../utils/debugLog';
import { mapDietaryToAllergens } from '../utils/allergenMapping';

interface Recommendation {
  itemId: string;
  reason: string;
}

// ── MediaRecorder voice support detection ────────────────────────────────────
const voiceSupported = typeof window !== 'undefined' && typeof MediaRecorder !== 'undefined';

function pickMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return 'audio/mp4';
  if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) return 'audio/webm;codecs=opus';
  if (MediaRecorder.isTypeSupported('audio/webm')) return 'audio/webm';
  if (MediaRecorder.isTypeSupported('audio/mp4')) return 'audio/mp4';
  return '';
}

const VOICE_CANCEL_THRESHOLD = 80;  // px: slide up distance to cancel
const VOICE_MIN_DURATION_MS = 500;  // ignore recordings shorter than 0.5s
const VOICE_MAX_DURATION_MS = 60_000; // auto-stop at 60s

export function AgentChatView() {
  const { state, dispatch } = useAppState();
  const [inputValue, setInputValue] = useState('');
  const [streamingText, setStreamingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [quickReplies, setQuickReplies] = useState<string[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [voiceMode, setVoiceMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isCancelZone, setIsCancelZone] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const analyzeAbortRef = useRef<AbortController | null>(null);
  const chatAbortRef = useRef<AbortController | null>(null);
  const handoffTriggeredRef = useRef(false);
  const icebreakerSentRef = useRef(false);
  const analyzeTriggeredRef = useRef(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordStartRef = useRef<number>(0);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const recordMaxTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pointerStartYRef = useRef<number>(0);
  const cancelledRef = useRef(false);

  const isZh = state.preferences.language === 'zh';

  // Map dietary prefs to AllergenType values for DishCard allergen matching
  const userAllergens = useMemo(() => {
    return mapDietaryToAllergens(state.preferences.dietary);
  }, [state.preferences.dietary]);

  const priceFmt = useMemo(() => {
    const code = state.menuData?.currency?.toUpperCase();
    const validCode = code && /^[A-Z]{3}$/.test(code) ? code : 'CNY';
    const locale = isZh ? 'zh-CN' : 'en-US';
    try {
      return new Intl.NumberFormat(locale, { style: 'currency', currency: validCode, maximumFractionDigits: 0 });
    } catch {
      return new Intl.NumberFormat(locale, { style: 'decimal', maximumFractionDigits: 0 });
    }
  }, [state.menuData?.currency, isZh]);

  // ---------- Trigger analyze when files are ready ----------
  useEffect(() => {
    if (state.analyzingFiles && state.analyzingFiles.length > 0 && !analyzeTriggeredRef.current) {
      analyzeTriggeredRef.current = true;
      dlog('chat', '🔄 useEffect: triggering analyzeMenu with', state.analyzingFiles.length, 'files');
      dlog('chat', 'analyzingFiles[0]:', state.analyzingFiles[0]?.name, state.analyzingFiles[0]?.type, state.analyzingFiles[0]?.size);
      performAnalyze(state.analyzingFiles);
    } else {
      dlog('chat', 'useEffect: analyzingFiles=', state.analyzingFiles?.length ?? 'null', 'triggered=', analyzeTriggeredRef.current);
    }
    if (state.chatPhase === 'failed' && state.isSupplementing) {
      dispatch({ type: 'SET_SUPPLEMENTING', value: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.analyzingFiles, state.menuData, state.chatPhase]);

  // ---------- Icebreaker on mount (pre_chat only) ----------
  useEffect(() => {
    if (state.chatPhase === 'pre_chat' && !icebreakerSentRef.current && state.messages.length === 0) {
      icebreakerSentRef.current = true;
      dispatch({
        type: 'ADD_MESSAGE',
        message: {
          id: `ice_${Date.now()}`,
          role: 'assistant',
          content: isZh
            ? '菜单识别中，先聊两句～今天几位用餐？'
            : 'Scanning your menu! How many dining today?',
          timestamp: Date.now(),
        },
      });
      setQuickReplies(
        isZh ? ['两位', '三位', '我一个人', '还没确定'] : ['Two', 'Three', 'Just me', 'Not sure yet'],
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- Handoff detection ----------
  useEffect(() => {
    if (
      state.chatPhase === 'handing_off' &&
      state.menuData !== null &&
      !handoffTriggeredRef.current &&
      !isStreaming
    ) {
      const userMsgCount = state.messages.filter(m => m.role === 'user').length;
      dlog('chat', 'handoff ready: userMsgs=', userMsgCount);

      if (userMsgCount > 0) {
        doHandoff();
      } else {
        dlog('chat', '⏳ waiting for pre-chat interaction (max 8s)...');
        const timer = setTimeout(() => {
          if (!handoffTriggeredRef.current) {
            dlog('chat', '⏰ pre-chat timeout, proceeding with handoff');
            doHandoff();
          }
        }, 8000);
        return () => clearTimeout(timer);
      }
    }

    function doHandoff() {
      handoffTriggeredRef.current = true;
      dlog('chat', '🔄 HANDOFF triggered! sending to main chat AI');

      dispatch({
        type: 'ADD_MESSAGE',
        message: {
          id: `sys_handoff_${Date.now()}`,
          role: 'assistant',
          content: isZh ? '菜单识别完成！正在为你分析…' : 'Menu scanned! Analyzing for you...',
          timestamp: Date.now(),
        },
      });

      sendToAI('chat');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.chatPhase, state.menuData, state.messages]);

  // ---------- Auto scroll ----------
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.messages, streamingText, isStreaming]);

  // ---------- Cleanup on unmount ----------
  useEffect(() => {
    return () => {
      chatAbortRef.current?.abort();
      clearTimeout(toastTimerRef.current);
      clearInterval(recordTimerRef.current);
      clearTimeout(recordMaxTimerRef.current);
      if (recorderRef.current?.state === 'recording') {
        recorderRef.current.stop();
      }
    };
  }, []);

  // ---------- Toast helper ----------
  function showToast(msg: string) {
    setToastMsg(msg);
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastMsg(null), 3000);
  }

  // ---------- Voice input (F13 v2 — WeChat style + MediaRecorder + Server ASR) ----------

  function cleanupRecording() {
    clearInterval(recordTimerRef.current);
    clearTimeout(recordMaxTimerRef.current);
    setIsRecording(false);
    setIsCancelZone(false);
    setRecordDuration(0);
    cancelledRef.current = false;
  }

  async function handleVoicePointerDown(e: React.PointerEvent) {
    if (isStreaming || isTranscribing) return;

    pointerStartYRef.current = e.clientY;
    cancelledRef.current = false;
    audioChunksRef.current = [];

    // Request microphone
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      showToast(isZh ? '麦克风权限被拒绝，请在浏览器设置中允许' : 'Microphone permission denied');
      return;
    }

    const mimeType = pickMimeType();
    if (!mimeType) {
      showToast(isZh ? '当前浏览器不支持录音' : 'Recording not supported in this browser');
      stream.getTracks().forEach(t => t.stop());
      return;
    }

    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 16_000 });
    } catch {
      // Fallback: no options
      recorder = new MediaRecorder(stream);
    }

    recorder.ondataavailable = (ev) => {
      if (ev.data.size > 0) audioChunksRef.current.push(ev.data);
    };

    recorder.onstop = () => {
      stream.getTracks().forEach(t => t.stop());
    };

    recorderRef.current = recorder;
    recordStartRef.current = Date.now();
    recorder.start(200); // collect chunks every 200ms
    setIsRecording(true);
    setRecordDuration(0);

    // Duration timer
    recordTimerRef.current = setInterval(() => {
      setRecordDuration(Math.floor((Date.now() - recordStartRef.current) / 1000));
    }, 500);

    // Max duration auto-stop
    recordMaxTimerRef.current = setTimeout(() => {
      if (recorderRef.current?.state === 'recording') {
        finishRecording();
      }
    }, VOICE_MAX_DURATION_MS);
  }

  function handleVoicePointerMove(e: React.PointerEvent) {
    if (!isRecording) return;
    const dy = pointerStartYRef.current - e.clientY; // positive = up
    const inCancel = dy > VOICE_CANCEL_THRESHOLD;
    setIsCancelZone(inCancel);
    cancelledRef.current = inCancel;
  }

  function handleVoicePointerUp() {
    if (!isRecording) return;
    finishRecording();
  }

  async function finishRecording() {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state !== 'recording') {
      cleanupRecording();
      return;
    }

    const wasCancelled = cancelledRef.current;
    const duration = Date.now() - recordStartRef.current;

    // Stop recorder → triggers onstop (releases mic)
    recorder.stop();
    cleanupRecording();

    if (wasCancelled) {
      dlog('chat', '🎤 recording cancelled by user');
      return;
    }

    if (duration < VOICE_MIN_DURATION_MS) {
      showToast(isZh ? '说话时间太短' : 'Recording too short');
      return;
    }

    // Wait a tick for final ondataavailable
    await new Promise(r => setTimeout(r, 100));

    const chunks = audioChunksRef.current;
    if (chunks.length === 0) {
      showToast(isZh ? '未录到声音' : 'No audio captured');
      return;
    }

    const audioBlob = new Blob(chunks, { type: chunks[0]?.type || 'audio/mp4' });
    dlog('chat', '🎤 audio recorded:', audioBlob.size, 'bytes,', duration, 'ms');

    // Transcribe
    setIsTranscribing(true);
    try {
      const text = await transcribeAudio(audioBlob, state.preferences.language);
      dlog('chat', '🎤 transcribed:', text);

      if (!text.trim()) {
        showToast(isZh ? '未识别到语音内容' : 'No speech detected');
        return;
      }

      const userMsg: Message = {
        id: `user_voice_${Date.now()}`,
        role: 'user',
        content: text.trim(),
        timestamp: Date.now(),
      };
      dispatch({ type: 'ADD_MESSAGE', message: userMsg });
      const mode = (state.chatPhase === 'chatting' || state.chatPhase === 'handing_off') ? 'chat' : 'pre_chat';
      sendToAI(mode, [userMsg]);
    } catch (err) {
      dlog('chat', '🎤 transcription error:', err);
      showToast(isZh ? '语音识别失败，请重试' : 'Voice recognition failed, please try again');
    } finally {
      setIsTranscribing(false);
    }
  }

  // ---------- Perform menu analysis ----------
  async function performAnalyze(files: File[]) {
    const controller = new AbortController();
    analyzeAbortRef.current = controller;

    try {
      dlog('chat', '🚀 performAnalyze: calling analyzeMenu...');
      const result = await analyzeMenu(files, state.preferences.language, state.location, controller.signal);
      dlog('chat', '✅ performAnalyze: success, items=', result.items?.length, 'supplementing=', state.isSupplementing);
      dispatch({ type: 'SET_MENU_DATA', data: result });

      if (state.isSupplementing) {
        dlog('chat', '📸 supplement done, notifying user');
        const existingNames = new Set(state.menuData?.items.map(i => i.nameOriginal) ?? []);
        const newItemCount = result.items.filter(i => !existingNames.has(i.nameOriginal)).length;
        const totalCount = (state.menuData?.items.length ?? 0) + newItemCount;
        dispatch({
          type: 'ADD_MESSAGE',
          message: {
            id: `sys_supplement_${Date.now()}`,
            role: 'assistant',
            content: isZh
              ? `补充菜单已识别！现在共有 ${totalCount} 道菜。有什么想问的吗？`
              : `Menu updated! Now showing ${totalCount} items. What would you like to know?`,
            timestamp: Date.now(),
          },
        });
        dispatch({ type: 'SET_SUPPLEMENTING', value: false });
      }
    } catch (err) {
      dlog('chat', '❌ performAnalyze FAILED:', err);
      if (err instanceof Error) {
        dlog('chat', 'Error:', err.name, err.message);
      }
      dispatch({ type: 'SET_CHAT_PHASE', phase: 'failed' });
      showToast(toUserFacingError(err, { language: state.preferences.language, fallbackKind: 'recognize' }));
    } finally {
      dispatch({ type: 'CLEAR_ANALYZING_FILES' });
    }
  }

  // ---------- Send to AI ----------
  function sendToAI(mode: 'pre_chat' | 'chat', extraMessages: Message[] = []) {
    dlog('chat', '🤖 sendToAI mode=', mode, 'chatPhase=', state.chatPhase);
    setIsStreaming(true);
    setStreamingText('');
    setRecommendations([]);

    const allMessages = [...state.messages, ...extraMessages];
    dlog('chat', 'messages count=', allMessages.length, 'menuData items=', state.menuData?.items?.length ?? 'null');
    const params = buildChatParams(
      mode,
      allMessages.map((m) => ({ role: m.role, content: m.content })),
      state.menuData,
      state.preferences,
      state.location,
    );
    dlog('chat', 'chatParams built, mode=', params.mode);

    let fullText = '';

    chatAbortRef.current = streamChat(
      params,
      (chunk) => {
        fullText += chunk;
        if (fullText.length <= 50 || fullText.length % 200 === 0) {
          dlog('chat', '📥 streaming chunk, total len=', fullText.length);
        }
        setStreamingText(fullText);
      },
      () => {
        dlog('chat', '✅ stream done, total len=', fullText.length);
        setIsStreaming(false);
        processAIResponse(fullText, mode);
      },
      (err) => {
        dlog('chat', '❌ stream ERROR:', err, 'fullText.len=', fullText.length);
        setIsStreaming(false);

        // Preserve partial content if any was streamed
        if (fullText.length > 0) {
          dispatch({
            type: 'ADD_MESSAGE',
            message: {
              id: `ai_partial_${Date.now()}`,
              role: 'assistant',
              content: fullText,
              timestamp: Date.now(),
            },
          });
        }
        setStreamingText('');

        if (state.chatPhase === 'handing_off') {
          dispatch({ type: 'SET_CHAT_PHASE', phase: 'failed' });
          showToast(toUserFacingError(err, { language: state.preferences.language, fallbackKind: 'chat' }));
        } else if (state.chatPhase === 'chatting') {
          dispatch({
            type: 'ADD_MESSAGE',
            message: {
              id: `sys_err_${Date.now()}`,
              role: 'assistant',
              content: isZh ? 'AI 回复中断，已保留已有内容。' : 'AI response interrupted. Partial content preserved.',
              timestamp: Date.now(),
            },
          });
          showToast(toUserFacingError(err, { language: state.preferences.language, fallbackKind: 'chat' }));
        } else {
          showToast(toUserFacingError(err, { language: state.preferences.language, fallbackKind: 'chat' }));
        }
      },
    );
  }

  // ---------- Process AI response ----------
  function processAIResponse(fullText: string, mode: 'pre_chat' | 'chat') {
    let displayText = fullText;
    let newQuickReplies: string[] = [];
    let newRecommendations: Recommendation[] = [];

    try {
      const parsed: unknown = JSON.parse(fullText);
      const obj = parsed as Record<string, unknown>;

      if (typeof obj['message'] === 'string') {
        displayText = obj['message'];
      }
      if (Array.isArray(obj['quickReplies'])) {
        newQuickReplies = obj['quickReplies'] as string[];
      }
      if (Array.isArray(obj['recommendations'])) {
        // KI-006: 过滤 AI 幻觉 itemId，只保留 menuData 中实际存在的菜品
        const validIds = new Set(state.menuData?.items.map(i => i.id) ?? []);
        newRecommendations = (obj['recommendations'] as Recommendation[]).filter(
          rec => typeof rec.itemId === 'string' && validIds.has(rec.itemId)
        );
      }
      if (Array.isArray(obj['preferenceUpdates']) && (obj['preferenceUpdates'] as PreferenceUpdate[]).length > 0) {
        dispatch({ type: 'UPDATE_PREFERENCES', updates: obj['preferenceUpdates'] as PreferenceUpdate[] });
      }
    } catch {
      // Not JSON — use raw text (graceful degradation)
    }

    setStreamingText('');
    setQuickReplies(newQuickReplies);
    setRecommendations(newRecommendations);

    dispatch({
      type: 'ADD_MESSAGE',
      message: {
        id: `ai_${Date.now()}`,
        role: 'assistant',
        content: displayText,
        timestamp: Date.now(),
      },
    });

    if (mode === 'chat' && state.chatPhase === 'handing_off') {
      dispatch({ type: 'SET_CHAT_PHASE', phase: 'chatting' });
    }
  }

  // ---------- User send ----------
  function handleSend() {
    if (!inputValue.trim() || isStreaming) return;

    const userMsg: Message = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: inputValue.trim(),
      timestamp: Date.now(),
    };
    dispatch({ type: 'ADD_MESSAGE', message: userMsg });
    setInputValue('');

    const mode = (state.chatPhase === 'chatting' || state.chatPhase === 'handing_off') ? 'chat' : 'pre_chat';
    sendToAI(mode, [userMsg]);
  }

  function handleQuickReply(reply: string) {
    if (isStreaming) return;

    const userMsg: Message = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: reply,
      timestamp: Date.now(),
    };
    dispatch({ type: 'ADD_MESSAGE', message: userMsg });

    const mode = (state.chatPhase === 'chatting' || state.chatPhase === 'handing_off') ? 'chat' : 'pre_chat';
    sendToAI(mode, [userMsg]);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleAddToOrder(rec: Recommendation) {
    const menuItem = state.menuData?.items.find((item) => item.id === rec.itemId);
    if (menuItem) {
      dispatch({ type: 'ADD_TO_ORDER', item: menuItem });
    }
  }

  const showProgressBar = state.chatPhase === 'pre_chat' || state.chatPhase === 'handing_off';
  const showInputArea = state.chatPhase !== 'failed';

  return (
    <div className="flex flex-col h-dvh bg-[var(--color-sage-bg)]">
      <TopBar
        title="SAGE"
        onBack={() => {
          const msg = isZh ? '退出会清空当前会话，确定吗？' : 'Leaving will clear your session. Are you sure?';
          if (window.confirm(msg)) {
            dispatch({ type: 'RESET_SESSION' });
            dispatch({ type: 'NAV_TO', view: 'home' });
          }
        }}
        rightAction={
          <div className="flex items-center gap-2">
            {state.menuData && (
              <button
                onClick={() => dispatch({ type: 'NAV_TO', view: 'explore' })}
                className="text-[var(--color-sage-text-secondary)] hover:text-[var(--color-sage-text)] transition-colors text-sm"
                aria-label={isZh ? '浏览菜单' : 'Browse menu'}
              >
                📋
              </button>
            )}
            {state.orderItems.length > 0 && (
              <button
                onClick={() => dispatch({ type: 'NAV_TO', view: 'order' })}
                className="relative text-[var(--color-sage-text-secondary)] hover:text-[var(--color-sage-text)] transition-colors text-sm"
                aria-label={isZh ? '查看点单' : 'View order'}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5H7C5.89543 5 5 5.89543 5 7V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V7C19 5.89543 18.1046 5 17 5H15" /><path d="M9 5C9 3.89543 9.89543 3 11 3H13C14.1046 3 15 3.89543 15 5C15 6.10457 14.1046 7 13 7H11C9.89543 7 9 6.10457 9 5Z" /><path d="M9 12H15" /><path d="M9 16H13" /></svg>
                <span className="absolute -top-1 -right-2 bg-[var(--color-sage-primary)] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {state.orderItems.length}
                </span>
              </button>
            )}
          </div>
        }
      />

      {/* Failed state */}
      {state.chatPhase === 'failed' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
          <MascotImage expression="confused" size={120} />
          <p className="text-[var(--color-sage-text-secondary)] text-center text-sm font-semibold">
            {state.menuData
              ? (isZh ? 'AI 对话出现问题，要重试吗？' : 'AI chat failed. Try again?')
              : (isZh ? '菜单识别未能完成，可能是网络波动，可以重试或重新拍摄' : 'Recognition failed. You can retry or take a new photo.')}
          </p>
          <div className="flex gap-3">
            {state.menuData ? (
              <>
                <Button3D
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    handoffTriggeredRef.current = false;
                    dispatch({ type: 'SET_CHAT_PHASE', phase: 'handing_off' });
                  }}
                  aria-label={isZh ? '重试对话' : 'Retry chat'}
                >
                  {isZh ? '重试' : 'Retry'}
                </Button3D>
                <Button3D
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    dispatch({ type: 'SET_CHAT_PHASE', phase: 'chatting' });
                  }}
                  aria-label={isZh ? '继续对话' : 'Continue anyway'}
                >
                  {isZh ? '继续对话' : 'Continue Anyway'}
                </Button3D>
              </>
            ) : (
              <>
                {state.analyzingFiles && state.analyzingFiles.length > 0 && (
                  <Button3D
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      analyzeTriggeredRef.current = false;
                      dispatch({ type: 'SET_CHAT_PHASE', phase: 'pre_chat' });
                    }}
                    aria-label={isZh ? '重试识别' : 'Retry recognition'}
                  >
                    {isZh ? '重试' : 'Retry'}
                  </Button3D>
                )}
                <Button3D
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    dispatch({ type: 'SET_CHAT_PHASE', phase: 'pre_chat' });
                    dispatch({ type: 'NAV_TO', view: 'scanner' });
                  }}
                  aria-label={isZh ? '重新扫描' : 'Rescan menu'}
                >
                  {isZh ? '重新扫描' : 'Rescan'}
                </Button3D>
              </>
            )}
          </div>
        </div>
      )}

      {/* Progress bar - phase-aware */}
      {showProgressBar && (() => {
        // pre_chat: uploading & recognizing menu (0-60%)
        // handing_off w/o menuData: still recognizing (40-60%)
        // handing_off w/ menuData: AI analyzing (60-90%)
        const isAnalyzing = state.chatPhase === 'handing_off' && state.menuData !== null;
        const label = isAnalyzing
          ? (isZh ? '分析推荐中…' : 'Analyzing…')
          : (isZh ? '菜单识别中…' : 'Scanning menu…');
        const progressClass = isAnalyzing ? 'animate-progress-analyze' : 'animate-progress-scan';

        return (
          <div className="px-4 py-3">
            <div className="bg-[var(--color-sage-primary-light)] rounded-[var(--radius-md)] px-4 py-2.5 flex items-center gap-3">
              <MascotImage expression="thinking" size={28} className="rounded-full" />
              <div className="flex-1">
                <div className="h-2.5 bg-[var(--color-sage-border)] rounded-full overflow-hidden">
                  <div className={`h-full bg-gradient-to-r from-[var(--color-sage-primary)] to-[var(--color-sage-accent)] rounded-full transition-all ${progressClass}`} />
                </div>
              </div>
              <span className="text-sm text-[var(--color-sage-primary)] font-bold whitespace-nowrap">
                {label}
              </span>
            </div>
          </div>
        );
      })()}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-24">
        {state.messages.map((msg) => (
          <ChatBubble key={msg.id} message={msg} />
        ))}

        {/* Streaming bubble */}
        {isStreaming && streamingText && (
          <div className="flex justify-start mb-3 animate-slide-up">
            <div className="shrink-0 mt-1 mr-2">
              <MascotImage expression="default" size={32} className="rounded-full" />
            </div>
            <div className="max-w-[75%] px-4 py-2.5 text-[15px] leading-relaxed font-semibold bg-white text-[var(--color-sage-text)] rounded-[var(--radius-md)_var(--radius-md)_var(--radius-md)_4px] border-2 border-[var(--color-sage-border)] shadow-[0_4px_0_var(--color-sage-border)]">
              {streamingText}
              <span className="inline-block w-0.5 h-4 bg-[var(--color-sage-primary)] ml-0.5 animate-pulse align-text-bottom" />
            </div>
          </div>
        )}

        {/* Loading dots */}
        {isStreaming && !streamingText && (
          <LoadingDots text={isZh ? '正在分析菜单…' : 'Analyzing menu…'} />
        )}

        {/* Recommendation cards */}
        {recommendations.length > 0 && !isStreaming && (
          <div className="flex flex-col gap-3 mb-3 ml-10">
            {recommendations.map((rec) => {
              const item = state.menuData?.items.find((i) => i.id === rec.itemId);
              if (!item) return null;
              const orderItem = state.orderItems.find((oi) => oi.menuItem.id === rec.itemId);
              return (
                <div key={rec.itemId} className="animate-slide-up">
                  <DishCard
                    item={item}
                    isZh={isZh}
                    userAllergens={userAllergens}
                    orderItem={orderItem}
                    onAdd={() => handleAddToOrder(rec)}
                    onUpdateQty={(qty) => dispatch({ type: 'UPDATE_ORDER_QTY', itemId: rec.itemId, quantity: qty })}
                  />
                  {rec.reason && (
                    <p className="text-xs text-[var(--color-sage-text-secondary)] mt-1 ml-3">{rec.reason}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick replies */}
      {quickReplies.length > 0 && !isStreaming && (
        <QuickReplies replies={quickReplies} onSelect={handleQuickReply} />
      )}

      {/* Order summary bar */}
      {state.orderItems.length > 0 && (
        <button
          onClick={() => dispatch({ type: 'NAV_TO', view: 'order' })}
          className="mx-4 mb-2 py-2.5 bg-[var(--color-sage-primary-light)] rounded-[var(--radius-md)] flex items-center justify-between px-4 border-2 border-[var(--color-sage-primary)]"
          aria-label={isZh ? '查看点单' : 'View order'}
        >
          <span className="text-sm text-[var(--color-sage-primary)] font-bold">
            {isZh ? `已点 ${state.orderItems.reduce((sum, oi) => sum + oi.quantity, 0)} 道菜` : `${state.orderItems.reduce((sum, oi) => sum + oi.quantity, 0)} items`}
          </span>
          <span className="text-sm text-[var(--color-sage-primary)] font-extrabold">
            {priceFmt.format(state.orderItems.reduce((sum, oi) => sum + (oi.menuItem.price ?? 0) * oi.quantity, 0))}
          </span>
        </button>
      )}

      {/* Recording overlay — cancel zone indicator */}
      {isRecording && (
        <div className="fixed inset-0 z-40 pointer-events-none flex flex-col items-center justify-center">
          <div className={`mb-20 px-6 py-3 rounded-2xl text-sm font-bold transition-all ${
            isCancelZone
              ? 'bg-red-500/90 text-white scale-110'
              : 'bg-black/60 text-white'
          }`}>
            {isCancelZone
              ? (isZh ? '松开 取消' : 'Release to cancel')
              : (isZh ? `松开 发送 (${recordDuration}s)` : `Release to send (${recordDuration}s)`)}
          </div>
          {!isCancelZone && (
            <div className="flex gap-1 items-center">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="w-1 bg-[var(--color-sage-primary)] rounded-full animate-pulse" style={{
                  height: `${12 + Math.random() * 16}px`,
                  animationDelay: `${i * 0.1}s`,
                }} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Transcribing indicator */}
      {isTranscribing && (
        <div className="mx-4 mb-2 py-2 text-center text-sm font-semibold text-[var(--color-sage-primary)] animate-pulse">
          {isZh ? '语音识别中…' : 'Transcribing…'}
        </div>
      )}

      {/* Input area — WeChat style */}
      {showInputArea && (
        <div className="flex items-center gap-2 px-4 py-3 border-t-2 border-[var(--color-sage-border)] bg-white">
          {/* Camera button (chatting phase only) */}
          {state.chatPhase === 'chatting' && !voiceMode && (
            <button
              onClick={() => {
                dispatch({ type: 'SET_SUPPLEMENTING', value: true });
                dispatch({ type: 'NAV_TO', view: 'scanner' });
              }}
              className="btn-3d btn-3d-ghost w-10 h-10 shrink-0 rounded-full flex items-center justify-center"
              aria-label={isZh ? '补充菜单照片' : 'Add more photos'}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19C23 19.5304 22.7893 20.0391 22.4142 20.4142C22.0391 20.7893 21.5304 21 21 21H3C2.46957 21 1.96086 20.7893 1.58579 20.4142C1.21071 20.0391 1 19.5304 1 19V8C1 7.46957 1.21071 6.96086 1.58579 6.58579C1.96086 6.21071 2.46957 6 3 6H7L9 3H15L17 6H21C21.5304 6 22.0391 6.21071 22.4142 6.58579C22.7893 6.96086 23 7.46957 23 8V19Z" /><circle cx="12" cy="13" r="4" /></svg>
            </button>
          )}

          {/* Voice/Keyboard toggle */}
          {voiceSupported && (
            <button
              onClick={() => setVoiceMode(!voiceMode)}
              className="btn-3d btn-3d-ghost w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-lg"
              aria-label={voiceMode ? (isZh ? '切换到键盘' : 'Switch to keyboard') : (isZh ? '切换到语音' : 'Switch to voice')}
            >
              {voiceMode ? '⌨️' : '🎤'}
            </button>
          )}

          {/* Voice mode: Hold-to-talk button */}
          {voiceMode ? (
            <button
              onPointerDown={handleVoicePointerDown}
              onPointerMove={handleVoicePointerMove}
              onPointerUp={handleVoicePointerUp}
              onPointerCancel={handleVoicePointerUp}
              disabled={isStreaming || isTranscribing}
              className={`flex-1 py-3 rounded-[var(--radius-md)] text-sm font-bold select-none touch-none transition-all border-2 ${
                isRecording
                  ? isCancelZone
                    ? 'bg-red-100 border-red-400 text-red-600'
                    : 'bg-green-100 border-green-400 text-green-700'
                  : 'bg-[var(--color-sage-bg)] border-[var(--color-sage-border)] text-[var(--color-sage-text-secondary)] active:bg-gray-200'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              aria-label={isZh ? '按住说话' : 'Hold to talk'}
            >
              {isRecording
                ? (isCancelZone
                    ? (isZh ? '↑ 松开取消' : '↑ Release to cancel')
                    : (isZh ? `松开 发送 (${recordDuration}s)` : `Release to send (${recordDuration}s)`))
                : isTranscribing
                  ? (isZh ? '识别中…' : 'Transcribing…')
                  : (isZh ? '按住 说话' : 'Hold to talk')}
            </button>
          ) : (
            /* Text mode: input + send button */
            <>
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isZh ? '输入消息…' : 'Type a message…'}
                disabled={isStreaming}
                className="flex-1 bg-[var(--color-sage-bg)] rounded-[var(--radius-md)] px-4 py-2.5 text-sm font-semibold text-[var(--color-sage-text)] placeholder:text-[var(--color-sage-text-secondary)] border-2 border-[var(--color-sage-border)] focus:border-[var(--color-sage-primary)] focus:outline-none transition-colors disabled:opacity-50"
              />
              <button
                onClick={handleSend}
                disabled={!inputValue.trim() || isStreaming}
                className="btn-3d btn-3d-primary w-10 h-10 rounded-full !p-0 flex items-center justify-center"
                aria-label="Send message"
              >
                ↑
              </button>
            </>
          )}
        </div>
      )}

      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-[var(--color-sage-text)] text-white text-sm font-semibold px-4 py-2.5 rounded-[var(--radius-md)] shadow-sage z-50 max-w-[80%] text-center animate-fade-in">
          {toastMsg}
        </div>
      )}
    </div>
  );
}
