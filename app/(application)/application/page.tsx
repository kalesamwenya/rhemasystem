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
import { openFlutterwaveInlineCheckout, type FlutterwaveInlineCheckout } from "@/lib/flutterwave-inline";

const steps = [
  { id: "personal", label: "Applicant details", icon: UserRound },
  { id: "education", label: "Education", icon: GraduationCap },
  { id: "references", label: "Recommendations", icon: Users },
  { id: "emergency", label: "Emergency contact", icon: IdCard },
  { id: "background", label: "Spiritual background", icon: BriefcaseBusiness },
  { id: "documents", label: "Documents", icon: Upload },
  { id: "review", label: "Review & Submit", icon: Check },
];

const initialState = {
  firstName: "",
  lastName: "",
  dateOfBirth: "",
  nrcPassportNumber: "",
  nationality: "",
  phone: "",
  email: "",
  confirmEmail: "",
  program: "",
  yearApplyingFor: "",
  preferredClass: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  province: "",
  postalCode: "",
  country: "Zambia",
  hasFiveOLevelCredits: "",
  secondarySchool: "",
  highSchoolAttended: "",
  collegeAttended: "",
  diplomaEarned: "",
  collegeCompletionYear: "",
  pastoralRecommenderName: "",
  recommendationPastoralPhone: "",
  recommendationPastoralEmail: "",
  recommendationPastoralAddress: "",
  personalReferenceName: "",
  personalReferenceEmail: "",
  personalReferencePhone: "",
  personalReferenceAddress: "",
  emergencyContactName: "",
  emergencyContactRelationship: "",
  emergencyContactPhone: "",
  emergencyContactEmail: "",
  emergencyContactAddress: "",
  salvationDate: "",
  baptismDate: "",
  churchAffiliation: "",
  pastorName: "",
  churchAttendanceDuration: "",
  ministryExperience: "",
  declarationAccuracy: false,
  declarationRecommenders: false,
  passportPhoto: null as File | null,
  birthCertificate: null as File | null,
  nrcOrPassport: null as File | null,
  resultsCertificate: null as File | null,
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
  statusToken: string;
  trackingUrl: string;
  status: "Submitted" | "Recommendations pending" | "Payment pending" | "Under review" | "Interview scheduled" | "Approved";
  trackingEmailSent: boolean;
  nextOfKinEmailSent: boolean;
  recommendationEmailsSent: { pastoral: boolean; personal: boolean };
  feeRequired: boolean;
  feeAmount: number;
  currency: string;
  paymentStatus: "Pending" | "Paid" | "Not required";
};

type EnrollmentSettings = {
  enrollment_open: boolean;
  application_years: number[];
  application_fee_required: boolean;
  application_fee_amount: number;
  currency: string;
};

const applicationDraftStorageKey = "rhema_admission_application_draft";
const documentFields: (keyof FormDataState)[] = ["passportPhoto", "birthCertificate", "nrcOrPassport", "resultsCertificate"];
const isBrowserFile = (value: unknown): value is File => typeof File !== "undefined" && value instanceof File;

