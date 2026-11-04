'use client';

import { useEffect } from 'react';
import Swal from 'sweetalert2';
import type { AppAlertRequest, AppConfirmRequest } from '@/components/ui/app-dialogs';

type DialogJob =
  | { kind: 'alert'; request: AppAlertRequest }
  | { kind: 'confirm'; request: AppConfirmRequest };

const dialogClasses = {
  popup: 'rhema-swal-popup',
  title: 'rhema-swal-title',
  htmlContainer: 'rhema-swal-message',
  confirmButton: 'rhema-swal-confirm',
  cancelButton: 'rhema-swal-cancel',
  closeButton: 'rhema-swal-close',
};

export default function AlertProvider() {
  useEffect(() => {
    const queue: DialogJob[] = [];
    let isShowing = false;
    let isDisposed = false;

    const processQueue = async () => {
      if (isShowing || isDisposed) return;
      isShowing = true;
      try {
        while (queue.length && !isDisposed) {
          const job = queue.shift();
          if (!job) continue;

          try {
            if (job.kind === 'alert') {
              const { request } = job;
              await Swal.fire({
                title: request.options.title ?? defaultTitle(request.options.icon),
                text: request.message,
                icon: request.options.icon ?? 'info',
                confirmButtonText: request.options.confirmText ?? 'Got it',
                showCloseButton: true,
                buttonsStyling: false,
                customClass: dialogClasses,
                heightAuto: false,
                focusConfirm: true,
              });
              request.resolve();
            } else {
              const { request } = job;
              const result = await Swal.fire({
                title: request.options.title ?? 'Please confirm',
                text: request.message,
                icon: request.options.tone === 'danger' ? 'warning' : 'question',
                showCancelButton: true,
                confirmButtonText: request.options.confirmText ?? 'Continue',
                cancelButtonText: request.options.cancelText ?? 'Cancel',
                reverseButtons: true,
                buttonsStyling: false,
                customClass: {
                  ...dialogClasses,
                  confirmButton: request.options.tone === 'danger'
                    ? 'rhema-swal-confirm rhema-swal-confirm-danger'
                    : dialogClasses.confirmButton,
                },
                heightAuto: false,
                focusCancel: true,
              });
              request.resolve(result.isConfirmed);
            }
          } catch (error) {
            console.error('A notification dialog could not be displayed.', error);
            if (job.kind === 'confirm') job.request.resolve(false);
            else job.request.resolve();
          }
        }
      } finally {
        isShowing = false;
        if (queue.length && !isDisposed) void processQueue();
      }
    };

    const onAlert = (event: Event) => {
      queue.push({ kind: 'alert', request: (event as CustomEvent<AppAlertRequest>).detail });
      void processQueue();
    };
    const onConfirm = (event: Event) => {
      queue.push({ kind: 'confirm', request: (event as CustomEvent<AppConfirmRequest>).detail });
      void processQueue();
    };
    const originalAlert = window.alert;
    const interceptedAlert: typeof window.alert = (message?: string) => {
      window.dispatchEvent(new CustomEvent<AppAlertRequest>('rhema-app-alert', {
        detail: { message: String(message ?? ''), options: {}, resolve: () => undefined },
      }));
    };

    window.alert = interceptedAlert;
    window.addEventListener('rhema-app-alert', onAlert);
    window.addEventListener('rhema-app-confirm', onConfirm);

    return () => {
      isDisposed = true;
      if (window.alert === interceptedAlert) window.alert = originalAlert;
      window.removeEventListener('rhema-app-alert', onAlert);
      window.removeEventListener('rhema-app-confirm', onConfirm);
      queue.splice(0).forEach((job) => {
        if (job.kind === 'confirm') job.request.resolve(false);
        else job.request.resolve();
      });
      Swal.close();
    };
  }, []);

  return null;
}

function defaultTitle(icon: AppAlertRequest['options']['icon']): string {
  switch (icon) {
    case 'success': return 'Done';
    case 'error': return 'Something went wrong';
    case 'warning': return 'Please check';
    default: return 'Information';
  }
}
