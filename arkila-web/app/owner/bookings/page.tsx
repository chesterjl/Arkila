// app/owner/bookings/page.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AxiosConfig from "@/app/services/AxiosConfig";
import { API_ENDPOINTS } from "@/app/services/ApiEndpoint";
import RequireRole from "@/components/RequireRole";
import { ErrorNote } from "@/components/Field";
import Badge from "@/components/Badge";
import ViewBookingModal from "@/components/ViewBookingModal";
import ConditionReportForm from "@/components/ConditionReportForm";
import { fmtDate, peso } from "@/lib/booking";
import type { Booking, Car, DeliveryMethod, User } from "@/lib/types";
import type { AxiosError, AxiosResponse } from "axios";

interface ApiErrorBody {
  success: false;
  message: string;
}

type Tab = "confirmed" | "ongoing" | "returned" | "completed" | "cancelled" | "rejected" | "all";

const TABS: [Tab, string][] = [
  ["confirmed", "Confirmed"],
  ["ongoing", "Ongoing"],
  ["returned", "Returned"],
  ["completed", "Completed"],
  ["cancelled", "Cancelled"],
  ["rejected", "Rejected"],
  ["all", "All"],
];

const DELIVERY_LABEL: Record<DeliveryMethod, string> = {
  self_pickup_self_return: "Self pick-up & self return",
  self_pickup_owner_pickup: "Self pick-up & owner pick-up",
  owner_delivery_self_return: "Owner delivery & self return",
  owner_delivery_owner_pickup: "Owner delivery & owner pick-up",
};

const legInstruction = (method: DeliveryMethod, leg: "pickup" | "return") => {
  const ownerHandlesPickup = method === "owner_delivery_self_return" || method === "owner_delivery_owner_pickup";
  const ownerHandlesReturn = method === "self_pickup_owner_pickup" || method === "owner_delivery_owner_pickup";
  return leg === "pickup"
    ? ownerHandlesPickup
      ? "You deliver the car to the customer's address."
      : "The customer picks the car up from your listed location."
    : ownerHandlesReturn
    ? "You collect the car from the customer's address."
    : "The customer returns the car to your listed location.";
};

const paymentMethod = (payment?: { method?: string }) => payment?.method;

