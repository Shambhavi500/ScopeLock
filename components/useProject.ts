"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ApiError, ProjectState } from "@/lib/api-types";

export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly body: ApiError,
  ) {
    super(body.error);
  }
}

/** fetch + JSON with `{ error, code }` failures turned into ApiRequestError. */
export async function api<T>(url: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const res = await fetch(url, {
    method: init?.method ?? (init?.body !== undefined ? "POST" : "GET"),
    headers: init?.body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({ error: `HTTP ${res.status}`, code: "BAD_RESPONSE" }));
  if (!res.ok) throw new ApiRequestError(res.status, json as ApiError);
  return json as T;
}

/** One GET returns everything the cockpit needs; call refresh() after each mutation. */
export function useProject(projectId: string) {
  const [state, setState] = useState<ProjectState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [slow, setSlow] = useState(false);
  const loaded = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const s = await api<ProjectState>(`/api/project/${projectId}`);
      setState(s);
      setError(null);
      loaded.current = true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSlow(false);
    }
  }, [projectId]);

  useEffect(() => {
    let alive = true;
    const t = setTimeout(() => {
      if (!loaded.current) setSlow(true);
    }, 3000);
    api<ProjectState>(`/api/project/${projectId}`)
      .then((s) => {
        if (!alive) return;
        setState(s);
        setError(null);
        loaded.current = true;
      })
      .catch((e) => alive && setError(e instanceof Error ? e.message : String(e)))
      .finally(() => alive && setSlow(false));
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [projectId]);

  return { state, error, slow, refresh };
}

export function formatDate(iso: string | null | undefined, opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }) {
  if (!iso) return "—";
  const d = iso.length === 10 ? new Date(`${iso}T00:00:00Z`) : new Date(iso);
  return d.toLocaleDateString("en-US", { timeZone: iso.length === 10 ? "UTC" : undefined, ...opts });
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}
