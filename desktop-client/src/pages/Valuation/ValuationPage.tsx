import { FormEvent, useEffect, useMemo, useState } from "react";
import { useApiQuery } from "@/hooks/useApiQuery";
import { apiClient } from "@/services/apiClient";

type FundOption = { fund_id: string; fund_name: string };
type FundsResponse = { success: boolean; funds: FundOption[] };

type PortfolioOption = { portfolio_id: string; portfolio_name: string; fund_id: string };
type PortfoliosResponse = { success: boolean; portfolios: PortfolioOption[] };

type SecurityOption = {
  security_id: string;
  security_name: string;
  instrument_type: string;
};
type SecuritiesResponse = { success: boolean; securities: SecurityOption[] };
type CurveDescriptor = {
  name: string;
  curve_date: string | null;
  source: string | null;
  curve_type: string | null;
};

type CurveSetup = {
  benchmark: CurveDescriptor | null;
  spread: CurveDescriptor | null;
  manual_spreads: Record<string, number>;
};

type CashflowEntry = {
  flow_date: string;
  flow_amount: number;
  flow_type: string;
  is_realized: boolean;
  is_defaulted: boolean;
  payment_status: string;
};

type CashflowProjection = {
  allFlows: CashflowEntry[];
  summary: {
    totalFlows: number;
    pastCount: number;
    futureCount: number;
    defaultedCount: number;
    realizedCount: number;
    nextPayment: CashflowEntry | null;
  };
};

type CashflowProjectionResponse = {
  success: boolean;
  projection: CashflowProjection;
};


type CurveLibraryResponse = {
  success: boolean;
  curves: {
    curve_name: string;
    currency: string | null;
    latest_date: string | null;
    earliest_date: string | null;
    available_dates: number;
    curve_type: string | null;
    source: string;
  }[];
};

type RunResponse = {
  run: {
    valuation_run_id: string;
    status: string;
    valuation_date: string;
    total_securities: number;
    completed_securities: number;
    completed_at: string;
  };
  results: {
    security_id: string;
    detail: {
      reporting_currency: string;
      fx_rate: number;
      curves?: CurveSetup;
      valuation: {
        presentValue: number;
        accruedInterest: number;
        dirtyValue: number;
        unrealizedGainLoss: number;
        curveSetup?: CurveSetup;
      };
    };
  }[];
  errors: {
    security_id: string;
    error: string;
  }[];
};

