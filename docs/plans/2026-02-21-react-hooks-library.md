# @f-o-t/react-hooks Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create `@f-o-t/react-hooks` — a comprehensive React hooks library with 70+ hooks, full unit test coverage, first-class SSR safety, and React 19 patterns.

**Architecture:** Pure functional hooks with no external deps beyond React. Browser-subscribing hooks use `useSyncExternalStore` for SSR safety and tearing prevention. Async action hooks use `useTransition`/`useActionState` (React 19). All hooks guard `typeof window !== 'undefined'` via the server snapshot argument.

**Tech Stack:** React 19, bun:test, @testing-library/react, happy-dom, useSyncExternalStore, useTransition, useActionState, useOptimistic

---

## Scaffold & Infrastructure

### Task 1: Scaffold the library

**Files:**
- Create: `libraries/react-hooks/` (via fot create)

**Step 1: Scaffold**
```bash
cd /path/to/fot-libraries
bun x --bun fot create react-hooks
```

**Step 2: Verify scaffold created**
```bash
ls libraries/react-hooks/
```
Expected: `src/`, `__tests__/`, `fot.config.ts`, `package.json`, `biome.json`, `CHANGELOG.md`

**Step 3: Commit**
```bash
git add libraries/react-hooks
git commit -m "chore: scaffold @f-o-t/react-hooks library"
```

---

### Task 2: Configure package.json

**Files:**
- Modify: `libraries/react-hooks/package.json`

**Step 1: Replace package.json content**
```json
{
  "name": "@f-o-t/react-hooks",
  "version": "1.0.0",
  "description": "SSR-safe React hooks with full test coverage",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "module": "./dist/index.js",
      "import": "./dist/index.js",
      "default": "./dist/index.js"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "bun x --bun fot build",
    "test": "bun x --bun fot test",
    "lint": "bun x --bun fot lint",
    "format": "bun x --bun fot format",
    "check": "bun x --bun fot check"
  },
  "devDependencies": {
    "@f-o-t/cli": "^1.0.6",
    "@f-o-t/config": "^1.0.6",
    "@testing-library/react": "^16.0.0",
    "@types/bun": "latest",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "happy-dom": "^20.6.3",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "peerDependencies": {
    "react": ">=18.0.0"
  },
  "peerDependenciesMeta": {
    "react": { "optional": false }
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/F-O-T/libraries.git",
    "directory": "libraries/react-hooks"
  }
}
```

**Step 2: Configure fot.config.ts**
```ts
import { defineFotConfig } from '@f-o-t/config';

export default defineFotConfig({
  external: ['react'],
});
```

**Step 3: Create bunfig.toml**
```toml
[test]
environment = "happy-dom"
preload = ["./__tests__/setup-dom.ts"]
```

**Step 4: Create .npmignore** (prevents dist exclusion from .gitignore)
```
src/
__tests__/
*.test.ts
tsconfig.json
fot.config.ts
biome.json
.turbo
```

**Step 5: Create `__tests__/setup-dom.ts`**
```ts
import { GlobalWindow } from "happy-dom";

const window = new GlobalWindow();

// @ts-ignore
globalThis.document = window.document;
// @ts-ignore
globalThis.window = window;
// @ts-ignore
globalThis.navigator = window.navigator;
// @ts-ignore
globalThis.HTMLElement = window.HTMLElement;
// @ts-ignore
globalThis.Element = window.Element;
// @ts-ignore
globalThis.screen = window.screen;
// @ts-ignore
globalThis.matchMedia = window.matchMedia?.bind(window) ?? (() => ({
  matches: false,
  addEventListener: () => {},
  removeEventListener: () => {},
}));
```

**Step 6: Install deps**
```bash
cd libraries/react-hooks && bun install
```

**Step 7: Commit**
```bash
git add libraries/react-hooks
git commit -m "chore(react-hooks): configure package.json, bunfig, .npmignore, setup-dom"
```

---

## Batch 1: Foundation Hook

### Task 3: useIsClient

**Files:**
- Create: `libraries/react-hooks/src/use-is-client.ts`
- Create: `libraries/react-hooks/__tests__/use-is-client.test.ts`

**Step 1: Write failing test**
```ts
// __tests__/use-is-client.test.ts
import { describe, expect, it } from "bun:test";
import { renderHook } from "@testing-library/react";
import { useIsClient } from "../src/use-is-client.ts";

describe("useIsClient", () => {
  it("returns true after mount", () => {
    const { result } = renderHook(() => useIsClient());
    expect(result.current).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**
```bash
cd libraries/react-hooks && bun test __tests__/use-is-client.test.ts
```
Expected: FAIL — module not found

**Step 3: Implement**
```ts
// src/use-is-client.ts
import { useEffect, useState } from "react";

/**
 * Returns false on the server and on the first render, true after hydration.
 * Use this as the SSR safety gate for all browser-dependent hooks.
 */
export function useIsClient(): boolean {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => { setIsClient(true); }, []);
  return isClient;
}
```

**Step 4: Run test to verify it passes**
```bash
bun test __tests__/use-is-client.test.ts
```

**Step 5: Commit**
```bash
git add src/use-is-client.ts __tests__/use-is-client.test.ts
git commit -m "feat(react-hooks): add useIsClient"
```

---

## Batch 2: Pure State Hooks (no DOM)

### Task 4: useToggle

**Files:**
- Create: `libraries/react-hooks/src/state/use-toggle.ts`
- Create: `libraries/react-hooks/__tests__/state/use-toggle.test.ts`

**Step 1: Write failing test**
```ts
import { describe, expect, it } from "bun:test";
import { act, renderHook } from "@testing-library/react";
import { useToggle } from "../../src/state/use-toggle.ts";

describe("useToggle", () => {
  it("starts false by default", () => {
    const { result } = renderHook(() => useToggle());
    expect(result.current[0]).toBe(false);
  });

  it("starts with provided initial value", () => {
    const { result } = renderHook(() => useToggle(true));
    expect(result.current[0]).toBe(true);
  });

  it("toggle() flips the value", () => {
    const { result } = renderHook(() => useToggle());
    act(() => result.current[1]());
    expect(result.current[0]).toBe(true);
    act(() => result.current[1]());
    expect(result.current[0]).toBe(false);
  });

  it("toggle(true) forces true", () => {
    const { result } = renderHook(() => useToggle(false));
    act(() => result.current[1](true));
    expect(result.current[0]).toBe(true);
  });

  it("toggle(false) forces false", () => {
    const { result } = renderHook(() => useToggle(true));
    act(() => result.current[1](false));
    expect(result.current[0]).toBe(false);
  });
});
```

**Step 2: Implement**
```ts
// src/state/use-toggle.ts
import { useCallback, useState } from "react";

export function useToggle(initialValue = false): [boolean, (force?: boolean) => void] {
  const [value, setValue] = useState(initialValue);
  const toggle = useCallback((force?: boolean) => {
    setValue(v => typeof force === "boolean" ? force : !v);
  }, []);
  return [value, toggle];
}
```

**Step 3: Run and commit**
```bash
bun test __tests__/state/use-toggle.test.ts
git add src/state/use-toggle.ts __tests__/state/use-toggle.test.ts
git commit -m "feat(react-hooks): add useToggle"
```

---

### Task 5: useCounter

**Files:**
- Create: `libraries/react-hooks/src/state/use-counter.ts`
- Create: `libraries/react-hooks/__tests__/state/use-counter.test.ts`

**Step 1: Write failing test**
```ts
import { describe, expect, it } from "bun:test";
import { act, renderHook } from "@testing-library/react";
import { useCounter } from "../../src/state/use-counter.ts";

