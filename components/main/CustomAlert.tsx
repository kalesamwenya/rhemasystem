"use client";

import { useEffect, useRef } from "react";
import { showAppAlert } from "@/components/ui/app-dialogs";

type AlertType = "success" | "error";
type AlertVariant = AlertType | "";

type CustomAlertProps = {
  type?: AlertVariant;
  title: string;
  message: string;
  onClose?: () => void;
};

export default function CustomAlert({ type = "success", title, message, onClose }: CustomAlertProps) {
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!message) return;

    void showAppAlert(message, {
      title,
      icon: type === "error" ? "error" : "success",
    }).then(() => onCloseRef.current?.());
  }, [message, title, type]);

  return null;
}
