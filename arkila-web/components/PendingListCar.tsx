"use client";

import Badge from "@/components/Badge";
import type { Car } from "@/lib/types";

interface PendingListCarProps {
  car: Car;
  onClose: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  busy?: boolean;
}

export default function PendingListCar({ car, onClose, onApprove, onReject, busy }: PendingListCarProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="panel max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold">{car.name}</h2>
            <Badge status={car.listingStatus} />
          </div>
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>

        <img src={car.imageUrl} alt={car.name} className="h-48 w-full rounded-md object-cover" />

        {car.description && <p className="text-sm text-bay/70">{car.description}</p>}

        <dl className="grid grid-cols-2 gap-2 text-sm">
          <dt className="text-bay/60">Vehicle type</dt>
          <dd className="capitalize">{car.vehicleType}</dd>

          <dt className="text-bay/60">Fuel type</dt>
          <dd className="capitalize">{car.fuelType}</dd>

          <dt className="text-bay/60">Seats</dt>
          <dd>{car.seats}</dd>

          <dt className="text-bay/60">Location</dt>
          <dd>{car.location}</dd>

          <dt className="text-bay/60">Rental price</dt>
          <dd>₱{car.rentalPrice.toLocaleString()} / day</dd>

          <dt className="text-bay/60">Submitted</dt>
          <dd>{new Date(car.createdAt).toLocaleDateString()}</dd>
        </dl>

        {car.adminNote && (
          <p className="rounded-md bg-mist p-2 text-sm text-coral">Admin note: {car.adminNote}</p>
        )}

        <div className="space-y-2">
          <p className="label">Certificate of Registration submitted</p>
          <img src={car.registrationImageUrl} alt="Certificate of Registration" className="max-h-64 w-full rounded-md border object-contain"/>
        </div>

        {(onApprove || onReject) ? (
          <div className="flex gap-2 pt-2">
            {onApprove && (
              <button className="btn btn-primary" disabled={busy} onClick={onApprove}>
                {busy ? "Please wait..." : "Approve listing"}
              </button>
            )}
            {onReject && (
              <button className="btn btn-ghost" disabled={busy} onClick={onReject}>
                Reject
              </button>
            )}
          </div>
        ) : car.listingStatus === "pending" ? (
          <p className="rounded-md bg-mist p-3 text-xs text-bay/70">
            This listing is waiting for an admin to review it. It will move to your car list automatically once approved.
          </p>
        ) : null}
      </div>
    </div>
  );
}