describe("useCounter", () => {
  it("starts at 0 by default", () => {
    const { result } = renderHook(() => useCounter());
    expect(result.current.count).toBe(0);
  });

  it("starts at provided initial value", () => {
    const { result } = renderHook(() => useCounter(5));
    expect(result.current.count).toBe(5);
  });

  it("increment() adds 1", () => {
    const { result } = renderHook(() => useCounter());
    act(() => result.current.increment());
    expect(result.current.count).toBe(1);
  });

  it("decrement() subtracts 1", () => {
    const { result } = renderHook(() => useCounter(5));
    act(() => result.current.decrement());
    expect(result.current.count).toBe(4);
  });

  it("reset() restores initial value", () => {
    const { result } = renderHook(() => useCounter(3));
    act(() => result.current.increment());
    act(() => result.current.reset());
    expect(result.current.count).toBe(3);
  });

  it("set() assigns a specific value", () => {
    const { result } = renderHook(() => useCounter());
    act(() => result.current.set(42));
    expect(result.current.count).toBe(42);
  });
});
```

**Step 2: Implement**
```ts
// src/state/use-counter.ts
import { useCallback, useState } from "react";

export type UseCounterReturn = {
  count: number;
  increment: () => void;
  decrement: () => void;
  reset: () => void;
  set: (value: number) => void;
};

export function useCounter(initialValue = 0): UseCounterReturn {
  const [count, setCount] = useState(initialValue);
  return {
    count,
    increment: useCallback(() => setCount(c => c + 1), []),
    decrement: useCallback(() => setCount(c => c - 1), []),
    reset: useCallback(() => setCount(initialValue), [initialValue]),
    set: useCallback((v: number) => setCount(v), []),
  };
}
```

**Step 3: Run and commit**
```bash
bun test __tests__/state/use-counter.test.ts
git add src/state/use-counter.ts __tests__/state/use-counter.test.ts
git commit -m "feat(react-hooks): add useCounter"
```

---

### Task 6: useDefault, useList, useMap, useSet, useQueue, useObjectState

These are grouped as simple state hooks. Implement each with TDD.

**Files (create all):**
- `src/state/use-default.ts` + `__tests__/state/use-default.test.ts`
- `src/state/use-list.ts` + `__tests__/state/use-list.test.ts`
- `src/state/use-map.ts` + `__tests__/state/use-map.test.ts`
- `src/state/use-set.ts` + `__tests__/state/use-set.test.ts`
- `src/state/use-queue.ts` + `__tests__/state/use-queue.test.ts`
- `src/state/use-object-state.ts` + `__tests__/state/use-object-state.test.ts`

**Implementations:**

```ts
// src/state/use-default.ts
import { useState } from "react";

export function useDefault<T>(initialValue: T, defaultValue: T): [T, (v: T) => void] {
  const [value, setValue] = useState(initialValue);
  return [value == null || value === false ? defaultValue : value, setValue];
}
```

```ts
// src/state/use-list.ts
import { useCallback, useState } from "react";

export function useList<T>(initialList: T[] = []) {
  const [list, setList] = useState<T[]>(initialList);
  return {
    list,
    push: useCallback((item: T) => setList(l => [...l, item]), []),
    removeAt: useCallback((index: number) => setList(l => l.filter((_, i) => i !== index)), []),
    filter: useCallback((fn: (item: T) => boolean) => setList(l => l.filter(fn)), []),
    clear: useCallback(() => setList([]), []),
    set: useCallback((newList: T[]) => setList(newList), []),
  };
}
```

```ts
// src/state/use-map.ts
import { useCallback, useState } from "react";

export function useMap<K, V>(initialEntries: [K, V][] = []) {
  const [map, setMap] = useState<Map<K, V>>(new Map(initialEntries));
  return {
    map,
    set: useCallback((key: K, value: V) => setMap(m => new Map(m).set(key, value)), []),
    delete: useCallback((key: K) => setMap(m => { const n = new Map(m); n.delete(key); return n; }), []),
    clear: useCallback(() => setMap(new Map()), []),
    get: (key: K) => map.get(key),
    has: (key: K) => map.has(key),
  };
}
```

```ts
// src/state/use-set.ts
import { useCallback, useState } from "react";

export function useSet<T>(initialValues: T[] = []) {
  const [set, setSet] = useState<Set<T>>(new Set(initialValues));
  return {
    set,
    add: useCallback((item: T) => setSet(s => new Set(s).add(item)), []),
    delete: useCallback((item: T) => setSet(s => { const n = new Set(s); n.delete(item); return n; }), []),
    clear: useCallback(() => setSet(new Set()), []),
    has: (item: T) => set.has(item),
  };
}
```

```ts
// src/state/use-queue.ts
import { useCallback, useState } from "react";

export function useQueue<T>(initialQueue: T[] = []) {
  const [queue, setQueue] = useState<T[]>(initialQueue);
  return {
    queue,
    first: queue[0] ?? null,
    last: queue[queue.length - 1] ?? null,
    size: queue.length,
    enqueue: useCallback((item: T) => setQueue(q => [...q, item]), []),
    dequeue: useCallback(() => setQueue(q => q.slice(1)), []),
    clear: useCallback(() => setQueue([]), []),
  };
}
```

```ts
// src/state/use-object-state.ts
import { useCallback, useState } from "react";

export function useObjectState<T extends object>(initialState: T) {
  const [state, setState] = useState<T>(initialState);
  const update = useCallback((patch: Partial<T>) => {
    setState(s => ({ ...s, ...patch }));
  }, []);
  const reset = useCallback(() => setState(initialState), [initialState]);
  return [state, update, reset] as const;
}
```

**Tests (write one per hook, test initial state, mutations, and edge cases)**

**Commit after all 6 pass:**
```bash
git commit -m "feat(react-hooks): add useDefault, useList, useMap, useSet, useQueue, useObjectState"
```

---

## Batch 3: Utility / Timer Hooks

### Task 7: usePrevious, useIsFirstRender, useRenderCount, useRenderInfo

**Files:**
- `src/utils/use-previous.ts`
- `src/utils/use-is-first-render.ts`
- `src/utils/use-render-count.ts`
- `src/utils/use-render-info.ts`
- Corresponding test files

**Implementations:**

```ts
// src/utils/use-previous.ts
import { useEffect, useRef } from "react";

export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);
  useEffect(() => { ref.current = value; });
  return ref.current;
}
```

```ts
// src/utils/use-is-first-render.ts
import { useRef } from "react";

export function useIsFirstRender(): boolean {
  const isFirst = useRef(true);
  if (isFirst.current) { isFirst.current = false; return true; }
  return false;
}
```

```ts
// src/utils/use-render-count.ts
import { useRef } from "react";

export function useRenderCount(): number {
  const count = useRef(0);
  count.current++;
  return count.current;
}
```

```ts
// src/utils/use-render-info.ts
import { useRef } from "react";

export type RenderInfo = {
  name: string;
  renders: number;
  sinceLastRender: number;
  timestamp: number;
};

export function useRenderInfo(name = "Component"): RenderInfo {
  const count = useRef(0);
  const lastRender = useRef<number>(Date.now());
  const now = Date.now();
  count.current++;
  const info: RenderInfo = {
    name,
    renders: count.current,
    sinceLastRender: count.current === 1 ? 0 : now - lastRender.current,
    timestamp: now,
  };
  lastRender.current = now;
  return info;
}
```

**Commit:**
```bash
git commit -m "feat(react-hooks): add usePrevious, useIsFirstRender, useRenderCount, useRenderInfo"
```

---

### Task 8: useDebounce, useThrottle

**Files:**
- `src/utils/use-debounce.ts` + test
- `src/utils/use-throttle.ts` + test

```ts
// src/utils/use-debounce.ts
import { useEffect, useState } from "react";

