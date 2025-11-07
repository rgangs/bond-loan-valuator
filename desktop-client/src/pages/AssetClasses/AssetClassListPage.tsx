import { useMemo, useState } from "react";
import { useApiQuery } from "@/hooks/useApiQuery";
import { apiClient } from "@/services/apiClient";

type Portfolio = {
  portfolio_id: string;
  portfolio_name: string;
};

type PortfoliosResponse = {
  success: boolean;
  portfolios: Portfolio[];
};

type AssetClass = {
  asset_class_id: string;
  class_name: string;
  portfolio_id: string;
  portfolio_name: string;
  description: string | null;
  classification: string;
  created_at: string;
};

type AssetClassesResponse = {
  success: boolean;
  count: number;
  asset_classes: AssetClass[];
};

const AssetClassListPage = () => {
  const [selectedPortfolio, setSelectedPortfolio] = useState<string>("all");
  const [classificationFilter, setClassificationFilter] = useState<"all" | "bond" | "loan">("all");
  const [updatingAssetClassId, setUpdatingAssetClassId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    class_name: "",
    portfolio_id: "",
    description: "",
    classification: "bond"
  });

  const portfoliosQuery = useApiQuery<PortfoliosResponse>({ method: "get", url: "/portfolios" });

  const assetClassConfig = useMemo(() => {
    const params: Record<string, string> = {};
    if (selectedPortfolio !== "all") {
      params.portfolio_id = selectedPortfolio;
    }
    if (classificationFilter !== "all") {
      params.classification = classificationFilter;
    }

    return {
      method: "get" as const,
      url: "/asset-classes",
      params: Object.keys(params).length > 0 ? params : undefined
    };
  }, [selectedPortfolio, classificationFilter]);

  const assetClassesQuery = useApiQuery<AssetClassesResponse>(assetClassConfig);

  const assetClasses = assetClassesQuery.data?.asset_classes ?? [];
  const portfolios = portfoliosQuery.data?.portfolios ?? [];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post("/asset-classes", formData);
      setShowCreateModal(false);
      setFormData({ class_name: "", portfolio_id: "", description: "", classification: "bond" });
      await assetClassesQuery.refetch();
    } catch (error) {
      alert("Failed to create asset class. Please try again.");
    }
  };

  const handleDelete = async (assetClassId: string) => {
    if (!confirm("Delete this asset class? This cannot be undone.")) return;
    try {
      await apiClient.delete(`/asset-classes/${assetClassId}`);
      await assetClassesQuery.refetch();
    } catch (error) {
      alert("Unable to delete asset class. Remove dependent securities first.");
    }
  };

  const handleClassificationChange = async (assetClassId: string, classification: string) => {
    setUpdatingAssetClassId(assetClassId);
    try {
      await apiClient.put(`/asset-classes/${assetClassId}`, { classification: classification.toLowerCase() });
      await assetClassesQuery.refetch();
    } catch (error) {
      alert('Failed to update classification. Please try again.');
    } finally {
      setUpdatingAssetClassId(null);
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">Asset Class Manager</h1>
          <p className="mt-2 text-sm text-slate-400">
            Manage portfolio asset classes, assign bond or loan classification, and align valuation controls.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm text-slate-300">
            Filter by portfolio:
            <select
              value={selectedPortfolio}
              onChange={(event) => setSelectedPortfolio(event.target.value)}
              className="ml-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1 text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
            >
              <option value="all">All portfolios</option>
              {portfolios.map((portfolio) => (
                <option key={portfolio.portfolio_id} value={portfolio.portfolio_id}>
                  {portfolio.portfolio_name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-slate-300">
            Classification:
            <select
              value={classificationFilter}
              onChange={(event) => setClassificationFilter(event.target.value as "all" | "bond" | "loan")}
              className="ml-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1 text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
            >
              <option value="all">All</option>
              <option value="bond">Bond</option>
              <option value="loan">Loan</option>
            </select>
          </label>
          <button
            onClick={() => void assetClassesQuery.refetch()}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 transition hover:border-blue-500 hover:text-blue-200"
          >
            Refresh
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="rounded-lg border border-blue-500/40 bg-blue-500/10 px-4 py-2 text-sm text-blue-200 transition hover:border-blue-500 hover:bg-blue-500/20"
          >
            + Create Asset Class
          </button>
        </div>
      </header>

      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/50">
        <table className="min-w-full divide-y divide-slate-800 text-sm text-slate-200">
          <thead className="bg-slate-900/80 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3 text-left">Class Name</th>
              <th className="px-4 py-3 text-left">Portfolio</th>
              <th className="px-4 py-3 text-left">Classification</th>
              <th className="px-4 py-3 text-left">Description</th>
              <th className="px-4 py-3 text-left">Created</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 bg-slate-950/30">
            {assetClassesQuery.loading && (
              <tr>
                <td className="px-4 py-6 text-center text-slate-500" colSpan={6}>
                  Loading asset classes…
                </td>
              </tr>
            )}
            {!assetClassesQuery.loading && assetClasses.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-slate-500" colSpan={6}>
                  No asset classes found for this filter.
                </td>
              </tr>
            )}
            {assetClasses.map((ac) => (
              <tr key={ac.asset_class_id} className="hover:bg-slate-900/50">
                <td className="px-4 py-3 font-medium text-slate-100">{ac.class_name}</td>
                <td className="px-4 py-3 text-slate-300">{ac.portfolio_name}</td>
                <td className="px-4 py-3 text-slate-300">
                  <select
                    value={ac.classification}
                    onChange={(event) => handleClassificationChange(ac.asset_class_id, event.target.value)}
                    disabled={updatingAssetClassId === ac.asset_class_id}
                    className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="bond">Bond</option>
                    <option value="loan">Loan</option>
                  </select>
                </td>
                <td className="px-4 py-3 text-slate-300">{ac.description ?? "—"}</td>
                <td className="px-4 py-3 text-slate-300">
                  {new Date(ac.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => void handleDelete(ac.asset_class_id)}
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
      {assetClassesQuery.error && <p className="text-sm text-rose-400">{assetClassesQuery.error}</p>}

      {/* Create Asset Class Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
            <h2 className="text-xl font-semibold text-slate-100">Create New Asset Class</h2>
            <form onSubmit={handleCreate} className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300">Class Name *</label>
                <input
                  type="text"
                  required
                  value={formData.class_name}
                  onChange={(e) => setFormData({ ...formData, class_name: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-blue-500 focus:outline-none"
                  placeholder="e.g., Investment Grade Corporate"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300">Portfolio *</label>
                <select
                  required
                  value={formData.portfolio_id}
                  onChange={(e) => setFormData({ ...formData, portfolio_id: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Select a portfolio...</option>
                  {portfolios.map((portfolio) => (
                    <option key={portfolio.portfolio_id} value={portfolio.portfolio_id}>
                      {portfolio.portfolio_name}
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
              <div>
                <label className="block text-sm font-medium text-slate-300">Classification *</label>
                <select
                  required
                  value={formData.classification}
                  onChange={(e) => setFormData({ ...formData, classification: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-blue-500 focus:outline-none"
                >
                  <option value="bond">Bond</option>
                  <option value="loan">Loan</option>
                </select>
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
                  Create Asset Class
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssetClassListPage;
