// owner/requests/page.tsx

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AxiosConfig from "@/app/services/AxiosConfig";
import { API_ENDPOINTS } from "@/app/services/ApiEndpoint";
import { fmtDate } from "@/lib/booking";
import type { Booking, Car, IdDocument, User } from "@/lib/types";
import Badge from "@/components/Badge";
import ViewBookingModal from "@/components/ViewBookingModal";
import RequireRole from "@/components/RequireRole";
import { ErrorNote } from "@/components/Field";
import type { AxiosError, AxiosResponse } from "axios";

interface ApiErrorBody {
  success: false;
  message: string;
}

interface BookingsResponse {
  success: true;
  bookings: Booking[];
}

function Requests() {
  const [rows, setRows] = useState<Booking[] | null>(null);
  const [viewing, setViewing] = useState<Booking | null>(null);
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    try {
      const response: AxiosResponse<BookingsResponse> = await AxiosConfig.get(
        API_ENDPOINTS.GET_OWNER_PENDING_BOOKINGS
      );
      setRows([...(response.data.bookings || [])].reverse());
    } catch (e) {
      const axiosErr = e as AxiosError<ApiErrorBody>;
      setErr(axiosErr.response?.data?.message || (e as Error).message || "Failed to load requests.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const decide = async (id: string, d: "approve" | "reject") => {
    setErr("");
    setDecidingId(id);
    try {
      const endpoint = d === "approve" ? API_ENDPOINTS.APPROVE_BOOKING(id) : API_ENDPOINTS.REJECT_BOOKING(id);
      await AxiosConfig.patch(endpoint);

      setRows((prev) => (prev ? prev.filter((b) => b._id !== id) : prev));
      setViewing((v) => (v && v._id === id ? null : v));
    } catch (e) {
      const axiosErr = e as AxiosError<ApiErrorBody>;
      setErr(axiosErr.response?.data?.message || (e as Error).message || `Failed to ${d} request.`);
    } finally {
      setDecidingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Rental requests</h1>
      <ErrorNote text={err} />
      {rows === null ? (
        <p className="text-bay/60">Loading requests...</p>
      ) : rows.length === 0 ? (
        <p className="panel">No pending requests right now. New booking requests will show up here.</p>
      ) : (
        rows.map((b) => {
          const car = typeof b.car === "object" ? (b.car as Car) : null;
          const customer = typeof b.customer === "object" ? (b.customer as User) : null;
          const idDoc = typeof b.idDocument === "object" ? (b.idDocument as IdDocument) : null;

          const carName = car ? car.name : "Car Rental";
          const renterName = customer ? customer.name : "Renter";

          const serviceFeePercentage = 0.1; 
          const ownerPayout = b.totalPrice * (1 - serviceFeePercentage);
          const busy = decidingId === b._id;

          return (
            <article key={b._id} className="panel space-y-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="font-semibold">{carName}</h2>
                  <p className="text-sm text-bay/70">
                    {renterName} · {fmtDate(b.startDate)} to {fmtDate(b.endDate)} · {b.totalDays} days
                  </p>
                </div>
                <div className="flex gap-2">
                  <Badge status={idDoc ? idDoc.status : "unverified"} />
                  <Badge status={b.status} />
                </div>
              </div>

              <p className="text-sm text-bay/70">
                Renter pays {b.totalPrice}. After the platform service fee you receive {ownerPayout}.
              </p>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button className="btn btn-ghost" onClick={() => setViewing(b)}>
                  View booking
                </button>
                <button className="btn btn-primary" disabled={busy} onClick={() => decide(b._id, "approve")}>
                  {busy ? "Please wait" : "Approve request"}
                </button>
                <button className="btn btn-ghost" disabled={busy} onClick={() => decide(b._id, "reject")}>
                  Decline request
                </button>
              </div>
            </article>
          );
        })
      )}

      {viewing && (
        <ViewBookingModal
          booking={viewing}
          onClose={() => setViewing(null)}
          onApprove={() => decide(viewing._id, "approve")}
          onReject={() => decide(viewing._id, "reject")}
          busy={decidingId === viewing._id}
        />
      )}

      <Link href="/owner/dashboard" className="inline-block text-sm font-semibold text-teal underline">
        Back to dashboard
      </Link>
    </div>
  );
}

export default function Page() {
  return (
    <RequireRole role="owner">
      <Requests />
    </RequireRole>
  );
}