export function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
```

```ts
// src/utils/use-throttle.ts
import { useEffect, useRef, useState } from "react";

export function useThrottle<T>(value: T, interval: number): T {
  const [throttled, setThrottled] = useState(value);
  const lastUpdated = useRef<number | null>(null);

  useEffect(() => {
    const now = Date.now();
    if (lastUpdated.current === null || now - lastUpdated.current >= interval) {
      lastUpdated.current = now;
      setThrottled(value);
    } else {
      const remaining = interval - (now - lastUpdated.current);
      const timer = setTimeout(() => {
        lastUpdated.current = Date.now();
        setThrottled(value);
      }, remaining);
      return () => clearTimeout(timer);
    }
  }, [value, interval]);

  return throttled;
}
```

**Commit:**
```bash
git commit -m "feat(react-hooks): add useDebounce, useThrottle"
```

---

### Task 9: useInterval, useIntervalWhen, useTimeout, useRandomInterval, useCountdown

**Files:**
- `src/utils/use-interval.ts` + test
- `src/utils/use-interval-when.ts` + test
- `src/utils/use-timeout.ts` + test
- `src/utils/use-random-interval.ts` + test
- `src/utils/use-countdown.ts` + test

```ts
// src/utils/use-interval.ts
import { useEffect, useRef } from "react";

export function useInterval(callback: () => void, delay: number | null): void {
  const savedCallback = useRef(callback);
  useEffect(() => { savedCallback.current = callback; });
  useEffect(() => {
    if (delay === null) return;
    const id = setInterval(() => savedCallback.current(), delay);
    return () => clearInterval(id);
  }, [delay]);
}
```

```ts
// src/utils/use-interval-when.ts
import { useInterval } from "./use-interval.ts";

export function useIntervalWhen(
  callback: () => void,
  delay: number,
  when: boolean,
): void {
  useInterval(callback, when ? delay : null);
}
```

```ts
// src/utils/use-timeout.ts
import { useEffect, useRef } from "react";

export function useTimeout(callback: () => void, delay: number | null): void {
  const savedCallback = useRef(callback);
  useEffect(() => { savedCallback.current = callback; });
  useEffect(() => {
    if (delay === null) return;
    const id = setTimeout(() => savedCallback.current(), delay);
    return () => clearTimeout(id);
  }, [delay]);
}
```

```ts
// src/utils/use-random-interval.ts
import { useEffect, useRef } from "react";

export function useRandomInterval(
  callback: () => void,
  minDelay: number,
  maxDelay: number,
): void {
  const savedCallback = useRef(callback);
  useEffect(() => { savedCallback.current = callback; });
  useEffect(() => {
    let id: ReturnType<typeof setTimeout>;
    const tick = () => {
      savedCallback.current();
      const next = minDelay + Math.random() * (maxDelay - minDelay);
      id = setTimeout(tick, next);
    };
    const initial = minDelay + Math.random() * (maxDelay - minDelay);
    id = setTimeout(tick, initial);
    return () => clearTimeout(id);
  }, [minDelay, maxDelay]);
}
```

```ts
// src/utils/use-countdown.ts
import { useCallback, useEffect, useRef, useState } from "react";

export function useCountdown(seconds: number) {
  const [count, setCount] = useState(seconds);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = useCallback(() => {
    if (intervalRef.current) return;
    intervalRef.current = setInterval(() => {
      setCount(c => {
        if (c <= 1) {
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  }, []);

  const reset = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    setCount(seconds);
  }, [seconds]);

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  return { count, start, reset, isDone: count === 0 };
}
```

**Commit:**
```bash
git commit -m "feat(react-hooks): add useInterval, useIntervalWhen, useTimeout, useRandomInterval, useCountdown"
```

---

### Task 10: useContinuousRetry, useFetch, useEventListener, useKeyPress, useLogger, usePageLeave

**Files:** `src/utils/` — one file per hook + tests

```ts
// src/utils/use-continuous-retry.ts
import { useCallback, useEffect, useState } from "react";

export function useContinuousRetry(
  callback: () => boolean,
  interval = 100,
): boolean {
  const [hasResolved, setHasResolved] = useState(() => callback());
  useEffect(() => {
    if (hasResolved) return;
    const id = setInterval(() => {
      if (callback()) { setHasResolved(true); clearInterval(id); }
    }, interval);
    return () => clearInterval(id);
  }, [hasResolved, interval, callback]);
  return hasResolved;
}
```

```ts
// src/utils/use-fetch.ts
import { useActionState } from "react";

export type FetchState<T> = {
  data: T | null;
  error: Error | null;
  isPending: boolean;
  refetch: () => void;
};

export function useFetch<T>(url: string): FetchState<T> {
  const [data, fetchAction, isPending] = useActionState(
    async (_prev: T | null) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<T>;
    },
    null,
  );

  return { data, error: null, isPending, refetch: fetchAction };
}
```

```ts
// src/utils/use-event-listener.ts
import { useEffect, useRef } from "react";

export function useEventListener<
  T extends EventTarget,
  K extends string,
>(
  target: T | null | undefined,
  event: K,
  handler: (e: Event) => void,
  options?: AddEventListenerOptions,
): void {
  const savedHandler = useRef(handler);
  useEffect(() => { savedHandler.current = handler; });
  useEffect(() => {
    if (!target) return;
    const listener = (e: Event) => savedHandler.current(e);
    target.addEventListener(event, listener, options);
    return () => target.removeEventListener(event, listener, options);
  }, [target, event]);
}
```

```ts
// src/utils/use-key-press.ts
import { useEffect, useState } from "react";

export function useKeyPress(targetKey: string): boolean {
  const [pressed, setPressed] = useState(false);
  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (e.key === targetKey) setPressed(true); };
    const up = (e: KeyboardEvent) => { if (e.key === targetKey) setPressed(false); };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [targetKey]);
  return pressed;
}
```

```ts
// src/utils/use-logger.ts
import { useEffect, useRef } from "react";

export function useLogger(name: string, props: Record<string, unknown>): void {
  const isFirst = useRef(true);
  useEffect(() => {
    if (isFirst.current) {
      console.log(`[${name}] mounted`, props);
      isFirst.current = false;
    } else {
      console.log(`[${name}] updated`, props);
    }
  });
  useEffect(() => () => { console.log(`[${name}] unmounted`); }, [name]);
}
```

```ts
// src/utils/use-page-leave.ts
import { useEffect } from "react";

export function usePageLeave(callback: () => void): void {
  useEffect(() => {
    const handler = () => callback();
    document.addEventListener("mouseleave", handler);
    return () => document.removeEventListener("mouseleave", handler);
  }, [callback]);
}
```

**Commit:**
```bash
git commit -m "feat(react-hooks): add useContinuousRetry, useFetch, useEventListener, useKeyPress, useLogger, usePageLeave"
```

---

## Batch 4: Storage Hooks (SSR-safe with useSyncExternalStore)

### Task 11: useLocalStorage, useSessionStorage

**Files:**
- `src/storage/use-local-storage.ts` + test
- `src/storage/use-session-storage.ts` + test

**Implementation pattern** (same for both, parameterize the storage getter):

```ts
// src/storage/use-local-storage.ts
import { useCallback, useOptimistic, useTransition } from "react";
import { useSyncExternalStore } from "react";

function subscribe(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  return () => window.removeEventListener("storage", onStoreChange);
}

