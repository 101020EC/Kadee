# Grill 2026-11-09 — MY date twice, proposer remembered

Shared with customshub PLAN.md D104 (Hub's Kadee port gets the same fixes).

- **Found:** public/MY.docx reads "ด้วยวันที่ วันที่ {{doc_date_th}}" (PTK has it once). Templates load from Firestore `templates`
  first, so the Firestore copy needs the same fix.
- **Found:** the memo form's ชื่อ/ตำแหน่งผู้เสนอ change formData only; only ตั้งค่า writes localStorage.
- **D1:** MY reads "ด้วยวันที่ {{doc_date_th}}" once (public file + Firestore copy).
- **D2:** typing the proposer name or position in the memo form saves it on that device (localStorage + ตั้งค่า state), so every
  later memo on that machine starts with it. Still never sent to the cloud (audit D1).
- **Built 2026-11-09:** MY.docx — the second "วันที่ " run before {{doc_date_th}} removed (render check: "ด้วยวันที่ 9 พฤศจิกายน 2569 นายทดสอบ").
  Firestore `templates` is empty (0 docs), so the public file is what kadeepd serves — nothing to fix there. page.js handleInputChange
  writes proposer_name / proposer_position to localStorage + ตั้งค่า state. Lint + next build clean.
