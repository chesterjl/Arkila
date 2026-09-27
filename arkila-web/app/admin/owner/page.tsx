"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AxiosConfig from "@/app/services/AxiosConfig";
import { API_ENDPOINTS } from "@/app/services/ApiEndpoint";
import RequireRole from "@/components/RequireRole";
import { ErrorNote, Field } from "@/components/Field";
import Badge from "@/components/Badge";
import OwnerDetailModal, { type IdDocument } from "@/components/OwnerDetailModal";
import type { User } from "@/lib/types";
import type { AxiosError, AxiosResponse } from "axios";

interface ApiErrorBody {
  success: false;
  message: string;
}

function OwnerVerifications() {
  const [owners, setOwners] = useState<User[] | null>(null);
  const [viewingOwner, setViewingOwner] = useState<User | null>(null);
  const [idDocs, setIdDocs] = useState<IdDocument[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [err, setErr] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const load = useCallback(async () => {
    setErr("");
    try {
      const response: AxiosResponse = await AxiosConfig.get(API_ENDPOINTS.GET_ADMIN_PENDING_OWNERS);
      setOwners(response.data?.owners ?? response.data ?? []);
    } catch (e) {
      const axiosErr = e as AxiosError<ApiErrorBody>;
      setErr(axiosErr.response?.data?.message ?? (e as Error).message ?? "Failed to load pending owner verifications.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openOwnerModal = async (owner: User) => {
    setViewingOwner(owner);
    setLoadingDocs(true);
    setIdDocs([]);
    try {
      const response: AxiosResponse = await AxiosConfig.get(`/id-documents/user/${owner._id}`);
      setIdDocs(response.data?.documents ?? response.data ?? []);
    } catch {
      // Keep empty if none returned
    } finally {
      setLoadingDocs(false);
    }
  };

  const approve = async (id: string) => {
    setErr("");
    setBusyId(id);
    try {
      await AxiosConfig.patch(API_ENDPOINTS.APPROVE_OWNER(id));
      setOwners((prev) => (prev ? prev.filter((o) => o._id !== id) : prev));
      if (viewingOwner?._id === id) setViewingOwner(null);
    } catch (e) {
      const axiosErr = e as AxiosError<ApiErrorBody>;
      setErr(axiosErr.response?.data?.message ?? (e as Error).message ?? "Failed to approve this account.");
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (id: string) => {
    setErr("");
    setBusyId(id);
    try {
      await AxiosConfig.patch(API_ENDPOINTS.REJECT_OWNER(id), { reason: reason || undefined });
      setOwners((prev) => (prev ? prev.filter((o) => o._id !== id) : prev));
      if (viewingOwner?._id === id) setViewingOwner(null);
      setRejectingId(null);
      setReason("");
    } catch (e) {
      const axiosErr = e as AxiosError<ApiErrorBody>;
      setErr(axiosErr.response?.data?.message ?? (e as Error).message ?? "Failed to reject this account.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Owner verifications</h1>
          <p className="text-sm text-bay/70">
            New owner accounts wait here until you approve or reject their ID.
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-ghost" onClick={load}>Refresh</button>
          <Link href="/admin/dashboard" className="btn btn-ghost">Back to dashboard</Link>
        </div>
      </div>

      <ErrorNote text={err} />

      {owners === null ? (
        <p className="text-bay/60">Loading...</p>
      ) : owners.length === 0 ? (
        <p className="panel">No owner accounts waiting for verification.</p>
      ) : (
        <div className="space-y-3">
          {owners.map((o) => {
            const busy = busyId === o._id;
            return (
              <article key={o._id} className="panel space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 className="font-semibold">
                      {o.name}
                      {o.brandName && <span className="font-normal text-bay/60"> · {o.brandName}</span>}
                    </h2>
                    <p className="text-sm text-bay/70">{o.email} · {o.phone}</p>
                    <p className="text-sm text-bay/70">{o.address}</p>
                  </div>
                  <Badge status={o.ownerStatus || "pending"} />
                </div>

                {rejectingId === o._id ? (
                  <div className="space-y-2 rounded-md bg-mist p-3">
                    <Field label="Reason for rejection (shown to the owner)">
                      <textarea
                        className="input"
                        rows={2}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                      />
                    </Field>
                    <div className="flex gap-2">
                      <button
                        className="btn btn-ghost"
                        disabled={busy}
                        onClick={() => {
                          setRejectingId(null);
                          setReason("");
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        className="btn btn-danger"
                        disabled={busy}
                        onClick={() => reject(o._id)}
                      >
                        {busy ? "Please wait..." : "Confirm rejection"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-2 border-t border-bay/10 pt-3">
                    <button
                      type="button"
                      className="btn btn-ghost text-teal"
                      onClick={() => openOwnerModal(o)}
                    >
                      View ID & Details
                    </button>
                    <button
                      className="btn btn-primary"
                      disabled={busy}
                      onClick={() => approve(o._id)}
                    >
                      {busy ? "Please wait..." : "Approve"}
                    </button>
                    <button
                      className="btn btn-ghost"
                      disabled={busy}
                      onClick={() => setRejectingId(o._id)}
                    >
                      Reject
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {viewingOwner && (
        <OwnerDetailModal
          owner={viewingOwner}
          idDocs={idDocs}
          loadingDocs={loadingDocs}
          isBusy={busyId === viewingOwner._id}
          onClose={() => setViewingOwner(null)}
          onApprove={approve}
        />
      )}
    </div>
  );
}

export default function Page() {
  return (
    <RequireRole role="admin">
      <OwnerVerifications />
    </RequireRole>
  );
}