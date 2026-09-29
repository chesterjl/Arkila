"use client";

import { useState, useEffect, type FormEvent } from "react";
import AxiosConfig from "@/app/services/AxiosConfig";
import { API_ENDPOINTS } from "@/app/services/ApiEndpoint";
import Badge from "@/components/Badge";
import { feeSplit, peso, DEFAULT_SERVICE_FEE_PCT } from "@/lib/booking";
import { Field, ErrorNote } from "@/components/Field";
import type { Car, VehicleType, FuelType } from "@/lib/types";
import type { AxiosError } from "axios";
import toast from "react-hot-toast";

interface ApiErrorBody {
  success: false;
  message: string;
}

const VEHICLE_TYPES = [
  "sedan",
  "suv",
  "hatchback",
  "van",
  "pickup",
  "motorcycle",
  "other",
] as const;

const FUEL_TYPES = ["gasoline", "diesel", "electric", "hybrid"] as const;

interface CarFormModalProps {
  car?: Car | null;
  onClose: () => void;
  onSaved: (car: Car) => void;
  onDeleted?: (id: string) => void;
}

export default function CarFormModal({
  car,
  onClose,
  onSaved,
  onDeleted,
}: CarFormModalProps) {
  const isEditing = Boolean(car);

  const [form, setForm] = useState<{
    name: string;
    description: string;
    rentalPrice: string;
    vehicleType: VehicleType;
    fuelType: FuelType;
    location: string;
    seats: string;
    isAvailable: boolean;
  }>({
    name: car?.name || "",
    description: car?.description || "",
    rentalPrice: car ? String(car.rentalPrice) : "",
    vehicleType: (car?.vehicleType as VehicleType) || VEHICLE_TYPES[0],
    fuelType: (car?.fuelType as FuelType) || FUEL_TYPES[0],
    location: car?.location || "",
    seats: car ? String(car.seats) : "",
    isAvailable: car?.isAvailable ?? true,
  });

  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(
    car?.imageUrl || null
  );

  const [registrationImage, setRegistrationImage] = useState<File | null>(null);
  const [registrationPreview, setRegistrationPreview] = useState<string | null>(
    car?.registrationImageUrl || null
  );

  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState("");

  const [deleting, setDeleting] = useState(false);
  const [deleteErr, setDeleteErr] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const canDelete = car?.isAvailable;
  const priceNum = Number(form.rentalPrice);
  const split = priceNum > 0 ? feeSplit(priceNum) : null;

  useEffect(() => {
    if (image) {
      const url = URL.createObjectURL(image);
      setImagePreview(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [image]);

  useEffect(() => {
    if (registrationImage) {
      const url = URL.createObjectURL(registrationImage);
      setRegistrationPreview(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [registrationImage]);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setSaveErr("");

    if (!isEditing) {
      if (!image) return setSaveErr("Please add a photo of the car.");
      if (!registrationImage)
        return setSaveErr("Please add the car's Certificate of Registration (CR).");
    }

    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("name", form.name);
      fd.append("description", form.description);
      fd.append("rentalPrice", form.rentalPrice);
      fd.append("vehicleType", form.vehicleType);
      fd.append("fuelType", form.fuelType);
      fd.append("location", form.location);
      fd.append("seats", form.seats);
      fd.append("isAvailable", String(form.isAvailable));

      if (image) fd.append("image", image);
      if (registrationImage)
        fd.append("registrationImage", registrationImage);

      const endpoint = isEditing ? API_ENDPOINTS.UPDATE_CAR(car!._id) : API_ENDPOINTS.CREATE_CAR;
      const method = isEditing ? AxiosConfig.put : AxiosConfig.post;
      const { data } = await method(endpoint, fd);
      
      toast.success(isEditing ? "Updated the car successfully" : "Car submitted for admin review");
      onSaved(data.car);
    } catch (e) {
      const axiosErr = e as AxiosError<ApiErrorBody>;
      setSaveErr(
        axiosErr.response?.data?.message ||
          (e as Error).message ||
          `Failed to ${isEditing ? "update" : "submit"} car.`
      );
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!canDelete || !car || !onDeleted) return;
    setDeleteErr("");
    setDeleting(true);
    try {
      await AxiosConfig.delete(API_ENDPOINTS.DELETE_CAR(car._id));
      
      toast.success("Deleted the car successfully");
      onDeleted(car._id);
    } catch (e) {
      const axiosErr = e as AxiosError<ApiErrorBody>;
      setDeleteErr(
        axiosErr.response?.data?.message ||
          (e as Error).message ||
          "Failed to delete car."
      );
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="panel max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold">
              {isEditing ? `Manage ${car?.name}` : "Request a new car listing"}
            </h2>
            {isEditing && car ? (
              <div className="mt-1 flex items-center gap-2">
                <Badge status={car.listingStatus} />
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    car.isAvailable
                      ? "bg-teal/10 text-teal"
                      : "bg-coral/10 text-coral"
                  }`}
                >
                  {car.isAvailable ? "Available" : "Unavailable"}
                </span>
              </div>
            ) : (
              <p className="text-sm text-bay/70">
                An admin checks the Certificate of Registration before this goes public.
              </p>
            )}
          </div>
          <button className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>

        {car?.adminNote && (
          <p className="rounded-md bg-mist p-2 text-sm text-coral">
            Admin note: {car.adminNote}
          </p>
        )}

        <form onSubmit={save} className="space-y-3">
          <Field label="Car name">
            <input
              className="input"
              required
              placeholder="e.g. Honda Civic 2025"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>

          <Field label="Description">
            <textarea
              className="input"
              rows={3}
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Rental price / day">
              <input
                type="number"
                min={1}
                className="input"
                required
                value={form.rentalPrice}
                onChange={(e) =>
                  setForm({ ...form, rentalPrice: e.target.value })
                }
              />
            </Field>

            <Field label="Seats">
              <input
                type="number"
                min={1}
                className="input"
                required
                value={form.seats}
                onChange={(e) => setForm({ ...form, seats: e.target.value })}
              />
            </Field>
          </div>

          {split && (
            <div className="space-y-1 rounded-md border border-bay/10 bg-mist p-3 text-sm">
              <div className="flex justify-between text-bay/70">
                <span>Platform service fee ({DEFAULT_SERVICE_FEE_PCT}%)</span>
                <span>{peso(split.fee)} / day</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Total Rent Price:</span>
                <span>{peso(split.ownerShare)} / day</span>
              </div>
              <p className="text-xs text-bay/60">
                Renters pay the listed price and see this fee too. It is deducted from each completed rental automatically.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Vehicle type">
              <select
                className="input"
                value={form.vehicleType}
                onChange={(e) =>
                  setForm({ ...form, vehicleType: e.target.value as VehicleType })
                }
              >
                {VEHICLE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Fuel type">
              <select
                className="input"
                value={form.fuelType}
                onChange={(e) =>
                  setForm({ ...form, fuelType: e.target.value as FuelType })
                }
              >
                {FUEL_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Location">
            <input
              className="input"
              required
              placeholder="e.g. Sampaloc"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
          </Field>

          {isEditing && (
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={form.isAvailable}
                onChange={(e) =>
                  setForm({ ...form, isAvailable: e.target.checked })
                }
              />
              Available for booking
            </label>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label={isEditing ? "Replace car photo" : "Car photo"}>
              <div className="space-y-2">
                {imagePreview && (
                  <img src={imagePreview} alt="Car preview" className="h-24 w-full rounded border object-cover"/>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="input"
                  required={!isEditing}
                  onChange={(e) => setImage(e.target.files?.[0] || null)}
                />
              </div>
            </Field>

            <Field
              label={
                isEditing
                  ? "Replace CR photo"
                  : "Certificate of Registration"
              }
            >
              <div className="space-y-2">
                {registrationPreview && (
                  <img src={registrationPreview} alt="Registration preview" className="h-24 w-full rounded border object-cover"/>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="input"
                  required={!isEditing}
                  onChange={(e) =>
                    setRegistrationImage(e.target.files?.[0] || null)
                  }
                />
              </div>
            </Field>
          </div>

          <ErrorNote text={saveErr} />

          <button className="btn btn-primary w-full" disabled={saving}>
            {saving
              ? isEditing
                ? "Saving..."
                : "Submitting..."
              : isEditing
              ? "Save changes"
              : "Submit for admin review"}
          </button>
        </form>

        {isEditing && (
          <div className="space-y-2 border-t border-bay/10 pt-4">
            {!canDelete && (
              <p className="text-sm text-coral">
                This car is currently unavailable and can&apos;t be deleted.
                Mark it available above, save, then delete.
              </p>
            )}
            <ErrorNote text={deleteErr} />
            {!confirmingDelete ? (
              <button
                type="button"
                className="btn btn-ghost w-full text-coral"
                disabled={!canDelete}
                onClick={() => setConfirmingDelete(true)}
              >
                Delete this car
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn btn-ghost flex-1"
                  onClick={() => setConfirmingDelete(false)}
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary flex-1"
                  onClick={remove}
                  disabled={deleting}
                >
                  {deleting ? "Deleting..." : "Confirm delete"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}