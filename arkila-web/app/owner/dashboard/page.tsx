// owner/dashboard/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import AxiosConfig from "@/app/services/AxiosConfig";
import { API_ENDPOINTS } from "@/app/services/ApiEndpoint";
import BarChart from "@/components/BarChart";
import RequireRole from "@/components/RequireRole";
import OwnerDemandPrediction from "@/components/OwnerDemandPrediction";
import { ErrorNote } from "@/components/Field";
import type { Booking, Car } from "@/lib/types";
import type { AxiosError, AxiosResponse } from "axios";
import { peso } from "@/lib/booking";

interface ApiErrorBody {
  success: false;
  message: string;
}

type DemandCategory = "type" | "fuel" | "seats" | "location";
type DemandLevel = "High" | "Medium" | "Low";

interface Forecast {
  carId: string;
  demandLevel: DemandLevel;
  score: number; // 0-100, from the Gradient Boosting classifier
  rank: number;
}

const TABS: [DemandCategory, string][] = [
  ["type", "Vehicle type"],
  ["fuel", "Fuel type"],
  ["seats", "Seats"],
  ["location", "Location"],
];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const GROUP_KEY: Record<DemandCategory, (c: Car) => string> = {
  type: (c) => c.vehicleType,
  fuel: (c) => c.fuelType,
  seats: (c) => `${c.seats} seats`,
  location: (c) => c.location,
};

