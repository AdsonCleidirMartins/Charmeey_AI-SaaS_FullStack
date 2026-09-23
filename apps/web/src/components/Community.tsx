import { MessagesSquare } from 'lucide-react';
import RoomChat from '@/components/RoomChat';

export default function Community() {
  return (
    <section id="room" className="relative py-24 overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-brand-600/5 rounded-full blur-[130px]" />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="flex items-center justify-between gap-4 mb-8">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full glass px-3 py-1 mb-4">
              <span className="text-xs font-medium text-brand-400">Community</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Chat with the <span className="text-brand-gradient">community</span>
            </h2>
            <p className="mt-4 text-white/50 text-lg">
              A live room for builders, makers, and prompt engineers. Ask questions, share wins, and learn together.
            </p>
          </div>
          <a
            href="#room"
            className="hidden sm:inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition-all hover:shadow-brand-500/40"
          >
            <MessagesSquare className="h-4 w-4" />
            Join the chat
          </a>
        </div>

        {/* Live chat panel */}
        <RoomChat className="h-[560px] shadow-2xl shadow-black/40" />
      </div>
    </section>
  );
}