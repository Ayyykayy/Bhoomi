// Retry temporary upstream failures, never validation errors or deliberately missing data.
export async function fetchNdvi(url, signal) {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (signal.aborted) throw new DOMException('Request cancelled', 'AbortError');
    let retryable = true;
    try {
      const response = await fetch(url, { signal });
      const body = await response.json();
      if (response.ok) return body;
      retryable = [429, 502, 503, 504].includes(response.status);
      throw new Error(typeof body.error === 'string' ? body.error : 'NDVI service could not respond. Please retry.');
    } catch (error) {
      if (signal.aborted) throw error;
      lastError = error;
      if (!retryable || attempt === 2) throw error;
    }
    await new Promise((resolve, reject) => {
      const cancel = () => { clearTimeout(timer); reject(new DOMException('Request cancelled', 'AbortError')); };
      const timer = setTimeout(() => { signal.removeEventListener('abort', cancel); resolve(); }, 750 * (attempt + 1));
      signal.addEventListener('abort', cancel, { once: true });
    });
  }
  throw lastError;
}
