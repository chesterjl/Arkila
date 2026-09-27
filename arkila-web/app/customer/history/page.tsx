// customer/history/page.tsx
"use client";

import { useEffect, useState } from "react";
import AxiosConfig from "@/app/services/AxiosConfig";
import { API_ENDPOINTS } from "@/app/services/ApiEndpoint";
import { ErrorNote } from "@/components/Field";
import Badge from "@/components/Badge";
import ViewBookingModal from "@/components/ViewBookingModal";
import { fmtDate, peso } from "@/lib/booking";
import type { Booking, Car, DeliveryMethod, User } from "@/lib/types";
import type { AxiosError, AxiosResponse } from "axios";

interface ApiErrorBody {
  success: false;
  message: string;
}

type FilterValue =
  | "ALL"
  | "pending"
  | "rejected"
  | "approved"
  | "confirmed"
  | "ongoing"
  | "returned"
  | "completed"
  | "cancelled";

const BOOKING_STATUSES: { label: string; value: FilterValue }[] = [
  { label: "All", value: "ALL" },
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Confirmed", value: "confirmed" },
  { label: "Ongoing", value: "ongoing" },
  { label: "Returned", value: "returned" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
  { label: "Rejected", value: "rejected" },
];

const DELIVERY_LABEL: Record<DeliveryMethod, string> = {
  self_pickup_self_return: "Self pick-up & self return",
  self_pickup_owner_pickup: "Self pick-up & owner pick-up",
  owner_delivery_self_return: "Owner delivery & self return",
  owner_delivery_owner_pickup: "Owner delivery & owner pick-up",
};

export default function CustomerHistoryPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterValue>("ALL");
  const [viewing, setViewing] = useState<Booking | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchHistory = async () => {
      try {
        const response: AxiosResponse = await AxiosConfig.get(
          API_ENDPOINTS.GET_CUSTOMER_BOOKINGS_HISTORY
        );

        if (isMounted && response.status === 200) {
          setBookings(response.data.bookings || response.data || []);
        }
      } catch (x) {
        if (isMounted) {
          const axiosErr = x as AxiosError<ApiErrorBody>;
          setErr(
            axiosErr.response?.data?.message ||
              (x as Error).message ||
              "Failed to load booking history."
          );
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchHistory();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredBookings = bookings.filter(
    (b) => activeFilter === "ALL" || b.status === activeFilter
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-bay sm:text-3xl">
          Booking History
        </h1>
        <p className="mt-1 text-sm text-bay/60">
          View all your previous and active car rental requests.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-bay/10 pb-3">
        {BOOKING_STATUSES.map((filter) => {
          const count =
            filter.value === "ALL"
              ? bookings.length
              : bookings.filter((b) => b.status === filter.value).length;
          const isActive = activeFilter === filter.value;

          return (
            <button
              key={filter.value}
              onClick={() => setActiveFilter(filter.value)}
              className={`flex items-center space-x-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors sm:text-sm ${
                isActive
                  ? "bg-bay text-white shadow-xs"
                  : "border border-bay/10 bg-white text-bay/70 hover:bg-bay/5"
              }`}
            >
              <span>{filter.label}</span>
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  isActive ? "bg-white/20 text-white" : "bg-bay/10 text-bay/70"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {loading && (
        <p className="py-8 text-center text-bay/60">Loading history...</p>
      )}

      {err && (
        <div className="p-4">
          <ErrorNote text={err} />
        </div>
      )}

      {!loading && !err && filteredBookings.length === 0 && (
        <div className="space-y-2 rounded-xl border border-dashed border-bay/20 bg-white p-12 text-center">
          <p className="text-lg font-semibold text-bay">No bookings found</p>
          <p className="text-sm text-bay/60">
            {activeFilter === "ALL"
              ? "You haven't requested any car bookings yet."
              : `There are no bookings matching status "${activeFilter}".`}
          </p>
        </div>
      )}

      {!loading && !err && filteredBookings.length > 0 && (
        <div className="space-y-4">
          {filteredBookings.map((b) => {
            const car = typeof b.car === "object" ? (b.car as Car) : null;
            const owner = typeof b.owner === "object" ? (b.owner as User) : null;
            const ownerName = owner?.brandName || owner?.name || "Car owner";

            return (
              <div
                key={b._id}
                className="flex flex-col gap-4 rounded-xl border border-bay/10 bg-white p-4 shadow-xs transition-shadow hover:shadow-sm sm:flex-row sm:p-5"
              >
                <div className="relative h-36 w-full shrink-0 overflow-hidden rounded-lg border border-bay/10 bg-bay/5 sm:w-48">
                  {car?.imageUrl ? (
                    <img src={car.imageUrl} alt={car.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-bay/40">
                      No image
                    </div>
                  )}
                </div>

                <div className="flex flex-1 flex-col justify-between space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-2 border-b border-bay/10 pb-3">
                    <div>
                      <h2 className="text-lg font-bold text-bay">{car?.name || "Vehicle"}</h2>
                      <p className="text-xs font-medium text-bay/60">
                        Owner: <span className="text-teal">{ownerName}</span>
                      </p>
                    </div>
                    <Badge status={b.status} />
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs sm:text-sm">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-bay/50">
                        Rental period
                      </p>
                      <p className="mt-0.5 font-medium text-bay">
                        {fmtDate(b.startDate)} – {fmtDate(b.endDate)}
                      </p>
                      <p className="text-xs text-bay/60">
                        ({b.totalDays} {b.totalDays === 1 ? "day" : "days"})
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-bay/50">
                        Delivery method
                      </p>
                      <p className="mt-0.5 font-medium text-bay">
                        {DELIVERY_LABEL[b.deliveryMethod]}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2 rounded-md bg-mist p-3 text-xs sm:grid-cols-2 sm:text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-bay/60">Downpayment</span>
                      <span className="flex items-center gap-1.5 font-medium text-bay">
                        {peso(b.downPayment?.amount)}
                        <Badge status={b.downPayment?.status || "unpaid"} />
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-bay/60">Balance</span>
                      <span className="flex items-center gap-1.5 font-medium text-bay">
                        {peso(b.balancePayment?.amount)}
                        <Badge status={b.balancePayment?.status || "unpaid"} />
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-bay/10 pt-3 text-xs">
                    <span className="text-bay/50">Requested on {fmtDate(b.createdAt)}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-base font-extrabold text-bay">{peso(b.totalPrice)}</span>
                      <button
                        className="btn btn-ghost py-1.5 text-xs font-semibold"
                        onClick={() => setViewing(b)}
                      >
                        View booking
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {viewing && <ViewBookingModal booking={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}