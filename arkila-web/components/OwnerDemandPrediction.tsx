"use client";

import { useMemo, useState } from "react";
import AxiosConfig from "@/app/services/AxiosConfig";
import { API_ENDPOINTS } from "@/app/services/ApiEndpoint";
import { Field, ErrorNote } from "@/components/Field";
import type { Car } from "@/lib/types";
import type { AxiosError } from "axios";

interface ApiErrorBody {
  success: false;
  message: string;
}

type DemandLevel = "High" | "Medium" | "Low";

interface PredictDemandResponse {
  success: true;
  demandLevel: DemandLevel;
  confidence: number; // 0-1
  score: number; // 0-100
  probabilities: Record<string, number>;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const LEVELS: DemandLevel[] = ["Low", "Medium", "High"];

const TONE: Record<DemandLevel, { bg: string; text: string; border: string }> = {
  High: { bg: "bg-teal", text: "text-teal", border: "border-teal/30" },
  Medium: { bg: "bg-jeep", text: "text-amber-900", border: "border-jeep/50" },
  Low: { bg: "bg-coral", text: "text-coral", border: "border-coral/30" },
};

const SUMMARY_COPY: Record<DemandLevel, string> = {
  High: "expect strong interest",
  Medium: "expect moderate interest",
  Low: "expect quiet interest",
};

export default function OwnerDemandPrediction({ cars }: { cars: Car[] }) {
  // Prediction is only meaningful for listings that can actually be booked.
  const bookableCars = useMemo(
    () => cars.filter((c) => c.listingStatus === "approved"),
    [cars]
  );

  const [carId, setCarId] = useState(bookableCars[0]?._id || "");
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [result, setResult] = useState<PredictDemandResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const activeCarId = carId || bookableCars[0]?._id || "";
  const selectedCar = bookableCars.find((c) => c._id === activeCarId);

  const predict = async () => {
    if (!activeCarId) {
      setErr("List a car and get it approved first, then predict its demand.");
      return;
    }
    setErr("");
    setLoading(true);
    setResult(null);
    try {
      const { data } = await AxiosConfig.post<PredictDemandResponse>(
        API_ENDPOINTS.PREDICT_DEMAND,
        { carId: activeCarId, month }
      );
      setResult(data);
    } catch (x) {
      const axiosErr = x as AxiosError<ApiErrorBody>;
      setErr(
        axiosErr.response?.data?.message ||
          (x as Error).message ||
          "Couldn't reach the demand prediction service. Try again shortly."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="panel space-y-5">
      <div>
        <h2 className="text-lg font-bold">Predict rental demand</h2>
        <p className="text-sm text-bay/70">
          Pick one of your listed cars and a month to see how strong demand is likely to be,
          based on vehicle type, fuel type, seats, location, and price.
        </p>
      </div>

      {bookableCars.length === 0 ? (
        <p className="rounded-md bg-mist p-3 text-sm text-bay/70">
          You don&apos;t have any approved listings yet. Once a car is approved, it&apos;ll show up here.
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[16rem_1fr]">
          <div className="space-y-3 rounded-md bg-mist p-4">
            <Field label="Car">
              <select
                className="input"
                value={activeCarId}
                onChange={(e) => {
                  setCarId(e.target.value);
                  setResult(null);
                }}
              >
                {bookableCars.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Month">
              <select
                className="input"
                value={month}
                onChange={(e) => {
                  setMonth(Number(e.target.value));
                  setResult(null);
                }}
              >
                {MONTHS.map((m, i) => (
                  <option key={m} value={i + 1}>
                    {m}
                  </option>
                ))}
              </select>
            </Field>

            <button className="btn btn-primary w-full" disabled={loading} onClick={predict}>
              {loading ? "Predicting..." : "Predict demand"}
            </button>

            <ErrorNote text={err} />
          </div>

          {result && selectedCar ? (
            <div className="space-y-4 rounded-md border border-bay/10 p-4">
              <p className="text-sm text-bay/70">
                <strong className={TONE[result.demandLevel].text}>
                  {result.demandLevel} demand
                </strong>{" "}
                for <strong className="text-bay">{selectedCar.name}</strong> in{" "}
                {MONTHS[month - 1]} — {SUMMARY_COPY[result.demandLevel]}, at{" "}
                {Math.round(result.confidence * 100)}% confidence.
              </p>

              <div className="flex gap-1.5">
                {LEVELS.map((level) => {
                  const active = level === result.demandLevel;
                  return (
                    <div key={level}>
                      <div
                        className={`h-2.5 w-full rounded-full ${
                          active ? TONE[level].bg : "bg-bay/10"
                        }`}
                      />
                      <p
                        className={`mt-1.5 text-center text-xs font-medium ${
                          active ? "text-bay" : "text-bay/40"
                        }`}
                      >
                        {level}
                      </p>
                    </div>
                  );
                })}
              </div>

              <ul className="space-y-2 border-t border-bay/10 pt-3">
                {(["High", "Medium", "Low"] as DemandLevel[]).map((level) => {
                  const pct = Math.round((result.probabilities[level] ?? 0) * 100);
                  return (
                    <li
                      key={level}
                      className="grid grid-cols-[4rem_1fr_2.5rem] items-center gap-2 text-xs"
                    >
                      <span className="text-bay/70">{level}</span>
                      <div className="h-2 rounded-full bg-bay/10">
                        <div
                          className={`h-2 rounded-full ${TONE[level].bg}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-right tabular-nums text-bay/60">{pct}%</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : (
            <div className="flex items-center justify-center rounded-md border border-dashed border-bay/20 p-8 text-center text-sm text-bay/60">
              {loading ? "Predicting..." : "Run a prediction to see the demand breakdown here."}
            </div>
          )}
        </div>
      )}
    </section>
  );
}