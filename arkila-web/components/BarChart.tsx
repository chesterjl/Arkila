import type { Point } from "@/lib/types";

interface BarChartProps {
  data?: Point[];
  /** Fixed top of the scale (e.g. 100 for 0-100 scores). Defaults to a rounded-up largest value. */
  max?: number;
}

// Round a value up to a "nice" axis top: 1, 2, 5, 10, 20, 50, 100...
const niceCeil = (v: number) => {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
};

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

export default function BarChart({ data = [], max }: BarChartProps) {
  const points = Array.isArray(data) ? data : [];

  if (points.length === 0) {
    return <p className="text-sm text-gray-500">No data available.</p>;
  }

  const top = max ?? niceCeil(Math.max(...points.map((d) => d.value), 1));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => ({ pct: f * 100, value: fmt(top * f) }));

  return (
    <div className="flex gap-2" role="img" aria-label="Predicted demand bar chart">
      {/* Y axis labels (mt-6 matches the headroom reserved above the bars) */}
      <div className="relative mt-6 h-56 w-8 shrink-0" aria-hidden="true">
        {ticks.map((t) => (
          <span
            key={t.pct}
            className="absolute right-0 -translate-y-1/2 text-[11px] tabular-nums text-bay/50"
            style={{ bottom: `${t.pct}%` }}
          >
            {t.value}
          </span>
        ))}
      </div>

      {/* Scrolls sideways only if there are more groups than fit */}
      <div className="min-w-0 flex-1 overflow-x-auto">
        <div className="relative flex w-max min-w-full items-start justify-center gap-6 pt-6">
          {/* Gridlines behind the bars */}
          <div className="pointer-events-none absolute inset-x-0 top-6 h-56" aria-hidden="true">
            {ticks.map((t) => (
              <div
                key={t.pct}
                className={`absolute inset-x-0 border-t ${
                  t.pct === 0 ? "border-bay/25" : "border-dashed border-bay/10"
                }`}
                style={{ bottom: `${t.pct}%` }}
              />
            ))}
          </div>

          {points.map((d) => {
            const pct = Math.min(100, Math.max(0, (d.value / top) * 100));

            return (
              <div key={d.label} className="relative z-10 flex w-24 shrink-0 flex-col" title={`${d.label}: ${d.value}`}>
                <div className="relative h-56">
                  <div
                    className="absolute bottom-0 left-1/2 w-14 -translate-x-1/2 rounded-t-md bg-teal transition-all duration-500 hover:bg-teal/80"
                    style={{ height: `${pct}%` }}
                  />
                  <span
                    className="absolute left-1/2 -translate-x-1/2 rounded-full bg-bay px-2 py-0.5 text-[11px] font-semibold tabular-nums text-white"
                    style={{ bottom: `calc(${pct}% + 6px)` }}
                  >
                    {d.value}
                  </span>
                </div>

                <span className="mt-2 truncate text-center text-xs font-medium capitalize text-bay/80">
                  {d.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}