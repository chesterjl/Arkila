"use client";

import Badge from "@/components/Badge";
import type { Car } from "@/lib/types";

interface CarOwnerCardProps {
  car: Car;
  showDescription?: boolean;
  showBadge?: boolean;
  actionLabel?: string;
  onAction?: (car: Car) => void;
  actionClass?: string;
  onToggleAvailability?: (car: Car) => void;
  togglingAvailability?: boolean;
}

export default function CarOwnerCard({
  car,
  showDescription = true,
  showBadge = true,
  actionLabel,
  onAction,
  actionClass = "mt-3 w-full rounded-lg bg-teal/10 py-2 text-sm font-semibold text-teal hover:bg-teal hover:text-white transition-colors duration-200",
  onToggleAvailability,
  togglingAvailability = false,
}: CarOwnerCardProps) {
  const isApproved = car.listingStatus === "approved";

  return (
    <div className="panel flex flex-col overflow-hidden p-0 transition hover:shadow-md">
      <img src={car.imageUrl} alt={car.name} className="h-40 w-full object-cover" />
      
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h2 className="font-semibold">{car.name}</h2>
          {showBadge && <Badge status={car.listingStatus} />}
        </div>

        {showDescription && car.description && (
          <p className="line-clamp-2 text-sm text-bay/70">{car.description}</p>
        )}

        <dl className="grid grid-cols-2 gap-1 text-xs text-bay/70">
          <dt>Type</dt>
          <dd className="text-right capitalize">{car.vehicleType}</dd>
          <dt>Fuel</dt>
          <dd className="text-right capitalize">{car.fuelType}</dd>
          <dt>Seats</dt>
          <dd className="text-right">{car.seats}</dd>
          <dt>Location</dt>
          <dd className="text-right">{car.location}</dd>
        </dl>

        <div className="flex items-center justify-between gap-2 pt-1">
          <p className="text-lg font-bold text-teal">
            ₱{car.rentalPrice.toLocaleString()}{" "}
            <span className="text-xs font-normal text-bay/60">/ day</span>
          </p>

          {isApproved && (
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                car.isAvailable ? "text-teal" : "text-bay/50"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${car.isAvailable ? "bg-teal" : "bg-bay/30"}`} />
              {car.isAvailable ? "Available for rent" : "Currently unavailable"}
            </span>
          )}
        </div>

        {isApproved && onToggleAvailability && (
          <button
            type="button"
            className="rounded-md border border-bay/15 py-1.5 text-xs font-semibold text-bay transition-colors hover:bg-bay/5 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={togglingAvailability}
            onClick={() => onToggleAvailability(car)}
          >
            {togglingAvailability
              ? "Updating..."
              : car.isAvailable
              ? "Mark unavailable"
              : "Mark available for rent"}
          </button>
        )}

        {actionLabel && onAction && (
          <button
            type="button"
            className={actionClass}
            onClick={() => onAction(car)}
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}