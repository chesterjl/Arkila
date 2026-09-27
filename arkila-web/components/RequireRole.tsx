"use client";
import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import type { Role } from "@/lib/types";

export default function RequireRole({ role, children }: { role: Role | Role[]; children: ReactNode }) {
  const { user, ready } = useAuth();
  const router = useRouter();
  useEffect(() => { if (ready && !user) router.replace("/login"); }, [ready, user, router]);
  if (!ready || !user) return null;
  if (!([] as Role[]).concat(role).includes(user.role))
    return <div className="panel mx-auto mt-10 max-w-md"><h1 className="text-xl font-bold">This page is for another account type</h1><p className="mt-2 text-sm text-bay/70">You are signed in as a {user.role}. Switch accounts to open it.</p></div>;
  return <>{children}</>;
}
