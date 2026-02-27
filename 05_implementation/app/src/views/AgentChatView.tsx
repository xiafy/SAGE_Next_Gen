import { useState, useEffect, useRef, useMemo } from 'react';
import { useAppState } from '../hooks/useAppState';
import { TopBar } from '../components/TopBar';
import { ChatBubble } from '../components/ChatBubble';
import { QuickReplies } from '../components/QuickReplies';
import { LoadingDots } from '../components/LoadingDots';
import { streamChat, buildChatParams } from '../api/chat';
import { analyzeMenu } from '../api/analyze';
import type { Message, PreferenceUpdate } from '../types';
import { toUserFacingError } from '../utils/errorMessage';
import { dlog } from '../utils/debugLog';

interface Recommendation {
  itemId: string;
  reason: string;
}

export function AgentChatView() {
  const { state, dispatch } = useAppState();
  const [inputValue, setInputValue] = useState('');
  const [streamingText, setStreamingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [quickReplies, setQuickReplies] = useState<string[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const analyzeAbortRef = useRef<AbortController | null>(null);
  const chatAbortRef = useRef<AbortController | null>(null);
  const handoffTriggeredRef = useRef(false);
  const icebreakerSentRef = useRef(false);
  const analyzeTriggeredRef = useRef(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const isZh = state.preferences.language === 'zh';

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
  // Wait for at least one user message in pre-chat, or 8s timeout
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
        // User has interacted with pre-chat, proceed immediately
        doHandoff();
      } else {
        // User hasn't responded yet — wait up to 8s then handoff anyway
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
  // NOTE: Do NOT abort analyzeAbortRef here — React StrictMode double-mounts
  // would kill the in-flight analyze request. Analyze is long-running (30-60s)
  // and should only be aborted by user action (e.g., navigating away from the app).
  useEffect(() => {
    return () => {
      chatAbortRef.current?.abort();
      clearTimeout(toastTimerRef.current);
    };
  }, []);

  // ---------- Toast helper ----------
  function showToast(msg: string) {
    setToastMsg(msg);
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastMsg(null), 3000);
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

      // Path C: supplement — notify user, don't trigger handoff
      if (state.isSupplementing) {
        dlog('chat', '📸 supplement done, notifying user');
        dispatch({
          type: 'ADD_MESSAGE',
          message: {
            id: `sys_supplement_${Date.now()}`,
            role: 'assistant',
            content: isZh
              ? `补充菜单已识别！现在共有 ${result.items.length} 道菜。有什么想问的吗？`
              : `Menu updated! Now showing ${result.items.length} items. What would you like to know?`,
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
        dlog('chat', '❌ stream ERROR:', err);
        setIsStreaming(false);
        setStreamingText('');
        if (state.chatPhase === 'handing_off') {
          dispatch({ type: 'SET_CHAT_PHASE', phase: 'failed' });
          showToast(toUserFacingError(err, { language: state.preferences.language, fallbackKind: 'recognize' }));
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
        newRecommendations = obj['recommendations'] as Recommendation[];
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

    const mode = state.chatPhase === 'chatting' ? 'chat' : 'pre_chat';
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

    const mode = state.chatPhase === 'chatting' ? 'chat' : 'pre_chat';
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
    <div className="flex flex-col h-dvh bg-surface">
      <TopBar
        title="SAGE"
        onBack={() => dispatch({ type: 'NAV_TO', view: 'home' })}
        rightAction={
          <div className="flex items-center gap-2">
            {state.menuData && (
              <button
                onClick={() => dispatch({ type: 'NAV_TO', view: 'explore' })}
                className="text-text-secondary hover:text-text-primary transition-colors text-sm"
                aria-label={isZh ? '浏览菜单' : 'Browse menu'}
              >
                📋
              </button>
            )}
            {state.orderItems.length > 0 && (
              <button
                onClick={() => dispatch({ type: 'NAV_TO', view: 'order' })}
                className="relative text-text-secondary hover:text-text-primary transition-colors text-sm"
                aria-label={isZh ? '查看点单' : 'View order'}
              >
                🍽
                <span className="absolute -top-1 -right-2 bg-brand text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
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
          <div className="text-5xl">⚠️</div>
          <p className="text-text-secondary text-center text-sm">
            {isZh ? '识别失败，要重试吗？' : 'Recognition failed. Try again?'}
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => {
                dispatch({ type: 'SET_CHAT_PHASE', phase: 'pre_chat' });
                dispatch({ type: 'NAV_TO', view: 'scanner' });
              }}
              className="px-5 py-2.5 bg-brand hover:bg-brand-hover text-white text-sm font-medium rounded-button transition-colors"
              aria-label={isZh ? '重新扫描' : 'Rescan menu'}
            >
              {isZh ? '重新扫描' : 'Rescan Menu'}
            </button>
            <button
              onClick={() => {
                // 只有 menuData 存在时才能继续对话，否则回 pre_chat 引导重扫
                if (state.menuData) {
                  dispatch({ type: 'SET_CHAT_PHASE', phase: 'chatting' });
                } else {
                  dispatch({ type: 'SET_CHAT_PHASE', phase: 'pre_chat' });
                }
              }}
              className="px-5 py-2.5 bg-surface-secondary hover:bg-border text-text-secondary text-sm font-medium rounded-button border border-border transition-colors"
              aria-label={isZh ? '继续对话' : 'Continue anyway'}
            >
              {isZh ? '继续对话' : 'Continue Anyway'}
            </button>
          </div>
        </div>
      )}

      {/* Progress bar */}
      {showProgressBar && (
        <div className="px-4 py-3">
          <div className="bg-brand-light rounded-button px-4 py-2.5 flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-brand border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-brand font-medium">
              {state.chatPhase === 'handing_off' ? (isZh ? '正在分析菜单…' : 'Analyzing menu…') : (isZh ? '菜单识别中…' : 'Scanning menu…')}
            </span>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-24">
        {state.messages.map((msg) => (
          <ChatBubble key={msg.id} message={msg} />
        ))}

        {/* Streaming bubble */}
        {isStreaming && streamingText && (
          <div className="flex justify-start mb-3">
            <div className="w-7 h-7 rounded-full bg-brand flex items-center justify-center shrink-0 mt-1 mr-2">
              <span className="text-white text-xs font-semibold">S</span>
            </div>
            <div className="max-w-[75%] px-4 py-2.5 text-sm leading-relaxed bg-surface-secondary text-text-primary rounded-[16px_16px_16px_4px] shadow-card">
              {streamingText}
              <span className="inline-block w-0.5 h-4 bg-brand ml-0.5 animate-pulse align-text-bottom" />
            </div>
          </div>
        )}

        {/* Loading dots */}
        {isStreaming && !streamingText && <LoadingDots />}

        {/* Recommendation cards */}
        {recommendations.length > 0 && !isStreaming && (
          <div className="flex flex-col gap-2 mb-3 ml-9">
            {recommendations.map((rec) => {
              const item = state.menuData?.items.find((i) => i.id === rec.itemId);
              if (!item) return null;
              const alreadyAdded = state.orderItems.some((oi) => oi.menuItem.id === rec.itemId);
              return (
                <div
                  key={rec.itemId}
                  className="bg-surface-secondary border border-border rounded-[var(--border-radius-card)] p-3 flex items-center justify-between"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary">{item.nameOriginal}</p>
                    <p className="text-xs text-text-muted">{item.nameTranslated}</p>
                    {rec.reason && (
                      <p className="text-xs text-text-secondary mt-1">{rec.reason}</p>
                    )}
                  </div>
                  {alreadyAdded ? (
                    <span className="ml-3 shrink-0 px-3 py-1.5 bg-surface-secondary text-text-muted text-xs font-medium rounded-button border border-border">
                      {isZh ? '✓ 已加入' : '✓ Added'}
                    </span>
                  ) : (
                    <button
                      onClick={() => handleAddToOrder(rec)}
                      className="ml-3 shrink-0 px-3 py-1.5 bg-brand hover:bg-brand-hover text-white text-xs font-medium rounded-button transition-colors"
                      aria-label={isZh ? '加入点单' : 'Add to order'}
                    >
                      {isZh ? '+ 加入' : '+ Add'}
                    </button>
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
          className="mx-4 mb-2 py-2.5 bg-brand-light rounded-button flex items-center justify-between px-4"
          aria-label={isZh ? '查看点单' : 'View order'}
        >
          <span className="text-sm text-brand font-medium">
            {isZh ? `已点 ${state.orderItems.reduce((sum, oi) => sum + oi.quantity, 0)} 道菜` : `${state.orderItems.reduce((sum, oi) => sum + oi.quantity, 0)} items`}
          </span>
          <span className="text-sm text-brand font-semibold">
            {priceFmt.format(state.orderItems.reduce((sum, oi) => sum + (oi.menuItem.price ?? 0) * oi.quantity, 0))}
          </span>
        </button>
      )}

      {/* Input area */}
      {showInputArea && (
        <div className="flex items-center gap-2 px-4 py-3 border-t border-border bg-surface">
          {state.chatPhase === 'chatting' && (
            <button
              onClick={() => {
                dispatch({ type: 'SET_SUPPLEMENTING', value: true });
                dispatch({ type: 'NAV_TO', view: 'scanner' });
              }}
              className="w-10 h-10 shrink-0 rounded-full bg-surface-secondary hover:bg-border text-text-secondary flex items-center justify-center transition-colors"
              aria-label={isZh ? '补充菜单照片' : 'Add more photos'}
            >
              📷
            </button>
          )}
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isZh ? '输入消息…' : 'Type a message…'}
            disabled={isStreaming}
            className="flex-1 bg-surface-secondary rounded-button px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted border border-border focus:border-brand focus:outline-none transition-colors disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || isStreaming}
            className="w-10 h-10 rounded-full bg-brand hover:bg-brand-hover disabled:opacity-40 text-white flex items-center justify-center transition-colors"
            aria-label="Send message"
          >
            ↑
          </button>
        </div>
      )}

      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-text-primary text-white text-sm px-4 py-2.5 rounded-button shadow-card z-50 max-w-[80%] text-center">
          {toastMsg}
        </div>
      )}
    </div>
  );
}
