"use client";

import { toast } from "react-hot-toast";

export type ToastType = "success" | "error" | "loading";

export function showToast(type: ToastType, message: string) {
  switch (type) {
    case "success":
      toast.success(message);
      break;
    case "error":
      toast.error(message);
      break;
    case "loading":
      toast.loading(message);
      break;
    default:
      toast(message);
  }
}
