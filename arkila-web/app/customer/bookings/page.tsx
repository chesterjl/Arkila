// customer/bookings/page.tsx
"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import AxiosConfig from "@/app/services/AxiosConfig";
import { API_ENDPOINTS } from "@/app/services/ApiEndpoint";
import Badge from "@/components/Badge";
import RequireRole from "@/components/RequireRole";
import { ErrorNote } from "@/components/Field";
import ViewBookingModal from "@/components/ViewBookingModal";
import ConfirmDialog from "@/components/ConfirmDialog";

import type { Booking, Car, User } from "@/lib/types";
import type { AxiosError, AxiosResponse } from "axios";

interface ApiErrorBody {
success: false;
message: string;
}

interface PayResponse {
invoiceUrl?: string;
amount: number;
method?: string;
alreadyPaid?: boolean;
}

const fmtDate = (d?: string) =>
d
  ? new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  : "N/A";

const peso = (n?: number) =>
typeof n === "number"
  ? `₱${n.toLocaleString("en-PH", {
      minimumFractionDigits: 2,
    })}`
  : "₱0.00";

const paymentMethod = (payment?: { method?: string }) => payment?.method;

function MyRental() {
  const searchParams = useSearchParams();
  const paymentStatus = searchParams.get("payment");

  const [rows, setRows] = useState<Booking[] | null>(null);
  const [payFor, setPayFor] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loadingPayId, setLoadingPayId] = useState<string | null>(null);
  const [loadingBalancePayId, setLoadingBalancePayId] = useState<string | null>(null);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [err, setErr] = useState("");

  const [reviewText, setReviewText] = useState<Record<string, string>>({});
  const [reviewBusy, setReviewBusy] = useState<string | null>(null);
  const [reviewErr, setReviewErr] = useState<Record<string, string>>({});
  const [reviewChoiceBusy, setReviewChoiceBusy] = useState<string | null>(null);
  const [reviewMode, setReviewMode] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    try {
      const response: AxiosResponse = await AxiosConfig.get(
        API_ENDPOINTS.GET_CUSTOMER_PENDING_BOOKINGS
      );

      if (response.status === 200) {
        const bookingsData: Booking[] = response.data.bookings || [];
        setRows([...bookingsData].reverse());
      }
    } catch (x) {
      const axiosErr = x as AxiosError<ApiErrorBody>;
      setErr(
        axiosErr.response?.data?.message ||
          (x as Error).message ||
          "Failed to load rental requests."
      );
    }
  }, []);

  useEffect(() => {
    const syncAndLoad = async () => {
      const bookingId = searchParams.get("bookingId");
      const type = searchParams.get("type") === "balance" ? "balance" : "down";

      // If returning from successful Xendit payment, verify with server.
      if (paymentStatus === "success" && bookingId) {
        try {
          await AxiosConfig.post(API_ENDPOINTS.VERIFY_BOOKING(bookingId), { type });
        } catch (e) {
          console.error("Failed to sync payment status automatically", e);
        }
      }

      await load();
    };

    syncAndLoad();
  }, [load, paymentStatus, searchParams]);

  const handlePayDownpayment = async (bookingId: string) => {
    setErr("");
    setLoadingPayId(bookingId);

    try {
      const response: AxiosResponse<PayResponse> = await AxiosConfig.post(
        API_ENDPOINTS.PAY_DOWNPAYMENT(bookingId)
      );

      if (response.data?.invoiceUrl) {
        window.location.href = response.data.invoiceUrl;
      } else {
        setErr("Could not obtain checkout URL from payment gateway.");
        setLoadingPayId(null);
      }
    } catch (x) {
      const axiosErr = x as AxiosError<ApiErrorBody>;
      setErr(
        axiosErr.response?.data?.message ||
          (x as Error).message ||
          "Failed to initiate Xendit payment."
      );
      setLoadingPayId(null);
    }
  };

  const handlePayBalance = async (bookingId: string, method: "online" | "f2f") => {
    setErr("");
    setLoadingBalancePayId(bookingId);

    try {
      const response: AxiosResponse<PayResponse> = await AxiosConfig.post(
        API_ENDPOINTS.PAY_BALANCE(bookingId),
        { method }
      );

      if (method === "online") {
        if (response.data?.invoiceUrl) {
          window.location.href = response.data.invoiceUrl;
          return;
        }

        setErr("Could not obtain checkout URL from payment gateway.");
        setLoadingBalancePayId(null);
        return;
      }

      toast.success("Cash payment selected. The owner will confirm the payment once received.");
      await load();
    } catch (x) {
      const axiosErr = x as AxiosError<ApiErrorBody>;
      setErr(
        axiosErr.response?.data?.message ||
          (x as Error).message ||
          "Failed to process the balance payment."
      );
    } finally {
      setLoadingBalancePayId(null);
    }
  };

  const handleReviewDecision = async (
    bookingId: string,
    decision: "review" | "skip"
  ) => {
    setErr("");
    setReviewChoiceBusy(bookingId);

    try {
      await AxiosConfig.post(API_ENDPOINTS.REVIEW_DECISION(bookingId), { decision });

      if (decision === "review") {
        setReviewMode((current) => ({
          ...current,
          [bookingId]: true,
        }));

      } else {
        await load();
      }
    } catch (x) {
      const axiosErr = x as AxiosError<ApiErrorBody>;
      setErr(
        axiosErr.response?.data?.message ||
          (x as Error).message ||
          "Failed to process your review choice."
      );
    } finally {
      setReviewChoiceBusy(null);
    }
  };

  const submitReview = async (bookingId: string) => {
    const message = reviewText[bookingId]?.trim();

    if (!message) {
      setReviewErr((current) => ({
        ...current,
        [bookingId]: "Please write a review before submitting.",
      }));
      return;
    }

    setReviewBusy(bookingId);
    setReviewErr((current) => ({
      ...current,
      [bookingId]: "",
    }));

    try {
      await AxiosConfig.post(API_ENDPOINTS.CREATE_REVIEW(bookingId), { message });
      await AxiosConfig.post(API_ENDPOINTS.REVIEW_DECISION(bookingId), { decision: "review",});
      await AxiosConfig.post(API_ENDPOINTS.COMPLETE_AFTER_REVIEW(bookingId));

      toast.success("Review submitted and rental completed!");
      setReviewText((current) => ({
        ...current,
        [bookingId]: "",
      }));

      setReviewMode((current) => ({
        ...current,
        [bookingId]: false,
      }));

      await load();
    } catch (x) {
      const axiosErr = x as AxiosError<ApiErrorBody>;
      setReviewErr((current) => ({
        ...current,
        [bookingId]:
          axiosErr.response?.data?.message ||
          (x as Error).message ||
          "Failed to submit review.",
      }));
    } finally {
      setReviewBusy(null);
    }
  };

  const confirmCancel = async () => {
    if (!cancelingId) {
      return;
    }

    setErr("");
    setCancelBusy(true);

    try {
      await AxiosConfig.patch(API_ENDPOINTS.CANCEL_BOOKING(cancelingId));

      await load();
      setCancelingId(null);
    } catch (x) {
      const axiosErr = x as AxiosError<ApiErrorBody>;
      setErr(
        axiosErr.response?.data?.message ||
          (x as Error).message ||
          "Failed to cancel this rental."
      );
    } finally {
      setCancelBusy(false);
    }
  };

  const handleViewBooking = (booking: Booking) => {
    setSelectedBooking(booking);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">My rentals</h1>

      {paymentStatus === "success" && (
        <div className="rounded-md border border-teal bg-teal/10 p-3 text-sm font-medium text-teal">
          Payment received! Your booking is now waiting for your review decision.
        </div>
      )}

      {paymentStatus === "failed" && (
        <div className="rounded-md border border-coral bg-coral/10 p-3 text-sm font-medium text-coral">
          Payment was cancelled or unsuccessful. Please try again.
        </div>
      )}

      <ErrorNote text={err} />

      {rows === null ? (
        <p className="text-bay/60">Loading rentals...</p>
      ) : rows.length === 0 ? (
        <div className="panel space-y-3">
          <p>You have no active rentals right now.</p>
          <Link href="/cars" className="btn btn-primary inline-block">
            Find a car
          </Link>
        </div>
      ) : (
        rows.map((b) => {
          const car = typeof b.car === "object" ? (b.car as Car) : null;
          const owner = typeof b.owner === "object" ? (b.owner as User) : null;
          const carName = car?.name || "Car Rental";
          const carImage = car?.imageUrl;

          const showOwnerContact =
            owner &&
            [
              "confirmed",
              "ongoing",
              "returned",
              "review_pending",
            ].includes(b.status);

          const balanceMethod = paymentMethod(b.balancePayment);
          const isReviewPending = b.status === "review_pending";
          const isReviewMode = reviewMode[b._id] === true;

          return (
            <article key={b._id} className="panel space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex gap-3">
                  {carImage && (
                    <img
                      src={carImage}
                      alt={carName}
                      className="h-16 w-20 shrink-0 rounded-md object-cover"
                    />
                  )}

                  <div>
                    <h2 className="font-semibold">{carName}</h2>
                    <p className="text-sm text-bay/70">
                      {fmtDate(b.startDate)} to {fmtDate(b.endDate)} ·{" "}
                      {b.totalDays} {b.totalDays === 1 ? "day" : "days"}
                    </p>
                    <p className="text-sm font-semibold text-teal">
                      {peso(b.totalPrice)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge status={b.status} />
                  {b.downPayment?.status && (
                    <Badge status={b.downPayment.status} />
                  )}
                </div>
              </div>

              {showOwnerContact && owner && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-mist p-3 text-sm">
                  <div>
                    <p className="font-medium">
                      {owner.brandName || owner.name}
                    </p>
                    <p className="text-bay/60">Owner contact</p>
                  </div>
                  <a href={`tel:${owner.phone}`} className="btn btn-ghost py-1.5">
                    Call {owner.phone}
                  </a>
                </div>
              )}

              {b.status === "pending" && (
                <p className="text-sm text-bay/70">
                  Waiting for the owner to review your request.
                </p>
              )}

              {b.status === "approved" && (
                <p className="text-sm">
                  Approved! Pay the {peso(b.downPayment?.amount)} downpayment to
                  confirm your booking.
                </p>
              )}

              {b.status === "confirmed" && (
                <p className="text-sm text-bay/70">
                  Confirmed. The owner will hand over the car on the scheduled
                  start date.
                </p>
              )}

              {b.status === "ongoing" && (
                <p className="text-sm text-bay/70">
                  Your rental is ongoing. Enjoy the trip!
                </p>
              )}

              {b.status === "returned" && b.balancePayment?.status !== "paid" && (
                <div className="space-y-2 rounded-md border border-jeep/30 bg-jeep/10 p-3 text-sm">
                  {balanceMethod === "f2f" ? (
                    <p>
                      You chose to pay the remaining{" "}
                      {peso(b.balancePayment?.amount)} in cash. Hand it to the
                      owner in person. They will confirm once received.
                    </p>
                  ) : (
                    <>
                      <p className="font-medium">
                        The car has been returned. Settle the remaining balance of{" "}
                        {peso(b.balancePayment?.amount)} to complete this booking.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          className="btn btn-accent"
                          disabled={loadingBalancePayId === b._id}
                          onClick={() => handlePayBalance(b._id, "online")}
                        >
                          {loadingBalancePayId === b._id
                            ? "Redirecting..."
                            : "Pay online"}
                        </button>

                        <button
                          className="btn btn-ghost"
                          disabled={loadingBalancePayId === b._id}
                          onClick={() => handlePayBalance(b._id, "f2f")}
                        >
                          Pay face-to-face (cash)
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {isReviewPending && (
                <div className="space-y-4 rounded-md border border-teal/30 bg-teal/10 p-4">
                  {!isReviewMode ? (
                    <>
                      <div>
                        <h3 className="font-semibold">Your rental is finished!</h3>
                        <p className="mt-1 text-sm text-bay/70">
                          Your balance has been paid. Would you like to leave a
                          review for this rental?
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="btn btn-primary"
                          disabled={reviewChoiceBusy === b._id}
                          onClick={() => handleReviewDecision(b._id, "review")}
                        >
                          {reviewChoiceBusy === b._id
                            ? "Please wait..."
                            : "Leave a review"}
                        </button>

                        <button
                          type="button"
                          className="btn btn-ghost"
                          disabled={reviewChoiceBusy === b._id}
                          onClick={() => handleReviewDecision(b._id, "skip")}
                        >
                          {reviewChoiceBusy === b._id
                            ? "Please wait..."
                            : "Skip review"}
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <h3 className="font-semibold">Leave a review</h3>
                        <p className="mt-0.5 text-sm text-bay/60">
                          How was your rental with {carName}?
                        </p>
                      </div>

                      <textarea
                        className="input min-h-24 resize-none"
                        placeholder="Share your experience with this rental..."
                        value={reviewText[b._id] || ""}
                        maxLength={500}
                        onChange={(e) =>
                          setReviewText((current) => ({
                            ...current,
                            [b._id]: e.target.value,
                          }))
                        }
                        disabled={reviewBusy === b._id}
                      />

                      {reviewErr[b._id] && (
                        <p className="text-sm text-coral">{reviewErr[b._id]}</p>
                      )}

                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          className="btn btn-ghost"
                          disabled={reviewBusy === b._id}
                          onClick={() =>
                            setReviewMode((current) => ({
                              ...current,
                              [b._id]: false,
                            }))
                          }
                        >
                          Back
                        </button>

                        <button
                          type="button"
                          className="btn btn-primary"
                          disabled={reviewBusy === b._id}
                          onClick={() => submitReview(b._id)}
                        >
                          {reviewBusy === b._id
                            ? "Submitting..."
                            : "Submit review"}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {payFor === b._id && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-bay/10 bg-mist p-3">
                  <span className="text-sm font-medium">
                    Downpayment amount: {peso(b.downPayment?.amount)}
                  </span>

                  <div className="flex gap-2">
                    <button
                      className="btn btn-ghost"
                      disabled={loadingPayId === b._id}
                      onClick={() => setPayFor(null)}
                    >
                      Cancel
                    </button>

                    <button
                      className="btn btn-primary"
                      disabled={loadingPayId === b._id}
                      onClick={() => handlePayDownpayment(b._id)}
                    >
                      {loadingPayId === b._id
                        ? "Redirecting..."
                        : "Proceed to Checkout"}
                    </button>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-bay/10 pt-3">
                <div className="flex flex-wrap gap-2">
                  {b.status === "approved" &&
                    b.downPayment?.status !== "paid" &&
                    payFor !== b._id && (
                      <button
                        className="btn btn-accent"
                        onClick={() => setPayFor(b._id)}
                      >
                        Pay downpayment
                      </button>
                    )}

                  {b.status === "pending" && (
                    <button
                      className="btn btn-ghost text-coral hover:bg-coral/5"
                      onClick={() => setCancelingId(b._id)}
                    >
                      Cancel rental
                    </button>
                  )}
                </div>

                <button
                  className="btn btn-ghost text-sm font-medium"
                  onClick={() => handleViewBooking(b)}
                >
                  View booking
                </button>
              </div>
            </article>
          );
        })
      )}

      {isModalOpen && selectedBooking && (
        <ViewBookingModal
          booking={selectedBooking}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedBooking(null);
          }}
        />
      )}

      {cancelingId && (
        <ConfirmDialog
          title="Cancel this rental?"
          message="The owner will be notified and this request will no longer be reviewed. This can't be undone."
          confirmLabel="Cancel rental"
          cancelLabel="Keep it"
          danger
          busy={cancelBusy}
          onConfirm={confirmCancel}
          onClose={() => setCancelingId(null)}
        />
      )}
    </div>
  );
}

export default function Page() {
  return (
    <RequireRole role="customer">
      <MyRental />
    </RequireRole>
  );
}