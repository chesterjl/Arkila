"use client";

import Link from "next/link";
import type { Car } from "@/lib/types";

export default function CarCard({ car }: { car: Car }) {
  return (
    <Link href={`/cars/${car._id}`} className="panel flex flex-col overflow-hidden p-0 transition hover:shadow-md">
      <img src={car.imageUrl} alt={car.name} className="h-40 w-full object-cover" />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h2 className="font-semibold">{car.name}</h2>
        {car.description && <p className="line-clamp-2 text-sm text-bay/70">{car.description}</p>}
        <dl className="grid grid-cols-2 gap-1 text-xs text-bay/70">
          <dt>Type</dt><dd className="text-right capitalize">{car.vehicleType}</dd>
          <dt>Fuel</dt><dd className="text-right capitalize">{car.fuelType}</dd>
          <dt>Seats</dt><dd className="text-right">{car.seats}</dd>
          <dt>Location</dt><dd className="text-right">{car.location}</dd>
        </dl>
        <div className="flex items-center justify-between gap-2 pt-1">
          <p className="text-lg font-bold text-teal">
            ₱{car.rentalPrice.toLocaleString()} <span className="text-xs font-normal text-bay/60">/ day</span>
          </p>
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-medium ${
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