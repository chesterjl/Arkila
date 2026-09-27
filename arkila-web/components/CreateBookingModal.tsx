"use client";

import { useState } from "react";
import AxiosConfig from "@/app/services/AxiosConfig";
import { API_ENDPOINTS } from "@/app/services/ApiEndpoint";
import { ErrorNote, Field } from "@/components/Field";
import type { Car } from "@/lib/types";
import type { AxiosError, AxiosResponse } from "axios";

interface ApiErrorBody {
  success: false;
  message: string;
}

interface CreateBookingModalProps {
  car: Car;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const today = () => new Date().toISOString().split("T")[0];
const peso = (n?: number) =>
  typeof n === "number"
    ? `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`
    : "₱0.00";

const ID_TYPES = [
  "Drivers License",
  "Passport",
  "SSID / UMID",
  "Postal ID",
  "Voters ID",
  "National ID",
];

const DELIVERY_METHODS = [
  { label: "Self Pickup & Self Return", value: "self_pickup_self_return" },
  { label: "Self Pickup & Owner Pickup", value: "self_pickup_owner_pickup" },
  { label: "Owner Delivery & Self Return", value: "owner_delivery_self_return" },
  { label: "Owner Delivery & Owner Pickup", value: "owner_delivery_owner_pickup" },
];

export default function CreateBookingModal({
  car,
  isOpen,
  onClose,
  onSuccess,
}: CreateBookingModalProps) {
  const [formData, setFormData] = useState({
    startDate: "",
    endDate: "",
    idType: ID_TYPES[0],
    deliveryMethod: "self_pickup_self_return",
  });
  const [file, setFile] = useState<File | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  if (!isOpen) return null;

  // Calculation helpers
  const calculateDays = () => {
    if (!formData.startDate || !formData.endDate) return 0;
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    const diffTime = end.getTime() - start.getTime();
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  const days = calculateDays();
  const totalCost = days * car.rentalPrice;

  const problem =
    formData.startDate && formData.endDate && days < 1
      ? "Return date must be after pickup date."
      : "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");

    try {
      // Use FormData to allow sending text fields along with optional/required file uploads
      const data = new FormData();
      data.append("carId", car._id);
      data.append("startDate", formData.startDate);
      data.append("endDate", formData.endDate);
      data.append("idType", formData.idType);
      data.append("deliveryMethod", formData.deliveryMethod);
      if (file) {
        data.append("idImage", file);
      }

      const response: AxiosResponse = await AxiosConfig.post(
        API_ENDPOINTS.CREATE_BOOKING,
        data,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.status === 201 || response.status === 200) {
        onSuccess();
      }
    } catch (x) {
      const axiosErr = x as AxiosError<ApiErrorBody>;
      setErr(
        axiosErr.response?.data?.message ||
          (x as Error).message ||
          "Failed to submit booking request."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl space-y-5">
        <div className="flex items-center justify-between border-b border-bay/10 pb-3">
          <h2 className="text-xl font-bold text-bay">Request to Rent Vehicle</h2>
          <button
            onClick={onClose}
            className="text-bay/50 hover:text-bay text-lg font-bold"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Pickup Date">
              <input
                type="date"
                required
                className="input w-full"
                min={today()}
                value={formData.startDate}
                onChange={(e) =>
                  setFormData({ ...formData, startDate: e.target.value })
                }
              />
            </Field>
            <Field label="Return Date">
              <input
                type="date"
                required
                className="input w-full"
                min={formData.startDate || today()}
                value={formData.endDate}
                onChange={(e) =>
                  setFormData({ ...formData, endDate: e.target.value })
                }
              />
            </Field>
          </div>

          <Field label="Delivery / Pickup Method">
            <select
              className="input w-full"
              value={formData.deliveryMethod}
              onChange={(e) =>
                setFormData({ ...formData, deliveryMethod: e.target.value })
              }
            >
              {DELIVERY_METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="ID Document Type">
            <select
              className="input w-full"
              value={formData.idType}
              onChange={(e) =>
                setFormData({ ...formData, idType: e.target.value })
              }
            >
              {ID_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Upload ID Document (Image)">
            <input
              type="file"
              accept="image/*"
              className="input w-full py-1 text-sm"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <p className="mt-1 text-xs text-bay/50">
              Required if you haven't uploaded an ID before.
            </p>
          </Field>

          {days > 0 && !problem && (
            <div className="space-y-2 rounded-lg bg-bay/5 p-3 text-sm">
              <div className="flex justify-between text-bay/70">
                <span>
                  {peso(car.rentalPrice)} × {days} {days === 1 ? "day" : "days"}
                </span>
                <span>{peso(totalCost)}</span>
              </div>
              <div className="flex justify-between font-bold text-base text-bay border-t border-bay/10 pt-2">
                <span>Estimated Total</span>
                <span>{peso(totalCost)}</span>
              </div>
            </div>
          )}

          <ErrorNote text={problem || err} />

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-bay/10">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary px-4 py-2 text-sm"
              disabled={busy}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary px-5 py-2 text-sm font-semibold"
              disabled={!formData.startDate || !formData.endDate || !!problem || busy}
            >
              {busy ? "Submitting..." : "Submit Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}