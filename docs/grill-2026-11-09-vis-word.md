# Grill 2026-11-09 — VIS header, page-2 signatures, no-split phrases in Word

Status: built 2026-11-09 — D1–D4 done (see Result)

## Facts found in the code

- Live templates are `public/PTK.docx`, `public/MY.docx`, `public/VIS.docx`. Firestore `templates/*`
  has no documents (checked 2026-11-09), so editing `public/` + push `main` = live.
- `app/api/generate/route.js` only runs docxtemplater on the template; no post-processing of the XML.
- VIS.docx header paragraph on BOTH pages = `[ครุฑ] บันทึกข้อความ <tab> บันทึกข้อความ`, the second one
  `w:color FFFFFF` (white, invisible on screen but selectable/searchable, and pushes layout).
- VIS.docx page-2 signature blocks are positioned with runs of spaces only, e.g.
  `"                 (" {{vis_chief_name}} ")" ... <tab><tab><tab> "          (" {{vis_head_service_name}} ")"`
  and the position line below has its own different count of spaces → names of different length
  never line up with their position. Page 1 (proposer / approver / vis_head_service) is built the same way.
- Body paragraphs are `thaiDistribute`; templates already carry hand-tuned `w:spacing` (−12…+16 twips)
  on individual runs — tuned for one sample text, wrong once placeholders hold other lengths.
- Word on this Mac breaks Thai lines only at spaces; the office PC breaks between Thai words
  (memory `word-applescript-verify`). Line positions can't be predicted server-side.

## Decisions

- **D1. ลบ "บันทึกข้อความ" สีขาวที่ซ้ำในหัวกระดาษ VIS ทั้ง 2 หน้า** — remove the `<w:tab/>` run and the
  white `บันทึกข้อความ` run after it, and the white colour in the paragraph mark rPr. Visible header unchanged.
- **D2. กันวลีข้ามบรรทัดด้วย non-breaking space ไม่ใช่ character spacing** — ตอนสร้างไฟล์ แทนช่องว่างภายในวลีที่
  กำหนดด้วย U+00A0 ทั้ง 3 แม่แบบ วลีทั้งก้อนลงบรรทัดใหม่พร้อมกันเสมอ ไม่คำนวณ condensed/expanded อัตโนมัติ
  (เดาตำแหน่งตัดบรรทัดของ Word เครื่องที่ทำงานไม่ได้) บรรทัดบนอาจยืดห่าง — ผู้ใช้บีบเองใน Word ถ้าต้องการ
- **D3. วลีที่กัน (ทั้ง 3 แม่แบบ)** — วันที่ ("วันที่/ลงวันที่/เมื่อวันที่ 9 พฤศจิกายน 2569");
  กฎหมาย/คำสั่ง ("พ.ศ. 2530", "มาตรา 202", "ข้อ 22.2", "ข้อ 9 02 01 04 (6.2.5.2)", "ที่ 146/2561",
  "ประเภท 3 (ค)", "ภาค 4", "(3) (ก)"); จำนวน ("1,000 บาท", "จำนวน 15 วัน"); เลขทะเบียน — เฉพาะ
  ตัวอักษรหน้ากับตัวเลข ("กจ 123") ชื่อจังหวัดตัดลงบรรทัดใหม่ได้
- **D4. ลายเซ็นหน้า 2 VIS เท่านั้น จัดกึ่งกลางด้วย center tab stop** — หน้า 1 คงเดิม; แต่ละคน (นิติกร,
  นายด่านฯ, หัวหน้าฝ่ายบริการฯ, ผอ.ส่วนบริการฯ) ชื่อกับตำแหน่งใช้ center tab ตำแหน่งเดียวกัน วางกึ่งกลาง
  ที่ตำแหน่งเดิมของคนนั้น (ไม่รวมเป็นแนวเดียว) แทนการเคาะช่องว่าง ชื่อยาวสั้นแค่ไหนก็ตรงกัน
  ตำแหน่ง ผอ. อยู่ใน textbox เดียวกับหมายเหตุ (กันล้นหน้า) — คงไว้ใน textbox แต่ตั้ง tab ให้ตรงกับชื่อ

## Build checklist

1. VIS.docx: D1 (both headers) + D4 (page-2 signatures) — edit XML of `public/VIS.docx`.
2. `app/api/generate/route.js`: after `doc.render`, D2/D3 NBSP pass over `word/document.xml` text
   (all 3 templates) — handle phrases split across runs (literal "วันที่ " + `{{doc_date_th}}`).
3. Verify in Word on this Mac: page count unchanged (VIS = 2 pages), signature centers equal for
   short/long names, phrases never split; `npm run build`; push `main` = deploy.

## Result (2026-11-09)

- D1/D4 applied to `public/VIS.docx`. Centre tabs (twips from left margin), measured from the old
  space-padded layout: นิติกร 5330, นายด่านฯ 1910, หัวหน้าฝ่ายบริการฯ + ผอ. 6650 (they were 6630 / 6680,
  <1 mm apart from space padding — set to one value).
- D2/D3 in `app/lib/keepTogether.js`, called from `app/api/generate/route.js` after `doc.render`;
  plate handled on the value (`keepPlateTogether`).
- Verified: Word page counts old vs new equal for all 3 templates (MY +1 line, still 1 page);
  `/api/generate` on kadee-offline returns all 3 systems. NOT verified visually: centre tabs —
  Word's AppleScript can no longer export PDF or report positions, and QuickLook/docx-preview
  ignore centre tabs. Check one real VIS file in Word.
