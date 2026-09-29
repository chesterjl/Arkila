// admin/cars/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AxiosConfig from "@/app/services/AxiosConfig";
import { API_ENDPOINTS } from "@/app/services/ApiEndpoint";
import RequireRole from "@/components/RequireRole";
import { ErrorNote, Field } from "@/components/Field";
import Badge from "@/components/Badge";
import PendingListCar from "@/components/PendingListCar";
import type { Car, ListingStatus, User } from "@/lib/types";
import type { AxiosError, AxiosResponse } from "axios";

interface ApiErrorBody {
  success: false;
  message: string;
}

type Tab = "all" | ListingStatus;
type Action = "approve" | "reject" | "suspend" | "reinstate";

const TABS: [Tab, string][] = [
  ["all", "All"],
  ["pending", "Pending"],
  ["approved", "Approved"],
  ["rejected", "Rejected"],
  ["suspended", "Suspended"],
];

const ENDPOINT: Record<Action, (id: string) => string> = {
  approve: API_ENDPOINTS.APPROVE_CAR,
  reject: API_ENDPOINTS.REJECT_CAR,
  suspend: API_ENDPOINTS.SUSPEND_CAR,
  reinstate: API_ENDPOINTS.REINSTATE_CAR,
};

const peso = (n: number) => `₱${n.toLocaleString("en-PH")}`;

