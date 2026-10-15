# Declaration number parsing — grill 2026-10-15

## Bug

Uploading `3.pdf` filled the declaration number as `5901-2332057884`.
The correct value is `5901-7690603544`.

`app/api/upload/route.js` builds the number from two parts:

- **Prefix**: the line 11 below the "เลขที่ใบขนสินค้าพิเศษ" header. This is the office code (5901 Padang Besar, 5801 Sadao) and it was correct.
- **Suffix**: the **first** standalone 10-digit number anywhere in the PDF text (`/\b(\d{10})-?\b/`).
  In `3.pdf` the vehicle chassis number contains the 10-digit run `2332057884`, which appears
  before the real number, so the regex matched it instead.

## Decisions

1. **The 10-digit suffix has a fixed shape**: `[type 1][BE year 2][month 2][sequence 5]`.
   The type digit is confirmed by the user (2026-10-15):
   - `7` means a foreign vehicle (MY tabs).
   - `6` means a Thai vehicle (the รถไทย tab).

   The year and month track "วัน/เวลาที่บันทึกใบขนสินค้าพิเศษ", the date the declaration was
   recorded. In code this is `import_date`, the line 19 below the header. The user confirmed this
   on 2026-10-15. It is **not** the write-off date, which can be months later (PTK.pdf: `6712…`
   against a write-off date of 07/2026).

2. **Selection rule.** Collect every standalone 10-digit number and keep the first one that passes both checks:
   - The type digit matches the tab: `6` for `thai_vehicle`, `7` for `violation` and `vis`.
   - Digits 2–5 equal the BE year (2 digits) and month of `import_date`.

   If nothing passes, leave `declaration_number` empty. The field is required in the form, so the
   user has to type it. A blank field is safer than a wrong number that slips into the memo.

   Checked against the samples:
   - `7690504405` matches 18/05/2026
   - `6671201603` matches 14/12/2024
   - `7690603544` matches June 2569
   - The chassis run `2332057884` would be year 33, month 20, so it fails the check.

## Verification (local, 2026-10-15)

| File | Tab | Result |
|---|---|---|
| 8479.pdf | vis | `5901-7690504405` |
| VIS_PDF.pdf | violation | `5801-7690523870` |
| PTK.pdf | thai_vehicle | `5901-6671201603` |
| PTK.pdf | vis (wrong tab) | empty |
| 8479.pdf | thai_vehicle (wrong tab) | empty |
| synthetic: chassis `2332057884` first, then `7690603544` | vis, import 06/2026 | `7690603544` (old code picked `2332057884`) |

`3.pdf` itself was not run: macOS blocks reading from OneDrive in this environment.
