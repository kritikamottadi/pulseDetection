export default function Footer() {
  return (
    <footer className="border-t border-slate-800/80 bg-[#080E1A] py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-3 px-4 text-sm text-slate-400 sm:flex-row sm:items-center sm:px-6 lg:px-8">
        <p className="font-medium text-slate-300">
          Built by Kritika | B.Tech CSE (AIML), REVA University
        </p>
        <p className="text-xs text-slate-400">
          Educational project. Not a certified security tool.
        </p>
      </div>
    </footer>
  );
}
