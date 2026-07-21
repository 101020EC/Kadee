"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useEffect, useRef } from 'react';

const DEFAULT_URL_VIOLATION = 'https://rmonhufcsumwdnrzhqmo.supabase.co/storage/v1/object/public/Template/MY.docx';
const DEFAULT_URL_VIS = 'https://rmonhufcsumwdnrzhqmo.supabase.co/storage/v1/object/public/Template/VIS.docx';
const DEFAULT_URL_THAI_VEHICLE = 'https://rmonhufcsumwdnrzhqmo.supabase.co/storage/v1/object/public/Template/PTK.docx';

const INITIAL_FORM = {
  case_number: '',
  customs_office: '',
  import_office: '',
  declaration_number: '',
  person_name: '',
  passport_number: '',
  nationality: '',
  vehicle_type: '',
  vehicle_brand: '',
  vehicle_plate: '',
  import_date_th: '',
  due_date_th: '',
  return_date_th: '',
  doc_date_th: '',
  fine_days: '',
  fine_amount: '',
  fine_amount_th: '',
  receipt_number: '',
  receipt_date_th: '',
  dept_abbr: '',
  proposer_name: '',
  proposer_position: '',
  approver_name: '',
  approver_position: ''
};

const THAI_MONTH_NUM = {
  'มกราคม': 1, 'กุมภาพันธ์': 2, 'มีนาคม': 3, 'เมษายน': 4, 'พฤษภาคม': 5, 'มิถุนายน': 6,
  'กรกฎาคม': 7, 'สิงหาคม': 8, 'กันยายน': 9, 'ตุลาคม': 10, 'พฤศจิกายน': 11, 'ธันวาคม': 12
};

// "15 กรกฎาคม 2569" หรือ "15/07/2569" → "69.7.15" (ปี พ.ศ. 2 หลัก.เดือน.วัน)
function fileDatePart(thaiDate) {
  if (!thaiDate) return '';
  const parts = thaiDate.trim().split(/\s+/);
  if (parts.length === 3 && THAI_MONTH_NUM[parts[1]]) {
    const d = parseInt(parts[0], 10);
    const y = parseInt(parts[2], 10);
    if (d && y) return `${y % 100}.${THAI_MONTH_NUM[parts[1]]}.${d}`;
  }
  const slash = thaiDate.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slash) return `${parseInt(slash[3], 10) % 100}.${parseInt(slash[2], 10)}.${parseInt(slash[1], 10)}`;
  return '';
}

