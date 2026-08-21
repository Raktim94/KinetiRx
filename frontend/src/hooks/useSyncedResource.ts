// Generic hooks that let existing tab/modal components keep using a plain
// `React.Dispatch<React.SetStateAction<T[]>>` (or `<T>` for singletons) prop
// — exactly the same shape `useState`'s setter has — while every call
// transparently diffs the before/after state and fires the matching
// create/update/delete REST call against the real backend.
//
// This is what lets ~10 existing tab/modal components (InventoryTab,
// PatientsTab, DueKhataTab, POSTab, DistributorModal, AddStockModal, ...)
// that call `setMedicines(prev => [item, ...prev])`, `setX(prev =>
// prev.filter(...))`, `setX(prev => prev.map(...))` etc. directly keep
// working unmodified, instead of threading a bespoke
// onCreate/onUpdate/onDelete callback prop through every one of them.
import React, { useCallback, useRef, useState } from 'react';
import { ApiError, CrudClient } from '../lib/api';

export type Setter<T> = React.Dispatch<React.SetStateAction<T>>;

function resolveNext<T>(prev: T, updater: React.SetStateAction<T>): T {
  return typeof updater === 'function' ? (updater as (p: T) => T)(prev) : updater;
}

function describeError(err: unknown): string {
  if (err instanceof ApiError) return err.describe();
  if (err instanceof Error) return err.message;
  return 'An unexpected error occurred while saving to the server.';
}

/**
 * Backs an array of entities with real per-item REST calls. `onError`
 * receives a human-readable message any time a create/update/delete fails
 * (e.g. a 403 from a permission the server enforces) — callers should surface
 * it (alert/toast), never swallow it silently.
 */
export function useSyncedList<T extends { id: string }>(
  crudClient: CrudClient<T> | null,
  onError: (message: string, err: unknown) => void
): [T[], Setter<T[]>, Setter<T[]>] {
  const [items, setItemsState] = useState<T[]>([]);
  // setItemsRaw bypasses diffing entirely — used only to hydrate state from
  // a GET /list response on mount/refresh, where every item is already
  // persisted server-side and must NOT be re-POSTed as if newly created.
  const setItemsRaw = useCallback<Setter<T[]>>(updater => {
    setItemsState(prev => resolveNext(prev, updater));
  }, []);

  const crudRef = useRef(crudClient);
  crudRef.current = crudClient;

  const setItems = useCallback<Setter<T[]>>(
    updater => {
      setItemsState(prev => {
        const next = resolveNext(prev, updater);
        const crud = crudRef.current;
        if (!crud) return next;

        const prevById = new Map(prev.map(i => [i.id, i]));
        const nextById = new Map(next.map(i => [i.id, i]));

        for (const item of next) {
          if (!prevById.has(item.id)) {
            crud.create(item).catch(err => onError(describeError(err), err));
          }
        }
        for (const item of prev) {
          if (!nextById.has(item.id)) {
            crud.remove(item.id).catch(err => onError(describeError(err), err));
          }
        }
        for (const item of next) {
          const prevItem = prevById.get(item.id);
          if (prevItem && prevItem !== item && JSON.stringify(prevItem) !== JSON.stringify(item)) {
            crud.update(item.id, item).catch(err => onError(describeError(err), err));
          }
        }

        return next;
      });
    },
    [onError]
  );

  return [items, setItems, setItemsRaw];
}

/**
 * Backs a singleton-per-org resource (daily register, invoice config) with a
 * debounced full-object PUT-upsert. Debounced (rather than firing on every
 * call) because these objects are edited field-by-field in rapid succession
 * (denomination counting, form typing) — a per-keystroke PUT would be
 * wasteful and can race; a short debounce collapses that into one write of
 * the final value, while local state updates are still immediate/optimistic.
 */
export function useSyncedSingleton<T>(
  initialValue: T,
  put: ((value: T) => Promise<T>) | null,
  onError: (message: string, err: unknown) => void,
  debounceMs = 500
): [T, Setter<T>, Setter<T>] {
  const [value, setValueState] = useState<T>(initialValue);
  const setValueRaw = useCallback<Setter<T>>(updater => {
    setValueState(prev => resolveNext(prev, updater));
  }, []);

  const putRef = useRef(put);
  putRef.current = put;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setValue = useCallback<Setter<T>>(
    updater => {
      setValueState(prev => {
        const next = resolveNext(prev, updater);
        const putFn = putRef.current;
        if (putFn) {
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          timeoutRef.current = setTimeout(() => {
            putFn(next).catch(err => onError(describeError(err), err));
          }, debounceMs);
        }
        return next;
      });
    },
    [onError, debounceMs]
  );

  return [value, setValue, setValueRaw];
}
