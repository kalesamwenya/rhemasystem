"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Delete,
  Mail,
  MessageCircle,
  PhoneCall,
  Search,
  Send,
  Smartphone,
  Users,
  History,
} from "lucide-react";
import { api } from "@/lib/api";

type AudienceId = "students" | "applicants" | "website-contacts" | "followups";

type Channel = "sms" | "whatsapp" | "email" | "call";
type CommunicationsTab = "compose" | "activity" | "followups";

type Contact = {
  id: string;
  student_id?: string;
  name: string;
  organization: string;
  audience: AudienceId;
  email: string;
  phone: string;
  notes: string;
};

type HistoryEntry = {
  id: number;
  contact_name: string;
  channel: Channel;
  status: string;
  body: string;
};

type IncomingCall = {
  id: number;
  caller_number: string;
  status: string;
  duration_seconds?: number;
  created_at: string;
};

type AttendanceFollowup = {
  id: number;
  student_id: string;
  student_name: string;
  course_name: string;
  cohort_name: string;
  session_date: string;
  status: "open" | "scheduled" | "completed";
  followup_at: string | null;
  reason_type: "sick" | "emergency" | "other" | null;
  student_reason: string | null;
  sick_note_path: string | null;
  response_submitted_at: string | null;
};

const audienceOptions = [
  { id: "students", label: "Students" },
  { id: "applicants", label: "Applicants" },
  { id: "website-contacts", label: "Website contact messages" },
  { id: "followups", label: "Student follow-up" },
] as const;

const channels = [
  { id: "sms", label: "SMS", icon: Smartphone },
  { id: "whatsapp", label: "WhatsApp", icon: MessageCircle },
  { id: "email", label: "Email", icon: Mail },
  { id: "call", label: "Call", icon: PhoneCall },
] as const;

const dialKeys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"];

const formatInitials = (name = "") =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "N";

