export type FlutterwaveInlineCheckout = {
  public_key: string;
  reference: string;
  amount: number;
  currency: string;
  customer: {
    email: string;
    name: string;
    phone_number?: string;
  };
  payment_options?: string;
  description: string;
};

export type FlutterwaveCallback = {
  status?: string;
  transaction_id?: number | string;
  tx_ref?: string;
};

type FlutterwaveInlineOptions = {
  public_key: string;
  tx_ref: string;
  amount: number;
  currency: string;
  customer: FlutterwaveInlineCheckout['customer'];
  payment_options?: string;
  customizations: {
    title: string;
    description: string;
  };
  callback: (response: FlutterwaveCallback) => void;
  onclose: () => void;
};

declare global {
  interface Window {
    FlutterwaveCheckout?: (options: FlutterwaveInlineOptions) => void;
  }
}

let flutterwaveScript: Promise<void> | undefined;

function formatCheckoutAmount(checkout: FlutterwaveInlineCheckout): string {
  if (/^[A-Z]{3}$/.test(checkout.currency)) {
    return new Intl.NumberFormat('en', {
      style: 'currency',
      currency: checkout.currency,
      maximumFractionDigits: 2,
    }).format(checkout.amount);
  }
  return `${checkout.amount.toFixed(2)} ${checkout.currency}`;
}

function requestPaymentPhone(checkout: FlutterwaveInlineCheckout): Promise<string | null> {
  return new Promise((resolve) => {
    const dialog = document.createElement('dialog');
    dialog.className = 'm-auto w-[min(92vw,28rem)] max-w-none rounded-2xl border border-slate-200 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/60';

    const panel = document.createElement('div');
    panel.className = 'overflow-hidden rounded-2xl';

    const header = document.createElement('div');
    header.className = 'bg-slate-950 px-6 py-5 text-white';
    const brand = document.createElement('p');
    brand.className = 'text-xs font-black uppercase tracking-[0.18em] text-amber-300';
    brand.textContent = 'Rhema secure payment';
    const heading = document.createElement('h2');
    heading.className = 'mt-2 text-xl font-black';
    heading.id = 'rhema-payment-dialog-title';
    heading.textContent = 'Confirm payment details';
    const description = document.createElement('p');
    description.className = 'mt-1 text-sm leading-5 text-slate-300';
    description.textContent = checkout.description;
    header.append(brand, heading, description);

    const form = document.createElement('form');
    form.className = 'space-y-5 p-6';
    const amountPanel = document.createElement('div');
    amountPanel.className = 'rounded-xl border border-slate-200 bg-slate-50 p-4';
    const amountLabel = document.createElement('p');
    amountLabel.className = 'text-xs font-bold uppercase tracking-wider text-slate-500';
    amountLabel.textContent = 'Amount to pay';
    const amountValue = document.createElement('p');
    amountValue.className = 'mt-1 text-2xl font-black text-slate-950';
    amountValue.textContent = formatCheckoutAmount(checkout);
    amountPanel.append(amountLabel, amountValue);

    const phoneLabel = document.createElement('label');
    phoneLabel.className = 'block text-sm font-bold text-slate-800';
    phoneLabel.htmlFor = 'rhema-payment-phone';
    phoneLabel.textContent = 'Mobile Money phone number';
    const phoneInput = document.createElement('input');
    phoneInput.id = 'rhema-payment-phone';
    phoneInput.name = 'phone';
    phoneInput.type = 'tel';
    phoneInput.inputMode = 'tel';
    phoneInput.autocomplete = 'tel';
    phoneInput.required = true;
    phoneInput.maxLength = 20;
    phoneInput.placeholder = '+260…';
    phoneInput.value = checkout.customer.phone_number ?? '';
    phoneInput.className = 'mt-2 w-full rounded-xl border border-slate-300 px-3 py-3 text-base font-medium outline-none transition focus:border-red-700 focus:ring-2 focus:ring-red-100';
    phoneLabel.append(phoneInput);

    const helper = document.createElement('p');
    helper.className = 'text-xs leading-5 text-slate-600';
    helper.textContent = 'Continue to Flutterwave’s secure payment window to select your method and complete any wallet or bank verification. Enter any OTP there; Rhema will never ask you to share it in this form.';

    const error = document.createElement('p');
    error.className = 'hidden rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800';
    error.setAttribute('role', 'alert');

    const actions = document.createElement('div');
    actions.className = 'flex flex-col-reverse gap-2 sm:flex-row sm:justify-end';
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50';
    cancel.textContent = 'Cancel';
    const continueButton = document.createElement('button');
    continueButton.type = 'submit';
    continueButton.className = 'rounded-xl bg-red-700 px-4 py-3 text-sm font-black text-white transition hover:bg-red-800';
    continueButton.textContent = 'Continue securely';
    actions.append(cancel, continueButton);
    form.append(amountPanel, phoneLabel, helper, error, actions);
    panel.append(header, form);
    dialog.append(panel);
    dialog.setAttribute('aria-labelledby', heading.id);
    document.body.append(dialog);

    let settled = false;
    const finish = (phone: string | null) => {
      if (settled) return;
      settled = true;
      dialog.removeEventListener('cancel', handleCancel);
      dialog.removeEventListener('close', handleClose);
      form.removeEventListener('submit', handleSubmit);
      cancel.removeEventListener('click', handleCancel);
      dialog.remove();
      resolve(phone);
    };
    const handleCancel = () => {
      if (dialog.open) dialog.close();
      finish(null);
    };
    const handleClose = () => finish(null);
    const handleSubmit = (event: SubmitEvent) => {
      event.preventDefault();
      const normalizedPhone = phoneInput.value.replace(/[()\s.-]/g, '');
      if (!/^\+?\d{8,15}$/.test(normalizedPhone)) {
        error.textContent = 'Enter a valid phone number with country code if required.';
        error.classList.remove('hidden');
        phoneInput.focus();
        return;
      }
      finish(normalizedPhone);
    };

    dialog.addEventListener('cancel', handleCancel);
    dialog.addEventListener('close', handleClose);
    form.addEventListener('submit', handleSubmit);
    cancel.addEventListener('click', handleCancel);
    dialog.showModal();
    phoneInput.focus();
  });
}

