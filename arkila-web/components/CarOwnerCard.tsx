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
  actionClass = "w-full rounded-lg bg-teal/10 py-2 text-sm font-semibold text-teal hover:bg-teal hover:text-white transition-colors duration-200",
  onToggleAvailability,
  togglingAvailability = false,
}: CarOwnerCardProps) {
  const isApproved = car.listingStatus === "approved";

  return (
    <div className="panel flex h-full flex-col overflow-hidden p-0 transition hover:shadow-md">
      <img src={car.imageUrl} alt={car.name} className="h-40 w-full shrink-0 object-cover" />

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h2 className="line-clamp-1 min-w-0 font-semibold" title={car.name}>
            {car.name}
          </h2>
          {showBadge && (
            <span className="shrink-0">
              <Badge status={car.listingStatus} />
            </span>
          )}
        </div>

        {showDescription && (
          <p className="line-clamp-2 min-h-10 text-sm text-bay/70">{car.description}</p>
        )}

        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-xs text-bay/70">
          <dt>Type</dt>
          <dd className="truncate text-right capitalize">{car.vehicleType}</dd>
          <dt>Fuel</dt>
          <dd className="truncate text-right capitalize">{car.fuelType}</dd>
          <dt>Seats</dt>
          <dd className="truncate text-right">{car.seats}</dd>
          <dt>Location</dt>
          <dd className="truncate text-right" title={car.location}>
            {car.location}
          </dd>
        </dl>

        {/* mt-auto pins the price and buttons to the bottom of every card */}
        <div className="mt-auto space-y-2 pt-1">
          <div className="flex items-center justify-between gap-2">
            <p className="min-w-0 text-lg font-bold text-teal">
              ₱{car.rentalPrice.toLocaleString()}{" "}
              <span className="text-xs font-normal text-bay/60">/ day</span>
            </p>

            {isApproved && (
              <span
                className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-xs font-medium ${
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
              className="w-full rounded-md border border-bay/15 py-1.5 text-xs font-semibold text-bay transition-colors hover:bg-bay/5 disabled:cursor-not-allowed disabled:opacity-50"
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
            <button type="button" className={actionClass} onClick={() => onAction(car)}>
              {actionLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}