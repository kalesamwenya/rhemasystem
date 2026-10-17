export type FlutterwaveInlineCheckout = {
  public_key: string;
  reference: string;
  amount: number;
  currency: string;
  customer: {
    email: string;
    name: string;
  };
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
  await loadFlutterwaveInline();
  if (!window.FlutterwaveCheckout) {
    throw new Error('Flutterwave checkout is unavailable. Please try again.');
  }

  let callbackReceived = false;
  window.FlutterwaveCheckout({
    public_key: checkout.public_key,
    tx_ref: checkout.reference,
    amount: checkout.amount,
    currency: checkout.currency,
    customer: checkout.customer,
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
