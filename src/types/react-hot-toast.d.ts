declare module "react-hot-toast" {
  import { ReactNode } from "react";
  export type Toast = {
    id: string;
    type: "success" | "error" | "loading" | "blank";
    message: string;
  };
      interface ToastFn {
    (message?: string, opts?: any): string;
    success(message?: string, opts?: any): string;
    error(message?: string, opts?: any): string;
    loading(message?: string, opts?: any): string;
    dismiss(id?: string): void;
  }
  export const toast: ToastFn;
  export default toast;
  export const Toaster: (props?: any) => ReactNode;
}
