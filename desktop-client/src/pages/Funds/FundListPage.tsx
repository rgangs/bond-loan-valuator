import { useState } from "react";
import { apiClient } from "@/services/apiClient";
import { useApiQuery } from "@/hooks/useApiQuery";

type Fund = {
  fund_id: string;
  fund_name: string;
  fund_code: string | null;
  base_currency: string;
  fund_type: string | null;
  inception_date: string | null;
  portfolio_count: number;
};

type FundsResponse = {
  success: boolean;
  count: number;
  funds: Fund[];
};

const FundListPage = () => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    fund_name: "",
    fund_code: "",
    base_currency: "USD",
    fund_type: "Fixed Income",
    inception_date: new Date().toISOString().split('T')[0]
  });
  const query = useApiQuery<FundsResponse>({ method: "get", url: "/funds" });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await query.refetch();
    setIsRefreshing(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post("/funds", formData);
      setShowCreateModal(false);
      setFormData({
        fund_name: "",
        fund_code: "",
        base_currency: "USD",
        fund_type: "Fixed Income",
        inception_date: new Date().toISOString().split('T')[0]
      });
      await query.refetch();
    } catch (error) {
      alert("Failed to create fund. Please try again.");
    }
  };

  const handleDelete = async (fundId: string) => {
    if (!confirm("Delete this fund? This cannot be undone.")) return;
    try {
      await apiClient.delete(`/funds/${fundId}`);
      await query.refetch();
    } catch (error) {
      let message = "Unable to delete fund. Remove dependent portfolios first.";
      if (error && typeof error === "object" && "response" in error) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        message = axiosError.response?.data?.message ?? message;
      }
      alert(message);
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">Fund Manager</h1>
          <p className="mt-2 text-sm text-slate-400">
            Review and manage the funds available in the valuation platform. Select a fund to drill into portfolios.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing || query.loading}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 transition hover:border-blue-500 hover:text-blue-200 disabled:cursor-not-allowed disabled:text-slate-500"
          >
            {isRefreshing || query.loading ? "Refreshing…" : "Refresh"}
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="rounded-lg border border-blue-500/40 bg-blue-500/10 px-4 py-2 text-sm text-blue-200 transition hover:border-blue-500 hover:bg-blue-500/20"
          >
            + Create Fund
          </button>
        </div>
      </header>

      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/50">
        <table className="min-w-full divide-y divide-slate-800 text-sm text-slate-200">
          <thead className="bg-slate-900/80 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3 text-left">Fund Name</th>
              <th className="px-4 py-3 text-left">Code</th>
              <th className="px-4 py-3 text-left">Base Currency</th>
              <th className="px-4 py-3 text-left">Type</th>
              <th className="px-4 py-3 text-left">Inception</th>
              <th className="px-4 py-3 text-right">Portfolios</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 bg-slate-950/30">
            {query.loading && (
              <tr>
                <td className="px-4 py-6 text-center text-slate-500" colSpan={7}>
                  Loading funds…
                </td>
              </tr>
            )}
            {!query.loading && query.data?.funds.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-slate-500" colSpan={7}>
                  No funds found. Create one using the API or upcoming UI action.
                </td>
              </tr>
            )}
            {query.data?.funds.map((fund) => (
              <tr key={fund.fund_id} className="hover:bg-slate-900/50">
                <td className="px-4 py-3 font-medium text-slate-100">{fund.fund_name}</td>
                <td className="px-4 py-3 text-slate-300">{fund.fund_code ?? "—"}</td>
                <td className="px-4 py-3 text-slate-300">{fund.base_currency}</td>
                <td className="px-4 py-3 text-slate-300">{fund.fund_type ?? "N/A"}</td>
                <td className="px-4 py-3 text-slate-300">
                  {fund.inception_date ? new Date(fund.inception_date).toLocaleDateString() : "—"}
                </td>
                <td className="px-4 py-3 text-right text-slate-300">{fund.portfolio_count}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => void handleDelete(fund.fund_id)}
                    className="rounded-md border border-rose-500/40 px-3 py-1 text-xs text-rose-200 transition hover:border-rose-500 hover:bg-rose-500/10"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {query.error && <p className="text-sm text-rose-400">{query.error}</p>}

      {/* Create Fund Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
            <h2 className="text-xl font-semibold text-slate-100">Create New Fund</h2>
            <form onSubmit={handleCreate} className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300">Fund Name *</label>
                <input
                  type="text"
                  required
                  value={formData.fund_name}
                  onChange={(e) => setFormData({ ...formData, fund_name: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-blue-500 focus:outline-none"
                  placeholder="e.g., Global Fixed Income Fund"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300">Fund Code</label>
                <input
                  type="text"
                  value={formData.fund_code}
                  onChange={(e) => setFormData({ ...formData, fund_code: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-blue-500 focus:outline-none"
                  placeholder="e.g., GFIF"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300">Base Currency *</label>
                <select
                  required
                  value={formData.base_currency}
                  onChange={(e) => setFormData({ ...formData, base_currency: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-blue-500 focus:outline-none"
                >
                  <option>USD</option>
                  <option>EUR</option>
                  <option>GBP</option>
                  <option>JPY</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300">Fund Type</label>
                <input
                  type="text"
                  value={formData.fund_type}
                  onChange={(e) => setFormData({ ...formData, fund_type: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-blue-500 focus:outline-none"
                  placeholder="e.g., Fixed Income"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300">Inception Date</label>
                <input
                  type="date"
                  value={formData.inception_date}
                  onChange={(e) => setFormData({ ...formData, inception_date: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-blue-500 focus:outline-none"
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
                  Create Fund
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FundListPage;
