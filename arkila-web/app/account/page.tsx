// app/account/page.tsx
"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth";
import AxiosConfig from "@/app/services/AxiosConfig";
import { API_ENDPOINTS } from "@/app/services/ApiEndpoint";
import RequireRole from "@/components/RequireRole";
import Badge from "@/components/Badge";
import { ErrorNote, Field } from "@/components/Field";
import type { AxiosError, AxiosResponse } from "axios";
import type { OwnerStatus } from "@/lib/types";

interface ApiErrorBody {
  success: false;
  message: string;
}

type Tab = "profile" | "security";
const MAX_OWNER_IDS = 2;

const OWNER_STATUS_COPY: Record<OwnerStatus, { headline: string; detail: string; tone: string }> = {
  approved: {
    headline: "Verified owner",
    detail: "Your listings are visible to renters.",
    tone: "border-teal bg-teal/5",
  },
  pending: {
    headline: "Verification pending",
    detail: "An admin is reviewing your ID. Listings stay hidden until you're verified.",
    tone: "border-jeep bg-jeep/10",
  },
  rejected: {
    headline: "Verification rejected",
    detail: "Update your ID and contact support to be reviewed again.",
    tone: "border-coral bg-coral/5",
  },
};

function Account() {
  const { user, setUser } = useAuth();
  const [tab, setTab] = useState<Tab>("profile");

  const [profile, setProfile] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    address: user?.address || "",
    brandName: user?.brandName || "",
  });
  const [pErr, setPErr] = useState("");
  const [pOk, setPOk] = useState(false);
  const [pBusy, setPBusy] = useState(false);

  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [wErr, setWErr] = useState("");
  const [wOk, setWOk] = useState(false);
  const [wBusy, setWBusy] = useState(false);

  const [ids, setIds] = useState<any[]>([]);
  const [idBusy, setIdBusy] = useState(false);
  const [idErr, setIdErr] = useState("");
  const [idOk, setIdOk] = useState(false);

  const initials = useMemo(
    () =>
      (user?.name || "")
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("") || "?",
    [user?.name]
  );

  const isOwner = user?.role === "owner";
  const canManageIds = user?.role === "customer" || user?.role === "owner";
  const maxIds = isOwner ? 2 : 1;

  useEffect(() => {
    if (!canManageIds) return;

    const loadIds = async () => {
      try {
        const response = await AxiosConfig.get(API_ENDPOINTS.MY_IDS);
        setIds(response.data.ids || []);
      } catch (x) {
        const axiosErr = x as AxiosError<ApiErrorBody>;
        setIdErr(axiosErr.response?.data?.message || "Failed to load ID documents.");
      }
    };

    loadIds();
  }, [canManageIds]);

  useEffect(() => {
    refreshUser();
  }, []);

  const refreshUser = async () => {
    try {
      const response = await AxiosConfig.get(API_ENDPOINTS.GET_MY_INFO);
      if (response.status === 200) {
        setUser(response.data.user || response.data);
      }
    } catch (x) {
      console.error("Failed to refresh user:", x);
    }
  };

  if (!user) return null;

  const suspended = Boolean(user.isSuspended);
  const ownerStatus = isOwner ? OWNER_STATUS_COPY[user.ownerStatus || "pending"] : null;

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setPErr("");
    setPOk(false);
    setPBusy(true);

    const payload: Record<string, string> = {
      name: profile.name,
      email: profile.email,
      phone: profile.phone,
      address: profile.address,
    };
    if (isOwner) payload.brandName = profile.brandName;

    try {
      const response: AxiosResponse = await AxiosConfig.patch(API_ENDPOINTS.UPDATE_MY_INFO, payload);
      if (response.status === 200) {
        setUser(response.data.user || response.data);
        setPOk(true);
      }
    } catch (x) {
      const axiosErr = x as AxiosError<ApiErrorBody>;
      setPErr(axiosErr.response?.data?.message || (x as Error).message || "Failed to update profile.");
    } finally {
      setPBusy(false);
    }
  };

  const savePassword = async (e: FormEvent) => {
    e.preventDefault();
    setWErr("");
    setWOk(false);

    if (pw.next !== pw.confirm) return setWErr("New password and confirmation do not match.");

    setWBusy(true);
    try {
      const response: AxiosResponse = await AxiosConfig.patch(API_ENDPOINTS.UPDATE_PASSWORD, {
        currentPassword: pw.current,
        newPassword: pw.next,
      });
      if (response.status === 200) {
        setWOk(true);
        setPw({ current: "", next: "", confirm: "" });
      }
    } catch (x) {
      const axiosErr = x as AxiosError<ApiErrorBody>;
      setWErr(axiosErr.response?.data?.message || (x as Error).message || "Failed to update password.");
    } finally {
      setWBusy(false);
    }
  };

  const updateId = async (id: string, file: File) => {
    setIdBusy(true);
    setIdErr("");
    setIdOk(false);

    try {
      const formData = new FormData();
      formData.append("idImage", file);

      const response = await AxiosConfig.patch(API_ENDPOINTS.REPLACE_ID(id), formData);

      setIds((current) => current.map((item) => (item._id === id ? response.data.id : item)));

      if (isOwner) {
        setUser({
          ...user,
          ownerStatus: "pending",
          rejectionReason: undefined,
        });
      }

      setIdOk(true);
    } catch (x) {
      const axiosErr = x as AxiosError<ApiErrorBody>;
      setIdErr(axiosErr.response?.data?.message || "Failed to update ID.");
    } finally {
      setIdBusy(false);
    }
  };

  const addId = async (file: File) => {
    setIdBusy(true);
    setIdErr("");
    setIdOk(false);

    try {
      const formData = new FormData();
      formData.append("idImages", file);

      const response = await AxiosConfig.post(API_ENDPOINTS.ADD_ID, formData);
      setIds((current) => [...current, ...(response.data.ids || [])]);
      await refreshUser();
      setIdOk(true);
    } catch (x) {
      const axiosErr = x as AxiosError<ApiErrorBody>;
      setIdErr(axiosErr.response?.data?.message || "Failed to add ID.");
    } finally {
      setIdBusy(false);
    }
  };

  const removeId = async (id: string) => {
    setIdBusy(true);
    setIdErr("");
    setIdOk(false);

    try {
      await AxiosConfig.delete(API_ENDPOINTS.DELETE_ID(id));
      setIds((current) => current.filter((item) => item._id !== id));
    } catch (x) {
      const axiosErr = x as AxiosError<ApiErrorBody>;
      setIdErr(axiosErr.response?.data?.message || "Failed to remove ID.");
    } finally {
      setIdBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-6 text-2xl font-bold">Account</h1>

      <div className="grid gap-6 md:grid-cols-[16rem_1fr]">
        <aside className="panel h-fit space-y-4 text-center md:text-left">
          <div className="flex flex-col items-center gap-3 md:flex-row">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-bay font-display text-2xl font-bold text-white">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="truncate font-semibold">{user.name}</p>
              <p className="truncate text-sm text-bay/60">{user.email}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 md:justify-start">
            <span className="rounded-full bg-bay/10 px-3 py-1 text-xs font-semibold capitalize text-bay">
              {user.role}
            </span>
            {ownerStatus && <Badge status={user.ownerStatus || "pending"} />}
            {suspended && <Badge status="suspended" />}
          </div>

          {isOwner && user.brandName && (
            <p className="border-t border-bay/10 pt-3 text-sm text-bay/70">
              Brand name: <span className="font-medium text-bay">{user.brandName}</span>
            </p>
          )}

          {suspended ? (
            <div className="rounded-md border-l-4 border-coral bg-coral/5 p-3 text-left text-sm">
              <p className="font-semibold text-coral">Account suspended</p>
              <p className="mt-0.5 text-bay/70">
                {isOwner
                  ? "Your cars are hidden from browsing and you can't list cars or approve new requests. Existing rentals continue as normal."
                  : "You can browse cars, but you can't request new rentals until an admin reactivates your account."}
              </p>
              {user.suspensionReason && <p className="mt-1 text-coral">Reason: {user.suspensionReason}</p>}
            </div>
          ) : (
            ownerStatus && (
              <div className={`rounded-md border-l-4 p-3 text-left text-sm ${ownerStatus.tone}`}>
                <p className="font-semibold">{ownerStatus.headline}</p>
                <p className="mt-0.5 text-bay/70">{ownerStatus.detail}</p>
                {user.ownerStatus === "rejected" && user.rejectionReason && (
                  <p className="mt-1 text-coral">Reason: {user.rejectionReason}</p>
                )}
              </div>
            )
          )}
        </aside>

        <div className="space-y-4">
          <div role="tablist" className="flex gap-1 border-b border-bay/10">
            {(
              [
                ["profile", "Profile"],
                ["security", "Security"],
              ] as [Tab, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                role="tab"
                aria-selected={tab === key}
                onClick={() => setTab(key)}
                className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold ${
                  tab === key ? "border-teal text-teal" : "border-transparent text-bay/60 hover:text-bay"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === "profile" && (
            <form onSubmit={saveProfile} className="panel space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Full name">
                  <input
                    className="input"
                    required
                    value={profile.name}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        name: e.target.value,
                      })
                    }
                  />
                </Field>

                <Field label="Phone number">
                  <input
                    type="tel"
                    className="input"
                    placeholder="09123456789"
                    value={profile.phone}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        phone: e.target.value,
                      })
                    }
                  />
                </Field>
              </div>

              <Field label="Email">
                <input
                  type="email"
                  className="input"
                  required
                  value={profile.email}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      email: e.target.value,
                    })
                  }
                />
              </Field>

              <Field label="Address">
                <input
                  className="input"
                  required
                  placeholder="e.g. 123 Rizal St, Sampaloc, Manila"
                  value={profile.address}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      address: e.target.value,
                    })
                  }
                />
              </Field>

              {isOwner && (
                <Field label="Brand / business name">
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g. Josh Car Rentals"
                    value={profile.brandName}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        brandName: e.target.value,
                      })
                    }
                  />
                  <p className="mt-1 text-xs text-bay/60">
                    Shown to renters instead of your name on your listings.
                  </p>
                </Field>
              )}

              {canManageIds && (
                <div className="panel space-y-4">
                  <div>
                    <h2 className="font-semibold">Identity Verification</h2>
                    <p className="mt-1 text-sm text-bay/60">
                      {isOwner
                        ? "Upload a valid government-issued ID for owner verification."
                        : "Upload a valid government-issued ID. This ID will be used for your rental bookings."}
                    </p>
                  </div>

                  {isOwner && user.ownerStatus === "rejected" && (
                    <div className="rounded-md border border-coral bg-coral/5 p-3">
                      <p className="font-semibold text-coral">
                        Your verification was rejected.
                      </p>
                      {user.rejectionReason && (
                        <p className="mt-1 text-sm text-bay/70">
                          Reason: {user.rejectionReason}
                        </p>
                      )}
                      <p className="mt-2 text-sm text-bay/70">
                        Please replace your ID below and submit it for verification again.
                      </p>
                    </div>
                  )}

                  {ids.map((id, i) => (
                    <div key={id._id} className="rounded-md border border-bay/10 p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-medium">
                            {isOwner && ids.length > 1
                              ? `Government ID ${i + 1}`
                              : "Government ID"}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <label className="btn btn-ghost cursor-pointer">
                            {idBusy ? "Uploading..." : "Replace ID"}
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              disabled={idBusy}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                updateId(id._id, file);
                                e.target.value = "";
                              }}
                            />
                          </label>

                          {isOwner && ids.length > 1 && (
                            <button
                              type="button"
                              className="btn btn-ghost text-coral"
                              disabled={idBusy}
                              onClick={() => removeId(id._id)}
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </div>

                      {id.imageUrl && (
                        <img
                          src={id.imageUrl}
                          alt="Uploaded identification document"
                          className="mt-4 max-h-64 rounded-md border object-contain"
                        />
                      )}
                    </div>
                  ))}

                  {ids.length < maxIds && (
                    <label className="flex cursor-pointer flex-col items-center gap-1 rounded-md border border-dashed border-bay/25 p-5 text-center text-sm hover:bg-bay/5">
                      <span className="font-semibold text-teal">
                        {idBusy
                          ? "Uploading..."
                          : ids.length === 0
                          ? "Upload government ID"
                          : "+ Add another government ID"}
                      </span>

                      <span className="text-xs text-bay/60">
                        {isOwner
                          ? `You can keep up to ${MAX_OWNER_IDS} IDs on file.`
                          : "Only one government ID is required for your rental bookings."}
                      </span>

                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={idBusy}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          addId(file);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  )}

                  <ErrorNote text={idErr} />

                  {idOk && (
                    <p className="text-sm text-teal">
                      ID updated successfully.
                      {isOwner
                        ? " Your verification has been submitted for admin review."
                        : " This ID will be used for your rental bookings."}
                    </p>
                  )}
                </div>
              )}

              <ErrorNote text={pErr} />
              {pOk && <p className="text-sm text-teal">Profile updated.</p>}

              <button className="btn btn-primary" disabled={pBusy}>
                {pBusy ? "Saving..." : "Save profile"}
              </button>
            </form>
          )}

          {tab === "security" && (
            <form onSubmit={savePassword} className="panel max-w-sm space-y-4">
              <Field label="Current password">
                <input
                  type="password"
                  className="input"
                  required
                  value={pw.current}
                  onChange={(e) => setPw({ ...pw, current: e.target.value })}
                />
              </Field>
              <Field label="New password">
                <input
                  type="password"
                  className="input"
                  required
                  value={pw.next}
                  onChange={(e) => setPw({ ...pw, next: e.target.value })}
                />
              </Field>
              <Field label="Confirm new password">
                <input
                  type="password"
                  className="input"
                  required
                  value={pw.confirm}
                  onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
                />
              </Field>

              <ErrorNote text={wErr} />
              {wOk && <p className="text-sm text-teal">Password updated.</p>}

              <button className="btn btn-primary" disabled={wBusy}>
                {wBusy ? "Updating..." : "Update password"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <RequireRole role={["customer", "owner", "admin"]}>
      <Account />
    </RequireRole>
  );
}