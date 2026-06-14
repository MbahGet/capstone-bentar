'use client';

import TabSwitcher from './TabSwitcher';

export default function ShellHeader() {
  return (
    <header className="fixed inset-x-0 top-0 h-14 z-40 pointer-events-none">
      {/* Top gradient — dark at top, fades to transparent below */}
      <div
        className="absolute inset-x-0 top-0 h-24 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, rgba(3,7,18,0.85) 0%, transparent 100%)' }}
      />
      {/* Floating dock pill */}
      <div className="absolute top-2.5 left-1/2 -translate-x-1/2 pointer-events-auto">
        <TabSwitcher />
      </div>
    </header>
  );
}
