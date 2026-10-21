"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, X, Send, Search, ArrowLeft, CheckCheck } from "lucide-react";

export default function FloatingChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [activeThreadId, setActiveThreadId] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [messageInput, setMessageInput] = useState("");

    // Multiple conversation threads
    const [threads, setThreads] = useState([
        {
            id: 1,
            title: "Educational Rights Support",
            lastMessage: "We have updated the portal guidelines.",
            time: "10:42 AM",
            messages: [
                { id: 101, sender: "support", text: "Hello! Welcome to Imara Support.", time: "10:30 AM" },
                { id: 102, sender: "user", text: "Hi, I need help with academic neglect reporting.", time: "10:35 AM" },
                { id: 103, sender: "support", text: "We have updated the portal guidelines to help streamline this process.", time: "10:42 AM" }
            ]
        },
        {
            id: 2,
            title: "Legal Advocacy Team",
            lastMessage: "Case documentation received successfully.",
            time: "Yesterday",
            messages: [
                { id: 201, sender: "support", text: "Your case document #4092 has been logged.", time: "Yesterday" },
                { id: 202, sender: "support", text: "Case documentation received successfully.", time: "Yesterday" }
            ]
        },
        {
            id: 3,
            title: "General Inquiries",
            lastMessage: "Feel free to ask any questions.",
            time: "Oct 12",
            messages: [
                { id: 301, sender: "support", text: "Feel free to ask any questions about our programs.", time: "Oct 12" }
            ]
        }
    ]);

    const filteredThreads = threads.filter(
        (thread) =>
            thread.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            thread.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const activeThread = threads.find((t) => t.id === activeThreadId);

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!messageInput.trim() || !activeThreadId) return;

        const newMsg = {
            id: Date.now(),
            sender: "user",
            text: messageInput,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setThreads((prevThreads) =>
            prevThreads.map((thread) => {
                if (thread.id === activeThreadId) {
                    return {
                        ...thread,
                        lastMessage: messageInput,
                        time: "Just now",
                        messages: [...thread.messages, newMsg]
                    };
                }
                return thread;
            })
        );

        setMessageInput("");
    };

    return (
        <div className="fixed bottom-6 right-6 z-50">
            {/* Chat Trigger Button */}
            <AnimatePresence>
                {!isOpen && (
                    <motion.button
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setIsOpen(true)}
                        className="relative flex items-center justify-center w-14 h-14 bg-gradient-to-tr from-blue-600 to-amber-500 rounded-full shadow-2xl text-white focus:outline-none border border-white/20"
                        aria-label="Open chat"
                    >
                        <MessageSquare className="w-6 h-6" />
                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-300 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-400"></span>
                        </span>
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Clean White Expanded Chat Window */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ duration: 0.25, ease: "easeOut" }}
                        className="w-[90vw] sm:w-[380px] h-[560px] bg-white text-slate-900 border border-slate-200 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
                    >
                        {/* Header */}
                        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                {activeThreadId !== null && (
                                    <button
                                        onClick={() => setActiveThreadId(null)}
                                        className="p-1 rounded-full text-slate-600 hover:bg-slate-200 transition-colors mr-1"
                                    >
                                        <ArrowLeft className="w-4 h-4" />
                                    </button>
                                )}
                                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                <h3 className="font-bold text-sm tracking-tight text-slate-900">
                                    {activeThread ? activeThread.title : "Justice Support Chat"}
                                </h3>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1.5 rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Search Bar */}
                        <div className="p-3 bg-white border-b border-slate-100">
                            <div className="relative">
                                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder={activeThreadId === null ? "Search conversations..." : "Search messages..."}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
                                />
                            </div>
                        </div>

                        {/* Content Area: Thread List OR Active Chat Messages */}
                        {activeThreadId === null ? (
                            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                                {filteredThreads.length === 0 ? (
                                    <div className="text-center py-16 text-slate-400 text-xs">
                                        No conversations found.
                                    </div>
                                ) : (
                                    filteredThreads.map((thread) => (
                                        <div
                                            key={thread.id}
                                            onClick={() => setActiveThreadId(thread.id)}
                                            className="p-4 cursor-pointer hover:bg-slate-50 transition-colors flex items-start justify-between"
                                        >
                                            <div className="space-y-1 pr-2">
                                                <h4 className="font-semibold text-xs text-slate-900">{thread.title}</h4>
                                                <p className="text-[11px] text-slate-500 line-clamp-1">{thread.lastMessage}</p>
                                            </div>
                                            <span className="text-[10px] text-slate-400 shrink-0">{thread.time}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/50">
                                <div className="flex-1 p-4 overflow-y-auto space-y-3">
                                    {activeThread.messages.map((msg) => (
                                        <div
                                            key={msg.id}
                                            className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
                                        >
                                            <div
                                                className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed shadow-sm ${
                                                    msg.sender === "user"
                                                        ? "bg-blue-600 text-white rounded-br-none"
                                                        : "bg-white border border-slate-200 text-slate-800 rounded-bl-none"
                                                }`}
                                            >
                                                {msg.text}
                                            </div>
                                            <span className="text-[10px] text-slate-400 mt-1 px-1">
                                                {msg.time}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                {/* Message Input */}
                                <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
                                    <input
                                        type="text"
                                        placeholder="Type your reply..."
                                        value={messageInput}
                                        onChange={(e) => setMessageInput(e.target.value)}
                                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
                                    />
                                    <button
                                        type="submit"
                                        className="p-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors focus:outline-none shadow-md"
                                    >
                                        <Send className="w-4 h-4" />
                                    </button>
                                </form>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}