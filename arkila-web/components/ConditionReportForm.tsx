"use client";

import { useState, type FormEvent } from "react";
import AxiosConfig from "@/app/services/AxiosConfig";
import { API_ENDPOINTS } from "@/app/services/ApiEndpoint";
import type { Booking } from "@/lib/types";
import { ErrorNote, Field } from "./Field";
import type { AxiosError, AxiosResponse } from "axios";

interface ApiErrorBody {
  success: false;
  message: string;
}

interface ConditionReportFormProps {
  booking: Booking;
  onDone: () => void;
}

export default function ConditionReportForm({
  booking,
  onDone,
}: ConditionReportFormProps) {
  const [isGoodCondition, setIsGoodCondition] = useState<boolean>(true);
  const [notes, setNotes] = useState<string>("");
  const [err, setErr] = useState<string>("");
  const [busy, setBusy] = useState<boolean>(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr("");
    setBusy(true);

    try {
      const response: AxiosResponse = await AxiosConfig.patch(API_ENDPOINTS.RETURN_BOOKING(booking._id),
        {
          isGoodCondition,
          notes,
        }
      );

      if (response.status === 200 || response.status === 204) {
        onDone();
      } else {
        setErr("Failed to log the car return.");
        setBusy(false);
      }
    } catch (x) {
      const axiosErr = x as AxiosError<ApiErrorBody>;
      setErr(
        axiosErr.response?.data?.message ||
          (x as Error).message ||
          "An error occurred while logging the return."
      );
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-md bg-mist p-4 border border-bay/10">
      <h3 className="font-semibold text-lg">Log Vehicle Return Condition</h3>
      <Field label="Vehicle Condition Status">
        <div className="flex gap-4 pt-1">
          <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
            <input
              type="radio"
              name="condition"
              checked={isGoodCondition === true}
              onChange={() => setIsGoodCondition(true)}
              className="accent-teal"
            />
            Good Condition (No new damage)
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
            <input
              type="radio"
              name="condition"
              checked={isGoodCondition === false}
              onChange={() => setIsGoodCondition(false)}
              className="accent-teal"
            />
            Issues / Damaged
          </label>
        </div>
      </Field>

      <Field label="Return notes (optional)">
        <textarea
          className="input w-full"
          rows={3}
          value={notes}
          placeholder="e.g. Returned clean, minor scratch on rear bumper, ₱200 cleaning fee..."
          onChange={(e) => setNotes(e.target.value)}
        />
      </Field>

      <ErrorNote text={err} />

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="submit"
          className="btn btn-primary"
          disabled={busy}
        >
          {busy ? "Submitting..." : "Confirm Car Return"}
        </button>
      </div>
    </form>
  );
}