/**
 * Latest-wins guard for async loads.
 *
 * The plugin's list view fetches entries asynchronously. A sort/filter/search/
 * category change calls loadEntries(true) to reload; if a previous request is
 * still in flight that reload must not be silently dropped, and a stale
 * response must never overwrite a newer one.
 *
 * Contract:
 * - begin(reset=false) while busy returns null (load-more is dropped: the
 *   "Load more" button is disabled while loading anyway).
 * - begin(reset=true) while busy starts a fresh request that supersedes the
 *   in-flight one; the older response is discarded via isLatest().
 * - finish(token) releases the gate only when token is still the latest.
 */
export class LoadGate {
  private inflight = false;
  private token = 0;

  begin(reset: boolean): number | null {
    if (this.inflight && !reset) {
      return null;
    }
    this.inflight = true;
    return ++this.token;
  }

  isLatest(token: number): boolean {
    return token === this.token;
  }

  finish(token: number): void {
    if (token === this.token) {
      this.inflight = false;
    }
  }

  get busy(): boolean {
    return this.inflight;
  }
}