export default function CommunicationsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [incomingCalls] = useState<IncomingCall[]>([]);
  const [activeTab, setActiveTab] = useState<CommunicationsTab>("compose");
  const [audiencePage, setAudiencePage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadErrors, setLoadErrors] = useState<Partial<Record<AudienceId, string>>>({});
  const [loadWarnings, setLoadWarnings] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeAudience, setActiveAudience] = useState<AudienceId>("students");
  const [channel, setChannel] = useState<Channel>("sms");
  const [message, setMessage] = useState("");
  const [dialNumber, setDialNumber] = useState("");
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const [attendanceFollowups, setAttendanceFollowups] = useState<AttendanceFollowup[]>([]);
  const [followupPage, setFollowupPage] = useState(1);
  const [followupsLoading, setFollowupsLoading] = useState(false);
  const [followupError, setFollowupError] = useState("");
  const [followupSavingId, setFollowupSavingId] = useState<number | null>(null);
  const [followupDates, setFollowupDates] = useState<Record<number, string>>({});
  const followupPageSize = 5;
  const followupPageCount = Math.max(1, Math.ceil(attendanceFollowups.length / followupPageSize));
  const visibleFollowupPage = Math.min(followupPage, followupPageCount);
  const paginatedFollowups = attendanceFollowups.slice(
    (visibleFollowupPage - 1) * followupPageSize,
    visibleFollowupPage * followupPageSize,
  );

  useEffect(() => {
    const load = async () => {
      const [studentResult, applicantResult, contactResult, followupResult] = await Promise.allSettled([
        api.students.adminRoster() as Promise<{ data?: Array<{ student_id: string; name: string; class: string; email?: string; phone?: string }>; warnings?: string[] }>,
        api.admissions.list() as Promise<{ data?: Array<{ id: string; applicant_name: string; applicant_email: string; applicant_phone?: string; program?: string; student_id?: string | null }> }>,
        api.chatbot.contactMessages() as Promise<{ data?: Array<{ id: number; name: string; email: string; phone?: string; enquiry?: string; page_path?: string }> }>,
        api.students.communicationFollowups() as Promise<{ data?: Array<{ student_id: string; name: string; class: string; reasons: string[] }> }>,
      ]);
      const errors: Partial<Record<AudienceId, string>> = {};
      const errorMessage = (result: PromiseSettledResult<unknown>, fallback: string) => (
        result.status === "rejected"
          ? result.reason instanceof Error ? result.reason.message : fallback
          : ""
      );
      errors.students = errorMessage(studentResult, "Unable to load the student roster.");
      errors.applicants = errorMessage(applicantResult, "Unable to load applicants.");
      errors["website-contacts"] = errorMessage(contactResult, "Unable to load website contact messages.");
      errors.followups = errorMessage(followupResult, "Unable to load student follow-up records.");

      const students = studentResult.status === "fulfilled" ? studentResult.value.data ?? [] : [];
      const studentById = new Map(students.map((student) => [student.student_id, student]));
      const studentContacts: Contact[] = students.map((student) => ({
        id: `student:${student.student_id}`,
        student_id: student.student_id,
        name: student.name,
        organization: student.class ? `Cohort ${student.class}` : "Student",
        audience: "students",
        email: student.email || "",
        phone: student.phone || "",
        notes: "",
      }));
      const applicantContacts: Contact[] = applicantResult.status === "fulfilled"
        ? (applicantResult.value.data ?? [])
          .filter((applicant) => !applicant.student_id)
          .map((applicant) => ({
            id: `applicant:${applicant.id}`,
            name: applicant.applicant_name,
            organization: applicant.program || "Applicant",
            audience: "applicants",
            email: applicant.applicant_email || "",
            phone: applicant.applicant_phone || "",
            notes: "",
          }))
        : [];
      const contactMessages = contactResult.status === "fulfilled" ? contactResult.value.data ?? [] : [];
      const seenWebsiteContacts = new Set<string>();
      const websiteLeads = contactMessages.filter((lead) => {
        const identity = lead.email?.trim().toLowerCase() || lead.phone?.replace(/\D/g, "") || String(lead.id);
        if (seenWebsiteContacts.has(identity)) return false;
        seenWebsiteContacts.add(identity);
        return true;
      });
      const websiteContacts: Contact[] = websiteLeads.map((lead) => ({
        id: `website-contact:${lead.id}`,
        name: lead.name,
        organization: lead.page_path ? `Website · ${lead.page_path}` : "Website contact form",
        audience: "website-contacts",
        email: lead.email || "",
        phone: lead.phone || "",
        notes: lead.enquiry || "",
      }));
      const followupContacts: Contact[] = followupResult.status === "fulfilled"
        ? (followupResult.value.data ?? []).map((student) => {
          const rosterRecord = studentById.get(student.student_id);
          return {
            id: `followup:${student.student_id}`,
            student_id: student.student_id,
            name: rosterRecord?.name || student.name,
            organization: `Cohort ${rosterRecord?.class || student.class || "—"} · ${student.reasons.length} follow-up reason(s)`,
            audience: "followups",
            email: rosterRecord?.email || "",
            phone: rosterRecord?.phone || "",
            notes: student.reasons.join(" · "),
          };
        })
        : [];

      setContacts([...studentContacts, ...applicantContacts, ...websiteContacts, ...followupContacts]);
      setLoadErrors(errors);
      setLoadWarnings(studentResult.status === "fulfilled" ? studentResult.value.warnings ?? [] : []);
      setLoading(false);
    };
    void load();
  }, []);

  useEffect(() => {
    if (activeTab !== "followups") return;
    (api.attendance.followups() as Promise<{ data: AttendanceFollowup[] }>)
      .then((response) => {
        setAttendanceFollowups(response.data);
        setFollowupPage(1);
        setFollowupDates(Object.fromEntries(response.data.map((item) => [
          item.id,
          item.followup_at ? item.followup_at.slice(0, 16).replace(" ", "T") : "",
        ])));
      })
      .catch((reason: unknown) => setFollowupError(reason instanceof Error ? reason.message : "Unable to load attendance follow-ups."))
      .finally(() => setFollowupsLoading(false));
  }, [activeTab]);

  const saveAttendanceFollowup = async (item: AttendanceFollowup, status: AttendanceFollowup["status"]) => {
    setFollowupSavingId(item.id);
    setFollowupError("");
    const scheduledDate = followupDates[item.id] || "";
    try {
      await api.attendance.saveFollowup({
        id: item.id,
        status,
        followup_at: status === "scheduled" ? scheduledDate : "",
      });
      setAttendanceFollowups((current) => current.map((entry) => entry.id === item.id
        ? { ...entry, status, followup_at: status === "scheduled" ? scheduledDate.replace("T", " ") + ":00" : null }
        : entry));
      setNotice(status === "scheduled" ? `Follow-up scheduled for ${item.student_name}.` : "Follow-up case updated.");
    } catch (reason) {
      setFollowupError(reason instanceof Error ? reason.message : "Unable to update this follow-up.");
    } finally {
      setFollowupSavingId(null);
    }
  };

  const downloadSickNote = async (item: AttendanceFollowup) => {
    try {
      const blob = await api.attendance.followupSickNote(item.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `attendance-sick-note-${item.id}`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (reason) {
      setFollowupError(reason instanceof Error ? reason.message : "Unable to download the sick note.");
    }
  };

  const filtered = useMemo(() => contacts.filter((item) => {
    const searchText = `${item.name} ${item.organization} ${item.email} ${item.phone} ${item.notes}`.toLowerCase();
    return item.audience === activeAudience && searchText.includes(search.trim().toLowerCase());
  }), [activeAudience, contacts, search]);

  const selectedContacts = contacts.filter((contactItem) => selectedIds.includes(contactItem.id));
  const validEmailContacts = selectedContacts.filter((item) => item.email);
  const audiencePageSize = 6;
  const audiencePageCount = Math.max(1, Math.ceil(filtered.length / audiencePageSize));
  const visibleAudiencePage = Math.min(audiencePage, audiencePageCount);
  const paginatedContacts = filtered.slice((visibleAudiencePage - 1) * audiencePageSize, visibleAudiencePage * audiencePageSize);

  const toggleContactSelection = (id: string) => {
    const selectedContact = contacts.find((item) => item.id === id);
    if (!selectedContact || selectedContact.audience !== activeAudience) return;
    const wasSelected = selectedIds.includes(id);
    const nextSelectedIds = wasSelected
      ? selectedIds.filter((selectedId) => selectedId !== id)
      : [...selectedIds, id];
    setSelectedIds(nextSelectedIds);
    const nextDialContact = contacts.find((item) => item.id === nextSelectedIds[nextSelectedIds.length - 1]);
    setDialNumber(nextDialContact?.phone || "");
    setNotice("");
  };

  const placeCall = () => {
    const cleanNumber = dialNumber.trim();
    if (!cleanNumber) {
      setNotice("Enter a phone number before placing the call.");
      return;
    }

    const normalizedNumber = cleanNumber.replace(/[^0-9+]/g, "");
    const callRecipient = selectedContacts.find(
      (item) => item.phone.replace(/[^0-9+]/g, "") === normalizedNumber,
    );
    setHistory((current) => [
      {
        id: Date.now(),
        contact_name: callRecipient?.name || cleanNumber,
        channel: "call",
        status: "dialer opened",
        body: `Call prepared for ${cleanNumber}.`,
      },
      ...current,
    ]);
    setNotice(`Opening your phone dialer for ${cleanNumber}.`);
    window.open(`tel:${normalizedNumber}`, "_self");
  };

  const execute = () => {
    if (channel === "call") {
      placeCall();
      return;
    }

    if (!selectedContacts.length) {
      setNotice("Select at least one contact from the active group first.");
      return;
    }

    if (!message.trim() && channel !== "email") {
      setNotice(`Write a ${channel} message first.`);
      return;
    }

    const hasMultipleRecipients = selectedContacts.length > 1;
    if (channel !== "email" && hasMultipleRecipients) {
      setNotice(`Select one contact at a time to open a ${channel === "whatsapp" ? "WhatsApp" : "SMS"} draft.`);
      return;
    }
    const recipient = selectedContacts[0];
    const encodedMessage = encodeURIComponent(message.trim());
    let destination = "";
    if (channel === "email") {
      const emailAddresses = validEmailContacts.map((item) => item.email).filter(Boolean);
      if (emailAddresses.length !== selectedContacts.length) {
        setNotice("Every selected contact needs an email address before opening an email draft.");
        return;
      }
      destination = `mailto:?bcc=${encodeURIComponent(emailAddresses.join(","))}&subject=${encodeURIComponent("Message from Rhema Zambia")}&body=${encodedMessage}`;
    } else {
      const number = recipient.phone.replace(/[^\d+]/g, "");
      if (!number) {
        setNotice("The selected contact has no phone number on record.");
        return;
      }
      destination = channel === "whatsapp"
        ? `https://wa.me/${number.replace(/^\+/, "")}?text=${encodedMessage}`
        : `sms:${number}?body=${encodedMessage}`;
    }

    setHistory((current) => [{
      id: Date.now(),
      contact_name: channel === "email" ? `${validEmailContacts.length} selected contact(s)` : recipient.name,
      channel,
      status: "draft opened",
      body: message.trim() || "Email draft opened.",
    }, ...current]);
    setNotice(`Opening a ${channel.toUpperCase()} draft for ${channel === "email" ? `${validEmailContacts.length} selected contact(s)` : recipient.name}.`);
    window.open(destination, channel === "whatsapp" ? "_blank" : "_self", "noopener,noreferrer");
  };

  const pressDialKey = (key: string) => setDialNumber((current) => `${current}${key}`);
  const removeDialDigit = () => setDialNumber((current) => current.slice(0, -1));

  return (
    <main className="mx-auto w-full min-w-0 max-w-screen-2xl space-y-6 pb-8">
      <header className="flex flex-col justify-between gap-5 rounded-3xl bg-slate-950 p-8 text-white shadow-xl sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-300">Communications hub</p>
          <h1 className="mt-2 text-3xl font-black">Audience contact centre</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
            Contact students, applicants, website contacts, or students needing follow-up. Select one group at a time to keep recipients separate.
          </p>
        </div>
      </header>

      {notice && (
        <div role="status" className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm font-bold text-blue-800">
          {notice}
        </div>
      )}

      <nav className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm" aria-label="Communication workspace tabs">
        {[
          { id: "compose" as const, label: "Compose", icon: Send },
          { id: "activity" as const, label: "Activity history", icon: History },
          { id: "followups" as const, label: "Attendance follow-ups", icon: Clock3 },
        ].map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" aria-pressed={activeTab === id} onClick={() => { setActiveTab(id); if (id === "followups") { setFollowupsLoading(true); setFollowupError(""); setFollowupPage(1); } }} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black transition ${activeTab === id ? "bg-slate-950 text-white" : "text-slate-700 hover:bg-slate-100"}`}>
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </nav>

      <div className={`grid min-w-0 grid-cols-1 gap-4 xl:gap-6 lg:grid-cols-[minmax(17rem,0.85fr)_minmax(0,1.15fr)] ${activeTab === "compose" ? "" : "hidden"}`}>
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="inline-flex items-center gap-2 text-lg font-black text-slate-900"><Users className="h-5 w-5 text-red-600" /> Audience groups</h2>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-slate-600">One group at a time</span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            {audienceOptions.map((item) => {
              const active = activeAudience === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    if (activeAudience === item.id) return;
                    setActiveAudience(item.id);
                    setSelectedIds([]);
                    setDialNumber("");
                    setMessage("");
                    setAudiencePage(1);
                    setNotice("");
                  }}
                  className={`flex items-center justify-between rounded-2xl border px-3 py-2.5 text-sm font-bold transition ${
                    active ? "border-slate-900 bg-slate-950 text-white" : "border-slate-200 bg-slate-50 text-slate-700 hover:border-red-200 hover:bg-red-50"
                  }`}
                >
                  <span>{item.label}</span>
                  {active && <Check className="h-4 w-4" />}
                </button>
              );
            })}
          </div>

          <div className="relative mt-5">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search recipients"
              className="w-full rounded-xl bg-slate-50 py-3 pl-9 pr-3 text-sm outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-red-500"
            />
          </div>

          {loadErrors[activeAudience] && <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{loadErrors[activeAudience]}</div>}
          {activeAudience === "students" && loadWarnings.map((warning) => <div key={warning} role="status" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{warning}</div>)}
          <div className="mt-5 space-y-2">
            {loading ? <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">Loading {audienceOptions.find((item) => item.id === activeAudience)?.label.toLowerCase()}...</div> : filtered.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                {loadErrors[activeAudience] ? "The contact list could not be loaded." : "No contacts match this group and search."}
              </div>
            ) : (
              paginatedContacts.map((item) => {
                const selected = selectedIds.includes(item.id);
                return (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => toggleContactSelection(item.id)}
                    className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left transition ${
                      selected ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-800 hover:bg-red-50"
                    }`}
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-xs font-black text-red-700">
                      {formatInitials(item.name)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <strong className="block truncate">{item.name}</strong>
                      <small className="block truncate text-xs opacity-75">{item.organization || "No organisation"}</small>
                      {activeAudience === "followups" && <small className="block truncate text-xs opacity-75">{item.notes}</small>}
                    </span>
                    <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] font-black uppercase tracking-wide">{audienceOptions.find((group) => group.id === item.audience)?.label}</span>
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                        selected ? "border-emerald-300 bg-emerald-500 text-white" : "border-slate-300 text-transparent"
                      }`}
                      aria-label={selected ? "Selected" : "Not selected"}
                    >
                      <Check className="h-4 w-4" />
                    </span>
                  </button>
                );
              })
            )}
          </div>
          {!loading && filtered.length > 0 && <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3"><span className="text-[11px] font-semibold text-slate-400">{(visibleAudiencePage - 1) * audiencePageSize + 1}-{Math.min(visibleAudiencePage * audiencePageSize, filtered.length)} of {filtered.length}</span><div className="flex items-center gap-2"><button type="button" disabled={visibleAudiencePage === 1} onClick={() => setAudiencePage((page) => Math.max(1, page - 1))} className="rounded-lg border border-slate-200 p-1.5 text-slate-600 disabled:opacity-40" aria-label="Previous audience page"><ChevronLeft className="h-3.5 w-3.5" /></button><span className="text-[11px] font-bold text-slate-500">{visibleAudiencePage}/{audiencePageCount}</span><button type="button" disabled={visibleAudiencePage === audiencePageCount} onClick={() => setAudiencePage((page) => Math.min(audiencePageCount, page + 1))} className="rounded-lg border border-slate-200 p-1.5 text-slate-600 disabled:opacity-40" aria-label="Next audience page"><ChevronRight className="h-3.5 w-3.5" /></button></div></div>}
        </section>

        <section className="min-w-0 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">Message composer</p>
              <h2 className="mt-1 text-2xl font-black text-slate-900">Send formal communication</h2>
            </div>
            <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-emerald-700">
              {selectedIds.length} selected
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            {channels.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setChannel(id)}
                className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold transition ${
                  channel === id ? "border-slate-900 bg-slate-950 text-white" : "border-slate-200 bg-slate-50 text-slate-700 hover:border-red-200 hover:bg-red-50"
                }`}
              >
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">Recipients</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {selectedContacts.length ? (
                selectedContacts.map((item) => (
                  <span key={item.id} className="flex flex-col rounded-xl border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-700">
                    {item.name}
                    <span className="font-normal text-slate-500">
                      {channel === "email" ? item.email || "No email on record" : item.phone || "No phone number on record"}
                    </span>
                    {activeAudience === "followups" && <span className="mt-1 max-w-64 text-left font-normal text-slate-500">{item.notes}</span>}
                  </span>
                ))
              ) : (
                <span className="text-sm text-slate-500">No recipients selected yet.</span>
              )}
            </div>
          </div>

          {channel === "call" ? (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <label className="block text-sm font-bold text-slate-700">
                Number to call
                <input
                  value={dialNumber}
                  onChange={(event) => setDialNumber(event.target.value.replace(/[^0-9+*#() .-]/g, ""))}
                  inputMode="tel"
                  placeholder="+233 20 000 0000"
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-center text-xl font-black tracking-[0.08em] text-slate-900 outline-none focus:border-red-500"
                />
              </label>

              <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                {dialKeys.map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => pressDialKey(key)}
                    aria-label={`Dial ${key}`}
                    className="h-10 rounded-xl border border-slate-200 bg-white text-lg font-black text-slate-800 shadow-sm hover:border-red-400 hover:bg-red-50"
                  >
                    {key}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setDialNumber("")}
                  aria-label="Clear phone number"
                  className="flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:border-red-300 hover:bg-red-50"
                >
                  <Delete className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => pressDialKey("+")}
                  aria-label="Add plus sign"
                  className="h-10 rounded-xl border border-slate-200 bg-white text-lg font-black text-slate-800 hover:border-red-400 hover:bg-red-50"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={removeDialDigit}
                  aria-label="Delete last digit"
                  className="flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:border-red-400 hover:bg-red-50"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
              </div>

              <p className="mt-3 text-xs text-slate-500">Selecting a contact fills this number from their record when available.</p>
            </div>
          ) : channel === "email" ? (
            <label className="mt-5 block text-sm font-bold text-slate-700">
              Email content
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={8}
                placeholder="Subject: Update from Godfrey Academy\n\nDear [Name],\n\nWe are sharing an important update..."
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700 outline-none transition focus:border-red-500 focus:bg-white"
              />
            </label>
          ) : (
            <label className="mt-5 block text-sm font-bold text-slate-700">
              Message
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={8}
                placeholder="Dear [Name],\n\nWe are sharing an important update..."
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700 outline-none transition focus:border-red-500 focus:bg-white"
              />
            </label>
          )}

          <div className="mt-6 flex items-center justify-between gap-4 border-t border-slate-200 pt-5">
            <div className="text-sm text-slate-500">
              <Clock3 className="mr-1 inline h-4 w-4" />
              {channel === "call" ? "Use the keypad or enter a number to open your phone dialer." : channel === "whatsapp" || channel === "sms" ? "Choose one contact to open a pre-addressed message draft." : "Email drafts are addressed only to selected contacts in this group."}
            </div>
            <button
              type="button"
              onClick={execute}
              className="inline-flex items-center gap-2 rounded-2xl bg-red-600 px-5 py-3 text-sm font-black text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {channel === "call" ? <PhoneCall className="h-4 w-4" /> : <Send className="h-4 w-4" />} {channel === "call" ? "Open phone dialer" : channel === "email" ? "Open email draft" : channel === "whatsapp" ? "Open WhatsApp draft" : "Open SMS draft"}
            </button>
          </div>
        </section>
      </div>

      <section className={`${activeTab === "activity" ? "" : "hidden"} rounded-3xl border border-slate-200 bg-white p-5 shadow-sm`}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-black text-slate-900">Recent communication history</h2>
          <span className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">{history.length} items</span>
        </div>

        <div className="mt-4 space-y-3">
          {history.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">No communication has been logged yet.</div>
          ) : (
            history.slice(0, 8).map((item) => (
              <div key={item.id} className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm font-black text-slate-900">{item.contact_name || "Unknown recipient"}</div>
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{item.channel} • {item.status}</div>
                </div>
                <div className="text-sm text-slate-600">{item.body ? item.body.slice(0, 80) : "No message"}</div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className={`${activeTab === "activity" ? "" : "hidden"} rounded-3xl border border-slate-200 bg-white p-5 shadow-sm`}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-black text-slate-900">Incoming calls</h2>
          <span className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">{incomingCalls.length} calls</span>
        </div>
        <div className="mt-4 space-y-3">
          {incomingCalls.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">No incoming calls have been received yet.</div>
          ) : (
            incomingCalls.slice(0, 8).map((call) => (
              <div key={call.id} className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm font-black text-slate-900">{call.caller_number}</div>
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{call.status} • {call.created_at}</div>
                </div>
                <div className="text-sm text-slate-600">{call.duration_seconds ? `${call.duration_seconds}s` : "Duration unavailable"}</div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className={`${activeTab === "followups" ? "" : "hidden"} space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm`}>
        <div>
          <h2 className="text-lg font-black text-slate-900">Missed-session follow-ups</h2>
          <p className="mt-1 text-sm text-slate-600">Review absence explanations and sick notes, then schedule a communications follow-up or close the case.</p>
        </div>
        {followupError && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{followupError}</div>}
        {followupsLoading ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">Loading attendance follow-ups…</div>
        ) : attendanceFollowups.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">There are no missed-session follow-ups to review.</div>
        ) : (
          <div className="space-y-3">
            {paginatedFollowups.map((item) => (
              <article key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-slate-900">{item.student_name} <span className="font-normal text-slate-500">({item.student_id})</span></h3>
                    <p className="mt-1 text-sm text-slate-600">{item.course_name} · Cohort {item.cohort_name} · Missed {new Date(`${item.session_date}T12:00:00`).toLocaleDateString()}</p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Status: {item.status.replace("_", " ")}</p>
                  </div>
                  {item.sick_note_path && <button type="button" onClick={() => void downloadSickNote(item)} className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-bold text-blue-800 hover:bg-blue-50">Download sick note</button>}
                </div>
                {item.student_reason ? (
                  <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
                    <p className="text-[10px] font-black uppercase tracking-wide text-amber-800">Student explanation · {item.reason_type || "reason provided"}</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-amber-950">{item.student_reason}</p>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-slate-500">The student has not submitted an explanation.</p>
                )}
                {item.status !== "completed" && (
                  <div className="mt-4 flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-end">
                    <label className="flex-1 text-xs font-bold text-slate-600">
                      Follow-up date and time
                      <input type="datetime-local" value={followupDates[item.id] || ""} onChange={(event) => setFollowupDates((current) => ({ ...current, [item.id]: event.target.value }))} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800" />
                    </label>
                    <button type="button" disabled={followupSavingId === item.id} onClick={() => void saveAttendanceFollowup(item, "scheduled")} className="rounded-lg bg-blue-900 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">
                      {followupSavingId === item.id ? "Saving…" : item.status === "scheduled" ? "Update schedule" : "Schedule follow-up"}
                    </button>
                    <button type="button" disabled={followupSavingId === item.id} onClick={() => void saveAttendanceFollowup(item, "completed")} className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 disabled:opacity-50">Close case</button>
                  </div>
                )}
                {item.followup_at && <p className="mt-2 text-xs text-blue-800">Scheduled: {new Date(item.followup_at.replace(" ", "T")).toLocaleString()}</p>}
              </article>
            ))}
            {attendanceFollowups.length > followupPageSize && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
                <span className="text-xs font-semibold text-slate-500">
                  Showing {(visibleFollowupPage - 1) * followupPageSize + 1}–{Math.min(visibleFollowupPage * followupPageSize, attendanceFollowups.length)} of {attendanceFollowups.length} follow-ups
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={visibleFollowupPage === 1}
                    onClick={() => setFollowupPage((page) => Math.max(1, page - 1))}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Previous missed-session follow-ups page"
                  >
                    <ChevronLeft className="h-4 w-4" /> Previous
                  </button>
                  <span className="min-w-12 text-center text-xs font-bold text-slate-600">
                    {visibleFollowupPage} / {followupPageCount}
                  </span>
                  <button
                    type="button"
                    disabled={visibleFollowupPage === followupPageCount}
                    onClick={() => setFollowupPage((page) => Math.min(followupPageCount, page + 1))}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Next missed-session follow-ups page"
                  >
                    Next <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

    </main>
  );
}