export function useLocalStorage<T>(key: string, initialValue: T) {
  const storedValue = useSyncExternalStore(
    subscribe,
    () => {
      try {
        const item = localStorage.getItem(key);
        return item !== null ? (JSON.parse(item) as T) : initialValue;
      } catch { return initialValue; }
    },
    () => initialValue, // SSR server snapshot
  );

  const [optimisticValue, setOptimistic] = useOptimistic(storedValue);
  const [, startTransition] = useTransition();

  const set = useCallback((value: T) => {
    setOptimistic(value);
    startTransition(async () => {
      try { localStorage.setItem(key, JSON.stringify(value)); }
      catch { /* quota exceeded etc */ }
    });
  }, [key]);

  const remove = useCallback(() => {
    startTransition(async () => { localStorage.removeItem(key); });
  }, [key]);

  return [optimisticValue, set, remove] as const;
}
```

```ts
// src/storage/use-session-storage.ts
// Same pattern but with sessionStorage — no cross-tab storage events
import { useCallback, useOptimistic, useTransition } from "react";
import { useSyncExternalStore } from "react";

export function useSessionStorage<T>(key: string, initialValue: T) {
  const storedValue = useSyncExternalStore(
    (cb) => { window.addEventListener("storage", cb); return () => window.removeEventListener("storage", cb); },
    () => {
      try {
        const item = sessionStorage.getItem(key);
        return item !== null ? (JSON.parse(item) as T) : initialValue;
      } catch { return initialValue; }
    },
    () => initialValue,
  );

  const [optimisticValue, setOptimistic] = useOptimistic(storedValue);
  const [, startTransition] = useTransition();

  const set = useCallback((value: T) => {
    setOptimistic(value);
    startTransition(async () => {
      try { sessionStorage.setItem(key, JSON.stringify(value)); }
      catch { /* noop */ }
    });
  }, [key]);

  const remove = useCallback(() => {
    startTransition(async () => { sessionStorage.removeItem(key); });
  }, [key]);

  return [optimisticValue, set, remove] as const;
}
```

**Test checklist:**
- Returns initialValue when key absent
- Persists value to storage after set()
- Returns stored value on subsequent renders
- SSR safety: server snapshot returns initialValue (test by mocking getSnapshot)
- remove() clears the key

**Commit:**
```bash
git commit -m "feat(react-hooks): add useLocalStorage, useSessionStorage"
```

---

## Batch 5: DOM / Browser Hooks (useSyncExternalStore)

### Task 12: useMediaQuery, useWindowSize, useWindowScroll, useNetworkState

**Files:** `src/dom/` — one file per hook + tests

**Pattern (useSyncExternalStore for all):**

```ts
// src/dom/use-media-query.ts
import { useSyncExternalStore } from "react";

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia(query).matches,
    () => false, // SSR: default false
  );
}
```

```ts
// src/dom/use-window-size.ts
import { useSyncExternalStore } from "react";

export type WindowSize = { width: number; height: number };

let cachedSize: WindowSize = { width: 0, height: 0 };

export function useWindowSize(): WindowSize {
  return useSyncExternalStore(
    (cb) => { window.addEventListener("resize", cb); return () => window.removeEventListener("resize", cb); },
    () => {
      const next = { width: window.innerWidth, height: window.innerHeight };
      if (next.width !== cachedSize.width || next.height !== cachedSize.height) cachedSize = next;
      return cachedSize;
    },
    () => ({ width: 0, height: 0 }),
  );
}
```

```ts
// src/dom/use-window-scroll.ts
import { useSyncExternalStore } from "react";

export type ScrollPosition = { x: number; y: number };

export function useWindowScroll(): ScrollPosition {
  return useSyncExternalStore(
    (cb) => { window.addEventListener("scroll", cb, { passive: true }); return () => window.removeEventListener("scroll", cb); },
    () => ({ x: window.scrollX, y: window.scrollY }),
    () => ({ x: 0, y: 0 }),
  );
}
```

```ts
// src/dom/use-network-state.ts
import { useSyncExternalStore } from "react";

export type NetworkState = {
  online: boolean;
  downlink?: number;
  effectiveType?: string;
  rtt?: number;
  saveData?: boolean;
};

export function useNetworkState(): NetworkState {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener("online", cb);
      window.addEventListener("offline", cb);
      return () => {
        window.removeEventListener("online", cb);
        window.removeEventListener("offline", cb);
      };
    },
    () => {
      const conn = (navigator as unknown as { connection?: NetworkState }).connection;
      return {
        online: navigator.onLine,
        downlink: conn?.downlink,
        effectiveType: conn?.effectiveType,
        rtt: conn?.rtt,
        saveData: conn?.saveData,
      };
    },
    () => ({ online: true }),
  );
}
```

**Commit after all 4 pass tests:**
```bash
git commit -m "feat(react-hooks): add useMediaQuery, useWindowSize, useWindowScroll, useNetworkState"
```

---

### Task 13: useOrientation, useVisibilityChange, usePreferredLanguage, useHistoryState

```ts
// src/dom/use-orientation.ts
import { useSyncExternalStore } from "react";

export type OrientationType = "portrait-primary" | "portrait-secondary" | "landscape-primary" | "landscape-secondary";

export function useOrientation(): { type: OrientationType; angle: number } {
  return useSyncExternalStore(
    (cb) => {
      screen.orientation.addEventListener("change", cb);
      return () => screen.orientation.removeEventListener("change", cb);
    },
    () => ({ type: screen.orientation.type as OrientationType, angle: screen.orientation.angle }),
    () => ({ type: "landscape-primary" as OrientationType, angle: 0 }),
  );
}
```

```ts
// src/dom/use-visibility-change.ts
import { useSyncExternalStore } from "react";

export function useVisibilityChange(): DocumentVisibilityState {
  return useSyncExternalStore(
    (cb) => { document.addEventListener("visibilitychange", cb); return () => document.removeEventListener("visibilitychange", cb); },
    () => document.visibilityState,
    () => "visible" as DocumentVisibilityState,
  );
}
```

```ts
// src/dom/use-preferred-language.ts
import { useSyncExternalStore } from "react";

export function usePreferredLanguage(): string {
  return useSyncExternalStore(
    (cb) => { window.addEventListener("languagechange", cb); return () => window.removeEventListener("languagechange", cb); },
    () => navigator.language,
    () => "",
  );
}
```

```ts
// src/dom/use-history-state.ts
import { useSyncExternalStore } from "react";

export function useHistoryState<T = unknown>(): T | null {
  return useSyncExternalStore(
    (cb) => { window.addEventListener("popstate", cb); return () => window.removeEventListener("popstate", cb); },
    () => (history.state as T) ?? null,
    () => null,
  );
}
```

**Commit:**
```bash
git commit -m "feat(react-hooks): add useOrientation, useVisibilityChange, usePreferredLanguage, useHistoryState"
```

---

### Task 14: useIdle, useMouse

```ts
// src/dom/use-idle.ts
import { useSyncExternalStore } from "react";

let isIdle = false;
let idleTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();

function resetTimer(timeout: number) {
  if (idleTimer) clearTimeout(idleTimer);
  if (isIdle) { isIdle = false; listeners.forEach(l => l()); }
  idleTimer = setTimeout(() => { isIdle = true; listeners.forEach(l => l()); }, timeout);
}

const IDLE_EVENTS = ["mousemove", "keydown", "scroll", "pointerdown", "touchstart"] as const;

