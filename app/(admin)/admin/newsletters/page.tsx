"use client";

import dynamic from "next/dynamic";
import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import "react-quill-new/dist/quill.snow.css";
import { Archive, FilePlus2, ImagePlus, LoaderCircle, MailCheck, Plus, Send, Trash2, Upload, Video } from "lucide-react";
import { api, assetUrl } from "@/lib/api";

const QuillEditor = dynamic(() => import("react-quill-new"), { ssr: false });

type Audience = "subscribers" | "partners" | "both";
type Attachment = { path: string; url?: string; name: string; mime_type: string; size: number };
type QuillApi = {
  getSelection: (focus?: boolean) => { index: number } | null;
  setSelection: (index: number, length?: number, source?: string) => void;
  insertEmbed: (index: number, type: string, value: string, source?: string) => void;
  insertText: (index: number, text: string, format: string, value: string, source?: string) => void;
};
type Draft = {
  id?: number;
  title: string;
  subject: string;
  preheader: string;
  audience: Audience;
  html_body: string;
  attachments: Attachment[];
};
type Campaign = Draft & {
  id: number;
  status: string;
  recipient_count: number;
  sent_count: number;
  remaining_count: number;
  failed_count: number;
  created_at: string;
};

const emptyDraft: Draft = {
  title: "",
  subject: "",
  preheader: "",
  audience: "subscribers",
  html_body: "<p><br></p>",
  attachments: [],
};
const inputClass = "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-normal text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

