import { useNavigate } from 'react-router-dom';
import { ArrowRight, Check, Play } from 'lucide-react';
import ProductPreview from '@/components/landing/ProductPreview';

const assurances = ['Free plan forever', 'No credit card', 'Set up in 2 minutes'];

export default function Hero() {
  const navigate = useNavigate();
  return (
    <section id="product" className="relative overflow-hidden pt-28 sm:pt-36 pb-16 sm:pb-24">
      <div className="absolute inset-0 bg-grid mask-fade-b opacity-50" aria-hidden />
      <div className="absolute left-1/2 top-0 h-[480px] w-[min(900px,100vw)] -translate-x-1/2 rounded-full bg-brand-600/20 blur-[120px]" aria-hidden />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <a
            href="#features"
            className="group inline-flex items-center gap-2 rounded-full surface-muted py-1 pl-1 pr-3 text-xs font-medium text-white/70 hover:text-white transition-colors animate-fade-down"
          >
            <span className="rounded-full bg-brand-600 px-2 py-0.5 text-[11px] font-semibold text-white">New</span>
            Data Studio is live
            <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
          </a>

          <h1 className="mt-6 text-[2.6rem] leading-[1.05] sm:text-6xl lg:text-7xl font-semibold tracking-tight text-white text-balance animate-fade-up">
            Ask your data <span className="text-brand-gradient">anything.</span>
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-base sm:text-lg text-white/60 text-pretty animate-fade-up" style={{ animationDelay: '0.08s' }}>
            CharmeeyAI is the AI workspace for modern teams — chat with Gemini, turn spreadsheets into charts and insights,
            and keep usage, members and billing in one place.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 animate-fade-up" style={{ animationDelay: '0.16s' }}>
            <button
              onClick={() => navigate('/auth?mode=signup')}
              className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 text-sm font-semibold text-white shadow-lg shadow-brand-600/30 hover:bg-brand-500 transition-colors"
            >
              Start free
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl surface-muted px-6 text-sm font-semibold text-white hover:bg-white/5 transition-colors"
            >
              <Play className="h-4 w-4 text-brand-400" />
              Try the live demo
            </button>
          </div>

          <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-white/45">
            {assurances.map((a) => (
              <li key={a} className="inline-flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-brand-400" />
                {a}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-14 sm:mt-20 animate-fade-up" style={{ animationDelay: '0.24s' }}>
          <ProductPreview />
        </div>
      </div>
    </section>
  );
}