export function useIdle(timeout = 5000): boolean {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      const handler = () => resetTimer(timeout);
      IDLE_EVENTS.forEach(e => document.addEventListener(e, handler, { passive: true }));
      resetTimer(timeout);
      return () => {
        listeners.delete(cb);
        IDLE_EVENTS.forEach(e => document.removeEventListener(e, handler));
        if (idleTimer) clearTimeout(idleTimer);
      };
    },
    () => isIdle,
    () => false,
  );
}
```

```ts
// src/dom/use-mouse.ts
import { useSyncExternalStore } from "react";

export type MouseState = { x: number; y: number; elementX: number; elementY: number; pageX: number; pageY: number };

let mouseState: MouseState = { x: 0, y: 0, elementX: 0, elementY: 0, pageX: 0, pageY: 0 };

export function useMouse(): MouseState {
  return useSyncExternalStore(
    (cb) => {
      const handler = (e: MouseEvent) => {
        mouseState = { x: e.clientX, y: e.clientY, elementX: e.offsetX, elementY: e.offsetY, pageX: e.pageX, pageY: e.pageY };
        cb();
      };
      document.addEventListener("mousemove", handler);
      return () => document.removeEventListener("mousemove", handler);
    },
    () => mouseState,
    () => ({ x: 0, y: 0, elementX: 0, elementY: 0, pageX: 0, pageY: 0 }),
  );
}
```

**Commit:**
```bash
git commit -m "feat(react-hooks): add useIdle, useMouse"
```

---

### Task 15: Ref-based DOM hooks (useHover, useMeasure, useClickAway, useLongPress, useIntersectionObserver)

These use `useEffect + useState` since they subscribe to a ref (internal signal, not shared external store).

```ts
// src/dom/use-hover.ts
import { type RefObject, useEffect, useState } from "react";

export function useHover<T extends HTMLElement>(ref: RefObject<T>): boolean {
  const [hovered, setHovered] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const enter = () => setHovered(true);
    const leave = () => setHovered(false);
    el.addEventListener("mouseenter", enter);
    el.addEventListener("mouseleave", leave);
    return () => { el.removeEventListener("mouseenter", enter); el.removeEventListener("mouseleave", leave); };
  }, [ref]);
  return hovered;
}
```

```ts
// src/dom/use-measure.ts
import { type RefObject, useEffect, useState } from "react";

export type Dimensions = { width: number; height: number; top: number; left: number; right: number; bottom: number };

export function useMeasure<T extends HTMLElement>(ref: RefObject<T>): Dimensions {
  const [dims, setDims] = useState<Dimensions>({ width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const r = entry.contentRect;
      setDims({ width: r.width, height: r.height, top: r.top, left: r.left, right: r.right, bottom: r.bottom });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return dims;
}
```

```ts
// src/dom/use-click-away.ts
import { type RefObject, useEffect } from "react";

export function useClickAway<T extends HTMLElement>(ref: RefObject<T>, callback: () => void): void {
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) callback();
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [ref, callback]);
}
```

```ts
// src/dom/use-long-press.ts
import { type RefObject, useEffect, useRef } from "react";

export function useLongPress<T extends HTMLElement>(
  ref: RefObject<T>,
  callback: () => void,
  delay = 400,
): void {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const start = () => { timer.current = setTimeout(callback, delay); };
    const cancel = () => { if (timer.current) { clearTimeout(timer.current); timer.current = null; } };
    el.addEventListener("pointerdown", start);
    el.addEventListener("pointerup", cancel);
    el.addEventListener("pointerleave", cancel);
    return () => {
      el.removeEventListener("pointerdown", start);
      el.removeEventListener("pointerup", cancel);
      el.removeEventListener("pointerleave", cancel);
      cancel();
    };
  }, [ref, callback, delay]);
}
```

```ts
// src/dom/use-intersection-observer.ts
import { type RefObject, useEffect, useState } from "react";

export function useIntersectionObserver<T extends HTMLElement>(
  ref: RefObject<T>,
  options?: IntersectionObserverInit,
): IntersectionObserverEntry | null {
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([e]) => setEntry(e), options);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return entry;
}
```

**Commit:**
```bash
git commit -m "feat(react-hooks): add useHover, useMeasure, useClickAway, useLongPress, useIntersectionObserver"
```

---

### Task 16: Remaining DOM hooks (useDocumentTitle, useFavicon, useLockBodyScroll, useScript, useCopyToClipboard, useGeolocation, useBattery)

```ts
// src/dom/use-document-title.ts
import { useEffect } from "react";

export function useDocumentTitle(title: string): void {
  useEffect(() => { document.title = title; }, [title]);
}
```

```ts
// src/dom/use-favicon.ts
import { useEffect } from "react";

export function useFavicon(url: string): void {
  useEffect(() => {
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = url;
  }, [url]);
}
```

```ts
// src/dom/use-lock-body-scroll.ts
import { useEffect } from "react";

export function useLockBodyScroll(locked = true): void {
  useEffect(() => {
    if (!locked) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = original; };
  }, [locked]);
}
```

```ts
// src/dom/use-script.ts
import { useEffect, useState } from "react";

export type ScriptStatus = "idle" | "loading" | "ready" | "error";

export function useScript(src: string): ScriptStatus {
  const [status, setStatus] = useState<ScriptStatus>("loading");
  useEffect(() => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existing) { setStatus("ready"); return; }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => setStatus("ready");
    script.onerror = () => setStatus("error");
    document.head.appendChild(script);
    return () => { document.head.removeChild(script); };
  }, [src]);
  return status;
}
```

```ts
// src/dom/use-copy-to-clipboard.ts
import { useState, useTransition } from "react";

export function useCopyToClipboard() {
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const copy = (text: string) => {
    startTransition(async () => {
      await navigator.clipboard.writeText(text);
      setCopiedText(text);
    });
  };

  return { copy, copiedText, isCopying: isPending };
}
```

```ts
// src/dom/use-geolocation.ts
import { useTransition, useState, useEffect } from "react";

export type GeolocationState = {
  loading: boolean;
  accuracy: number | null;
  altitude: number | null;
  altitudeAccuracy: number | null;
  heading: number | null;
  latitude: number | null;
  longitude: number | null;
  speed: number | null;
  timestamp: number | null;
  error: GeolocationPositionError | null;
};

const defaultState: GeolocationState = {
  loading: true, accuracy: null, altitude: null, altitudeAccuracy: null,
  heading: null, latitude: null, longitude: null, speed: null, timestamp: null, error: null,
};

