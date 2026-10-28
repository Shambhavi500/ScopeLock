"use client";

import "@svar-ui/react-gantt/all.css";
import { Gantt, Tooltip, Willow, type IApi, type ITask } from "@svar-ui/react-gantt";
import { useEffect, useMemo, useRef, useState, type FC } from "react";
import type { MilestoneDTO, TaskDTO } from "@/lib/api-types";
import { formatUSD } from "@/lib/domain/money";

const ROLE_LABEL: Record<string, string> = { design: "Design", dev: "Dev", qa: "QA", pm: "PM" };

function toDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Tooltip body: role, dates, and for locked tasks the invoice that blocks them. */
const TooltipContent: FC<{ api: IApi; data: unknown }> = ({ data }) => {
  const task = (data as { task?: ITask }).task;
  if (!task || task.type === "summary") return null;
  const t = task.meta as TaskDTO | undefined;
  if (!t) return null;
  return (
    <div className="t-body-sm max-w-xs rounded-sm bg-canvas p-3 shadow-raised">
      <div className="font-bold">{t.title}</div>
      <div className="text-ink-muted">
        {ROLE_LABEL[t.role]} · {t.durationDays} day{t.durationDays === 1 ? "" : "s"} · starts {t.startDate}
      </div>
      {t.locked && (
        <div className="mt-1 font-bold text-locked">
          🔒 Locked until {t.lockInvoiceNumber ? `invoice ${t.lockInvoiceNumber}` : "the invoice"} is paid
          {t.lockAmountCents ? ` (${formatUSD(t.lockAmountCents)})` : ""}
        </div>
      )}
      {t.source === "change_order" && <div className="text-ink-muted">Added by a change order</div>}
    </div>
  );
};

/**
 * SVAR normalises unknown task types to "task", so role colour, lock styling and the unlock
 * flash are drawn by this template, which fills the whole bar.
 */
const BarTemplate: FC<{ data: ITask }> = ({ data }) => {
  if (data.type === "summary") return <div className="bar-fill bar-summary">{data.text}</div>;
  return <div className={`bar-fill ${data.barClass ?? ""}`}>{data.text}</div>;
};

export default function ProjectGantt({ tasks, milestones }: { tasks: TaskDTO[]; milestones: MilestoneDTO[] }) {
  const [api, setApi] = useState<IApi | undefined>();
  const prevLocked = useRef<Set<string> | null>(null);
  const [justUnlocked, setJustUnlocked] = useState<Set<string>>(new Set());

  // Detect locked → unlocked transitions for the one expressive animation in the app.
  useEffect(() => {
    const locked = new Set(tasks.filter((t) => t.locked).map((t) => t.id));
    const prev = prevLocked.current;
    prevLocked.current = locked;
    if (!prev) return;
    const unlocked = [...prev].filter((id) => !locked.has(id) && tasks.some((t) => t.id === id));
    if (unlocked.length === 0) return;
    setJustUnlocked(new Set(unlocked));
    const timer = setTimeout(() => setJustUnlocked(new Set()), 1500);
    return () => clearTimeout(timer);
  }, [tasks]);

  const { ganttTasks, links, start, end } = useMemo(() => {
    const ganttTasks: ITask[] = [];
    for (const m of milestones) {
      const children = tasks.filter((t) => t.milestoneId === m.id);
      if (!children.length) continue;
      ganttTasks.push({ id: m.id, text: `M${m.seq} · ${m.title}`, type: "summary", open: true });
      for (const t of children) {
        const classes = [
          `role-${t.role}`,
          t.locked && "is-locked",
          t.source === "change_order" && "is-new",
          justUnlocked.has(t.id) && "is-unlocked",
        ]
          .filter(Boolean)
          .join(" ");
        ganttTasks.push({
          id: t.id,
          text: t.locked ? `🔒 ${t.title}` : t.title,
          start: toDate(t.startDate),
          duration: t.durationDays,
          parent: m.id,
          type: "task",
          barClass: classes,
          progress: 0,
          role: ROLE_LABEL[t.role],
          meta: t,
        });
      }
    }
    const links = tasks
      .filter((t) => t.dependsOn)
      .map((t) => ({ id: `l-${t.id}`, source: t.dependsOn!, target: t.id, type: "e2s" as const }));
    const starts = tasks.map((t) => toDate(t.startDate).getTime());
    const ends = tasks.map((t) => toDate(t.startDate).getTime() + t.durationDays * 86_400_000);
    const start = new Date(Math.min(...starts) - 2 * 86_400_000);
    const end = new Date(Math.max(...ends) + 5 * 86_400_000);
    return { ganttTasks, links, start, end };
  }, [tasks, milestones, justUnlocked]);

  const lockedCount = tasks.filter((t) => t.locked).length;
  // Re-mount when the data changes so SVAR picks up new tasks, dates and classes.
  const key = useMemo(
    () => ganttTasks.map((t) => `${t.id}:${t.barClass ?? ""}:${t.start?.getTime() ?? ""}`).join("|"),
    [ganttTasks],
  );

  return (
    <div className="gantt-host">
      <p className="sr-only" aria-live="polite">
        {lockedCount
          ? `${lockedCount} tasks are locked until their blocking invoice is paid: ${tasks
              .filter((t) => t.locked)
              .map((t) => `${t.title}, locked until ${t.lockInvoiceNumber ?? "invoice"} is paid`)
              .join("; ")}.`
          : "All tasks are unlocked."}
      </p>
      <Willow fonts={false}>
        <Tooltip api={api} content={TooltipContent}>
          <Gantt
            key={key}
            init={(a) => {
              setApi(a);
              // Open on the current phase rather than the project start.
              setTimeout(() => a.exec("scroll-chart", { date: new Date(Date.now() - 12 * 86_400_000) }), 0);
            }}
            tasks={ganttTasks}
            links={links}
            start={start}
            end={end}
            readonly
            taskTemplate={BarTemplate}
            markers={[{ start: new Date(new Date().setHours(0, 0, 0, 0)), text: "Today" }]}
            cellWidth={30}
            cellHeight={36}
            scaleHeight={32}
            columns={[
              { id: "text", header: "Task", width: 210 },
              { id: "role", header: "Role", width: 64, align: "center" },
            ]}
            scales={[
              {
                unit: "month",
                step: 1,
                format: (d: Date) => d.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
              },
              { unit: "day", step: 1, format: (d: Date) => String(d.getDate()) },
            ]}
          />
        </Tooltip>
      </Willow>
    </div>
  );
}
