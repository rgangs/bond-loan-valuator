import { useMemo } from "react";
import { useApiQuery } from "@/hooks/useApiQuery";

type FundsResponse = {
  success: boolean;
  count: number;
  funds: {
    fund_id: string;
    fund_name: string;
    fund_code: string;
    base_currency: string;
    fund_type: string | null;
    portfolio_count: number;
  }[];
};

type PortfoliosResponse = {
  success: boolean;
  count: number;
  portfolios: {
    portfolio_id: string;
    portfolio_name: string;
    fund_name: string;
    asset_class_count: number;
  }[];
};

type SecuritiesResponse = {
  success: boolean;
  count: number;
  securities: {
    security_id: string;
    security_name: string;
    instrument_type: string;
    currency: string;
  }[];
};

type AuditLogsResponse = {
  success: boolean;
  count: number;
  logs: {
    audit_id: string;
    action: string;
    created_at: string;
    details?: Record<string, unknown>;
  }[];
};

const DashboardPage = () => {
  const fundsQuery = useApiQuery<FundsResponse>({ method: "get", url: "/funds" });
  const portfoliosQuery = useApiQuery<PortfoliosResponse>({ method: "get", url: "/portfolios" });
  const securitiesQuery = useApiQuery<SecuritiesResponse>({
    method: "get",
    url: "/securities",
    params: { limit: 50 }
  });
  const auditLogsQuery = useApiQuery<AuditLogsResponse>({
    method: "get",
    url: "/audit/logs",
    params: { limit: 5 }
  });

  const summary = useMemo(() => {
    return [
      {
        label: "Funds",
        value: fundsQuery.data?.count ?? 0,
        loading: fundsQuery.loading,
        description: "Legal entities across the hierarchy."
      },
      {
        label: "Portfolios",
        value: portfoliosQuery.data?.count ?? 0,
        loading: portfoliosQuery.loading,
        description: "Active investment portfolios managed."
      },
      {
        label: "Securities",
        value: securitiesQuery.data?.count ?? 0,
        loading: securitiesQuery.loading,
        description: "Tracked positions in the platform."
      }
    ];
  }, [fundsQuery, portfoliosQuery, securitiesQuery]);

  const topFunds = fundsQuery.data?.funds.slice(0, 5) ?? [];
  const recentLogs = auditLogsQuery.data?.logs ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-100">Operational Overview</h1>
        <p className="mt-2 text-sm text-slate-400">
          Live metrics from the valuation API. Kick off new valuations from the navigation and track activity below.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        {summary.map((item) => (
          <article key={item.label} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow">
            <p className="text-xs uppercase tracking-[0.35em] text-blue-400">{item.label}</p>
            <p className="mt-4 text-3xl font-semibold text-slate-50">
              {item.loading ? <span className="text-sm text-slate-500">Loading…</span> : item.value}
            </p>
            <p className="mt-2 text-sm text-slate-400">{item.description}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <header className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-100">Flagship Funds</h2>
              <p className="text-xs text-slate-400">A snapshot of the latest five funds on record.</p>
            </div>
            <button
              onClick={() => void fundsQuery.refetch()}
              className="rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-300 transition hover:border-blue-500 hover:text-blue-200"
            >
              Refresh
            </button>
          </header>
          <div className="overflow-hidden rounded-xl border border-slate-800">
            <table className="min-w-full divide-y divide-slate-800 text-sm text-slate-200">
              <thead className="bg-slate-900/90 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-left">Fund</th>
                  <th className="px-4 py-3 text-left">Currency</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-right">Portfolios</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-950/40">
                {fundsQuery.loading && (
                  <tr>
                    <td className="px-4 py-6 text-center text-slate-500" colSpan={4}>
                      Loading funds...
                    </td>
                  </tr>
                )}
                {!fundsQuery.loading && topFunds.length === 0 && (
                  <tr>
                    <td className="px-4 py-6 text-center text-slate-500" colSpan={4}>
                      No funds available yet.
                    </td>
                  </tr>
                )}
                {topFunds.map((fund) => (
                  <tr key={fund.fund_id} className="hover:bg-slate-900/60">
                    <td className="px-4 py-3 font-medium text-slate-100">{fund.fund_name}</td>
                    <td className="px-4 py-3 text-slate-300">{fund.base_currency}</td>
                    <td className="px-4 py-3 text-slate-300">{fund.fund_type ?? "N/A"}</td>
                    <td className="px-4 py-3 text-right text-slate-300">{fund.portfolio_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {fundsQuery.error && <p className="text-sm text-rose-400">{fundsQuery.error}</p>}
        </div>

        <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <header className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-100">Recent Activity</h2>
              <p className="text-xs text-slate-400">Latest valuation actions recorded in the audit log.</p>
            </div>
            <button
              onClick={() => void auditLogsQuery.refetch()}
              className="rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-300 transition hover:border-blue-500 hover:text-blue-200"
            >
              Refresh
            </button>
          </header>
          <div className="space-y-3">
            {auditLogsQuery.loading && <p className="text-sm text-slate-500">Loading activity…</p>}
            {!auditLogsQuery.loading && recentLogs.length === 0 && (
              <p className="text-sm text-slate-500">Audit history will appear here once valuations run.</p>
            )}
            {recentLogs.map((log) => (
              <div
                key={log.audit_id}
                className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-slate-100">{log.action.replace(/_/g, " ")}</p>
                  <p className="text-xs text-slate-400">
                    {new Date(log.created_at).toLocaleString()} –{" "}
                    {log.details && "run_type" in log.details ? String(log.details.run_type) : "valuation"}
                  </p>
                </div>
              </div>
            ))}
            {auditLogsQuery.error && <p className="text-sm text-rose-400">{auditLogsQuery.error}</p>}
          </div>
        </div>
      </section>
    </div>
  );
};

export default DashboardPage;