export function useGeolocation(options?: PositionOptions): GeolocationState {
  const [state, setState] = useState<GeolocationState>(defaultState);

  useEffect(() => {
    if (!navigator.geolocation) {
      setState(s => ({ ...s, loading: false, error: { code: 2, message: "Geolocation not supported", PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as GeolocationPositionError }));
      return;
    }
    const watchId = navigator.geolocation.watchPosition(
      (pos) => setState({
        loading: false, error: null,
        accuracy: pos.coords.accuracy, altitude: pos.coords.altitude,
        altitudeAccuracy: pos.coords.altitudeAccuracy, heading: pos.coords.heading,
        latitude: pos.coords.latitude, longitude: pos.coords.longitude,
        speed: pos.coords.speed, timestamp: pos.timestamp,
      }),
      (err) => setState(s => ({ ...s, loading: false, error: err })),
      options,
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  return state;
}
```

```ts
// src/dom/use-battery.ts
import { useEffect, useState } from "react";

export type BatteryState = {
  supported: boolean;
  loading: boolean;
  level: number;
  charging: boolean;
  chargingTime: number;
  dischargingTime: number;
};

export function useBattery(): BatteryState {
  const [state, setState] = useState<BatteryState>({
    supported: false, loading: true, level: 1, charging: true, chargingTime: 0, dischargingTime: Infinity,
  });

  useEffect(() => {
    const nav = navigator as unknown as { getBattery?: () => Promise<BatteryManager> };
    if (!nav.getBattery) {
      setState(s => ({ ...s, supported: false, loading: false }));
      return;
    }
    let battery: BatteryManager;
    const update = () => setState({
      supported: true, loading: false,
      level: battery.level, charging: battery.charging,
      chargingTime: battery.chargingTime, dischargingTime: battery.dischargingTime,
    });
    nav.getBattery().then(b => {
      battery = b;
      update();
      b.addEventListener("levelchange", update);
      b.addEventListener("chargingchange", update);
    });
    return () => {
      battery?.removeEventListener("levelchange", update);
      battery?.removeEventListener("chargingchange", update);
    };
  }, []);

  return state;
}
```

**Commit:**
```bash
git commit -m "feat(react-hooks): add useDocumentTitle, useFavicon, useLockBodyScroll, useScript, useCopyToClipboard, useGeolocation, useBattery"
```

---

## Batch 6: PWA Hooks

### Task 17: useDisplayMode, useInstallPrompt, useNotificationPermission, useWakeLock

```ts
// src/pwa/use-display-mode.ts
import { useSyncExternalStore } from "react";

export type DisplayMode = "browser" | "standalone" | "minimal-ui" | "fullscreen";

export function useDisplayMode(): DisplayMode {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia("(display-mode: standalone)");
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => {
      if (window.matchMedia("(display-mode: fullscreen)").matches) return "fullscreen";
      if (window.matchMedia("(display-mode: minimal-ui)").matches) return "minimal-ui";
      if (window.matchMedia("(display-mode: standalone)").matches) return "standalone";
      return "browser";
    },
    () => "browser" as DisplayMode,
  );
}
```

```ts
// src/pwa/use-install-prompt.ts
import { useSyncExternalStore, useTransition } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let promptEvent: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    promptEvent = e as BeforeInstallPromptEvent;
    listeners.forEach(l => l());
  });
  window.addEventListener("appinstalled", () => {
    promptEvent = null;
    listeners.forEach(l => l());
  });
}

export function useInstallPrompt() {
  const [isPending, startTransition] = useTransition();

  const canInstall = useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => promptEvent !== null,
    () => false,
  );

  const prompt = canInstall ? () => startTransition(async () => {
    if (!promptEvent) return;
    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    if (outcome === "accepted") promptEvent = null;
    listeners.forEach(l => l());
  }) : null;

  const dismiss = () => { promptEvent = null; listeners.forEach(l => l()); };

  return { canInstall, prompt, dismiss, isPending };
}
```

```ts
// src/pwa/use-notification-permission.ts
import { useCallback, useSyncExternalStore, useTransition } from "react";

export function useNotificationPermission() {
  const [isPending, startTransition] = useTransition();

  const permission = useSyncExternalStore(
    (cb) => {
      try {
        Notification.permission; // throws if unsupported
        navigator.permissions.query({ name: "notifications" as PermissionName }).then(status => {
          status.addEventListener("change", cb);
        });
      } catch { /* noop */ }
      return () => {};
    },
    () => {
      try { return Notification.permission; } catch { return "default" as NotificationPermission; }
    },
    () => "default" as NotificationPermission,
  );

  const supported = typeof Notification !== "undefined";

  const request = useCallback(() => new Promise<NotificationPermission>((resolve) => {
    startTransition(async () => {
      if (!supported) { resolve("default"); return; }
      const result = await Notification.requestPermission();
      resolve(result);
    });
  }), [supported]);

  return { permission, supported, request, isPending };
}
```

```ts
// src/pwa/use-wake-lock.ts
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

export function useWakeLock() {
  const [active, setActive] = useState(false);
  const [isPending, startTransition] = useTransition();
  const sentinelRef = useRef<WakeLockSentinel | null>(null);
  const supported = typeof navigator !== "undefined" && "wakeLock" in navigator;

  const request = useCallback(() => startTransition(async () => {
    if (!supported) return;
    const sentinel = await navigator.wakeLock.request("screen");
    sentinel.addEventListener("release", () => setActive(false));
    sentinelRef.current = sentinel;
    setActive(true);
  }), [supported]);

  const release = useCallback(() => startTransition(async () => {
    await sentinelRef.current?.release();
    sentinelRef.current = null;
    setActive(false);
  }), []);

  useEffect(() => () => { sentinelRef.current?.release(); }, []);

  return { supported, active, request, release, isPending };
}
```

**Commit:**
```bash
git commit -m "feat(react-hooks): add useDisplayMode, useInstallPrompt, useNotificationPermission, useWakeLock"
```

---

### Task 18: useShare, useAppBadge, useStorageEstimate, useServiceWorker, useServiceWorkerMessage, useCacheStorage

```ts
// src/pwa/use-share.ts
import { useCallback, useState, useTransition } from "react";

export function useShare() {
  const [error, setError] = useState<Error | null>(null);
  const [isPending, startTransition] = useTransition();
  const supported = typeof navigator !== "undefined" && "share" in navigator;

  const share = useCallback((data: ShareData) => {
    startTransition(async () => {
      try { await navigator.share(data); setError(null); }
      catch (e) { if ((e as Error).name !== "AbortError") setError(e as Error); }
    });
  }, []);

  const canShare = useCallback((data?: ShareData) => {
    if (!supported) return false;
    return navigator.canShare?.(data) ?? true;
  }, [supported]);

  return { supported, share, canShare, isSharing: isPending, error };
}
```

```ts
// src/pwa/use-app-badge.ts
import { useCallback, useOptimistic, useTransition } from "react";

export function useAppBadge() {
  const supported = typeof navigator !== "undefined" && "setAppBadge" in navigator;
  const [optimisticCount, setOptimistic] = useOptimistic<number | undefined>(undefined);
  const [isPending, startTransition] = useTransition();

  const set = useCallback((count?: number) => {
    setOptimistic(count);
    startTransition(async () => {
      if (!supported) return;
      count !== undefined ? await navigator.setAppBadge(count) : await navigator.setAppBadge();
    });
  }, [supported]);

  const clear = useCallback(() => {
    setOptimistic(undefined);
    startTransition(async () => {
      if (!supported) return;
      await navigator.clearAppBadge();
    });
  }, [supported]);

  return { supported, set, clear, count: optimisticCount, isPending };
}
```

```ts
// src/pwa/use-storage-estimate.ts
import { useActionState, useCallback } from "react";

export function useStorageEstimate() {
  const supported = typeof navigator !== "undefined" && "storage" in navigator && "estimate" in navigator.storage;

  const [estimate, refresh, isPending] = useActionState(
    async (_prev: StorageEstimate | null) => {
      if (!supported) return null;
      return navigator.storage.estimate();
    },
    null,
  );

  const quota = estimate?.quota ?? null;
  const usage = estimate?.usage ?? null;
  const usagePercent = quota && usage ? Math.round((usage / quota) * 100) : null;

  return { supported, loading: isPending, quota, usage, usagePercent, refresh };
}
```

```ts
// src/pwa/use-service-worker.ts
import { useActionState, useCallback, useSyncExternalStore } from "react";

export type ServiceWorkerStatus = "registering" | "registered" | "activating" | "activated" | "redundant" | "error" | "unsupported";

let swRegistration: ServiceWorkerRegistration | null = null;
let swStatus: ServiceWorkerStatus = "unsupported";
const swListeners = new Set<() => void>();

