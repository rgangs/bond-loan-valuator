import { useMemo, useState } from "react";
import { useApiQuery } from "@/hooks/useApiQuery";
import { apiClient } from "@/services/apiClient";

type AuditLogsResponse = {
  success: boolean;
  logs: {
    audit_id: string;
    action: string;
    created_at: string;
    details?: Record<string, unknown>;
    security_id?: string;
    valuation_run_id?: string;
  }[];
};

type AuditReportResponse = {
  success: boolean;
  report: {
    valuation: {
      valuation_run_id: string;
      valuation_date: string;
      fair_value: number;
      present_value: number;
      currency: string;
    };
  };
};

const AuditPage = () => {
  const [entityId, setEntityId] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [securityForReport, setSecurityForReport] = useState("");
  const [report, setReport] = useState<AuditReportResponse | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);

  const logsConfig = useMemo(
    () => ({
      method: "get",
      url: "/audit/logs",
      params: {
        entity_id: entityId || undefined,
        action: actionFilter || undefined,
        limit: 25
      }
    }),
    [entityId, actionFilter]
  );

  const logsQuery = useApiQuery<AuditLogsResponse>(logsConfig);

  const handleDownload = async (audit: { security_id?: string; valuation_run_id?: string }) => {
    const params =
      audit.security_id != null
        ? { security_id: audit.security_id }
        : audit.valuation_run_id != null
        ? { valuation_run_id: audit.valuation_run_id }
        : null;
    if (!params) return;

    const response = await apiClient.get(`/audit/excel`, {
      params,
      responseType: "blob"
    });
    const blob = new Blob([response.data], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `audit-${params.security_id ?? params.valuation_run_id}.xlsx`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleFetchReport = async () => {
    if (!securityForReport) {
      setReportError("Enter a security ID to fetch the audit report.");
      return;
    }
    setReportError(null);
    setReport(null);
    try {
      const response = await apiClient.get<AuditReportResponse>(`/audit/report`, {
        params: { security_id: securityForReport }
      });
      setReport(response.data);
    } catch (error) {
      let message = "Unable to fetch audit report for the provided security.";
      if (error && typeof error === "object" && "response" in error) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        message = axiosError.response?.data?.message ?? message;
      }
      setReportError(message);
    }
  };

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <h1 className="text-2xl font-semibold text-slate-100">Audit Trail</h1>
        <p className="text-sm text-slate-400">
          Inspect valuation activity and export evidence packages for specific securities or valuation runs.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={entityId}
            onChange={(event) => setEntityId(event.target.value)}
            placeholder="Filter by security or valuation run ID"
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-100 focus:border-blue-500 focus:outline-none md:min-w-[260px]"
          />
          <input
            value={actionFilter}
            onChange={(event) => setActionFilter(event.target.value)}
            placeholder="Filter by action (e.g. valuation_completed)"
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-100 focus:border-blue-500 focus:outline-none md:min-w-[220px]"
          />
          <button
            onClick={() => void logsQuery.refetch()}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 transition hover:border-blue-500 hover:text-blue-200"
          >
            Refresh
          </button>
        </div>
      </header>

      <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-blue-300">Recent Audit Events</h2>
        <div className="overflow-hidden rounded-xl border border-slate-800">
          <table className="min-w-full divide-y divide-slate-800 text-sm text-slate-200">
            <thead className="bg-slate-900/80 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3 text-left">Timestamp</th>
                <th className="px-4 py-3 text-left">Action</th>
                <th className="px-4 py-3 text-left">Security</th>
                <th className="px-4 py-3 text-left">Run</th>
                <th className="px-4 py-3 text-right">Export</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-950/30">
              {logsQuery.loading && (
                <tr>
                  <td className="px-4 py-6 text-center text-slate-500" colSpan={5}>
                    Loading audit history…
                  </td>
                </tr>
              )}
              {!logsQuery.loading && logsQuery.data?.logs.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-center text-slate-500" colSpan={5}>
                    No audit entries match the current filters.
                  </td>
                </tr>
              )}
              {logsQuery.data?.logs.map((log) => (
                <tr key={log.audit_id} className="hover:bg-slate-900/50">
                  <td className="px-4 py-3 text-slate-300">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-slate-200">{log.action.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">
                    {log.security_id ?? "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">
                    {log.valuation_run_id ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() =>
                        void handleDownload({
                          security_id: log.security_id,
                          valuation_run_id: log.valuation_run_id
                        })
                      }
                      disabled={!log.security_id && !log.valuation_run_id}
                      className="rounded-md border border-blue-500/30 px-3 py-1 text-xs text-blue-200 transition hover:border-blue-500 hover:bg-blue-500/10 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-500"
                    >
                      Excel
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-blue-300">Audit Report Snapshot</h2>
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={securityForReport}
            onChange={(event) => setSecurityForReport(event.target.value)}
            placeholder="Enter security ID"
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-100 focus:border-blue-500 focus:outline-none md:min-w-[260px]"
          />
          <button
            onClick={() => void handleFetchReport()}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 transition hover:border-blue-500 hover:text-blue-200"
          >
            Fetch report
          </button>
        </div>
        {reportError && <p className="text-sm text-rose-400">{reportError}</p>}
        {report && (
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-200">
            <p>
              Valuation Run:{" "}
              <span className="font-mono text-xs text-blue-200">{report.report.valuation.valuation_run_id}</span>
            </p>
            <p>Date: {new Date(report.report.valuation.valuation_date).toLocaleDateString()}</p>
            <p>
              Fair Value:{" "}
              {report.report.valuation.fair_value.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}{" "}
              {report.report.valuation.currency}
            </p>
            <p>
              Present Value:{" "}
              {report.report.valuation.present_value.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}{" "}
              {report.report.valuation.currency}
            </p>
          </div>
        )}
      </section>
    </div>
  );
};

export default AuditPage;
