"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CircleCheckBig, CircleAlert, X } from "lucide-react";

type AlertType = "success" | "error";
type AlertVariant = AlertType | "";

type CustomAlertProps = {
  type?: AlertVariant;
  title: string;
  message: string;
  onClose?: () => void;
};

export default function CustomAlert({ type = "success", title, message, onClose }: CustomAlertProps) {
  const resolvedType: AlertType = type === "error" ? "error" : "success";

  const styles: Record<
    AlertType,
    {
      icon: typeof CircleAlert | typeof CircleCheckBig;
      border: string;
      iconWrap: string;
      title: string;
      text: string;
    }
  > = {
    success: {
      icon: CircleCheckBig,
      border: "border-emerald-200 bg-emerald-50",
      iconWrap: "bg-emerald-500",
      title: "text-emerald-900",
      text: "text-emerald-700",
    },
    error: {
      icon: CircleAlert,
      border: "border-red-200 bg-red-50",
      iconWrap: "bg-red-500",
      title: "text-red-900",
      text: "text-red-700",
    },
  };

  const config = styles[resolvedType];
  const Icon = config.icon;

  return (
    <AnimatePresence>
      {message ? (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.98 }}
          transition={{ duration: 0.25 }}
          className={`mt-6 flex items-start gap-3 rounded-2xl border p-4 shadow-sm ${config.border}`}
        >
          <div className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-full text-white ${config.iconWrap}`}>
            <Icon size={16} />
          </div>

          <div className="flex-1">
            <p className={`font-semibold ${config.title}`}>{title}</p>
            <p className={`mt-1 text-sm ${config.text}`}>{message}</p>
          </div>

          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1 text-slate-500 transition hover:bg-white/80 hover:text-slate-700"
              aria-label="Dismiss alert"
            >
              <X size={16} />
            </button>
          ) : null}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
