import { Hexagon, Triangle, Circle, Square, Diamond, Orbit } from 'lucide-react';

// Fictional companies for the portfolio demo
const logos = [
  { name: 'Northwind', icon: Hexagon },
  { name: 'Lumina', icon: Circle },
  { name: 'Vertexa', icon: Triangle },
  { name: 'Orbitly', icon: Orbit },
  { name: 'Kinetiq', icon: Square },
  { name: 'Halcyon', icon: Diamond },
];

export default function LogoStrip() {
  return (
    <section aria-label="Customers" className="relative py-10 sm:py-14">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <p className="text-center text-xs font-medium text-white/40">Trusted by data-driven teams at</p>
        <ul className="mt-6 grid grid-cols-3 sm:grid-cols-6 gap-x-6 gap-y-6">
          {logos.map((l) => (
            <li key={l.name} className="flex items-center justify-center gap-2 text-white/35">
              <l.icon className="h-4 w-4" strokeWidth={2.2} />
              <span className="text-sm sm:text-base font-semibold tracking-tight">{l.name}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
