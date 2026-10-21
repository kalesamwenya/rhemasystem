"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bell,
  Lock,
  Palette,
  HelpCircle,
  Trash2,
  MessageSquare,
  Volume2,
} from "lucide-react";

export default function TeamChatSettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState({
    notifications: true,
    soundEnabled: true,
    desktopNotifications: false,
    theme: "light",
    messagePreview: true,
    autoScroll: true,
  });

  const [notification, setNotification] = useState("");
  const [saveSuccessful, setSaveSuccessful] = useState(false);

  useEffect(() => {
    // Load settings from localStorage
    try {
      const saved = localStorage.getItem("chatSettings");
      if (saved) {
        const timer = setTimeout(() => setSettings((current) => ({ ...current, ...JSON.parse(saved) })), 0);
        return () => clearTimeout(timer);
      }
    } catch (error) {
      console.error("Failed to load settings", error);
    }
  }, []);

  const handleToggle = async (key) => {
    const updated = { ...settings, [key]: !settings[key] };
    setSettings(updated);
    if (key === "desktopNotifications" && updated.desktopNotifications && "Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission();
    }
  };

  const handleSelectChange = (key, value) => {
    setSettings({ ...settings, [key]: value });
  };

  const handleSaveSettings = async () => {
    try {
      localStorage.setItem("chatSettings", JSON.stringify(settings));
      window.dispatchEvent(new Event("chat-settings-updated"));
      setSaveSuccessful(true);
      setNotification("Settings saved successfully");
      setTimeout(() => {
        setSaveSuccessful(false);
        setNotification("");
      }, 3000);
    } catch (error) {
      setNotification("Failed to save settings");
    }
  };

  const handleClearCache = async () => {
    if (confirm("This will clear all cached chat messages. Continue?")) {
      try {
        localStorage.removeItem("chatMessages");
        setNotification("Cache cleared successfully");
        setTimeout(() => setNotification(""), 3000);
      } catch (error) {
        setNotification("Failed to clear cache");
      }
    }
  };

  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(""), 3000);
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Chat Settings</h1>
            <p className="text-sm text-gray-500">Manage your chat preferences</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="space-y-6">
          {/* Notifications Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
              <Bell size={24} className="text-blue-600" />
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Notifications
                </h2>
                <p className="text-sm text-gray-500">
                  Control how you receive notifications
                </p>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Enable Notifications */}
              <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                <div>
                  <p className="font-medium text-gray-900">
                    Enable notifications
                  </p>
                  <p className="text-sm text-gray-500">
                    Get notified about new messages
                  </p>
                </div>
                <label className="relative inline-flex cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.notifications}
                    onChange={() => handleToggle("notifications")}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Sound Notifications */}
              <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                <div>
                  <p className="font-medium text-gray-900 flex items-center gap-2">
                    <Volume2 size={18} />
                    Sound notifications
                  </p>
                  <p className="text-sm text-gray-500">
                    Play sound for new messages
                  </p>
                </div>
                <label className="relative inline-flex cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.soundEnabled}
                    onChange={() => handleToggle("soundEnabled")}
                    disabled={!settings.notifications}
                    className="sr-only peer disabled:opacity-50"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 disabled:opacity-50"></div>
                </label>
              </div>

              {/* Desktop Notifications */}
              <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                <div>
                  <p className="font-medium text-gray-900">
                    Desktop notifications
                  </p>
                  <p className="text-sm text-gray-500">
                    Browser notifications for new messages
                  </p>
                </div>
                <label className="relative inline-flex cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.desktopNotifications}
                    onChange={() => handleToggle("desktopNotifications")}
                    disabled={!settings.notifications}
                    className="sr-only peer disabled:opacity-50"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 disabled:opacity-50"></div>
                </label>
              </div>

              {/* Message Preview */}
              <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                <div>
                  <p className="font-medium text-gray-900 flex items-center gap-2">
                    <MessageSquare size={18} />
                    Message preview
                  </p>
                  <p className="text-sm text-gray-500">
                    Show message preview in notifications
                  </p>
                </div>
                <label className="relative inline-flex cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.messagePreview}
                    onChange={() => handleToggle("messagePreview")}
                    disabled={!settings.notifications}
                    className="sr-only peer disabled:opacity-50"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 disabled:opacity-50"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Appearance Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
              <Palette size={24} className="text-purple-600" />
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Appearance
                </h2>
                <p className="text-sm text-gray-500">
                  Customize chat appearance
                </p>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Theme */}
              <div className="py-3 border-b border-gray-100 last:border-0">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Theme
                </label>
                <select
                  value={settings.theme}
                  onChange={(e) => handleSelectChange("theme", e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 text-gray-900 px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="auto">System (Auto)</option>
                </select>
              </div>

              {/* Auto Scroll */}
              <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                <div>
                  <p className="font-medium text-gray-900">Auto-scroll to new</p>
                  <p className="text-sm text-gray-500">
                    Automatically scroll to latest message
                  </p>
                </div>
                <label className="relative inline-flex cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.autoScroll}
                    onChange={() => handleToggle("autoScroll")}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Privacy & Data Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
              <Lock size={24} className="text-red-600" />
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Privacy & Data
                </h2>
                <p className="text-sm text-gray-500">
                  Manage your data and cache
                </p>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Clear Cache */}
              <div className="py-3 border-b border-gray-100 last:border-0">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 flex items-center gap-2">
                      <Trash2 size={18} />
                      Clear cache
                    </p>
                    <p className="text-sm text-gray-500">
                      Remove locally stored messages and cache
                    </p>
                  </div>
                  <button
                    onClick={handleClearCache}
                    className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-sm font-medium transition-colors"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Help Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
              <HelpCircle size={24} className="text-green-600" />
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Help</h2>
                <p className="text-sm text-gray-500">
                  Information and keyboard shortcuts
                </p>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">
                  Keyboard Shortcuts
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-700">Search conversations</span>
                    <kbd className="px-2 py-1 bg-gray-100 rounded border border-gray-300">
                      Ctrl + K
                    </kbd>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Send message</span>
                    <kbd className="px-2 py-1 bg-gray-100 rounded border border-gray-300">
                      Enter
                    </kbd>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">New line</span>
                    <kbd className="px-2 py-1 bg-gray-100 rounded border border-gray-300">
                      Shift + Enter
                    </kbd>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-500">
                  Version 1.0 • Last updated {new Date().toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex gap-3 mt-8 sticky bottom-6">
          <button
            onClick={() => router.back()}
            className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveSettings}
            className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors shadow-sm"
          >
            Save Settings
          </button>
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <div
          className={`fixed bottom-4 right-4 shadow-lg px-4 py-3 rounded-xl flex items-center gap-2 z-50 text-sm font-medium animate-fade-in ${
            saveSuccessful
              ? "bg-green-600 text-white"
              : "bg-gray-900 text-white"
          }`}
        >
          {notification}
        </div>
      )}
    </div>
  );
}
