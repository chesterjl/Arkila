// owner/cars/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AxiosConfig from "@/app/services/AxiosConfig";
import { API_ENDPOINTS } from "@/app/services/ApiEndpoint";
import RequireRole from "@/components/RequireRole";
import { ErrorNote, Field } from "@/components/Field";
import type { Car } from "@/lib/types";
import type { AxiosError } from "axios";
import CarFormModal from "@/components/CardFormModal";
import Link from "next/link";
import CarOwnerCard from "@/components/CarOwnerCard";

interface ApiErrorBody {
  success: false;
  message: string;
}

const VEHICLE_TYPES = ["sedan", "suv", "hatchback", "van", "pickup", "motorcycle", "other"] as const;
const FUEL_TYPES = ["gasoline", "diesel", "electric", "hybrid"] as const;

function MyCars() {
  const [cars, setCars] = useState<Car[] | null>(null);
  const [err, setErr] = useState("");
  const [editing, setEditing] = useState<Car | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [filters, setFilters] = useState({
    search: "",
    vehicleType: "",
    fuelType: "",
    location: "",
    seats: "",
  });

  const load = useCallback(async () => {
    setErr("");
    try {
      const { data } = await AxiosConfig.get(API_ENDPOINTS.GET_OWNER_CARS_LIST);
      setCars(data.cars || []);
    } catch (e) {
      const axiosErr = e as AxiosError<ApiErrorBody>;
      setErr(axiosErr.response?.data?.message || (e as Error).message || "Failed to load your cars.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleAvailability = async (car: Car) => {
    setErr("");
    setTogglingId(car._id);
    try {
      const fd = new FormData();
      fd.append("isAvailable", String(!car.isAvailable));
      const { data } = await AxiosConfig.put(API_ENDPOINTS.UPDATE_CAR(car._id), fd);
      setCars((prev) => (prev ? prev.map((c) => (c._id === car._id ? data.car : c)) : prev));
    } catch (e) {
      const axiosErr = e as AxiosError<ApiErrorBody>;
      setErr(axiosErr.response?.data?.message || (e as Error).message || "Failed to update availability.");
    } finally {
      setTogglingId(null);
    }
  };

  const filteredCars = useMemo(() => {
    if (!cars) return null;

    return cars.filter((car) => {
      if (
        filters.search &&
        !car.name.toLowerCase().includes(filters.search.trim().toLowerCase())
      ) {
        return false;
      }
      if (
        filters.vehicleType &&
        car.vehicleType?.toLowerCase() !== filters.vehicleType.toLowerCase()
      ) {
        return false;
      }
      if (
        filters.fuelType &&
        car.fuelType?.toLowerCase() !== filters.fuelType.toLowerCase()
      ) {
        return false;
      }
      if (
        filters.location &&
        !car.location.toLowerCase().includes(filters.location.trim().toLowerCase())
      ) {
        return false;
      }
      if (filters.seats && car.seats < Number(filters.seats)) {
        return false;
      }
      return true;
    });
  }, [cars, filters]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">My cars</h1>
        <Link href="/owner/verification" className="btn btn-primary">
            + List a car
        </Link>
      </div>

      <div className="panel">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Field label="Search by name">
            <input
              className="input"
              placeholder="e.g. Civic"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
          </Field>
          <Field label="Vehicle type">
            <select
              className="input"
              value={filters.vehicleType}
              onChange={(e) => setFilters({ ...filters, vehicleType: e.target.value })}
            >
              <option value="">Any</option>
              {VEHICLE_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label="Fuel type">
            <select
              className="input"
              value={filters.fuelType}
              onChange={(e) => setFilters({ ...filters, fuelType: e.target.value })}
            >
              <option value="">Any</option>
              {FUEL_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label="Location">
            <input
              className="input"
              placeholder="e.g. Sampaloc"
              value={filters.location}
              onChange={(e) => setFilters({ ...filters, location: e.target.value })}
            />
          </Field>
          <Field label="Min seats">
            <input
              type="number"
              min={1}
              className="input"
              value={filters.seats}
              onChange={(e) => setFilters({ ...filters, seats: e.target.value })}
            />
          </Field>
        </div>
      </div>

      <ErrorNote text={err} />

      {filteredCars === null ? (
        <p className="text-bay/60">Loading your cars...</p>
      ) : filteredCars.length === 0 ? (
        <p className="panel">No cars match these filters yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCars.map((car) => (
            <CarOwnerCard
              key={car._id}
              car={car}
              actionLabel="Manage"
              onAction={(selectedCar) => setEditing(selectedCar)}
              onToggleAvailability={toggleAvailability}
              togglingAvailability={togglingId === car._id}
            />
          ))}
        </div>
      )}

      {editing && (
        <CarFormModal
          car={editing}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            setCars((prev) => (prev ? prev.map((c) => (c._id === updated._id ? updated : c)) : prev));
            setEditing(null);
          }}
          onDeleted={(id) => {
            setCars((prev) => (prev ? prev.filter((c) => c._id !== id) : prev));
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

export default function Page() {
  return (
    <RequireRole role="owner">
      <MyCars />
    </RequireRole>
  );
}