// Lazy loader for the two third-party bot-check scripts. Each script is
// appended to <head> once, on the first page that needs it (sign-up, or a
// challenged sign-in), never from the root layout (rules/47: third-party
// scripts load where they are used). A failed or timed-out load is forgotten so
// the next attempt can try again.
//
// Production CSP uses 'strict-dynamic': a script element created by our own
// nonce-trusted bundle inherits that trust, so no nonce is set here.

const pendingLoads = new Map<string, Promise<void>>();

export function loadExternalScript(id: string, src: string, timeoutMs: number): Promise<void> {
  const pending = pendingLoads.get(id);
  if (pending !== undefined) {
    return pending;
  }
  const load = new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Script ${id} timed out`)), timeoutMs);
    const finish = (error: Error | null): void => {
      clearTimeout(timer);
      if (error === null) {
        resolve();
      } else {
        reject(error);
      }
    };
    const existing = document.querySelector<HTMLScriptElement>(`script#${id}`);
    const script = existing ?? document.createElement('script');
    script.addEventListener('load', () => finish(null), { once: true });
    script.addEventListener('error', () => finish(new Error(`Script ${id} failed`)), {
      once: true,
    });
    if (existing === null) {
      script.id = id;
      script.src = src;
      script.async = true;
      script.defer = true;
      document.head.append(script);
    }
  });
  pendingLoads.set(id, load);
  load.catch(() => {
    pendingLoads.delete(id);
    document.querySelector(`script#${id}`)?.remove();
  });
  return load;
}

/** Test seam: forget every load so each test starts from an empty document. */
export function resetExternalScriptLoads(): void {
  pendingLoads.clear();
}
