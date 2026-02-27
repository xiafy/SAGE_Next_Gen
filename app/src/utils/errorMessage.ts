export interface UserFacingErrorOptions {
  language: 'zh' | 'en';
  fallbackKind?: 'recognize' | 'chat';
}

function parseStatusCode(message: string): number | null {
  const match = message.match(/\b(400|413|429|502|503|504)\b/);
  return match ? Number(match[1]) : null;
}

function isTimeoutError(message: string): boolean {
  const text = message.toLowerCase();
  return text.includes('timeout') || text.includes('timed out') || text.includes('abort');
}

export function toUserFacingError(error: unknown, options: UserFacingErrorOptions): string {
  const isZh = options.language === 'zh';
  const fallbackKind = options.fallbackKind ?? 'recognize';
  const fallback = isZh
    ? (fallbackKind === 'chat' ? '请求失败，请重试' : '识别失败，请重试')
    : (fallbackKind === 'chat' ? 'Request failed. Please retry.' : 'Recognition failed. Please retry.');

  const raw = error instanceof Error ? error.message : String(error ?? '');
  const status = parseStatusCode(raw);

  if (status === 400 || status === 413) {
    return isZh ? '请求格式错误，请重试' : 'Invalid request format. Please retry.';
  }
  if (status === 429) {
    return isZh ? '请求过于频繁，请稍后再试' : 'Too many requests. Please try again later.';
  }
  if (status === 502 || status === 503 || status === 504) {
    return isZh ? 'AI 服务暂时不可用，请重试' : 'AI service is temporarily unavailable. Please retry.';
  }
  if (isTimeoutError(raw)) {
    if (fallbackKind === 'chat') {
      return isZh ? '对话超时，请重试' : 'Chat timed out. Please retry.';
    }
    return isZh ? '识别超时，请重新拍摄' : 'Recognition timed out. Please retake the photo.';
  }

  return fallback;
}
