"use client";

import { useSyncExternalStore } from "react";

/* "Are we past hydration?"
 *
 * Two tools need this and for the same underlying reason: they depend on
 * something that only exists in a browser — a canvas for measuring text, and
 * localStorage for restoring a draft — and rendering that during the hydration
 * pass would make the client's HTML disagree with the server's.
 *
 * useSyncExternalStore rather than an effect that calls setState. The store
 * reports false on the server and true on the client, so React resolves it
 * during hydration instead of scheduling a second render. The
 * react-hooks/set-state-in-effect lint rule flags the effect version, and it is
 * right to: this is precisely the pattern that rule exists to redirect.
 *
 * The value never changes after mount, so subscribe is a no-op returning a
 * no-op unsubscribe.
 */
const subscribe = () => () => {};
const onClient = () => true;
const onServer = () => false;

export function useHasMounted(): boolean {
  return useSyncExternalStore(subscribe, onClient, onServer);
}
