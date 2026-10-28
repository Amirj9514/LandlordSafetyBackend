# Developer Prompt: Book Now Service Modals (Residential)

Date: 28 Oct 2026
Page: http://localhost:3000/book-now/
Price source: LLSI Residential Services — Website Price List (Zone 1–4)

---

## Rules (read first)

- Change **only** the service booking modals listed below. Do not rebuild or restyle the Book Now page.
- **Do not change the existing pricing logic.** Zone pricing, postcode lookup, totals and cart calculations stay exactly as they are.
- Do not change the summary, the totals, or how Add to Cart and Cancel work.
- Do not change other pages or other services.
- Prices on cards are the **starting prices** (Zone 2, the lowest across all zones). The final price still comes from the site's existing zone pricing.
- Use the site's existing fonts, colours and components. Do not add new ones.

---

## Site styling (from localhost:3000)

| Element | Style |
| --- | --- |
| Body, labels, cards, buttons | DM Sans |
| Modal titles, headings | Manrope 700, 18px, `#0A0F2E` |
| Body text | `#111827` |
| Primary blue | `#0571FF` |
| Modal / card background | `#FFFFFF` |
| Primary button (Add to Cart) | Same as the site's `.btn-primary--block`: `#0571FF`, white text, DM Sans 16px, weight 700, padding 16px, border-radius 36px, no shadow |
| Cancel button | Keep as now: `#6C757D`, white text, radius 6px, padding 6px 12px |
| Option cards and pills | Soft 1px border, radius 8px. Selected: border and text `#0571FF` with the site's existing selected background |
| More button | Small outline button: transparent, 1px `#0571FF` border, `#0571FF` text, 13px, padding 4px 12px, fully rounded |
| Info icon (i) | As currently on the site |

Do not change the Book Now button in the page header.

---

## Shared behaviour (all modals unless stated otherwise)

| Element | Behaviour |
| --- | --- |
| Default | Nothing selected. Required questions (*) must be answered. |
| Cards / pills | One choice per question. Clicking one deselects the others. |
| Tips | Open on load. Close when an option in that question is selected. Never reopen on their own. |
| Info icon | Always visible beside the label. Opens and closes the tip at any time. Tip must not sit under the heading. |
| More button | Shows 5 cards first. More reveals the hidden "Contact us" card, then hides itself. |
| Contact card | Dashed border, text "Contact us". Not bookable. |
| Stepper | FSC alarms and ELC lights only. Max 15. Minus disabled at 0, plus disabled at 15. Price line under it updates live using the existing pricing logic. |
| Phones (≤400px) | Cards wrap two per row. |

---

## 1. Gas Safety Certificate (CP12) — from £54.99

**Q1: Number of appliances \*** — replace the stepper with 4 cards. Count and price only (no "From").

| Card | Price |
| --- | --- |
| 1 Appliance | £54.99 |
| 2 Appliances | £64.99 |
| 3 Appliances | £74.99 |
| 4 Appliances | £84.99 |

Tip: "Count boilers, hobs/cookers and fires as appliances. Starting price is £54.99. Your exact price depends on your postcode zone."

**Q2: CO alarm present at property? \*** — pills: Yes, No. No checkbox, no extra text.
- Tip: "A CO alarm is mandatory where a boiler is installed."
- When **No** is selected, show an add-on row below, in this order:
  1. "Install CO alarm: £35"
  2. "No thanks"
- Add-on row hidden for Yes. Neither add-on pill pre-selected.
- Install CO alarm adds the CO alarm to the cart. No thanks adds nothing.
- Zone 1 CO alarm (£40) is applied by the existing zone pricing. Never shown as text.

**Q3: Add a boiler service?** — pills, in this order:
1. "CP12 + Essential: £109.99"
2. "No thanks"
- No Standard or Premium here. Nothing pre-selected.
- **Exception:** this tip is hidden on load and opens only from the info icon.
- Tip: "Add your boiler service to this visit. Essential is included at £109.99 with your CP12 (2 appliances). For Standard or Premium, choose Boiler Service separately."
- No discount text on the pills.

---

## 2. Electrical Certificate (EICR) — from £89.99

**Q1: Property type \*** — 5 cards, then a small More button revealing the 7+ card.

| Card | Price |
| --- | --- |
| Studio | £89.99 |
| 1–3 Bed | £104.99 |
| 4 Bed | £124.99 |
| 5 Bed | £144.99 |
| 6 Bed | £164.99 |
| 7+ Bed (behind More) | Contact us |

Tip: "Starting price is £89.99. You can book up to 6 bedrooms. For more than 6 bedrooms, contact us. Your exact price depends on your postcode zone."

**Q2: Number of fuseboards \***

| Card | Price |
| --- | --- |
| 1 Fuseboard | Included |
| 2 Fuseboards | +£60 |
| 3 Fuseboards | +£120 |

Tip: "One fuseboard is included in the price. Each extra fuseboard is £60."

---

## 3. Fire Safety Certificate (FSC) — from £69.99

**Q1: Property type \***

| Card | Sub-text |
| --- | --- |
| Flat / House / Small HMO | Grade D / LD2 · from £69.99 |
| Large HMO / Flat or communal building | Grade A · from £119.99 |

Tip: "Large HMOs and flats with communal areas usually have a mixed system: Grade D alarms inside flats and Grade A alarms in communal areas. Grade A is charged for these properties."

