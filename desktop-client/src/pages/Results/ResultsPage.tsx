import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { AxiosRequestConfig } from "axios";
import { useApiQuery } from "@/hooks/useApiQuery";
import { apiClient } from "@/services/apiClient";

type SecuritiesResponse = {
  success: boolean;
  securities: {
    security_id: string;
    security_name: string;
    instrument_type: string;
    currency: string;
  }[];
};

type OverviewResponse = {
  success: boolean;
  overview: {
    security: {
      security_id: string;
      security_name: string;
      isin: string | null;
      cusip: string | null;
      instrument_type: string;
      currency: string;
      coupon: number | null;
      maturity_date: string;
      credit_rating: string | null;
      sector: string | null;
      country: string | null;
    };
    position: {
      portfolio_name: string;
      fund_name: string;
      quantity: number;
      book_value: number;
      status: string;
    } | null;
    latest_valuation: {
      fair_value: number;
      present_value: number;
      accrued_interest: number;
      unrealized_gain_loss: number;
      valuation_date: string;
      currency: string;
    } | null;
    price_history: { valuation_date: string; fair_value: number }[];
    cash_flows: {
      past_count: number;
      future_count: number;
      defaulted_count: number;
      next_payment_date: string | null;
      next_payment_amount: number | null;
      projection_summary: {
        totalFlows: number;
        pastCount: number;
        futureCount: number;
      };
    };
    performance: {
      ytm: number | null;
      duration: number | null;
      convexity: number | null;
    };
  };
};

const ResultsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const securityParam = searchParams.get("security") ?? "";

  const securitiesQuery = useApiQuery<SecuritiesResponse>({ method: "get", url: "/securities" });
  const securities = securitiesQuery.data?.securities ?? [];

  const idleOverviewRequest = useMemo(
    () => ({
      method: "get" as const,
      url: "/overview/placeholder"
    }),
    []
  );

  const overviewRequest = useMemo<AxiosRequestConfig | null>(
    () =>
      securityParam
        ? {
            method: "get",
            url: `/overview/${securityParam}`
          }
        : null,
    [securityParam]
  );

  const overviewQuery = useApiQuery<OverviewResponse>(
    overviewRequest ?? idleOverviewRequest,
    Boolean(overviewRequest)
  );

  const selectedSecurity = useMemo(
    () => securities.find((security) => security.security_id === securityParam),
    [securities, securityParam]
  );

  const handleSelectSecurity = (securityId: string) => {
    if (securityId) {
      setSearchParams({ security: securityId });
    } else {
      setSearchParams({});
    }
  };

  const handleDownloadAudit = async () => {
    if (!securityParam) return;
    const response = await apiClient.get(`/audit/excel`, {
      params: { security_id: securityParam },
      responseType: "blob"
    });
    const blob = new Blob([response.data], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.target = "_blank";
    anchor.rel = "noopener";
    anchor.download = `valuation-audit-${securityParam}.xlsx`;
    document.body.appendChild(anchor);
    anchor.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      anchor.remove();
    }, 1500);
  };

  const overview = overviewQuery.data?.overview;
  const priceHistory = overview?.price_history ?? [];

  return (
    <div className="space-y-8">
      <header className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">Results & Analytics</h1>
          <p className="mt-2 text-sm text-slate-400">
            Select a security to view the latest valuation snapshot, performance metrics, and price history.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={securityParam}
            onChange={(event) => handleSelectSecurity(event.target.value)}
            className="min-w-[240px] rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
          >
            <option value="">Select security</option>
            {securities.map((security) => (
              <option key={security.security_id} value={security.security_id}>
                {security.security_name} · {security.instrument_type}
              </option>
            ))}
          </select>
          <button
            onClick={() => overviewQuery.refetch()}
            disabled={!securityParam || overviewQuery.loading}
            className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 transition hover:border-blue-500 hover:text-blue-200 disabled:cursor-not-allowed disabled:text-slate-500"
          >
            Refresh
          </button>
          <button
            onClick={() => void handleDownloadAudit()}
            disabled={!securityParam}
            className="rounded-lg border border-blue-500/40 px-3 py-2 text-sm text-blue-200 transition hover:border-blue-500 hover:bg-blue-500/10 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-500"
          >
            Download
          </button>
        </div>
        {overviewQuery.error && <p className="text-sm text-rose-400">{overviewQuery.error}</p>}
      </header>

      {!securityParam && (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-6 text-sm text-slate-400">
          Choose a security above to load valuation analytics.
        </div>
      )}

      {securityParam && overviewQuery.loading && (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-6 text-sm text-slate-400">
          Loading valuation overview…
        </div>
      )}

      {securityParam && overviewQuery.error && !overviewQuery.loading && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-sm text-rose-200">
          {overviewQuery.error}
        </div>
      )}

      {overview && !overviewQuery.loading && (
        <>
          <section className="grid gap-6 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-blue-300">Security</h2>
              <p className="mt-3 text-lg font-semibold text-slate-100">{overview.security.security_name}</p>
              <dl className="mt-4 space-y-2 text-sm text-slate-300">
                <div className="flex justify-between">
                  <dt className="text-slate-400">Instrument</dt>
                  <dd>{overview.security.instrument_type}</dd>
                </div>
                {overview.position?.classification && (
                  <div className="flex justify-between">
                    <dt className="text-slate-400">Classification</dt>
                    <dd>{overview.position.classification.charAt(0).toUpperCase() + overview.position.classification.slice(1)}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-slate-400">Currency</dt>
                  <dd>{overview.security.currency}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-400">Coupon</dt>
                  <dd>{overview.security.coupon != null ? `${overview.security.coupon}%` : "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-400">Maturity</dt>
                  <dd>{new Date(overview.security.maturity_date).toLocaleDateString()}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-400">Rating</dt>
                  <dd>{overview.security.credit_rating ?? "N/A"}</dd>
                </div>
              </dl>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-blue-300">Latest Valuation</h2>
              {overview.latest_valuation ? (
                <dl className="mt-4 space-y-2 text-sm text-slate-300">
                  <div className="flex justify-between">
                    <dt className="text-slate-400">Valuation Date</dt>
                    <dd>{new Date(overview.latest_valuation.valuation_date).toLocaleDateString()}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-400">Fair Value</dt>
                    <dd>
                      {overview.latest_valuation.fair_value.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-400">Present Value</dt>
                    <dd>
                      {overview.latest_valuation.present_value.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-400">Accrued Interest</dt>
                    <dd>
                      {overview.latest_valuation.accrued_interest.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-400">Unrealised P/L</dt>
                    <dd
                      className={
                        overview.latest_valuation.unrealized_gain_loss >= 0 ? "text-emerald-300" : "text-rose-300"
                      }
                    >
                      {overview.latest_valuation.unrealized_gain_loss.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </dd>
                  </div>
                </dl>
              ) : (
                <p className="mt-4 text-sm text-slate-400">No valuation has been recorded for this security yet.</p>
              )}
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-blue-300">Performance</h2>
              <dl className="mt-4 space-y-2 text-sm text-slate-300">
                <div className="flex justify-between">
                  <dt className="text-slate-400">YTM</dt>
                  <dd>{overview.performance.ytm != null ? `${(overview.performance.ytm * 100).toFixed(2)}%` : "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-400">Duration</dt>
                  <dd>{overview.performance.duration != null ? overview.performance.duration.toFixed(2) : "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-400">Convexity</dt>
                  <dd>{overview.performance.convexity != null ? overview.performance.convexity.toFixed(2) : "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-400">Next Payment</dt>
                  <dd>
                    {overview.cash_flows.next_payment_date
                      ? `${new Date(overview.cash_flows.next_payment_date).toLocaleDateString()} · ${
                          overview.cash_flows.next_payment_amount?.toLocaleString() ?? "—"
                        }`
                      : "—"}
                  </dd>
                </div>
              </dl>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-blue-300">Price History</h2>
            <p className="mt-2 text-xs text-slate-400">
              Latest 30 valuations for the selected security. Use the audit export to analyse full calculation steps.
            </p>
            <div className="mt-4 overflow-hidden rounded-xl border border-slate-800">
              <table className="min-w-full divide-y divide-slate-800 text-sm text-slate-200">
                <thead className="bg-slate-900/80 text-xs uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-4 py-2 text-left">Valuation Date</th>
                    <th className="px-4 py-2 text-right">Fair Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-slate-950/20">
                  {priceHistory.length === 0 && (
                    <tr>
                      <td className="px-4 py-4 text-center text-slate-500" colSpan={2}>
                        Valuation history will appear after the first run.
                      </td>
                    </tr>
                  )}
                  {priceHistory.map((entry) => (
                    <tr key={entry.valuation_date}>
                      <td className="px-4 py-2 text-slate-300">
                        {new Date(entry.valuation_date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-2 text-right text-slate-200">
                        {entry.fair_value.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default ResultsPage;
