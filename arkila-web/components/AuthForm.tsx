"use client";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { ErrorNote, Field } from "./Field";
import type { AxiosError, AxiosResponse } from "axios";
import AxiosConfig from "@/app/services/AxiosConfig";
import { API_ENDPOINTS } from "@/app/services/ApiEndpoint";
import { useAuth } from "@/lib/auth";

type LocalRole = "customer" | "owner";

interface ApiErrorBody {
  success: false;
  message: string;
}

// One upload slot = one file input + preview + remove button.
function IdSlot({
  label,
  file,
  onChange,
}: {
  label: string;
  file: File | null;
  onChange: (f: File | null) => void;
}) {
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <Field label={label}>
      <div className="space-y-2">
        {preview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt={label} className="h-24 w-full rounded border object-cover" />
        )}
        <input
          // key resets the input when the file is removed
          key={file ? file.name : "empty"}
          type="file"
          accept="image/*"
          className="input"
          onChange={(e) => onChange(e.target.files?.[0] || null)}
        />
        {file && (
          <button type="button" className="text-xs font-semibold text-coral underline" onClick={() => onChange(null)}>
            Remove
          </button>
        )}
      </div>
    </Field>
  );
}

export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const { login } = useAuth();
  const [v, setV] = useState({ name: "", email: "", password: "", phone: "", address: "", role: "customer" as LocalRole });
  const [id1, setId1] = useState<File | null>(null);
  const [id2, setId2] = useState<File | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const isLogin = mode === "login";
  const isOwner = v.role === "owner";

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr("");

    const ids = [id1, id2].filter((f): f is File => f !== null);

    if (!isLogin && v.password.length < 8) return setErr("Use a password with at least 8 characters.");
    if (!isLogin && isOwner && ids.length === 0) {
      return setErr("Please upload at least one government ID (max 2) so we can verify you as a car owner.");
    }

    setBusy(true);
    try {
      if (isLogin) {
        await login(v.email, v.password);
        toast.success("Logged in successfully!");
        return;
      }

      const form = new FormData();
      form.append("name", v.name);
      form.append("email", v.email);
      form.append("password", v.password);
      form.append("phone", v.phone);
      form.append("address", v.address);
      form.append("role", v.role);
      if (isOwner) ids.forEach((f) => form.append("idImages", f));

      const response: AxiosResponse = await AxiosConfig.post(API_ENDPOINTS.REGISTER, form);

      if (response.status === 201) {
        toast.success("Registration successful! Please log in to continue.");
        router.push("/login");
      }
    } catch (x) {
      const axiosErr = x as AxiosError<ApiErrorBody>;
      const message = axiosErr.response?.data?.message || (x as Error).message || "Something went wrong.";
      setErr(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="panel mx-auto max-w-md space-y-4">
      <h1 className="text-2xl font-bold">{isLogin ? "Log in to Arkila" : "Create your account"}</h1>
      {!isLogin && (
        <>
          <Field label="Full name">
            <input className="input" required value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
          </Field>
          <Field label="Phone number">
            <input type="tel" className="input" required value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} />
          </Field>
          <Field label="Address">
            <input
              className="input"
              required
              placeholder="e.g. 123 Rizal St, Sampaloc, Manila"
              value={v.address}
              onChange={(e) => setV({ ...v, address: e.target.value })}
            />
          </Field>
          <fieldset>
            <legend className="label">I want to</legend>
            <div className="grid grid-cols-2 gap-2">
              {([["customer", "Rent a car"], ["owner", "Rent out my car"]] as const).map(([r, t]) => (
                <label key={r} className={`cursor-pointer rounded-md border px-3 py-2.5 text-center text-sm font-medium ${v.role === r ? "border-teal bg-teal/10" : "border-bay/20"}`}>
                  <input type="radio" name="role" className="sr-only" checked={v.role === r} onChange={() => setV({ ...v, role: r as LocalRole })} />{t}
                </label>
              ))}
            </div>
          </fieldset>
          {isOwner && (
            <div className="space-y-3 rounded-md border border-bay/10 bg-mist p-3">
              <IdSlot label="Government ID 1 (required)" file={id1} onChange={setId1} />
              <IdSlot label="Government ID 2 (optional)" file={id2} onChange={setId2} />
              <p className="text-xs text-bay/70">
                Upload 1 or 2 IDs. An admin verifies them before your listings go live.
              </p>
            </div>
          )}
        </>
      )}
      <Field label="Email"><input type="email" className="input" required value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} /></Field>
      <Field label="Password"><input type="password" className="input" required value={v.password} onChange={(e) => setV({ ...v, password: e.target.value })} /></Field>
      <ErrorNote text={err} />
      <button className="btn btn-primary w-full" disabled={busy}>{busy ? "Please wait" : isLogin ? "Log in" : "Create account"}</button>
      <p className="text-sm text-bay/70">
        {isLogin ? <>New here? <Link href="/register" className="font-semibold text-teal underline">Create an account</Link></> : <>Already registered? <Link href="/login" className="font-semibold text-teal underline">Log in</Link></>}
      </p>
    </form>
  );
}