export default function ApplicationPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<FormDataState>(initialState);
  const [status, setStatus] = useState<AlertStatus>({ type: "", title: "", message: "" });
  const [application, setApplication] = useState<ApplicationRecord | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [savedDraftAvailable, setSavedDraftAvailable] = useState(false);
  const [isDraftDirty, setIsDraftDirty] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [enrollmentOpen, setEnrollmentOpen] = useState(false);
  const [applicationYears, setApplicationYears] = useState<number[]>([]);
  const [applicationFeeRequired, setApplicationFeeRequired] = useState(false);
  const [applicationFeeAmount, setApplicationFeeAmount] = useState(0);
  const [applicationFeeCurrency, setApplicationFeeCurrency] = useState("ZMW");
  const [enrollmentStatusLoaded, setEnrollmentStatusLoaded] = useState(false);
  const [enrollmentStatusError, setEnrollmentStatusError] = useState("");
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
        if (typeof value === "boolean") Object.assign(restoredFormData, { [field]: value });
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

  useEffect(() => {
    let active = true;
    api.admissions.getEnrollmentStatus()
      .then((response: { data?: EnrollmentSettings }) => {
        if (!active) return;
        if (typeof response.data?.enrollment_open !== "boolean" || !Array.isArray(response.data.application_years)) {
          throw new Error("Enrollment status is unavailable.");
        }
        setEnrollmentOpen(response.data.enrollment_open);
        setApplicationYears(response.data.application_years);
        setApplicationFeeRequired(response.data.application_fee_required === true);
        setApplicationFeeAmount(Number(response.data.application_fee_amount ?? 0));
        setApplicationFeeCurrency(response.data.currency || "ZMW");
        setFormData((current) => ({
          ...current,
          yearApplyingFor: response.data?.application_years.includes(Number(current.yearApplyingFor))
            ? current.yearApplyingFor
            : String(response.data?.application_years[0] ?? ""),
        }));
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setEnrollmentStatusError(cause instanceof Error ? cause.message : "Enrollment status is unavailable.");
      })
      .finally(() => {
        if (active) setEnrollmentStatusLoaded(true);
      });
    return () => { active = false; };
  }, []);

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

  const handleFileChange = (field: (typeof documentFields)[number], file: File | null | undefined) => {
    if (!file) return;
    setIsDraftDirty(true);
    setFormData((previous) => ({ ...previous, [field]: file }));
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
        nrcOrPassport: "",
        resultsCertificate: "",
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
      formData.firstName,
      formData.lastName,
      formData.dateOfBirth,
      formData.nrcPassportNumber,
      formData.phone,
      formData.email,
      formData.yearApplyingFor,
      formData.hasFiveOLevelCredits,
      formData.pastoralRecommenderName,
      formData.personalReferenceName,
      formData.emergencyContactName,
      formData.emergencyContactEmail,
      formData.declarationAccuracy,
      formData.declarationRecommenders,
    ];

    if (required.some((value) => typeof value === "string" ? !value.trim() : !value)) {
      setStatus({
        type: "error",
        title: "Incomplete application",
        message: "Complete the required applicant, education, reference, emergency-contact, and declaration fields before submitting.",
      });
      return;
    }

    if (formData.email.trim().toLowerCase() !== formData.confirmEmail.trim().toLowerCase()) {
      setStatus({
        type: "error",
        title: "Email addresses do not match",
        message: "Confirm your email address before submitting your application.",
      });
      return;
    }

    if (!formData.recommendationPastoralEmail.trim() || !formData.personalReferenceEmail.trim()) {
      setStatus({
        type: "error",
        title: "Recommender email required",
        message: "Enter an email address for both recommenders so their confidential recommendation requests can be sent directly.",
      });
      return;
    }

    if (!formData.nrcOrPassport || !formData.resultsCertificate || !formData.passportPhoto || !formData.birthCertificate) {
      setStatus({
        type: "error",
        title: "Required documents missing",
        message: "Attach your NRC or passport, student results / Grade 12 certificate, and passport-size photo.",
      });
      return;
    }

    setIsSubmitting(true);
    let responseData: {
      id?: string;
      status_token?: string;
      tracking_url?: string;
      tracking_email_sent?: boolean;
      next_of_kin_email_sent?: boolean;
      recommendation_emails_sent?: { pastoral?: boolean; personal?: boolean };
      fee_required?: boolean;
      fee_amount?: number;
      currency?: string;
    } = {};
    try {
      const applicationData = { ...formData, passportPhoto: null, birthCertificate: null, nrcOrPassport: null, resultsCertificate: null };
      const requestData = new FormData();
      requestData.append("application_data", JSON.stringify(applicationData));
      for (const field of documentFields) {
        const file = formData[field];
        if (isBrowserFile(file)) requestData.append(field, file);
      }
      const response = await api.admissions.save(requestData) as { data?: typeof responseData };
      responseData = response.data ?? {};
      if (!responseData.id || !responseData.status_token) throw new Error("The admissions service did not return a secure application reference. Please contact admissions before retrying.");
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
      statusToken: responseData.status_token,
      trackingUrl: responseData.tracking_url || "",
      status: "Recommendations pending",
      trackingEmailSent: responseData.tracking_email_sent === true,
      nextOfKinEmailSent: responseData.next_of_kin_email_sent === true,
      recommendationEmailsSent: {
        pastoral: responseData.recommendation_emails_sent?.pastoral === true,
        personal: responseData.recommendation_emails_sent?.personal === true,
      },
      feeRequired: responseData.fee_required === true,
      feeAmount: Number(responseData.fee_amount ?? 0),
      currency: responseData.currency || applicationFeeCurrency,
      paymentStatus: responseData.fee_required === true ? "Pending" : "Not required",
    };
    setApplication(nextApplication);
    setStatus({
      type: nextApplication.feeRequired ? "" : "success",
      title: nextApplication.feeRequired ? "" : "Application submitted",
      message: nextApplication.feeRequired ? "" : `Application ${nextApplication.id} has been received.`,
    });
    const failedEmails = [
      !nextApplication.trackingEmailSent && "your tracking link",
      !nextApplication.nextOfKinEmailSent && "the next-of-kin notification",
      !nextApplication.recommendationEmailsSent.pastoral && "the pastor recommendation invitation",
      !nextApplication.recommendationEmailsSent.personal && "the personal recommendation invitation",
    ].filter(Boolean);
    if (failedEmails.length) {
      setStatus({
        type: "error",
        title: "Application saved; some emails were not sent",
        message: `We could not send ${failedEmails.join(", ")}. Your application is saved; contact admissions with your application reference if needed.`,
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
    if (nextApplication.feeRequired) void startApplicationFeePayment(nextApplication.id, nextApplication.statusToken);
  };

  const startApplicationFeePayment = async (applicationId: string, statusToken: string) => {
    setIsSubmitting(true);
    try {
      const initiation = await api.admissions.initiateFeePayment(applicationId, statusToken) as { data: FlutterwaveInlineCheckout };
      await openFlutterwaveInlineCheckout(initiation.data, async (transaction) => {
        const transactionId = String(transaction.transaction_id ?? "");
        if (!/^\d+$/.test(transactionId) || transaction.tx_ref !== initiation.data.reference) {
          setStatus({
            type: "error",
            title: "Payment could not be confirmed",
            message: "Flutterwave returned invalid payment details. Your application fee remains unpaid.",
          });
          setIsSubmitting(false);
          return;
        }
        setIsSubmitting(true);
        setStatus({ type: "", title: "", message: "" });
        try {
          const verification = await api.admissions.verifyFeePayment(transactionId, initiation.data.reference) as {
            data?: { application_status?: ApplicationRecord["status"] };
          };
          const applicationStatus = verification.data?.application_status ?? "Recommendations pending";
          setApplication((current) => current?.id === applicationId
            ? { ...current, paymentStatus: "Paid", status: applicationStatus }
            : current);
          setStatus({
            type: "success",
            title: "Application fee paid",
            message: applicationStatus === "Under review"
              ? "Your payment was confirmed and your application is under review."
              : "Your payment was confirmed. Your application will move to review once both recommendations have been submitted.",
          });
        } catch (cause) {
          setStatus({
            type: "error",
            title: "Payment confirmation pending",
            message: cause instanceof Error ? cause.message : "We could not confirm the payment yet. Your application fee has not been marked paid.",
          });
        } finally {
          setIsSubmitting(false);
        }
      }, () => {
        setStatus({ type: "error", title: "Payment not completed", message: "Your application is saved, but the fee is still due. You can retry payment below." });
        setIsSubmitting(false);
      });
    } catch (cause) {
      setStatus({
        type: "error",
        title: "Unable to start payment",
        message: cause instanceof Error ? cause.message : "Your application is saved, but payment could not be started. Please retry.",
      });
      setIsSubmitting(false);
    }
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
        <span>{isBrowserFile(formData[fieldName]) ? formData[fieldName].name : "Choose file"}</span>
        <Upload size={16} className="text-red-600" />
        <input
          type="file"
          className="hidden"
          accept={fieldName === "passportPhoto" ? "image/jpeg,image/png" : "application/pdf,image/jpeg,image/png"}
          onChange={(e) => {
            if (documentFields.includes(fieldName)) handleFileChange(fieldName, e.target.files?.[0]);
          }}
        />
      </label>
    </div>
  );

  const renderSelect = <K extends keyof FormDataState>(label: string, name: K, options: string[]) => (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-700">{label}</label>
      <select
        name={name}
        value={String(formData[name] ?? "")}
        onChange={(event) => updateField(name, event.target.value as FormDataState[K])}
        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-red-400 focus:bg-white"
      >
        <option value="">Select an option</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </div>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-slate-900">Applicant details</h3>
            <div className="grid gap-6 md:grid-cols-2">
              {renderInput("First name *", "firstName")}
              {renderInput("Last name *", "lastName")}
              {renderInput("Your email address *", "email", "email")}
              {renderInput("Confirm your email address *", "confirmEmail", "email")}
              {renderInput("Phone number *", "phone", "tel")}
              {renderInput("NRC or passport number *", "nrcPassportNumber")}
              {renderInput("Date of birth *", "dateOfBirth", "date")}
              {renderSelect("Year applying for *", "yearApplyingFor", applicationYears.map(String))}
              {renderInput("Preferred class, if known", "preferredClass")}
              {renderInput("Nationality", "nationality", "text", "Nationality")}
              {renderInput("Address line 1", "addressLine1")}
              {renderInput("Address line 2", "addressLine2")}
              {renderInput("City / town", "city")}
              {renderInput("Province / region", "province")}
              {renderInput("Postal code", "postalCode")}
              {renderInput("Country", "country")}
            </div>
          </div>
        );
      case 1:
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-slate-900">Education</h3>
            <div className="grid gap-6 md:grid-cols-2">
              {renderSelect("Do you have five O-level credits? *", "hasFiveOLevelCredits", ["Yes", "No", "Pending"])}
              {renderInput("High / secondary school attended", "highSchoolAttended")}
              {renderInput("Secondary school completed", "secondarySchool")}
              {renderInput("College / university attended, if any", "collegeAttended")}
              {renderInput("Diploma / degree earned", "diplomaEarned")}
              {renderInput("Year you completed college / university", "collegeCompletionYear", "number")}
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-8">
            <section className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
              <h3 className="mb-5 text-xl font-bold text-slate-900">Pastoral recommender</h3>
              <p className="mb-5 text-sm text-slate-600">A private recommendation request will be sent directly to this person.</p>
              <div className="grid gap-6 md:grid-cols-2">
                {renderInput("Pastor’s full name *", "pastoralRecommenderName")}
                {renderInput("Pastor’s email address *", "recommendationPastoralEmail", "email")}
                {renderInput("Pastor’s phone number", "recommendationPastoralPhone", "tel")}
                {renderTextarea("Pastor’s postal / residential address", "recommendationPastoralAddress", "Address")}
              </div>
            </section>
            <section className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
              <h3 className="mb-5 text-xl font-bold text-slate-900">Personal recommender</h3>
              <p className="mb-5 text-sm text-slate-600">Choose someone who knows you well and is not a relative.</p>
              <div className="grid gap-6 md:grid-cols-2">
                {renderInput("Recommender’s full name *", "personalReferenceName")}
                {renderInput("Recommender’s email address *", "personalReferenceEmail", "email")}
                {renderInput("Recommender’s phone number", "personalReferencePhone", "tel")}
                {renderTextarea("Recommender’s postal / residential address", "personalReferenceAddress", "Address")}
              </div>
            </section>
          </div>
        );
      case 3:
        return (
          <section className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
            <h3 className="mb-2 text-xl font-bold text-slate-900">Emergency contact / next of kin</h3>
            <p className="mb-5 text-sm text-slate-600">We will email this person a notification that you listed them as your emergency contact. Your private tracking link is sent only to you.</p>
            <div className="grid gap-6 md:grid-cols-2">
              {renderInput("Full name *", "emergencyContactName")}
              {renderInput("Relationship to you", "emergencyContactRelationship")}
              {renderInput("Phone number", "emergencyContactPhone", "tel")}
              {renderInput("Email address *", "emergencyContactEmail", "email")}
              {renderTextarea("Address", "emergencyContactAddress", "Address")}
            </div>
          </section>
        );
      case 4:
        return (
          <section className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
            <h3 className="mb-5 text-xl font-bold text-slate-900">Spiritual background</h3>
            <div className="grid gap-6 md:grid-cols-2">
              {renderInput("When did you accept Christ as your Saviour?", "salvationDate", "date")}
              {renderInput("When were you baptised?", "baptismDate", "date")}
              {renderInput("Current church affiliation", "churchAffiliation")}
              {renderInput("Pastor / minister’s name", "pastorName")}
              {renderInput("How long have you attended this church?", "churchAttendanceDuration")}
              {renderTextarea("Describe your ministry experience, if any", "ministryExperience", "Ministry experience")}
            </div>
          </section>
        );
      case 5:
        return (
          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
              <h3 className="mb-2 text-xl font-bold text-slate-900">Required documents</h3>
              <p className="mb-5 text-sm text-slate-600">Upload readable copies. PDF, JPG, or PNG files up to 5 MB; passport photo up to 3 MB.</p>
              <div className="grid gap-6">
                {renderFileUpload("NRC or passport (identification document) *", "nrcOrPassport")}
                {renderFileUpload("Birth certificate *", "birthCertificate")}
                {renderFileUpload("Student results / Grade 12 certificate *", "resultsCertificate")}
                {renderFileUpload("Passport-size portrait photo *", "passportPhoto")}
              </div>
            </section>
            <section className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
              <h3 className="mb-4 text-xl font-bold text-slate-900">Declaration & permission</h3>
              <label className="flex items-start gap-3 text-sm leading-6 text-slate-700">
                <input type="checkbox" checked={formData.declarationAccuracy} onChange={(event) => updateField("declarationAccuracy", event.target.checked)} className="mt-1 accent-red-600" />
                <span>I confirm the information and documents I have provided are true and complete. I understand that the Rhema programme is a two-year programme and that the admissions team will review my application. *</span>
              </label>
              <label className="mt-4 flex items-start gap-3 text-sm leading-6 text-slate-700">
                <input type="checkbox" checked={formData.declarationRecommenders} onChange={(event) => updateField("declarationRecommenders", event.target.checked)} className="mt-1 accent-red-600" />
                <span>I give permission for Rhema Zambia to contact the people named as my recommenders about this application. I confirm that my personal recommender is not a relative. *</span>
              </label>
            </section>
          </div>
        );
      case 6:
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
                {[
                  ["Applicant", `${formData.firstName} ${formData.lastName}`],
                  ["Email", formData.email],
                  ["Phone", formData.phone],
                  ["NRC / passport", formData.nrcPassportNumber],
                  ["Year applying for", formData.yearApplyingFor],
                  ["Preferred class", formData.preferredClass],
                  ["Education", formData.secondarySchool],
                  ["Pastoral recommender", formData.pastoralRecommenderName],
                  ["Personal recommender", formData.personalReferenceName],
                  ["Emergency contact", formData.emergencyContactName],
                  ["Documents", [formData.nrcOrPassport, formData.birthCertificate, formData.resultsCertificate, formData.passportPhoto].filter(isBrowserFile).length === 4 ? "All required documents attached" : "Documents incomplete"],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl bg-white p-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</p>
                    <p className="mt-2 text-lg font-semibold text-slate-900">{value || "Not provided"}</p>
                  </div>
                ))}
              </div>
              <p className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-800">
                {applicationFeeRequired
                  ? `Application fee: ${new Intl.NumberFormat("en-ZM", { style: "currency", currency: applicationFeeCurrency }).format(applicationFeeAmount)}. Pay online after submitting your application.`
                  : "There is no application fee."}
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
          <p className="text-xs font-semibold text-slate-500"><Link href="/" className="hover:text-blue-800">Home</Link><span className="mx-2">/</span><Link href="/apply" className="hover:text-blue-800">Admissions</Link><span className="mx-2">/</span>{formData.yearApplyingFor ? `${formData.yearApplyingFor} Application` : "Application"}</p>
          <p className="mt-5 text-[11px] font-black uppercase tracking-[0.2em] text-blue-800">
            Admissions{applicationYears.length ? ` · ${applicationYears.join(", ")}` : ""}
          </p>
          <h1 className="mt-2 max-w-3xl text-3xl font-black leading-tight tracking-tight text-[#10283a] sm:text-5xl">Begin your Rhema Zambia application.</h1>
          <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-slate-700">Complete the application in a guided form. You can save your progress on this device and return to it later.</p>

          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <h2 className="text-lg font-black text-[#10283a]">Before you begin</h2>
            <ul className="mt-3 grid gap-2 text-sm leading-6 text-slate-600 sm:grid-cols-2">
              <li>Prepare a certified NRC or passport copy.</li>
              <li>Prepare your birth certificate.</li>
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
            <div
              className="group relative mt-6 inline-flex"
              tabIndex={!enrollmentOpen ? 0 : undefined}
              aria-describedby={!enrollmentOpen && enrollmentStatusLoaded ? "enrollment-closed-message" : undefined}
            >
              <button
                ref={openFormButtonRef}
                type="button"
                disabled={!enrollmentStatusLoaded || !enrollmentOpen}
                onClick={() => {
                  if (savedDraftAvailable) restoreDraft();
                  setStatus({ type: "", title: "", message: "" });
                  setIsFormOpen(true);
                }}
                className="inline-flex items-center gap-2 rounded-full bg-rhema-red px-6 py-3 text-sm font-bold text-white transition hover:bg-rhema-red-dark disabled:cursor-not-allowed disabled:bg-slate-400 disabled:hover:bg-slate-400"
              >
                {savedDraftAvailable ? "Continue application" : "Start application"}
                <ArrowRight size={16} />
              </button>
              {!enrollmentOpen && enrollmentStatusLoaded ? (
                <span
                  id="enrollment-closed-message"
                  role="status"
                  className="pointer-events-none absolute bottom-full left-0 z-10 mb-3 w-72 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold leading-5 text-white opacity-0 shadow-xl transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
                >
                  No enrollment open at the moment, please check back after some time.
                </span>
              ) : null}
            </div>
            {enrollmentStatusError ? (
              <p className="mt-3 text-sm font-semibold text-red-700" role="alert">Enrollment status could not be checked. Please refresh the page or contact admissions.</p>
            ) : null}
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
                      {application ? "Application submitted" : "Student Application"}
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
                        ? "A private application-tracking link has been sent to your email address."
                        : "We could not email your private tracking link. Use the secure tracking link below or contact admissions."}
                    </p>
                    {status.message ? (
                      <div className="mt-4">
                        <CustomAlert type={status.type} title={status.title} message={status.message} onClose={() => setStatus({ type: "", title: "", message: "" })} />
                      </div>
                    ) : null}
                    {application.feeRequired && (
                      <p className="mt-4 text-sm font-bold text-emerald-950">
                        Application fee: {new Intl.NumberFormat("en-ZM", { style: "currency", currency: application.currency }).format(application.feeAmount)}
                        {" · "}{application.paymentStatus === "Paid" ? "Paid" : "Payment due"}
                      </p>
                    )}
                    {!application.feeRequired && <p className="mt-4 text-xs text-emerald-900">No application fee.</p>}
                    <p className="mt-2 text-xs text-emerald-900">Keep your private tracking link secure; anyone with the link can view this application&apos;s status.</p>
                    {application.trackingUrl && (
                      <a
                        href={application.trackingUrl}
                        className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-blue-800 underline underline-offset-2 hover:text-blue-950"
                      >
                        View application progress and payment
                      </a>
                    )}
                    <p className="mt-3 text-xs text-emerald-900">
                      Email updates: pastor {application.recommendationEmailsSent.pastoral ? "sent" : "not sent"} · personal recommender {application.recommendationEmailsSent.personal ? "sent" : "not sent"} · next of kin {application.nextOfKinEmailSent ? "sent" : "not sent"}
                    </p>
                    {application.feeRequired && application.paymentStatus !== "Paid" && (
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => void startApplicationFeePayment(application.id, application.statusToken)}
                        className="mt-5 inline-flex items-center gap-2 rounded-full bg-emerald-800 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-900 disabled:cursor-wait disabled:opacity-60"
                      >
                        {isSubmitting ? "Processing payment…" : "Pay application fee"}
                      </button>
                    )}
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
