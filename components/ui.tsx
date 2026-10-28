"use client";

import clsx from "clsx";
import {
  Check,
  CircleCheck,
  CircleX,
  Clock,
  Copy,
  Database,
  Info,
  LifeBuoy,
  LoaderCircle,
  Lock,
  Sparkles,
  TriangleAlert,
  X,
} from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

/* ---------------- Button ---------------- */

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";

export function Button({
  variant = "secondary",
  size = "md",
  loading,
  icon,
  children,
  className,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: ReactNode;
}) {
  return (
    <button
      type="button"
      className={clsx("btn", `btn-${variant}`, size !== "md" && `btn-${size}`, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <LoaderCircle size={16} className="animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
}

/* ---------------- Status badges ---------------- */

export type Tone = "success" | "warning" | "danger" | "info" | "locked";

const toneClass: Record<Tone, string> = {
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  info: "bg-info-soft text-info",
  locked: "bg-locked-soft text-locked",
};

const toneIcon: Record<Tone, typeof CircleCheck> = {
  success: CircleCheck,
  warning: Clock,
  danger: CircleX,
  info: Info,
  locked: Lock,
};

export function Badge({
  tone,
  children,
  icon,
  spinning,
  className,
}: {
  tone: Tone;
  children: ReactNode;
  icon?: typeof CircleCheck;
  spinning?: boolean;
  className?: string;
}) {
  const Icon = spinning ? LoaderCircle : (icon ?? toneIcon[tone]);
  return (
    <span
      className={clsx(
        "t-label inline-flex h-6 items-center gap-1 rounded-full px-2.5 whitespace-nowrap",
        toneClass[tone],
        className,
      )}
    >
      <Icon size={14} aria-hidden className={spinning ? "animate-spin" : undefined} />
      {children}
    </span>
  );
}

/** Domain value → badge (DESIGN §3.3). */
export function statusBadge(value: string): { tone: Tone; label: string; spinning?: boolean } {
  switch (value) {
    case "planned":
      return { tone: "info", label: "Planned" };
    case "invoiced":
    case "SENT":
    case "awaiting":
      return { tone: "warning", label: "Awaiting payment" };
    case "paid":
    case "PAID":
    case "COMPLETED":
      return { tone: "success", label: "Paid" };
    case "paid_out":
      return { tone: "success", label: "Paid out" };
    case "DRAFT":
    case "draft":
      return { tone: "info", label: "Draft" };
    case "DECLINED":
    case "declined":
      return { tone: "danger", label: "Declined" };
    case "FAILED":
    case "failed":
      return { tone: "danger", label: "Failed" };
    case "SUCCESS":
    case "sent":
      return { tone: "success", label: "Sent" };
    case "UNCLAIMED":
      return { tone: "warning", label: "Unclaimed" };
    case "PENDING":
    case "PROCESSING":
    case "CREATING":
    case "processing":
      return { tone: "warning", label: "Processing", spinning: true };
    default:
      return { tone: "info", label: value };
  }
}

export function StatusBadge({ value, className }: { value: string; className?: string }) {
  const b = statusBadge(value);
  return (
    <Badge tone={b.tone} spinning={b.spinning} className={className}>
      {b.label}
    </Badge>
  );
}

export function ProvenanceBadge({ source }: { source: "ai" | "fallback" | "cache" }) {
  if (source === "ai")
    return (
      <span className="t-label inline-flex h-6 items-center gap-1 rounded-full bg-brand-accent px-2.5 text-brand">
        <Sparkles size={14} aria-hidden /> AI
      </span>
    );
  if (source === "cache")
    return (
      <Badge tone="info" icon={Database}>
        Cached
      </Badge>
    );
  return (
    <Badge tone="warning" icon={LifeBuoy}>
      Fallback
    </Badge>
  );
}

/* ---------------- Copyable ID ---------------- */

export function middleTruncate(s: string, max = 18): string {
  if (s.length <= max) return s;
  const keep = Math.floor((max - 1) / 2);
  return `${s.slice(0, keep)}…${s.slice(-keep)}`;
}

export function CopyId({ value, max = 18, className }: { value: string; max?: number; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <span className={clsx("inline-flex items-center gap-1", className)}>
      <span className="t-mono" title={value}>
        {middleTruncate(value, max)}
      </span>
      <button
        type="button"
        className="btn btn-ghost btn-sm !h-7 !w-7"
        aria-label={`Copy ${value}`}
        title="Copy"
        onClick={() => {
          navigator.clipboard?.writeText(value).catch(() => undefined);
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        }}
      >
        {copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}
      </button>
    </span>
  );
}

/* ---------------- Alerts ---------------- */

export function Alert({
  tone,
  title,
  children,
  action,
  className,
}: {
  tone: Tone;
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  const Icon = tone === "warning" ? TriangleAlert : toneIcon[tone];
  return (
    <div className={clsx("flex gap-3 rounded-sm p-4", toneClass[tone], className)} role={tone === "danger" ? "alert" : "status"}>
      <Icon size={20} aria-hidden className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1 text-ink">
        <div className="font-bold">{title}</div>
        {children && <div className="t-body-sm mt-0.5">{children}</div>}
        {action && <div className="mt-2">{action}</div>}
      </div>
    </div>
  );
}

/* ---------------- Segmented tabs ---------------- */

export function SegmentedTabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
}: {
  tabs: { id: T; label: string; count?: number }[];
  value: T;
  onChange: (id: T) => void;
  label: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  return (
    <div role="tablist" aria-label={label} className="inline-flex h-10 items-center rounded-track bg-surface-tint p-0.5">
      {tabs.map((t, i) => {
        const active = t.id === value;
        return (
          <button
            key={t.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            role="tab"
            type="button"
            id={`tab-${t.id}`}
            aria-selected={active}
            aria-controls={`tabpanel-${t.id}`}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(t.id)}
            onKeyDown={(e) => {
              if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
              const next = (i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length;
              onChange(tabs[next].id);
              refs.current[next]?.focus();
            }}
            className={clsx(
              "t-label flex h-9 items-center gap-1.5 rounded-[88px] px-4 transition-colors duration-300",
              active ? "bg-canvas text-ink shadow-raised" : "text-black/60 hover:text-ink",
            )}
          >
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className="rounded-full bg-surface-tint-strong px-1.5 tabular">{t.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ---------------- Modal / drawer (focus trap, Escape, return focus) ---------------- */

function useFocusTrap(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const node = ref.current;
    const focusables = () =>
      Array.from(
        node?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );
    (focusables()[0] ?? node)?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "Tab") {
        const f = focusables();
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, [open, onClose]);
  return ref;
}

export function Modal({
  open,
  onClose,
  labelledBy,
  children,
  width = 640,
}: {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  children: ReactNode;
  width?: number;
}) {
  const ref = useFocusTrap(open, onClose);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className="fade-in relative max-h-[92vh] w-full overflow-auto rounded-lg bg-canvas shadow-overlay"
        style={{ maxWidth: width }}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function Drawer({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const ref = useFocusTrap(open, onClose);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        tabIndex={-1}
        className="absolute top-0 right-0 flex h-full w-full max-w-[420px] flex-col bg-canvas shadow-overlay"
        style={{ animation: "drawerIn 300ms var(--ease-out-soft)" }}
      >
        <div className="flex h-16 items-center justify-between border-b border-hairline px-6">
          <h2 id="drawer-title" className="t-title-md">
            {title}
          </h2>
          <button type="button" className="btn btn-ghost" aria-label="Close" onClick={onClose}>
            <X size={20} aria-hidden />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-6">{children}</div>
      </div>
      <style>{`@keyframes drawerIn{from{transform:translateX(100%)}to{transform:none}}`}</style>
    </div>,
    document.body,
  );
}

/* ---------------- Toasts ---------------- */

interface Toast {
  id: number;
  tone: "info" | "success" | "error";
  message: string;
  ref?: string | null;
}

const ToastCtx = createContext<(t: Omit<Toast, "id">) => void>(() => undefined);
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const dismiss = useCallback((id: number) => setToasts((ts) => ts.filter((t) => t.id !== id)), []);
  const push = useCallback(
    (t: Omit<Toast, "id">) => {
      const id = Date.now() + Math.random();
      setToasts((ts) => [...ts.slice(-3), { ...t, id }]);
      if (t.tone !== "error") setTimeout(() => dismiss(id), 5000);
    },
    [dismiss],
  );
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed right-6 bottom-6 z-[60] flex w-[min(420px,calc(100vw-32px))] flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.tone === "error" ? "alert" : "status"}
            aria-live={t.tone === "error" ? "assertive" : "polite"}
            className="fade-in pointer-events-auto flex items-start gap-3 rounded-sm bg-surface-inverse p-4 text-white shadow-overlay"
          >
            {t.tone === "error" ? (
              <CircleX size={20} className="mt-0.5 shrink-0 text-[#ff8a80]" aria-hidden />
            ) : t.tone === "success" ? (
              <CircleCheck size={20} className="mt-0.5 shrink-0 text-[#7ee2a8]" aria-hidden />
            ) : (
              <Info size={20} className="mt-0.5 shrink-0 text-brand-accent" aria-hidden />
            )}
            <div className="t-body-sm min-w-0 flex-1">
              {t.message}
              {t.ref && <div className="t-mono mt-1 truncate text-white/70">{t.ref}</div>}
            </div>
            <button
              type="button"
              aria-label="Dismiss"
              className="rounded-full p-1 text-white/70 hover:text-white"
              onClick={() => dismiss(t.id)}
            >
              <X size={16} aria-hidden />
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/* ---------------- Misc ---------------- */

export function EmptyState({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
      <div className="text-ink-subtle">{icon}</div>
      <div className="t-title-md">{title}</div>
      <p className="t-body-sm max-w-sm text-ink-muted">{children}</p>
    </div>
  );
}

export function Wordmark({ inverse }: { inverse?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className={clsx(
          "flex h-7 w-7 items-center justify-center rounded-sm",
          inverse ? "bg-white text-brand" : "bg-brand text-white",
        )}
        aria-hidden
      >
        <Lock size={16} strokeWidth={2.5} />
      </span>
      <span className={clsx("font-display text-xl font-black tracking-[-0.6px]", inverse && "text-white")}>
        ScopeLock
      </span>
    </span>
  );
}