export default function NewslettersAdminPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [audiences, setAudiences] = useState({ subscribers: 0, partners: 0 });
  const [draft, setDraft] = useState<Draft | null>(null);
  const [testEmail, setTestEmail] = useState("");
  const [busy, setBusy] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const editorRef = useRef<QuillApi | null>(null);
  const selectionRef = useRef(0);
  const filesRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.newsletters.admin();
      setCampaigns(Array.isArray(response.campaigns) ? response.campaigns : []);
      setAudiences({
        subscribers: Number(response.audiences?.subscribers || 0),
        partners: Number(response.audiences?.partners || 0),
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load newsletter campaigns.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const insertUploadedMedia = useCallback((path: string, name: string, mime: string, uploadedUrl?: string) => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.setSelection(selectionRef.current, 0, "silent");
    const url = uploadedUrl || assetUrl(path);
    if (mime.startsWith("image/")) {
      editor.insertEmbed(selectionRef.current, "image", url, "user");
    } else if (mime.startsWith("video/")) {
      editor.insertText(selectionRef.current, `Watch video: ${name}`, "link", url, "user");
    }
  }, []);

  const uploadFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;
    setUploading(true);
    setError("");
    try {
      const uploaded: Attachment[] = [];
      for (const file of files) {
        const response = await api.newsletters.upload(file);
        const item = response.file as Attachment;
        if (item.mime_type.startsWith("image/") || item.mime_type.startsWith("video/")) {
          insertUploadedMedia(item.path, item.name, item.mime_type, item.url);
        } else {
          uploaded.push(item);
        }
      }
      if (uploaded.length) {
        setDraft((current) => current ? { ...current, attachments: [...current.attachments, ...uploaded] } : current);
      }
      setNotice(`${files.length} file${files.length === 1 ? "" : "s"} uploaded.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to upload newsletter media.");
    } finally {
      setUploading(false);
    }
  };

  const insertLink = useCallback(() => {
    const editor = editorRef.current;
    const range = editor?.getSelection(true);
    if (range) selectionRef.current = range.index;
    const raw = window.prompt("Enter the full video URL (YouTube, Vimeo, or another HTTPS video link):");
    if (!raw) return;
    try {
      const url = new URL(raw);
      if (!["http:", "https:"].includes(url.protocol)) throw new Error();
      if (editor) editor.insertText(selectionRef.current, "Watch this video", "link", url.toString(), "user");
    } catch {
      setError("Enter a valid HTTP or HTTPS video URL.");
    }
  }, []);

  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ header: [1, 2, 3, false] }],
        ["bold", "italic", "underline", "strike"],
        [{ color: [] }, { background: [] }],
        [{ list: "ordered" }, { list: "bullet" }],
        ["blockquote", "link", "image", "video"],
        ["clean"],
      ],
      handlers: {
        image: function (this: { quill: QuillApi }) {
          editorRef.current = this.quill;
          const range = this.quill.getSelection(true);
          if (range) selectionRef.current = range.index;
          filesRef.current?.click();
        },
        video: function (this: { quill: QuillApi }) {
          editorRef.current = this.quill;
          const range = this.quill.getSelection(true);
          if (range) selectionRef.current = range.index;
          insertLink();
        },
      },
    },
  }), [insertLink]);

  const save = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (!draft) return null;
    setBusy("save");
    setError("");
    setNotice("");
    try {
      const response = await api.newsletters.save(draft);
      const next = { ...draft, id: Number(response.id) };
      setDraft(next);
      setNotice(response.message || "Newsletter draft saved.");
      await load();
      return next.id;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save the newsletter draft.");
      return null;
    } finally {
      setBusy("");
    }
  };

  const sendTest = async () => {
    const id = draft?.id || await save();
    if (!id || !testEmail.trim()) {
      if (!testEmail.trim()) setError("Enter a test recipient email address.");
      return;
    }
    setBusy("test");
    setError("");
    setNotice("");
    try {
      const response = await api.newsletters.sendTest({ id, email: testEmail.trim() });
      setNotice(response.message || "Test email sent.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to send the test email.");
    } finally {
      setBusy("");
    }
  };

  const queue = async () => {
    if (!draft) return;
    const id = draft.id || await save();
    if (!id) return;
    const audienceSize = draft.audience === "both"
      ? audiences.subscribers + audiences.partners
      : draft.audience === "partners" ? audiences.partners : audiences.subscribers;
    if (audienceSize < 1) {
      setError("There are no confirmed recipients in the selected audience.");
      return;
    }
    if (!window.confirm(`Queue this newsletter for up to ${audienceSize.toLocaleString()} opted-in recipient(s)? Emails will be sent in small batches.`)) return;
    setBusy("queue");
    setError("");
    setNotice("");
    try {
      const response = await api.newsletters.queue(id);
      setNotice(`${response.message || "Newsletter queued."} Recipient count: ${Number(response.recipient_count || 0).toLocaleString()}.`);
      setDraft(null);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to queue the newsletter.");
    } finally {
      setBusy("");
    }
  };

  const edit = (campaign: Campaign) => {
    setDraft({
      id: campaign.id,
      title: campaign.title,
      subject: campaign.subject,
      preheader: campaign.preheader || "",
      audience: campaign.audience,
      html_body: campaign.html_body || "<p><br></p>",
      attachments: Array.isArray(campaign.attachments) ? campaign.attachments : [],
    });
    setError("");
    setNotice("");
  };

  const audienceLabel = (audience: Audience) => audience === "both" ? "Subscribers and opted-in partners" : audience === "partners" ? "Opted-in partners" : "Confirmed subscribers";
  const removeAttachment = (path: string) => setDraft((current) => current ? { ...current, attachments: current.attachments.filter((item) => item.path !== path) } : current);

  return (
    <main className="space-y-6 pb-12">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-red-600">Communications workspace</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">Rhema Journey Newsletter</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-500">Write branded email updates, preview and test them, then queue opted-in recipients for batched delivery.</p>
        </div>
        {!draft ? <button type="button" onClick={() => { setDraft({ ...emptyDraft, attachments: [] }); setError(""); setNotice(""); }} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white"><Plus className="h-4 w-4" /> New newsletter</button> : null}
      </header>

      {notice ? <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</div> : null}
      {error ? <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div> : null}

      {draft ? (
        <form onSubmit={save} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div><p className="text-xs font-black uppercase tracking-wider text-blue-800">{draft.id ? "Edit draft" : "New campaign draft"}</p><p className="mt-1 text-xs text-slate-500">All recipients must have opted in. Video content is delivered as a link.</p></div>
            <button type="button" onClick={() => setDraft(null)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">Close editor</button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-xs font-bold text-slate-600">Internal campaign name
              <input required maxLength={180} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} className={inputClass} placeholder="e.g. Our work this month" />
            </label>
            <label className="block text-xs font-bold text-slate-600">Email subject
              <input required maxLength={200} value={draft.subject} onChange={(event) => setDraft({ ...draft, subject: event.target.value })} className={inputClass} placeholder="What your readers will see" />
            </label>
            <label className="block text-xs font-bold text-slate-600">Preview text <span className="font-normal">(optional)</span>
              <input maxLength={250} value={draft.preheader} onChange={(event) => setDraft({ ...draft, preheader: event.target.value })} className={inputClass} placeholder="A short line shown beside the subject" />
            </label>
            <label className="block text-xs font-bold text-slate-600">Audience
              <select value={draft.audience} onChange={(event) => setDraft({ ...draft, audience: event.target.value as Audience })} className={inputClass}>
                <option value="subscribers">Confirmed subscribers ({audiences.subscribers})</option>
                <option value="partners">Partners who opted in ({audiences.partners})</option>
                <option value="both">Both opted-in groups (deduplicated)</option>
              </select>
            </label>
          </div>

          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-600">Newsletter content</label>
              <button type="button" disabled={uploading} onClick={() => document.querySelector<HTMLButtonElement>(".newsletter-quill .ql-image")?.click()} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                {uploading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload image, video, or file
              </button>
              <input ref={filesRef} type="file" multiple hidden accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt" onChange={uploadFiles} />
            </div>
            <div className="newsletter-quill overflow-hidden rounded-xl border border-slate-200">
              <QuillEditor theme="snow" value={draft.html_body} onChange={(html: string) => setDraft((current) => current ? { ...current, html_body: html } : current)} modules={modules} placeholder="Write an update for the Rhema community…" />
            </div>
            <p className="mt-2 text-[11px] leading-5 text-slate-500"><ImagePlus className="mr-1 inline h-3.5 w-3.5" />Images are hosted in your newsletter. <Video className="mx-1 inline h-3.5 w-3.5" />Videos appear as clickable links. Documents are attached to the email.</p>
          </div>

          {draft.attachments.length ? <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-600">Email attachments ({draft.attachments.length}/5)</h2>
            <ul className="mt-3 space-y-2">{draft.attachments.map((item) => <li key={item.path} className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 text-xs">
              <span className="flex min-w-0 items-center gap-2 truncate font-semibold text-slate-700"><FilePlus2 className="h-4 w-4 shrink-0 text-blue-700" />{item.name} <span className="font-normal text-slate-400">({(item.size / 1024 / 1024).toFixed(1)} MB)</span></span>
              <button type="button" onClick={() => removeAttachment(item.path)} className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-700" aria-label={`Remove ${item.name}`}><Trash2 className="h-4 w-4" /></button>
            </li>)}</ul>
            <p className="mt-2 text-[11px] text-slate-500">Each attachment may be up to 8 MB; the combined email limit is 16 MB.</p>
          </section> : null}

          <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-end">
            <label className="min-w-0 flex-1 text-xs font-bold text-slate-600">Send a test to
              <input type="email" value={testEmail} onChange={(event) => setTestEmail(event.target.value)} className={inputClass} placeholder="you@example.com" />
            </label>
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={Boolean(busy) || uploading} onClick={() => void sendTest()} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-black text-slate-700 hover:bg-slate-50 disabled:opacity-50"><MailCheck className="h-4 w-4" />{busy === "test" ? "Sending…" : "Send test"}</button>
              <button type="submit" disabled={Boolean(busy) || uploading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-black text-slate-700 hover:bg-slate-50 disabled:opacity-50"><Archive className="h-4 w-4" />{busy === "save" ? "Saving…" : "Save draft"}</button>
              <button type="button" disabled={Boolean(busy) || uploading} onClick={() => void queue()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-rhema-red px-4 py-2.5 text-xs font-black text-white hover:bg-rhema-red-dark disabled:opacity-50"><Send className="h-4 w-4" />{busy === "queue" ? "Queueing…" : "Queue newsletter"}</button>
            </div>
          </div>
        </form>
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4"><h2 className="text-lg font-black text-slate-900">Campaigns</h2><p className="text-xs text-slate-500">Delivery status refreshes when you reload this page.</p></div>
        {loading ? <div className="flex min-h-32 items-center justify-center gap-2 text-sm text-slate-500"><LoaderCircle className="h-4 w-4 animate-spin" /> Loading campaigns…</div>
          : campaigns.length ? <div className="divide-y divide-slate-100">{campaigns.map((campaign) => <article key={campaign.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2"><h3 className="truncate font-bold text-slate-900">{campaign.title}</h3><span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${campaign.status === "sent" ? "bg-emerald-100 text-emerald-800" : campaign.status === "failed" ? "bg-rose-100 text-rose-800" : campaign.status === "draft" ? "bg-slate-100 text-slate-600" : "bg-blue-100 text-blue-800"}`}>{campaign.status}</span></div>
              <p className="mt-1 truncate text-xs text-slate-500">{campaign.subject} · {audienceLabel(campaign.audience)}</p>
              {campaign.status !== "draft" ? <p className="mt-1 text-[11px] text-slate-500">{campaign.sent_count.toLocaleString()} sent · {campaign.remaining_count.toLocaleString()} remaining · {campaign.failed_count.toLocaleString()} failed · {campaign.recipient_count.toLocaleString()} total</p> : null}
            </div>
            {campaign.status === "draft" ? <button type="button" onClick={() => edit(campaign)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">Edit draft</button> : null}
          </article>)}</div>
          : <p className="px-5 py-8 text-sm text-slate-500">No newsletters yet. Create a draft to get started.</p>}
      </section>
    </main>
  );
}
