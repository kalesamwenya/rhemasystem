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
  PhoneIncoming,
  Plus,
  Search,
  Send,
  Smartphone,
  Users,
  History,
} from "lucide-react";
import { api } from "@/lib/api";

type AudienceId =
  | "customer"
  | "prospect"
  | "partner"
  | "donor"
  | "newsletter"
  | "beneficiary"
  | "other";

type Channel = "sms" | "whatsapp" | "email" | "call";
type CommunicationsTab = "compose" | "activity" | "followups";

type Contact = {
  id: number;
  student_id?: string;
  name: string;
  organization: string;
  audience: AudienceId;
  title: string;
  formal_name: string;
  preferred_name: string;
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
  { id: "customer", label: "Customers" },
  { id: "prospect", label: "Potential Clients" },
  { id: "partner", label: "Partners" },
  { id: "donor", label: "Donors" },
  { id: "newsletter", label: "Newsletter Contacts" },
  { id: "beneficiary", label: "Beneficiaries" },
  { id: "other", label: "Other Contacts" },
] as const;

const emptyContact: Contact = {
  id: 0,
  name: "",
  organization: "",
  audience: "partner",
  title: "",
  formal_name: "",
  preferred_name: "",
  email: "",
  phone: "",
  notes: "",
};

const channels = [
  { id: "sms", label: "SMS", icon: Smartphone },
  { id: "whatsapp", label: "WhatsApp", icon: MessageCircle },
  { id: "email", label: "Email", icon: Mail },
  { id: "call", label: "Call", icon: PhoneCall },
] as const;

const dialKeys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"];

const initialContacts: Contact[] = [
  {
    id: 1,
    name: "Aisha Mensah",
    organization: "BrightPath Academy",
    audience: "prospect",
    title: "Admissions Lead",
    formal_name: "Aisha Mensah",
    preferred_name: "Aisha",
    email: "aisha@brightpath.edu",
    phone: "+233 20 123 4567",
    notes: "Interested in enrolment updates",
  },
  {
    id: 2,
    name: "Daniel Owusu",
    organization: "Godfrey Academy",
    audience: "customer",
    title: "Parent",
    formal_name: "Daniel Owusu",
    preferred_name: "Daniel",
    email: "daniel.owusu@gmail.com",
    phone: "+233 24 987 6543",
    notes: "Prefers SMS updates for school fees",
  },
  {
    id: 3,
    name: "Naa Dede",
    organization: "Impact Partners",
    audience: "partner",
    title: "Partnership Manager",
    formal_name: "Naa Dede",
    preferred_name: "Naa",
    email: "naa@impactpartners.org",
    phone: "+233 50 345 6789",
    notes: "Collaborating on community outreach",
  },
  {
    id: 4,
    name: "Joseph Kumi",
    organization: "CareSphere Foundation",
    audience: "donor",
    title: "Donor Relations",
    formal_name: "Joseph Kumi",
    preferred_name: "Joe",
    email: "joe@caresphere.org",
    phone: "+233 30 774 2211",
    notes: "Large donor for student support programme",
  },
  {
    id: 5,
    name: "Mariam Afriyie",
    organization: "Annual Newsletter",
    audience: "newsletter",
    title: "Newsletter Subscriber",
    formal_name: "Mariam Afriyie",
    preferred_name: "Mariam",
    email: "mariam@example.com",
    phone: "+233 57 223 4040",
    notes: "Receives monthly school updates",
  },
  {
    id: 6,
    name: "Samuel Tetteh",
    organization: "Community Outreach",
    audience: "beneficiary",
    title: "Parent Support",
    formal_name: "Samuel Tetteh",
    preferred_name: "Samuel",
    email: "samuel@supportcommunity.org",
    phone: "+233 27 991 8899",
    notes: "Needs follow-up regarding bursary support",
  },
];

