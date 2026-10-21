"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  Check,
  ChevronRight,
  GraduationCap,
  IdCard,
  Save,
  ShieldCheck,
  Upload,
  UserRound,
  Users,
  X,
} from "lucide-react";
import CustomAlert from "@/components/main/CustomAlert";
import { api } from "@/lib/api";

const steps = [
  { id: "personal", label: "Student Info", icon: UserRound },
  { id: "education", label: "Qualifications", icon: GraduationCap },
  { id: "documents", label: "Documents", icon: Upload },
  { id: "references", label: "References", icon: Users },
  { id: "review", label: "Review & Submit", icon: Check },
];

const initialState = {
  studentName: "",
  dateOfBirth: "",
  gender: "",
  nationality: "",
  homeAddress: "",
  phone: "",
  email: "",
  program: "",
  startTerm: "",
  currentSchool: "",
  guardianName: "",
  guardianPhone: "",
  guardianEmail: "",
  guardianRelation: "",
  qualifications: "",
  examResults: "",
  previousSchoolAddress: "",
  supportNeeds: "",
  recommendationPastoralName: "",
  recommendationPastoralPhone: "",
  recommendationPastoralEmail: "",
  recommendationPastoralChurch: "",
  recommendationPastoralPosition: "",
  recommendationPastoralAddress: "",
  personalReferenceName: "",
  personalReferenceEmail: "",
  personalReferencePhone: "",
  personalReferenceAddress: "",
  personalReferenceRelation: "",
  personalReferenceDuration: "",
  nextOfKinName: "",
  nextOfKinPhone: "",
  nextOfKinEmail: "",
  nextOfKinAddress: "",
  nextOfKinRelation: "",
  passportPhoto: null,
  birthCertificate: null,
  reportCard: null,
  idDocument: null,
};

const wizardVariants = {
  hidden: { opacity: 0, x: 28 },
  visible: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -28 },
};

type FormDataState = typeof initialState;

type AlertStatus = {
  type: "success" | "error" | "";
  title: string;
  message: string;
};

type ApplicationRecord = {
  id: string;
  status: "Submitted" | "Recommendations pending" | "Payment pending" | "Under review" | "Interview scheduled" | "Approved";
  recommendations: { pastoral: "Pending" | "Sent" | "Failed" | "Submitted"; personal: "Pending" | "Sent" | "Failed" | "Submitted" };
  trackingEmailSent: boolean;
};

const applicationDraftStorageKey = "rhema_admission_application_draft";
const documentFields: (keyof FormDataState)[] = ["passportPhoto", "birthCertificate", "reportCard", "idDocument"];

