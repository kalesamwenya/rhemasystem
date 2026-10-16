import Link from 'next/link';
import { CircleHelp } from 'lucide-react';

type UnavailableFeatureProps = {
  title: string;
  description: string;
  href?: string;
  linkText?: string;
};

export default function UnavailableFeature({ title, description, href, linkText }: UnavailableFeatureProps) {
  return (
    <main className="mx-auto max-w-3xl space-y-5">
      <header>
        <h1 className="text-2xl font-black text-slate-900">{title}</h1>
      </header>
      <section className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <CircleHelp className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />
        <div>
          <p className="text-sm leading-6 text-slate-600">{description}</p>
          {href && linkText && <Link href={href} className="mt-4 inline-block text-sm font-semibold text-blue-800 hover:underline">{linkText}</Link>}
        </div>
      </section>
    </main>
  );
}
