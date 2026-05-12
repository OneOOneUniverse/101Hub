/**
 * Module-level singleton toast dispatcher.
 * Components that cannot use React context (e.g. deep utility components)
 * can call toast.success() / toast.error() directly and the AppToaster will
 * render them.
 */

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  duration?: number; // ms — defaults vary by type
}

export interface ConfirmItem {
  id: string;
  message: string;
  resolve: (yes: boolean) => void;
}

type ToastDispatch = (item: ToastItem) => void;
type ConfirmDispatch = (item: ConfirmItem) => void;

let _toastDispatch: ToastDispatch | null = null;
let _confirmDispatch: ConfirmDispatch | null = null;

export function setToastDispatch(fn: ToastDispatch) {
  _toastDispatch = fn;
}

export function setConfirmDispatch(fn: ConfirmDispatch) {
  _confirmDispatch = fn;
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export const toast = {
  success(message: string, duration = 4000) {
    _toastDispatch?.({ id: uid(), type: "success", message, duration });
  },
  error(message: string, duration = 6000) {
    _toastDispatch?.({ id: uid(), type: "error", message, duration });
  },
  warning(message: string, duration = 5000) {
    _toastDispatch?.({ id: uid(), type: "warning", message, duration });
  },
  info(message: string, duration = 4000) {
    _toastDispatch?.({ id: uid(), type: "info", message, duration });
  },
  /** Returns a Promise<boolean> that resolves when the user clicks Yes or No */
  confirm(message: string): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      if (!_confirmDispatch) {
        // Fallback if AppToaster hasn't mounted yet
        resolve(window.confirm(message));
        return;
      }
      _confirmDispatch({ id: uid(), message, resolve });
    });
  },
};
