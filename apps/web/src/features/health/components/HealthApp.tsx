"use client";

import { faFire, faHeart, faHeartPulse, faLocationDot, faMoon, faShoePrints } from "@fortawesome/free-solid-svg-icons";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { isoDate } from "../../../lib/dates";
import {
  daysInRange,
  fmtDistance,
  fmtDuration,
  fmtNumber,
  HEALTH_GOALS,
  HEALTH_SPAN,
  healthRatio as ratio,
  metricsRecorded,
  rangeForDay,
  rangeMeta,
  SOURCE_LABEL,
  summarizeHealth,
  type HealthRange,
} from "../format";
import { useHealthDays } from "../queries";
import HealthActions from "./HealthActions";
import RangeFilter from "./RangeFilter";
import HealthSources from "./HealthSources";
import SetupCard from "./SetupCard";
import StatTile from "./StatTile";
import WeeklyRing from "./WeeklyRing";

const SECTION_LABEL = "text-[13px] font-semibold text-ink";

export default function HealthApp() {
  const { days, isPending, isError } = useHealthDays(HEALTH_SPAN);
  // `?d=YYYY-MM-DD` (the link a health note carries) opens that day.
  const day = useSearchParams().get("d");
  const [range, setRange] = useState<HealthRange>(() => rangeForDay(day, isoDate()));
  const today = isoDate();
  const meta = rangeMeta(range, today);
  // Days with any reading get a dot in the calendar.
  const daysWithData = useMemo(
    () => days.filter((d) => [d.steps, d.distance_m, d.active_kcal, d.resting_hr, d.hr_min, d.hr_max, d.sleep_minutes].some((v) => v !== null)).map((d) => d.day),
    [days],
  );
  const inRange = useMemo(() => daysInRange(days, range, today), [days, range, today]);
  const sum = useMemo(() => summarizeHealth(inRange), [inRange]);
  const multi = meta.days > 1;
  const latest = days[0];
  const syncedAt = latest ? new Date(latest.synced_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "";
  const goal = HEALTH_GOALS.steps * meta.days;
  // Bars run oldest → newest and show every day of the range, even the empty ones.
  const bars = useMemo(() => {
    const byDay = new Map(inRange.map((d) => [d.day, d]));
    return Array.from({ length: meta.days }, (_, i) => {
      const d = new Date(`${today}T12:00:00`);
      d.setDate(d.getDate() - (meta.days - 1 - i));
      const iso = isoDate(d);
      return { day: iso, steps: byDay.get(iso)?.steps ?? null };
    });
  }, [inRange, meta.days, today]);

  return (
    <div className="mx-auto w-full max-w-[1120px]">
      <header className="mb-[18px] flex flex-col gap-1">
        <h1 className="m-0 text-[28px] leading-tight font-semibold tracking-[-0.02em]">Health</h1>
        <p className="text-[14px] text-ink-3">
          {latest ? `Synced from ${SOURCE_LABEL[latest.source]} at ${syncedAt}` : "Activity, sleep and heart rate from your phone"}
        </p>
      </header>

      {isError ? (
        <p className="rounded-r3 border bg-paper p-4 text-[14px] text-critical" role="alert">
          Couldn’t load your health data. Please try again.
        </p>
      ) : isPending ? (
        <p className="p-6 text-[13px] text-ink-3">Loading health…</p>
      ) : !latest ? (
        <SetupCard />
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <RangeFilter
              value={range}
              onChange={setRange}
              today={today}
              daysWithData={daysWithData}
              count={multi ? sum.recorded : metricsRecorded(sum)}
              pills={false}
            />
            <HealthActions range={range} />
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,340px)_1fr]">
            <section className="rounded-r4 border bg-paper p-5" aria-label={meta.label}>
              <WeeklyRing
                fraction={ratio(sum.steps ?? 0, goal)}
                label={multi ? `Steps, ${meta.label}` : "Steps"}
                detail={`${fmtNumber(sum.steps ?? 0)} of ${fmtNumber(goal)}`}
              />
              {multi && (
                <ul className="mt-5 flex h-[72px] items-end gap-1" aria-label="Steps per day">
                  {bars.map((d) => (
                    <li
                      key={d.day}
                      className="flex h-full min-w-0 flex-1 flex-col justify-end"
                      title={`${d.day}: ${fmtNumber(d.steps ?? 0)} steps`}
                    >
                      <span
                        className={`block min-h-1 rounded-pill ${d.steps === null ? "bg-hover" : "bg-ink"}`}
                        style={{ height: `${Math.max(ratio(d.steps ?? 0, HEALTH_GOALS.steps) * 100, 4)}%` }}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section aria-label={`${meta.label} totals`}>
              <p className={`${SECTION_LABEL} mb-2`}>
                {meta.label}
                {multi && ` · ${sum.recorded} ${sum.recorded === 1 ? "day" : "days"} with data`}
              </p>
              {sum.recorded === 0 ? (
                <p className="ap-none rounded-r3 border bg-paper p-5 text-[14px] text-ink-3">
                  Nothing was recorded {multi ? "in this period" : meta.label === "Today" || meta.label === "Yesterday" ? meta.label.toLowerCase() : `on ${meta.label}`}
                  {meta.label === "Today" ? " yet" : ""}. Sync in the phone app, or pick another day.
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <StatTile
                    href={`/dashboard/health/steps?range=${range}`}
                    icon={faShoePrints}
                    label="Steps"
                    value={sum.steps === null ? null : fmtNumber(sum.steps)}
                    note={
                      multi && sum.stepsAvg !== null
                        ? `${fmtNumber(sum.stepsAvg)} a day on average`
                        : `Goal ${fmtNumber(HEALTH_GOALS.steps)}`
                    }
                    fill={ratio(multi ? (sum.stepsAvg ?? 0) : (sum.steps ?? 0), HEALTH_GOALS.steps)}
                  />
                  <StatTile
                    href={`/dashboard/health/sleep?range=${range}`}
                    icon={faMoon}
                    label={multi ? "Sleep, average" : "Sleep"}
                    value={sum.sleepAvg === null ? null : fmtDuration(sum.sleepAvg)}
                    note={`Goal ${fmtDuration(HEALTH_GOALS.sleepMinutes)}`}
                    fill={ratio(sum.sleepAvg ?? 0, HEALTH_GOALS.sleepMinutes)}
                  />
                  <StatTile
                    href={`/dashboard/health/distance?range=${range}`}
                    icon={faLocationDot}
                    label="Distance"
                    value={sum.distance === null ? null : fmtDistance(sum.distance)}
                  />
                  <StatTile
                    href={`/dashboard/health/energy?range=${range}`}
                    icon={faFire}
                    label="Active energy"
                    value={sum.activeKcal === null ? null : `${fmtNumber(sum.activeKcal)} kcal`}
                  />
                  <StatTile
                    href={`/dashboard/health/heart?range=${range}`}
                    icon={faHeart}
                    label="Heart rate"
                    value={sum.hrMin === null || sum.hrMax === null ? null : `${sum.hrMin}–${sum.hrMax} bpm`}
                  />
                  <StatTile
                    href={`/dashboard/health/resting?range=${range}`}
                    icon={faHeartPulse}
                    label={multi ? "Resting heart rate, average" : "Resting heart rate"}
                    value={sum.restingAvg === null ? null : `${sum.restingAvg} bpm`}
                  />
                </div>
              )}
            </section>
          </div>

          <section className="mt-8" aria-label="Sources">
            <h2 className="m-0 mb-2 flex items-baseline gap-2 text-[15px] font-semibold">
              Sources <small className="text-[13px] font-normal text-ink-3">Connected from the phone app</small>
            </h2>
            <HealthSources days={days} />
          </section>
        </>
      )}
    </div>
  );
}
