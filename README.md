# Landlord Safety Backend

Node.js REST API with JWT authentication, role-based access control, PostgreSQL, and region-based booking/quote pricing.

## Features

- Standard API response: `{ success, data, message, status }`
- **Service catalog** for residential, commercial, and installation/repair flows
- **Region pricing**: postcode prefix → region → full price matrix per tier
- **Quote engine**: instant residential pricing; TBC when postcode or tier price is missing
- **Bookings** (residential) and **quote requests** (commercial/installation)
- **Roles**: `superAdmin`, `admin`, `technician`

## Setup

```bash
cp .env.example .env
# Edit DATABASE_URL, JWT_SECRET, seed credentials

npm install
npm run db:seed          # super admin
npm run db:seed:all      # catalog + London region + default prices
npm run dev
```

### Seed commands

| Command | Description |
|---------|-------------|
| `npm run db:sync` | Sync schema (`alter: true`) |
| `npm run db:seed` | Create super admin |
| `npm run db:seed:catalog` | Services, questions, tiers, bundles |
| `npm run db:seed:regions` | Default London & M25 region + prefixes |
| `npm run db:seed:prices` | Full price matrix for default region |
| `npm run db:seed:all` | All catalog/region seeds |

Optional: `VAT_ENABLED=true`, `VAT_RATE=0.2`

## Book Now page (public)

Instant quote UI (same layout as `LSI_Instant_Quote_Calculator.html`), served by this API:

| URL | Description |
|-----|-------------|
| `http://localhost:<PORT>/book-now` (default port from `.env`, often `3001`) | 4-step residential booking flow |

Static files live in `public/book-now/`. Pricing and booking use the public JSON APIs below.

## Public API (book-now / frontend)

No authentication required.

### GET `/api/catalog?propertyType=residential&postcode=SW1A%201AA`

Returns categories, services (with nested children), questions, and bundles for the property type.

When `postcode` is provided, the API resolves the pricing region and enriches each question `options` entry with:

| Field | Description |
|-------|-------------|
| `label` | Human-readable option text (e.g. `Meter & 3 appliances`) |
| `price` | Resolved amount for that option (`null` if TBC) |
| `isTbc` | Whether price is to be confirmed |
| `displayLabel` | Full dropdown text (e.g. `Meter & 3 appliances — £89.99`) |

Response also includes `resolvedRegion`, `hasPricing`, and `postcode` when a postcode is sent.

`propertyType`: `residential` | `commercial` | `installation`

### POST `/api/quotes/preview`

Live quote for residential; quote-on-request lines for commercial/installation.

```json
{
  "propertyType": "residential",
  "postcode": "SW1A 1AA",
  "services": [
    {
      "code": "gsc",
      "answers": { "applianceCount": "2", "coAlarmPresent": "yes" }
    }
  ],
  "activeBundleKeys": ["bundle-gsc-boiler"],
  "congestionZone": false,
  "parkingAvailable": true
}
```

**Response `data` (excerpt):**

```json
{
  "resolvedRegion": { "id": "...", "name": "London & M25 (Default)" },
  "lines": [
    { "name": "Gas Safety Certificate (CP12)", "sub": "Meter & 2 appliances", "quantity": 1, "unitPrice": 74.99, "total": 74.99, "isTbc": false, "isDiscount": false }
  ],
  "subtotal": 74.99,
  "vat": 0,
  "total": 74.99,
  "pricingStatus": "priced",
  "vatEnabled": false,
  "activeBundleKeys": [],
  "cta": "BOOK_NOW"
}
```

If postcode does not match any region prefix, all line items return `isTbc: true` and `pricingStatus` is `all_tbc`.

Line items in quote preview and persisted records include `serviceCode` and `serviceName` linking each row to a catalog service (null for bundle discounts and surcharges).

### POST `/api/bookings`

Residential **BOOK NOW** — persists booking, line items, and service answers. Each booking gets a unique reference (e.g. `BK-X7K9QP`). **Rejected with 422** (`data.code: REQUIRES_QUOTATION`) if any priced line has `isTbc: true` — use `/api/quotations` instead.

Same body as quote preview plus contact and appointment fields:

```json
{
  "firstName": "James",
  "lastName": "Smith",
  "email": "james@example.com",
  "phone": "07700900000",
  "postcode": "SW1A 1AA",
  "appointmentAddress": "10 High Street, London",
  "preferredDate": "2026-06-01",
  "preferredTimeSlot": "morning",
  "accessProvider": "tenant",
  "accessArrangements": "Key with agent",
  "propertyType": "residential",
  "services": [{ "code": "gsc", "answers": { "applianceCount": "1", "coAlarmPresent": "yes" } }]
}
```

### POST `/api/quotations`

Submit a **quotation** when any line is TBC (residential), or for commercial/installation. Each quotation gets a unique reference (e.g. `QT-M4R8HN`). Persists `quotations`, `quotation_line_items` (with `serviceCode`, `serviceName`, `isTbc`), and `quotation_answers`.

Same body shape as booking (all `propertyType` values).

