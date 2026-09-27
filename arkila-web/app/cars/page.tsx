// cars/page.tsx
"use client";

import { Suspense, useEffect, useState, type ChangeEvent } from "react";
import { useSearchParams } from "next/navigation";
import AxiosConfig from "@/app/services/AxiosConfig";
import { API_ENDPOINTS } from "@/app/services/ApiEndpoint";
import { FUEL_TYPES, VEHICLE_TYPES, type Car } from "@/lib/types";
import { Field, ErrorNote } from "@/components/Field";
import CarCard from "@/components/CarCard";
import type { AxiosError, AxiosResponse } from "axios";

interface ApiErrorBody {
  success: false;
  message: string;
}

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

  useEffect(() => {
    const controller = new AbortController();
    setCars(null);
    setErr("");

    const fetchCars = async () => {
      try {
        const response: AxiosResponse = await AxiosConfig.get(API_ENDPOINTS.GET_CARS, { signal: controller.signal });

        if (response.status === 200) {
          const carsData: Car[] = response.data?.cars ?? response.data ?? [];
          setCars(carsData);
        }
      } catch (x) {
        if (!controller.signal.aborted) {
          const axiosErr = x as AxiosError<ApiErrorBody>;
          setErr(axiosErr.response?.data?.message ?? (x as Error).message ?? "Failed to load cars.");
          setCars([]);
        }
      }
    };

    fetchCars();
    return () => controller.abort();
  }, []);

  const filteredCars = (cars || []).filter((c) => {
    if (f.name && !c.name.toLowerCase().includes(f.name.trim().toLowerCase())) return false;
    if (f.location && !c.location.toLowerCase().includes(f.location.trim().toLowerCase())) return false;
    if (f.type && c.vehicleType !== f.type) return false;
    if (f.fuel && c.fuelType !== f.fuel) return false;
    if (f.seats && Number(c.seats) < Number(f.seats)) return false;
    if (f.maxPrice && c.rentalPrice > Number(f.maxPrice)) return false;
    return true;
  });

  const set = (k: keyof typeof f) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF((prev) => ({ ...prev, [k]: e.target.value }));

  const resetFilters = () => setF({ name: "", type: "", fuel: "", seats: "", location: "", maxPrice: "" });

  const select = (k: keyof typeof f, label: string, opts: readonly (string | number)[]) => (
    <Field label={label}>
      <select className="input" value={f[k]} onChange={set(k)}>
        <option value="">Any</option>
        {opts.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </Field>
  );

  return (
    <div className="grid gap-6 md:grid-cols-[16rem_1fr]">
      <aside className="panel h-fit space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Find a car</h1>
        </div>

        <Field label="Name">
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

        <Field label="Max seats">
          <input
            type="number"
            min={1}
            className="input"
            placeholder="e.g. 4"
            value={f.seats}
            onChange={set("seats")}
          />
        </Field>

        <Field label="Max price per day (₱)">
          <input
            type="number"
            min={0}
            step={100}
            className="input"
            placeholder="e.g. 2000"
            value={f.maxPrice}
            onChange={set("maxPrice")}
          />
        </Field>

        <button type="button" onClick={resetFilters} className="btn flex w-full items-center justify-center gap-2 border border-bay/20 hover:bg-bay/5">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.719 12A10.719 10.719 0 0 1 1.28 12h.838a9.916 9.916 0 1 0 1.373-5H8v1H2V2h1v4.2A10.71 10.71 0 0 1 22.719 12z" />
          </svg>
          <span>Reset all filters</span>
        </button>
      </aside>

      <section aria-live="polite">
        <ErrorNote text={err} />
        {cars === null ? (
          <p className="text-bay/60">Searching cars...</p>
        ) : filteredCars.length === 0 ? (
          <div className="panel">
            <h2 className="font-bold">No cars match these filters</h2>
            <p className="mt-1 text-sm text-bay/70">
              Try changing your search or resetting the filters.
            </p>
            <button type="button" onClick={resetFilters} className="btn btn-primary mt-4">
              Reset filters
            </button>
          </div>
        ) : (
          <>
            <p className="mb-3 text-sm text-bay/70">{filteredCars.length} available</p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredCars.map((c) => (
                <CarCard key={c._id} car={c} />
              ))}
            </div>
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