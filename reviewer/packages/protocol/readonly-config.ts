export type ReadAttempt = { attempt: number; status: 'passed' | 'failed'; ms: number; error?: unknown };
function transientTransport(error: unknown): boolean {
  const seen = new Set<unknown>();
  let current = error;
  while (current && !seen.has(current)) {
    seen.add(current);
    const e = current as { code?: string; name?: string; message?: string; cause?: unknown; error?: unknown };
    if (['ETIMEDOUT', 'EAI_AGAIN'].includes(e.code ?? '') || /timeout|timed out/i.test(`${e.name ?? ''} ${e.message ?? ''}`)) return true;
    current = e.cause ?? e.error;
  }
  return false;
}
/** Explicit read-only connection warmup: at most two reads, same client, no write capability or generic transaction retry. */
export async function readSystemConfigWithWarmup<T>(client: { getPerpSystemConfig(address: string): Promise<T> }, address: string, maxAttempts: 1 | 2, onAttempt: (attempt: ReadAttempt) => void): Promise<T> {
  if (maxAttempts !== 1 && maxAttempts !== 2) throw new Error('INVALID_READONLY_ATTEMPT_BUDGET');
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const start = Date.now();
    try {
      const result = await client.getPerpSystemConfig(address);
      onAttempt({ attempt, status: 'passed', ms: Date.now() - start });
      return result;
    } catch (error) {
      onAttempt({ attempt, status: 'failed', ms: Date.now() - start, error });
      if (attempt === maxAttempts || !transientTransport(error)) throw error;
    }
  }
  throw new Error('READONLY_ATTEMPT_BUDGET_EXHAUSTED');
}
