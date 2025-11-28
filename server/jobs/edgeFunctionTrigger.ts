type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type RetryOptions = {
  retries?: number;
  backoffMs?: number;
  maxBackoffMs?: number;
  jitter?: boolean;
  retryOn?: (status: number | null, err: unknown) => boolean;
};

export type TriggerOptions = {
  headers?: Record<string, string>;
  timeoutMs?: number;
  supabaseUrlOverride?: string;
  apiKeyOverride?: string;
  idempotencyKey?: string;
  retry?: RetryOptions;
};

export type TriggerResult<T = unknown> = {
  ok: boolean;
  status: number;
  data: T | null;
  raw: string;
  attempt: number;
  durationMs: number;
};

function getProjectBaseUrl(override?: string) {
  const base = override || process.env.SUPABASE_URL;
  if (!base) throw new Error('SUPABASE_URL is not set');
  return base.replace(/\/$/, '');
}

function getAuthToken(override?: string) {
  const token =
    override ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.VITE_BACKEND_ANON_KEY;
  if (!token) throw new Error('Supabase API key is not set');
  return token;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function defaultRetryOn(status: number | null, err: unknown) {
  if (status === null) return true; // network/timeout
  if (status >= 500) return true; // server errors
  if (status === 408 || status === 425 || status === 429) return true; // timeout/too early/ratelimit
  return false;
}

function computeBackoff(attempt: number, base: number, max: number, jitter: boolean) {
  const exp = Math.min(max, base * 2 ** (attempt - 1));
  if (!jitter) return exp;
  const rand = Math.random() * exp * 0.3; // up to 30% jitter
  return Math.min(max, exp + rand);
}

export async function triggerEdgeFunction<T = unknown>(
  functionName: string,
  payload?: Json,
  options?: TriggerOptions,
): Promise<TriggerResult<T>> {
  if (!functionName || typeof functionName !== 'string') {
    throw new Error('functionName must be a non-empty string');
  }

  const start = Date.now();
  const baseUrl = getProjectBaseUrl(options?.supabaseUrlOverride);
  const url = `${baseUrl}/functions/v1/${encodeURIComponent(functionName)}`;
  const token = getAuthToken(options?.apiKeyOverride);

  const retry = options?.retry ?? {};
  const retries = Math.max(0, retry.retries ?? 3);
  const backoffBase = Math.max(100, retry.backoffMs ?? 500);
  const backoffMax = Math.max(backoffBase, retry.maxBackoffMs ?? 5000);
  const jitter = retry.jitter ?? true;
  const retryOn = retry.retryOn ?? defaultRetryOn;

  let lastRaw = '';
  let lastStatus = 0;
  let lastErr: unknown = null;

  for (let attempt = 1; attempt <= 1 + retries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options?.timeoutMs ?? 30000);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          apikey: token,
          'x-client-info': 'edgeFunctionTrigger/1.0',
          ...(options?.idempotencyKey ? { 'Idempotency-Key': options.idempotencyKey } : {}),
          ...options?.headers,
        },
        body: payload !== undefined ? JSON.stringify(payload) : undefined,
        signal: controller.signal,
      });

      const text = await res.text();
      lastRaw = text;
      lastStatus = res.status;

      let parsed: any = null;
      try {
        parsed = text ? JSON.parse(text) : null;
      } catch (_) {
        parsed = null;
      }

      if (!res.ok) {
        const retryAfterHeader = res.headers.get('retry-after');
        const retryAfter = retryAfterHeader ? parseInt(retryAfterHeader, 10) * 1000 : null;

        const message = (parsed && (parsed.error || parsed.message || parsed.msg)) || `${res.status} ${res.statusText}`;
        if (attempt <= retries && retryOn(res.status, null)) {
          const backoff = retryAfter && !Number.isNaN(retryAfter) ? retryAfter : computeBackoff(attempt, backoffBase, backoffMax, jitter);
          clearTimeout(timeout);
          await sleep(backoff);
          continue;
        }
        clearTimeout(timeout);
        return {
          ok: false,
          status: res.status,
          data: (parsed as T) ?? null,
          raw: text,
          attempt,
          durationMs: Date.now() - start,
        };
      }

      clearTimeout(timeout);
      return {
        ok: true,
        status: res.status,
        data: (parsed as T) ?? null,
        raw: text,
        attempt,
        durationMs: Date.now() - start,
      };
    } catch (e: any) {
      lastErr = e;
      lastStatus = lastStatus || 0;
      clearTimeout(timeout);
      const isAbort = e?.name === 'AbortError';
      const statusForRetry = isAbort ? 408 : null;
      if (attempt <= retries && retryOn(statusForRetry, e)) {
        const backoff = computeBackoff(attempt, backoffBase, backoffMax, jitter);
        await sleep(backoff);
        continue;
      }
      return {
        ok: false,
        status: statusForRetry ?? 0,
        data: null,
        raw: String(e?.message || e),
        attempt,
        durationMs: Date.now() - start,
      };
    }
  }

  return {
    ok: false,
    status: lastStatus,
    data: null,
    raw: lastRaw || String(lastErr ?? 'Unknown error'),
    attempt: (Number.isFinite((options?.retry?.retries ?? 3) + 1) ? (options?.retry?.retries ?? 3) + 1 : 1),
    durationMs: Date.now() - start,
  };
}

export async function triggerBookProcessing(bookId: string, options?: TriggerOptions) {
  if (!bookId) throw new Error('bookId is required');
  return triggerEdgeFunction<{ status: string; book_id: string }>('booksProcessor', { book_id: bookId }, options);
}
