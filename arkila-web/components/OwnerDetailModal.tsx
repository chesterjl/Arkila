"use client";

import { useEffect, useState } from "react";
import Badge from "@/components/Badge";
import type { IdDocument, User } from "@/lib/types";

interface OwnerDetailModalProps {
  owner: User;
  idDocs: IdDocument[];
  loadingDocs: boolean;
  docsError?: string;
  isBusy: boolean;
  onClose: () => void;
  onApprove: (id: string) => void;
  onReject?: (id: string) => void;
}

export default function OwnerDetailModal({
  owner,
  idDocs,
  loadingDocs,
  docsError = "",
  isBusy,
  onClose,
  onApprove,
  onReject,
}: OwnerDetailModalProps) {
  const [preview, setPreview] = useState<IdDocument | null>(null);

  // Escape closes the enlarged ID first, then the modal
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (preview) setPreview(null);
      else onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [preview, onClose]);

  const initials =
    owner.name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "?";

  const hasIds = idDocs.length > 0;
  const canApprove = !isBusy && !loadingDocs && hasIds;

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        onClick={onClose}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Owner details for ${owner.name}`}
          className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start gap-4 border-b border-bay/10 p-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-bay font-display text-lg font-bold text-white">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-xl font-bold">{owner.name}</h2>
                <Badge status={owner.ownerStatus || "pending"} />
              </div>
              <p className="truncate text-sm text-bay/70">
                {owner.brandName || "Individual car owner"}
              </p>
            </div>
            <button
              type="button"
              aria-label="Close"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-bay/60 hover:bg-bay/5 hover:text-bay"
              onClick={onClose}
            >
              ✕
            </button>
          </div>

          <div className="flex-1 space-y-6 overflow-y-auto p-5">
            <section>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-bay/50">
                Contact details
              </h3>
              <dl className="grid gap-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-bay/60">Email</dt>
                  <dd className="mt-0.5 break-all font-medium">
                    <a href={`mailto:${owner.email}`} className="text-teal hover:underline">
                      {owner.email}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="text-bay/60">Phone</dt>
                  <dd className="mt-0.5 font-medium">
                    <a href={`tel:${owner.phone}`} className="text-teal hover:underline">
                      {owner.phone}
                    </a>
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-bay/60">Address</dt>
                  <dd className="mt-0.5 font-medium">{owner.address}</dd>
                </div>
              </dl>
            </section>

            <section>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-bay/50">
                  Uploaded identification
                </h3>
                {!loadingDocs && hasIds && (
                  <span className="text-xs text-bay/60">
                    {idDocs.length} {idDocs.length === 1 ? "ID" : "IDs"} on file
                  </span>
                )}
              </div>

              {loadingDocs ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {[0, 1].map((i) => (
                    <div key={i} className="h-52 animate-pulse rounded-lg bg-bay/5" />
                  ))}
                </div>
              ) : docsError ? (
                <p role="alert" className="rounded-md bg-coral/10 px-3 py-2 text-sm text-coral">
                  {docsError}
                </p>
              ) : !hasIds ? (
                <p className="rounded-md bg-mist p-4 text-sm text-bay/70">
                  This owner has no ID on file, so they can&apos;t be approved yet.
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {idDocs.map((doc) => (
                    <figure
                      key={doc._id}
                      className="overflow-hidden rounded-lg border border-bay/10"
                    >
                      <button
                        type="button"
                        className="group relative block w-full bg-mist"
                        onClick={() => setPreview(doc)}
                        aria-label="Government ID"
                      >
                        <img
                          src={doc.imageUrl}
                          alt="Government ID"
                          className="h-44 w-full object-contain"
                        />
                        <span className="absolute inset-0 flex items-center justify-center bg-bay/0 text-xs font-semibold text-white opacity-0 transition group-hover:bg-bay/40 group-hover:opacity-100">
                          Click to enlarge
                        </span>
                      </button>
                      <figcaption className="truncate border-t border-bay/10 px-3 py-2 text-xs font-medium">
                        Government ID
                      </figcaption>
                    </figure>
                  ))}
                </div>
              )}
            </section>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-bay/10 bg-mist/50 px-5 py-4">
            <button type="button" className="btn btn-ghost mr-auto" onClick={onClose}>
              Close
            </button>
            {onReject && (
              <button
                type="button"
                className="btn btn-ghost text-coral"
                disabled={isBusy}
                onClick={() => onReject(owner._id)}
              >
                Reject
              </button>
            )}
            <button
              type="button"
              className="btn btn-primary"
              disabled={!canApprove}
              onClick={() => onApprove(owner._id)}
            >
              {isBusy ? "Please wait..." : "Approve owner"}
            </button>
          </div>
        </div>
      </div>

      {preview && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4"
          onClick={() => setPreview(null)}
        >
          <button
            type="button"
            aria-label="Close preview"
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            onClick={() => setPreview(null)}
          >
            ✕
          </button>
          <img
            src={preview.imageUrl}
            alt="Government ID"
            className="max-h-full max-w-full rounded-md object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}