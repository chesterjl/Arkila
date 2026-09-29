import type { Booking, Car, IdDocument, User } from "@/lib/types";
import { fmtDate, peso, feeOf, payoutOf, DEFAULT_SERVICE_FEE_PCT } from "@/lib/booking";
import Badge from "@/components/Badge";

interface ViewBookingModalProps {
  booking: Booking;
  onClose: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  busy?: boolean;
}

const paymentChannelLabel = (payment?: { method?: string }) =>
  payment?.method === "f2f" ? "Face-to-face / cash" : "Online via Xendit";

export default function ViewBookingModal({ booking, onClose, onApprove, onReject, busy }: ViewBookingModalProps) {
  const car = typeof booking.car === "object" ? (booking.car as Car) : null;
  const customer = typeof booking.customer === "object" ? (booking.customer as User) : null;
  const idDoc = typeof booking.idDocument === "object" ? (booking.idDocument as IdDocument) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="panel w-full max-w-lg space-y-0 overflow-y-auto p-0 max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        {car?.imageUrl && (
          <img src={car.imageUrl} alt={car.name} className="h-44 w-full rounded-t-lg object-cover" />
        )}

        <div className="space-y-4 p-5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-xl font-bold">{car ? car.name : "Booking details"}</h2>
              <div className="mt-1.5">
                <Badge status={booking.status} />
              </div>
            </div>
            <button className="btn btn-ghost" onClick={onClose}>Close</button>
          </div>

          {customer && (
            <div className="flex items-center gap-3 rounded-md bg-mist p-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-bay text-xs font-bold text-white">
                {customer.name.slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1 text-sm">
                <p className="truncate font-medium">{customer.name}</p>
                <a href={`tel:${customer.phone}`} className="text-teal hover:underline">
                  {customer.phone}
                </a>
              </div>
              <a href={`tel:${customer.phone}`} className="btn btn-ghost shrink-0 py-1.5 text-xs">
                Call
              </a>
            </div>
          )}

          <dl className="divide-y divide-bay/10 text-sm">
            <div className="flex items-center justify-between py-2">
              <dt className="text-bay/60">Dates</dt>
              <dd className="text-right">
                {fmtDate(booking.startDate)} to {fmtDate(booking.endDate)} ({booking.totalDays} days)
              </dd>
            </div>
            <div className="flex items-center justify-between py-2">
              <dt className="text-bay/60">Delivery</dt>
              <dd className="text-right capitalize">{booking.deliveryMethod.replaceAll("_", " ")}</dd>
            </div>
            {car?.location && (
              <div className="flex items-center justify-between py-2">
                <dt className="text-bay/60">Car location</dt>
                <dd className="text-right">{car.location}</dd>
              </div>
            )}
            {customer?.address && (
              <div className="flex items-center justify-between py-2">
                <dt className="text-bay/60">Customer address</dt>
                <dd className="text-right">{customer.address}</dd>
              </div>
            )}
          </dl>

          <div className="space-y-3 rounded-md border border-bay/10 bg-mist p-4">
            <div className="flex items-center justify-between">
              <p className="font-semibold">Total price</p>
              <p className="font-bold">{peso(booking.totalPrice)}</p>
            </div>

            <div className="space-y-1 text-xs text-bay/60">
              <div className="flex justify-between">
                <span>Platform service fee ({booking.serviceFeePercent ?? DEFAULT_SERVICE_FEE_PCT}%)</span>
                <span>{peso(feeOf(booking))}</span>
              </div>
              <div className="flex justify-between">
                <span>Owner payout</span>
                <span>{peso(payoutOf(booking))}</span>
              </div>
            </div>

            <div className="divide-y divide-bay/10">
              <div className="space-y-1.5 pb-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-bay/70">Downpayment</span>
                  <span className="font-medium">{peso(booking.downPayment.amount)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-bay/60">{paymentChannelLabel(booking.downPayment)}</span>
                  <Badge status={booking.downPayment.status} />
                </div>
              </div>

              <div className="space-y-1.5 pt-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-bay/70">Remaining balance</span>
                  <span className="font-medium">{peso(booking.balancePayment.amount)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-bay/60">{paymentChannelLabel(booking.balancePayment)}</span>
                  <Badge status={booking.balancePayment.status} />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="label">Renter&apos;s Government ID</p>
            {idDoc?.imageUrl ? (
              <>
                <img src={idDoc.imageUrl} alt="Renter ID" className="max-h-64 w-full rounded-md border object-contain" />
              </>
            ) : (
              <p className="text-sm text-coral">No ID on file yet.</p>
            )}
          </div>

          {(onApprove || onReject) && booking.status === "pending" && (
            <div className="flex gap-2 border-t border-bay/10 pt-3">
              {onApprove && (
                <button className="btn btn-primary flex-1" disabled={busy} onClick={onApprove}>
                  {busy ? "Please wait" : "Approve"}
                </button>
              )}
              {onReject && (
                <button className="btn btn-ghost" disabled={busy} onClick={onReject}>
                  Decline
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}