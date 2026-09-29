// app/admin/dashboard/page.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import AxiosConfig from "@/app/services/AxiosConfig";
import { API_ENDPOINTS } from "@/app/services/ApiEndpoint";
import RequireRole from "@/components/RequireRole";
import { ErrorNote } from "@/components/Field";
import { peso, DEFAULT_SERVICE_FEE_PCT } from "@/lib/booking";
import type { AdminStats } from "@/lib/types";
import type { AxiosError, AxiosResponse } from "axios";

interface ApiErrorBody {
  success: false;
  message: string;
}

function Dashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [err, setErr] = useState("");
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res: AxiosResponse = await AxiosConfig.get(API_ENDPOINTS.ADMIN_STATS);
      setStats(res.data.stats);
    } catch (e) {
      const axiosErr = e as AxiosError<ApiErrorBody>;
      setErr(axiosErr.response?.data?.message || (e as Error).message || "Failed to load dashboard data.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const syncPayouts = async () => {
    setSyncing(true);
    try {
      const res: AxiosResponse = await AxiosConfig.post(API_ENDPOINTS.RELEASE_PENDING_PAYOUTS);
      toast.success(res.data.message || "Payouts synced");
      await load();
    } catch (e) {
      const axiosErr = e as AxiosError<ApiErrorBody>;
      setErr(axiosErr.response?.data?.message || (e as Error).message || "Failed to sync payouts.");
    } finally {
      setSyncing(false);
    }
  };

  const v = (n?: number) => (stats ? String(n ?? 0) : "...");
  const money = (n?: number) => (stats ? peso(n) : "...");

  const main: [string, string][] = [
    ["Total customers", v(stats?.totalCustomers)],
    ["Total owners", v(stats?.totalOwners)],
    ["Total cars", v(stats?.totalCars)],
    [`Platform fees (${DEFAULT_SERVICE_FEE_PCT}%)`, money(stats?.platformFees)],
  ];

  const links: { href: string; title: string; text: string }[] = [
    {
      href: "/admin/owner",
      title: "Owner verifications",
      text: !stats ? "Loading..." : stats.pendingOwners === 0 ? "Nothing waiting on review." : `${stats.pendingOwners} account${stats.pendingOwners === 1 ? "" : "s"} waiting for review.`,
    },
    {
      href: "/admin/cars",
      title: "Car listings",
      text: !stats ? "Loading..." : stats.pendingCars === 0 ? "Nothing waiting on review." : `${stats.pendingCars} listing${stats.pendingCars === 1 ? "" : "s"} waiting for review.`,
    },
    {
      href: "/admin/users",
      title: "Accounts",
      text: !stats ? "Loading..." : `${stats.suspendedAccounts} suspended. Suspend or reactivate any account.`,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Admin dashboard</h1>
        <button className="btn btn-ghost" disabled={syncing} onClick={syncPayouts}>
          {syncing ? "Syncing..." : "Sync owner payouts"}
        </button>
      </div>
      <ErrorNote text={err} />

      <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {main.map(([k, val]) => (
          <div key={k} className="panel">
            <dt className="text-sm text-bay/70">{k}</dt>
            <dd className="mt-1 font-display text-3xl font-extrabold">{val}</dd>
          </div>
        ))}
      </dl>

      <p className="text-xs text-bay/60">
        Platform fees are the {DEFAULT_SERVICE_FEE_PCT}% commission on completed rentals. The remaining share is credited to the car owner automatically when the balance is paid.
      </p>

      <div className="grid gap-4 sm:grid-cols-3">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="panel flex items-center justify-between gap-3 transition hover:shadow-md">
            <div>
              <h2 className="font-bold">{l.title}</h2>
              <p className="mt-1 text-sm text-bay/70">{l.text}</p>
            </div>
            <span className="shrink-0 font-semibold text-teal underline">Open</span>
          </Link>
        ))}
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