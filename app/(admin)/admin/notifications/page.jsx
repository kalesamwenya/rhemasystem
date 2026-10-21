"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bell, CheckCircle2, Clock3, Filter, RefreshCw, Search, X } from "lucide-react";
import { fetchNotifications } from "@/lib/api";
import { getAuthUser } from "@/lib/auth";

const notificationTypes = ["all", "info", "alert", "success"];

const formatDate = (value) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "Unknown date" : date.toLocaleString([], {
        dateStyle: "medium",
        timeStyle: "short",
    });
};

const typeClass = (type) => ({
    alert: "bg-rose-100 text-rose-700",
    success: "bg-emerald-100 text-emerald-700",
    info: "bg-blue-100 text-blue-700",
}[type] || "bg-slate-100 text-slate-600");

export default function NotificationsPage() {
    const user = getAuthUser();
    const userId = user?.id || user?.user_id || (typeof window !== "undefined" ? window.localStorage.getItem("userId") : null);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [query, setQuery] = useState("");
    const [readFilter, setReadFilter] = useState("all");
    const [typeFilter, setTypeFilter] = useState("all");
    const [sortOrder, setSortOrder] = useState("newest");
    const [selectedNotification, setSelectedNotification] = useState(null);
    const previousUnreadRef = useRef(0);
    const audioRef = useRef(null);

    const loadNotifications = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const data = await fetchNotifications(userId);
            if (!data?.success) throw new Error(data?.message || "Unable to load notifications");
            const nextNotifications = data.data || [];
            const nextUnread = nextNotifications.filter((notification) => Number(notification.is_read) === 0).length;
            if (nextUnread > previousUnreadRef.current) {
                audioRef.current?.play().catch(() => {});
            }
            previousUnreadRef.current = nextUnread;
            setNotifications(nextNotifications);
        } catch (loadError) {
            setError(loadError.message || "Unable to load notifications");
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        const timer = setTimeout(() => void loadNotifications(), 0);
        const interval = setInterval(() => void loadNotifications(), 10000);
        return () => { clearTimeout(timer); clearInterval(interval); };
    }, [loadNotifications]);

    const normalizedQuery = query.trim().toLowerCase();
    const visibleNotifications = notifications
        .filter((notification) => readFilter === "all" || (readFilter === "unread" ? Number(notification.is_read) === 0 : Number(notification.is_read) === 1))
        .filter((notification) => typeFilter === "all" || notification.type === typeFilter)
        .filter((notification) => !normalizedQuery || `${notification.title} ${notification.message}`.toLowerCase().includes(normalizedQuery))
        .sort((first, second) => {
            const difference = new Date(first.created_at).getTime() - new Date(second.created_at).getTime();
            return sortOrder === "newest" ? -difference : difference;
        });

    const unreadCount = notifications.filter((notification) => Number(notification.is_read) === 0).length;

    return (
        <div className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 sm:px-8">
            <audio ref={audioRef} preload="auto"><source src="/sound/universfield-new-notification-051-494246.mp3" type="audio/mpeg" /></audio>
            <div className="mx-auto max-w-6xl space-y-6">
                <header className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <Link href="/admin" className="mb-4 inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900">
                            <ArrowLeft className="h-4 w-4" /> Admin dashboard
                        </Link>
                        <div className="flex items-center gap-3">
                            <div className="rounded-2xl bg-slate-900 p-3 text-white"><Bell className="h-5 w-5" /></div>
                            <div>
                                <h1 className="text-2xl font-black tracking-tight">Notifications</h1>
                                <p className="mt-1 text-sm text-slate-500">Review updates assigned to your account.</p>
                            </div>
                        </div>
                    </div>
                    <button type="button" onClick={() => void loadNotifications()} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-100 disabled:opacity-50">
                        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
                    </button>
                </header>

                <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total</p><p className="mt-2 text-3xl font-black">{notifications.length}</p></div>
                    <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5 shadow-sm"><p className="text-xs font-bold uppercase tracking-wider text-blue-500">Unread</p><p className="mt-2 text-3xl font-black text-blue-900">{unreadCount}</p></div>
                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 shadow-sm"><p className="text-xs font-bold uppercase tracking-wider text-emerald-600">Showing</p><p className="mt-2 text-3xl font-black text-emerald-900">{visibleNotifications.length}</p></div>
                </div>

                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search notifications..." className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-500" /></div>
                        <div className="flex flex-wrap items-center gap-2"><Filter className="h-4 w-4 text-slate-400" /><select value={readFilter} onChange={(event) => setReadFilter(event.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-bold"><option value="all">All status</option><option value="unread">Unread</option><option value="read">Read</option></select><select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-bold">{notificationTypes.map((type) => <option key={type} value={type}>{type === "all" ? "All types" : `${type[0].toUpperCase()}${type.slice(1)}`}</option>)}</select><select value={sortOrder} onChange={(event) => setSortOrder(event.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-bold"><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></div>
                    </div>
                </section>

                {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">{error}</div>}
                <section className="space-y-3">
                    {loading ? <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">Loading notifications...</div> : visibleNotifications.length ? visibleNotifications.map((notification) => <button type="button" key={notification.id} onClick={() => setSelectedNotification(notification)} className={`w-full rounded-2xl border bg-white p-5 text-left shadow-sm transition hover:border-blue-300 hover:shadow-md ${Number(notification.is_read) === 0 ? "border-blue-200" : "border-slate-200"}`}><div className="flex items-start gap-4"><span className={`mt-0.5 rounded-xl p-2 ${typeClass(notification.type)}`}><Bell className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="flex flex-wrap items-center justify-between gap-2"><span className="font-bold text-slate-900">{notification.title}</span><span className="flex items-center gap-1 text-xs text-slate-400"><Clock3 className="h-3.5 w-3.5" />{formatDate(notification.created_at)}</span></span><span className="mt-1 block text-sm leading-relaxed text-slate-600">{notification.message}</span><span className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">{Number(notification.is_read) === 0 ? <><span className="h-2 w-2 rounded-full bg-blue-600" /> Unread</> : <><CheckCircle2 className="h-3.5 w-3.5" /> Read</>}</span></span></div></button>) : <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">No notifications match these filters.</div>}
                </section>
            </div>

            {selectedNotification && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-label="Notification details"><div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between gap-4"><div className="flex items-center gap-3"><span className={`rounded-xl p-2 ${typeClass(selectedNotification.type)}`}><Bell className="h-5 w-5" /></span><div><p className="text-xs font-black uppercase tracking-wider text-slate-400">Notification details</p><h2 className="mt-1 text-lg font-black text-slate-900">{selectedNotification.title}</h2></div></div><button type="button" onClick={() => setSelectedNotification(null)} aria-label="Close notification details" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button></div><p className="mt-6 text-sm leading-7 text-slate-600">{selectedNotification.message}</p><p className="mt-5 text-xs font-semibold text-slate-400">Received {formatDate(selectedNotification.created_at)}</p><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setSelectedNotification(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600">Close</button>{selectedNotification.action_url && <Link href={selectedNotification.action_url} onClick={() => setSelectedNotification(null)} className="rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white">Open related item</Link>}</div></div></div>}
        </div>
    );
}
