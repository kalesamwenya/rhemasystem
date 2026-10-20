'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Search, UserPlus, Eye, 
  Edit3, ShieldBan, Trash2, X, Save, GraduationCap, 
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Mail, Users, CheckCircle, AlertTriangle, Filter, RefreshCw,
  ShieldAlert, UploadCloud, Download, Loader2, MessageCircle, Smartphone
} from 'lucide-react';
import { api, assetUrl } from '@/lib/api';
import { exportBrandedPdf } from '@/lib/branded-pdf';
import type { PaymentReceiptData } from '@/lib/payment-receipt';
import { confirmWithApp } from '@/components/ui/app-dialogs';

// --- INITIAL DATASET ---
type AdminStudent = { id: string; name: string; email: string; avatar?: string; department: string; gpa: string; status: string; paymentStatus?: string; registrationDate: string };
type StudentProfile = { student: { student_id: string; name: string; class: string; email?: string; avatar?: string; payment_status: string; account_status?: string }; attendance: { totalSessions: number; attended: number; absent: number; percentage: number; morning: { attended: number }; evening: { attended: number } } };
type StudentFinanceRecord = { id: number; student_id: string; entry_type: 'charge' | 'payment'; description: string; amount: number; currency: string; status: string; liability_type?: string | null; reference: string };
type StudentFinance = { charges: StudentFinanceRecord[]; total_charges: number; total_paid: number; amount_due: number; currency: string };
type StudentForm = AdminStudent;

