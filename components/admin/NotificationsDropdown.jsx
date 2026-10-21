'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, useCallback } from 'react';
import { FaBell } from 'react-icons/fa';
import { AnimatePresence, motion } from 'framer-motion';
import { fetchNotifications } from '@/lib/api';
import { getAuthToken, getAuthUser } from '@/lib/auth';

export default function NotificationsDropdown({
    isOpen,
    onToggle,
    currentUserId
}) {

    const storedUser = getAuthUser();
    const resolvedUserId = currentUserId || storedUser?.id || storedUser?.user_id || (typeof window !== 'undefined' ? window.localStorage.getItem('userId') : null);

    const [notifications, setNotifications] = useState([]);
    const [unread, setUnread] = useState(0);
    const [loading, setLoading] = useState(false);

    /**
     * TRACK PREVIOUS COUNT
     * Used for sound effect
     */
    const previousUnreadRef = useRef(0);

    /**
     * AUDIO REF
     */
    const audioRef = useRef(null);

    /**
     * FETCH NOTIFICATIONS
     */
    const fetchNotificationsData = useCallback(async (silent = false) => {
        if (!getAuthToken()) return;
        try {
            if (!silent) {
                setLoading(true);
            }

            const data = await fetchNotifications(resolvedUserId);

            if (data?.success) {
                const newUnread = data.unread || 0;

                /**
                 * PLAY SOUND
                 * ONLY IF NEW NOTIFICATION ARRIVES
                 */
                if (
                    previousUnreadRef.current > 0 &&
                    newUnread > previousUnreadRef.current
                ) {
                    if (audioRef.current) {
                        audioRef.current.currentTime = 0;

                        audioRef.current.play().catch(() => {
                            console.log('Autoplay blocked');
                        });
                    }
                }

                previousUnreadRef.current = newUnread;

                setNotifications(data.data || []);
                setUnread(newUnread);
            }
        } catch (err) {
            console.error(err);
        } finally {
            if (!silent) {
                setLoading(false);
            }
        }
    }, [resolvedUserId]);

    /**
     * INITIAL FETCH
     */
    useEffect(() => {
        const timer = setTimeout(() => fetchNotificationsData(), 0);
        return () => clearTimeout(timer);
    }, [fetchNotificationsData]);

    /**
     * FETCH WHEN OPENED
     */
    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(() => fetchNotificationsData(true), 0);
            return () => clearTimeout(timer);
        }
        return undefined;
    }, [isOpen, fetchNotificationsData]);

    /**
     * POLLING
     * EVERY 10 SECONDS
     */
    useEffect(() => {
        const interval = setInterval(() => {
            fetchNotificationsData(true);
        }, 10000);

        return () => clearInterval(interval);
    }, [fetchNotificationsData]);

    return (
        <div className="relative">

            {/* NOTIFICATION SOUND */}
            <audio
                ref={audioRef}
                preload="auto"
            >
                <source
                    src="/sound/universfield-new-notification-012-363675.mp3"
                    type="audio/mpeg"
                />
            </audio>

            {/* BELL BUTTON */}
            <button
                onClick={onToggle}
                className={`p-2 transition-all duration-300 relative ${
                    isOpen
                        ? 'text-slate-600 bg-slate-50 rounded-xl'
                        : 'text-gray-500 hover:text-slate-600'
                }`}
            >

                <FaBell
                    className={`text-lg transition-transform duration-300 ${
                        unread > 0
                            ? 'animate-pulse'
                            : ''
                    }`}
                />

                {unread > 0 && (
                    <>
                        {/* RED DOT */}
                        <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-white"></span>

                        {/* COUNT */}
                        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow">
                            {unread > 99 ? '99+' : unread}
                        </span>
                    </>
                )}
            </button>

            {/* DROPDOWN */}
            <AnimatePresence>
                {isOpen && (
                <motion.div initial={{ opacity: 0, y: -8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.98 }} transition={{ duration: 0.18, ease: 'easeOut' }} className="absolute right-0 z-50 mt-3 w-96 overflow-hidden rounded-2xl border border-gray-100 bg-white py-2 shadow-2xl">

                    {/* HEADER */}
                    <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-slate-50 to-white">
                        <div>
                            <h3 className="font-bold text-sm text-gray-800">
                                Notifications
                            </h3>

                            <p className="text-[11px] text-gray-400 mt-0.5">
                                Live updates enabled
                            </p>
                        </div>

                        <span className="text-xs text-slate-600 font-semibold bg-slate-50 px-2 py-1 rounded-full">
                            {unread} New
                        </span>
                    </div>

                    {/* LIST */}
                    <div className="max-h-96 overflow-y-auto">

                        {loading ? (
                            <div className="p-6 text-center text-sm text-gray-400">
                                Loading notifications...
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="p-6 text-center text-sm text-gray-400">
                                No notifications found
                            </div>
                        ) : (
                            <AnimatePresence initial={false}>
                                {notifications.map((notif, index) => (
                                <motion.div key={notif.id} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.035, duration: 0.2 }}>
                                <Link
                                    key={notif.id}
                                    href={notif.action_url || '/admin/dashboard'}
                                    onClick={onToggle}
                                    className={`block px-5 py-4 border-b border-gray-50 flex gap-3 transition-all hover:bg-gray-50 ${
                                        notif.is_read == 0
                                            ? 'bg-slate-50/40'
                                            : ''
                                    }`}
                                >

                                    {/* STATUS DOT */}
                                    <div
                                        className={`mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 ${
                                            notif.type === 'alert'
                                                ? 'bg-red-500'
                                                : notif.type === 'success'
                                                ? 'bg-slate-500'
                                                : 'bg-blue-500'
                                        }`}
                                    ></div>

                                    {/* CONTENT */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start gap-3">
                                            <div>
                                                <p className="text-sm font-semibold text-gray-800 leading-tight">
                                                    {notif.title}
                                                </p>

                                                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                                                    {notif.message}
                                                </p>
                                            </div>

                                            <span className="text-[10px] text-gray-400 whitespace-nowrap">
                                                {new Date(
                                                    notif.created_at
                                                ).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>

                                </Link>
                                </motion.div>
                            ))}
                            </AnimatePresence>
                        )}

                    </div>

                    {/* FOOTER */}
                    <div className="px-4 py-3 border-t border-gray-100 text-center bg-gray-50">
                        <Link
                            href="/admin/notifications"
                            className="text-xs font-bold text-slate-600 hover:underline"
                        >
                            View All Notifications
                        </Link>
                    </div>

                </motion.div>
            )}
            </AnimatePresence>
        </div>
    );
}