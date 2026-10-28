import type { Role, TaskLite } from "./types";

const DAY = 86_400_000;

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return new Date(d.getTime() + days * DAY).toISOString().slice(0, 10);
}

export function taskEnd(t: Pick<TaskLite, "startDate" | "durationDays">): string {
  return addDays(t.startDate, t.durationDays);
}

export function projectEnd(tasks: TaskLite[]): string | null {
  return tasks.reduce<string | null>((max, t) => {
    const e = taskEnd(t);
    return !max || e > max ? e : max;
  }, null);
}

export interface ScheduleItem {
  title: string;
  role: Role;
  hours: number;
}

export interface SchedulePreview {
  tasks: TaskLite[];
  added: TaskLite[];
  shifted: { id: string; title: string; fromStart: string; toStart: string }[];
  addedDays: number;
  endBefore: string | null;
  endAfter: string | null;
}

/**
 * Inserts the change-order items as a chain after the milestone's last task, rewires that
 * task's dependents onto the new chain and shifts every downstream task by the added days.
 * Pure: returns a new task list plus a diff for the UI preview.
 */
export function applyChangeOrder(
  tasks: TaskLite[],
  milestoneId: string,
  items: ScheduleItem[],
  opts: {
    capacityHoursPerDay?: number;
    changeOrderId?: string | null;
    newId?: (i: number) => string;
  } = {},
): SchedulePreview {
  const capacity = opts.capacityHoursPerDay ?? 6;
  const newId = opts.newId ?? ((i: number) => `preview-${i}`);
  const endBefore = projectEnd(tasks);

  const inMilestone = tasks.filter((t) => t.milestoneId === milestoneId);
  if (inMilestone.length === 0 || items.length === 0) {
    return { tasks, added: [], shifted: [], addedDays: 0, endBefore, endAfter: endBefore };
  }
  const anchor = inMilestone.reduce((a, b) => (taskEnd(b) >= taskEnd(a) ? b : a));

  const added: TaskLite[] = [];
  let cursor = taskEnd(anchor);
  let prev = anchor.id;
  items.forEach((item, i) => {
    const t: TaskLite = {
      id: newId(i),
      milestoneId,
      title: item.title,
      role: item.role,
      startDate: cursor,
      durationDays: Math.max(1, Math.ceil(item.hours / capacity)),
      dependsOn: prev,
      source: "change_order",
      changeOrderId: opts.changeOrderId ?? null,
    };
    added.push(t);
    cursor = taskEnd(t);
    prev = t.id;
  });
  const addedDays = added.reduce((s, t) => s + t.durationDays, 0);
  const lastNew = added[added.length - 1].id;

  // Everything that (transitively) waits on the anchor moves right by addedDays.
  const downstream = new Set<string>();
  let frontier = [anchor.id];
  while (frontier.length) {
    const next = tasks.filter(
      (t) => t.dependsOn !== null && frontier.includes(t.dependsOn) && !downstream.has(t.id),
    );
    next.forEach((t) => downstream.add(t.id));
    frontier = next.map((t) => t.id);
  }

  const shifted: SchedulePreview["shifted"] = [];
  const updated = tasks.map((t) => {
    if (!downstream.has(t.id)) return t;
    const toStart = addDays(t.startDate, addedDays);
    shifted.push({ id: t.id, title: t.title, fromStart: t.startDate, toStart });
    return { ...t, startDate: toStart, dependsOn: t.dependsOn === anchor.id ? lastNew : t.dependsOn };
  });

  const result = [...updated, ...added];
  return { tasks: result, added, shifted, addedDays, endBefore, endAfter: projectEnd(result) };
}
