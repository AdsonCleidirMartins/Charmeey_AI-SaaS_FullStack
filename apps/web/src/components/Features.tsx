import {
  Workflow,
  BarChart3,
  MessageSquareCode,
  ShieldCheck,
  Zap,
  GitBranch,
} from 'lucide-react';

const features = [
  {
    icon: Workflow,
    title: 'Automated Workflows',
    desc: 'Build multi-step AI pipelines with visual orchestration. Chain prompts, conditions, and API calls without writing glue code.',
    tag: 'Visual Builder',
  },
  {
    icon: BarChart3,
    title: 'Real-time Analytics',
    desc: 'Track token usage, latency, cost, and quality metrics across every call. Dashboards update live as your prompts execute.',
    tag: 'Live Metrics',
  },
  {
    icon: MessageSquareCode,
    title: 'Custom Prompts',
    desc: 'Version-controlled prompt templates with A/B testing, variables, and conditional logic. Roll back instantly when needed.',
    tag: 'Versioned',
  },
  {
    icon: ShieldCheck,
    title: 'Enterprise Security',
    desc: 'SOC 2 Type II, GDPR, and HIPAA compliant. End-to-end encryption, SSO, granular RBAC, and audit logs out of the box.',
    tag: 'SOC 2',
  },
  {
    icon: Zap,
    title: 'Lightning Fast',
    desc: 'Sub-200ms inference with our global edge network. Streaming responses keep your users engaged from the first token.',
    tag: '<200ms',
  },
  {
    icon: GitBranch,
    title: 'Version Control',
    desc: 'Every prompt, workflow, and config is versioned. Review changes, create branches, and deploy with confidence.',
    tag: 'Git-like',
  },
];

export default function Features() {
  return (
    <section id="features" className="relative py-24 overflow-hidden">
      <div className="absolute top-1/2 left-0 w-[600px] h-[600px] bg-brand-600/5 rounded-full blur-[120px] -translate-y-1/2" />

      <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="max-w-2xl mb-16">
          <div className="inline-flex items-center gap-2 rounded-full glass px-3 py-1 mb-4">
            <span className="text-xs font-medium text-brand-400">Platform</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Everything you need to ship
            <span className="text-brand-gradient"> AI products</span>
          </h2>
          <p className="mt-4 text-white/50 text-lg">
            A complete toolkit for building, testing, and scaling AI-powered features — from prototype to production.
          </p>
        </div>

        {/* Editorial feature list */}
        <div className="divide-y divide-white/[0.06]">
          {features.map((feature, i) => (
            <div
              key={feature.title}
              className="group grid sm:grid-cols-[64px_1fr] gap-x-6 gap-y-3 py-8 transition-colors hover:bg-white/[0.02] sm:px-4 sm:-mx-4 rounded-xl"
            >
              <div className="flex items-start justify-between sm:block">
                <span className="font-mono text-sm text-white/25 group-hover:text-brand-400/70 transition-colors">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <feature.icon className="h-5 w-5 text-white/30 group-hover:text-brand-400 transition-colors" strokeWidth={1.8} />
              </div>
              <div>
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-1.5">
                  <h3 className="text-lg font-semibold text-white">{feature.title}</h3>
                  <span className="text-[10px] font-mono font-medium text-brand-400/80 uppercase tracking-wider">
                    {feature.tag}
                  </span>
                </div>
                <p className="text-sm text-white/50 leading-relaxed max-w-2xl">{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}