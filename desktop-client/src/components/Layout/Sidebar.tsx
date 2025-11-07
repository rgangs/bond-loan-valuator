import { NavLink } from "react-router-dom";
import classNames from "classnames";

type NavigationItem = {
  label: string;
  to: string;
  badge?: string;
};

const navItems: NavigationItem[] = [
  { label: "Dashboard", to: "/" },
  { label: "Funds", to: "/funds" },
  { label: "Portfolios", to: "/portfolios" },
  { label: "Asset Classes", to: "/asset-classes" },
  { label: "Securities", to: "/securities" },
  { label: "Upload", to: "/uploads" },
  { label: "Valuation", to: "/valuation" },
  { label: "Results", to: "/results" },
  { label: "Audit", to: "/audit" }
];

const Sidebar = () => {
  return (
    <aside className="flex w-72 flex-col border-r border-slate-800 bg-slate-950/80 backdrop-blur-sm">
      <div className="border-b border-slate-800 px-6 py-5">
        <p className="text-sm uppercase tracking-[0.35em] text-blue-400">Bond & Loan</p>
        <h1 className="mt-2 text-xl font-semibold text-slate-100">Portfolio Valuator</h1>
      </div>
      <nav className="flex-1 space-y-1 px-4 py-6">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              classNames(
                "group flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition",
                isActive
                  ? "bg-blue-600/20 text-blue-100 ring-1 ring-inset ring-blue-500/60"
                  : "text-slate-300 hover:bg-slate-800/60 hover:text-slate-100"
              )
            }
          >
            <span>{item.label}</span>
            {item.badge && (
              <span className="rounded-full bg-blue-500/20 px-3 py-0.5 text-xs text-blue-100">{item.badge}</span>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="px-6 pb-6">
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 text-xs text-slate-400">
          <p className="font-medium text-slate-200">System Status</p>
          <p className="mt-2">
            All valuation engines operational. Ready for portfolio analysis.
          </p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
