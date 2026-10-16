"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  ShieldCheck,
  Upload,
  UserRound,
  Users,
  CreditCard,
  Mail,
  MessageCircle,
  Smartphone,
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
  submittedAt: string;
  status: "Submitted" | "Recommendations pending" | "Payment pending" | "Under review" | "Interview scheduled" | "Approved";
  paymentStatus: "Pending" | "Paid";
  recommendations: { pastoral: "Pending" | "Sent" | "Failed" | "Submitted"; personal: "Pending" | "Sent" | "Failed" | "Submitted" };
  recommendationTokens?: { pastoral: string; personal: string };
  recommendationChannels?: { pastoral: string | null; personal: string | null };
  data: FormDataState;
};

const applicationsStorageKey = "rhema_admission_applications";

export default function ApplicationPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<FormDataState>(initialState);
  const [status, setStatus] = useState<AlertStatus>({ type: "", title: "", message: "" });
  const [application, setApplication] = useState<ApplicationRecord | null>(() => {
    if (typeof window === "undefined") return null;
    const saved = window.localStorage.getItem(applicationsStorageKey);
    if (!saved) return null;
    const records = JSON.parse(saved) as ApplicationRecord[];
    return records[records.length - 1] ?? null;
  });
  const currentStepMeta = steps[currentStep];

  const progress = useMemo(() => ((currentStep + 1) / steps.length) * 100, [currentStep]);

  const persistApplication = useCallback((updated: ApplicationRecord) => {
    const records = JSON.parse(window.localStorage.getItem(applicationsStorageKey) || "[]") as ApplicationRecord[];
    window.localStorage.setItem(applicationsStorageKey, JSON.stringify(records.map((item) => item.id === updated.id ? updated : item)));
    setApplication(updated);
  }, []);

  useEffect(() => {
    const tokens = application?.recommendationTokens;
    if (!application || !tokens?.pastoral || !tokens.personal) return;
    let active = true;
    const refresh = async () => {
      try {
        const [pastoral, personal] = await Promise.all([
          api.admissions.get(tokens.pastoral) as Promise<{ data?: { status?: string; channel?: string | null } }>,
          api.admissions.get(tokens.personal) as Promise<{ data?: { status?: string; channel?: string | null } }>,
        ]);
        if (!active) return;
        const next = {
          ...application,
          recommendations: {
            pastoral: pastoral.data?.status === "submitted" ? "Submitted" as const : pastoral.data?.status === "sent" ? "Sent" as const : pastoral.data?.status === "failed" ? "Failed" as const : application.recommendations.pastoral,
            personal: personal.data?.status === "submitted" ? "Submitted" as const : personal.data?.status === "sent" ? "Sent" as const : personal.data?.status === "failed" ? "Failed" as const : application.recommendations.personal,
          },
          recommendationChannels: {
            pastoral: pastoral.data?.channel ?? application.recommendationChannels?.pastoral ?? null,
            personal: personal.data?.channel ?? application.recommendationChannels?.personal ?? null,
          },
        };
        if (JSON.stringify(next.recommendations) !== JSON.stringify(application.recommendations)
          || JSON.stringify(next.recommendationChannels) !== JSON.stringify(application.recommendationChannels)) persistApplication(next);
      } catch {
        if (active) setStatus({
          type: "error",
          title: "Recommendation status not refreshed",
          message: "Your application is still saved, but referee progress could not be refreshed. Check your connection and try again.",
        });
      }
    };
    void refresh();
    const timer = window.setInterval(() => { void refresh(); }, 30000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [application, persistApplication]);

  const updateField = <K extends keyof FormDataState>(field: K, value: FormDataState[K]) => {
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

    if ((!formData.recommendationPastoralEmail && !formData.recommendationPastoralPhone)
      || (!formData.personalReferenceEmail && !formData.personalReferencePhone)) {
      setStatus({
        type: "error",
        title: "Recommender contact required",
        message: "Enter an email address or phone number for both recommenders so their recommendation invitations can be delivered.",
      });
      return;
    }

    let responseData: { id?: string; recommendation_tokens?: { pastoral?: string; personal?: string } } = {};
    try {
      const response = await api.admissions.save({ application_data: formData, status: "Recommendations pending" }) as { data?: typeof responseData };
      responseData = response.data ?? {};
      if (!responseData.id || !responseData.recommendation_tokens?.pastoral || !responseData.recommendation_tokens.personal) {
        throw new Error("The admissions service did not return recommendation invitations. Please contact admissions before retrying.");
      }
    } catch (cause) {
      setStatus({
        type: "error",
        title: "Application could not be submitted",
        message: cause instanceof Error ? cause.message : "The admissions service could not save your application. Please try again.",
      });
      return;
    }
    const nextApplication: ApplicationRecord = {
      id: responseData.id!,
      submittedAt: new Date().toISOString(),
      status: "Recommendations pending",
      paymentStatus: "Pending",
      recommendations: { pastoral: "Pending", personal: "Pending" },
      recommendationTokens: {
        pastoral: responseData.recommendation_tokens!.pastoral!,
        personal: responseData.recommendation_tokens!.personal!,
      },
      recommendationChannels: { pastoral: null, personal: null },
      data: formData,
    };
    const existing = JSON.parse(window.localStorage.getItem(applicationsStorageKey) || "[]") as ApplicationRecord[];
    window.localStorage.setItem(applicationsStorageKey, JSON.stringify([...existing, nextApplication]));
    setApplication(nextApplication);
    setStatus({
      type: "success",
      title: "Application submitted",
      message: `Application ${nextApplication.id} is now in the admissions queue. Send both recommendation invitations below to continue.`,
    });
  };

  const sendRecommendationInvite = async (kind: "pastoral" | "personal", channel: "email" | "whatsapp" | "sms") => {
    const token = application?.recommendationTokens?.[kind];
    if (!application || !token) {
      setStatus({ type: "error", title: "Invitation unavailable", message: "This saved application has no secure recommendation link. Please submit the application again or contact admissions." });
      return;
    }
    try {
      const response = await api.admissions.dispatchRecommendationInvite({ token, channel }) as { success?: boolean; message?: string; data?: { status?: string; channel?: string } };
      if (!response.success) throw new Error(response.message || "The recommendation invitation could not be prepared.");
      const updated = {
        ...application,
        recommendations: {
          ...application.recommendations,
          [kind]: response.data?.status === "sent" ? "Sent" as const : application.recommendations[kind],
        },
        recommendationChannels: {
          pastoral: kind === "pastoral" ? channel : application.recommendationChannels?.pastoral ?? null,
          personal: kind === "personal" ? channel : application.recommendationChannels?.personal ?? null,
        },
      };
      persistApplication(updated);
      setStatus({
        type: "success",
        title: channel === "email" ? "Invitation email sent" : "Invitation link prepared",
        message: response.message || "The recommendation invitation was updated.",
      });
    } catch (cause) {
      setStatus({ type: "error", title: "Invitation not sent", message: cause instanceof Error ? cause.message : "The recommendation invitation could not be sent." });
    }
  };

  const openMessageDraft = (kind: "pastoral" | "personal", channel: "whatsapp" | "sms") => {
    const token = application?.recommendationTokens?.[kind];
    if (!application || !token) return;
    const referenceData = application.data;
    const phone = kind === "pastoral" ? referenceData.recommendationPastoralPhone : referenceData.personalReferencePhone;
    const link = `${window.location.origin}/recommendation?token=${encodeURIComponent(token)}`;
    const text = `Hello, please complete this secure ${kind} recommendation for ${referenceData.studentName}: ${link}`;
    const phoneNumber = typeof phone === "string" ? phone : "";
    const destination = channel === "whatsapp"
      ? `https://wa.me/${phoneNumber.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`
      : `sms:${phoneNumber}?body=${encodeURIComponent(text)}`;
    void sendRecommendationInvite(kind, channel);
    window.open(destination, "_blank", "noopener,noreferrer");
  };

  const completePayment = async () => {
    if (!application) return;
    try {
      await api.admissions.markPayment({ application_id: application.id, amount: 0, currency: "ZMW", status: "Paid" });
    } catch (cause) {
      setStatus({
        type: "error",
        title: "Payment could not be recorded",
        message: cause instanceof Error ? cause.message : "The admissions service could not record this payment.",
      });
      return;
    }
    const updated = { ...application, paymentStatus: "Paid" as const, status: "Under review" as const };
    const records = JSON.parse(window.localStorage.getItem(applicationsStorageKey) || "[]") as ApplicationRecord[];
    window.localStorage.setItem(applicationsStorageKey, JSON.stringify(records.map((item) => item.id === updated.id ? updated : item)));
    setApplication(updated);
    setStatus({ type: "success", title: "Payment confirmed", message: "Your application fee is recorded. Admissions can now review your application." });
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
                {renderInput("Email", "recommendationPastoralEmail", "email", "pastor@example.com")}
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
                {renderInput("Email address", "personalReferenceEmail", "email", "reference@example.com")}
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
      <section className="bg-[#f4f5f4] px-4 pb-8 pt-32 sm:px-6 sm:pb-10 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <p className="text-xs font-semibold text-slate-500"><Link href="/" className="hover:text-blue-800">Home</Link><span className="mx-2">/</span><Link href="/apply" className="hover:text-blue-800">Admissions</Link><span className="mx-2">/</span>2027 Application</p>
          <p className="mt-5 text-[11px] font-black uppercase tracking-[0.2em] text-blue-800">2027 admissions</p>
          <h1 className="mt-2 max-w-3xl text-3xl font-black leading-tight tracking-tight text-[#10283a] sm:text-5xl">Begin your Rhema Zambia application.</h1>
          <p className="mt-3 text-sm font-medium leading-6 text-slate-700">Complete the 2027 Rhema Zambia student application form below.</p>
        </div>
      </section>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-5 rounded-2xl border border-slate-200 bg-[#f4f5f4] p-5 sm:p-6">
        <h2 className="text-lg font-black text-[#10283a]">Before you begin</h2>
        <ul className="mt-3 grid gap-2 text-sm leading-6 text-slate-600 sm:grid-cols-2">
          <li>Prepare a certified NRC or passport copy.</li>
          <li>Prepare your Grade 12 certificate.</li>
          <li>Have a recent passport-size photo ready.</li>
          <li>Have your pastoral and personal referee details ready.</li>
        </ul>
      </div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/70"
      >
        {application ? (
          <div className="border-b border-emerald-200 bg-emerald-50 px-6 py-5 sm:px-8">
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">{application.id} · {application.status}</p>
                <p className="mt-1 text-sm text-emerald-950">Your application is saved. Send each recommendation invitation and track when the referee submits it.</p>
              </div>
              <div className="grid gap-3 lg:grid-cols-2">
                {(["pastoral", "personal"] as const).map((kind) => {
                  const referenceData = application.data;
                  const referee = kind === "pastoral"
                    ? { name: referenceData.recommendationPastoralName, email: referenceData.recommendationPastoralEmail, phone: referenceData.recommendationPastoralPhone }
                    : { name: referenceData.personalReferenceName, email: referenceData.personalReferenceEmail, phone: referenceData.personalReferencePhone };
                  const hasInvitation = Boolean(application.recommendationTokens?.[kind]);
                  const recommendationStatus = application.recommendations[kind];
                  const submitted = recommendationStatus === "Submitted";
                  const lastChannel = application.recommendationChannels?.[kind];
                  const statusLabel = submitted ? "Submitted"
                    : recommendationStatus === "Sent" ? "Email sent"
                      : recommendationStatus === "Failed" ? "Send failed"
                        : lastChannel && lastChannel !== "email" ? "Draft prepared" : recommendationStatus;
                  return <div key={kind} className="rounded-2xl border border-emerald-200 bg-white p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-bold capitalize text-emerald-950">{kind} recommendation · {referee.name}</p>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-black uppercase ${submitted ? "bg-emerald-100 text-emerald-800" : recommendationStatus === "Failed" ? "bg-red-100 text-red-800" : recommendationStatus === "Sent" ? "bg-sky-100 text-sky-800" : "bg-amber-100 text-amber-800"}`}>
                        {statusLabel}
                      </span>
                    </div>
                    <p className="mt-1 break-all text-xs text-slate-600">{referee.email || "No email"}{referee.phone ? ` · ${referee.phone}` : ""}</p>
                    {!submitted ? <div className="mt-3 flex flex-wrap gap-2">
                      <button type="button" disabled={!hasInvitation || !referee.email} onClick={() => void sendRecommendationInvite(kind, "email")} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">
                        <Mail size={14} /> Email invitation
                      </button>
                      <button type="button" disabled={!hasInvitation || !referee.phone} onClick={() => openMessageDraft(kind, "whatsapp")} className="inline-flex items-center gap-1.5 rounded-lg bg-[#128c7e] px-3 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">
                        <MessageCircle size={14} /> WhatsApp
                      </button>
                      <button type="button" disabled={!hasInvitation || !referee.phone} onClick={() => openMessageDraft(kind, "sms")} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">
                        <Smartphone size={14} /> SMS
                      </button>
                    </div> : null}
                    {!hasInvitation && !submitted ? <p className="mt-2 text-xs text-amber-800">No secure invitation is available for this saved application. Contact admissions for assistance.</p> : null}
                    {lastChannel && !submitted ? <p className="mt-2 text-[11px] text-slate-500">Last selected: {lastChannel}. SMS/WhatsApp must be sent from your messaging app.</p> : null}
                  </div>;
                })}
              </div>
              <div className="flex flex-wrap gap-2">
                {application.paymentStatus !== "Paid" ? (
                  <button type="button" onClick={completePayment} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white">
                    <CreditCard size={14} /> Pay application fee
                  </button>
                ) : <span className="inline-flex items-center rounded-xl bg-emerald-700 px-3 py-2 text-xs font-bold text-white">Payment successful</span>}
              </div>
            </div>
            <p className="mt-3 text-xs text-emerald-900">Fee: {application.paymentStatus}. Invitation statuses refresh automatically while this page is open.</p>
          </div>
        ) : null}
        <div className="border-b border-slate-200 bg-slate-100 px-6 py-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-800">Official application form</p>
              <h2 className="mt-2 text-2xl font-black text-slate-900 sm:text-3xl">2027 Student Application</h2>
            </div>
            <div className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-red-700">
              Step {currentStep + 1} of {steps.length}
            </div>
          </div>

          <div className="mt-6">
            <div className="mb-2 flex justify-between text-xs font-medium text-slate-500">
              <span>{currentStepMeta.label}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
              <motion.div
                className="h-full rounded-full bg-red-600"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === index;
              const isComplete = index < currentStep;

              return (
                <div
                  key={step.id}
                  className={`flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] ${
                    isActive
                      ? "border-red-200 bg-red-100 text-red-700"
                      : isComplete
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 bg-white text-slate-500"
                  }`}
                >
                  <Icon size={14} />
                  {step.label}
                </div>
              );
            })}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 sm:p-8">
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
              <CustomAlert
                type={status.type}
                title={status.title}
                message={status.message}
                onClose={() => setStatus({ type: "", title: "", message: "" })}
              />
            </div>
          ) : null}

          <div className="mt-8 flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-between">
            <button
              type="button"
              onClick={prevStep}
              disabled={currentStep === 0}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ArrowLeft size={16} />
              Previous
            </button>

            {currentStep < steps.length - 1 ? (
              <button
                type="button"
                onClick={nextStep}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-500"
              >
                Continue
                <ChevronRight size={16} />
              </button>
            ) : (
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-500"
              >
                Submit application
                <ArrowRight size={16} />
              </button>
            )}
          </div>
        </form>
      </motion.div>
      </div>
    </div>
  );
}
