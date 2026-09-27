// owner/verification/page.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AxiosConfig from "@/app/services/AxiosConfig";
import { API_ENDPOINTS } from "@/app/services/ApiEndpoint";
import RequireRole from "@/components/RequireRole";
import { ErrorNote } from "@/components/Field";
import PendingListCar from "@/components/PendingListCar";
import type { Car } from "@/lib/types";
import type { AxiosError } from "axios";
import CarFormModal from "@/components/CardFormModal";
import CarOwnerCard from "@/components/CarOwnerCard";

interface ApiErrorBody {
  success: false;
  message: string;
}

function Verification() {
  const [cars, setCars] = useState<Car[] | null>(null);
  const [viewing, setViewing] = useState<Car | null>(null);
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    setErr("");
    try {
      const { data } = await AxiosConfig.get(API_ENDPOINTS.GET_OWNER_PENDING_CARS_LIST);
      setCars(data.cars || []);
    } catch (e) {
      const axiosErr = e as AxiosError<ApiErrorBody>;
      setErr(axiosErr.response?.data?.message || (e as Error).message || "Failed to load pending listings.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Pending verification</h1>
          <p className="text-sm text-bay/70">
            These listings are waiting on an admin to check the Certificate of Registration before they go public.
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-ghost" onClick={load}>Refresh</button>
          <button className="btn btn-primary" onClick={() => setCreating(true)}>
            + Request new car listing
          </button>
        </div>
      </div>

      <ErrorNote text={err} />

      {cars === null ? (
        <p className="text-bay/60">Loading...</p>
      ) : cars.length === 0 ? (
        <p className="panel">
          Nothing pending right now. Once a car is approved it moves to{" "}
          <Link href="/owner/cars" className="font-semibold text-teal underline">My cars</Link>.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cars.map((car) => (
            <CarOwnerCard
              key={car._id}
              car={car}
              showDescription={false}
              actionLabel="View submission"
              onAction={(selectedCar) => setViewing(selectedCar)}
            />
          ))}
        </div>
      )}

      {viewing && <PendingListCar car={viewing} onClose={() => setViewing(null)} />}
      
      {creating && (
        <CarFormModal
          onClose={() => setCreating(false)}
          onSaved={(newCar) => {
            setCars((prev) => (prev ? [newCar, ...prev] : [newCar]));
            setCreating(false);
          }}
        />
      )}
    </div>
  );
}

export default function Page() {
  return (
    <RequireRole role="owner">
      <Verification />
    </RequireRole>
  );
}