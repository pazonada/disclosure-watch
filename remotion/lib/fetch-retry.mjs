/**
 * fetch() with exponential backoff for transient errors.
 *
 * Retries on:
 *   - Network-level throws (ECONNRESET, DNS failures, timeouts)
 *   - HTTP 429 (rate limit)
 *   - HTTP 5xx (server errors)
 *
 * Does NOT retry on 4xx other than 429 — those mean the request itself is
 * wrong and won't get better with another try.
 *
 * Usage:
 *   const res = await fetchWithRetry(url, { method: "POST", ... });
 *   if (!res.ok) { handle the final failure }
 *
 * Throws only after exhausting all attempts.
 */
export async function fetchWithRetry(
  url,
  options = {},
  { maxAttempts = 4, logPrefix = "fetch-retry" } = {}
) {
  let lastError = "";

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let res;
    try {
      res = await fetch(url, options);
    } catch (err) {
      // Network-level failure (ECONNRESET, DNS, abort, timeout).
      lastError = `network: ${err?.message || err}`;
      if (attempt === maxAttempts) {
        throw new Error(
          `[${logPrefix}] ${url} failed after ${maxAttempts} attempts — ${lastError}`
        );
      }
      const backoffMs = 1000 * Math.pow(2, attempt - 1);
      console.warn(
        `[${logPrefix}] network error (attempt ${attempt}/${maxAttempts}) — retrying ${url} in ${backoffMs}ms: ${lastError}`
      );
      await new Promise((r) => setTimeout(r, backoffMs));
      continue;
    }

    if (res.ok) return res;

    // HTTP-level failure. Retry on 429 and 5xx; bail on other 4xx.
    const shouldRetry = res.status === 429 || res.status >= 500;
    if (!shouldRetry || attempt === maxAttempts) {
      // Return the failed response so the caller decides what to do with the
      // body. The Anthropic call wants to read `body` for error context.
      return res;
    }

    const backoffMs = 1000 * Math.pow(2, attempt - 1);
    console.warn(
      `[${logPrefix}] HTTP ${res.status} (attempt ${attempt}/${maxAttempts}) — retrying ${url} in ${backoffMs}ms`
    );
    await new Promise((r) => setTimeout(r, backoffMs));
  }

  // Unreachable — but TS-style safety.
  throw new Error(`[${logPrefix}] ${url} retry loop exited without result`);
}
