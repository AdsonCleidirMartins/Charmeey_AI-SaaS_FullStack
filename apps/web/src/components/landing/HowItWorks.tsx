import { Upload, MessageSquareText, Share2 } from 'lucide-react';
import SectionHeader from './SectionHeader';

const steps = [
  {
    icon: Upload,
    title: 'Bring your data',
    text: 'Upload a CSV, connect Google Drive or a database, or just start typing a question.',
  },
  {
    icon: MessageSquareText,
    title: 'Ask in plain English',
    text: 'CharmeeyAI profiles the data, finds trends and outliers, and answers with charts you can tweak.',
  },
  {
    icon: Share2,
    title: 'Share & act',
    text: 'Save templates, export reports and invite teammates — with roles, usage limits and an audit trail.',
  },
];

export default function HowItWorks() {
  return (
    <section id="how" className="relative py-14 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeader eyebrow="How it works" title="From question to decision in minutes" />
        <ol className="relative mt-12 sm:mt-16 grid gap-4 md:grid-cols-3">
          <div className="absolute left-0 right-0 top-10 hidden md:block h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" aria-hidden />
          {steps.map((s, i) => (
            <li key={s.title} className="relative surface rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white shadow-lg shadow-brand-600/30">
                  <s.icon className="h-5 w-5" />
                </span>
                <span className="font-mono text-xs text-white/30">0{i + 1}</span>
              </div>
              <h3 className="mt-5 text-base font-semibold text-white">{s.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-white/55">{s.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
