// admin/cars/page.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AxiosConfig from "@/app/services/AxiosConfig";
import { API_ENDPOINTS } from "@/app/services/ApiEndpoint";
import RequireRole from "@/components/RequireRole";
import { ErrorNote, Field } from "@/components/Field";
import Badge from "@/components/Badge";
import PendingListCar from "@/components/PendingListCar";
import type { Car, User } from "@/lib/types";
import type { AxiosError, AxiosResponse } from "axios";

interface ApiErrorBody {
  success: false;
  message: string;
}

const peso = (n: number) => `₱${n.toLocaleString("en-PH")}`;

function CarVerifications() {
  const [cars, setCars] = useState<Car[] | null>(null);
  const [viewing, setViewing] = useState<Car | null>(null);
  const [err, setErr] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const load = useCallback(async () => {
    setErr("");
    try {
      const response: AxiosResponse = await AxiosConfig.get(
        API_ENDPOINTS.GET_ADMIN_PENDING_CARS_LIST
      );
      setCars(response.data.cars || []);
    } catch (e) {
      const axiosErr = e as AxiosError<ApiErrorBody>;
      setErr(
        axiosErr.response?.data?.message ||
          (e as Error).message ||
          "Failed to load pending listings."
      );
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const approve = async (id: string) => {
    setErr("");
    setBusyId(id);
    try {
      await AxiosConfig.patch(API_ENDPOINTS.APPROVE_CAR(id));
      setCars((prev) => (prev ? prev.filter((c) => c._id !== id) : prev));
      setViewing((v) => (v && v._id === id ? null : v));
    } catch (e) {
      const axiosErr = e as AxiosError<ApiErrorBody>;
      setErr(
        axiosErr.response?.data?.message ||
          (e as Error).message ||
          "Failed to approve this listing."
      );
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (id: string) => {
    setErr("");
    setBusyId(id);
    try {
      await AxiosConfig.patch(API_ENDPOINTS.REJECT_CAR(id), {
        reason: reason || undefined,
      });
      setCars((prev) => (prev ? prev.filter((c) => c._id !== id) : prev));
      setViewing((v) => (v && v._id === id ? null : v));
      setRejectingId(null);
      setReason("");
    } catch (e) {
      const axiosErr = e as AxiosError<ApiErrorBody>;
      setErr(
        axiosErr.response?.data?.message ||
          (e as Error).message ||
          "Failed to reject this listing."
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Car listing verifications</h1>
          <p className="text-sm text-bay/70">
            New and resubmitted listings wait here until their Certificate of
            Registration is checked.
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-ghost" onClick={load}>
            Refresh
          </button>
          <Link href="/admin/dashboard" className="btn btn-ghost">
            Back to dashboard
          </Link>
        </div>
      </div>

      <ErrorNote text={err} />

      {cars === null ? (
        <p className="text-bay/60">Loading...</p>
      ) : cars.length === 0 ? (
        <p className="panel">No car listings waiting for verification.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cars.map((c) => {
            const owner =
              typeof c.owner === "object" ? (c.owner as User) : null;
            const busy = busyId === c._id;
            const rejecting = rejectingId === c._id;

            return (
              <article
                key={c._id}
                className="panel flex flex-col overflow-hidden p-0 transition hover:shadow-sm"
              >
                <img
                  src={c.imageUrl}
                  alt={c.name}
                  className="h-40 w-full shrink-0 object-cover"
                />

                <div className="flex flex-1 flex-col p-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="font-semibold">{c.name}</h2>
                      <Badge status={c.listingStatus} />
                    </div>
                    <p className="text-sm text-bay/70">
                      {owner ? owner.brandName || owner.name : "Owner"} ·{" "}
                      {peso(c.rentalPrice)}/day
                    </p>
                    <p className="text-xs capitalize text-bay/60">
                      {c.vehicleType} · {c.fuelType} · {c.seats} seats ·{" "}
                      {c.location}
                    </p>
                  </div>

                  <div className="mt-3 space-y-3">
                    <button
                      type="button"
                      className="w-full rounded-lg bg-teal/10 py-2 text-center text-xs font-semibold text-teal transition-colors hover:bg-teal hover:text-white"
                      onClick={() => setViewing(c)}
                    >
                      View Registration & Details
                    </button>

                    {rejecting ? (
                      <div className="space-y-2 rounded-md bg-mist p-3">
                        <Field label="Reason for rejection">
                          <textarea
                            className="input"
                            rows={2}
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                          />
                        </Field>
                        <div className="flex gap-2">
                          <button
                            className="btn btn-ghost"
                            disabled={busy}
                            onClick={() => {
                              setRejectingId(null);
                              setReason("");
                            }}
                          >
                            Cancel
                          </button>
                          <button
                            className="btn btn-danger"
                            disabled={busy}
                            onClick={() => reject(c._id)}
                          >
                            {busy ? "Please wait..." : "Confirm rejection"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2 border-t border-bay/10 pt-3">
                        <button
                          className="btn btn-primary flex-1"
                          disabled={busy}
                          onClick={() => approve(c._id)}
                        >
                          {busy ? "Please wait..." : "Approve"}
                        </button>
                        <button
                          className="btn btn-ghost"
                          disabled={busy}
                          onClick={() => setRejectingId(c._id)}
                        >
                          Reject
                        </button>
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
          onClose={() => setViewing(null)}
          onApprove={() => approve(viewing._id)}
          onReject={() => {
            setRejectingId(viewing._id);
            setViewing(null);
          }}
          busy={busyId === viewing._id}
        />
      )}
    </div>
  );
}

export default function Page() {
  return (
    <RequireRole role="admin">
      <CarVerifications />
    </RequireRole>
  );
}