export default function ApplicationPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<FormDataState>(initialState);
  const [status, setStatus] = useState<AlertStatus>({ type: "", title: "", message: "" });
  const [application, setApplication] = useState<ApplicationRecord | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [savedDraftAvailable, setSavedDraftAvailable] = useState(false);
  const [isDraftDirty, setIsDraftDirty] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const openFormButtonRef = useRef<HTMLButtonElement>(null);
  const closeFormButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const currentStepMeta = steps[currentStep];

  const progress = useMemo(() => ((currentStep + 1) / steps.length) * 100, [currentStep]);

  const restoreDraft = useCallback(() => {
    try {
      const savedDraft = window.sessionStorage.getItem(applicationDraftStorageKey);
      if (!savedDraft) {
        setSavedDraftAvailable(false);
        setIsDraftDirty(false);
        setFormData(initialState);
        setCurrentStep(0);
        return false;
      }

      const parsed: unknown = JSON.parse(savedDraft);
      if (!parsed || typeof parsed !== "object") throw new Error("The saved application draft is invalid.");
      const draft = parsed as Record<string, unknown>;
      if (!draft.formData || typeof draft.formData !== "object") throw new Error("The saved application draft is invalid.");

      const savedFormData = draft.formData as Record<string, unknown>;
      const restoredFormData = { ...initialState };
      for (const field of Object.keys(initialState) as (keyof FormDataState)[]) {
        if (documentFields.includes(field)) continue;
        const value = savedFormData[field];
        if (typeof value === "string") Object.assign(restoredFormData, { [field]: value });
      }
      setFormData(restoredFormData);
      setIsDraftDirty(false);
      setCurrentStep(typeof draft.currentStep === "number" && Number.isInteger(draft.currentStep)
        ? Math.min(Math.max(draft.currentStep, 0), steps.length - 1)
        : 0);
      setSavedDraftAvailable(true);
      return true;
    } catch (cause) {
      setStatus({
        type: "error",
        title: "Draft could not be opened",
        message: cause instanceof Error ? cause.message : "The saved application draft could not be read.",
      });
      return false;
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(restoreDraft, 0);
    return () => window.clearTimeout(timer);
  }, [restoreDraft]);

  const cancelForm = useCallback(() => {
    if (application) {
      setIsFormOpen(false);
      return;
    }
    if (isDraftDirty && !window.confirm("Cancel this application and discard changes since your last saved draft?")) return;
    restoreDraft();
    setIsFormOpen(false);
  }, [application, isDraftDirty, restoreDraft]);
  const cancelFormRef = useRef(cancelForm);
  useEffect(() => {
    cancelFormRef.current = cancelForm;
  }, [cancelForm]);

  useEffect(() => {
    if (!isFormOpen) {
      openFormButtonRef.current?.focus();
      return undefined;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeFormButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") cancelFormRef.current();
      if (event.key === "Tab") {
        const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable?.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isFormOpen]);

  const updateField = <K extends keyof FormDataState>(field: K, value: FormDataState[K]) => {
    setIsDraftDirty(true);
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (field: keyof FormDataState, file: File | null | undefined) => {
    if (!file) return;
    updateField(field, file.name as FormDataState[keyof FormDataState]);
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const saveDraft = () => {
    try {
      const draftFormData = {
        ...formData,
        passportPhoto: "",
        birthCertificate: "",
        reportCard: "",
        idDocument: "",
      };
      window.sessionStorage.setItem(applicationDraftStorageKey, JSON.stringify({ formData: draftFormData, currentStep }));
      setSavedDraftAvailable(true);
      setIsDraftDirty(false);
      setStatus({
        type: "success",
        title: "Draft saved",
        message: "Your draft is saved for this browser session. Re-select supporting documents when you continue.",
      });
      setIsFormOpen(false);
    } catch (cause) {
      setStatus({
        type: "error",
        title: "Draft could not be saved",
        message: cause instanceof Error ? cause.message : "Your browser could not save this draft. Check available storage and try again.",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const required = [
      formData.studentName,
      formData.dateOfBirth,
      formData.phone,
      formData.email,
      formData.program,
      formData.guardianName,
      formData.guardianPhone,
      formData.qualifications,
      formData.recommendationPastoralName,
      formData.personalReferenceName,
      formData.nextOfKinName,
    ];

    if (required.some((value) => !value || !value.trim())) {
      setStatus({
        type: "error",
        title: "Incomplete application",
        message: "Please complete all required fields before submitting this school application.",
      });
      return;
    }

    if (!formData.recommendationPastoralEmail.trim() || !formData.personalReferenceEmail.trim()) {
      setStatus({
        type: "error",
        title: "Recommender email required",
        message: "Enter a valid email address for both recommenders. Recommendation invitations are sent automatically by email.",
      });
      return;
    }

    setIsSubmitting(true);
    let responseData: {
      id?: string;
      recommendation_statuses?: { pastoral?: "sent" | "failed"; personal?: "sent" | "failed" };
      tracking_email_sent?: boolean;
    } = {};
    let responseMessage = "";
    try {
      const response = await api.admissions.save({ application_data: formData, status: "Recommendations pending" }) as { data?: typeof responseData; message?: string };
      responseData = response.data ?? {};
      responseMessage = response.message ?? "";
      if (!responseData.id) throw new Error("The admissions service did not return an application reference. Please contact admissions before retrying.");
    } catch (cause) {
      setStatus({
        type: "error",
        title: "Application could not be submitted",
        message: cause instanceof Error ? cause.message : "The admissions service could not save your application. Please try again.",
      });
      setIsSubmitting(false);
      return;
    }
    const nextApplication: ApplicationRecord = {
      id: responseData.id!,
      status: "Recommendations pending",
      recommendations: {
        pastoral: responseData.recommendation_statuses?.pastoral === "sent" ? "Sent" : responseData.recommendation_statuses?.pastoral === "failed" ? "Failed" : "Pending",
        personal: responseData.recommendation_statuses?.personal === "sent" ? "Sent" : responseData.recommendation_statuses?.personal === "failed" ? "Failed" : "Pending",
      },
      trackingEmailSent: responseData.tracking_email_sent === true,
    };
    setApplication(nextApplication);
    const failedDeliveries = (["pastoral", "personal"] as const)
      .filter((kind) => responseData.recommendation_statuses?.[kind] === "failed");
    setStatus({
      type: failedDeliveries.length ? "error" : "success",
      title: failedDeliveries.length ? "Application submitted; email delivery failed" : "Application submitted",
      message: failedDeliveries.length
        ? `Application ${nextApplication.id} is saved, but the ${failedDeliveries.join(" and ")} recommendation email${failedDeliveries.length > 1 ? "s" : ""} could not be sent. Contact admissions for help.`
        : responseMessage || `Application ${nextApplication.id} has been saved.`,
    });
    if (!nextApplication.trackingEmailSent) {
      setStatus({
        type: "error",
        title: "Application saved; tracking email not sent",
        message: `Your application ${nextApplication.id} is saved, but we could not email your secure status link. Contact admissions with your application reference to check progress.`,
      });
    }
    try {
      window.sessionStorage.removeItem(applicationDraftStorageKey);
      setSavedDraftAvailable(false);
    } catch (cause) {
      console.error("Could not clear the submitted application draft from session storage.", cause);
      setStatus({
        type: "error",
        title: "Application submitted; draft could not be cleared",
        message: "Your application was submitted, but this browser could not clear the saved draft. Close this browser tab to remove the session draft.",
      });
    }
    setIsDraftDirty(false);
    setIsSubmitting(false);
  };

  const renderInput = <K extends keyof FormDataState>(
    label: string,
    name: K,
    type: React.HTMLInputTypeAttribute = "text",
    placeholder = "",
  ) => (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-700">{label}</label>
      <input
        type={type}
        name={name}
        value={String(formData[name] ?? "")}
        onChange={(e) => updateField(name, e.target.value as FormDataState[K])}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-red-400 focus:bg-white"
      />
    </div>
  );

  const renderTextarea = <K extends keyof FormDataState>(
    label: string,
    name: K,
    placeholder: string,
    rows = 4,
  ) => (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-700">{label}</label>
      <textarea
        rows={rows}
        name={name}
        value={String(formData[name] ?? "")}
        onChange={(e) => updateField(name, e.target.value as FormDataState[K])}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-red-400 focus:bg-white"
      />
    </div>
  );

  const renderFileUpload = <K extends keyof FormDataState>(label: string, fieldName: K) => (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-700">{label}</label>
      <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600 transition hover:border-red-400 hover:bg-white">
        <span>{String(formData[fieldName] ?? "Choose file")}</span>
        <Upload size={16} className="text-red-600" />
        <input
          type="file"
          className="hidden"
          onChange={(e) => handleFileChange(fieldName, e.target.files?.[0])}
        />
      </label>
    </div>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {renderInput("Student full name", "studentName", "text", "Enter student full name")}
              {renderInput("Date of birth", "dateOfBirth", "date")}
              {renderInput("Gender", "gender", "text", "Male / Female / Other")}
              {renderInput("Nationality", "nationality", "text", "Nationality")}
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              {renderInput("Phone number", "phone", "tel", "+233 20 000 0000")}
              {renderInput("Email address", "email", "email", "student@example.com")}
              {renderInput("Home address", "homeAddress", "text", "Residential address")}
              {renderInput("Program applying for", "program", "text", "Primary / JHS / SHS / etc")}
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              {renderInput("Preferred start term", "startTerm", "text", "September 2026")}
              {renderInput("Current / previous school", "currentSchool", "text", "School name")}
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              {renderInput("Guardian name", "guardianName", "text", "Parent / guardian full name")}
              {renderInput("Guardian phone", "guardianPhone", "tel", "+233 20 000 0000")}
              {renderInput("Guardian email", "guardianEmail", "email", "guardian@example.com")}
              {renderInput("Guardian relationship", "guardianRelation", "text", "Father / Mother / Guardian")}
            </div>
          </div>
        );
      case 1:
        return (
          <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {renderTextarea("Academic qualifications", "qualifications", "List academic qualifications and records")}
              {renderTextarea("Exam results / grades", "examResults", "Enter grades, scores or exam summary")}
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              {renderTextarea("Previous school address", "previousSchoolAddress", "Previous school location and contact details", 4)}
              {renderTextarea("Support needs / accommodations", "supportNeeds", "Mention any special educational needs or support preferred", 4)}
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {renderFileUpload("Passport photo", "passportPhoto")}
              {renderFileUpload("Birth certificate", "birthCertificate")}
              {renderFileUpload("Academic report / transcript", "reportCard")}
              {renderFileUpload("Identification document", "idDocument")}
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-8">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-100 text-red-700">
                  <BriefcaseBusiness size={18} />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Pastoral Recommendation</h3>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                {renderInput("Pastoral recommender name", "recommendationPastoralName", "text", "Name")}
                {renderInput("Phone", "recommendationPastoralPhone", "tel", "+233 20 000 0000")}
                {renderInput("Email (required)", "recommendationPastoralEmail", "email", "pastor@example.com")}
                {renderInput("Church name", "recommendationPastoralChurch", "text", "Church name")}
                {renderInput("Position / role", "recommendationPastoralPosition", "text", "Minister / Elder / Pastor")}
                {renderInput("Address", "recommendationPastoralAddress", "text", "Church address")}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-100 text-red-700">
                  <Users size={18} />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Personal Recommendation</h3>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                {renderInput("Name", "personalReferenceName", "text", "Full name")}
                {renderInput("Email address (required)", "personalReferenceEmail", "email", "reference@example.com")}
                {renderInput("Phone", "personalReferencePhone", "tel", "+233 20 000 0000")}
                {renderInput("Address", "personalReferenceAddress", "text", "Physical address")}
                {renderInput("Relationship", "personalReferenceRelation", "text", "Teacher / Family friend / Mentor")}
                {renderInput("How long have you known them?", "personalReferenceDuration", "text", "e.g. 3 years")}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-100 text-red-700">
                  <IdCard size={18} />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Next of Kin</h3>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                {renderInput("Next of kin name", "nextOfKinName", "text", "Full name")}
                {renderInput("Phone", "nextOfKinPhone", "tel", "+233 20 000 0000")}
                {renderInput("Email", "nextOfKinEmail", "email", "kin@example.com")}
                {renderInput("Address", "nextOfKinAddress", "text", "Address")}
                {renderInput("Relationship", "nextOfKinRelation", "text", "Mother / Father / Aunt / Guardian")}
              </div>
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-6">
            <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-100 text-red-700">
                  <ShieldCheck size={18} />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Application review</h3>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div className="rounded-2xl bg-white p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Student</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">{formData.studentName || "Not provided"}</p>
                </div>
                <div className="rounded-2xl bg-white p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Program</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">{formData.program || "Not provided"}</p>
                </div>
                <div className="rounded-2xl bg-white p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Guardian</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">{formData.guardianName || "Not provided"}</p>
                </div>
                <div className="rounded-2xl bg-white p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">School</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">{formData.currentSchool || "Not provided"}</p>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-xl font-bold text-slate-900">Declaration</h3>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                I confirm that the information provided is accurate and complete to the best of my knowledge. I understand that submission of this application does not guarantee admission and that supporting documents may be requested for verification.
              </p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-white pb-10">
      <section className="bg-[#f4f5f4] px-4 pb-10 pt-32 sm:px-6 sm:pb-14 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <p className="text-xs font-semibold text-slate-500"><Link href="/" className="hover:text-blue-800">Home</Link><span className="mx-2">/</span><Link href="/apply" className="hover:text-blue-800">Admissions</Link><span className="mx-2">/</span>2027 Application</p>
          <p className="mt-5 text-[11px] font-black uppercase tracking-[0.2em] text-blue-800">2027 admissions</p>
          <h1 className="mt-2 max-w-3xl text-3xl font-black leading-tight tracking-tight text-[#10283a] sm:text-5xl">Begin your Rhema Zambia application.</h1>
          <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-slate-700">Complete the application in a guided form. You can save your progress on this device and return to it later.</p>

          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <h2 className="text-lg font-black text-[#10283a]">Before you begin</h2>
            <ul className="mt-3 grid gap-2 text-sm leading-6 text-slate-600 sm:grid-cols-2">
              <li>Prepare a certified NRC or passport copy.</li>
              <li>Prepare your Grade 12 certificate.</li>
              <li>Have a recent passport-size photo ready.</li>
              <li>Have your pastoral and personal referee details ready.</li>
            </ul>
            {savedDraftAvailable ? (
              <p className="mt-4 rounded-xl bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-900" role="status">
                You have a saved draft for this browser session. Re-select supporting documents when you continue.
              </p>
            ) : null}
            {status.message ? (
              <div className="mt-4">
                <CustomAlert type={status.type} title={status.title} message={status.message} onClose={() => setStatus({ type: "", title: "", message: "" })} />
              </div>
            ) : null}
            <button
              ref={openFormButtonRef}
              type="button"
              onClick={() => {
                if (savedDraftAvailable) restoreDraft();
                setStatus({ type: "", title: "", message: "" });
                setIsFormOpen(true);
              }}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#c8102e] px-6 py-3 text-sm font-bold text-white transition hover:bg-red-800"
            >
              {savedDraftAvailable ? "Continue application" : "Start application"}
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>

      <AnimatePresence>
        {isFormOpen ? (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/65 p-2 backdrop-blur-sm sm:p-5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) cancelForm();
            }}
          >
            <motion.section
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="application-modal-title"
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
            >
              <header className="shrink-0 border-b border-slate-200 bg-slate-100 px-5 py-4 sm:px-8 sm:py-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-800">Official application form</p>
                    <h2 id="application-modal-title" className="mt-1 text-xl font-black text-[#10283a] sm:text-2xl">
                      {application ? "Application submitted" : "2027 Student Application"}
                    </h2>
                  </div>
                  <button
                    ref={closeFormButtonRef}
                    type="button"
                    onClick={cancelForm}
                    aria-label="Close application form"
                    className="rounded-full p-2 text-slate-600 transition hover:bg-white hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <X size={21} />
                  </button>
                </div>
                {!application ? (
                  <>
                    <div className="mt-4 flex items-center justify-between text-xs font-medium text-slate-500">
                      <span>Step {currentStep + 1} of {steps.length} · {currentStepMeta.label}</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                      <motion.div className="h-full rounded-full bg-red-600" animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
                    </div>
                    <nav aria-label="Application steps" className="mt-4 flex gap-2 overflow-x-auto pb-1">
                      {steps.map((step, index) => {
                        const Icon = step.icon;
                        const isActive = currentStep === index;
                        const isComplete = index < currentStep;
                        return (
                          <button
                            key={step.id}
                            type="button"
                            onClick={() => setCurrentStep(index)}
                            disabled={index > currentStep}
                            aria-current={isActive ? "step" : undefined}
                            className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed ${
                              isActive
                                ? "border-red-200 bg-red-100 text-red-700"
                                : isComplete
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                  : "border-slate-200 bg-white text-slate-500"
                            }`}
                          >
                            <Icon size={14} />
                            {step.label}
                          </button>
                        );
                      })}
                    </nav>
                  </>
                ) : null}
              </header>

              {application ? (
                <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-8">
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 sm:p-7">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">{application.id} · {application.status}</p>
                    <h3 className="mt-2 text-xl font-black text-emerald-950">Your application is saved.</h3>
                    <p className="mt-2 text-sm leading-6 text-emerald-950">
                      {application.trackingEmailSent
                        ? "We sent a private application-tracking link to your email address. Use that link to check your application and recommendation progress."
                        : "We could not email your private tracking link. Contact admissions with your application reference to check progress."}
                    </p>
                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      {(["pastoral", "personal"] as const).map((kind) => {
                        const recommendationStatus = application.recommendations[kind];
                        const submitted = recommendationStatus === "Submitted";
                        const statusLabel = submitted ? "Submitted"
                          : recommendationStatus === "Sent" ? "Email sent"
                            : recommendationStatus === "Failed" ? "Send failed"
                              : recommendationStatus;
                        return (
                          <div key={kind} className="rounded-xl border border-emerald-200 bg-white p-4">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-bold capitalize text-emerald-950">{kind} recommendation</p>
                              <span className={`rounded-full px-2.5 py-1 text-[11px] font-black uppercase ${submitted ? "bg-emerald-100 text-emerald-800" : recommendationStatus === "Failed" ? "bg-red-100 text-red-800" : recommendationStatus === "Sent" ? "bg-sky-100 text-sky-800" : "bg-amber-100 text-amber-800"}`}>
                                {statusLabel}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {status.message ? (
                      <div className="mt-4">
                        <CustomAlert type={status.type} title={status.title} message={status.message} onClose={() => setStatus({ type: "", title: "", message: "" })} />
                      </div>
                    ) : null}
                    <p className="mt-4 text-xs text-emerald-900">No application fee. Keep your private tracking link secure; anyone with the link can view this application&apos;s status.</p>
                  </div>
                  <div className="mt-5 flex justify-end">
                    <button type="button" onClick={() => setIsFormOpen(false)} className="rounded-full bg-[#10283a] px-6 py-3 text-sm font-bold text-white transition hover:bg-slate-800">
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
                  <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-8">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={currentStep}
                        variants={wizardVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        transition={{ duration: 0.28 }}
                      >
                        {renderStepContent()}
                      </motion.div>
                    </AnimatePresence>
                    {status.message ? (
                      <div className="mt-6">
                        <CustomAlert type={status.type} title={status.title} message={status.message} onClose={() => setStatus({ type: "", title: "", message: "" })} />
                      </div>
                    ) : null}
                  </div>
                  <footer className="flex shrink-0 flex-col gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={cancelForm} className="rounded-full border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
                        Cancel
                      </button>
                      <button type="button" onClick={saveDraft} className="inline-flex items-center justify-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-900 transition hover:bg-blue-100">
                        <Save size={15} />
                        Save draft
                      </button>
                    </div>
                    <div className="flex gap-2 sm:justify-end">
                      <button
                        type="button"
                        onClick={prevStep}
                        disabled={currentStep === 0 || isSubmitting}
                        className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <ArrowLeft size={16} />
                        Previous
                      </button>
                      {currentStep < steps.length - 1 ? (
                        <button
                          type="button"
                          onClick={nextStep}
                          className="inline-flex items-center justify-center gap-2 rounded-full bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500"
                        >
                          Next
                          <ChevronRight size={16} />
                        </button>
                      ) : (
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="inline-flex items-center justify-center gap-2 rounded-full bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-wait disabled:opacity-60"
                        >
                          {isSubmitting ? "Submitting…" : "Submit application"}
                          <ArrowRight size={16} />
                        </button>
                      )}
                    </div>
                  </footer>
                </form>
              )}
            </motion.section>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
