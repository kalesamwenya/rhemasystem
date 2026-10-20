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

export function confirmWithApp(message: string, options: AppConfirmOptions = {}): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);

  return new Promise((resolve) => {
    window.dispatchEvent(new CustomEvent<AppConfirmRequest>('rhema-app-confirm', {
      detail: { message, options, resolve },
    }));
  });
}
