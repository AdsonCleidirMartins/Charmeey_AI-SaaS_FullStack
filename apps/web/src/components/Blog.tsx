import { ArrowUpRight } from 'lucide-react';

const featured = {
  category: 'Product',
  title: 'A faster way to ship AI features without the plumbing',
  excerpt:
    'Move from prototype to production in days, not months. We open-sourced our internal prompt orchestration layer and it changes how teams ship Gemini-powered products.',
  date: 'Jun 18, 2026',
  readTime: '6 min read',
};

const posts = [
  {
    category: 'Engineering',
    title: 'How we reduced Gemini response latency by 62%',
    excerpt: 'Streaming, prompt caching, and model routing — the three levers that mattered.',
    date: 'Jun 04, 2026',
    readTime: '8 min read',
  },
  {
    category: 'Design',
    title: 'Designing chat interfaces humans actually trust',
    excerpt: 'Trust is earned in the first three seconds. Here is our checklist for AI UX.',
    date: 'May 22, 2026',
    readTime: '5 min read',
  },
  {
    category: 'Community',
    title: 'Introducing the CharmeeyAI community chat room',
    excerpt: 'Real-time conversations between builders, right inside the dashboard.',
    date: 'May 09, 2026',
    readTime: '3 min read',
  },
  {
    category: 'Playbook',
    title: 'The demo that converts: a template for AI SaaS launches',
    excerpt: 'Open the product before the pricing page. Confirmed by our own 3.2x lift.',
    date: 'Apr 27, 2026',
    readTime: '7 min read',
  },
];

export default function Blog() {
  return (
    <section id="blog" className="relative py-24 overflow-hidden">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-violet-600/5 rounded-full blur-[120px]" />

      <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="max-w-2xl mb-16">
          <div className="inline-flex items-center gap-2 rounded-full glass px-3 py-1 mb-4">
            <span className="text-xs font-medium text-brand-400">Blog</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Ideas from the <span className="text-brand-gradient">builders</span>
          </h2>
          <p className="mt-4 text-white/50 text-lg">
            Notes on shipping AI products, running a community, and lessons we learn along the way.
          </p>
        </div>

        {/* Featured story */}
        <a
          href="#"
          className="group grid lg:grid-cols-2 gap-8 lg:gap-14 items-center py-10 border-t border-white/[0.06]"
        >
          <div className="space-y-4">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-brand-400">
              {featured.category}
            </span>
            <h3 className="text-2xl sm:text-3xl font-bold text-white leading-tight group-hover:text-brand-300 transition-colors">
              {featured.title}
            </h3>
            <p className="text-sm sm:text-base text-white/50 leading-relaxed">{featured.excerpt}</p>
            <div className="flex items-center gap-3 text-xs text-white/35">
              <span>{featured.date}</span>
              <span className="h-1 w-1 rounded-full bg-white/20" />
              <span>{featured.readTime}</span>
            </div>
          </div>
          <div className="relative">
            <div className="aspect-[16/10] w-full rounded-2xl overflow-hidden">
              <div className="h-full w-full bg-gradient-to-br from-brand-600/40 via-violet-600/30 to-transparent relative">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\'40\' height=\'40\' viewBox=\'0 0 40 40\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' stroke=\'white\' stroke-opacity=\'0.06\'%3E%3Cpath d=\'M0 40L40 0M40 40L0 0\'/%3E%3C/g%3E%3C/svg%3E')]" />
              </div>
            </div>
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full glass-strong text-white/70 group-hover:text-white group-hover:scale-110 transition-all">
                <ArrowUpRight className="h-5 w-5" />
              </span>
            </span>
          </div>
        </a>

        {/* Story list */}
        <div className="grid sm:grid-cols-2 gap-x-10 gap-y-12 py-10">
          {posts.map((post) => (
            <a key={post.title} href="#" className="group border-t border-white/[0.06] pt-6">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-white/35 group-hover:text-brand-400 transition-colors">
                {post.category}
              </span>
              <h4 className="mt-3 text-lg font-semibold text-white leading-snug group-hover:text-brand-300 transition-colors">
                {post.title}
              </h4>
              <p className="mt-2 text-sm text-white/50 leading-relaxed">{post.excerpt}</p>
              <div className="mt-3 flex items-center gap-3 text-xs text-white/35">
                <span>{post.date}</span>
                <span className="h-1 w-1 rounded-full bg-white/20" />
                <span>{post.readTime}</span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}