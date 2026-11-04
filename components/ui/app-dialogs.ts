export type AppAlertOptions = {
  title?: string;
  confirmText?: string;
  icon?: 'success' | 'error' | 'warning' | 'info';
};

export type AppAlertRequest = {
  message: string;
  options: AppAlertOptions;
  resolve: () => void;
};

export type AppConfirmOptions = {
  title?: string;
  confirmText?: string;
  cancelText?: string;
  tone?: 'danger' | 'default';
};

export type AppConfirmRequest = {
  message: string;
  options: AppConfirmOptions;
  resolve: (confirmed: boolean) => void;
};

/** Shows a shared, accessible SweetAlert dialog through the root provider. */
export function showAppAlert(message: string, options: AppAlertOptions = {}): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();

  return new Promise((resolve) => {
    window.dispatchEvent(new CustomEvent<AppAlertRequest>('rhema-app-alert', {
      detail: { message, options, resolve },
    }));
  });
}

/** Shows a queued confirmation dialog; server rendering safely defaults to cancel. */
export function confirmWithApp(message: string, options: AppConfirmOptions = {}): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);

  return new Promise((resolve) => {
    window.dispatchEvent(new CustomEvent<AppConfirmRequest>('rhema-app-confirm', {
      detail: { message, options, resolve },
    }));
  });
}