const formatFinanceAmount = (amount: number, currency: string) =>
  new Intl.NumberFormat('en-ZM', { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount);

const liabilityLabel = (record: StudentFinanceRecord) => {
  switch (record.liability_type) {
    case 'missed_audio': return 'Missed class audio';
    case 'assignment': return 'Missed assignment';
    case 'quiz': return 'Missed quiz';
    case 'exam': return 'Missed exam';
    case 'tuition': return 'Tuition / school fees';
    default: return /tuition|school fees/i.test(record.description) ? 'Tuition / school fees' : 'Other charge';
  }
};

const initialStudentsDataset: AdminStudent[] = [
  { id: 'ST-2026-044', name: 'Bwalya Chanda', email: 'bwalya.c@unza.zw', avatar: '', department: 'ICT', gpa: '3.98', status: 'Active', paymentStatus: 'Paid', registrationDate: '2026-01-14' },
  { id: 'ST-2026-112', name: 'Kunda Musonda', email: 'kunda.m@unza.zw', department: 'Engineering', gpa: '3.92', status: 'Active', registrationDate: '2026-01-18' },
  { id: 'ST-2026-095', name: 'Mapalo Phiri', email: 'mapalo.p@unza.zw', department: 'Health Sci', gpa: '3.89', status: 'Blocked', registrationDate: '2026-02-02' },
  { id: 'ST-2026-201', name: 'Nalavwe Soko', email: 'nalavwe.s@unza.zw', department: 'Business', gpa: '3.85', status: 'Active', registrationDate: '2026-02-11' },
  { id: 'ST-2026-302', name: 'Chileshe Mulenga', email: 'chileshe.m@unza.zw', department: 'Law', gpa: '3.12', status: 'Active', registrationDate: '2026-02-15' },
  { id: 'ST-2026-305', name: 'Mwansa Mwape', email: 'mwansa.m@unza.zw', department: 'Engineering', gpa: '2.95', status: 'Active', registrationDate: '2026-02-16' },
  { id: 'ST-2026-410', name: 'Taonga Nyirenda', email: 'taonga.n@unza.zw', department: 'ICT', gpa: '3.64', status: 'Active', registrationDate: '2026-03-01' },
  { id: 'ST-2026-422', name: 'Mabvuto Banda', email: 'mabvuto.b@unza.zw', department: 'Education', gpa: '2.41', status: 'Blocked', registrationDate: '2026-03-04' },
  { id: 'ST-2026-501', name: 'Natasha Lungu', email: 'natasha.l@unza.zw', department: 'Health Sci', gpa: '3.70', status: 'Active', registrationDate: '2026-03-12' },
];

export default function StudentManagementPage() {
  // --- CORE STATES ---
  const [students, setStudents] = useState<AdminStudent[]>(initialStudentsDataset);
  const [loadError, setLoadError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  
  // Pagination Parameters
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  // Form Drawer Controls
  const [selectedStudent, setSelectedStudent] = useState<AdminStudent | null>(null);
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [studentFinance, setStudentFinance] = useState<StudentFinance | null>(null);
  const [reminderPhone, setReminderPhone] = useState('');
  const [reminderError, setReminderError] = useState('');
  const [reminderNotice, setReminderNotice] = useState('');
  const [sendingReminder, setSendingReminder] = useState(false);
  const [editorMode, setEditorMode] = useState<'view' | 'edit' | 'create' | null>(null);
  const [profileExportMode, setProfileExportMode] = useState<'view' | 'download' | null>(null);
  const [profileExportError, setProfileExportError] = useState('');
  const [formFields, setFormFields] = useState<StudentForm>({ id: '', name: '', email: '', avatar: '', department: '', gpa: '', status: 'Active', paymentStatus: 'Pending', registrationDate: '' });
  const profileRequestId = useRef(0);

  useEffect(() => {
    api.students.list()
      .then((body: { data?: Array<{ student_id: string; name: string; class: string; email?: string; avatar?: string; payment_status: string; account_status?: string }> }) => setStudents((body.data || []).map((student) => ({
        id: String(student.student_id),
        name: student.name,
        email: student.email || '',
        avatar: student.avatar || '',
        department: student.class,
        gpa: '0.00',
        status: student.account_status || 'Active',
        paymentStatus: student.payment_status,
        registrationDate: '',
      }))))
      .catch((error) => setLoadError(error instanceof Error ? error.message : 'Unable to load students.'));
  }, []);

  // --- MACRO ANALYTICAL METRICS CALCULATORS ---
  const macroMetrics = useMemo(() => {
    const total = students.length;
    const active = students.filter(s => s.status === 'Active').length;
    const blocked = total - active;
    const avgGpa = total > 0 ? (students.reduce((acc, curr) => acc + parseFloat(curr.gpa), 0) / total).toFixed(2) : '0.00';
    return { total, active, blocked, avgGpa };
  }, [students]);

  // --- FILTER & SEARCH QUERY PIPELINE ---
  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            student.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            student.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDept = selectedDepartment === 'ALL' || student.department === selectedDepartment;
      const matchesStatus = selectedStatus === 'ALL' || student.status === selectedStatus;
      return matchesSearch && matchesDept && matchesStatus;
    });
  }, [students, searchTerm, selectedDepartment, selectedStatus]);

  // --- PAGINATION INTERCEPT MATRIX ---
  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / rowsPerPage));
  
  // Safe adjustment loop guarding index boundaries on filter mutations
  const paginatedStudents = useMemo(() => {
    const startOffset = (currentPage - 1) * rowsPerPage;
    return filteredStudents.slice(startOffset, startOffset + rowsPerPage);
  }, [filteredStudents, currentPage, rowsPerPage]);

  // --- CRUD ACTION CONTROLLERS ---
  const handleOpenAction = (student: AdminStudent, mode: 'view' | 'edit') => {
    const requestId = ++profileRequestId.current;
    setSelectedStudent(student);
    setFormFields({ ...student });
    setEditorMode(mode);
    setStudentProfile(null);
    setStudentFinance(null);
    setReminderPhone('');
    setReminderError('');
    setReminderNotice('');
    setProfileExportMode(null);
    setProfileExportError('');
    if (mode === 'view') {
      Promise.all([
        api.students.get(student.id) as Promise<{ data?: StudentProfile }>,
        api.students.adminStudentFinance(student.id) as Promise<{ data?: StudentFinance }>,
      ]).then(([profileResponse, ledgerResponse]) => {
        if (profileRequestId.current !== requestId) return;
        setStudentProfile(profileResponse.data || null);
        setStudentFinance(ledgerResponse.data || {
          charges: [],
          total_charges: 0,
          total_paid: 0,
          amount_due: 0,
          currency: 'ZMW',
        });
      }).catch((reason: unknown) => {
        if (profileRequestId.current === requestId) {
          setReminderError(reason instanceof Error ? reason.message : 'Unable to load the student finance profile.');
        }
      });
    }
  };

  const sendLiabilityEmail = async () => {
    if (!selectedStudent || !studentFinance || studentFinance.amount_due <= 0 || sendingReminder) return;
    setSendingReminder(true);
    setReminderError('');
    setReminderNotice('');
    try {
      const response = await api.students.sendAdminLiabilityReminder(selectedStudent.id) as { message?: string };
      setReminderNotice(response.message || 'Branded account reminder sent by email.');
    } catch (reason) {
      setReminderError(reason instanceof Error ? reason.message : 'Unable to send the liability reminder email.');
    } finally {
      setSendingReminder(false);
    }
  };

  const openMessageComposer = (channel: 'sms' | 'whatsapp') => {
    if (!selectedStudent || !studentFinance || studentFinance.amount_due <= 0) return;
    const phone = reminderPhone.trim();
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 7 || digits.length > 15) {
      setReminderError('Enter the student’s phone number with country code to prepare a reminder.');
      setReminderNotice('');
      return;
    }
    const paymentUrl = new URL('/student/billing', window.location.origin).toString();
    const amountDue = new Intl.NumberFormat('en-ZM', {
      style: 'currency',
      currency: studentFinance.currency,
      maximumFractionDigits: 2,
    }).format(studentFinance.amount_due);
    const text = `Rhema Bible School account reminder for ${selectedStudent.name}: your outstanding balance is ${amountDue}. Review your charges and pay securely here: ${paymentUrl}`;
    const destination = channel === 'whatsapp'
      ? `https://wa.me/${digits}?text=${encodeURIComponent(text)}`
      : `sms:${phone.replace(/[^\d+]/g, '')}?body=${encodeURIComponent(text)}`;
    if (channel === 'whatsapp') {
      const composer = window.open(destination, '_blank');
      if (!composer) {
        setReminderError('Your browser blocked the WhatsApp window. Allow pop-ups and try again.');
        setReminderNotice('');
        return;
      }
      composer.opener = null;
    } else {
      window.location.href = destination;
    }
    setReminderError('');
    setReminderNotice(`${channel === 'whatsapp' ? 'WhatsApp' : 'SMS'} message prepared. Confirm sending in your messaging app.`);
  };

  const handleOpenCreate = () => {
    const nextId = `ST-2026-${Math.floor(400 + Math.random() * 500)}`;
    setFormFields({ id: nextId, name: '', email: '', avatar: '', department: 'ICT', gpa: '0.00', status: 'Active', paymentStatus: 'Pending', registrationDate: '' });
    setEditorMode('create');
    setProfileExportMode(null);
    setProfileExportError('');
  };

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const body = { student_id: formFields.id, name: formFields.name, email: formFields.email, avatar: formFields.avatar || '', class: formFields.department, payment_status: formFields.paymentStatus || 'Pending', account_status: formFields.status || 'Active' };
      const response = (editorMode === 'create' ? await api.students.create(body) : await api.students.update(body)) as { success?: boolean; message?: string };
      if (response.success) {
        setStudents((current) => editorMode === 'create' ? [...current, { ...formFields, registrationDate: new Date().toISOString().split('T')[0] }] : current.map(s => s.id === formFields.id ? { ...s, ...formFields } : s));
        setEditorMode(null);
      }
    } catch (error) { setLoadError(error instanceof Error ? error.message : 'Unable to save student.'); }
  };

  const uploadStudentAvatar = async (file: File) => {
    try {
      const body = await api.uploads.image(file, 'students') as { data?: { path?: string } };
      setFormFields((current) => ({ ...current, avatar: body.data?.path || '' }));
    } catch (error) { setLoadError(error instanceof Error ? error.message : 'Unable to upload avatar.'); }
  };

  const exportStudentProfile = async (mode: 'view' | 'download') => {
    if (!selectedStudent || !studentProfile) return;
    setProfileExportMode(mode);
    setProfileExportError('');
    try {
      await exportBrandedPdf(async () => {
        const [verificationResponse, receiptsResponse] = await Promise.all([
          api.students.createAdminProfileVerificationToken(selectedStudent.id) as Promise<{ data: { token: string } }>,
          api.students.adminPaymentReceipts(selectedStudent.id) as Promise<{ data: PaymentReceiptData[] }>,
        ]);
        const profileToken = verificationResponse.data.token;
        if (!/^[a-f0-9]{64}$/i.test(profileToken)) throw new Error('The profile verification service returned an invalid token.');
        const latestReceipt = receiptsResponse.data[0];
        const profileUrl = new URL('/verify-profile', window.location.origin);
        profileUrl.searchParams.set('token', profileToken);
        const verifications = [{
          label: 'Verify student profile',
          url: profileUrl.toString(),
          note: 'Official identity check',
        }];
        if (latestReceipt?.receipt_token) {
          const paymentUrl = new URL('/verify-payment', window.location.origin);
          paymentUrl.searchParams.set('token', latestReceipt.receipt_token);
          verifications.push({
            label: 'Verify latest payment',
            url: paymentUrl.toString(),
            note: latestReceipt.reference,
          });
        }

        const student = studentProfile.student;
        return {
          title: 'Student Profile',
          subtitle: 'Official identity and account record',
          fileName: `Rhema-Student-Profile-${student.student_id}`,
          student: { name: student.name, id: student.student_id, cohort: student.class },
          sections: [
            {
              title: 'Personal details',
              fields: [
                { label: 'Full name', value: student.name },
                { label: 'Email address', value: student.email || '' },
              ],
            },
            {
              title: 'Academic details',
              fields: [
                { label: 'Student ID', value: student.student_id },
                { label: 'Cohort', value: student.class },
                { label: 'Programme / department', value: selectedStudent.department },
              ],
            },
            {
              title: 'Attendance report',
              fields: [
                { label: 'Attendance rate', value: `${studentProfile.attendance.percentage}%` },
                { label: 'Sessions recorded', value: String(studentProfile.attendance.totalSessions) },
                { label: 'Attended', value: String(studentProfile.attendance.attended) },
                { label: 'Absent', value: String(studentProfile.attendance.absent) },
              ],
            },
            {
              title: 'Student account',
              fields: [
                { label: 'Account status', value: student.account_status || selectedStudent.status },
                { label: 'Payment status', value: student.payment_status || 'Pending' },
                { label: 'Registration date', value: selectedStudent.registrationDate || 'Not available' },
              ],
            },
          ],
          verifications,
        };
      }, mode);
    } catch (reason) {
      setProfileExportError(reason instanceof Error ? reason.message : 'Unable to prepare the student profile PDF.');
    } finally {
      setProfileExportMode(null);
    }
  };

  const toggleBlockStatus = async (id: string) => {
    const student = students.find((item) => item.id === id);
    if (!student) return;
    const status = student.status === 'Active' ? 'Blocked' : 'Active';
    try {
      await api.students.update({ student_id: id, name: student.name, email: student.email, avatar: student.avatar || '', class: student.department, payment_status: student.paymentStatus || 'Pending', account_status: status });
      setStudents(students.map(s => s.id === id ? { ...s, status } : s));
    } catch (error) { setLoadError(error instanceof Error ? error.message : 'Unable to update student status.'); }
  };

  const handleDeleteRecord = async (id: string) => {
    if (!(await confirmWithApp('Are you absolutely sure you want to purge this record from administrative ledgers?', { title: 'Delete student record?', confirmText: 'Delete', tone: 'danger' }))) return;
    try {
      await api.students.remove(id);
      setStudents(students.filter(s => s.id !== id));
      setEditorMode(null);
    } catch (error) { setLoadError(error instanceof Error ? error.message : 'Unable to delete student.'); }
  };

  const resetAllFilters = () => {
    setSearchTerm('');
    setSelectedDepartment('ALL');
    setSelectedStatus('ALL');
    setCurrentPage(1);
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        .no-scrollbar::-webkit-scrollbar { display: none !important; }
      `}} />

      <div className="h-[calc(100vh-theme(spacing.16))] overflow-y-auto no-scrollbar space-y-6 pr-1 pb-12 animate-in fade-in duration-300" style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
        
        {/* Editorial Sub-Page Header Layout */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200/80">
          <div>
            <div className="flex items-center gap-2 text-slate-400 font-bold uppercase tracking-wider text-[10px] mb-1">
              <span>System Core</span>
              <span>/</span>
              <span className="text-slate-600">Registry Workspace</span>
            </div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase sm:text-2xl">Student Directories</h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Audit system registration keys, profile standings, and evaluate educational access blocks.</p>
          </div>
          <button 
            onClick={handleOpenCreate}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-950 text-white rounded-xl text-xs font-black tracking-wide uppercase hover:bg-slate-900 transition-all active:scale-98 shadow-sm self-start sm:self-auto"
          >
            <UserPlus className="h-4 w-4 text-amber-500" /> Enlist New Scholar
          </button>
        </div>

        {loadError && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">{loadError}</div>}

        {/* Micro Telemetry Overview Dashboard Strips */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Total Enrolled', val: macroMetrics.total, icon: Users, styles: 'text-blue-600 bg-blue-50/80' },
            { label: 'Active Access', val: macroMetrics.active, icon: CheckCircle, styles: 'text-emerald-600 bg-emerald-50/80' },
            { label: 'Administrative Holds', val: macroMetrics.blocked, icon: ShieldAlert, styles: 'text-red-600 bg-red-50/80' },
            { label: 'Cumulative GPA Metric', val: macroMetrics.avgGpa, icon: GraduationCap, styles: 'text-purple-600 bg-purple-50/80' },
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={idx} className="bg-white border border-slate-200/70 p-4 rounded-2xl flex items-center justify-between shadow-3xs">
                <div className="space-y-0.5 truncate">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">{item.label}</span>
                  <span className="text-lg font-black text-slate-900 tracking-tight">{item.val}</span>
                </div>
                <div className={`p-2 rounded-xl border border-transparent ${item.styles}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Filter Toolbar Block Layout Configuration (LIST) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-3xs space-y-3">
          <div className="flex flex-col lg:flex-row gap-3">
            {/* Search inputs */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input 
                type="text"
                placeholder="Lookup by student identity name, reference keys, email routing..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full pl-10 pr-4 py-2.5 text-xs border border-slate-200 bg-slate-50/40 rounded-xl focus:outline-hidden focus:border-slate-400 focus:bg-white font-medium transition-all"
              />
            </div>
            
            {/* Dropdown filters layout */}
            <div className="grid grid-cols-2 sm:flex items-center gap-2">
              <div className="flex items-center gap-1.5 border border-slate-200 rounded-xl px-2.5 py-1 bg-white">
                <Filter className="h-3 w-3 text-slate-400 hidden sm:block" />
                <select
                  value={selectedDepartment}
                  onChange={(e) => { setSelectedDepartment(e.target.value); setCurrentPage(1); }}
                  className="text-xs font-bold text-slate-700 bg-transparent outline-none border-none py-1.5 cursor-pointer"
                >
                  <option value="ALL">All Departments</option>
                  {['ICT', 'Engineering', 'Health Sci', 'Business', 'Law', 'Education'].map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5 border border-slate-200 rounded-xl px-2.5 py-1 bg-white">
                <select
                  value={selectedStatus}
                  onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
                  className="text-xs font-bold text-slate-700 bg-transparent outline-none border-none py-1.5 cursor-pointer w-full"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="Active">Active Only</option>
                  <option value="Blocked">Blocked Only</option>
                </select>
              </div>

              {(searchTerm || selectedDepartment !== 'ALL' || selectedStatus !== 'ALL') && (
                <button 
                  onClick={resetAllFilters}
                  className="col-span-2 sm:col-span-1 inline-flex items-center justify-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 px-3 py-2 transition-colors"
                >
                  <RefreshCw className="h-3 w-3" /> Clear Filters
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Dynamic Records Grid Table Shell (READ LISTING) */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-3xs flex flex-col overflow-hidden">
          <div className="overflow-x-auto no-scrollbar" style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
            <table className="w-full text-left border-collapse min-w-[850px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <th className="py-3.5 px-6">System ID</th>
                  <th className="py-3.5 px-4">Scholar Identity</th>
                  <th className="py-3.5 px-4">Department / Faculty</th>
                  <th className="py-3.5 px-4 text-center">Cumulative GPA</th>
                  <th className="py-3.5 px-4">Portal Standing</th>
                  <th className="py-3.5 px-6 text-right">Terminal Operations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-600">
                {paginatedStudents.length > 0 ? (
                  paginatedStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-slate-50/30 transition-colors group">
                      <td className="py-4 px-6 font-bold text-slate-900 tracking-mono">{student.id}</td>
                      <td className="py-4 px-4">
                        <div className="flex flex-col">
                          <span className="flex items-center gap-2 font-bold text-slate-800 text-sm group-hover:text-blue-900 transition-colors"><span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-slate-900 text-[10px] text-white">{student.avatar ? <img src={assetUrl(student.avatar)} alt="" className="h-full w-full object-cover" /> : student.name.charAt(0)}</span>{student.name}</span>
                          <span className="text-[10px] font-mono text-slate-400 mt-0.5 flex items-center gap-1">
                            <Mail className="h-3 w-3 inline text-slate-300" /> {student.email}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-semibold text-slate-700 bg-slate-50 border border-slate-200/50 px-2.5 py-1 rounded-lg">
                          {student.department}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="font-mono font-black text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200/20">
                          {student.gpa}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide rounded-full border ${
                          student.status === 'Active' 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                            : 'bg-rose-50 text-rose-700 border-rose-100'
                        }`}>
                          <span className={`h-1 w-1 rounded-full ${student.status === 'Active' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          {student.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-90 sm:opacity-40 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleOpenAction(student, 'view')}
                            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors border border-slate-100" 
                            title="Inspect Profile"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button 
                            onClick={() => handleOpenAction(student, 'edit')}
                            className="p-2 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors border border-slate-100" 
                            title="Modify Fields"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button 
                            onClick={() => toggleBlockStatus(student.id)}
                            className={`p-2 rounded-xl transition-colors border ${
                              student.status === 'Active' 
                                ? 'text-slate-500 hover:text-amber-600 hover:bg-amber-50 border-slate-100' 
                                : 'text-amber-600 bg-amber-50 border-amber-200'
                            }`} 
                            title={student.status === 'Active' ? 'Impose Access Block' : 'Lift Access Block'}
                          >
                            <ShieldBan className="h-3.5 w-3.5" />
                          </button>
                          <button 
                            onClick={() => handleDeleteRecord(student.id)}
                            className="p-2 rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50 border border-slate-100 transition-colors" 
                            title="Purge Entry"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-16 text-center bg-slate-50/40">
                      <div className="max-w-xs mx-auto space-y-2">
                        <div className="h-8 w-8 rounded-full bg-slate-100 border text-slate-400 flex items-center justify-center mx-auto">
                          <AlertTriangle className="h-4 w-4" />
                        </div>
                        <p className="text-slate-900 font-bold text-sm">No Results Located</p>
                        <p className="text-xs text-slate-400">Zero active indices matched your tracking queries inside this filter frame.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* SECURE INTELLIGENT PAGINATION PANEL CONTROL DECK */}
          {/* ------------------------------------------------------------- */}
          <div className="bg-slate-50 border-t border-slate-100 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold text-slate-500">
            <div className="flex items-center gap-4 self-stretch sm:self-auto justify-between sm:justify-start">
              <span>
                Showing <strong className="text-slate-900">{filteredStudents.length > 0 ? (currentPage - 1) * rowsPerPage + 1 : 0}</strong> to{' '}
                <strong className="text-slate-900">{Math.min(currentPage * rowsPerPage, filteredStudents.length)}</strong> of{' '}
                <strong className="text-slate-900">{filteredStudents.length}</strong> scholars
              </span>
              
              {/* Row Limits Chooser dropdown toggler */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 hidden md:inline">Limit:</span>
                <select
                  value={rowsPerPage}
                  onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                  className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-800 font-bold outline-none cursor-pointer focus:border-slate-400"
                >
                  {[5, 10, 25, 50].map(size => <option key={size} value={size}>{size} / page</option>)}
                </select>
              </div>
            </div>

            {/* Pagination Controls button blocks */}
            <div className="flex items-center gap-1 self-stretch sm:self-auto justify-center">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border bg-white border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:hover:bg-white"
                title="First Page"
              >
                <ChevronsLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border bg-white border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:hover:bg-white flex items-center gap-1"
                title="Previous Page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <div className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white font-mono font-bold text-slate-900 shadow-2xs">
                Page {currentPage} <span className="text-slate-300 mx-1">/</span> {totalPages}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border bg-white border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:hover:bg-white flex items-center gap-1"
                title="Next Page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border bg-white border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:hover:bg-white"
                title="Last Page"
              >
                <ChevronsRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* PERSISTENT ACTION DRAWER OVERLAY MODAL (VIEW / UPDATE / CREATE CONTEXTS) */}
        {editorMode && (
          <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-white h-full shadow-2xl p-6 flex flex-col justify-between animate-in slide-in-from-right duration-300 border-l border-slate-100">
              
              <div>
                {/* Drawer Header Controls */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="h-7 w-7 overflow-hidden rounded-lg bg-slate-950 text-white flex items-center justify-center font-bold text-xs">
                      {formFields.avatar ? <img src={assetUrl(formFields.avatar)} alt="Student avatar" className="h-full w-full object-cover" /> : formFields.name.charAt(0) || 'S'}
                    </div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                      {editorMode === 'view' && 'Profile Blueprint View'}
                      {editorMode === 'edit' && 'Modify System Matrix'}
                      {editorMode === 'create' && 'Register New Scholar Profile'}
                    </h3>
                  </div>
                  <button 
                    onClick={() => setEditorMode(null)}
                    className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-50 hover:text-slate-700 transition-colors border"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Workspace Input Configuration Engine */}
                <form id="drawer-form-engine" onSubmit={handleSaveChanges} className="mt-6 space-y-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">System Reference Number</label>
                    <input 
                      type="text" 
                      value={formFields.id} 
                      disabled 
                      className="w-full px-3 py-2.5 text-xs border border-slate-200 rounded-xl bg-slate-50 font-mono text-slate-500 font-bold outline-none" 
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Full Legal Name</label>
                    <input 
                      type="text" 
                      required
                      disabled={editorMode === 'view'}
                      value={formFields.name} 
                      onChange={(e) => setFormFields({ ...formFields, name: e.target.value })}
                      className="w-full px-3 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-slate-950 focus:ring-1 focus:ring-slate-950 font-medium transition-all bg-white disabled:bg-slate-50/50 text-slate-900" 
                      placeholder="e.g. Kondwani Kafwimbi"
                    />
                  </div>

                  <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                    <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-slate-900 text-lg font-black text-white">
                      {formFields.avatar ? <img src={assetUrl(formFields.avatar)} alt="Student avatar" className="h-full w-full object-cover" /> : formFields.name.charAt(0) || <GraduationCap className="h-5 w-5" />}
                    </div>
                    <label className={`inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 ${editorMode === 'view' ? 'pointer-events-none opacity-50' : 'cursor-pointer hover:bg-slate-50'}`}>
                      <UploadCloud className="h-4 w-4" /> Upload avatar
                      <input type="file" accept="image/*" disabled={editorMode === 'view'} className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) uploadStudentAvatar(file); }} />
                    </label>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Corporate Email Infrastructure</label>
                    <input 
                      type="email" 
                      required
                      disabled={editorMode === 'view'}
                      value={formFields.email} 
                      onChange={(e) => setFormFields({ ...formFields, email: e.target.value })}
                      className="w-full px-3 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-slate-950 focus:ring-1 focus:ring-slate-950 font-medium transition-all bg-white disabled:bg-slate-50/50 text-slate-900" 
                      placeholder="username@unza.zw"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Faculty Matrix</label>
                      <select
                        disabled={editorMode === 'view'}
                        value={formFields.department}
                        onChange={(e) => setFormFields({ ...formFields, department: e.target.value })}
                        className="w-full px-3 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-slate-950 focus:ring-1 focus:ring-slate-950 font-semibold transition-all bg-white disabled:bg-slate-50/50 text-slate-900"
                      >
                        {['ICT', 'Engineering', 'Health Sci', 'Business', 'Law', 'Education'].map(dept => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Cumulative GPA</label>
                      <input 
                        type="number" 
                        step="0.01"
                        min="0.00"
                        max="4.00"
                        required
                        disabled={editorMode === 'view'}
                        value={formFields.gpa} 
                        onChange={(e) => setFormFields({ ...formFields, gpa: e.target.value })}
                        className="w-full px-3 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-slate-950 focus:ring-1 focus:ring-slate-950 font-mono font-bold transition-all bg-white disabled:bg-slate-50/50 text-slate-900" 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Payment status<select disabled={editorMode === 'view'} value={formFields.paymentStatus || 'Pending'} onChange={(e) => setFormFields({ ...formFields, paymentStatus: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-900"><option>Pending</option><option>Paid</option><option>Term 1</option><option>Term 2</option><option>Term 3</option><option>Term 4</option><option>Blocked</option></select></label>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Account status<select disabled={editorMode === 'view'} value={formFields.status || 'Active'} onChange={(e) => setFormFields({ ...formFields, status: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-900"><option>Active</option><option>Blocked</option><option>Inactive</option></select></label>
                  </div>

                  {/* Supplemental Metadata Block (Read-only View Context) */}
                  {editorMode === 'view' && selectedStudent && (
                    <div className="pt-4 border-t border-slate-100 space-y-4">
                      <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                        <div>
                          <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Ledger Entry</span>
                          <span className="text-xs font-bold text-slate-700 mt-0.5 block">{selectedStudent.registrationDate}</span>
                        </div>
                        <div>
                          <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Account Standing</span>
                          <span className={`inline-block mt-0.5 text-[9px] font-black uppercase tracking-wide px-2 py-0.5 rounded-sm ${
                            formFields.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                          }`}>{formFields.status}</span>
                        </div>
                      </div>
                      {studentProfile && (
                        <div className="space-y-3">
                          <div className="grid grid-cols-3 gap-2">
                            <div className="rounded-xl bg-blue-50 p-3"><span className="block text-[9px] font-black uppercase text-blue-600">Attendance</span><strong className="mt-1 block text-lg text-slate-900">{studentProfile.attendance.percentage}%</strong></div>
                            <div className="rounded-xl bg-emerald-50 p-3"><span className="block text-[9px] font-black uppercase text-emerald-600">Present</span><strong className="mt-1 block text-lg text-slate-900">{studentProfile.attendance.attended}</strong></div>
                            <div className="rounded-xl bg-amber-50 p-3"><span className="block text-[9px] font-black uppercase text-amber-600">Absent</span><strong className="mt-1 block text-lg text-slate-900">{studentProfile.attendance.absent}</strong></div>
                          </div>
                          <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs"><p className="font-black uppercase tracking-wider text-slate-400">Student summary</p><p className="mt-2 text-slate-700">{studentProfile.attendance.totalSessions} attendance sessions recorded. Morning present: {studentProfile.attendance.morning.attended}; evening present: {studentProfile.attendance.evening.attended}.</p><p className="mt-2 font-bold text-slate-800">Payment: {studentProfile.student.payment_status || 'Pending'} · Access: {formFields.status}</p></div>
                          <section className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/60 p-3" aria-label="Student outstanding liabilities">
                            <div className="flex items-center justify-between gap-2">
                              <div><p className="text-[9px] font-black uppercase tracking-wider text-amber-800">Outstanding balance</p><p className="mt-1 text-xl font-black text-slate-900">{studentFinance ? formatFinanceAmount(studentFinance.amount_due, studentFinance.currency) : 'Loading…'}</p></div>
                              {studentFinance && <span className="text-right text-[9px] font-semibold text-slate-500">{studentFinance.charges.length} posted charge{studentFinance.charges.length === 1 ? '' : 's'}</span>}
                            </div>
                            {studentFinance && <div className="space-y-2 border-t border-amber-200 pt-2">
                              {studentFinance.charges.length ? studentFinance.charges.map((charge) => (
                                <div key={charge.id} className="flex items-start justify-between gap-3 text-[10px]">
                                  <span className="min-w-0 text-slate-700"><span className="block font-bold text-slate-500">{liabilityLabel(charge)}</span>{charge.description}</span>
                                  <span className="shrink-0 font-mono font-bold text-slate-900">{formatFinanceAmount(Number(charge.amount), charge.currency)}</span>
                                </div>
                              )) : <p className="text-[10px] text-slate-500">No posted liabilities.</p>}
                              <div className="flex justify-between border-t border-amber-200 pt-2 text-[10px]"><span className="text-slate-500">Charges · confirmed payments</span><span className="font-bold text-slate-800">{formatFinanceAmount(studentFinance.total_charges, studentFinance.currency)} · {formatFinanceAmount(studentFinance.total_paid, studentFinance.currency)}</span></div>
                            </div>}
                            {studentFinance && studentFinance.amount_due > 0 && <div className="space-y-2 border-t border-amber-200 pt-3">
                              <button type="button" onClick={() => void sendLiabilityEmail()} disabled={sendingReminder} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-900 px-3 py-2.5 text-[10px] font-black uppercase tracking-wide text-white disabled:opacity-60">
                                {sendingReminder ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}Email branded payment reminder
                              </button>
                              <label className="block text-[9px] font-bold uppercase tracking-wide text-slate-500">Phone with country code
                                <input type="tel" value={reminderPhone} onChange={(event) => setReminderPhone(event.target.value)} placeholder="+260…" className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800" />
                              </label>
                              <div className="grid grid-cols-2 gap-2">
                                <button type="button" onClick={() => openMessageComposer('sms')} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-2 text-[9px] font-black uppercase tracking-wide text-slate-700"><Smartphone className="h-3.5 w-3.5" />Prepare SMS</button>
                                <button type="button" onClick={() => openMessageComposer('whatsapp')} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-2 py-2 text-[9px] font-black uppercase tracking-wide text-emerald-800"><MessageCircle className="h-3.5 w-3.5" />WhatsApp</button>
                              </div>
                              <p className="text-[9px] leading-4 text-slate-500">SMS and WhatsApp open a prefilled message for staff to review and send.</p>
                            </div>}
                            {reminderError && <p role="alert" className="text-[10px] font-semibold text-red-700">{reminderError}</p>}
                            {reminderNotice && <p role="status" className="text-[10px] font-semibold text-emerald-800">{reminderNotice}</p>}
                          </section>
                        </div>
                      )}
                      {profileExportError && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">{profileExportError}</div>}
                      {studentProfile && <div className="flex gap-2">
                        <button type="button" onClick={() => void exportStudentProfile('view')} disabled={profileExportMode !== null} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[10px] font-black uppercase tracking-wide text-slate-700 disabled:opacity-60">
                          {profileExportMode === 'view' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}View PDF
                        </button>
                        <button type="button" onClick={() => void exportStudentProfile('download')} disabled={profileExportMode !== null} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-slate-950 px-3 py-2.5 text-[10px] font-black uppercase tracking-wide text-white disabled:opacity-60">
                          {profileExportMode === 'download' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}Download PDF
                        </button>
                      </div>}
                    </div>
                  )}
                </form>
              </div>

              {/* Action Trigger Footers (BLOCK / UPDATE / SAVE MUTATIONS) */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                {editorMode === 'view' ? (
                  <>
                    <button 
                      type="button"
                      onClick={() => toggleBlockStatus(formFields.id)}
                      className={`flex-1 py-2.5 rounded-xl border text-xs font-black tracking-wide uppercase transition-all flex items-center justify-center gap-2 ${
                        formFields.status === 'Active' 
                          ? 'border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100' 
                          : 'border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                      }`}
                    >
                      <ShieldBan className="h-4 w-4" /> {formFields.status === 'Active' ? 'Impose Block' : 'Lift Hold'}
                    </button>
                    <button 
                      type="button"
                      onClick={() => selectedStudent && handleOpenAction(selectedStudent, 'edit')}
                      className="px-4 py-2.5 bg-slate-950 text-white rounded-xl text-xs font-black tracking-wide uppercase hover:bg-slate-900 transition-all flex items-center gap-2 shadow-xs"
                    >
                      <Edit3 className="h-3.5 w-3.5" /> Modify File
                    </button>
                  </>
                ) : (
                  <>
                    <button 
                      type="button"
                      onClick={() => setEditorMode(null)}
                      className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      form="drawer-form-engine"
                      className="flex-1 py-2.5 bg-slate-950 text-white rounded-xl text-xs font-black tracking-wide uppercase hover:bg-slate-900 transition-all shadow-xs flex items-center justify-center gap-2"
                    >
                      <Save className="h-4 w-4 text-amber-400" /> {editorMode === 'create' ? 'Enlist Profile' : 'Commit Changes'}
                    </button>
                  </>
                )}
              </div>

            </div>
          </div>
        )}

      </div>
    </>
  );
}