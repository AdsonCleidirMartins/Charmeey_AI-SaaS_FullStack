import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export default function FinalCta() {
  const navigate = useNavigate();
  return (
    <section className="relative py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 to-[#0b3d6e] px-6 py-12 sm:px-12 sm:py-16 text-center">
          <div className="absolute inset-0 bg-grid opacity-30" aria-hidden />
          <div className="absolute -top-24 left-1/2 h-64 w-[600px] -translate-x-1/2 rounded-full blur-3xl" style={{ background: 'rgba(255,255,255,0.18)' }} aria-hidden />
          <div className="relative">
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white text-balance">Start asking your data questions today</h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-white/80">
              Free for individuals. Pro trial for teams. Your workspace is ready in under two minutes.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
              <button
                onClick={() => navigate('/auth?mode=signup')}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-6 text-sm font-semibold text-[#0b3d6e] hover:bg-white/90 transition-colors"
              >
                Create free account
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="inline-flex h-12 items-center justify-center rounded-xl border border-white/30 px-6 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
              >
                Explore the demo
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
