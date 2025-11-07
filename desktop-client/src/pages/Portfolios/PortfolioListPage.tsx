import { useMemo, useState } from "react";
import { useApiQuery } from "@/hooks/useApiQuery";
import { apiClient } from "@/services/apiClient";

type FundOption = {
  fund_id: string;
  fund_name: string;
};

type FundsResponse = {
  success: boolean;
  funds: FundOption[];
};

type Portfolio = {
  portfolio_id: string;
  portfolio_name: string;
  portfolio_code: string | null;
  description: string | null;
  fund_id: string;
  fund_name: string;
  asset_class_count: number;
  created_at: string;
};

type PortfoliosResponse = {
  success: boolean;
  portfolios: Portfolio[];
};

const PortfolioListPage = () => {
  const [selectedFund, setSelectedFund] = useState<string>("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    portfolio_name: "",
    portfolio_code: "",
    fund_id: "",
    description: ""
  });
  const fundsQuery = useApiQuery<FundsResponse>({ method: "get", url: "/funds" });

  const portfolioConfig = useMemo(
    () => ({
      method: "get",
      url: "/portfolios",
      params: selectedFund === "all" ? undefined : { fund_id: selectedFund }
    }),
    [selectedFund]
  );

  const portfoliosQuery = useApiQuery<PortfoliosResponse>(portfolioConfig);

  const portfolios = portfoliosQuery.data?.portfolios ?? [];
  const funds = fundsQuery.data?.funds ?? [];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post("/portfolios", formData);
      setShowCreateModal(false);
      setFormData({ portfolio_name: "", portfolio_code: "", fund_id: "", description: "" });
      await portfoliosQuery.refetch();
    } catch (error) {
      alert("Failed to create portfolio. Please try again.");
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">Portfolio Manager</h1>
          <p className="mt-2 text-sm text-slate-400">
            Filter portfolios by fund to review asset class coverage and drill into exposures.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm text-slate-300">
            Filter by fund:
            <select
              value={selectedFund}
              onChange={(event) => setSelectedFund(event.target.value)}
              className="ml-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1 text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
            >
              <option value="all">All funds</option>
              {funds.map((fund) => (
                <option key={fund.fund_id} value={fund.fund_id}>
                  {fund.fund_name}
                </option>
              ))}
            </select>
          </label>
          <button
            onClick={() => void portfoliosQuery.refetch()}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 transition hover:border-blue-500 hover:text-blue-200"
          >
            Refresh
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="rounded-lg border border-blue-500/40 bg-blue-500/10 px-4 py-2 text-sm text-blue-200 transition hover:border-blue-500 hover:bg-blue-500/20"
          >
            + Create Portfolio
          </button>
        </div>
      </header>

      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/50">
        <table className="min-w-full divide-y divide-slate-800 text-sm text-slate-200">
          <thead className="bg-slate-900/80 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3 text-left">Portfolio</th>
              <th className="px-4 py-3 text-left">Code</th>
              <th className="px-4 py-3 text-left">Fund</th>
              <th className="px-4 py-3 text-left">Created</th>
              <th className="px-4 py-3 text-right">Asset Classes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 bg-slate-950/30">
            {portfoliosQuery.loading && (
              <tr>
                <td className="px-4 py-6 text-center text-slate-500" colSpan={5}>
                  Loading portfolios…
                </td>
              </tr>
            )}
            {!portfoliosQuery.loading && portfolios.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-slate-500" colSpan={5}>
                  No portfolios found for this filter.
                </td>
              </tr>
            )}
            {portfolios.map((portfolio) => (
              <tr key={portfolio.portfolio_id} className="hover:bg-slate-900/50">
                <td className="px-4 py-3 font-medium text-slate-100">{portfolio.portfolio_name}</td>
                <td className="px-4 py-3 text-slate-300">{portfolio.portfolio_code ?? "—"}</td>
                <td className="px-4 py-3 text-slate-300">{portfolio.fund_name}</td>
                <td className="px-4 py-3 text-slate-300">
                  {new Date(portfolio.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-right text-slate-300">{portfolio.asset_class_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {portfoliosQuery.error && <p className="text-sm text-rose-400">{portfoliosQuery.error}</p>}

      {/* Create Portfolio Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
            <h2 className="text-xl font-semibold text-slate-100">Create New Portfolio</h2>
            <form onSubmit={handleCreate} className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300">Portfolio Name *</label>
                <input
                  type="text"
                  required
                  value={formData.portfolio_name}
                  onChange={(e) => setFormData({ ...formData, portfolio_name: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-blue-500 focus:outline-none"
                  placeholder="e.g., US Corporate Bonds"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300">Portfolio Code</label>
                <input
                  type="text"
                  value={formData.portfolio_code}
                  onChange={(e) => setFormData({ ...formData, portfolio_code: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-blue-500 focus:outline-none"
                  placeholder="e.g., USCB"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300">Fund *</label>
                <select
                  required
                  value={formData.fund_id}
                  onChange={(e) => setFormData({ ...formData, fund_id: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Select a fund...</option>
                  {funds.map((fund) => (
                    <option key={fund.fund_id} value={fund.fund_id}>
                      {fund.fund_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-blue-500 focus:outline-none"
                  placeholder="Optional description..."
                  rows={3}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:border-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-lg border border-blue-500/40 bg-blue-500/20 px-4 py-2 text-sm text-blue-100 transition hover:bg-blue-500/30"
                >
                  Create Portfolio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PortfolioListPage;
