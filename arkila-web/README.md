# Arkila web (Next.js frontend)

Frontend for *A Web-based Car Rental System with Gradient Boosting-Based Demand Prediction for Car Owners in Manila City*.
"Arkila" is a placeholder product name. Rename it in `components/Header.tsx` and `app/layout.tsx`.

Runs on Next.js 16 / React 19 (`npm audit` reports 0 vulnerabilities as of this build).

## Run it
```bash
npm install
npm run dev          # http://localhost:3000, runs on built-in mock data
```
Demo logins (any password): `renter@demo.ph`, `owner@demo.ph`, `admin@demo.ph`. `jomar@demo.ph` is an unverified renter with a pending request, useful for testing the verification rule.

## Connect the backend (Node.js / Express)
Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_API_URL=http://localhost:8000`.
Every call goes through `lib/api.ts`. That file is the contract: one function per endpoint, with the mock beside it.
Auth is a JWT sent as `Authorization: Bearer <token>`. Errors must return `{ "detail": "message" }`, which the UI shows as-is.

| Method + path | Used for | FR |
|---|---|---|
| POST `/auth/login`, `/auth/register` | returns `{token, user}` | 01 |
| POST `/account/profile`, `/account/password` | edit name/email, change password | 02 |
| GET `/cars?type&fuel&seats&location&maxPrice&start&end` | approved, available cars | 04 |
| GET `/cars/{id}` | car + `unavailable: [{start,end}]` | 05 |
| POST `/bookings` `{carId,start,end}` | request (renter comes from token) | 06, 12 |
| GET `/bookings/mine`, POST `/bookings/{id}/cancel` | track, cancel | 07 |
| GET `/notifications`, POST `/notifications/read` | bell menu in the header | 08 |
| GET/POST `/owner/cars`, POST `/owner/cars/{id}` (update), `/owner/cars/{id}/activate\|deactivate` | listing CRUD | 09, 10 |
| GET `/owner/requests`, POST `/owner/requests/{id}/approve\|reject` | review | 11 |
| POST `/bookings/{id}/payment` `{method: "f2f"\|"xendit"}` | downpayment | 13 |
| POST `/bookings/{id}/pickup-report`, `/bookings/{id}/return-report` | odometer, fuel, notes, photo count | 14 |
| POST `/bookings/{id}/review` `{rating,comment}` | after `completed` | 15 |
| POST `/disputes`, GET `/disputes/mine` | renter reports an issue | 16 |
| POST `/ml/price-suggestion` | `{suggested, low, high}` | 20 |
| GET `/ml/demand-forecast` | `{dimensions:{type,fuel,seats,location,period}, metrics, horizonDays}` | 18, 19 |
| GET `/verification/me`, POST `/verification` | verification status, submit | 03 |
| GET `/admin/overview\|listings\|verifications\|transactions\|users\|disputes` | queues and stats | 21-23, 27 |
| POST `/admin/listings/{id}`, `/admin/verifications/{id}` | `{decision}` | 21, 22 |
| POST `/admin/disputes/{id}` `{decision,resolution}` | resolve or dismiss | 24 |
| POST `/admin/users/{id}/suspend\|reinstate` | account suspension | 25 |
| GET/POST `/admin/settings` | `{serviceFeePct, downpaymentPct, cancellationFeePct}` | 26 |

File uploads currently send file names or a count only. Switch condition reports, verification, and listing photos to `multipart/form-data` when the storage endpoint exists.

Role checks in `RequireRole` only hide screens. FR-28 still requires the server to enforce roles on every route, and to re-check the overlap, verification, and suspension rules the mocks imitate.

## Where things are
```
app/                    pages (App Router)
  account                profile + password (FR-02)
  cars, cars/[id]        browse + detail + booking request with cost preview
  renter/bookings        track, pay downpayment, rate, report an issue, cancel
  owner/dashboard        stats, demand forecast chart, listings with Edit links
  owner/requests         approve / decline, log pickup and return condition
  owner/listings/new     listing form with ML price suggestion
  owner/listings/[id]/edit   edit or deactivate a listing
  admin/dashboard        listings, verifications, disputes, transactions, users, settings tabs
  verification           document submission for renter and owner
components/             Header (with notification bell), CarCard, BarChart, Badge,
                         RequireRole, ListingForm, ConditionReportForm, ReviewForm, DisputeForm
lib/                     api.ts (gateway + mocks), auth.tsx, booking.ts (cost + overlap), mock.ts
```
Service fee, downpayment, and cancellation fee percentages are editable on the admin Settings tab (FR-26) and stored in `lib/mock.ts`'s `settings` object; new bookings read the current values.

## Coverage against the functional requirements
Built: FR-01 through FR-16, FR-18 through FR-27 (see table above for the exact endpoint each maps to).
Not built yet: dedicated messaging/chat between renter and owner if your document calls for one beyond notifications, and payment gateway wiring (Xendit is a labeled button only). Check your requirements doc for anything not listed above.
The demand forecast values in `lib/mock.ts` are sample numbers, not model output.