export function useServiceWorker() {
  const supported = typeof navigator !== "undefined" && "serviceWorker" in navigator;

  const status = useSyncExternalStore(
    (cb) => {
      swListeners.add(cb);
      if (supported && !swRegistration) {
        swStatus = "registering";
        navigator.serviceWorker.register("/sw.js").then(reg => {
          swRegistration = reg;
          swStatus = reg.active ? "activated" : "registered";
          reg.addEventListener("updatefound", () => { swStatus = "activating"; swListeners.forEach(l => l()); });
          if (reg.installing) {
            reg.installing.addEventListener("statechange", function() {
              swStatus = this.state as ServiceWorkerStatus;
              swListeners.forEach(l => l());
            });
          }
          swListeners.forEach(l => l());
        }).catch(() => { swStatus = "error"; swListeners.forEach(l => l()); });
      }
      return () => swListeners.delete(cb);
    },
    () => swStatus,
    () => "unsupported" as ServiceWorkerStatus,
  );

  const [, updateAction, isPending] = useActionState(async () => {
    await swRegistration?.update();
  }, null);

  return { supported, status, registration: swRegistration, update: updateAction, isPending };
}
```

```ts
// src/pwa/use-service-worker-message.ts
import { useCallback, useSyncExternalStore } from "react";

let lastSwMessage: unknown = null;
const swMsgListeners = new Set<() => void>();

if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("message", (e) => {
    lastSwMessage = e.data;
    swMsgListeners.forEach(l => l());
  });
}

export function useServiceWorkerMessage<TIncoming = unknown, TOutgoing = unknown>() {
  const supported = typeof navigator !== "undefined" && "serviceWorker" in navigator;

  const lastMessage = useSyncExternalStore(
    (cb) => { swMsgListeners.add(cb); return () => swMsgListeners.delete(cb); },
    () => lastSwMessage as TIncoming | null,
    () => null,
  );

  const post = useCallback((message: TOutgoing) => {
    navigator.serviceWorker.controller?.postMessage(message);
  }, []);

  return { lastMessage, post, supported };
}
```

```ts
// src/pwa/use-cache-storage.ts
import { useCallback, useTransition } from "react";

export function useCacheStorage() {
  const supported = typeof caches !== "undefined";
  const [isPending, startTransition] = useTransition();

  const keys = useCallback(() => caches.keys(), []);
  const has = useCallback((name: string, req: RequestInfo) =>
    caches.open(name).then(c => c.match(req)).then(Boolean), []);
  const get = useCallback((name: string, req: RequestInfo) =>
    caches.open(name).then(c => c.match(req)), []);

  const put = useCallback((name: string, req: RequestInfo, res: Response) =>
    new Promise<void>((resolve) =>
      startTransition(async () => { const c = await caches.open(name); await c.put(req, res); resolve(); })
    ), []);

  const del = useCallback((name: string, req?: RequestInfo) =>
    new Promise<boolean>((resolve) =>
      startTransition(async () => {
        if (req) { const c = await caches.open(name); resolve(await c.delete(req)); }
        else { resolve(await caches.delete(name)); }
      })
    ), []);

  return { supported, keys, has, get, put, delete: del, isPending };
}
```

**Commit:**
```bash
git commit -m "feat(react-hooks): add useShare, useAppBadge, useStorageEstimate, useServiceWorker, useServiceWorkerMessage, useCacheStorage"
```

---

## Batch 7: Web Worker Hooks

### Task 19: useWorker, useSharedWorker, useWorkerState

```ts
// src/workers/use-worker.ts
import { useCallback, useEffect, useRef, useSyncExternalStore, useTransition } from "react";

export type WorkerStatus = "idle" | "pending" | "success" | "error";

export type UseWorkerReturn<TInput, TOutput> = {
  status: WorkerStatus;
  result: TOutput | null;
  error: Error | null;
  isPending: boolean;
  post: (message: TInput, transfer?: Transferable[]) => void;
  terminate: () => void;
};

export function useWorker<TInput, TOutput>(
  workerFactory: () => Worker,
): UseWorkerReturn<TInput, TOutput> {
  const workerRef = useRef<Worker | null>(null);
  const stateRef = useRef<{ status: WorkerStatus; result: TOutput | null; error: Error | null }>({
    status: "idle", result: null, error: null,
  });
  const listenersRef = useRef(new Set<() => void>());
  const [isPending, startTransition] = useTransition();

  const notify = useCallback(() => listenersRef.current.forEach(l => l()), []);

  const state = useSyncExternalStore(
    (cb) => {
      listenersRef.current.add(cb);
      if (!workerRef.current) {
        workerRef.current = workerFactory();
        workerRef.current.onmessage = (e) => {
          stateRef.current = { status: "success", result: e.data as TOutput, error: null };
          notify();
        };
        workerRef.current.onerror = (e) => {
          stateRef.current = { status: "error", result: null, error: new Error(e.message) };
          notify();
        };
      }
      return () => { listenersRef.current.delete(cb); };
    },
    () => stateRef.current,
    () => ({ status: "idle" as WorkerStatus, result: null, error: null }),
  );

  const post = useCallback((message: TInput, transfer?: Transferable[]) => {
    if (!workerRef.current) return;
    stateRef.current = { status: "pending", result: null, error: null };
    notify();
    startTransition(async () => {
      workerRef.current?.postMessage(message, transfer ?? []);
    });
  }, [notify]);

  const terminate = useCallback(() => {
    workerRef.current?.terminate();
    workerRef.current = null;
    stateRef.current = { status: "idle", result: null, error: null };
    notify();
  }, [notify]);

  useEffect(() => () => { workerRef.current?.terminate(); }, []);

  return { ...state, isPending, post, terminate };
}
```

```ts
// src/workers/use-worker-state.ts
import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";

export function useWorkerState<TState>(
  workerFactory: () => Worker,
  initialState: TState,
): { state: TState; post: (message: unknown, transfer?: Transferable[]) => void; terminate: () => void } {
  const workerRef = useRef<Worker | null>(null);
  const stateRef = useRef<TState>(initialState);
  const listenersRef = useRef(new Set<() => void>());

  const state = useSyncExternalStore(
    (cb) => {
      listenersRef.current.add(cb);
      if (!workerRef.current) {
        workerRef.current = workerFactory();
        workerRef.current.onmessage = (e) => {
          stateRef.current = e.data as TState;
          listenersRef.current.forEach(l => l());
        };
      }
      return () => listenersRef.current.delete(cb);
    },
    () => stateRef.current,
    () => initialState,
  );

  const post = useCallback((message: unknown, transfer?: Transferable[]) => {
    workerRef.current?.postMessage(message, transfer ?? []);
  }, []);

  const terminate = useCallback(() => {
    workerRef.current?.terminate();
    workerRef.current = null;
  }, []);

  useEffect(() => () => { workerRef.current?.terminate(); }, []);

  return { state, post, terminate };
}
```

**Commit:**
```bash
git commit -m "feat(react-hooks): add useWorker, useWorkerState"
```

---

## Batch 8: Main Index + README + CHANGELOG

### Task 20: Wire up index.ts

**File:** `libraries/react-hooks/src/index.ts`

Export all hooks grouped by category:
```ts
// Foundation
export { useIsClient } from "./use-is-client.ts";

// State
export { useCounter } from "./state/use-counter.ts";
export { useDefault } from "./state/use-default.ts";
export { useList } from "./state/use-list.ts";
export { useMap } from "./state/use-map.ts";
export { useObjectState } from "./state/use-object-state.ts";
export { useQueue } from "./state/use-queue.ts";
export { useSet } from "./state/use-set.ts";
export { useToggle } from "./state/use-toggle.ts";

