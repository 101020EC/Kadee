"use client";

import { useState, useEffect } from 'react';

const DEFAULT_URL_VIOLATION = 'https://rmonhufcsumwdnrzhqmo.supabase.co/storage/v1/object/public/Template/MY.docx';
const DEFAULT_URL_VIS = 'https://rmonhufcsumwdnrzhqmo.supabase.co/storage/v1/object/public/Template/VIS.docx';
const DEFAULT_URL_THAI_VEHICLE = 'https://rmonhufcsumwdnrzhqmo.supabase.co/storage/v1/object/public/Template/PTK.docx';

export default function Home() {
  const [activeSystem, setActiveSystem] = useState('thai_vehicle'); // 'violation' | 'vis' | 'thai_vehicle'
  const [appState, setAppState] = useState('upload'); // 'upload' | 'loading' | 'form'
  const [file, setFile] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  
  // Persistent Settings
  const [proposerName, setProposerName] = useState('');
  const [proposerPosition, setProposerPosition] = useState('นักวิชาการศุลกากรชำนาญการ');
  const [approverSelection, setApproverSelection] = useState('approver_1'); // 'approver_1' | 'approver_2'
  const [approver1Name, setApprover1Name] = useState('นายวรวุฒิ สุภชัยพานิชพงศ์');
  const [approver2Name, setApprover2Name] = useState('นางสาวปิลันธนา ไตรทิพพิสมัย');

  // Form fields
  const [formData, setFormData] = useState({
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
  });

  const [toast, setToast] = useState({ show: false, message: '' });
  const [generating, setGenerating] = useState(false);

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
  }, []);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGenerating(true);

    // Validate empty fields before generating
    const requiredFields = [
      'customs_office', 'declaration_number', 'person_name',
      'vehicle_type', 'vehicle_brand', 'vehicle_plate',
      'import_date_th', 'due_date_th', 'return_date_th', 'doc_date_th',
      'dept_abbr', 'proposer_name', 'proposer_position',
      'approver_name', 'approver_position'
    ];
    
    if (activeSystem === 'violation' || activeSystem === 'thai_vehicle') {
      requiredFields.push('case_number');
    } else if (activeSystem === 'vis') {
      requiredFields.push('import_office');
      requiredFields.push('passport_number');
      requiredFields.push('nationality');
      requiredFields.push('fine_days');
      requiredFields.push('fine_amount');
      requiredFields.push('fine_amount_th');
      requiredFields.push('receipt_number');
    }

    const emptyFields = requiredFields.filter(field => {
      const val = formData[field];
      return val === undefined || val === null || String(val).trim() === '';
    });

    if (emptyFields.length > 0) {
      showToast('กรุณากรอกข้อมูลในแบบฟอร์มให้ครบทุกช่องก่อนสร้างเอกสาร!');
      setGenerating(false);
      return;
    }

    let activeTemplateUrl = DEFAULT_URL_VIOLATION;
    if (activeSystem === 'vis') activeTemplateUrl = DEFAULT_URL_VIS;
    else if (activeSystem === 'thai_vehicle') activeTemplateUrl = DEFAULT_URL_THAI_VEHICLE;

    try {
      // Calculate fine_days_p2 dynamically based on final fine_days value (for VIS)
      const parsedDays = parseInt(formData.fine_days, 10);
      const fineDaysP2 = (!isNaN(parsedDays) && parsedDays > 10) ? "เกินกว่า 10" : formData.fine_days;

      const payload = {
        ...formData,
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
      
      let fileName = `Memo_${(formData.declaration_number || 'Output')}.docx`;
      if (activeSystem === 'violation') {
        fileName = `Memo_ผิดพิธีการ_${(formData.case_number || 'Output').replace(/[\/\\]/g, '_')}.docx`;
      } else if (activeSystem === 'vis') {
        fileName = `Memo_VIS_${(formData.declaration_number || 'Output')}.docx`;
      } else if (activeSystem === 'thai_vehicle') {
        fileName = `Memo_รถไทย_${(formData.case_number || 'Output').replace(/[\/\\]/g, '_')}.docx`;
      }
        
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

      {/* Ambient backgrounds */}
      <div className="ambient-glow glow-1"></div>
      <div className="ambient-glow glow-2"></div>

      <header>
        <h1>{activeSystem === 'violation' ? 'MY ผิดพิธีการ' : activeSystem === 'vis' ? 'MY VIS' : 'รถไทย'}</h1>
        <p>ระบบกรอกบันทึกข้อความศุลกากรอัตโนมัติด้วยไฟล์ PDF ใบขนสินค้าพิเศษ</p>
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
            ระบบรถไทย
          </button>
          <button 
            type="button" 
            className={`tab-btn ${activeSystem === 'violation' ? 'active' : ''}`}
            onClick={() => setActiveSystem('violation')}
          >
            <i className="fa-solid fa-scale-balanced" style={{ marginRight: '8px' }}></i>
            ระบบ MY ผิดพิธีการ
          </button>
          <button 
            type="button" 
            className={`tab-btn ${activeSystem === 'vis' ? 'active' : ''}`}
            onClick={() => setActiveSystem('vis')}
          >
            <i className="fa-solid fa-car-tunnel" style={{ marginRight: '8px' }}></i>
            ระบบ MY VIS
          </button>
        </div>
      )}

      <div className="card">
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
              <h3>ลากไฟล์ PDF ของ {activeSystem === 'violation' ? 'MY ผิดพิธีการ' : activeSystem === 'vis' ? 'MY VIS' : 'ระบบรถไทย'} มาวางที่นี่</h3>
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
            <div className="config-panel">
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
                    <div className="form-group">
                      <label>ชื่อผู้เสนอรายงาน:</label>
                      <input 
                        type="text" 
                        value={proposerName}
                        onChange={handlePropNameChange}
                        placeholder="เช่น นายทด ลอง"
                      />
                    </div>
                    <div className="form-group">
                      <label>ตำแหน่งผู้เสนอรายงาน:</label>
                      <select 
                        value={proposerPosition}
                        onChange={handlePropPosChange}
                        style={{
                          backgroundColor: 'var(--input-bg)',
                          border: '1px solid var(--input-border)',
                          borderRadius: '10px',
                          padding: '0.75rem 1rem',
                          color: 'var(--text-main)',
                          fontSize: '0.95rem',
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
                        <label htmlFor="select_app_1" style={{ cursor: 'pointer', fontWeight: '700' }}>
                          หัวหน้าฝ่ายควบคุมและตรวจสอบทางศุลกากร (อักษรย่อ: ฝคต.)
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
                        <label htmlFor="select_app_2" style={{ cursor: 'pointer', fontWeight: '700' }}>
                          หัวหน้าฝ่ายสืบสวนและปราบปราม (อักษรย่อ: ฝปป.)
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

                  {/* Save Settings Button */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem', borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '1rem' }}>
                    <button 
                      type="button" 
                      className="btn-select" 
                      onClick={() => {
                        localStorage.setItem('proposer_name', proposerName);
                        localStorage.setItem('proposer_position', proposerPosition);
                        localStorage.setItem('approver_selection', approverSelection);
                        localStorage.setItem('approver_1_name', approver1Name);
                        localStorage.setItem('approver_2_name', approver2Name);
                        
                        showToast('บันทึกการตั้งค่าเรียบร้อยแล้ว!');
                        setShowConfig(false);
                      }}
                      style={{ padding: '0.6rem 1.8rem', fontSize: '0.9rem' }}
                    >
                      <i className="fa-solid fa-floppy-disk" style={{ marginRight: '6px' }}></i>
                      บันทึก
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
                  <label>ด่านศุลกากรที่รับรายงานตัว/ตัดบัญชี</label>
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
                  <label>ชื่อผู้ขออนุญาตนำยานพาหนะผ่านแดน</label>
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
                  <input 
                    type="text" 
                    name="vehicle_type" 
                    value={formData.vehicle_type} 
                    onChange={handleInputChange} 
                    required 
                  />
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
                  <input 
                    type="text" 
                    name="return_date_th" 
                    value={formData.return_date_th} 
                    onChange={handleInputChange} 
                    required 
                  />
                </div>
                <div className="form-group">
                  <label>วันที่ทำบันทึกข้อความ / วันที่ตัดบัญชี</label>
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
                      <label>เงินปรับบังคับสัญญาประกัน (บาท)</label>
                      <input 
                        type="text" 
                        name="fine_amount" 
                        value={formData.fine_amount} 
                        onChange={handleInputChange} 
                        required 
                      />
                    </div>
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
    </div>
  );
}
