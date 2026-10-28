"use client";

import clsx from "clsx";
import { Activity } from "lucide-react";
import type { EventDTO } from "@/lib/api-types";
import { CopyId, Drawer, EmptyState } from "../ui";
import { formatDateTime } from "../useProject";

const DOT: Record<EventDTO["level"], string> = {
  info: "bg-info",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
};

export function ActivityDrawer({ open, onClose, events }: { open: boolean; onClose: () => void; events: EventDTO[] }) {
  return (
    <Drawer open={open} onClose={onClose} title="Activity">
      {events.length === 0 ? (
        <EmptyState icon={<Activity size={40} />} title="No activity yet">
          Events appear here as you analyze requests, send invoices and pay the team.
        </EmptyState>
      ) : (
        <ol className="relative ml-1 border-l border-hairline">
          {events.map((e) => (
            <li key={e.id} className="relative pb-5 pl-5 last:pb-0">
              <span className={clsx("absolute top-1.5 -left-1 h-2 w-2 rounded-full", DOT[e.level])} aria-hidden />
              <div className="t-body-sm">{e.message}</div>
              <div className="t-body-sm mt-0.5 flex flex-wrap items-center gap-x-2 text-ink-muted">
                <time dateTime={e.createdAt}>{formatDateTime(e.createdAt)}</time>
                {e.paypalRef && <CopyId value={e.paypalRef} max={24} />}
              </div>
            </li>
          ))}
        </ol>
      )}
    </Drawer>
  );
}