// Storage
export { useLocalStorage } from "./storage/use-local-storage.ts";
export { useSessionStorage } from "./storage/use-session-storage.ts";

// DOM
export { useBattery } from "./dom/use-battery.ts";
export { useClickAway } from "./dom/use-click-away.ts";
export { useCopyToClipboard } from "./dom/use-copy-to-clipboard.ts";
export { useDocumentTitle } from "./dom/use-document-title.ts";
export { useFavicon } from "./dom/use-favicon.ts";
export { useGeolocation } from "./dom/use-geolocation.ts";
export { useHistoryState } from "./dom/use-history-state.ts";
export { useHover } from "./dom/use-hover.ts";
export { useIdle } from "./dom/use-idle.ts";
export { useIntersectionObserver } from "./dom/use-intersection-observer.ts";
export { useLockBodyScroll } from "./dom/use-lock-body-scroll.ts";
export { useLongPress } from "./dom/use-long-press.ts";
export { useMeasure } from "./dom/use-measure.ts";
export { useMediaQuery } from "./dom/use-media-query.ts";
export { useMouse } from "./dom/use-mouse.ts";
export { useNetworkState } from "./dom/use-network-state.ts";
export { useOrientation } from "./dom/use-orientation.ts";
export { useScript } from "./dom/use-script.ts";
export { useVisibilityChange } from "./dom/use-visibility-change.ts";
export { useWindowScroll } from "./dom/use-window-scroll.ts";
export { useWindowSize } from "./dom/use-window-size.ts";

// Utils
export { useContinuousRetry } from "./utils/use-continuous-retry.ts";
export { useCountdown } from "./utils/use-countdown.ts";
export { useDebounce } from "./utils/use-debounce.ts";
export { useEventListener } from "./utils/use-event-listener.ts";
export { useFetch } from "./utils/use-fetch.ts";
export { useInterval } from "./utils/use-interval.ts";
export { useIntervalWhen } from "./utils/use-interval-when.ts";
export { useIsFirstRender } from "./utils/use-is-first-render.ts";
export { useKeyPress } from "./utils/use-key-press.ts";
export { useLogger } from "./utils/use-logger.ts";
export { usePageLeave } from "./utils/use-page-leave.ts";
export { usePrevious } from "./utils/use-previous.ts";
export { useRandomInterval } from "./utils/use-random-interval.ts";
export { useRenderCount } from "./utils/use-render-count.ts";
export { useRenderInfo } from "./utils/use-render-info.ts";
export { useThrottle } from "./utils/use-throttle.ts";
export { useTimeout } from "./utils/use-timeout.ts";

// PWA
export { useAppBadge } from "./pwa/use-app-badge.ts";
export { useCacheStorage } from "./pwa/use-cache-storage.ts";
export { useDisplayMode } from "./pwa/use-display-mode.ts";
export { useInstallPrompt } from "./pwa/use-install-prompt.ts";
export { useNotificationPermission } from "./pwa/use-notification-permission.ts";
export { useServiceWorker } from "./pwa/use-service-worker.ts";
export { useServiceWorkerMessage } from "./pwa/use-service-worker-message.ts";
export { useShare } from "./pwa/use-share.ts";
export { useStorageEstimate } from "./pwa/use-storage-estimate.ts";
export { useWakeLock } from "./pwa/use-wake-lock.ts";

// Workers
export { useWorker } from "./workers/use-worker.ts";
export { useWorkerState } from "./workers/use-worker-state.ts";
```

**Step 2: Build**
```bash
cd libraries/react-hooks && bun x --bun fot build
```
Expected: dist/ produced with index.js and index.d.ts

**Step 3: Run all tests**
```bash
bun x --bun fot test
```
Expected: all pass

**Step 4: Commit**
```bash
git add src/index.ts
git commit -m "feat(react-hooks): wire up index.ts with all hook exports"
```

---

### Task 21: Write README.md

Create `libraries/react-hooks/README.md` with:
- What it is / installation
- Full hook API table organized by category (State, Storage, DOM, Utils, PWA, Workers)
- SSR safety note
- React 19 patterns note (useSyncExternalStore, useTransition, useActionState, useOptimistic)
- Per-hook usage examples for most important hooks

**Commit:**
```bash
git add README.md
git commit -m "docs(react-hooks): write README"
```

---

### Task 22: Write CHANGELOG.md

```markdown
# Changelog

All notable changes to `@f-o-t/react-hooks` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-02-21

### Added
- Initial release with 70+ hooks
- State: useCounter, useToggle, useList, useMap, useSet, useQueue, useObjectState, useDefault
- Storage: useLocalStorage, useSessionStorage (SSR-safe, useSyncExternalStore + useOptimistic)
- DOM: useMediaQuery, useWindowSize, useWindowScroll, useNetworkState, useOrientation,
  useVisibilityChange, usePreferredLanguage, useHistoryState, useIdle, useMouse,
  useHover, useMeasure, useClickAway, useLongPress, useIntersectionObserver,
  useDocumentTitle, useFavicon, useLockBodyScroll, useScript, useCopyToClipboard,
  useGeolocation, useBattery
- Utils: useIsClient, useDebounce, useThrottle, usePrevious, useIsFirstRender,
  useRenderCount, useRenderInfo, useInterval, useIntervalWhen, useTimeout,
  useRandomInterval, useCountdown, useContinuousRetry, useFetch, useEventListener,
  useKeyPress, useLogger, usePageLeave
- PWA: useDisplayMode, useInstallPrompt, useNotificationPermission, useWakeLock,
  useShare, useAppBadge, useStorageEstimate, useServiceWorker, useServiceWorkerMessage,
  useCacheStorage
- Workers: useWorker, useWorkerState
- Full unit test coverage with bun:test + @testing-library/react + happy-dom
- React 19 patterns: useSyncExternalStore, useTransition, useActionState, useOptimistic
```

**Commit:**
```bash
git add CHANGELOG.md
git commit -m "docs(react-hooks): add CHANGELOG"
```

---

### Task 23: Final validation

**Step 1: Run full test suite**
```bash
cd libraries/react-hooks && bun x --bun fot test
```
Expected: all tests pass

**Step 2: Run build**
```bash
bun x --bun fot build
```
Expected: dist/ produced cleanly

**Step 3: Run lint/format check**
```bash
bun x --bun fot check
```
Expected: no errors

**Step 4: Final commit**
```bash
git add -A
git commit -m "chore(react-hooks): final polish and release prep"
```

---

## Notes

### SSR Safety Checklist (for every browser-dependent hook)
- [ ] Uses `useSyncExternalStore` with a `getServerSnapshot` returning a safe default
- [ ] No bare `window`/`document`/`navigator` at module level (only inside subscribe/getSnapshot)
- [ ] Server snapshot matches what the first client render would show

### React 19 Pattern Summary
| Pattern | Used for |
|---------|---------|
| `useSyncExternalStore` | All browser API subscriptions (media query, scroll, network, etc.) |
| `useTransition` (async) | Async user actions (copy, share, wake lock, worker post) |
| `useActionState` | Fetch, service worker update, storage estimate |
| `useOptimistic` | localStorage/sessionStorage writes, app badge |
| `use(promise)` | useFetchSuspense variant (optional enhancement) |

### Test Patterns to Follow
From `libraries/e-signature/__tests__/plugins/react.test.tsx`:
- Use `renderHook()` for initial state assertions
- Use `act(() => ...)` for synchronous state transitions
- Use `await act(async () => ...)` for async operations
- Mock module-level globals (localStorage, navigator, etc.) per test when needed
