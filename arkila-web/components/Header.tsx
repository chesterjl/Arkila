"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { homeFor, useAuth } from "@/lib/auth";
import type { Role } from "@/lib/types";

const NAV: Record<Role, [string, string][]> = {
  customer: [
    ["/cars", "Browse cars"],
    ["/customer/bookings", "My rentals"],
    ["/customer/history", "History"],
  ],
  owner: [
    ["/owner/dashboard", "Dashboard"],
    ["/owner/cars", "My cars"],
    ["/owner/requests", "Rental requests"],
    ["/owner/bookings", "Bookings"],
    ["/owner/verification", "List a car"],
  ],
  admin: [
    ["/admin/dashboard", "Dashboard"],
    ["/admin/cars", "Car listings"],
    ["/admin/owner", "Owner verification"],
  ],
};

export default function Header() {
  const { user, logout } = useAuth();
  const path = usePathname();
  const [open, setOpen] = useState(false);

  const navItems: [string, string][] = user ? NAV[user.role] : [["/cars", "Browse cars"]];
  const closeMenu = () => setOpen(false);

  return (
    <header className="border-b-4 border-jeep bg-bay text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link
          href={user ? homeFor(user.role) : "/"}
          onClick={closeMenu}
          className="shrink-0 font-display text-2xl font-extrabold"
        >
          Arkila
        </Link>

        <nav className="hidden flex-1 items-center gap-1 text-sm md:flex">
          {navItems.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className={`rounded px-3 py-1.5 transition hover:bg-white/10 ${
                path === href ? "bg-white/15 font-semibold" : ""
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 text-sm md:flex">
          {user ? (
            <>
              {(user.role === "customer" || user.role === "owner") && (
                <Link
                  href="/account"
                  className={`rounded px-2 py-1.5 hover:bg-white/10 ${
                    path === "/account" ? "bg-white/15 font-semibold" : ""
                  }`}
                >
                  {user.name}
                </Link>
              )}
              <button
                onClick={logout}
                className="btn border border-white/30 py-1.5 hover:bg-white/10"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="btn border border-white/30 py-1.5 hover:bg-white/10">
                Log in
              </Link>
              <Link href="/register" className="btn btn-accent py-1.5">
                Create account
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-white/20 hover:bg-white/10 md:hidden"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            {open ? (
              <path d="M2 2 L16 16 M16 2 L2 16" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            ) : (
              <path d="M1 4h16M1 9h16M1 14h16" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            )}
          </svg>
        </button>
      </div>

      {open && (
        <div className="border-t border-white/10 px-4 pb-4 md:hidden">
          <nav className="flex flex-col gap-1 pt-2 text-sm">
            {navItems.map(([href, label]) => (
              <Link
                key={href}
                href={href}
                onClick={closeMenu}
                className={`rounded px-3 py-2 ${
                  path === href ? "bg-white/15 font-semibold" : "hover:bg-white/10"
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>

          <div className="mt-3 flex flex-col gap-2 border-t border-white/10 pt-3 text-sm">
            {user ? (
              <>
                {(user.role === "customer" || user.role === "owner") && (
                  <Link
                    href="/account"
                    onClick={closeMenu}
                    className={`rounded px-3 py-2 ${
                      path === "/account" ? "bg-white/15 font-semibold" : "hover:bg-white/10"
                    }`}
                  >
                    {user.name}
                  </Link>
                )}
                <button
                  onClick={() => {
                    closeMenu();
                    logout();
                  }}
                  className="btn w-full border border-white/30 hover:bg-white/10"
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={closeMenu}
                  className="btn w-full border border-white/30 hover:bg-white/10"
                >
                  Log in
                </Link>
                <Link href="/register" onClick={closeMenu} className="btn btn-accent w-full">
                  Create account
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}