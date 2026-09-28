// cars/[id]/page.tsx
"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import AxiosConfig from "@/app/services/AxiosConfig";
import { API_ENDPOINTS } from "@/app/services/ApiEndpoint";
import { Field, ErrorNote } from "@/components/Field";
import type { Car } from "@/lib/types";
import type { AxiosError } from "axios";
import toast from "react-hot-toast";

interface ApiErrorBody {
  success: false;
  message: string;
}

const DELIVERY_METHODS = [
  { value: "self_pickup_self_return", label: "Self Pick-up & Self Return" },
  { value: "self_pickup_owner_pickup", label: "Self Pick-up & Owner Pick-up" },
  { value: "owner_delivery_self_return", label: "Owner Delivery & Self Return" },
  { value: "owner_delivery_owner_pickup", label: "Owner Delivery & Owner Pick-up" },
] as const;

const today = () => new Date().toISOString().split("T")[0];

export default function CarDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id as string;
  const router = useRouter();

  const [car, setCar] = useState<Car | null>(null);
  const [loadErr, setLoadErr] = useState("");

  const [form, setForm] = useState({
    startDate: "",
    endDate: "",
    deliveryMethod: DELIVERY_METHODS[0].value as string,
  });
  const [idImage, setIdImage] = useState<File | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState("");

  useEffect(() => {
    if (!id) return;

    AxiosConfig.get(API_ENDPOINTS.GET_CAR(id))
      .then(({ data }) => setCar(data.car))
      .catch((e) => {
        const axiosErr = e as AxiosError<ApiErrorBody>;
        setLoadErr(axiosErr.response?.data?.message || (e as Error).message || "Failed to load this car.");
      });
  }, [id]);

  const totalDays =  form.startDate && form.endDate && form.endDate > form.startDate
      ? Math.max(1, Math.ceil((new Date(form.endDate).getTime() - new Date(form.startDate).getTime()) / 86400000))
      : 0;

  const totalPrice = car ? totalDays * car.rentalPrice : 0;
  const canBook = car ? car.isAvailable && car.listingStatus === "approved" : false;

  const submit = async (e: FormEvent) => {
    e.preventDefault();

    setSubmitErr("");

    if (!form.startDate || !form.endDate) return setSubmitErr("Please choose both a pickup and return date.");
    if (form.endDate <= form.startDate) return setSubmitErr("Return date must be after the pickup date.");

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("carId", id);
      fd.append("startDate", form.startDate);
      fd.append("endDate", form.endDate);
      fd.append("deliveryMethod", form.deliveryMethod);
      if (idImage) fd.append("idImage", idImage);

      const response = await AxiosConfig.post(API_ENDPOINTS.CREATE_BOOKING, fd);

      if (response.status === 201) {
        toast.success("Rental request submitted")
        router.push("/customer/bookings");
      }
    } catch (e) {
      const axiosErr = e as AxiosError<ApiErrorBody>;
      setSubmitErr(axiosErr.response?.data?.message || (e as Error).message || "Failed to submit your booking request.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadErr) return <ErrorNote text={loadErr} />;
  if (!car) return <p className="text-bay/60">Loading car...</p>;

  return (
    <div className="grid gap-6 md:grid-cols-2 ">
      <div className="space-y-4">
        <img src={car.imageUrl} alt={car.name} className="h-64 w-full rounded-md object-cover" />
        <div className="panel space-y-2">
          <h1 className="text-2xl font-bold">{car.name}</h1>
          {car.description && <p className="text-sm text-bay/70">{car.description}</p>}
          <dl className="grid grid-cols-2 gap-1 text-sm text-bay/70">
            <dt>Type</dt><dd className="text-right capitalize">{car.vehicleType}</dd>
            <dt>Fuel</dt><dd className="text-right capitalize">{car.fuelType}</dd>
            <dt>Seats</dt><dd className="text-right">{car.seats}</dd>
            <dt>Location</dt><dd className="text-right">{car.location}</dd>
          </dl>
          <div className="flex items-center justify-between gap-2 pt-1">
            <p className="text-xl font-bold text-teal">
              ₱{car.rentalPrice.toLocaleString()} <span className="text-sm font-normal text-bay/60">/ day</span>
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
      </div>

      <div className="panel space-y-5">
        <div>
          <h2 className="text-lg font-semibold">Request this car</h2>
          <p className="text-sm text-bay/60">Pick your dates and we&apos;ll work out the total below.</p>
        </div>

        {!canBook ? (
          <p className="rounded-md bg-mist p-3 text-sm text-coral">
            This car isn&apos;t currently accepting rental requests.
          </p>
        ) : (
          <form onSubmit={submit} className="space-y-5">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Pickup date">
                  <input
                    type="date"
                    className="input"
                    required
                    min={today()}
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  />
                </Field>
                <Field label="Return date">
                  <input
                    type="date"
                    className="input"
                    required
                    min={form.startDate || today()}
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  />
                </Field>
              </div>

              <Field label="Delivery / return method">
                <select
                  className="input"
                  value={form.deliveryMethod}
                  onChange={(e) => setForm({ ...form, deliveryMethod: e.target.value })}
                >
                  {DELIVERY_METHODS.map((d) => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="space-y-1 border-t border-bay/10 pt-4">
              <Field label="Government ID">
                <input
                  type="file"
                  accept="image/*"
                  className="input file:mr-3 file:rounded-md file:border-0 file:bg-bay/10 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-bay hover:file:bg-bay/20"
                  onChange={(e) => setIdImage(e.target.files?.[0] || null)}
                />
              </Field>
              <p className="text-xs text-bay/60">Required for account verification and security compliance.</p>
            </div>

            {totalDays > 0 && (
              <div className="space-y-1.5 rounded-md bg-mist p-4 text-sm">
                <div className="flex justify-between text-bay/70">
                  <span>{totalDays} {totalDays === 1 ? "day" : "days"} × ₱{car.rentalPrice.toLocaleString()}</span>
                  <span>₱{totalPrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-t border-bay/10 pt-1.5 text-base font-bold text-bay">
                  <span>Total</span>
                  <span className="text-teal">₱{totalPrice.toLocaleString()}</span>
                </div>
                <p className="pt-0.5 text-xs text-bay/60">A downpayment is required once the owner approves your request.</p>
              </div>
            )}

            <ErrorNote text={submitErr} />
            <button className="btn btn-primary w-full" disabled={submitting}>
              {submitting ? "Submitting..." : "Submit rental request"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}