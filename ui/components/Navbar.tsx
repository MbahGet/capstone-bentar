'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, LayoutDashboard, MonitorCheck } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="fixed top-0 left-0 right-0 h-16 z-50 flex items-center px-6 gap-6 border-b border-[#1e2d4a] bg-[#0f1629]/95 backdrop-blur-sm">
      {/* Logo */}
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
          <Activity size={16} className="text-white" />
        </div>
        <div className="leading-none">
          <div className="text-white font-bold text-base tracking-widest">BENTAR</div>
          <div className="text-[#475569] text-[10px] tracking-wide uppercase">Manufacturing AI</div>
        </div>
      </div>

      {/* Nav tabs */}
      <div className="flex-1 flex justify-center">
        <div className="flex items-center gap-1 bg-[#141c2e] border border-[#1e2d4a] rounded-xl p-1">
          <Link
            href="/dashboard"
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
              pathname === '/dashboard'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-[#1a2540]'
            }`}
          >
            <LayoutDashboard size={14} />
            Dashboard
          </Link>
          <Link
            href="/monitor"
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
              pathname === '/monitor'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-[#1a2540]'
            }`}
          >
            <MonitorCheck size={14} />
            Monitor
          </Link>
        </div>
      </div>

      {/* System badge */}
      <div className="flex items-center gap-2 text-xs text-slate-500 shrink-0">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-dot-pulse" />
        <span>System Active</span>
      </div>
    </nav>
  );
}