const ValuationPage = () => {
  const fundsQuery = useApiQuery<FundsResponse>({ method: "get", url: "/funds" });
  const portfoliosQuery = useApiQuery<PortfoliosResponse>({ method: "get", url: "/portfolios" });
  const securitiesQuery = useApiQuery<SecuritiesResponse>({ method: "get", url: "/securities" });
  const curvesQuery = useApiQuery<CurveLibraryResponse>({ method: "get", url: "/curves/library" });

  const [runType, setRunType] = useState<"security" | "portfolio" | "fund">("security");
  const [targetId, setTargetId] = useState<string>("");
  const [benchmarkCurveName, setBenchmarkCurveName] = useState<string>("");
  const [spreadCurveName, setSpreadCurveName] = useState<string>("");
  const [hasInitialisedCurves, setHasInitialisedCurves] = useState<boolean>(false);
  const [curveDate, setCurveDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [reportingCurrency, setReportingCurrency] = useState<string>("USD");
  const [parallel, setParallel] = useState<boolean>(true);
  const [concurrency, setConcurrency] = useState<number>(4);

  const [submitting, setSubmitting] = useState(false);
  const [runResult, setRunResult] = useState<RunResponse | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [cashflowProjection, setCashflowProjection] = useState<CashflowProjection | null>(null);
  const [cashflowLoading, setCashflowLoading] = useState<boolean>(false);
  const [cashflowError, setCashflowError] = useState<string | null>(null);

  const availableTargets = useMemo(() => {
    if (runType === "fund") {
      return fundsQuery.data?.funds ?? [];
    }
    if (runType === "portfolio") {
      return portfoliosQuery.data?.portfolios ?? [];
    }
    return securitiesQuery.data?.securities ?? [];
  }, [runType, fundsQuery.data, portfoliosQuery.data, securitiesQuery.data]);

  const availableCurves = curvesQuery.data?.curves ?? [];
  const primaryCurveSetup = useMemo<CurveSetup | null>(() => {
    const setup = runResult?.results[0]?.detail.curves ?? runResult?.results[0]?.detail.valuation.curveSetup ?? null;
    if (!setup) {
      return null;
    }
    return {
      benchmark: setup.benchmark || null,
      spread: setup.spread || null,
      manual_spreads: setup.manual_spreads || {}
    };
  }, [runResult]);

  useEffect(() => {
    if (availableCurves.length === 0) {
      setHasInitialisedCurves(false);
      return;
    }

    if (!benchmarkCurveName || !availableCurves.some((curve) => curve.curve_name === benchmarkCurveName)) {
      setBenchmarkCurveName(availableCurves[0].curve_name);
    }

    if (spreadCurveName && !availableCurves.some((curve) => curve.curve_name === spreadCurveName)) {
      setSpreadCurveName('');
    }

    if (!hasInitialisedCurves) {
      const defaultSpread = availableCurves.find((curve) => (curve.curve_type || '').toLowerCase() === 'spread');
      if (defaultSpread) {
        setSpreadCurveName(defaultSpread.curve_name);
      }
      setHasInitialisedCurves(true);
    }
  }, [availableCurves, benchmarkCurveName, spreadCurveName, hasInitialisedCurves]);

  useEffect(() => {
    let cancelled = false;

    if (runType !== 'security' || !targetId) {
      setCashflowProjection(null);
      setCashflowError(null);
      setCashflowLoading(false);
      return;
    }

    setCashflowLoading(true);
    setCashflowError(null);

    void apiClient
      .get<CashflowProjectionResponse>(`/cashflows/${targetId}/project`, {
        params: { valuation_date: curveDate }
      })
      .then((response) => {
        if (!cancelled) {
          setCashflowProjection(response.data.projection);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          let message = 'Failed to load cash flows.';
          if (error && typeof error === 'object' && 'response' in error) {
            const axiosError = error as { response?: { data?: { message?: string } } };
            message = axiosError.response?.data?.message ?? message;
          }
          setCashflowError(message);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setCashflowLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [runType, targetId, curveDate]);

  useEffect(() => {
    if (targetId) return;
    if (runType === "fund") {
      const firstFund = fundsQuery.data?.funds?.[0];
      if (firstFund?.fund_id) {
        setTargetId(firstFund.fund_id);
      }
    } else if (runType === "portfolio") {
      const firstPortfolio = portfoliosQuery.data?.portfolios?.[0];
      if (firstPortfolio?.portfolio_id) {
        setTargetId(firstPortfolio.portfolio_id);
      }
    } else {
      const firstSecurity = securitiesQuery.data?.securities?.[0];
      if (firstSecurity?.security_id) {
        setTargetId(firstSecurity.security_id);
      }
    }
  }, [targetId, runType, fundsQuery.data, portfoliosQuery.data, securitiesQuery.data]);

  const updateTargetDefault = (nextRunType: "security" | "portfolio" | "fund") => {
    setTargetId("");
  };

  const handleRun = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitError(null);
    setRunResult(null);

    if (!targetId) {
      setSubmitError("Please select a target to value.");
      return;
    }

    if (!benchmarkCurveName) {
      setSubmitError("Please select a benchmark curve.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        run_type: runType,
        target_id: targetId,
        valuation_date: curveDate,
        options: {
          benchmark_curve_name: benchmarkCurveName,
          base_curve_name: benchmarkCurveName,
          required_spread_curve_name: spreadCurveName || undefined,
          curve_date: curveDate,
          reporting_currency: reportingCurrency,
          parallel,
          concurrency
        }
      };
      const response = await apiClient.post<RunResponse>("/valuations/run", payload);
      setRunResult(response.data);
    } catch (error) {
      let message = "Failed to launch valuation run.";
      if (error && typeof error === "object" && "response" in error) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        message = axiosError.response?.data?.message ?? message;
      }
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-100">Launch Valuation Run</h1>
        <p className="mt-2 text-sm text-slate-400">
          Configure curve, reporting currency, and concurrency for security, portfolio, or fund level valuations. Results
          appear below once completed.
        </p>
      </div>

      <form className="space-y-6 rounded-2xl border border-slate-800 bg-slate-950/60 p-6" onSubmit={handleRun}>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm text-slate-300">
            Run Type
            <select
              value={runType}
              onChange={(event) => {
                const nextType = event.target.value as "security" | "portfolio" | "fund";
                setRunType(nextType);
                updateTargetDefault(nextType);
              }}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 focus:border-blue-500 focus:outline-none"
            >
              <option value="security">Security</option>
              <option value="portfolio">Portfolio</option>
              <option value="fund">Fund</option>
            </select>
          </label>

          <label className="flex flex-col gap-2 text-sm text-slate-300">
            Target
            <select
              value={targetId}
              onChange={(event) => setTargetId(event.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 focus:border-blue-500 focus:outline-none"
            >
              <option value="">Select a target</option>
              {availableTargets.map((target) => {
                if ("fund_id" in target) {
                  return (
                    <option key={target.fund_id} value={target.fund_id}>
                      {target.fund_name}
                    </option>
                  );
                }
                if ("portfolio_id" in target) {
                  return (
                    <option key={target.portfolio_id} value={target.portfolio_id}>
                      {target.portfolio_name}
                    </option>
                  );
                }
                return (
                  <option key={target.security_id} value={target.security_id}>
                    {target.security_name}
                  </option>
                );
              })}
            </select>
          </label>

          <label className="flex flex-col gap-2 text-sm text-slate-300">
            Benchmark Curve
            <select
              value={benchmarkCurveName}
              onChange={(event) => setBenchmarkCurveName(event.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 focus:border-blue-500 focus:outline-none"
            >
              <option value="">Select a curve</option>
              {availableCurves.map((curve) => (
                <option key={`${curve.curve_name}-${curve.source}`} value={curve.curve_name}>
                  {curve.curve_name} · {curve.currency ?? "N/A"} ({curve.source}
                  {curve.curve_type ? ` · ${curve.curve_type}` : ""})
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2 text-sm text-slate-300">
            Required Spread Curve
            <select
              value={spreadCurveName}
              onChange={(event) => setSpreadCurveName(event.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 focus:border-blue-500 focus:outline-none"
            >
              <option value="">None</option>
              {availableCurves.map((curve) => (
                <option key={`${curve.curve_name}-${curve.source}-spread`} value={curve.curve_name}>
                  {curve.curve_name} · {curve.currency ?? "N/A"} ({curve.source}
                  {curve.curve_type ? ` · ${curve.curve_type}` : ""})
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2 text-sm text-slate-300">
            Curve Date
            <input
              type="date"
              value={curveDate}
              onChange={(event) => setCurveDate(event.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 focus:border-blue-500 focus:outline-none"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm text-slate-300">
            Reporting Currency
            <input
              value={reportingCurrency}
              onChange={(event) => setReportingCurrency(event.target.value.toUpperCase())}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 focus:border-blue-500 focus:outline-none"
            />
          </label>

          <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-800 bg-slate-900/30 p-3">
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={parallel}
                onChange={(event) => setParallel(event.target.checked)}
                className="rounded border-slate-700 bg-slate-900 focus:ring-blue-500"
              />
              Run in parallel
            </label>
            <label className="flex flex-col gap-2 text-sm text-slate-300">
              Concurrency
              <input
                type="number"
                min={1}
                max={16}
                value={concurrency}
                onChange={(event) => setConcurrency(Number(event.target.value))}
                disabled={!parallel}
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1 text-slate-100 focus:border-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-500"
              />
            </label>
          </div>
        </div>

        {submitError && <p className="text-sm text-rose-400">{submitError}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-900"
        >
          {submitting ? "Running valuation…" : "Run valuation"}
        </button>
      </form>

      {runType === 'security' && targetId && (
        <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
          <header className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold text-slate-100">Cash Flow Preview</h2>
            <p className="text-sm text-slate-400">Projection based on the selected valuation date. Update the curve date to refresh.</p>
          </header>

          {cashflowLoading && <p className="text-sm text-slate-400">Loading cash flows…</p>}

          {cashflowError && !cashflowLoading && (
            <p className="text-sm text-rose-400">{cashflowError}</p>
          )}

          {!cashflowLoading && !cashflowError && cashflowProjection && (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
                  <p className="text-xs uppercase text-slate-500">Future Flows</p>
                  <p className="mt-1 text-lg font-semibold text-slate-100">{cashflowProjection.summary.futureCount}</p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
                  <p className="text-xs uppercase text-slate-500">Past Flows</p>
                  <p className="mt-1 text-lg font-semibold text-slate-100">{cashflowProjection.summary.pastCount}</p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
                  <p className="text-xs uppercase text-slate-500">Next Payment</p>
                  <p className="mt-1 text-sm text-slate-100">
                    {cashflowProjection.summary.nextPayment
                      ? `${new Date(cashflowProjection.summary.nextPayment.flow_date).toLocaleDateString()} · ${cashflowProjection.summary.nextPayment.flow_amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                      : '—'}
                  </p>
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-800">
                <table className="min-w-full divide-y divide-slate-800 text-sm text-slate-200">
                  <thead className="bg-slate-900/80 text-xs uppercase tracking-wide text-slate-400">
                    <tr>
                      <th className="px-4 py-2 text-left">Date</th>
                      <th className="px-4 py-2 text-right">Amount</th>
                      <th className="px-4 py-2 text-left">Type</th>
                      <th className="px-4 py-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 bg-slate-950/20">
                    {cashflowProjection.allFlows.map((flow) => {
                      const status = flow.is_defaulted
                        ? 'Defaulted'
                        : flow.is_realized
                          ? 'Paid'
                          : flow.payment_status || 'Projected';

                      return (
                        <tr key={`${flow.flow_date}-${flow.flow_amount}-${flow.flow_type}`}>
                          <td className="px-4 py-2 text-slate-300">{new Date(flow.flow_date).toLocaleDateString()}</td>
                          <td className="px-4 py-2 text-right text-slate-200">
                            {flow.flow_amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-2 text-slate-300 capitalize">{flow.flow_type.replace(/_/g, ' ')}</td>
                          <td className="px-4 py-2 text-slate-300">{status}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {!cashflowLoading && !cashflowError && !cashflowProjection && (
            <p className="text-sm text-slate-400">Cash flows will appear after selecting a security.</p>
          )}
        </section>
      )}

      {runResult && (
        <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
          <header>
            <h2 className="text-lg font-semibold text-slate-100">Run Summary</h2>
            <p className="text-sm text-slate-400">
              Run ID <span className="font-mono text-slate-200">{runResult.run.valuation_run_id}</span> · Status{" "}
              <span className="capitalize text-blue-200">{runResult.run.status.replace(/_/g, " ")}</span>
            </p>
          </header>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">Securities processed</p>
              <p className="mt-2 text-2xl font-semibold text-slate-100">
                {runResult.run.completed_securities}/{runResult.run.total_securities}
              </p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">Completed at</p>
              <p className="mt-2 text-sm text-slate-100">
                {runResult.run.completed_at ? new Date(runResult.run.completed_at).toLocaleString() : "—"}
              </p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">Errors</p>
              <p className="mt-2 text-2xl font-semibold text-slate-100">{runResult.errors.length}</p>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-800">
            <table className="min-w-full divide-y divide-slate-800 text-sm text-slate-200">
              <thead className="bg-slate-900/80 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-left">Security ID</th>
                  <th className="px-4 py-3 text-right">Present Value</th>
                  <th className="px-4 py-3 text-right">Accrued Interest</th>
                  <th className="px-4 py-3 text-right">Fair Value</th>
                  <th className="px-4 py-3 text-right">Unrealised P/L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-950/20">
                {runResult.results.map((item) => (
                  <tr key={item.security_id}>
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">{item.security_id}</td>
                    <td className="px-4 py-3 text-right text-slate-200">
                      {item.detail.valuation.presentValue.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-200">
                      {item.detail.valuation.accruedInterest.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-200">
                      {item.detail.valuation.dirtyValue.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </td>
                    <td
                      className={`px-4 py-3 text-right ${
                        item.detail.valuation.unrealizedGainLoss >= 0 ? "text-emerald-300" : "text-rose-300"
                      }`}
                    >
                      {item.detail.valuation.unrealizedGainLoss.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {primaryCurveSetup && (
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
              <p className="text-sm font-semibold text-slate-200">Curve Setup</p>
              <ul className="mt-2 space-y-1 text-sm text-slate-300">
                <li>
                  <span className="text-slate-500">Benchmark:</span> {primaryCurveSetup.benchmark
                    ? `${primaryCurveSetup.benchmark.name} (${primaryCurveSetup.benchmark.source || 'unknown'})`
                    : 'N/A'}
                </li>
                <li>
                  <span className="text-slate-500">Spread Curve:</span> {primaryCurveSetup.spread
                    ? `${primaryCurveSetup.spread.name} (${primaryCurveSetup.spread.source || 'unknown'})`
                    : 'None'}
                </li>
                {primaryCurveSetup.manual_spreads && Object.keys(primaryCurveSetup.manual_spreads).length > 0 && (
                  <li>
                    <span className="text-slate-500">Manual Overrides:</span>{' '}
                    {Object.entries(primaryCurveSetup.manual_spreads)
                      .map(([tenor, bps]) => `${tenor}: ${bps}bps`)
                      .join(', ')}
                  </li>
                )}
              </ul>
            </div>
          )}

          {runResult.errors.length > 0 && (
            <div className="rounded-xl border border-amber-600/30 bg-amber-500/10 p-4 text-sm text-amber-200">
              <p className="font-semibold uppercase tracking-wide">Warnings</p>
              <ul className="mt-2 space-y-1">
                {runResult.errors.map((error) => (
                  <li key={error.security_id} className="font-mono text-xs">
                    {error.security_id}: {error.error}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default ValuationPage;
