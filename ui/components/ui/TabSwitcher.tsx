/* eslint-disable @next/next/no-img-element */
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/dashboard', iconSrc: '/logo/factoryops-copilot-logo.svg', label: 'Chat',  size: 20 },
  { href: '/monitor',   iconSrc: '/icon/ic-chemistry-lab-instrument.svg', label: 'Labs', size: 18 },
] as const;

export default function TabSwitcher() {
  const pathname = usePathname();
  const activeIdx = Math.max(0, TABS.findIndex(t => pathname.startsWith(t.href)));

  return (
    <div className="relative flex items-center bg-[#0d1220] rounded-full p-1 border border-white/10 shadow-xl">
      {/* Sliding pill */}
      <div
        className="absolute inset-y-1 rounded-full bg-[#1e2d4a] border border-[#2d4275]/60 transition-all duration-300 ease-out"
        style={{
          width: 'calc(50% - 4px)',
          left: activeIdx === 0 ? '4px' : 'calc(50% + 0px)',
        }}
      />
      {TABS.map(({ href, iconSrc, label, size }, i) => (
        <Link
          key={href}
          href={href}
          aria-label={label}
          className="relative z-10 w-10 h-10 flex items-center justify-center rounded-full transition-opacity duration-200"
        >
          <img
            src={iconSrc}
            alt={label}
            width={size}
            height={size}
            className={`transition-opacity duration-200 ${activeIdx === i ? 'opacity-100' : 'opacity-35 hover:opacity-60'}`}
          />
        </Link>
      ))}
    </div>
  );
}
