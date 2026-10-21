'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { FaComments, FaExternalLinkAlt } from 'react-icons/fa';
import Link from 'next/link';
import { api } from '@/lib/api';
import { getAuthToken } from '@/lib/auth';

const SETTINGS_KEY = 'chatSettings';

const parseDate = (value) => {
    if (!value) return null;
    const normalized = String(value).includes('T') ? String(value) : String(value).replace(' ', 'T') + 'Z';
    const date = new Date(normalized);
    return Number.isNaN(date.getTime()) ? null : date;
};

const relativeTime = (value) => {
    const date = parseDate(value);
    if (!date) return 'Recently';
    const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hr ago`;
    return `${Math.floor(hours / 24)} days ago`;
};

const initials = (name) => (name || 'Team').split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
const avatarUrl = (conversation) => conversation.other_member_avatar || conversation.member_avatar || conversation.avatar_url || '';

const readSettings = () => {
    if (typeof window === 'undefined') return { notifications: true, soundEnabled: true, messagePreview: true };
    try {
        return { notifications: true, soundEnabled: true, messagePreview: true, ...JSON.parse(window.localStorage.getItem(SETTINGS_KEY) || '{}') };
    } catch {
        return { notifications: true, soundEnabled: true, messagePreview: true };
    }
};

export default function MessagesDropdown({ isOpen, onToggle }) {
    const [messages, setMessages] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const previousLatestRef = useRef('');
    const hasLoadedRef = useRef(false);
    const audioRef = useRef(null);
    const router = useRouter();

    // Initialize audio only once
    useEffect(() => {
        audioRef.current = new Audio('/sound/universfield-new-notification-051-494246.mp3');
    }, []);

    const fetchMessages = useCallback(async () => {
        if (!getAuthToken()) return;
        try {
            const result = await api.communications.snapshot();
            if (result?.success && Array.isArray(result.conversations)) {
                const settings = readSettings();
                const latestThreads = result.conversations.filter((conversation) => conversation.last_message).slice(0, 5);
                const latestKey = latestThreads.map((conversation) => `${conversation.id}:${conversation.last_message_at}`).join('|');

                if (hasLoadedRef.current && settings.notifications && settings.soundEnabled && latestKey !== previousLatestRef.current) {
                    audioRef.current?.play().catch(() => {
                        // Autoplay policy usually blocks this until first user interaction
                    });
                }

                const currentUnread = Number(result.unread_messages) || 0;
                setMessages(latestThreads.map((conversation) => ({
                    ...conversation,
                    previewEnabled: settings.messagePreview,
                    unread: Number(conversation.unread_count || 0),
                })));
                setUnreadCount(currentUnread);
                previousLatestRef.current = latestKey;
                hasLoadedRef.current = true;
            }
        } catch (error) {
            console.error('Dropdown fetch error:', error);
        }
    }, []);

    useEffect(() => {
        const timer = setTimeout(fetchMessages, 0);
        const interval = setInterval(fetchMessages, 20000);
        const onSettingsChange = () => fetchMessages();
        window.addEventListener('storage', onSettingsChange);
        return () => { clearTimeout(timer); clearInterval(interval); window.removeEventListener('storage', onSettingsChange); };
    }, [fetchMessages]);

    const handleMessageClick = (thread) => {
        onToggle(); // Close dropdown
        router.push(`/admin/messages?conversation=${encodeURIComponent(thread.id)}`);
    };

    return (
        <div className="relative">
            <button
                onClick={onToggle}
                className={`p-2.5 transition-all relative rounded-xl ${
                    isOpen 
                    ? 'text-green-600 bg-green-50 shadow-inner' 
                    : 'text-gray-500 hover:text-green-600 hover:bg-gray-50'
                }`}
                title="Team chat notifications"
            >
                <FaComments className="text-xl" />
                {unreadCount > 0 && (
                    <span className="absolute top-2 right-2 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border-2 border-white shadow-sm"></span>
                    </span>
                )}
            </button>

            <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop to close on click outside */}
                    <div className="fixed inset-0 z-40" onClick={onToggle}></div>
                    
                    <motion.div initial={{ opacity: 0, y: -8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.98 }} className="absolute right-0 z-50 mt-3 w-80 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_10px_40px_rgba(0,0,0,0.1)]">
                        <div className="px-5 py-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                            <h3 className="font-bold text-sm text-gray-900">Team Chat</h3>
                            {unreadCount > 0 && (
                                <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full uppercase">
                                    {unreadCount} New
                                </span>
                            )}
                        </div>

                        <div className="max-h-[380px] overflow-y-auto">
                            {messages.length > 0 ? (
                                messages.map((msg, idx) => (
                                    <motion.button type="button" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.04 }}
                                        key={msg.id}
                                        onClick={() => handleMessageClick(msg)}
                                        className={`block w-full px-5 py-4 text-left hover:bg-green-50/30 border-b border-gray-50 last:border-0 transition-colors relative ${
                                            msg.unread > 0 ? 'bg-blue-50/10' : ''
                                        }`}
                                    >
                                        {msg.unread > 0 && (
                                            <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1 h-8 bg-green-500 rounded-full"></div>
                                        )}
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-blue-100 text-xs font-black text-blue-700">
                                                {avatarUrl(msg) ? <img src={avatarUrl(msg)} alt="" className="h-full w-full object-cover" /> : initials(msg.display_name || msg.conversation_name)}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                            <div className="flex items-center justify-between gap-2">
                                            <span className={`truncate text-sm ${msg.unread > 0 ? 'font-bold text-gray-900' : 'text-gray-700'}`}>
                                                {msg.display_title || msg.display_name || msg.conversation_name || 'Team chat'}
                                            </span>
                                            <span className="whitespace-nowrap text-[10px] font-medium text-gray-400">
                                                {relativeTime(msg.last_message_at)}
                                            </span>
                                            </div>
                                            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-green-600">
                                                {msg.conversation_type === 'group' ? 'Group chat' : 'Direct chat'}
                                            </p>
                                            </div>
                                        </div>
                                        <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                                            {msg.previewEnabled ? msg.last_message : 'New team message'}
                                        </p>
                                    </motion.button>
                                ))
                            ) : (
                                <div className="px-5 py-12 text-center">
                                    <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <FaComments className="text-gray-200 text-lg" />
                                    </div>
                                    <p className="text-xs text-gray-400">No messages yet</p>
                                </div>
                            )}
                        </div>

                        <Link 
                            href="/admin/messages" 
                            onClick={onToggle}
                            className="block py-3 text-center text-xs font-bold text-gray-600 bg-gray-50 hover:bg-gray-100 hover:text-green-600 transition-all border-t border-gray-100"
                        >
                            <span className="flex items-center justify-center gap-2">
                                View All Messages <FaExternalLinkAlt size={10} />
                            </span>
                        </Link>
                    </motion.div>
                </>
            )}
            </AnimatePresence>
        </div>
    );
}