// app/admin/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AxiosConfig from "@/app/services/AxiosConfig";
import { API_ENDPOINTS } from "@/app/services/ApiEndpoint";
import RequireRole from "@/components/RequireRole";
import { ErrorNote } from "@/components/Field";
import type { Car, User } from "@/lib/types";
import type { AxiosError, AxiosResponse } from "axios";

interface ApiErrorBody {
  success: false;
  message: string;
}

function Dashboard() {
  const [users, setUsers] = useState<User[] | null>(null);
  const [cars, setCars] = useState<Car[] | null>(null);
  const [pendingOwners, setPendingOwners] = useState<User[] | null>(null);
  const [pendingCars, setPendingCars] = useState<Car[] | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const [usersRes, carsRes, pendingOwnersRes, pendingCarsRes]: AxiosResponse[] = await Promise.all([
          AxiosConfig.get(API_ENDPOINTS.GET_ADMIN_USERS()),
          AxiosConfig.get(API_ENDPOINTS.GET_ADMIN_CARS_LIST),
          AxiosConfig.get(API_ENDPOINTS.GET_ADMIN_PENDING_OWNERS),
          AxiosConfig.get(API_ENDPOINTS.GET_ADMIN_PENDING_CARS_LIST),
        ]);
        
        if (!isMounted) return;
        setUsers(usersRes.data.users || []);
        setCars(carsRes.data.cars || []);
        setPendingOwners(pendingOwnersRes.data.owners || []);
        setPendingCars(pendingCarsRes.data.cars || []);
      } catch (e) {
        if (!isMounted) return;
        const axiosErr = e as AxiosError<ApiErrorBody>;
        setErr(axiosErr.response?.data?.message || (e as Error).message || "Failed to load dashboard data.");
      }
    };

    load();
    return () => {
      isMounted = false;
    };
  }, []);

  const loading = users === null || cars === null;
  const totalCustomers = users?.filter((u) => u.role === "customer").length ?? 0;
  const totalOwners = users?.filter((u) => u.role === "owner").length ?? 0;
  const totalCars = cars?.length ?? 0;

  const stats: [string, string][] = [
    ["Total customers", loading ? "..." : String(totalCustomers)],
    ["Total owners", loading ? "..." : String(totalOwners)],
    ["Total cars", loading ? "..." : String(totalCars)],
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin dashboard</h1>
      <ErrorNote text={err} />

      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map(([k, v]) => (
          <div key={k} className="panel">
            <dt className="text-sm text-bay/70">{k}</dt>
            <dd className="mt-1 font-display text-3xl font-extrabold">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/admin/owner" className="panel flex items-center justify-between gap-3 transition hover:shadow-md">
          <div>
            <h2 className="font-bold">Owner verifications</h2>
            <p className="mt-1 text-sm text-bay/70">
              {pendingOwners === null
                ? "Loading..."
                : pendingOwners.length === 0
                ? "Nothing waiting on review."
                : `${pendingOwners.length} account${pendingOwners.length === 1 ? "" : "s"} waiting for review.`}
            </p>
          </div>
          <span className="shrink-0 font-semibold text-teal underline">Review</span>
        </Link>

        <Link href="/admin/cars" className="panel flex items-center justify-between gap-3 transition hover:shadow-md">
          <div>
            <h2 className="font-bold">Car listing verifications</h2>
            <p className="mt-1 text-sm text-bay/70">
              {pendingCars === null
                ? "Loading..."
                : pendingCars.length === 0
                ? "Nothing waiting on review."
                : `${pendingCars.length} listing${pendingCars.length === 1 ? "" : "s"} waiting for review.`}
            </p>
          </div>
          <span className="shrink-0 font-semibold text-teal underline">Review</span>
        </Link>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <RequireRole role="admin">
      <Dashboard />
    </RequireRole>
  );
}