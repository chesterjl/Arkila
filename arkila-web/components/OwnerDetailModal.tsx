"use client";

import type { User } from "@/lib/types";

export interface IdDocument {
  _id: string;
  idType: string;
  idImages: string[];
  status: string;
}

interface OwnerDetailModalProps {
  owner: User;
  idDocs: IdDocument[];
  loadingDocs: boolean;
  isBusy: boolean;
  onClose: () => void;
  onApprove: (id: string) => void;
}

export default function OwnerDetailModal({
  owner,
  idDocs,
  loadingDocs,
  isBusy,
  onClose,
  onApprove,
}: OwnerDetailModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl space-y-4">
        <div className="flex items-start justify-between border-b pb-3">
          <div>
            <h2 className="text-xl font-bold">{owner.name}</h2>
            <p className="text-sm text-bay/70">{owner.brandName || "Individual Car Owner"}</p>
          </div>
          <button type="button" className="text-bay/60 hover:text-bay" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-semibold text-bay/60">Email:</span>
            <p>{owner.email}</p>
          </div>
          <div>
            <span className="font-semibold text-bay/60">Phone:</span>
            <p>{owner.phone}</p>
          </div>
          <div className="col-span-2">
            <span className="font-semibold text-bay/60">Address:</span>
            <p>{owner.address}</p>
          </div>
        </div>

        <div className="border-t pt-3">
          <h3 className="mb-2 font-semibold">Uploaded Identification</h3>
          {loadingDocs ? (
            <p className="text-sm text-bay/60">Loading ID documents...</p>
          ) : idDocs.length === 0 ? (
            <p className="text-sm text-bay/60">No ID documents found.</p>
          ) : (
            <div className="space-y-4">
              {idDocs.map((doc) => (
                <div key={doc._id} className="space-y-2">
                  <p className="text-xs font-semibold capitalize text-bay/70">
                    Type: {doc.idType}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {doc.idImages.map((img, idx) => (
                      <a
                        key={idx}
                        href={img}
                        target="_blank"
                        rel="noreferrer"
                        className="group relative overflow-hidden rounded-lg border border-bay/10 bg-mist"
                      >
                        <img src={img} alt={`ID ${idx + 1}`} className="h-48 w-full object-cover transition group-hover:scale-105"/>
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t pt-4">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={isBusy}
            onClick={() => onApprove(owner._id)}
          >
            {isBusy ? "Please wait..." : "Approve Owner"}
          </button>
        </div>
      </div>
    </div>
  );
}