function loadFlutterwaveInline(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Flutterwave checkout can only be opened in a browser.'));
  }
  if (window.FlutterwaveCheckout) return Promise.resolve();
  if (!flutterwaveScript) {
    flutterwaveScript = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.flutterwave.com/v3.js';
      script.async = true;
      script.onload = () => {
        if (window.FlutterwaveCheckout) resolve();
        else {
          flutterwaveScript = undefined;
          script.remove();
          reject(new Error('Flutterwave checkout did not initialize.'));
        }
      };
      script.onerror = () => {
        flutterwaveScript = undefined;
        script.remove();
        reject(new Error('Unable to load Flutterwave checkout. Check your connection and try again.'));
      };
      document.head.appendChild(script);
    });
  }
  return flutterwaveScript;
}

export async function openFlutterwaveInlineCheckout(
  checkout: FlutterwaveInlineCheckout,
  onSuccess: (response: FlutterwaveCallback) => void,
  onClose: () => void,
): Promise<void> {
  if (!checkout.public_key || !checkout.reference || !checkout.customer.email) {
    throw new Error('Flutterwave checkout is missing required payment details.');
  }
  if (!Number.isFinite(checkout.amount) || checkout.amount <= 0) {
    throw new Error('The payment amount must be greater than zero.');
  }

  const enteredPhone = await requestPaymentPhone(checkout);
  if (!enteredPhone) {
    onClose();
    return;
  }

  await loadFlutterwaveInline();
  if (!window.FlutterwaveCheckout) {
    throw new Error('Flutterwave checkout is unavailable. Please try again.');
  }

  let callbackReceived = false;
  checkout.customer.phone_number = enteredPhone;
  window.FlutterwaveCheckout({
    public_key: checkout.public_key,
    tx_ref: checkout.reference,
    amount: checkout.amount,
    currency: checkout.currency,
    customer: checkout.customer,
    ...(checkout.payment_options ? { payment_options: checkout.payment_options } : {}),
    customizations: {
      title: 'Rhema Bible School',
      description: checkout.description,
    },
    callback: (response) => {
      callbackReceived = true;
      onSuccess(response);
    },
    onclose: () => {
      if (!callbackReceived) onClose();
    },
  });
}
