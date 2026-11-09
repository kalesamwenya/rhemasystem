"use client";

import { FormEvent, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Building2, CheckCircle2, ClipboardCheck, Handshake, LoaderCircle, Send, UserRound } from "lucide-react";
import { api } from "@/lib/api";

type FormState = {
  org_name: string;
  rep_name: string;
  email: string;
  phone: string;
  partner_type: string;
  area: string;
  support_type: string;
  service_departments: string[];
  other_department: string;
  details: string;
  website: string;
};

const initialForm: FormState = {
  org_name: "",
  rep_name: "",
  email: "",
  phone: "",
  partner_type: "",
  area: "",
  support_type: "",
  service_departments: [],
  other_department: "",
  details: "",
  website: "",
};

const steps = [
  { title: "Organization", description: "Who is applying?", icon: Building2 },
  { title: "Contact", description: "How can we reach you?", icon: UserRound },
  { title: "Collaboration", description: "What would you like to do?", icon: Handshake },
  { title: "Review", description: "Check your application", icon: ClipboardCheck },
];

const inputClass = "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

export default function PartnershipApplicationWizard() {
  const [form, setForm] = useState(initialForm);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [receiptEmailSent, setReceiptEmailSent] = useState<boolean | null>(null);
  const stepContentRef = useRef<HTMLDivElement>(null);

  const update = (field: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const toggleDepartment = (department: string) => {
    setForm((current) => ({
      ...current,
      service_departments: current.service_departments.includes(department)
        ? current.service_departments.filter((item) => item !== department)
        : [...current.service_departments, department],
    }));
  };

  const goToStep = (nextStep: number) => {
    setError("");
    setStep(nextStep);
  };

  const next = () => {
    const fields = stepContentRef.current?.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("input, select, textarea");
    if (fields) {
      for (const field of fields) {
        if (field.type === "hidden" || field.disabled) continue;
        if (!field.reportValidity()) return;
      }
    }
    if (step === 2 && ["service", "both"].includes(form.support_type)
      && form.service_departments.length === 0) {
      setError("Choose at least one department you can help serve.");
      return;
    }
    if (step === 2 && form.service_departments.includes("Other") && !form.other_department.trim()) {
      setError("Please specify the other department you can help serve.");
      return;
    }
    goToStep(Math.min(step + 1, steps.length - 1));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const result = await api.partnerships.submitApplication(form);
      setReceiptEmailSent(result?.email_sent === true);
      setSubmitted(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to submit your partnership application.");
    } finally {
      setSubmitting(false);
    }
  };

  const startAnother = () => {
    setForm(initialForm);
    setStep(0);
    setSubmitted(false);
    setReceiptEmailSent(null);
    setError("");
  };

  return (
    <section id="partnership-application" className="scroll-mt-28 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
      {submitted ? (
        <div className="mx-auto max-w-2xl py-8 text-center">
          <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" />
          <p className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-emerald-700">Application received</p>
          <h3 className="mt-2 text-2xl font-black text-[#10283a] sm:text-3xl">Thank you for reaching out.</h3>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Your application has been received and will be reviewed by the Rhema Zambia team.
            {receiptEmailSent
              ? " A confirmation email is on its way. If your application is approved, you will receive a separate email with a secure, one-time link to create your partner account password."
              : " We could not send a confirmation email, but this will not affect the review. If your application is approved, we will contact you with a secure, one-time link to create your partner account password."}
          </p>
          <button type="button" onClick={startAnother} className="mt-6 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50">Submit another application</button>
        </div>
      ) : (
        <>
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-800">Partner application</p>
            <h3 className="mt-2 text-2xl font-black tracking-tight text-[#10283a] sm:text-3xl">Let’s explore working together.</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">Complete four short steps. Your application will be reviewed by the Rhema Zambia team.</p>
          </div>

          <ol aria-label="Application progress" className="mx-auto mt-7 grid max-w-4xl grid-cols-4 gap-2 sm:gap-4">
            {steps.map(({ title, description, icon: Icon }, index) => {
              const isCurrent = index === step;
              const isComplete = index < step;
              return (
                <li key={title}>
                  <button
                    type="button"
                    onClick={() => index < step && goToStep(index)}
                    disabled={index > step}
                    aria-current={isCurrent ? "step" : undefined}
                    className={`flex h-full w-full flex-col items-center gap-1 rounded-xl px-1 py-2 text-center transition sm:flex-row sm:gap-3 sm:px-3 sm:text-left ${
                      isCurrent ? "bg-blue-50 text-blue-900 ring-1 ring-blue-200" : isComplete ? "text-emerald-800 hover:bg-emerald-50" : "text-slate-400"
                    }`}
                  >
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isCurrent ? "bg-blue-800 text-white" : isComplete ? "bg-emerald-100 text-emerald-800" : "bg-slate-100"}`}>
                      {isComplete ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                    </span>
                    <span>
                      <span className="block text-[10px] font-black sm:text-xs">{title}</span>
                      <span className="hidden text-[10px] text-slate-500 sm:block">{description}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>

          <form onSubmit={submit} className="mx-auto mt-6 max-w-4xl">
            <div ref={stepContentRef} className="min-h-[255px] rounded-2xl bg-slate-50 p-4 sm:min-h-[270px] sm:p-6">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-800">Step {step + 1} of {steps.length}</p>
              <h4 className="mt-1 text-xl font-black text-[#10283a]">{steps[step].title}</h4>

              {step === 0 ? (
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <label className="text-xs font-bold text-slate-700">Organization name *
                    <input required maxLength={255} autoComplete="organization" value={form.org_name} onChange={(event) => update("org_name", event.target.value)} className={inputClass} />
                  </label>
                  <label className="text-xs font-bold text-slate-700">Organization type *
                    <select required value={form.partner_type} onChange={(event) => update("partner_type", event.target.value)} className={inputClass}>
                      <option value="">Select organization type</option>
                      <option>Educational institution</option>
                      <option>Government or statutory body</option>
                      <option>Church or ministry</option>
                      <option>Non-profit or community organization</option>
                      <option>Business or corporate sponsor</option>
                      <option>Other</option>
                    </select>
                  </label>
                </div>
              ) : null}

              {step === 1 ? (
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <label className="text-xs font-bold text-slate-700">Contact person *
                    <input required maxLength={160} autoComplete="name" value={form.rep_name} onChange={(event) => update("rep_name", event.target.value)} className={inputClass} />
                  </label>
                  <label className="text-xs font-bold text-slate-700">Email address *
                    <input required type="email" maxLength={254} autoComplete="email" value={form.email} onChange={(event) => update("email", event.target.value)} className={inputClass} />
                  </label>
                  <label className="text-xs font-bold text-slate-700 sm:col-span-2">Phone number <span className="font-normal text-slate-500">(optional)</span>
                    <input type="tel" maxLength={80} autoComplete="tel" value={form.phone} onChange={(event) => update("phone", event.target.value)} className={inputClass} />
                  </label>
                </div>
              ) : null}

              {step === 2 ? (
                <div className="mt-5 space-y-4">
                          <label className="block text-xs font-bold text-slate-700">How would you like to support Rhema? *
                            <select required value={form.support_type} onChange={(event) => update("support_type", event.target.value)} className={inputClass}>
                              <option value="">Select a way to collaborate</option>
                              <option value="financial">Financial or material support</option>
                              <option value="service">Offer skills or serve a department</option>
                              <option value="both">Both financial support and service</option>
                            </select>
                          </label>
                          {["service", "both"].includes(form.support_type) ? (
                            <fieldset className="rounded-xl border border-slate-200 bg-white p-4">
                              <legend className="px-1 text-xs font-bold text-slate-700">Which department(s) can you help serve? *</legend>
                              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                                {["Academics", "Admissions", "Student Affairs", "Finance", "Chapel & Ministry", "Library", "Facilities", "Administration", "Information Technology", "Other"].map((department) => (
                                  <label key={department} className="flex items-center gap-2 text-sm text-slate-700">
                                    <input type="checkbox" checked={form.service_departments.includes(department)} onChange={() => toggleDepartment(department)} className="h-4 w-4 rounded border-slate-300 text-blue-800 focus:ring-blue-700" />
                                    {department}
                                  </label>
                                ))}
                              </div>
                              {form.service_departments.includes("Other") ? (
                                <label className="mt-3 block text-xs font-bold text-slate-700">Specify other department *
                                  <input required maxLength={160} value={form.other_department} onChange={(event) => update("other_department", event.target.value)} className={inputClass} />
                                </label>
                              ) : null}
                            </fieldset>
                          ) : null}
                          <label className="block text-xs font-bold text-slate-700">Area of collaboration *
                            <input required maxLength={160} value={form.area} onChange={(event) => update("area", event.target.value)} placeholder="Education, training, community support…" className={inputClass} />
                          </label>
                  <label className="block text-xs font-bold text-slate-700">Tell us about your proposal *
                    <textarea required maxLength={5000} rows={5} value={form.details} onChange={(event) => update("details", event.target.value)} placeholder="What would you like to do together? Include any goals, resources, or expected outcomes." className={`${inputClass} resize-y leading-6`} />
                  </label>
                </div>
              ) : null}

              {step === 3 ? (
                <dl className="mt-5 grid gap-x-6 gap-y-4 sm:grid-cols-2">
                  <div><dt className="text-[10px] font-black uppercase tracking-wider text-slate-500">Organization</dt><dd className="mt-1 break-words text-sm font-bold text-slate-900">{form.org_name}</dd></div>
                  <div><dt className="text-[10px] font-black uppercase tracking-wider text-slate-500">Organization type</dt><dd className="mt-1 text-sm font-bold text-slate-900">{form.partner_type}</dd></div>
                  <div><dt className="text-[10px] font-black uppercase tracking-wider text-slate-500">Contact person</dt><dd className="mt-1 text-sm font-bold text-slate-900">{form.rep_name}</dd></div>
                  <div><dt className="text-[10px] font-black uppercase tracking-wider text-slate-500">Email and phone</dt><dd className="mt-1 break-words text-sm font-bold text-slate-900">{form.email}{form.phone ? ` · ${form.phone}` : ""}</dd></div>
                  <div className="sm:col-span-2"><dt className="text-[10px] font-black uppercase tracking-wider text-slate-500">How you would like to help</dt><dd className="mt-1 text-sm font-bold capitalize text-slate-900">{form.support_type === "both" ? "Financial/material support and service" : form.support_type === "service" ? "Skills or service" : "Financial or material support"}</dd></div>
                  {form.service_departments.length ? <div className="sm:col-span-2"><dt className="text-[10px] font-black uppercase tracking-wider text-slate-500">Departments</dt><dd className="mt-1 text-sm font-bold text-slate-900">{form.service_departments.map((department) => department === "Other" ? form.other_department : department).join(", ")}</dd></div> : null}
                  <div className="sm:col-span-2"><dt className="text-[10px] font-black uppercase tracking-wider text-slate-500">Collaboration area</dt><dd className="mt-1 text-sm font-bold text-slate-900">{form.area}</dd></div>
                  <div className="sm:col-span-2"><dt className="text-[10px] font-black uppercase tracking-wider text-slate-500">Proposal</dt><dd className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">{form.details}</dd></div>
                  <p className="text-xs leading-5 text-slate-500 sm:col-span-2">By submitting, you agree that Rhema Zambia may contact you about this proposal. Submission does not guarantee partnership approval.</p>
                </dl>
              ) : null}

              <label className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
                Website
                <input tabIndex={-1} autoComplete="off" value={form.website} onChange={(event) => update("website", event.target.value)} />
              </label>
            </div>

            {error ? <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p> : null}
            <div className="mt-5 flex flex-col-reverse justify-between gap-3 sm:flex-row">
              <button type="button" onClick={() => step === 0 ? window.location.assign("/community#partnerships") : goToStep(step - 1)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50">
                <ArrowLeft className="h-4 w-4" /> {step === 0 ? "Back to community" : "Back"}
              </button>
              {step < steps.length - 1 ? (
                <button type="button" onClick={next} className="inline-flex items-center justify-center gap-2 rounded-xl bg-rhema-red px-5 py-3 text-sm font-black text-white transition hover:bg-rhema-red-dark">
                  Continue <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button type="submit" disabled={submitting} className="inline-flex items-center justify-center gap-2 rounded-xl bg-rhema-red px-5 py-3 text-sm font-black text-white transition hover:bg-rhema-red-dark disabled:cursor-not-allowed disabled:opacity-60">
                  {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {submitting ? "Submitting…" : "Submit application"}
                </button>
              )}
            </div>
          </form>
        </>
      )}
    </section>
  );
}
