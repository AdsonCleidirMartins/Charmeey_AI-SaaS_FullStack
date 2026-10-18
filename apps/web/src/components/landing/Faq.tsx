import { useState } from 'react';
import { Plus } from 'lucide-react';
import { faqs } from '@/lib/saasData';
import SectionHeader from './SectionHeader';

export default function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="relative py-14 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 grid gap-10 lg:grid-cols-[1fr_1.4fr]">
        <div>
          <SectionHeader
            align="left"
            eyebrow="FAQ"
            title="Questions, answered"
            description="Can’t find what you need? Our team replies within four business hours."
          />
        </div>
        <ul className="divide-y divide-white/[0.07] border-y border-white/[0.07]">
          {faqs.map((f, i) => {
            const isOpen = open === i;
            return (
              <li key={f.q}>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-6 py-5 text-left text-[15px] font-medium text-white hover:text-white/80"
                >
                  {f.q}
                  <Plus className={`h-4 w-4 shrink-0 text-white/40 transition-transform duration-200 ${isOpen ? 'rotate-45' : ''}`} />
                </button>
                {isOpen && <p className="-mt-1 pb-5 pr-10 text-sm leading-relaxed text-white/55">{f.a}</p>}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
