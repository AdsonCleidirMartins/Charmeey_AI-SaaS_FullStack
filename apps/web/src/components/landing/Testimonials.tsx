import { Star } from 'lucide-react';
import { Avatar } from '@/components/dashboard/ui';
import SectionHeader from './SectionHeader';

const stats = [
  { value: '12,000+', label: 'teams onboard' },
  { value: '38M', label: 'prompts / month' },
  { value: '62%', label: 'faster reporting' },
  { value: '4.9 / 5', label: 'average rating' },
];

// Sample quotes from fictional customers (portfolio demo)
const quotes = [
  {
    quote: 'We replaced a weekly two-hour reporting ritual with one Data Studio upload and a template. The charts are board-ready.',
    name: 'Elena Marsh',
    role: 'Head of Finance, Northwind',
  },
  {
    quote: 'Roles, audit log and usage limits meant security signed off in a day. The team just started using it.',
    name: 'Tunde Bakare',
    role: 'IT Lead, Vertexa',
  },
  {
    quote: 'Our support team drafts replies in seconds, and I can see exactly what it costs per seat in Analytics.',
    name: 'Mei Tanaka',
    role: 'Support Director, Lumina',
  },
];

export default function Testimonials() {
  return (
    <section id="customers" className="relative py-14 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeader eyebrow="Customers" title="Loved by teams that run on data" />

        <dl className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-px overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.07]">
          {stats.map((s) => (
            <div key={s.label} className="bg-ink-950 px-4 py-6 text-center">
              <dt className="text-xs text-white/45">{s.label}</dt>
              <dd className="mt-1 text-2xl sm:text-3xl font-semibold tracking-tight text-white">{s.value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {quotes.map((q) => (
            <figure key={q.name} className="surface rounded-2xl p-6 flex flex-col">
              <div className="flex gap-0.5 text-amber-400" aria-label="5 out of 5 stars">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star key={i} className="h-3.5 w-3.5 fill-current" />
                ))}
              </div>
              <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-white/75">“{q.quote}”</blockquote>
              <figcaption className="mt-5 flex items-center gap-3">
                <Avatar name={q.name} size={36} />
                <div>
                  <p className="text-sm font-medium text-white">{q.name}</p>
                  <p className="text-xs text-white/45">{q.role}</p>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