function CarListings() {
  const [cars, setCars] = useState<Car[] | null>(null);
  const [tab, setTab] = useState<Tab>("pending");
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reasonFor, setReasonFor] = useState<{ id: string; action: "reject" | "suspend" } | null>(null);
  const [reason, setReason] = useState("");

  const load = useCallback(async () => {
    setErr("");
    try {
      const response: AxiosResponse = await AxiosConfig.get(API_ENDPOINTS.GET_ADMIN_CARS_LIST);
      setCars(response.data.cars || []);
    } catch (e) {
      const axiosErr = e as AxiosError<ApiErrorBody>;
      setErr(axiosErr.response?.data?.message || (e as Error).message || "Failed to load listings.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (id: string, action: Action, note?: string) => {
    setErr("");
    setBusyId(id);
    try {
      const withReason = action === "reject" || action === "suspend";
      const { data } = await AxiosConfig.patch(ENDPOINT[action](id), withReason ? { reason: note || undefined } : {});
      // The API returns the owner as a bare id, so keep the populated owner we already have.
      setCars((prev) => (prev ? prev.map((c) => (c._id === id ? { ...data.car, owner: c.owner } : c)) : prev));
      setReasonFor(null);
      setReason("");
      if (action === "approve" || action === "reject") setViewingId(null);
    } catch (e) {
      const axiosErr = e as AxiosError<ApiErrorBody>;
      setErr(axiosErr.response?.data?.message || (e as Error).message || `Failed to ${action} this listing.`);
    } finally {
      setBusyId(null);
    }
  };

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: cars?.length ?? 0 };
    (cars || []).forEach((car) => {
      c[car.listingStatus] = (c[car.listingStatus] || 0) + 1;
    });
    return c;
  }, [cars]);

  const shown = (cars || []).filter((c) => tab === "all" || c.listingStatus === tab);
  const viewing = cars?.find((c) => c._id === viewingId) || null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Car listings</h1>
          <p className="text-sm text-bay/70">
            Approve or reject new listings, suspend a live one, or reinstate a suspended one. Suspending never affects existing bookings; it only stops new requests.
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-ghost" onClick={load}>Refresh</button>
          <Link href="/admin/dashboard" className="btn btn-ghost">Back to dashboard</Link>
        </div>
      </div>

      <div role="tablist" className="flex flex-wrap gap-1 border-b border-bay/10">
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
            {label} <span className="text-xs font-normal">({counts[key] ?? 0})</span>
          </button>
        ))}
      </div>

      <ErrorNote text={err} />

      {cars === null ? (
        <p className="text-bay/60">Loading...</p>
      ) : shown.length === 0 ? (
        <p className="panel">No listings in this category.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((c) => {
            const owner = typeof c.owner === "object" ? (c.owner as User) : null;
            const busy = busyId === c._id;
            const asking = reasonFor?.id === c._id ? reasonFor.action : null;

            return (
              <article key={c._id} className="panel flex flex-col overflow-hidden p-0 transition hover:shadow-sm">
                <img src={c.imageUrl} alt={c.name} className="h-40 w-full shrink-0 object-cover" />

                <div className="flex flex-1 flex-col p-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="font-semibold">{c.name}</h2>
                      <Badge status={c.listingStatus} />
                    </div>
                    <p className="text-sm text-bay/70">
                      {owner ? owner.brandName || owner.name : "Owner"} · {peso(c.rentalPrice)}/day
                    </p>
                    <p className="text-xs capitalize text-bay/60">
                      {c.vehicleType} · {c.fuelType} · {c.seats} seats · {c.location}
                    </p>
                    {c.adminNote && (c.listingStatus === "rejected" || c.listingStatus === "suspended") && (
                      <p className="rounded-md bg-mist p-2 text-xs text-coral">Reason: {c.adminNote}</p>
                    )}
                  </div>

                  <div className="mt-3 space-y-3">
                    <button
                      type="button"
                      className="w-full rounded-lg bg-teal/10 py-2 text-center text-xs font-semibold text-teal transition-colors hover:bg-teal hover:text-white"
                      onClick={() => setViewingId(c._id)}
                    >
                      View Registration & Details
                    </button>

                    {asking ? (
                      <div className="space-y-2 rounded-md bg-mist p-3">
                        <Field label={asking === "reject" ? "Reason for rejection" : "Reason for suspension"}>
                          <textarea className="input" rows={2} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
                        </Field>
                        <div className="flex gap-2">
                          <button
                            className="btn btn-ghost"
                            disabled={busy}
                            onClick={() => {
                              setReasonFor(null);
                              setReason("");
                            }}
                          >
                            Cancel
                          </button>
                          <button className="btn btn-danger" disabled={busy} onClick={() => run(c._id, asking, reason)}>
                            {busy ? "Please wait..." : asking === "reject" ? "Confirm rejection" : "Confirm suspension"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2 border-t border-bay/10 pt-3">
                        {c.listingStatus === "pending" && (
                          <>
                            <button className="btn btn-primary flex-1" disabled={busy} onClick={() => run(c._id, "approve")}>
                              {busy ? "Please wait..." : "Approve"}
                            </button>
                            <button className="btn btn-ghost" disabled={busy} onClick={() => setReasonFor({ id: c._id, action: "reject" })}>
                              Reject
                            </button>
                          </>
                        )}
                        {c.listingStatus === "approved" && (
                          <button className="btn btn-ghost flex-1 text-coral" disabled={busy} onClick={() => setReasonFor({ id: c._id, action: "suspend" })}>
                            Suspend listing
                          </button>
                        )}
                        {c.listingStatus === "suspended" && (
                          <button className="btn btn-primary flex-1" disabled={busy} onClick={() => run(c._id, "reinstate")}>
                            {busy ? "Please wait..." : "Reinstate listing"}
                          </button>
                        )}
                        {c.listingStatus === "rejected" && (
                          <p className="text-xs text-bay/60">The owner must edit and resubmit this listing for another review.</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {viewing && (
        <PendingListCar
          car={viewing}
          onClose={() => setViewingId(null)}
          onApprove={viewing.listingStatus === "pending" ? () => run(viewing._id, "approve") : undefined}
          onReject={
            viewing.listingStatus === "pending"
              ? () => {
                  setReasonFor({ id: viewing._id, action: "reject" });
                  setViewingId(null);
                }
              : undefined
          }
          busy={busyId === viewing._id}
        />
      )}
    </div>
  );
}

export default function Page() {
  return (
    <RequireRole role="admin">
      <CarListings />
    </RequireRole>
  );
}