function Dashboard() {
  const [cars, setCars] = useState<Car[]>([]);
  const [reqs, setReqs] = useState<Booking[]>([]);
  const [tab, setTab] = useState<DemandCategory>("type");
  const [loading, setLoading] = useState<boolean>(true);

  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [forecasts, setForecasts] = useState<Forecast[]>([]);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [forecastErr, setForecastErr] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [carsRes, reqsRes]: [AxiosResponse, AxiosResponse] =
          await Promise.all([
            AxiosConfig.get(API_ENDPOINTS.GET_OWNER_CARS_LIST),
            AxiosConfig.get(API_ENDPOINTS.GET_OWNER_BOOKING_HISTORY),
          ]);

        if (carsRes.status === 200) {
          setCars(carsRes.data.cars || carsRes.data || []);
        }
        if (reqsRes.status === 200) {
          setReqs(reqsRes.data.bookings || reqsRes.data || []);
        }
      } catch (err) {
        console.error("Failed to load owner dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Only approved listings can be booked, so only those get a forecast.
  const approvedCars = useMemo(
    () => cars.filter((c) => c.listingStatus === "approved"),
    [cars]
  );

  // Ask the ML service (via the Node backend) to score every approved car for the chosen month.
  useEffect(() => {
    if (loading) return;
    if (approvedCars.length === 0) {
      setForecasts([]);
      return;
    }

    let isMounted = true;
    setForecastLoading(true);
    setForecastErr("");

    AxiosConfig.post<{ success: true; forecasts: Forecast[] }>(
      API_ENDPOINTS.OWNER_FORECAST,
      { month }
    )
      .then(({ data }) => {
        if (isMounted) setForecasts(data.forecasts || []);
      })
      .catch((x) => {
        if (!isMounted) return;
        const axiosErr = x as AxiosError<ApiErrorBody>;
        setForecasts([]);
        setForecastErr(
          axiosErr.response?.data?.message ||
            (x as Error).message ||
            "Couldn't load demand predictions."
        );
      })
      .finally(() => {
        if (isMounted) setForecastLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [loading, approvedCars.length, month]);

  // Compute stats based on schema fields
  const income = reqs
    .filter((b) => b.status === "completed")
    .reduce((s, b) => s + (b.totalPrice || 0), 0);

  const pendingPayments = reqs
    .filter(
      (b) =>
        b.downPayment?.status === "pending" ||
        b.balancePayment?.status === "pending"
    )
    .reduce((s, b) => {
      let sum = s;
      if (b.downPayment?.status === "pending") sum += b.downPayment.amount || 0;
      if (b.balancePayment?.status === "pending") sum += b.balancePayment.amount || 0;
      return sum;
    }, 0);

  const stats: [string, string][] = [
    ["Live Cars", String(approvedCars.length)],
    ["Requests to review", String(reqs.filter((b) => b.status === "pending").length)],
    ["Completed revenue", peso(income)],
    ["Pending payments", peso(pendingPayments)],
  ];

  // Average model demand score (0-100) per group of the owner's own cars.
  const chartData = useMemo(() => {
    const byCar = new Map(forecasts.map((f) => [f.carId, f]));
    const groups: Record<string, { sum: number; n: number }> = {};

    for (const car of approvedCars) {
      const f = byCar.get(car._id);
      if (!f) continue;
      const key = GROUP_KEY[tab](car);
      groups[key] = groups[key] || { sum: 0, n: 0 };
      groups[key].sum += f.score;
      groups[key].n += 1;
    }

    return Object.entries(groups)
      .map(([label, { sum, n }]) => ({
        label: n > 1 ? `${label} ×${n}` : label,
        value: Math.round(sum / n),
      }))
      .sort((a, b) => b.value - a.value);
  }, [forecasts, approvedCars, tab]);

  const levelCounts = useMemo(() => {
    const counts: Record<DemandLevel, number> = { High: 0, Medium: 0, Low: 0 };
    forecasts.forEach((f) => {
      counts[f.demandLevel] += 1;
    });
    return counts;
  }, [forecasts]);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Owner dashboard</h1>
      <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map(([k, v]) => (
          <div key={k} className="panel">
            <dt className="text-sm text-bay/70">{k}</dt>
            <dd className="mt-1 font-display text-3xl font-extrabold">{v}</dd>
          </div>
        ))}
      </dl>

      {/* Per-vehicle demand prediction (Gradient Boosting demand classifier) */}
      {!loading && <OwnerDemandPrediction cars={cars} />}

      {/* Demand chart: real model output for the owner's own cars */}
      <section className="panel space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">
              Predicted demand for {MONTHS[month - 1]}
            </h2>
            <p className="mt-1 text-sm text-bay/70">
              Each of your approved cars is scored by the Gradient Boosting demand
              model (0 to 100). Bars show the average score per group.
            </p>
          </div>
          <select
            className="input w-40"
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            aria-label="Forecast month"
          >
            {MONTHS.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <div role="tablist" className="flex flex-wrap gap-1">
          {TABS.map(([k, t]) => (
            <button
              key={k}
              role="tab"
              aria-selected={tab === k}
              onClick={() => setTab(k)}
              className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                tab === k ? "bg-bay text-white" : "hover:bg-bay/5"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <ErrorNote text={forecastErr} />

        <div>
          {loading || forecastLoading ? (
            <p className="text-bay/60">Running the demand model...</p>
          ) : approvedCars.length === 0 ? (
            <p className="rounded-md bg-mist p-3 text-sm text-bay/70">
              You don&apos;t have any approved listings yet. Once a car is approved,
              its predicted demand will appear here.
            </p>
          ) : chartData.length === 0 && !forecastErr ? (
            <p className="text-bay/60">No predictions available.</p>
          ) : (
            <BarChart data={chartData} max={100} />
          )}
        </div>

        {forecasts.length > 0 && (
          <p className="text-sm text-bay/70">
            Your {forecasts.length} live {forecasts.length === 1 ? "car is" : "cars are"} predicted as{" "}
            <strong>{levelCounts.High} high</strong>,{" "}
            <strong>{levelCounts.Medium} medium</strong>, and{" "}
            <strong>{levelCounts.Low} low</strong> demand in {MONTHS[month - 1]}.
          </p>
        )}

        <p className="text-xs text-bay/60">
          Predictions come from the Gradient Boosting classifier using vehicle type,
          fuel type, seats, location, price, and month. They support decision-making
          and do not guarantee future demand.
        </p>
      </section>
    </div>
  );
}

export default function Page() {
  return (
    <RequireRole role="owner">
      <Dashboard />
    </RequireRole>
  );
}