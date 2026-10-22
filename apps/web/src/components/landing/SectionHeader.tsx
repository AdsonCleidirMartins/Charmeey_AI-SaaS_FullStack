import type { ReactNode } from 'react';

export default function SectionHeader({
  eyebrow,
  title,
  description,
  align = 'center',
}: {
  eyebrow: string;
  title: ReactNode;
  description?: string;
  align?: 'center' | 'left';
}) {
  return (
    <div className={`max-w-2xl ${align === 'center' ? 'mx-auto text-center' : ''}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-400">{eyebrow}</p>
      <h2 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-tight text-white text-balance">{title}</h2>
      {description && <p className="mt-4 text-base sm:text-lg text-white/55 text-pretty">{description}</p>}
    </div>
  );
}