function OwnerBookings() {
  const [tab, setTab] = useState<Tab>("confirmed");
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [viewing, setViewing] = useState<Booking | null>(null);
  const [loggingReturnId, setLoggingReturnId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [confirmingF2FId, setConfirmingF2FId] = useState<string | null>(null);
  const [f2fAmount, setF2fAmount] = useState("");
  const [f2fBusy, setF2fBusy] = useState(false);
  const [f2fErr, setF2fErr] = useState("");

  const load = useCallback(async (activeTab: Tab) => {
    setErr("");
    try {
      const query = activeTab === "all" ? "" : `?status=${activeTab}`;
      const response: AxiosResponse = await AxiosConfig.get(`${API_ENDPOINTS.GET_OWNER_BOOKING_HISTORY}${query}`);
      setBookings(response.data.bookings || []);
    } catch (e) {
      const axiosErr = e as AxiosError<ApiErrorBody>;
      setErr(axiosErr.response?.data?.message || (e as Error).message || "Failed to load bookings.");
    }
  }, []);

  useEffect(() => {
    setBookings(null);
    load(tab);
  }, [tab, load]);

  const markPickedUp = async (id: string) => {
    setErr("");
    setBusyId(id);
    try {
      await AxiosConfig.patch(API_ENDPOINTS.PICKUP_BOOKING(id));
      await load(tab);
    } catch (e) {
      const axiosErr = e as AxiosError<ApiErrorBody>;
      setErr(axiosErr.response?.data?.message || (e as Error).message || "Failed to update this booking.");
    } finally {
      setBusyId(null);
    }
  };

  const confirmF2F = async (id: string) => {
    setF2fErr("");
    const amount = Number(f2fAmount);
    if (!amount || amount <= 0) return setF2fErr("Enter a valid amount received.");

    setF2fBusy(true);
    try {
      await AxiosConfig.patch(API_ENDPOINTS.CONFIRM_BALANCE_F2F(id), { amountReceived: amount });
      setConfirmingF2FId(null);
      setF2fAmount("");
      await load(tab);
    } catch (e) {
      const axiosErr = e as AxiosError<ApiErrorBody>;
      setF2fErr(axiosErr.response?.data?.message || (e as Error).message || "Failed to confirm this payment.");
    } finally {
      setF2fBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Bookings</h1>
        <p className="text-sm text-bay/70">
          Once a customer pays their downpayment, track the handoff here. New requests to approve or
          decline still live on{" "}
          <Link href="/owner/requests" className="font-semibold text-teal underline">
            Rental requests
          </Link>
          .
        </p>
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
            {label}
          </button>
        ))}
      </div>

      <ErrorNote text={err} />

      {bookings === null ? (
        <p className="text-bay/60">Loading...</p>
      ) : bookings.length === 0 ? (
        <p className="panel">No bookings in this category yet.</p>
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => {
            const car = typeof b.car === "object" ? (b.car as Car) : null;
            const customer = typeof b.customer === "object" ? (b.customer as User) : null;
            const busy = busyId === b._id;
            const loggingReturn = loggingReturnId === b._id;
            const confirmingF2F = confirmingF2FId === b._id;
            const balanceUnpaid = b.status === "returned" && b.balancePayment?.status !== "paid";
            const balanceMethod = paymentMethod(b.balancePayment);

            return (
              <article key={b._id} className="panel space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex gap-3">
                    {car?.imageUrl && (
                      <img src={car.imageUrl} alt={car.name} className="h-16 w-20 shrink-0 rounded-md object-cover" />
                    )}
                    <div>
                      <h2 className="font-semibold">{car?.name || "Car rental"}</h2>
                      <p className="text-sm text-bay/70">
                        {fmtDate(b.startDate)} to {fmtDate(b.endDate)} · {b.totalDays}{" "}
                        {b.totalDays === 1 ? "day" : "days"}
                      </p>
                      <p className="text-sm font-semibold text-teal">{peso(b.totalPrice)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge status={b.status} />
                    <Badge status={b.downPayment.status} />
                  </div>
                </div>

                {customer && (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-mist p-3 text-sm">
                    <div>
                      <p className="font-medium">{customer.name}</p>
                      <p className="text-bay/60">{DELIVERY_LABEL[b.deliveryMethod]}</p>
                    </div>
                    <a href={`tel:${customer.phone}`} className="btn btn-ghost py-1.5">
                      Call {customer.phone}
                    </a>
                  </div>
                )}

                {b.status === "confirmed" && (
                  <div className="space-y-1 rounded-md border border-jeep/30 bg-jeep/10 p-3 text-sm">
                    <p className="font-medium">{legInstruction(b.deliveryMethod, "pickup")}</p>
                    {car?.location && <p className="text-bay/70">Your listed location: {car.location}</p>}
                    {customer?.address && <p className="text-bay/70">Customer&apos;s address: {customer.address}</p>}
                  </div>
                )}

                {b.status === "ongoing" && (
                  <div className="space-y-1 rounded-md border border-teal/30 bg-teal/5 p-3 text-sm">
                    <p className="font-medium">{legInstruction(b.deliveryMethod, "return")}</p>
                    {car?.location && <p className="text-bay/70">Your listed location: {car.location}</p>}
                    {customer?.address && <p className="text-bay/70">Customer&apos;s address: {customer.address}</p>}
                  </div>
                )}

                {balanceUnpaid && !confirmingF2F && (
                  <div className="rounded-md bg-mist p-3 text-sm">
                    {balanceMethod === "f2f" ? (
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span>
                          The customer chose to pay {peso(b.balancePayment.amount)} in cash face-to-face.
                        </span>
                        <button className="btn btn-primary" onClick={() => setConfirmingF2FId(b._id)}>
                          Confirm cash received
                        </button>
                      </div>
                    ) : (
                      <span>
                        Waiting for the customer to settle the remaining balance of{" "}
                        {peso(b.balancePayment.amount)}.
                      </span>
                    )}
                  </div>
                )}

                {confirmingF2F && (
                  <div className="space-y-2 rounded-md bg-mist p-3">
                    <p className="text-sm font-medium">
                      Cash received for the remaining balance ({peso(b.balancePayment.amount)})
                    </p>
                    <input
                      type="number"
                      min={1}
                      className="input"
                      placeholder="Amount received"
                      value={f2fAmount}
                      onChange={(e) => setF2fAmount(e.target.value)}
                    />
                    <ErrorNote text={f2fErr} />
                    <div className="flex gap-2">
                      <button className="btn btn-ghost" disabled={f2fBusy}
                        onClick={() => {
                          setConfirmingF2FId(null);
                          setF2fAmount("");
                          setF2fErr("");
                        }}
                      >
                        Cancel
                      </button>
                      <button className="btn btn-primary" disabled={f2fBusy} onClick={() => confirmF2F(b._id)}>
                        {f2fBusy ? "Please wait..." : "Confirm cash received"}
                      </button>
                    </div>
                  </div>
                )}

                {loggingReturn ? (
                  <div className="space-y-2">
                    <ConditionReportForm booking={b}
                      onDone={() => {
                        setLoggingReturnId(null);
                        load(tab);
                      }}
                    />
                    <button className="btn btn-ghost" onClick={() => setLoggingReturnId(null)}>
                      Cancel
                    </button>
                  </div>
                ) : (
                  !confirmingF2F && (
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-bay/10 pt-3">
                      <div className="flex flex-wrap gap-2">
                        {b.status === "confirmed" && (
                          <button className="btn btn-primary" disabled={busy} onClick={() => markPickedUp(b._id)}>
                            {busy ? "Please wait..." : "Mark picked up"}
                          </button>
                        )}
                        {b.status === "ongoing" && (
                          <button className="btn btn-primary" onClick={() => setLoggingReturnId(b._id)}>
                            Log car return
                          </button>
                        )}
                      </div>
                      <button className="btn btn-ghost text-sm font-medium" onClick={() => setViewing(b)}>
                        View booking
                      </button>
                    </div>
                  )
                )}
              </article>
            );
          })}
        </div>
      )}
      {viewing && <ViewBookingModal booking={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}

export default function Page() {
  return (
    <RequireRole role="owner">
      <OwnerBookings />
    </RequireRole>
  );
}