import { describe, expect, it } from "vitest";
import { addDays, applyChangeOrder, projectEnd } from "@/lib/domain/schedule";
import type { TaskLite } from "@/lib/domain/types";

const t = (id: string, milestoneId: string, startDate: string, durationDays: number, dependsOn: string | null): TaskLite => ({
  id,
  milestoneId,
  title: id,
  role: "dev",
  startDate,
  durationDays,
  dependsOn,
  source: "seed",
  changeOrderId: null,
});

const base = [
  t("build", "m2", "2026-11-02", 5, null),
  t("emails", "m2", "2026-11-07", 2, "build"),
  t("qa", "m3", "2026-11-09", 3, "emails"),
  t("launch", "m3", "2026-11-12", 1, "qa"),
];

describe("schedule", () => {
  it("adds days across month ends", () => {
    expect(addDays("2026-11-29", 3)).toBe("2026-12-02");
  });

  it("inserts a chain after the milestone and shifts dependents", () => {
    const r = applyChangeOrder(
      base,
      "m2",
      [
        { title: "Gift cards", role: "dev", hours: 10 },
        { title: "Allergens", role: "dev", hours: 6 },
      ],
      { changeOrderId: "co1", newId: (i) => `n${i}` },
    );
    expect(r.addedDays).toBe(3); // ceil(10/6)=2 + ceil(6/6)=1
    expect(r.added.map((a) => [a.id, a.startDate, a.dependsOn])).toEqual([
      ["n0", "2026-11-09", "emails"],
      ["n1", "2026-11-11", "n0"],
    ]);
    const qa = r.tasks.find((x) => x.id === "qa")!;
    expect(qa.startDate).toBe("2026-11-12");
    expect(qa.dependsOn).toBe("n1");
    expect(r.tasks.find((x) => x.id === "launch")!.startDate).toBe("2026-11-15");
    expect(r.endBefore).toBe("2026-11-13");
    expect(r.endAfter).toBe("2026-11-16");
    expect(r.shifted.map((s) => s.id)).toEqual(["qa", "launch"]);
  });

  it("is a no-op with no items", () => {
    const r = applyChangeOrder(base, "m2", []);
    expect(r.tasks).toBe(base);
    expect(r.addedDays).toBe(0);
  });

  it("computes the project end", () => {
    expect(projectEnd(base)).toBe("2026-11-13");
    expect(projectEnd([])).toBeNull();
  });
});
