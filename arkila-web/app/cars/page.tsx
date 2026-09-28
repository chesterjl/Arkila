// cars/page.tsx
"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import AxiosConfig from "@/app/services/AxiosConfig";
import { API_ENDPOINTS } from "@/app/services/ApiEndpoint";
import {
  FUEL_TYPES,
  VEHICLE_TYPES,
  type Car,
} from "@/lib/types";
import { Field, ErrorNote } from "@/components/Field";
import CarCard from "@/components/CarCard";
import type { AxiosError, AxiosResponse } from "axios";

interface ApiErrorBody {
  success: false;
  message: string;
}

type DemandLevel = "High" | "Medium" | "Low";

interface RecommendCarsResponse {
  success: true;
  available: boolean;
  recommendations: { carId: string; demandLevel: DemandLevel; score: number; rank: number }[];
}

const today = () => new Date().toISOString().split("T")[0];

function Browse() {
  const sp = useSearchParams();
  const [f, setF] = useState({
    name: sp.get("name") ?? "",
    type: "",
    fuel: "",
    seats: "",
    location: sp.get("location") ?? "",
    maxPrice: "",
  });

  const [cars, setCars] = useState<Car[] | null>(null);
  const [err, setErr] = useState("");

  const [aiMode, setAiMode] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAvailable, setAiAvailable] = useState(true);
  const [aiScores, setAiScores] = useState<Record<string, { level: DemandLevel; score: number }>>({});

  useEffect(() => {
    let isMounted = true;
    setCars(null);
    setErr("");
    setAiScores({});

    const fetchCars = async () => {
      try {
        const response: AxiosResponse = await AxiosConfig.get(
          API_ENDPOINTS.GET_CARS
        );

        if (isMounted && response.status === 200) {
          const carsData: Car[] = response.data.cars || response.data || [];
          setCars(carsData);
        }
      } catch (x) {
        if (isMounted) {
          const axiosErr = x as AxiosError<ApiErrorBody>;
          setErr(
            axiosErr.response?.data?.message ||
              (x as Error).message ||
              "Failed to load cars."
          );
          setCars([]);
        }
      }
    };

    fetchCars();

    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch AI demand scores once, the first time the toggle is switched on
  // for the current car list. Any failure (ML service offline, network
  // error, etc.) just flips aiAvailable to false so the grid quietly falls
  // back to standard ordering instead of breaking the page.
  useEffect(() => {
    if (!aiMode || !cars || cars.length === 0) return;
    if (Object.keys(aiScores).length > 0) return;

    let isMounted = true;
    setAiLoading(true);

    AxiosConfig.post<RecommendCarsResponse>(API_ENDPOINTS.RECOMMEND_CARS, {
      carIds: cars.map((c) => c._id),
    })
      .then(({ data }) => {
        if (!isMounted) return;
        if (!data.available || !Array.isArray(data.recommendations) || data.recommendations.length === 0) {
          setAiAvailable(false);
          return;
        }
        const map: Record<string, { level: DemandLevel; score: number }> = {};
        for (const r of data.recommendations) {
          map[r.carId] = { level: r.demandLevel, score: r.score };
        }
        setAiScores(map);
        setAiAvailable(true);
      })
      .catch(() => {
        if (isMounted) setAiAvailable(false);
      })
      .finally(() => {
        if (isMounted) setAiLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [aiMode, cars, aiScores]);

  // Compute filtered cars based on state 'f'
  const filteredCars = (cars || []).filter((c) => {
    if (f.name && !c.name.toLowerCase().includes(f.name.trim().toLowerCase())) return false;
    if (f.location && !c.location.toLowerCase().includes(f.location.trim().toLowerCase())) return false;
    if (f.type && c.vehicleType !== f.type) return false;
    if (f.fuel && c.fuelType !== f.fuel) return false;
    if (f.seats && Number(c.seats) < Number(f.seats)) return false;
    if (f.maxPrice && c.rentalPrice > Number(f.maxPrice)) return false;
    return true;
  });

  // Only re-rank when AI mode is on AND the service actually returned
  // scores -- otherwise keep the normal, unmodified filter order.
  const displayCars = useMemo(() => {
    if (!aiMode || !aiAvailable || Object.keys(aiScores).length === 0) return filteredCars;
    return [...filteredCars].sort(
      (a, b) => (aiScores[b._id]?.score ?? -1) - (aiScores[a._id]?.score ?? -1)
    );
  }, [filteredCars, aiMode, aiAvailable, aiScores]);

  const set =
    (k: keyof typeof f) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setF({ ...f, [k]: e.target.value });

  const select = (
    k: keyof typeof f,
    label: string,
    opts: readonly (string | number)[]
  ) => (
    <Field label={label}>
      <select className="input" value={f[k]} onChange={set(k)}>
        <option value="">Any</option>
        {opts.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </Field>
  );

  return (
    <div className="grid gap-6 md:grid-cols-[16rem_1fr]">
      <aside className="panel h-fit space-y-4">
        <h1 className="text-xl font-bold">Find a car</h1>
        <Field label="Vehicle Name">
          <input
            type="text"
            className="input"
            placeholder="e.g. Honda Civic"
            value={f.name}
            onChange={set("name")}
          />
        </Field>

        <Field label="Location">
          <input
            type="text"
            className="input"
            placeholder="e.g. Sampaloc"
            value={f.location}
            onChange={set("location")}
          />
        </Field>

        {select("type", "Vehicle type", VEHICLE_TYPES)}
        {select("fuel", "Fuel type", FUEL_TYPES)}
        <input
          type="text"
          className="input"
          placeholder="e.g. 4 (seater)"
          value={f.seats}
          onChange={set("seats")}
        />  
        <Field label="Max price per day (₱)">
          <input
            type="number"
            min={0}
            step={100}
            className="input"
            value={f.maxPrice}
            onChange={set("maxPrice")}
          />
        </Field>
      </aside>

      <section aria-live="polite">
        <ErrorNote text={err} />

        {cars === null ? (
          <p className="text-bay/60">Searching cars...</p>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-bay/70">{displayCars.length} available</p>
              <button
                type="button"
                onClick={() => setAiMode((m) => !m)}
                disabled={aiLoading}
                className={`btn text-xs ${
                  aiMode ? "bg-jeep text-bay" : "btn-ghost"
                }`}
              >
                {aiLoading ? "Ranking..." : aiMode ? "★ AI Recommended: On" : "★ AI Recommended"}
              </button>
            </div>

            {aiMode && !aiAvailable && (
              <p className="mb-3 text-xs text-bay/60">
                AI recommendations aren&apos;t available right now — showing the standard order.
              </p>
            )}

            {displayCars.length === 0 ? (
              <div className="panel">
                <h2 className="font-bold">No cars match these filters</h2>
                <p className="mt-1 text-sm text-bay/70">
                  Widen the dates, raise the price limit, or clear the vehicle type.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {displayCars.map((c) => (
                  <div key={c._id} className="relative">
                    {aiMode && aiAvailable && aiScores[c._id]?.level === "High" && (
                      <span className="absolute left-2 top-2 z-10 rounded-full bg-jeep px-2 py-0.5 text-xs font-bold text-bay shadow">
                        ★ AI High Demand
                      </span>
                    )}
                    <CarCard car={c} />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

export default function CarsPage() {
  return (
    <Suspense>
      <Browse />
    </Suspense>
  );
}