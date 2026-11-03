# RESTO V1 — Production Business Data Inventory

**Document Version:** 1.0.0 (Phase 1 Baseline Discovery)  
**Date:** 2026-11-03  
**Database Architect:** Principal PostgreSQL & Data Systems Engineer  
**Source Database:** Supabase Cloud PostgreSQL 15 (`aws-0-ap-south-1.pooler.supabase.com:6543`, Mumbai)  
**Extraction File:** [`backend/supabase/backup_v1_production_data.json`](file:///Users/akashlodhi/Downloads/RESTO/backend/supabase/backup_v1_production_data.json)  
**Status:** **100% RECONCILED & SERIALIZED**

---

## 1. Executive Summary

This document presents a granular, entity-level inventory of all live business data residing in Supabase PostgreSQL 15. Every single record currently driving restaurant dining, QR table orders, and payments is cataloged below to ensure complete data preservation during the Node.js V2 architecture transition.

---

## 2. Granular Entity-by-Entity Data Inventory

### 2.1 Entity: `public.restaurants` (1 Record)
Multi-tenant root record containing business configuration and tax settings:
- **`id`:** `rest-olive-ember-01`
- **`name`:** "The Olive & Ember"
- **`slug`:** `olive-and-ember`
- **`description`:** "Wood-fired Mediterranean and contemporary dining in Bengaluru."
- **`address`:** "14, Wood Street, 100ft Road, Downtown Heritage District, Bengaluru, Karnataka 560038"
- **`phone`:** "+91 98765 43210"
- **`email`:** "concierge@oliveandember.com"
- **`tax_percentage`:** `5.00` (5% GST)
- **`service_charge_percentage`:** `0.00`
- **`currency`:** "INR"
- **`timezone`:** "Asia/Kolkata"
- **`wifi_ssid`:** "OliveGuest"
- **`wifi_password`:** "welcome2026"
- **`is_active`:** `true`

---

### 2.2 Entity: `public.restaurant_tables` (8 Records)
Physical dining tables across floor zones:
| Table ID | Number | Capacity | Zone | Status | QR Code Link |
|---|---|---|---|---|---|
| `tbl-e25df5aa` | **01** | 4 | Main Dining | available | `/menu?table=01` |
| `tbl-66989669` | **02** | 4 | Main Dining | available | `/menu?table=02` |
| `tbl-440e4da2` | **03** | 4 | Patio & Outdoor | available | `/menu?table=03` |
| `tbl-291d9d25` | **04** | 2 | VIP Lounge | available | `/menu?table=04` |
| `tbl-888d0a3f` | **05** | 4 | Main Dining | available | `/menu?table=05` |
| `tbl-02d81c32` | **06** | 4 | Main Dining | occupied | `/menu?table=06` |
| `tbl-a5a3bdbd` | **07** | 4 | Main Dining | available | `/menu?table=07` |
| `tbl-9728146f` | **08** | 4 | Main Dining | available | `/menu?table=08` |

---

### 2.3 Entity: `public.categories` (5 Records)
Menu categories arranged by display sort order:
| Category ID | Name | Description | Sort Order | Is Visible |
|---|---|---|---|---|
| `cat-starters` | **Starters** | Small plates and wood-fired appetizers | 1 | true |
| `cat-mains` | **Main Course** | Slow-roasted meats and ember specialties | 2 | true |
| `cat-pizza-pasta`| **Pizza & Pasta** | Hand-stretched sourdough and fresh pasta | 3 | true |
| `cat-beverages` | **Beverages** | Artisanal drinks and slow brews | 4 | true |
| `cat-desserts` | **Desserts** | Desserts from the pastry kitchen | 5 | true |

---

### 2.4 Entity: `public.menu_items` (7 Records)
Active culinary items with dietary tags, allergens, and preparation times:
| Item ID | Category | Dish Name | Price (INR) | Food Type | Addons Available | Popular / Special |
|---|---|---|---|---|---|---|
| `item-1` | `cat-starters` | Truffle & Wild Mushroom Arancini | 425.00 | veg | Sharing Plate (+Rs 180) | Popular / Special |
| `item-2` | `cat-starters` | Charred Harissa Chicken Skewers | 545.00 | non_veg | Extra Skewer (+Rs 120) | Popular |
| `item-3` | `cat-mains` | Slow-Braised Rosemary Lamb Shank | 895.00 | non_veg | Extra Jus (+Rs 90) | Chef Special |
| `item-4` | `cat-pizza-pasta`| Wood-Fired Margherita Pizza | 595.00 | veg | Buffalo Mozzarella (+Rs 150)| Popular |
| `item-5` | `cat-pizza-pasta`| Handmade Truffle Tagliolini | 685.00 | veg | Shaved Truffle (+Rs 220) | Chef Special |
| `item-6` | `cat-desserts` | Amalfi Lemon & Basil Panna Cotta | 365.00 | veg | None | Standard |
| `item-7` | `cat-desserts` | Dark Chocolate Fondant | 395.00 | veg | Extra Gelato (+Rs 110) | Popular / Special |

---

### 2.5 Entity: `public.orders` & `public.order_items` (2 Orders)
Active and historical customer orders:

#### Order 1: `DF-1001`
- **ID:** `ord-1793716086618-66e706`
- **Table Number:** 06
- **Customer:** "Guest Table 06"
- **Status:** `completed`
- **Financial Breakdown:**
  - Subtotal: `Rs 395.00`
  - CGST (2.5%): `Rs 9.88`
  - SGST (2.5%): `Rs 9.87`
  - Total GST (5%): `Rs 19.75`
  - Service Charge: `Rs 0.00`
  - Final Total: `Rs 414.75`
- **Items:** 1x Dark Chocolate Fondant (`item-7`) @ Rs 395.00

#### Order 2: `DF-1002`
- **ID:** `ord-1793716091124-77a812`
- **Table Number:** 04
- **Customer:** "Rohan Sharma"
- **Status:** `pending`
- **Financial Breakdown:**
  - Subtotal: `Rs 685.00`
  - CGST: `Rs 17.13`
  - SGST: `Rs 17.12`
  - Total GST (5%): `Rs 34.25`
  - Final Total: `Rs 719.25`
- **Items:** 1x Handmade Truffle Tagliolini (`item-5`) @ Rs 685.00

---

### 2.6 Entity: `public.payments` (2 Records)
Audited transaction settlements:
| Payment ID | Order ID | Amount (INR) | Payment Method | Status | Reference |
|---|---|---|---|---|---|
| `pay-1793716086618` | `ord-1793716086618-66e706` | 414.75 | counter | completed | `COUNTER-REC-01` |
| `pay-1793716091124` | `ord-1793716091124-77a812` | 719.25 | upi | pending | `UPI-DEMO-REF-99` |

---

### 2.7 Entity: `public.staff` (1 Record)
Staff administrative user profile:
- **`id`:** `staff-manager-01`
- **`restaurant_id`:** `rest-olive-ember-01`
- **`full_name`:** "Restaurant Manager"
- **`email`:** "manager@oliveandember.com"
- **`role`:** `restaurant_admin`
- **`is_active`:** `true`

---

### 2.8 Entity: `public.realtime_events` (7 Records)
Historical event log capturing lifecycle state transitions:
1. `order_created` (Order `DF-1001` placed)
2. `order_status_updated` (`DF-1001` accepted)
3. `order_status_updated` (`DF-1001` preparing)
4. `order_status_updated` (`DF-1001` ready)
5. `order_status_updated` (`DF-1001` served)
6. `payment_completed` (`DF-1001` settled)
7. `order_created` (Order `DF-1002` placed)

---

## 3. Data Integrity & Financial Consistency Check
- All order totals match exact item unit prices + customization add-ons + 5% GST (`CGST + SGST`).
- All foreign keys (`restaurant_id`, `category_id`, `table_id`, `order_id`) point to existing rows with zero orphan records.
- 100% of these records have been archived in `backend/supabase/backup_v1_production_data.json`.
