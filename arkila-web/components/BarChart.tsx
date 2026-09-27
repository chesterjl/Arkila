import type { Point } from "@/lib/types";

export default function BarChart({ data = [] }: { data?: Point[] }) {
  // Ensure data is an array before attempting to map over it
  const points = Array.isArray(data) ? data : [];
  const max = Math.max(...points.map((d) => d.value), 1);

  if (points.length === 0) {
    return <p className="text-sm text-gray-500">No data available.</p>;
  }

  return (
    <ul className="space-y-2.5" aria-label="Predicted rentals">
      {points.map((d) => (
        <li key={d.label} className="grid grid-cols-[6.5rem_1fr_2.5rem] items-center gap-3 text-sm">
          <span className="truncate">{d.label}</span>
          <div className="h-3 rounded-sm bg-bay/10">
            <div className="h-3 rounded-sm bg-teal" style={{ width: `${(d.value / max) * 100}%` }} />
          </div>
          <span className="text-right tabular-nums">{d.value}</span>
        </li>
      ))}
    </ul>
  );
}