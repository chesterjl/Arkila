"use client";

import { useEffect, useState } from "react";
import AxiosConfig from "@/app/services/AxiosConfig";
import { API_ENDPOINTS } from "@/app/services/ApiEndpoint";
import { formatReviewDate } from "@/lib/format";
import type { PublicReview } from "@/lib/types";

export default function ReviewList({ carId }: { carId: string }) {
  const [reviews, setReviews] = useState<PublicReview[] | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let mounted = true;
    AxiosConfig.get(API_ENDPOINTS.GET_CAR_REVIEWS(carId))
      .then(({ data }) => mounted && setReviews(data.reviews || []))
      .catch(() => mounted && (setErr(true), setReviews([])));
    return () => { mounted = false; };
  }, [carId]);

  return (
    <section className="panel space-y-4">
      <h2 className="text-lg font-semibold">
        Reviews {reviews && reviews.length > 0 && <span className="text-sm font-normal text-bay/60">({reviews.length})</span>}
      </h2>

      {reviews === null ? (
        <p className="text-sm text-bay/60">Loading reviews...</p>
      ) : err ? (
        <p className="text-sm text-coral">Couldn&apos;t load reviews.</p>
      ) : reviews.length === 0 ? (
        <p className="text-sm text-bay/60">No reviews yet.</p>
      ) : (
        <ul className="divide-y divide-bay/10">
          {reviews.map((r) => (
            <li key={r._id} className="space-y-1 py-3 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="font-medium">{r.reviewerName}</span>
                <time dateTime={r.createdAt} className="text-xs text-bay/60">{formatReviewDate(r.createdAt)}</time>
              </div>
              <p className="whitespace-pre-line text-sm text-bay/80">{r.message}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );  
}