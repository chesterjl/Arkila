// admin/users/page.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AxiosConfig from "@/app/services/AxiosConfig";
import { API_ENDPOINTS } from "@/app/services/ApiEndpoint";
import RequireRole from "@/components/RequireRole";
import { ErrorNote, Field } from "@/components/Field";
import Badge from "@/components/Badge";
import type { Role, User } from "@/lib/types";
import type { AxiosError, AxiosResponse } from "axios";

interface ApiErrorBody {
  success: false;
  message: string;
}

type Tab = "all" | Role;

const TABS: [Tab, string][] = [
  ["all", "All"],
  ["customer", "Customers"],
  ["owner", "Owners"],
  ["admin", "Admins"],
];

function Accounts() {
  const [users, setUsers] = useState<User[] | null>(null);
  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const [err, setErr] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [suspendingId, setSuspendingId] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const load = useCallback(async () => {
    setErr("");
    try {
      const response: AxiosResponse = await AxiosConfig.get(API_ENDPOINTS.GET_ADMIN_USERS());
      setUsers(response.data.users || []);
    } catch (e) {
      const axiosErr = e as AxiosError<ApiErrorBody>;
      setErr(axiosErr.response?.data?.message || (e as Error).message || "Failed to load accounts.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (id: string, action: "suspend" | "reactivate") => {
    setErr("");
    setBusyId(id);
    try {
      const { data } =
        action === "suspend"
          ? await AxiosConfig.patch(API_ENDPOINTS.SUSPEND_USER(id), { reason: reason || undefined })
          : await AxiosConfig.patch(API_ENDPOINTS.REACTIVATE_USER(id));
      setUsers((prev) => (prev ? prev.map((u) => (u._id === id ? data.user : u)) : prev));
      setSuspendingId(null);
      setReason("");
    } catch (e) {
      const axiosErr = e as AxiosError<ApiErrorBody>;
      setErr(axiosErr.response?.data?.message || (e as Error).message || `Failed to ${action} this account.`);
    } finally {
      setBusyId(null);
    }
  };

  const q = search.trim().toLowerCase();
  const shown = (users || []).filter(
    (u) =>
      (tab === "all" || u.role === tab) &&
      (!q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Accounts</h1>
          <p className="text-sm text-bay/70">
            A suspended account is signed out and cannot log in. A suspended owner&apos;s cars are hidden and can&apos;t take new requests; existing bookings are not affected.
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-ghost" onClick={load}>Refresh</button>
          <Link href="/admin/dashboard" className="btn btn-ghost">Back to dashboard</Link>
        </div>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-bay/10">
        <div role="tablist" className="flex flex-wrap gap-1">
          {TABS.map(([key, label]) => (
            <button
              key={key}
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold ${
                tab === key ? "border-teal text-teal" : "border-transparent text-bay/60 hover:text-bay"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <input
          className="input mb-2 w-full sm:w-64"
          placeholder="Search name or email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <ErrorNote text={err} />

      {users === null ? (
        <p className="text-bay/60">Loading...</p>
      ) : shown.length === 0 ? (
        <p className="panel">No accounts match.</p>
      ) : (
        <div className="space-y-3">
          {shown.map((u) => {
            const busy = busyId === u._id;
            const suspending = suspendingId === u._id;
            return (
              <article key={u._id} className="panel space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 className="font-semibold">
                      {u.name}
                      {u.brandName && <span className="font-normal text-bay/60"> · {u.brandName}</span>}
                    </h2>
                    <p className="text-sm text-bay/70">{u.email} · {u.phone}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-bay/10 px-3 py-1 text-xs font-semibold capitalize text-bay">{u.role}</span>
                    {u.role === "owner" && <Badge status={u.ownerStatus || "pending"} />}
                    {u.isSuspended && <Badge status="suspended" />}
                  </div>
                </div>

                {u.isSuspended && u.suspensionReason && (
                  <p className="rounded-md bg-mist p-2 text-xs text-coral">Reason: {u.suspensionReason}</p>
                )}

                {u.role !== "admin" &&
                  (suspending ? (
                    <div className="space-y-2 rounded-md bg-mist p-3">
                      <Field label="Reason for suspension">
                        <textarea className="input" rows={2} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
                      </Field>
                      <div className="flex gap-2">
                        <button
                          className="btn btn-ghost"
                          disabled={busy}
                          onClick={() => {
                            setSuspendingId(null);
                            setReason("");
                          }}
                        >
                          Cancel
                        </button>
                        <button className="btn btn-danger" disabled={busy} onClick={() => run(u._id, "suspend")}>
                          {busy ? "Please wait..." : "Confirm suspension"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2 border-t border-bay/10 pt-3">
                      {u.isSuspended ? (
                        <button className="btn btn-primary" disabled={busy} onClick={() => run(u._id, "reactivate")}>
                          {busy ? "Please wait..." : "Reactivate account"}
                        </button>
                      ) : (
                        <button className="btn btn-ghost text-coral" disabled={busy} onClick={() => setSuspendingId(u._id)}>
                          Suspend account
                        </button>
                      )}
                    </div>
                  ))}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <RequireRole role="admin">
      <Accounts />
    </RequireRole>
  );
}