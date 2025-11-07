import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApiQuery } from "@/hooks/useApiQuery";

type Security = {
  security_id: string;
  security_name: string;
  instrument_type: string;
  currency: string;
  status: string;
};

type SecuritiesResponse = {
  success: boolean;
  count: number;
  securities: Security[];
};

const SecurityListPage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [instrumentFilter, setInstrumentFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const query = useApiQuery<SecuritiesResponse>({ method: "get", url: "/securities" });
  const securities = query.data?.securities ?? [];

  const instrumentOptions = useMemo(() => {
    const set = new Set(securities.map((item) => item.instrument_type));
    return Array.from(set).sort();
  }, [securities]);

  const statusOptions = useMemo(() => {
    const set = new Set(securities.map((item) => item.status ?? "active"));
    return Array.from(set).sort();
  }, [securities]);

  const filtered = useMemo(() => {
    return securities.filter((security) => {
      const matchesSearch =
        search.trim().length === 0 ||
        security.security_name.toLowerCase().includes(search.toLowerCase()) ||
        security.security_id.toLowerCase().includes(search.toLowerCase());
      const matchesInstrument =
        instrumentFilter === "all" || security.instrument_type === instrumentFilter;
      const matchesStatus = statusFilter === "all" || (security.status ?? "active") === statusFilter;
      return matchesSearch && matchesInstrument && matchesStatus;
    });
  }, [securities, search, instrumentFilter, statusFilter]);

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">Security Master</h1>
          <p className="mt-2 text-sm text-slate-400">
            Browse the onboarded securities, filter by instrument type and status, and jump into valuation results.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name or ID"
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
          />
          <select
            value={instrumentFilter}
            onChange={(event) => setInstrumentFilter(event.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
          >
            <option value="all">All instruments</option>
            {instrumentOptions.map((instrument) => (
              <option key={instrument} value={instrument}>
                {instrument}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
          >
            <option value="all">All statuses</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
      </header>

      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/40">
        <table className="min-w-full divide-y divide-slate-800 text-sm text-slate-200">
          <thead className="bg-slate-900/80 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3 text-left">Security</th>
              <th className="px-4 py-3 text-left">Instrument</th>
              <th className="px-4 py-3 text-left">Currency</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 bg-slate-950/20">
            {query.loading && (
              <tr>
                <td className="px-4 py-6 text-center text-slate-500" colSpan={5}>
                  Loading securities…
                </td>
              </tr>
            )}
            {!query.loading && filtered.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-slate-500" colSpan={5}>
                  No securities match the current filters.
                </td>
              </tr>
            )}
            {filtered.map((security) => (
              <tr key={security.security_id} className="hover:bg-slate-900/40">
                <td className="px-4 py-3 font-medium text-slate-100">{security.security_name}</td>
                <td className="px-4 py-3 text-slate-300">{security.instrument_type}</td>
                <td className="px-4 py-3 text-slate-300">{security.currency}</td>
                <td className="px-4 py-3 text-slate-300 capitalize">{security.status ?? "active"}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => navigate(`/results?security=${security.security_id}`)}
                    className="rounded-md border border-blue-500/40 px-3 py-1 text-xs text-blue-200 transition hover:border-blue-500 hover:bg-blue-500/10"
                  >
                    View Overview
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {query.error && <p className="text-sm text-rose-400">{query.error}</p>}
    </div>
  );
};

export default SecurityListPage;
