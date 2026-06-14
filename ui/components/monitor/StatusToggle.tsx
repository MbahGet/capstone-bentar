export function StatusToggle({ active, onRefresh }: { active: boolean; onRefresh: () => void }) {
  return (
    <button
      onClick={onRefresh}
      className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
        active
          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30'
          : 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
      }`}
    >
      {active ? 'On' : 'Off'}
    </button>
  );
}