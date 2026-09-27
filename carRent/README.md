# CarRent Backend (Node.js + Express + MongoDB)

## Run
1. `npm install`
2. Fill in `.env` (Mongo URI, JWT secret, Cloudinary, Xendit keys)
3. `npm run dev`

## Auth
Login/register returns `{ token, expiresIn, user }`.
Send `Authorization: Bearer <token>` on every protected request. The token holds the user id + role and expires per `JWT_EXPIRES_IN`.

## Endpoints
| Method | Path | Who | Notes |
|---|---|---|---|
| POST | /api/auth/register | public | multipart. Owner: `idImages` x1-2, optional `brandName`, `idType` |
| POST | /api/auth/login | public | |
| GET | /api/auth/info | any | get user info |
| GET | /api/ids/me | any | my ID records |
| POST | /api/ids | owner | add another ID (max 2 total) |
| DELETE | /api/ids/:id | owner | |
| GET | /api/cars | public | filters: location, vehicleType, fuelType, seats, minPrice, maxPrice, search |
| GET | /api/cars/:id | public | |
| GET | /api/cars/mine | owner | |
| POST | /api/cars | owner | multipart, file field `image` |
| PUT/DELETE | /api/cars/:id | owner | |
| POST | /api/bookings | customer | multipart: carId, startDate, endDate, `idImage` (first booking only) |
| GET | /api/bookings/mine | customer | |
| GET | /api/bookings/owner | owner | `?status=pending` |
| GET | /api/bookings/:id | customer/owner of it | |
| PATCH | /api/bookings/:id/approve | owner | pending -> approved |
| PATCH | /api/bookings/:id/reject | owner | body: `reason` |
| PATCH | /api/bookings/:id/cancel | customer | only pending/approved |
| POST | /api/bookings/:id/pay-downpayment | customer | returns Xendit `invoiceUrl` |
| PATCH | /api/bookings/:id/pickup | owner | confirmed -> ongoing |
| PATCH | /api/bookings/:id/return | owner | body: `isGoodCondition`, `notes` |
| PATCH | /api/bookings/:id/complete | owner | returned -> completed |
| POST | /api/bookings/:id/pay-balance | customer | only after completed |
| POST | /api/payments/xendit/webhook | Xendit | header `x-callback-token` |

Set the Xendit invoice callback URL in the Xendit dashboard to `<your-url>/api/payments/xendit/webhook`.
