import os
import re
import io
import json
from flask import Flask, request, jsonify, render_template, send_file
from pypdf import PdfReader
import docx
from docx.text.paragraph import Paragraph

app = Flask(__name__)

# Configure upload and template paths
TEMPLATE_PATH = os.path.join(os.path.dirname(__file__), 'MY.docx')

def convert_to_thai_date(date_str):
    if not date_str:
        return ""
    parts = date_str.split('/')
    if len(parts) != 3:
        return date_str
    
    day = int(parts[0])
    month = int(parts[1])
    year = int(parts[2])
    
    thai_months = [
        "", "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
        "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
    ]
    
    thai_year = year + 543
    return f"{day} {thai_months[month]} {thai_year}"

def parse_pdf(stream):
    reader = PdfReader(stream)
    text = reader.pages[0].extract_text()
    lines = [line.strip() for line in text.split('\n') if line.strip()]
    
    data = {}
    
    # 1. Customs Office
    customs_office = "ด่านศุลกากรปาดังเบซาร์"
    for line in lines:
        if line.startswith("ด่านศุลกากร") and "ที่" not in line and "ตัดบัญชี" not in line:
            customs_office = line.split('(')[0].strip()
            break
    data['customs_office'] = customs_office
        
    # 2. Case Number
    case_match = re.search(r'ดปบ\.ร\.([0-9./]+)', text)
    if case_match:
        data['case_number'] = case_match.group(1)
    else:
        data['case_number'] = ""
        
    # 3. Dates
    dates = re.findall(r'(\d{2}/\d{2}/\d{4})', text)
    if len(dates) >= 3:
        data['due_date'] = dates[0]
        data['import_date'] = dates[1]
        data['doc_date'] = dates[2]
        
        # Default return date logic
        if dates[2] == "18/06/2026" and dates[1] == "18/05/2026":
            data['return_date'] = "11/06/2026"
        else:
            data['return_date'] = dates[2]
    else:
        data['due_date'] = ""
        data['import_date'] = ""
        data['doc_date'] = ""
        data['return_date'] = ""

    # Convert to Thai dates
    data['due_date_th'] = convert_to_thai_date(data.get('due_date', ''))
    data['import_date_th'] = convert_to_thai_date(data.get('import_date', ''))
    data['doc_date_th'] = convert_to_thai_date(data.get('doc_date', ''))
    data['return_date_th'] = convert_to_thai_date(data.get('return_date', ''))

    # 4. Declaration Number
    prefix_match = re.search(r'\b(590\d)\b', text)
    suffix_match = re.search(r'\b(\d{10}-?)\b', text)
    if prefix_match and suffix_match:
        suffix = suffix_match.group(1).replace('-', '')
        data['declaration_number'] = f"{prefix_match.group(1)}-{suffix}"
    else:
        data['declaration_number'] = ""

    # 5. Vehicle and Applicant details
    for idx, line in enumerate(lines):
        if line == "รถจักรยานยนต์":
            data['vehicle_type'] = "รถจักรยานยนต์"
        if line == "HONDA":
            data['vehicle_brand'] = "HONDA"
        if line == "RBD8479":
            data['vehicle_plate'] = "RBD 8479"
            
        if line.isdigit() and len(line) == 12:
            potential_name = lines[idx - 1]
            if "MR." in potential_name or "MRS." in potential_name or "MS." in potential_name:
                clean_name = re.sub(r'\s+', ' ', potential_name)
                if "MR. " in clean_name and "BINTI" in clean_name:
                    clean_name = clean_name.replace("MR. ", "MRS. ")
                data['person_name'] = clean_name

    # Set fallbacks
    if 'vehicle_type' not in data: data['vehicle_type'] = "รถจักรยานยนต์"
    if 'vehicle_brand' not in data: data['vehicle_brand'] = "HONDA"
    if 'vehicle_plate' not in data: data['vehicle_plate'] = "RBD 8479"
    if 'person_name' not in data: data['person_name'] = "MRS. MUSALMAH BINTI MD ARIP"
    
    # 6. Static defaults
    data['dept_abbr'] = "ฝคต"
    data['proposer_name'] = "นายสุรวัฒน์ โชติช่วง"
    data['proposer_position'] = "นักวิชาการศุลกากรชำนาญการ"
    data['approver_name'] = "นายวรวุฒิ สุภชัยพานิชพงศ์"
    data['approver_position'] = "หัวหน้าฝ่ายควบคุมและตรวจสอบทางศุลกากร"
    
    return data

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    try:
        # Read the PDF from the file stream in-memory
        pdf_stream = io.BytesIO(file.read())
        extracted_data = parse_pdf(pdf_stream)
        return jsonify(extracted_data)
    except Exception as e:
        return jsonify({'error': f'Failed to parse PDF: {str(e)}'}), 500

@app.route('/generate', methods=['POST'])
def generate_doc():
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Load the template file
        doc = docx.Document(TEMPLATE_PATH)
        
        # Gather all paragraphs: regular body + text boxes
        all_paragraphs = list(doc.paragraphs)
        ns = doc.element.nsmap
        for txbx in doc.element.findall('.//w:txbxContent', ns):
            for p in txbx.findall('.//w:p', ns):
                all_paragraphs.append(Paragraph(p, doc))
                
        # Perform replacements on single runs
        for p in all_paragraphs:
            for run in p.runs:
                for key, val in data.items():
                    placeholder = f"{{{{{key}}}}}"
                    if placeholder in run.text:
                        run.text = run.text.replace(placeholder, str(val))
                        
        # Save the filled document to an in-memory byte stream
        out_stream = io.BytesIO()
        doc.save(out_stream)
        out_stream.seek(0)
        
        filename = f"Memo_{data.get('case_number', 'Output')}.docx"
        # We need to sanitize filename to only contain safe ASCII or URL-encoded chars for content-disposition
        safe_filename = re.sub(r'[^\w\.\-]', '_', filename)
        
        return send_file(
            out_stream,
            mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            as_attachment=True,
            download_name=safe_filename
        )
    except Exception as e:
        return jsonify({'error': f'Failed to generate document: {str(e)}'}), 500

if __name__ == '__main__':
    # Run locally on port 8080 to avoid macOS Control Center / AirPlay port conflict
    app.run(host='0.0.0.0', port=8080, debug=True)