const initialHistory: HistoryEntry[] = [
  {
    id: 1,
    contact_name: "Aisha Mensah",
    channel: "sms",
    status: "queued",
    body: "Admission reminders and orientation schedule update.",
  },
  {
    id: 2,
    contact_name: "Daniel Owusu",
    channel: "email",
    status: "sent",
    body: "School fee statement and payment confirmation details.",
  },
  {
    id: 3,
    contact_name: "Naa Dede",
    channel: "whatsapp",
    status: "delivered",
    body: "Partnership update on outreach activities.",
  },
];

const initialIncomingCalls: IncomingCall[] = [
  {
    id: 1,
    caller_number: "+233 20 444 1100",
    status: "answered",
    duration_seconds: 245,
    created_at: "Today, 09:14 AM",
  },
  {
    id: 2,
    caller_number: "+233 27 991 8899",
    status: "missed",
    created_at: "Yesterday, 04:52 PM",
  },
];

const formatAudience = (value: string) => {
  const normalized = String(value || "other").toLowerCase();
  const map: Record<string, string> = {
    customer: "Customer",
    prospect: "Potential Client",
    partner: "Partner",
    donor: "Donor",
    newsletter: "Newsletter",
    beneficiary: "Beneficiary",
    other: "Other",
  };

  return map[normalized] || normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const formatInitials = (name = "") =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "N";

export default function CommunicationsPage() {
  const [contacts, setContacts] = useState<Contact[]>(initialContacts);
  const [history, setHistory] = useState<HistoryEntry[]>(initialHistory);
  const [incomingCalls, setIncomingCalls] = useState<IncomingCall[]>(initialIncomingCalls);
  const [activeTab, setActiveTab] = useState<CommunicationsTab>("compose");
  const [audiencePage, setAudiencePage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<number[]>([1, 2]);
  const [channel, setChannel] = useState<Channel>("sms");
  const [message, setMessage] = useState("");
  const [dialNumber, setDialNumber] = useState("");
  const [callActive, setCallActive] = useState(false);
  const [search, setSearch] = useState("");
  const [contact, setContact] = useState<Contact>({ ...emptyContact });
  const [selectedAudiences, setSelectedAudiences] = useState<AudienceId[]>([
    "customer",
    "prospect",
    "partner",
    "donor",
    "newsletter",
    "beneficiary",
    "other",
  ]);
  const [showAdd, setShowAdd] = useState(false);
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [attendanceFollowups, setAttendanceFollowups] = useState<AttendanceFollowup[]>([]);
  const [followupsLoading, setFollowupsLoading] = useState(false);
  const [followupError, setFollowupError] = useState("");
  const [followupSavingId, setFollowupSavingId] = useState<number | null>(null);
  const [followupDates, setFollowupDates] = useState<Record<number, string>>({});

  useEffect(() => {
    Promise.all([api.students.adminRoster(), api.notifications.list()])
      .then(([studentsResponse, notificationsResponse]: [{ data?: Array<{ student_id: string; name: string; class: string }> }, { data?: Array<{ id: number; student_id?: string; type?: string; message?: string; read_at?: string; created_at?: string }> }]) => {
        const students = studentsResponse.data ?? [];
        const studentContacts: Contact[] = students.map((student) => ({
          id: Number.isNaN(Number(student.student_id)) ? Math.abs([...student.student_id].reduce((hash, character) => ((hash << 5) - hash + character.charCodeAt(0)) | 0, 0)) : Number(student.student_id),
          student_id: student.student_id,
          name: student.name,
          organization: "Rhema Class Register",
          audience: "customer",
          title: "Student",
          formal_name: student.name,
          preferred_name: student.name.split(" ")[0],
          email: "",
          phone: "",
          notes: `Cohort ${student.class}`,
        }));
        setContacts(studentContacts);
        setSelectedIds(studentContacts.slice(0, 2).map((student) => student.id));
        const nameByStudentId = new Map(students.map((student) => [String(student.student_id), student.name]));
        setHistory((notificationsResponse.data ?? []).map((notification) => ({
          id: notification.id,
          contact_name: nameByStudentId.get(String(notification.student_id)) ?? "Student audience",
          channel: (notification.type === "sms" || notification.type === "whatsapp" || notification.type === "call" ? notification.type : "email") as Channel,
          status: notification.read_at ? "read" : "sent",
          body: notification.message ?? "",
        })));
      })
      .catch(() => setNotice("Unable to load the communication directory from the database."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (activeTab !== "followups") return;
    (api.attendance.followups() as Promise<{ data: AttendanceFollowup[] }>)
      .then((response) => {
        setAttendanceFollowups(response.data);
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

  const filtered = useMemo(() => {
    return contacts.filter((item) => {
      const rawAudience = String(item.audience || "other").toLowerCase().replace(/\s+/g, "_");
      const audience = ["potential_client", "potential_clients", "prospective_client", "prospective_clients"].includes(rawAudience)
        ? "prospect"
        : rawAudience;

      const audienceMatch = selectedAudiences.includes(audience as AudienceId);
      const searchText = `${item.name || ""} ${item.organization || ""} ${item.email || ""} ${item.phone || ""} ${formatAudience(audience)} `.toLowerCase();
      return audienceMatch && searchText.includes(search.toLowerCase());
    });
  }, [contacts, search, selectedAudiences]);

  const selectedContacts = contacts.filter((contactItem) => selectedIds.includes(contactItem.id));
  const audiencePageSize = 6;
  const audiencePageCount = Math.max(1, Math.ceil(filtered.length / audiencePageSize));
  const visibleAudiencePage = Math.min(audiencePage, audiencePageCount);
  const paginatedContacts = filtered.slice((visibleAudiencePage - 1) * audiencePageSize, visibleAudiencePage * audiencePageSize);

  const toggleAudience = (audienceId: AudienceId) => {
    setSelectedAudiences((current) =>
      current.includes(audienceId) ? current.filter((item) => item !== audienceId) : [...current, audienceId]
    );
  };

  const toggleContactSelection = (id: number) => {
    setSelectedIds((current) => {
      const selected = current.includes(id);
      if (selected) return current.filter((item) => item !== id);

      const selectedContact = contacts.find((item) => item.id === id);
      if (selectedContact?.phone) setDialNumber(selectedContact.phone);
      return [...current, id];
    });
  };

  const addContact = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!contact.name.trim() || !contact.phone.trim()) {
      setNotice("Add a contact name and phone number before saving.");
      return;
    }

    setSaving(true);

    const studentId = `COM-${Date.now()}`;
    try {
      await api.students.create({ student_id: studentId, name: contact.name.trim(), class: contact.audience, payment_status: "Active" });
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : "Unable to save this contact to the database.");
      setSaving(false);
      return;
    }

    const newContact: Contact = {
      ...contact,
      id: Date.now(),
      student_id: studentId,
      audience: contact.audience || "partner",
      organization: contact.organization || "Not specified",
    };

    setContacts((current) => [newContact, ...current]);
    setSelectedIds((current) => [newContact.id, ...current]);
    setContact({ ...emptyContact });
    setShowAdd(false);
    setNotice("Contact saved to the student directory and added to the communication list.");
    setSaving(false);
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
    setSaving(true);

    setTimeout(() => {
      setCallActive(true);
      setNotice(`Call initiated to ${cleanNumber}.`);
      setHistory((current) => [
        {
          id: Date.now(),
          contact_name: callRecipient?.name || cleanNumber,
          channel: "call",
          status: "dialing",
          body: `Call placed to ${cleanNumber}.`,
        },
        ...current,
      ]);
      setSaving(false);
    }, 500);
  };

  const receiveIncomingCall = () => {
    const number = dialNumber.trim() || "+233 20 555 1234";

    setIncomingCalls((current) => [
      {
        id: Date.now(),
        caller_number: number,
        status: "received",
        duration_seconds: 180,
        created_at: "Just now",
      },
      ...current,
    ]);

    setCallActive(false);
    setNotice(`Incoming call received from ${number}.`);
  };

  const execute = async () => {
    if (channel === "call") {
      placeCall();
      return;
    }

    if (!selectedIds.length) {
      setNotice("Select at least one recipient first.");
      return;
    }

    if (!message.trim() && channel !== "email") {
      setNotice(`Write a ${channel} message first.`);
      return;
    }

    setSaving(true);

    const recipientNames = selectedContacts.map((item) => item.name).join(", ");

    try {
      await Promise.all(selectedContacts.map((recipient) => api.notifications.save({
        student_id: recipient.student_id,
        type: channel,
        title: `${channel.toUpperCase()} communication`,
        message: message.trim() || "Email template sent to selected recipients.",
      })));
      setHistory((current) => [{ id: Date.now(), contact_name: recipientNames || "Selected contacts", channel, status: "sent", body: message.trim() || "Email template sent to selected recipients." }, ...current]);
      setNotice(`${channel.toUpperCase()} message has been recorded for ${selectedIds.length} contact(s).`);
      setMessage("");
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : "Unable to save this communication.");
    } finally {
      setSaving(false);
    }
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
            Send formal updates by SMS, WhatsApp, email, or voice call to your customers, partners, donors, beneficiaries, and other important stakeholders from one secure workspace.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-2 rounded-2xl bg-amber-400 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-amber-300"
        >
          <Plus className="h-4 w-4" /> Add contact
        </button>
      </header>

      {notice && (
        <div role="status" className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm font-bold text-blue-800">
          {notice}
        </div>
      )}

      <nav className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm" aria-label="Communication workspace tabs">
        {[
          { id: "compose", label: "Compose", icon: Send },
          { id: "activity", label: "Activity history", icon: History },
          { id: "followups", label: "Attendance follow-ups", icon: Clock3 },
        ].map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" aria-pressed={activeTab === id} onClick={() => { const nextTab = id as CommunicationsTab; setActiveTab(nextTab); if (nextTab === "followups") { setFollowupsLoading(true); setFollowupError(""); } }} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black transition ${activeTab === id ? "bg-slate-950 text-white" : "text-slate-700 hover:bg-slate-100"}`}>
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </nav>

      <div className={`grid min-w-0 grid-cols-1 gap-4 xl:gap-6 lg:grid-cols-[minmax(17rem,0.85fr)_minmax(0,1.15fr)] ${activeTab === "compose" ? "" : "hidden"}`}>
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="inline-flex items-center gap-2 text-lg font-black text-slate-900"><Users className="h-5 w-5 text-red-600" /> Audience groups</h2>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-slate-600">
              {selectedAudiences.length} active
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            {audienceOptions.map((item) => {
              const active = selectedAudiences.includes(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggleAudience(item.id)}
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

          <div className="mt-5 space-y-2">
            {loading ? <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">Loading student directory...</div> : filtered.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                No contacts match the current filters.
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
                    </span>
                    <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] font-black uppercase tracking-wide">
                      {formatAudience(item.audience || "other")}
                    </span>
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
                  <span key={item.id} className="rounded-full border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-700">
                    {item.name}
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

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={receiveIncomingCall}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
                >
                  <PhoneIncoming className="h-4 w-4" /> Receive incoming call
                </button>
                {callActive && (
                  <button
                    type="button"
                    onClick={() => {
                      setCallActive(false);
                      setNotice("Dialer ready for the next call.");
                    }}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
                  >
                    End / reset call
                  </button>
                )}
              </div>
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
              {channel === "call" ? "Use the keypad or enter a number to place your call." : "Formal updates can be sent to multiple groups at once."}
            </div>
            <button
              type="button"
              onClick={execute}
              disabled={saving || (channel === "call" && callActive)}
              className="inline-flex items-center gap-2 rounded-2xl bg-red-600 px-5 py-3 text-sm font-black text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {channel === "call" ? <PhoneCall className="h-4 w-4" /> : <Send className="h-4 w-4" />} {saving ? channel === "call" ? "Connecting..." : "Sending..." : channel === "call" ? callActive ? "Call in progress" : "Initiate call" : "Send message"}
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
            {attendanceFollowups.map((item) => (
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
          </div>
        )}
      </section>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-2xl font-black text-slate-900">Add contact</h2>
              <button type="button" onClick={() => setShowAdd(false)} className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-bold text-slate-600">
                Close
              </button>
            </div>

            <form onSubmit={addContact} className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="text-sm font-bold text-slate-700">
                Full name
                <input
                  required
                  value={contact.name}
                  onChange={(event) => setContact({ ...contact, name: event.target.value })}
                  className="mt-2 w-full rounded-xl bg-slate-50 px-3 py-2.5 text-sm ring-1 ring-slate-200"
                />
              </label>

              <label className="text-sm font-bold text-slate-700">
                Official title
                <input
                  value={contact.title}
                  onChange={(event) => setContact({ ...contact, title: event.target.value })}
                  className="mt-2 w-full rounded-xl bg-slate-50 px-3 py-2.5 text-sm ring-1 ring-slate-200"
                />
              </label>

              <label className="text-sm font-bold text-slate-700">
                Formal name
                <input
                  value={contact.formal_name}
                  onChange={(event) => setContact({ ...contact, formal_name: event.target.value })}
                  className="mt-2 w-full rounded-xl bg-slate-50 px-3 py-2.5 text-sm ring-1 ring-slate-200"
                />
              </label>

              <label className="text-sm font-bold text-slate-700">
                Preferred name
                <input
                  value={contact.preferred_name}
                  onChange={(event) => setContact({ ...contact, preferred_name: event.target.value })}
                  className="mt-2 w-full rounded-xl bg-slate-50 px-3 py-2.5 text-sm ring-1 ring-slate-200"
                />
              </label>

              <label className="text-sm font-bold text-slate-700">
                Organisation
                <input
                  value={contact.organization}
                  onChange={(event) => setContact({ ...contact, organization: event.target.value })}
                  className="mt-2 w-full rounded-xl bg-slate-50 px-3 py-2.5 text-sm ring-1 ring-slate-200"
                />
              </label>

              <label className="text-sm font-bold text-slate-700">
                Audience category
                <select
                  value={contact.audience}
                  onChange={(event) => setContact({ ...contact, audience: event.target.value as AudienceId })}
                  className="mt-2 w-full rounded-xl bg-slate-50 px-3 py-2.5 text-sm ring-1 ring-slate-200"
                >
                  {audienceOptions.map((item) => (
                    <option key={item.id} value={item.id}>{item.label}</option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-bold text-slate-700 md:col-span-2">
                Email
                <input
                  type="email"
                  value={contact.email}
                  onChange={(event) => setContact({ ...contact, email: event.target.value })}
                  className="mt-2 w-full rounded-xl bg-slate-50 px-3 py-2.5 text-sm ring-1 ring-slate-200"
                />
              </label>

              <label className="text-sm font-bold text-slate-700 md:col-span-2">
                Phone number
                <input
                  required
                  value={contact.phone}
                  onChange={(event) => setContact({ ...contact, phone: event.target.value })}
                  className="mt-2 w-full rounded-xl bg-slate-50 px-3 py-2.5 text-sm ring-1 ring-slate-200"
                />
              </label>

              <label className="text-sm font-bold text-slate-700 md:col-span-2">
                Notes
                <textarea
                  value={contact.notes}
                  onChange={(event) => setContact({ ...contact, notes: event.target.value })}
                  rows={3}
                  className="mt-2 w-full rounded-xl bg-slate-50 px-3 py-2.5 text-sm ring-1 ring-slate-200"
                />
              </label>

              <div className="md:col-span-2 flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowAdd(false)} className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white disabled:opacity-60">
                  {saving ? "Saving..." : "Save contact"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
