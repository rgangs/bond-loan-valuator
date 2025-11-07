import { useAuth } from "@/context/AuthContext";

const TopBar = () => {
  const timestamp = new Date().toLocaleString();
  const { user, logout } = useAuth();

  return (
    <header className="flex h-20 items-center justify-between border-b border-slate-800 bg-slate-950/60 px-8 backdrop-blur">
      <div>
        <p className="text-xs uppercase tracking-[0.35em] text-blue-400">Valuation Console</p>
        <p className="mt-2 text-lg font-semibold text-slate-100">Bond & Loan Portfolio Valuator</p>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-medium text-slate-100">{user?.name || user?.email}</p>
          <p className="text-xs text-slate-400">{timestamp}</p>
        </div>
        <button
          onClick={logout}
          className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:border-rose-500 hover:text-rose-200"
        >
          Logout
        </button>
      </div>
    </header>
  );
};

export default TopBar;