```json
{
  "propertyType": "commercial",
  "commercialPropertySubtype": "catering_hospitality",
  "firstName": "Jane",
  "lastName": "Doe",
  "email": "jane@example.com",
  "phone": "07700900001",
  "postcode": "E1 6AN",
  "services": [{ "code": "cp17", "answers": { "applianceCount": "3", "gasInterlock": "yes" } }]
}
```

### POST `/api/bookings/quote-requests`

Deprecated alias for `POST /api/quotations`.

## Admin API (Bearer token, min role `admin`)

### Dashboard

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/dashboard/stats` | Active technicians, pending/unpaid bookings, current-month completed bookings and paid revenue |

**Response `data` excerpt:**

```json
{
  "activeTechnicians": { "count": 3, "technicians": [{ "id": "...", "fullName": "..." }] },
  "pendingBookings": 5,
  "unpaidBookings": 8,
  "currentMonth": {
    "year": 2026,
    "month": 5,
    "label": "May 2026",
    "completedBookings": 12,
    "revenue": 4520.5,
    "vat": 0,
    "revenueIncludingVat": 4520.5
  }
}
```

Revenue sums `total` on bookings with `paymentStatus: paid` whose `paidAt` falls in the current calendar month (server local time). `unpaidBookings` counts non-cancelled bookings still marked unpaid.

### Quotations

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/quotations` | List quotations (paginated) |
| GET | `/api/quotations/:id` | Detail with line items and answers |
| PUT | `/api/quotations/:id/lines` | Admin set prices: `{ "lines": [{ "id", "unitPrice", "total", "isTbc" }] }` |
| PATCH | `/api/quotations/:id/status` | e.g. `pending` → `priced` |
| POST | `/api/quotations/:id/convert` | Create booking when all lines priced |

### Regions

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/regions` | List regions with prefixes |
| POST | `/api/regions` | Create region |
| GET | `/api/regions/:id` | Get region |
| PUT | `/api/regions/:id` | Update region |
| DELETE | `/api/regions/:id` | Delete region (not default) |
| PUT | `/api/regions/:id/prefixes` | Replace prefix list `{ "prefixes": ["SW1", "SW1A"] }` |
| GET | `/api/regions/:id/prices` | Full tier matrix |
| PUT | `/api/regions/:id/prices` | Bulk upsert `{ "prices": [{ "tierKey": "gsc_meter_1", "amount": 59.99 }] }` — `null` = TBC |

### Bookings

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/bookings` | List bookings + recent quotations (`?status`, `?paymentStatus`, `?technicianId`) |
| GET | `/api/bookings/technicians/list` | Active technicians for assignment dropdown |
| GET | `/api/bookings/:id` | Full detail: line items, answers, region, assigned technician, `metadata.statusHistory` |
| PATCH | `/api/bookings/:id` | Admin update: status, `paymentStatus`, technician, admin notes, appointment fields |

**Booking statuses:** `pending` → `confirmed` → `completed`, or `cancelled` at any time (admins may set any status).

**Payment status:** `unpaid` (default on create) or `paid`. Admin/super admin set via PATCH; marking paid sets `paidAt` (cleared when set back to unpaid). Changes are recorded in `metadata.paymentHistory`.

**PATCH example:**

```json
{
  "status": "confirmed",
  "paymentStatus": "paid",
  "technicianId": "uuid-of-technician-user",
  "adminNotes": "Customer confirmed by phone"
}
```

Set `"technicianId": null` to unassign. Status changes are recorded in `metadata.statusHistory`.

## Auth API (existing)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/auth/login` | Login |
| GET | `/api/users/me` | Profile (authenticated) |
| GET/POST/PUT/DELETE | `/api/users/*` | User management |

## Pricing rules (residential)

- Prices loaded from **region matrix** (`region_prices` + `pricing_tiers`)
- **GSC + boiler bundle**: boiler priced as add-on (£45 basic / £120 full) when `bundle-gsc-boiler` active
- **EICR + PAT**: PAT £49.99 (1–10) + £10 bundle discount line
- **FSC + ELC**: −£20; **FSC + ELC + FRA**: −£40; **EPC + floor plan**: −£20
- **Congestion zone**: +£18; **No parking**: +£5
- **EPC 7+ bedrooms**, **asbestos non–3-bed house**: TBC

## Tests

```bash
npm test
```

Integration tests for `quoteCalculator` require `DATABASE_URL` in `.env`; they skip automatically if the database is unreachable.

## Frontend contract

Implement the 4-step book-now flow against these endpoints (UI reference: `LSI_Instant_Quote_Calculator.html`):

1. Lead capture → `propertyType`, contact, postcode  
2. Services → `GET /catalog` + `POST /api/quotes/preview` on each change  
3. Booking details → congestion/parking/date/slot/access  
4. Summary → `POST /api/bookings` (fully priced) or `POST /api/quotations` (any TBC line)

## Response format

```json
{
  "success": true,
  "data": {},
  "message": "Description",
  "status": 200
}
```