**Q2: Number of alarms \*** — stepper.
- Selecting either property type sets the stepper to **3** automatically. Customer can increase up to 15.
- Price = base (1–3 alarms) + per-alarm charge above 3, from the existing zone pricing (Zone 2: +£15).
- Price line: "Your price: £X". At 15: add "(maximum here, contact us above 15)".
- Tip: "Each additional alarm is £15. You can book up to 15 alarms. For more than 15, contact us."
- No "up to 3 is the default" note.

---

## 4. Fire Risk Assessment (FRA) — from £159.99

**Q1: Property type \*** — cards: "House / HMO" (From £159.99), "Building (communal)" (From £159.99).
Tip: "Houses, flats and HMOs are priced by bedroom. Buildings are priced by floor or communal area."

**Q2 if House / HMO: Number of bedrooms \*** (hidden until selected)

| Card | Price |
| --- | --- |
| 1–3 Bed | £159.99 |
| 4 Bed | £179.99 |
| 5 Bed | £199.99 |
| 6 Bed | £219.99 |
| 7+ Bed | Contact us |

Tip: "You can book up to 6 bedrooms. For more than 6 bedrooms, contact us."

**Q2 if Building: Number of floors / communal areas \*** (hidden until selected)

| Card | Price |
| --- | --- |
| 1 | £159.99 |
| 2 | £199.98 |
| 3 | £239.97 |
| 4 | £279.96 |
| 5 | £319.95 |
| 6 | £359.94 |
| 7+ | Contact us |

Tip: "You can book up to 6 floors or communal areas. For more than 6, contact us."

Only the Q2 set matching Q1 is shown.

---

## 5. Floor Plan — from £99.99

**Q1: Number of bedrooms \***

| Card | Price |
| --- | --- |
| Studio | £99.99 |
| 1–2 Bed | £109.99 |
| 3 Bed | £129.99 |
| 4 Bed | £149.99 |
| 5 Bed | £169.99 |
| 6 Bed | £189.99 |
| 7+ Bed | Contact us |

Tip: "Starting price is £99.99. You can book up to 6 bedrooms. For more than 6 bedrooms, contact us."

**Q2: Number of floors \*** — 3 cards only.

| Card | Price |
| --- | --- |
| 1 Floor | Included |
| 2 Floors | +£39.99 |
| 3 Floors | +£79.98 |

Tip: "1 floor is included. Each extra floor is +£39.99. You can book up to 3 floors. For more than 3, contact us."

---

## 6. Emergency Lighting Certificate (ELC) — from £69.99

No property type question.

**Q1: Number of lights \*** — stepper.
- Starts at **3** when the modal opens, price line "Your price: £69.99".
- Customer can increase up to 15.
- Price = base (1–3 lights) + per-light charge above 3, from the existing zone pricing (Zone 2: +£15).
- At 15: add "(maximum here, contact us above 15)".
- Tip: "Each additional light is £15. You can book up to 15 lights. For more than 15, contact us."
- No "up to 3 is the default" note.

---

## 7. Portable Appliance Testing (PAT) — from £54.99

**Q1: Number of appliances \*** — replace the stepper with 3 cards.

| Card | Price |
| --- | --- |
| Up to 10 | £54.99 |
| Up to 15 | £64.99 |
| Up to 20 | £79.99 |

Tip: "Up to 10 appliances: £54.99. Each additional appliance over 20 is £2.50."

---

## 8. Energy Performance Certificate (EPC) — from £69.99

**Q1: Number of bedrooms \*** — 5 cards, then a small More button revealing the 7+ card.

| Card | Price |
| --- | --- |
| Studio | £69.99 |
| 1–3 Bed | £99.99 |
| 4 Bed | £119.99 |
| 5 Bed | £139.99 |
| 6 Bed | £159.99 |
| 7+ Bed (behind More) | Contact us |

Tip: "Starting price is £69.99. You can book up to 6 bedrooms. For more than 6 bedrooms, contact us. Your exact price depends on your postcode zone."

---

## 9. Asbestos Survey — from £349.99

**Q1: Property type \*** — cards, no prices: "Flat / House", "Building".
Tip: "Starting price is £349.99. Your exact price depends on your postcode zone."

**Q2: Type of survey \*** — cards, no prices: "Management", "Refurbishment / Demolition".
Tip: "Management surveys are for occupied properties. Refurbishment / Demolition surveys are needed before building work. Both are the same price."

**Q3: Survey size \***

| Card | Sub-text | Price |
| --- | --- | --- |
| Limited | Up to 2 samples | £349.99 |
| Full property | Up to 5 bed | £599.99 |
| Full property (dashed) | 6+ bed | Contact us |

Tip: "A limited survey covers up to 2 samples. A full property survey covers up to 5 bedrooms. For more than 5 bedrooms, contact us."

---

## 10. Non-Emergency Callout — £150 per fault type

**Q1: Fault type \*** — cards: Gas £150, Electrical £150, Fire £150.
Tip: "£150 per fault type. Includes 1 hour of labour only. Parts and materials are charged separately."

**Q2: Describe the issue \*** — multi-line text box (about 4 lines, resizable), soft border, radius 8px.
Placeholder: "For example: boiler shows an error code and has no hot water."

---

## Open items (do not build until confirmed)

1. CP12 CO alarm: confirm Yes/No starts with nothing selected.
2. Bundle discount display: not part of this build.
3. Option card radius and selected state: 8px is provisional. Use the live services step values.
4. FSC / ELC stepper: confirm whether customers may go below 3.
5. PAT above 20 appliances: confirm how customers book (contact card or stepper).
6. Non-Emergency Callout: £150 confirmed for all three fault types. It is not in the zone price list, so confirm whether it varies by zone.
