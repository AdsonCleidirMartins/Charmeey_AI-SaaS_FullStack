import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Sparkles, ArrowRight } from 'lucide-react';
import SectionHeader from '@/components/landing/SectionHeader';

type BillingCycle = 'monthly' | 'annual';

const plans = [
  {
    name: 'Starter',
    desc: 'For individuals exploring AI development',
    monthly: 0,
    annual: 0,
    highlighted: false,
    cta: 'Start Free',
    features: [
      '1,000 messages / month',
      'Powered by Gemini',
      'Community support',
      'Data Studio (5 uploads / month)',
      'Basic usage analytics',
      '3 prompt templates',
      '1 project workspace',
    ],
  },
  {
    name: 'Pro',
    desc: 'For teams building AI-powered products',
    monthly: 49,
    annual: 39,
    highlighted: true,
    cta: 'Start 14-Day Trial',
    features: [
      '50,000 messages / month',
      'Priority AI responses',
      'Priority support (8h SLA)',
      'Unlimited Data Studio uploads',
      'Advanced analytics & CSV export',
      'Unlimited prompt templates',
      '10 project workspaces',
      'Custom workflows & pipelines',
      'Team collaboration (5 seats)',
    ],
  },
  {
    name: 'Enterprise',
    desc: 'For organizations at scale',
    monthly: null,
    annual: null,
    highlighted: false,
    cta: 'Contact Sales',
    features: [
      'Unlimited API calls',
      'Dedicated infrastructure',
      '24/7 dedicated support (1h SLA)',
      'Custom model fine-tuning',
      'SSO, SAML & SCIM',
      'SOC 2, HIPAA & GDPR',
      'On-premise deployment option',
      'Unlimited seats',
      'Custom SLAs & contracts',
    ],
  },
];

export default function Pricing() {
  const navigate = useNavigate();
  const [billing, setBilling] = useState<BillingCycle>('monthly');

  return (
    <section id="pricing" className="relative py-14 sm:py-28">
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Pricing"
          title="Simple pricing that scales with your team"
          description="Start free, upgrade when you need more. No hidden fees, cancel anytime."
        />

        {/* Billing toggle */}
        <div className="mt-8 flex items-center justify-center">
          <div className="inline-flex items-center rounded-full surface-muted p-1" role="group" aria-label="Billing cycle">
            {(['monthly', 'annual'] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setBilling(c)}
                aria-pressed={billing === c}
                className={`rounded-full px-4 py-1.5 text-sm font-medium capitalize transition-colors ${
                  billing === c ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white'
                }`}
              >
                {c}
                {c === 'annual' && <span className="ml-1.5 text-xs text-emerald-400">−20%</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Pricing cards */}
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {plans.map((plan) => {
            const price = billing === 'monthly' ? plan.monthly : plan.annual;
            return (
              <div
                key={plan.name}
                className={`relative flex flex-col rounded-2xl p-6 ${
                  plan.highlighted ? 'surface border-brand-500/50 ring-1 ring-brand-500/30 shadow-xl shadow-brand-900/20' : 'surface'
                }`}
              >
                {plan.highlighted && (
                  <span className="absolute -top-3 left-6 inline-flex items-center gap-1 rounded-full bg-brand-600 px-3 py-1 text-[11px] font-semibold text-white">
                    <Sparkles className="h-3 w-3" /> Most popular
                  </span>
                )}
                <h3 className="text-base font-semibold text-white">{plan.name}</h3>
                <p className="mt-1 text-sm text-white/50">{plan.desc}</p>

                <div className="mt-6 flex items-end gap-1">
                  {price === null ? (
                    <span className="text-4xl font-semibold tracking-tight text-white">Custom</span>
                  ) : (
                    <>
                      <span className="text-4xl font-semibold tracking-tight text-white">${price}</span>
                      <span className="mb-1 text-sm text-white/40">/ seat / mo</span>
                    </>
                  )}
                </div>
                <p className="mt-1 h-4 text-xs text-white/35">{billing === 'annual' && price ? 'Billed annually' : ''}</p>

                <button
                  onClick={() => navigate(plan.monthly === null ? '/dashboard/support' : '/auth?mode=signup')}
                  className={`mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-colors ${
                    plan.highlighted ? 'bg-brand-600 text-white hover:bg-brand-500' : 'surface-muted text-white hover:bg-white/5'
                  }`}
                >
                  {plan.cta}
                  <ArrowRight className="h-4 w-4" />
                </button>

                <ul className="mt-6 space-y-3 border-t border-white/[0.07] pt-6">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm text-white/65">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
