import { describe, expect, it } from "vitest";
import { emptyDailyLog, migrateLegacy, parseHealthBackup } from "./storage";
import {
  estimatedDeficit,
  planWeek,
  projectionAtWeek,
  rollingAverage,
} from "./projections";

describe("BFIT projections", () => {
  it("uses the canonical baseline and cut target", () => {
    expect(projectionAtWeek(0).weight).toBe(192.9);
    expect(projectionAtWeek(10).weight).toBe(181.4);
    expect(projectionAtWeek(20).weight).toBe(170);
    expect(planWeek("2026-07-24")).toBe(0);
    expect(planWeek("2026-08-07")).toBe(2);
  });

  it("calculates rolling averages only from populated values", () => {
    const first = { ...emptyDailyLog("2026-07-23"), weight: 194 };
    const second = { ...emptyDailyLog("2026-07-24"), weight: 192 };
    expect(
      rollingAverage(
        { [first.date]: first, [second.date]: second },
        "2026-07-24",
        "weight"
      )
    ).toBe(193);
  });

  it("labels calorie deficit math as an estimate", () => {
    const day = {
      ...emptyDailyLog("2026-07-24"),
      calories: 2100,
      estimatedActivityCalories: 400,
    };
    expect(estimatedDeficit(day, 2600)).toBe(900);
  });
});

describe("health data migration", () => {
  it("converts legacy 8-ounce water taps and daily values", () => {
    const migrated = migrateLegacy(
      JSON.stringify({
        days: {
          "2026-07-24": {
            water: 10,
            protein: 175,
            weight: 192.9,
            supps: { creatine: true },
          },
        },
      })
    );
    expect(migrated.days["2026-07-24"].waterOz).toBe(80);
    expect(migrated.days["2026-07-24"].protein).toBe(175);
    expect(migrated.days["2026-07-24"].supplements.creatine).toBe(true);
  });

  it("rejects malformed backups", () => {
    expect(() => parseHealthBackup('{"version":1}')).toThrow(
      "valid BFIT v2 backup"
    );
  });
});
