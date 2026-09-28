"use client";

import Link from "next/link";
import type { Car } from "@/lib/types";

export default function CarCard({ car }: { car: Car }) {
  return (
    <Link
      href={`/cars/${car._id}`}
      className="panel flex h-full w-full flex-col overflow-hidden p-0 transition hover:shadow-md"
    >
      <img src={car.imageUrl} alt={car.name} className="h-40 w-full shrink-0 object-cover" />

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h2 className="line-clamp-1 font-semibold" title={car.name}>
          {car.name}
        </h2>

        {/* Always reserve two lines so a short or missing description doesn't shrink the card */}
        <p className="line-clamp-2 min-h-10 text-sm text-bay/70">{car.description}</p>

        {/* Long values (e.g. full street addresses) are cut off to one line instead of wrapping */}
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

        {/* mt-auto pins the price row to the bottom of every card */}
        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <p className="min-w-0 text-lg font-bold text-teal">
            ₱{car.rentalPrice.toLocaleString()}{" "}
            <span className="text-xs font-normal text-bay/60">/ day</span>
          </p>
          <span
            className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-xs font-medium ${
              car.isAvailable ? "text-teal" : "text-bay/50"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${car.isAvailable ? "bg-teal" : "bg-bay/30"}`} />
            {car.isAvailable ? "Available now" : "Currently unavailable"}
          </span>
        </div>
      </div>
    </Link>
  );
}