// "กจ 123 สงขลา" → "กจ123", "AK123" → "AK123"
function filePlatePart(plate) {
  const tokens = (plate || '').trim().split(/\s+/);
  const joined = tokens.length >= 2 ? tokens[0] + tokens[1] : (tokens[0] || '');
  return joined.replace(/[\/\\:*?"<>|]/g, '');
}

// โลโก้รถสปอร์ตทึบ (ตามรูปต้นแบบ 1) — ใช้กับแท็บ MY VIS
const CarSolidIcon = () => (
  <svg viewBox="0 0 64 36" width="20" height="12" fill="currentColor" aria-hidden="true" style={{ marginRight: '8px', verticalAlign: '-1px' }}>
    <path d="M3 24 c-2 -6 3 -11 11 -12 l9 -1 c4 -6 13 -9 21 -7 l3 6 c9 1 15 5 15 11 l-1 4 h-6 a8 8 0 0 0 -15 0 h-17 a8 8 0 0 0 -15 0 h-4 z" />
    <circle cx="16" cy="28" r="5" />
    <circle cx="47" cy="28" r="5" />
  </svg>
);

// โลโก้รถเก๋งลายเส้น (ตามรูปต้นแบบ 2) — ใช้กับแท็บ MY ผิดพิธีการ
const CarOutlineIcon = () => (
  <svg viewBox="0 0 64 40" width="20" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true" style={{ marginRight: '8px', verticalAlign: '-1px' }}>
    <path d="M4 30 c-1 -7 2 -12 7 -15 c6 -4 12 -6 20 -6 c8 0 15 3 20 8 c6 1 10 4 10 9 l-1 4 h-8" />
    <path d="M22 30 h20 M4 30 h4" />
    <circle cx="15" cy="30" r="6" />
    <circle cx="15" cy="30" r="2.5" fill="currentColor" />
    <circle cx="49" cy="30" r="6" />
    <circle cx="49" cy="30" r="2.5" fill="currentColor" />
    <path d="M18 15 c4 -3 8 -4 13 -4 l1 6 l-17 0 c0 0 1 -1 3 -2 z M35 11 c5 0 9 2 13 6 l-13 0 z" fill="currentColor" stroke="none" />
  </svg>
);

export default function Home() {
  const [activeSystem, setActiveSystem] = useState('thai_vehicle'); // 'violation' | 'vis' | 'thai_vehicle'
  const [appState, setAppState] = useState('upload'); // 'upload' | 'loading' | 'form'
  const [file, setFile] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const configPanelRef = useRef(null);

  useEffect(() => {
    if (showConfig && configPanelRef.current) {
      setTimeout(() => {
        configPanelRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [showConfig]);
  
  // Persistent Settings
  const [proposerName, setProposerName] = useState('');
  const [proposerPosition, setProposerPosition] = useState('นักวิชาการศุลกากรชำนาญการ');
  const [approverSelection, setApproverSelection] = useState('approver_1'); // 'approver_1' | 'approver_2'
  const [approver1Name, setApprover1Name] = useState('นายวรวุฒิ สุภชัยพานิชพงศ์');
  const [approver2Name, setApprover2Name] = useState('นางสาวปิลันธนา ไตรทิพพิสมัย');

  // VIS-specific Officer Settings
  const [visLegalName, setVisLegalName] = useState('นายสุทิน ภูเดช');
  const [visLegalPosition, setVisLegalPosition] = useState('นิติกรชำนาญการ');
  const [visChiefName, setVisChiefName] = useState('นายหะริน หอวัง');
  const [visChiefPosition, setVisChiefPosition] = useState('นายด่านศุลกากรปาดังเบซาร์');
  const [visHeadServiceName, setVisHeadServiceName] = useState('นายพิภพ พุทธสุข');
  const [visHeadServicePosition, setVisHeadServicePosition] = useState('หัวหน้าฝ่ายบริการศุลกากรที่ 2');
  const [visDirectorName, setVisDirectorName] = useState('นายพิภพ พุทธสุข');
  const [visDirectorPosition, setVisDirectorPosition] = useState('ผู้อำนวยการส่วนบริการศุลกากร');

  // Template Manager Admin Auth
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [verifiedPassword, setVerifiedPassword] = useState('');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [replacingType, setReplacingType] = useState(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  // Form fields
  const [formData, setFormData] = useState(INITIAL_FORM);

  const [toast, setToast] = useState({ show: false, message: '' });
  const [generating, setGenerating] = useState(false);
  // Popup ยืนยันวันที่นำยานพาหนะออกไปจริง (เฉพาะ MY ผิดพิธีการ)
  const [confirmDialog, setConfirmDialog] = useState({ show: false, date: '' });

  // Load saved settings from localStorage on mount
  useEffect(() => {
    // Clear template URLs saved by older versions — templates are now fixed in code
    localStorage.removeItem('template_url_violation');
    localStorage.removeItem('template_url_vis');
    localStorage.removeItem('template_url_thai_vehicle');

    const savedPropName = localStorage.getItem('proposer_name');
    if (savedPropName !== null) setProposerName(savedPropName);
    
    const savedPropPos = localStorage.getItem('proposer_position');
    if (savedPropPos) setProposerPosition(savedPropPos);

    const savedAppSel = localStorage.getItem('approver_selection');
    if (savedAppSel) setApproverSelection(savedAppSel);
    
    const savedApp1Name = localStorage.getItem('approver_1_name');
    if (savedApp1Name) setApprover1Name(savedApp1Name);
    
    const savedApp2Name = localStorage.getItem('approver_2_name');
    if (savedApp2Name) setApprover2Name(savedApp2Name);

    // VIS persistent settings
    const savedVisLegalName = localStorage.getItem('vis_legal_name');
    if (savedVisLegalName !== null) setVisLegalName(savedVisLegalName);
    const savedVisLegalPos = localStorage.getItem('vis_legal_position');
    if (savedVisLegalPos) setVisLegalPosition(savedVisLegalPos);

    const savedVisChiefName = localStorage.getItem('vis_chief_name');
    if (savedVisChiefName !== null) setVisChiefName(savedVisChiefName);
    const savedVisChiefPos = localStorage.getItem('vis_chief_position');
    if (savedVisChiefPos) setVisChiefPosition(savedVisChiefPos);

    const savedVisHeadName = localStorage.getItem('vis_head_service_name');
    if (savedVisHeadName !== null) setVisHeadServiceName(savedVisHeadName);
    const savedVisHeadPos = localStorage.getItem('vis_head_service_position');
    if (savedVisHeadPos) setVisHeadServicePosition(savedVisHeadPos);

    const savedVisDirName = localStorage.getItem('vis_director_name');
    if (savedVisDirName !== null) setVisDirectorName(savedVisDirName);
    const savedVisDirPos = localStorage.getItem('vis_director_position');
    if (savedVisDirPos) setVisDirectorPosition(savedVisDirPos);

    // Fetch latest settings from Cloud API
    fetch('/api/vis-settings')
      .then(res => res.json())
      .then(resData => {
        if (resData.success && resData.data) {
          const d = resData.data;
          if (d.approver_selection) {
            setApproverSelection(d.approver_selection);
            localStorage.setItem('approver_selection', d.approver_selection);
          }
          if (d.approver_1_name) {
            setApprover1Name(d.approver_1_name);
            localStorage.setItem('approver_1_name', d.approver_1_name);
          }
          if (d.approver_2_name) {
            setApprover2Name(d.approver_2_name);
            localStorage.setItem('approver_2_name', d.approver_2_name);
          }
          if (d.proposer_name !== undefined) {
            setProposerName(d.proposer_name);
            localStorage.setItem('proposer_name', d.proposer_name);
          }
          if (d.proposer_position) {
            setProposerPosition(d.proposer_position);
            localStorage.setItem('proposer_position', d.proposer_position);
          }
          if (d.vis_chief_name) {
            setVisChiefName(d.vis_chief_name);
            localStorage.setItem('vis_chief_name', d.vis_chief_name);
          }
          if (d.vis_chief_position) {
            setVisChiefPosition(d.vis_chief_position);
            localStorage.setItem('vis_chief_position', d.vis_chief_position);
          }
          if (d.vis_director_name) {
            setVisDirectorName(d.vis_director_name);
            localStorage.setItem('vis_director_name', d.vis_director_name);
          }
          if (d.vis_director_position) {
            setVisDirectorPosition(d.vis_director_position);
            localStorage.setItem('vis_director_position', d.vis_director_position);
          }
          if (d.vis_head_service_name) {
            setVisHeadServiceName(d.vis_head_service_name);
            localStorage.setItem('vis_head_service_name', d.vis_head_service_name);
          }
          if (d.vis_head_service_position) {
            setVisHeadServicePosition(d.vis_head_service_position);
            localStorage.setItem('vis_head_service_position', d.vis_head_service_position);
          }
          if (d.vis_legal_name) {
            setVisLegalName(d.vis_legal_name);
            localStorage.setItem('vis_legal_name', d.vis_legal_name);
          }
          if (d.vis_legal_position) {
            setVisLegalPosition(d.vis_legal_position);
            localStorage.setItem('vis_legal_position', d.vis_legal_position);
          }
        }
      })
      .catch(err => {
        console.warn('Could not fetch cloud settings:', err);
      });
  }, []);

  useEffect(() => {
    if (appState === 'upload') {
      document.body.classList.add('hero-bg');
    } else {
      document.body.classList.remove('hero-bg');
    }
    return () => document.body.classList.remove('hero-bg');
  }, [appState]);

  const handleVerifyAdminPassword = async () => {
    try {
      const response = await fetch('/api/templates/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPasswordInput })
      });
      if (response.ok) {
        setIsAdminAuthenticated(true);
        setVerifiedPassword(adminPasswordInput);
        setAdminPasswordInput('');
        showToast('เข้าสู่ระบบผู้ดูแลระบบเทมเพลตสำเร็จ!');
      } else {
        const data = await response.json();
        showToast(data.error || 'รหัสผ่านไม่ถูกต้อง');
      }
    } catch (err) {
      console.error(err);
      showToast('เกิดข้อผิดพลาดในการตรวจสอบรหัสผ่าน');
    }
  };

  const handleReplaceTemplate = async (type, fileSelected) => {
    if (!fileSelected) return;

    if (!fileSelected.name.endsWith('.docx')) {
      showToast('กรุณากรอกไฟล์นามสกุล .docx เท่านั้น');
      return;
    }

    setReplacingType(type);
    const formDataUpload = new FormData();
    formDataUpload.append('file', fileSelected);
    formDataUpload.append('type', type);
    formDataUpload.append('password', verifiedPassword);

    try {
      const response = await fetch('/api/templates/upload', {
        method: 'POST',
        body: formDataUpload
      });

      if (response.ok) {
        showToast('อัปเดตเทมเพลตและเขียนทับเรียบร้อยแล้ว!');
      } else {
        const errData = await response.json();
        showToast(errData.error || 'ไม่สามารถเขียนทับเทมเพลตได้');
      }
    } catch (err) {
      console.error(err);
      showToast('เกิดข้อผิดพลาดขณะอัปเดตเทมเพลต');
    } finally {
      setReplacingType(null);
    }
  };

  const showToast = (message) => {
    setToast({ show: true, message });
    setTimeout(() => {
      setToast({ show: false, message: '' });
    }, 5000);
  };

  // Change handlers for configuration
  const handlePropNameChange = (e) => {
    setProposerName(e.target.value);
    localStorage.setItem('proposer_name', e.target.value);
  };

  const handlePropPosChange = (e) => {
    setProposerPosition(e.target.value);
    localStorage.setItem('proposer_position', e.target.value);
  };

  const handleAppSelectionChange = (selection) => {
    setApproverSelection(selection);
    localStorage.setItem('approver_selection', selection);
  };

  const handleApp1NameChange = (e) => {
    setApprover1Name(e.target.value);
    localStorage.setItem('approver_1_name', e.target.value);
  };

  const handleApp2NameChange = (e) => {
    setApprover2Name(e.target.value);
    localStorage.setItem('approver_2_name', e.target.value);
  };

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleFileChange = (e) => {
    const files = e.target.files;
    if (files.length > 0) {
      processFile(files[0]);
    }
  };

  const processFile = async (selectedFile) => {
    if (selectedFile.type !== 'application/pdf') {
      showToast('กรุณาอัปโหลดไฟล์ PDF เท่านั้น');
      return;
    }
    
    setFile(selectedFile);
    setAppState('loading');

    const uploadFormData = new FormData();
    uploadFormData.append('file', selectedFile);
    uploadFormData.append('proposer_name', proposerName || '');
    uploadFormData.append('system', activeSystem);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: uploadFormData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'วิเคราะห์ไฟล์ล้มเหลว');
      }

      const extractedData = await response.json();
      
      // Auto-merge with persistent configurations
      const activeApproverName = approverSelection === 'approver_1' ? approver1Name : approver2Name;
      const activeApproverPosition = approverSelection === 'approver_1'
        ? 'หัวหน้าฝ่ายควบคุมและตรวจสอบทางศุลกากร'
        : 'หัวหน้าฝ่ายสืบสวนและปราบปราม';
      const activeDeptAbbr = approverSelection === 'approver_1' ? 'ฝคต' : 'ฝปป';

      const mergedData = {
        ...INITIAL_FORM,
        ...extractedData,
        proposer_name: proposerName,
        proposer_position: proposerPosition,
        approver_name: activeApproverName,
        approver_position: activeApproverPosition,
        dept_abbr: activeDeptAbbr
      };

      setFormData(mergedData);
      setAppState('form');
    } catch (error) {
      console.error(error);
      showToast(error.message || 'ไม่สามารถวิเคราะห์ไฟล์ PDF ได้');
      setAppState('upload');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // Format fine amount with thousands separator, e.g. 1000 -> 1,000
    if (name === 'fine_amount') {
      const digits = value.replace(/\D/g, '');
      const formatted = digits ? Number(digits).toLocaleString('en-US') : '';
      setFormData(prev => ({ ...prev, fine_amount: formatted }));
      return;
    }

    // Automatically change department abbreviation if approver position changes
    if (name === 'approver_position') {
      let deptAbbr = 'ฝคต';
      if (value.includes('สืบสวน')) {
        deptAbbr = 'ฝปป';
      }
      setFormData(prev => ({
        ...prev,
        [name]: value,
        dept_abbr: deptAbbr
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleReset = () => {
    setAppState('upload');
    setFile(null);
  };

  // ปุ่มเริ่มใหม่: ล้างข้อมูลที่กรอกทั้งหมดแล้วกลับหน้าอัพโหลด
  const handleStartOver = () => {
    setFormData(INITIAL_FORM);
    setFile(null);
    setAppState('upload');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate empty fields before generating
    const requiredFields = [
      'customs_office', 'declaration_number', 'person_name',
      'vehicle_type', 'vehicle_brand', 'vehicle_plate',
      'import_date_th', 'due_date_th', 'doc_date_th',
      'dept_abbr', 'proposer_name', 'proposer_position',
      'approver_name', 'approver_position'
    ];

    if (activeSystem === 'violation' || activeSystem === 'thai_vehicle') {
      requiredFields.push('case_number');
    }
    if (activeSystem === 'violation') {
      // มีเฉพาะ MY ผิดพิธีการที่ใช้วันที่นำยานพาหนะออกไปจริงในเอกสาร
      requiredFields.push('return_date_th');
    } else if (activeSystem === 'vis') {
      requiredFields.push('import_office');
      requiredFields.push('passport_number');
      requiredFields.push('nationality');
      requiredFields.push('fine_days');
      requiredFields.push('fine_amount');
      requiredFields.push('fine_amount_th');
      requiredFields.push('receipt_number');
      requiredFields.push('receipt_date_th');
    }

    const emptyFields = requiredFields.filter(field => {
      const val = formData[field];
      return val === undefined || val === null || String(val).trim() === '';
    });

    if (emptyFields.length > 0) {
      showToast('กรุณากรอกข้อมูลในแบบฟอร์มให้ครบทุกช่องก่อนสร้างเอกสาร!');
      return;
    }

    // MY ผิดพิธีการ: ยืนยันวันที่นำยานพาหนะออกไปจริงก่อนสร้างไฟล์
    if (activeSystem === 'violation') {
      setConfirmDialog({ show: true, date: formData.return_date_th });
      return;
    }

    await generateDocument(formData);
  };

  // ผู้ใช้กดตกลงใน popup ยืนยันวันที่ (อาจแก้ไขวันที่ใน popup แล้ว)
  const handleConfirmDate = async () => {
    if (!confirmDialog.date.trim()) {
      showToast('กรุณากรอกวันที่นำยานพาหนะออกไปจริง');
      return;
    }
    const updated = { ...formData, return_date_th: confirmDialog.date.trim() };
    setFormData(updated);
    setConfirmDialog({ show: false, date: '' });
    await generateDocument(updated);
  };

  const generateDocument = async (data) => {
    setGenerating(true);

    let activeTemplateUrl = DEFAULT_URL_VIOLATION;
    if (activeSystem === 'vis') activeTemplateUrl = DEFAULT_URL_VIS;
    else if (activeSystem === 'thai_vehicle') activeTemplateUrl = DEFAULT_URL_THAI_VEHICLE;

    try {
      // Calculate fine_days_p2 dynamically based on final fine_days value (for VIS)
      // ตัวเลขปกติเติมช่องว่างนำหน้า เพราะ template เขียน "จำนวน{{fine_days_p2}}" ติดกัน
      // เพื่อให้กรณี "เกินกว่า 10" ออกมาเป็น "จำนวนเกินกว่า 10 วัน"
      const parsedDays = parseInt(data.fine_days, 10);
      const fineDaysP2 = (!isNaN(parsedDays) && parsedDays > 10) ? "เกินกว่า 10"
        : data.fine_days ? ` ${data.fine_days}` : '';

      const payload = {
        ...data,
        vis_legal_name: visLegalName,
        vis_legal_position: visLegalPosition,
        vis_chief_name: visChiefName,
        vis_chief_position: visChiefPosition,
        vis_head_service_name: visHeadServiceName,
        vis_head_service_position: visHeadServicePosition,
        vis_director_name: visDirectorName,
        vis_director_position: visDirectorPosition,
        fine_days_p2: fineDaysP2,
        template_url: activeTemplateUrl
      };

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'ไม่สามารถสร้างบันทึกข้อความได้');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      // ชื่อไฟล์: {ปี2หลัก.เดือน.วัน จากวันที่ตัดบัญชี}{TH|MY}_{ทะเบียนรถ}.docx เช่น 69.7.15TH_กจ123.docx
      const datePart = fileDatePart(data.doc_date_th);
      const platePart = filePlatePart(data.vehicle_plate);
      const prefix = activeSystem === 'thai_vehicle' ? 'TH' : 'MY';
      const fileName = `${datePart}${prefix}_${platePart || 'Output'}.docx`;

      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      showToast(error.message || 'เกิดข้อผิดพลาดในการดาวน์โหลดเอกสาร');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="container">
      {/* Toast Notification */}
      {toast.show && (
        <div className="toast">
          <i className="fa-solid fa-circle-exclamation"></i>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Popup ยืนยันวันที่นำยานพาหนะออกไปจริง (MY ผิดพิธีการ) */}
      {confirmDialog.show && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{
            background: 'var(--bg-color)', borderRadius: '16px', padding: '1.8rem 2rem',
            maxWidth: '420px', width: '90%', boxShadow: '0 20px 45px rgba(0, 0, 0, 0.25)'
          }}>
            <h3 style={{ marginBottom: '0.8rem', color: 'var(--text-main)' }}>
              <i className="fa-regular fa-calendar-check" style={{ marginRight: '8px', color: 'var(--accent-primary)' }}></i>
              ยืนยันวันที่
            </h3>
            <p style={{ color: 'var(--text-main)', marginBottom: '1rem' }}>
              วันที่ยานพาหนะนำออกไปจริง คือ วันที่ <strong>{confirmDialog.date}</strong> ใช่หรือไม่?
              หากไม่ใช่ สามารถแก้ไขวันที่ด้านล่างก่อนกดตกลง
            </p>
            <div className="form-group" style={{ marginBottom: '1.2rem' }}>
              <input
                type="text"
                value={confirmDialog.date}
                onChange={(e) => setConfirmDialog(prev => ({ ...prev, date: e.target.value }))}
                placeholder="เช่น 15 กรกฎาคม 2569"
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.8rem' }}>
              <button
                type="button"
                className="btn-back"
                onClick={() => setConfirmDialog({ show: false, date: '' })}
              >
                ยกเลิก
              </button>
              <button
                type="button"
                className="btn-generate"
                disabled={generating}
                onClick={handleConfirmDate}
                style={{ padding: '0.6rem 1.8rem' }}
              >
                ตกลง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ambient backgrounds */}
      <div className="ambient-glow glow-1"></div>
      <div className="ambient-glow glow-2"></div>

      <header>
        {appState === 'upload' ? (
          <>
            <div className="hero-logo">
              <i className="fa-solid fa-file-pdf"></i>
              <span>Buntuek</span>
            </div>
            <h1 className="hero-title">PDF to บันทึก</h1>
            <p className="hero-desc">กรอกบันทึกข้อความอัตโนมัติด้วยไฟล์ PDF</p>
          </>
        ) : (
          <>
            <h1>{activeSystem === 'violation' ? 'MY ผิดพิธีการ' : activeSystem === 'vis' ? 'MY VIS' : 'รถไทย'}</h1>
            <p>PDF to บันทึก</p>
          </>
        )}
      </header>

      {/* Tabs bar */}
      {appState === 'upload' && (
        <div className="system-tabs">
          <button 
            type="button" 
            className={`tab-btn ${activeSystem === 'thai_vehicle' ? 'active' : ''}`}
            onClick={() => setActiveSystem('thai_vehicle')}
          >
            <i className="fa-solid fa-car-side" style={{ marginRight: '8px' }}></i>
            รถไทย
          </button>
          <button 
            type="button" 
            className={`tab-btn ${activeSystem === 'violation' ? 'active' : ''}`}
            onClick={() => setActiveSystem('violation')}
          >
            <CarOutlineIcon />
            MY ผิดพิธีการ
          </button>
          <button 
            type="button" 
            className={`tab-btn ${activeSystem === 'vis' ? 'active' : ''}`}
            onClick={() => setActiveSystem('vis')}
          >
            <CarSolidIcon />
            MY VIS
          </button>
        </div>
      )}

      <div className={`card ${appState === 'upload' ? 'upload-card' : ''}`}>
        {/* State 1: Upload */}
        {appState === 'upload' && (
          <div>
            <div 
              className={`upload-zone ${isDragOver ? 'dragover' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => document.getElementById('file-picker').click()}
            >
              <input 
                type="file" 
                id="file-picker" 
                style={{ display: 'none' }} 
                accept=".pdf"
                onChange={handleFileChange}
              />
              <div className="upload-icon">
                <i className="fa-solid fa-file-pdf"></i>
              </div>
              <h3>ลากไฟล์ PDF ของ {activeSystem === 'violation' ? 'MY ผิดพิธีการ' : activeSystem === 'vis' ? 'MY VIS' : 'รถไทย'} มาวางที่นี่</h3>
              <p>หรือคลิกเพื่อเลือกไฟล์จากเครื่องคอมพิวเตอร์ของคุณ (รองรับเฉพาะไฟล์ PDF)</p>
              <button 
                className="btn-select" 
                onClick={(e) => {
                  e.stopPropagation();
                  document.getElementById('file-picker').click();
                }}
              >
                เลือกไฟล์
              </button>
            </div>

            {/* Configuration Panel */}
            <div className="config-panel" ref={configPanelRef}>
              <div className="config-header" onClick={() => setShowConfig(!showConfig)}>
                <span>
                  <i className="fa-solid fa-sliders" style={{ marginRight: '8px' }}></i>
                  ตั้งค่า
                </span>
                <i className={`fa-solid ${showConfig ? 'fa-chevron-up' : 'fa-chevron-down'}`}></i>
              </div>
              {showConfig && (
                <div className="config-body" style={{ marginTop: '1.5rem' }}>
                  
                  {/* Proposer settings */}
                  <h4 style={{ fontSize: '0.9rem', color: 'var(--accent-primary)', marginBottom: '0.8rem', fontWeight: '700' }}>
                    <i className="fa-solid fa-user-pen" style={{ marginRight: '6px' }}></i> ข้อมูลเจ้าหน้าที่ผู้เสนอรายงาน
                  </h4>
                  <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: '0.85rem' }}>ชื่อผู้เสนอรายงาน:</label>
                      <input 
                        type="text" 
                        value={proposerName}
                        onChange={handlePropNameChange}
                        placeholder="เช่น นายทด ลอง"
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: '0.85rem' }}>ตำแหน่งผู้เสนอรายงาน:</label>
                      <select 
                        value={proposerPosition}
                        onChange={handlePropPosChange}
                        style={{
                          backgroundColor: 'var(--input-bg)',
                          border: '1px solid var(--input-border)',
                          borderRadius: '10px',
                          padding: '0.4rem 0.8rem',
                          color: 'var(--text-main)',
                          fontSize: '0.85rem',
                          fontFamily: 'inherit'
                        }}
                      >
                        <option value="นักวิชาการศุลกากรชำนาญการ">นักวิชาการศุลกากรชำนาญการ</option>
                        <option value="นักวิชาการศุลกากรปฏิบัติการ">นักวิชาการศุลกากรปฏิบัติการ</option>
                      </select>
                    </div>
                  </div>

                  {/* Approver settings */}
                  <h4 style={{ fontSize: '0.9rem', color: 'var(--accent-primary)', marginBottom: '0.8rem', fontWeight: '700' }}>
                    <i className="fa-solid fa-signature" style={{ marginRight: '6px' }}></i> ข้อมูลผู้อนุมัติรายงาน (เลือกและแก้ไขชื่อได้)
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                      <input 
                        type="radio" 
                        id="select_app_1"
                        checked={approverSelection === 'approver_1'}
                        onChange={() => handleAppSelectionChange('approver_1')}
                        style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                      />
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        <label htmlFor="select_app_1" style={{ cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem' }}>
                          หัวหน้าฝ่ายควบคุมและตรวจสอบทางศุลกากร (ฝคต.)
                        </label>
                        <input 
                          type="text"
                          value={approver1Name}
                          onChange={handleApp1NameChange}
                          placeholder="ชื่อหัวหน้าฝ่ายควบคุมและตรวจสอบฯ"
                          style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                      <input 
                        type="radio" 
                        id="select_app_2"
                        checked={approverSelection === 'approver_2'}
                        onChange={() => handleAppSelectionChange('approver_2')}
                        style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                      />
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        <label htmlFor="select_app_2" style={{ cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem' }}>
                          หัวหน้าฝ่ายสืบสวนและปราบปราม (ฝปป.)
                        </label>
                        <input 
                          type="text"
                          value={approver2Name}
                          onChange={handleApp2NameChange}
                          placeholder="ชื่อหัวหน้าฝ่ายสืบสวนและปราบปราม"
                          style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* VIS-specific roles settings */}
                  <h4 style={{ fontSize: '0.9rem', color: 'var(--accent-primary)', marginBottom: '0.8rem', marginTop: '1.5rem', fontWeight: '700' }}>
                    <i className="fa-solid fa-users-gear" style={{ marginRight: '6px' }}></i> ข้อมูลเจ้าหน้าที่ระบบ MY VIS (กำหนดและแก้ไขได้)
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                    {/* 1. นายด่าน */}
                    <div className="grid-2">
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: '0.85rem' }}>ชื่อนายด่าน:</label>
                        <input 
                          type="text" 
                          value={visChiefName} 
                          onChange={e => setVisChiefName(e.target.value)} 
                          placeholder="เช่น นายหะริน หอวัง"
                          style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} 
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: '0.85rem' }}>ตำแหน่งนายด่าน:</label>
                        <input 
                          type="text" 
                          value={visChiefPosition} 
                          onChange={e => setVisChiefPosition(e.target.value)} 
                          placeholder="เช่น นายด่านศุลกากรปาดังเบซาร์"
                          style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} 
                        />
                      </div>
                    </div>

                    {/* 2. ผู้อำนวยการส่วนบริการ */}
                    <div className="grid-2">
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: '0.85rem' }}>ชื่อผู้อำนวยการส่วนบริการ:</label>
                        <input 
                          type="text" 
                          value={visDirectorName} 
                          onChange={e => setVisDirectorName(e.target.value)} 
                          placeholder="เช่น นายพิภพ พุทธสุข"
                          style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} 
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: '0.85rem' }}>ตำแหน่งผู้อำนวยการส่วนบริการ:</label>
                        <input 
                          type="text" 
                          value={visDirectorPosition} 
                          onChange={e => setVisDirectorPosition(e.target.value)} 
                          placeholder="เช่น ผู้อำนวยการส่วนบริการศุลกากร"
                          style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} 
                        />
                      </div>
                    </div>

                    {/* 3. หัวหน้าฝ่ายบริการฯ 2 */}
                    <div className="grid-2">
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: '0.85rem' }}>ชื่อหัวหน้าฝ่ายบริการฯ 2:</label>
                        <input 
                          type="text" 
                          value={visHeadServiceName} 
                          onChange={e => setVisHeadServiceName(e.target.value)} 
                          placeholder="เช่น นายพิภพ พุทธสุข"
                          style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} 
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: '0.85rem' }}>ตำแหน่งหัวหน้าฝ่ายบริการฯ 2:</label>
                        <input 
                          type="text" 
                          value={visHeadServicePosition} 
                          onChange={e => setVisHeadServicePosition(e.target.value)} 
                          placeholder="เช่น หัวหน้าฝ่ายบริการศุลกากรที่ 2"
                          style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} 
                        />
                      </div>
                    </div>

                    {/* 4. นิติกร */}
                    <div className="grid-2">
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: '0.85rem' }}>ชื่อนิติกร:</label>
                        <input 
                          type="text" 
                          value={visLegalName} 
                          onChange={e => setVisLegalName(e.target.value)} 
                          placeholder="เช่น นายสุทิน ภูเดช"
                          style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} 
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: '0.85rem' }}>ตำแหน่งนิติกร:</label>
                        <input 
                          type="text" 
                          value={visLegalPosition} 
                          onChange={e => setVisLegalPosition(e.target.value)} 
                          placeholder="เช่น นิติกรชำนาญการ"
                          style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} 
                        />
                      </div>
                    </div>
                  </div>

                  {/* Footer buttons row: Template (ซ้าย) | บันทึก (กลาง) | ซ่อนตั้งค่า (ขวา) */}
                  <div className="config-actions">
                    <button
                      type="button"
                      className="btn-select btn-template"
                      onClick={() => setShowTemplateModal(true)}
                      style={{
                        background: 'rgba(123, 44, 191, 0.15)',
                        color: 'var(--accent-primary)',
                        border: 'none',
                        boxShadow: 'none'
                      }}
                    >
                      <i className="fa-solid fa-file-word" style={{ marginRight: '6px' }}></i>
                      Template
                    </button>

                    <button
                      type="button"
                      className="btn-select btn-save"
                      onClick={async () => {
                          localStorage.setItem('proposer_name', proposerName);
                          localStorage.setItem('proposer_position', proposerPosition);
                          localStorage.setItem('approver_selection', approverSelection);
                          localStorage.setItem('approver_1_name', approver1Name);
                          localStorage.setItem('approver_2_name', approver2Name);
                          
                          // Save VIS specific settings to localStorage
                          localStorage.setItem('vis_legal_name', visLegalName);
                          localStorage.setItem('vis_legal_position', visLegalPosition);
                          localStorage.setItem('vis_chief_name', visChiefName);
                          localStorage.setItem('vis_chief_position', visChiefPosition);
                          localStorage.setItem('vis_head_service_name', visHeadServiceName);
                          localStorage.setItem('vis_head_service_position', visHeadServicePosition);
                          localStorage.setItem('vis_director_name', visDirectorName);
                          localStorage.setItem('vis_director_position', visDirectorPosition);

                          // Save settings to Cloud
                          try {
                            const cloudRes = await fetch('/api/vis-settings', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                approver_selection: approverSelection,
                                approver_1_name: approver1Name,
                                approver_2_name: approver2Name,
                                proposer_name: proposerName,
                                proposer_position: proposerPosition,
                                vis_chief_name: visChiefName,
                                vis_chief_position: visChiefPosition,
                                vis_director_name: visDirectorName,
                                vis_director_position: visDirectorPosition,
                                vis_head_service_name: visHeadServiceName,
                                vis_head_service_position: visHeadServicePosition,
                                vis_legal_name: visLegalName,
                                vis_legal_position: visLegalPosition,
                              })
                            });
                            const cloudData = await cloudRes.json();
                            if (cloudData.success) {
                              showToast(cloudData.cloud ? 'บันทึกการตั้งค่าลงระบบ Cloud เรียบร้อยแล้ว!' : 'บันทึกการตั้งค่าเรียบร้อยแล้ว!');
                            } else {
                              showToast('บันทึกการตั้งค่าเรียบร้อยแล้ว!');
                            }
                          } catch (err) {
                            console.warn('Cloud save error:', err);
                            showToast('บันทึกการตั้งค่าในเครื่องเรียบร้อยแล้ว!');
                          }

                          setShowConfig(false);
                        }}
                    >
                      <i className="fa-solid fa-floppy-disk" style={{ marginRight: '6px' }}></i>
                      บันทึก
                    </button>

                    <button
                      type="button"
                      className="btn-back btn-hide"
                      onClick={() => setShowConfig(false)}
                    >
                      <i className="fa-solid fa-eye-slash" style={{ marginRight: '6px' }}></i>
                      ซ่อนตั้งค่า
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* State 2: Loading */}
        {appState === 'loading' && (
          <div className="loading-screen">
            <div className="spinner"></div>
            <h3>กำลังวิเคราะห์ไฟล์ PDF และสกัดข้อมูล...</h3>
            <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem', fontSize: '0.9rem' }}>
              ระบบกำลังดึงข้อมูล สรุปรายการ และคำนวณเบี้ยปรับสะสม
            </p>
          </div>
        )}

        {/* State 3: Form */}
        {appState === 'form' && (
          <div className="details-form">
            <form onSubmit={handleSubmit}>
              
              {/* Section 1: Case Info */}
              <div className="section-title">
                <i className="fa-solid fa-scale-balanced"></i> ข้อมูลใบขนสินค้าและด่านศุลกากร
              </div>
              <div className="grid-2">
                {activeSystem === 'violation' || activeSystem === 'thai_vehicle' ? (
                  <div className="form-group">
                    <label>เลขแฟ้มคดี (หลัง ดปบ.ร.)</label>
                    <input 
                      type="text" 
                      name="case_number" 
                      value={formData.case_number} 
                      onChange={handleInputChange} 
                      placeholder="เช่น 1000/1.01.2569"
                      required 
                    />
                  </div>
                ) : (
                  <div className="form-group">
                    <label>ด่านนำเข้าชั่วคราว</label>
                    <input 
                      type="text" 
                      name="import_office" 
                      value={formData.import_office} 
                      onChange={handleInputChange} 
                      required 
                    />
                  </div>
                )}
                <div className="form-group">
                  <label>ด่านศุลกากรที่ตัดบัญชี</label>
                  <input 
                    type="text" 
                    name="customs_office" 
                    value={formData.customs_office} 
                    onChange={handleInputChange} 
                    required 
                  />
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label>เลขที่ใบขนสินค้าพิเศษ</label>
                  <input 
                    type="text" 
                    name="declaration_number" 
                    value={formData.declaration_number} 
                    onChange={handleInputChange} 
                    required 
                  />
                </div>
                <div className="form-group">
                  <label>ชื่อผู้ขออนุญาต</label>
                  <input 
                    type="text" 
                    name="person_name" 
                    value={formData.person_name} 
                    onChange={handleInputChange} 
                    required 
                  />
                </div>
              </div>

              {activeSystem === 'vis' && (
                <div className="grid-2">
                  <div className="form-group">
                    <label>เลขที่หนังสือเดินทาง (Passport No.)</label>
                    <input 
                      type="text" 
                      name="passport_number" 
                      value={formData.passport_number} 
                      onChange={handleInputChange} 
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label>สัญชาติ (Nationality)</label>
                    <input 
                      type="text" 
                      name="nationality" 
                      value={formData.nationality} 
                      onChange={handleInputChange} 
                      required 
                    />
                  </div>
                </div>
              )}

              {/* Section 2: Vehicle details */}
              <div className="section-title">
                <i className="fa-solid fa-car"></i> รายละเอียดของยานพาหนะ
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label>ประเภทรถ</label>
                  <select
                    name="vehicle_type"
                    value={formData.vehicle_type}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">-- เลือกประเภทรถ --</option>
                    <option value="รถยนต์">รถยนต์</option>
                    <option value="รถจักรยานยนต์">รถจักรยานยนต์</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>ยี่ห้อรถ</label>
                  <input 
                    type="text" 
                    name="vehicle_brand" 
                    value={formData.vehicle_brand} 
                    onChange={handleInputChange} 
                    required 
                  />
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label>หมายเลขทะเบียนรถ</label>
                  <input 
                    type="text" 
                    name="vehicle_plate" 
                    value={formData.vehicle_plate} 
                    onChange={handleInputChange} 
                    required 
                  />
                </div>
                <div style={{ visibility: 'hidden' }} className="form-group"></div>
              </div>

              {/* Section 3: Dates */}
              <div className="section-title">
                <i className="fa-regular fa-calendar-days"></i> วันที่ทำรายการ (ไทย พ.ศ.)
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label>{activeSystem === 'thai_vehicle' ? 'วันที่นำยานพาหนะออกไปชั่วคราว' : 'วันนำเข้าชั่วคราว'}</label>
                  <input 
                    type="text" 
                    name="import_date_th" 
                    value={formData.import_date_th} 
                    onChange={handleInputChange} 
                    required 
                  />
                </div>
                <div className="form-group">
                  <label>{activeSystem === 'thai_vehicle' ? 'วันครบกำหนดสัญญาประกันจะนำกลับเข้าประเทศ' : 'วันครบกำหนดสัญญาประกันจะนำออกนอกประเทศ'}</label>
                  <input 
                    type="text" 
                    name="due_date_th" 
                    value={formData.due_date_th} 
                    onChange={handleInputChange} 
                    required 
                  />
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label>{activeSystem === 'thai_vehicle' ? 'วันที่นำยานพาหนะกลับเข้ามาจริง' : 'วันที่นำยานพาหนะออกไปจริง'}</label>
                  {activeSystem === 'violation' ? (
                    <input
                      type="text"
                      name="return_date_th"
                      value={formData.return_date_th}
                      onChange={handleInputChange}
                      required
                    />
                  ) : (
                    <input
                      type="text"
                      value=""
                      disabled
                      readOnly
                      style={{
                        background: 'rgba(128, 128, 128, 0.18)',
                        color: 'var(--text-muted)',
                        cursor: 'not-allowed'
                      }}
                    />
                  )}
                </div>
                <div className="form-group">
                  <label>วันที่ตัดบัญชี</label>
                  <input 
                    type="text" 
                    name="doc_date_th" 
                    value={formData.doc_date_th} 
                    onChange={handleInputChange} 
                    required 
                  />
                </div>
              </div>

              {/* Section 4: Fine details (VIS only) */}
              {activeSystem === 'vis' && (
                <>
                  <div className="section-title">
                    <i className="fa-solid fa-coins"></i> รายละเอียดเบี้ยปรับและการชำระเงิน (MY VIS)
                  </div>
                  <div className="grid-2">
                    <div className="form-group">
                      <label>จำนวนวันที่ล่าช้า (วัน)</label>
                      <input 
                        type="text" 
                        name="fine_days" 
                        value={formData.fine_days} 
                        onChange={handleInputChange} 
                        required 
                      />
                    </div>
                    <div className="form-group">
                      <label>เลขที่ใบเสร็จรับเงิน (ลงรับค่าปรับ)</label>
                      <input 
                        type="text" 
                        name="receipt_number" 
                        value={formData.receipt_number} 
                        onChange={handleInputChange} 
                        required 
                      />
                    </div>
                  </div>
                  <div className="grid-2">
                    <div className="form-group">
                      <label>วันที่ใบเสร็จรับเงิน</label>
                      <input
                        type="text"
                        name="receipt_date_th"
                        value={formData.receipt_date_th}
                        onChange={handleInputChange}
                        placeholder="เช่น 15 กรกฎาคม 2569"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>เงินปรับบังคับสัญญาประกัน (บาท)</label>
                      <input
                        type="text"
                        name="fine_amount"
                        value={formData.fine_amount}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>
                  <div className="grid-2">
                    <div className="form-group">
                      <label>จำนวนเงินตัวอักษรไทย</label>
                      <input
                        type="text"
                        name="fine_amount_th"
                        value={formData.fine_amount_th}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="form-group"></div>
                  </div>
                </>
              )}

              {/* Section 5: Officers */}
              <div className="section-title">
                <i className="fa-solid fa-user-tie"></i> เจ้าหน้าที่และอักษรย่อฝ่าย
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label>อักษรย่อฝ่ายรับผิดชอบ</label>
                  <input 
                    type="text" 
                    name="dept_abbr" 
                    value={formData.dept_abbr} 
                    onChange={handleInputChange} 
                    required 
                  />
                </div>
                <div className="form-group"></div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label>ชื่อเจ้าหน้าที่ผู้เสนอรายงาน</label>
                  <input 
                    type="text" 
                    name="proposer_name" 
                    value={formData.proposer_name} 
                    onChange={handleInputChange} 
                    required 
                  />
                </div>
                <div className="form-group">
                  <label>ตำแหน่งผู้เสนอรายงาน</label>
                  <input 
                    type="text" 
                    name="proposer_position" 
                    value={formData.proposer_position} 
                    onChange={handleInputChange} 
                    required 
                  />
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label>ชื่อผู้อนุมัติ/เปรียบเทียบปรับ</label>
                  <input 
                    type="text" 
                    name="approver_name" 
                    value={formData.approver_name} 
                    onChange={handleInputChange} 
                    required 
                  />
                </div>
                <div className="form-group">
                  <label>ตำแหน่งผู้อนุมัติ</label>
                  <input 
                    type="text" 
                    name="approver_position" 
                    value={formData.approver_position} 
                    onChange={handleInputChange} 
                    required 
                  />
                </div>
              </div>

              {/* Action Area */}
              <div className="actions-area">
                <button type="button" className="btn-back" onClick={handleReset}>
                  <i className="fa-solid fa-arrow-left"></i> กลับไปอัปโหลดใหม่
                </button>
                <button type="button" className="btn-back" onClick={handleStartOver}>
                  <i className="fa-solid fa-rotate-left"></i> เริ่มใหม่
                </button>
                <button type="submit" className="btn-generate" disabled={generating}>
                  {generating ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin"></i> กำลังสร้างไฟล์...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-file-word"></i> สร้างบันทึกข้อความ Word
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        )}
      </div>

      {/* Template Management Modal Overlay */}
      {showTemplateModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(29, 27, 38, 0.6)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div className="card" style={{
            width: '100%',
            maxWidth: '550px',
            padding: '2rem',
            position: 'relative',
            boxShadow: '0 30px 60px rgba(0, 0, 0, 0.25)',
            background: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: 'var(--text-color)'
          }}>
            {/* Modal Close Button */}
            <button
              onClick={() => { setShowTemplateModal(false); setAdminPasswordInput(''); }}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                fontSize: '1.2rem',
                cursor: 'pointer'
              }}
            >
              <i className="fa-solid fa-xmark"></i>
            </button>

            {!isAdminAuthenticated ? (
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fa-solid fa-lock" style={{ color: 'var(--accent-primary)' }}></i>
                  เข้าสู่โหมดแก้ไข Template
                </h3>
                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label style={{ fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>กรุณากรอกรหัสผ่านผู้ดูแลระบบ:</label>
                  <input 
                    type="password" 
                    value={adminPasswordInput}
                    onChange={e => setAdminPasswordInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleVerifyAdminPassword(); }}
                    placeholder="รหัสผ่านผู้ดูแลระบบ"
                    style={{ 
                      padding: '0.75rem 1rem', 
                      fontSize: '0.95rem',
                      width: '100%',
                      borderRadius: '8px',
                      border: '1px solid rgba(0, 0, 0, 0.1)',
                      outline: 'none'
                    }}
                    autoFocus
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.8rem' }}>
                  <button 
                    type="button"
                    className="btn-select"
                    onClick={() => { setShowTemplateModal(false); setAdminPasswordInput(''); }}
                    style={{
                      background: 'rgba(0, 0, 0, 0.05)',
                      color: 'var(--text-muted)',
                      boxShadow: 'none'
                    }}
                  >
                    ยกเลิก
                  </button>
                  <button 
                    type="button" 
                    className="btn-select"
                    onClick={handleVerifyAdminPassword}
                    style={{ padding: '0.6rem 2rem' }}
                  >
                    <i className="fa-solid fa-key" style={{ marginRight: '6px' }}></i> ยืนยัน
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fa-solid fa-file-word" style={{ color: 'var(--accent-primary)' }}></i>
                  จัดการ Template
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                  ดาวน์โหลดไฟล์เดิมไปแก้ไข หรืออัปโหลดไฟล์ .docx ใหม่ขึ้นมาเขียนทับระบบ
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                  {/* Thai Vehicle Template Form */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.8rem 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <span style={{ fontWeight: '700', fontSize: '0.9rem' }}>1. แม่แบบรถไทย (PTK.docx)</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>แม่แบบบันทึกข้อความสำหรับรถยนต์สัญชาติไทย</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                      <a 
                        href="/api/templates/download?type=thai_vehicle"
                        className="btn-select"
                        style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', padding: '0.4rem 0.8rem', fontSize: '0.8rem', background: 'rgba(123, 44, 191, 0.08)', color: 'var(--accent-primary)', border: 'none', boxShadow: 'none' }}
                      >
                        <i className="fa-solid fa-download" style={{ marginRight: '4px' }}></i> Download
                      </a>
                      <label 
                        className="btn-select"
                        style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', padding: '0.4rem 0.8rem', fontSize: '0.8rem', margin: 0 }}
                      >
                        <i className="fa-solid fa-upload" style={{ marginRight: '4px' }}></i> Replace
                        <input 
                          type="file" 
                          accept=".docx"
                          onChange={e => handleReplaceTemplate('thai_vehicle', e.target.files[0])}
                          style={{ display: 'none' }}
                          disabled={replacingType !== null}
                        />
                      </label>
                    </div>
                  </div>

                  {/* MY Violation Template Form */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.8rem 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <span style={{ fontWeight: '700', fontSize: '0.9rem' }}>2. แม่แบบมาเลเซีย ผิดพิธีการ (MY.docx)</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>แม่แบบบันทึกข้อความกรณีนำรถมาเลเซียออกเกินกำหนด (ผิดพิธีการ)</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                      <a 
                        href="/api/templates/download?type=violation"
                        className="btn-select"
                        style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', padding: '0.4rem 0.8rem', fontSize: '0.8rem', background: 'rgba(123, 44, 191, 0.08)', color: 'var(--accent-primary)', border: 'none', boxShadow: 'none' }}
                      >
                        <i className="fa-solid fa-download" style={{ marginRight: '4px' }}></i> Download
                      </a>
                      <label 
                        className="btn-select"
                        style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', padding: '0.4rem 0.8rem', fontSize: '0.8rem', margin: 0 }}
                      >
                        <i className="fa-solid fa-upload" style={{ marginRight: '4px' }}></i> Replace
                        <input 
                          type="file" 
                          accept=".docx"
                          onChange={e => handleReplaceTemplate('violation', e.target.files[0])}
                          style={{ display: 'none' }}
                          disabled={replacingType !== null}
                        />
                      </label>
                    </div>
                  </div>

                  {/* MY VIS Template Form */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.8rem 0' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <span style={{ fontWeight: '700', fontSize: '0.9rem' }}>3. แม่แบบมาเลเซีย VIS (VIS.docx)</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>แม่แบบบันทึกข้อความกรณีนำรถมาเลเซียออกเกินกำหนด (ระบบ VIS)</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                      <a 
                        href="/api/templates/download?type=vis"
                        className="btn-select"
                        style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', padding: '0.4rem 0.8rem', fontSize: '0.8rem', background: 'rgba(123, 44, 191, 0.08)', color: 'var(--accent-primary)', border: 'none', boxShadow: 'none' }}
                      >
                        <i className="fa-solid fa-download" style={{ marginRight: '4px' }}></i> Download
                      </a>
                      <label 
                        className="btn-select"
                        style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', padding: '0.4rem 0.8rem', fontSize: '0.8rem', margin: 0 }}
                      >
                        <i className="fa-solid fa-upload" style={{ marginRight: '4px' }}></i> Replace
                        <input 
                          type="file" 
                          accept=".docx"
                          onChange={e => handleReplaceTemplate('vis', e.target.files[0])}
                          style={{ display: 'none' }}
                          disabled={replacingType !== null}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                {replacingType && (
                  <div style={{ marginBottom: '1.5rem', fontSize: '0.8rem', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <div className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }}></div>
                    <span>กำลังอัปเดตไฟล์แม่แบบระบบ {replacingType}...</span>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button 
                    type="button" 
                    onClick={() => { setIsAdminAuthenticated(false); setVerifiedPassword(''); }}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    ออกจากระบบผู้ดูแล
                  </button>
                  <button 
                    type="button"
                    className="btn-select"
                    onClick={() => setShowTemplateModal(false)}
                    style={{ padding: '0.6rem 2.5rem' }}
                  >
                    ปิด
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
