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
| `npm run db:seed:pricing-rules` | Data-driven pricing rules for quote engine |
| `npm run db:seed:all` | All catalog/region/pricing seeds |

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
| GET | `/api/dashboard/stats` | Active technicians, pending/unpaid bookings, pending quotations, new leads, and for the current month: bookings received, completed bookings, paid revenue, Priority Service bookings, revenue by service (`topServices`) and booking-level `adjustments` (Priority Service, congestion/parking, bundle discounts) |

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

### Catalog admin (`/api/admin/catalog`)

Manage the full service catalog (categories, services, questions, pricing tiers, bundles, pricing rules, commercial top questions). All routes require Bearer token with min role `admin`.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/catalog/tree?propertyType=` | Full editable tree (includes inactive records) |
| GET/POST | `/api/admin/catalog/categories` | List / create categories |
| PUT/DELETE | `/api/admin/catalog/categories/:id` | Update / delete category |
| PATCH | `/api/admin/catalog/categories/reorder` | `{ "items": [{ "id", "displayOrder" }] }` |
| GET/POST | `/api/admin/catalog/services` | List / create services |
| GET/PUT/DELETE | `/api/admin/catalog/services/:id` | Get / update / delete service |
| PATCH | `/api/admin/catalog/services/:id/active` | `{ "isActive": true \| false }` |
| GET/POST | `/api/admin/catalog/services/:serviceId/questions` | List / create questions |
| PUT/DELETE | `/api/admin/catalog/services/:serviceId/questions/:id` | Update / delete question |
| PATCH | `/api/admin/catalog/services/:serviceId/questions/reorder` | Reorder questions |
| GET/POST | `/api/admin/catalog/pricing-tiers` | List / create tiers (auto-seeds null region prices) |
| PUT/DELETE | `/api/admin/catalog/pricing-tiers/:id` | Update / delete tier |
| GET/POST | `/api/admin/catalog/bundles` | List / create bundles |
| PUT/DELETE | `/api/admin/catalog/bundles/:id` | Update / delete bundle |
| GET/POST | `/api/admin/catalog/pricing-rules` | List / create pricing rules |
| PUT/DELETE | `/api/admin/catalog/pricing-rules/:id` | Update / delete rule |
| GET/POST | `/api/admin/catalog/top-questions` | Property-type top questions (commercial) |
| PUT/DELETE | `/api/admin/catalog/top-questions/:id` | Update / delete top question |

**Pricing rule types** (`ruleType` + JSON `config`): `option_tier_lookup`, `tier_key_template`, `base_plus_increment`, `multi_field_sum`, `flat_plus_extra_units`, `conditional_addon`, `tier_range_map`, `bundle_discount`, `booking_surcharge`, `quote_only`, `starts_from`, `force_tbc`.

Set tier amounts per region via existing `PUT /api/regions/:id/prices`. Run `npm run db:seed:pricing-rules` after catalog seed to populate default rules.

## Auth API (existing)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/auth/login` | Login |
| GET | `/api/users/me` | Profile (authenticated) |
| GET/POST/PUT/DELETE | `/api/users/*` | User management |

## Pricing rules (residential)

- Prices are final and **VAT-free** (`VAT_ENABLED=false`). Source of truth: `src/scripts/seed/zonePrices.js` (the "Residential Services — Website Price List"), seeded per zone into the **region matrix** (`region_prices` + `pricing_tiers`)
- **Starting from** on each card is the lowest price across the four zones; the exact price is shown once the postcode sets the zone. Postcodes outside London and the M25 are "not covered"
- **CP12**: meter + 1 appliance, then **+£10 per additional appliance** (stepper, `applianceCount`). CO alarm fitted for £35 (**£40 in Zone 1**) when none is present
- **Boiler service**: Essential / Standard / Premium (`boilerType` = `essential` | `standard` | `premium`)
- **CP12 + boiler bundle** (one bundle, no stacking) is chosen inside the CP12 form with the "Add a boiler service?" question (`boilerAddon` = `none` | `essential` | `standard` | `premium`). It adds a Boiler Service line plus a bundle discount line: **Essential** is a fixed bundle price with 2 appliances included (£119.99 / £109.99 / £109.99 / £119.99 for zones 1–4); **Standard** and **Premium** take **5% off** the CP12 + service total (£185.23 / £280.23 in Zone 2 with 1 appliance). Extra appliances are added on top. The separate Boiler Service card is always the standalone price
- **PAT**: bands of up to 10 / 15 / 20 appliances, then **+£2.50 per appliance above 20**
- **FSC**: Grade D (flat / house / small HMO) or Grade A (large HMO / communal building); 1–3 alarms base, then **+£15 per extra alarm** in Zone 2 (zone prices in `zonePrices.js`)
- **ELC**: 1–3 lights base, then per extra light
- **FRA**: **House / HMO** by bedrooms (1–3 base, then per bedroom); **Building** by floors / communal areas (1 base, then per extra)
- **Floor plan**: studio, then 1–2 bed single storey, +£20 per extra bedroom, +£39.99 per extra floor
- **Asbestos**: limited survey (up to 2 samples) or full property survey (up to 5 bed); **more than 5 bed is quote only**
- **Quote-only lines** (for example an asbestos survey over 5 bed) make the whole basket a quote request: `POST /api/bookings` answers `422 REQUIRES_QUOTATION` and the booking form submits to `POST /api/quotations`
- **Non-emergency callout**: £119.99 per fault type (gas / electrical / fire), includes 1 hour of labour
- **EICR + PAT**: £10 bundle discount line; **FSC + ELC**: −£20; **FSC + ELC + FRA**: −£40; **EPC + floor plan**: −£20
- **Congestion zone**: +£18; **No parking**: +£5; **Priority Service** (optional, `priorityService: true`): +£99
- **EPC 7+ bedrooms**: TBC
- Question text can carry an info tooltip via `conditionalLogic.info`; `validation.stepper: true` renders a number question as a − / + stepper

To apply a new price list: edit `zonePrices.js` (and tiers/questions in `catalogData.js` if the structure changed), then run `npm run db:seed:catalog && npm run db:seed:regions && npm run db:seed:prices && npm run db:seed:pricing-rules`.

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
