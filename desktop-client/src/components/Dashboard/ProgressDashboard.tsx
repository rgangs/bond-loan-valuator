import { useMemo } from "react";
import { computeProgress, useProgressStore } from "@/context/ProgressStore";
import classNames from "classnames";

const statusStyles = {
  pending: "border-slate-800 bg-slate-900/60 text-slate-300",
  in_progress: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  complete: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
  blocked: "border-rose-500/40 bg-rose-500/10 text-rose-200"
};

const ProgressDashboard = () => {
  const phases = useProgressStore((state) => state.phases);
  const updateTaskStatus = useProgressStore((state) => state.updateTaskStatus);
  const diagnostics = useMemo(() => computeProgress(phases), [phases]);

  return (
    <div className="space-y-8">
      <section className="grid gap-4 sm:grid-cols-3">
        <article className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <p className="text-xs uppercase tracking-[0.35em] text-blue-400">Overall Complete</p>
          <p className="mt-4 text-3xl font-semibold text-slate-50">{diagnostics.percent}%</p>
          <p className="mt-2 text-sm text-slate-400">
            {diagnostics.complete} of {diagnostics.tasks} tasks finished
          </p>
        </article>
        <article className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <p className="text-xs uppercase tracking-[0.35em] text-blue-400">Active Work</p>
          <p className="mt-4 text-3xl font-semibold text-amber-200">{diagnostics.inProgress}</p>
          <p className="mt-2 text-sm text-slate-400">Tasks being implemented right now.</p>
        </article>
        <article className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <p className="text-xs uppercase tracking-[0.35em] text-blue-400">Blockers</p>
          <p className="mt-4 text-3xl font-semibold text-rose-200">{diagnostics.blocked}</p>
          <p className="mt-2 text-sm text-slate-400">Issues needing backend input or clarification.</p>
        </article>
      </section>
      <section className="space-y-4">
        {phases.map((phase) => {
          const completedTasks = phase.tasks.filter((task) => task.status === "complete").length;
          const taskCount = Math.max(phase.tasks.length, 1);
          const completionPercent = Math.round((completedTasks / taskCount) * 100);
          return (
            <div
              key={phase.id}
              className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow shadow-blue-900/20"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-blue-400">{phase.eta ?? "Status"}</p>
                  <h2 className="mt-2 text-xl font-semibold text-slate-50">{phase.title}</h2>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-emerald-200">
                    {completedTasks}/{phase.tasks.length} complete
                  </span>
                  <div className="h-2 w-40 rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-blue-500 transition-all"
                      style={{ width: `${completionPercent}%` }}
                    />
                  </div>
                </div>
              </div>
              <div className="mt-5 space-y-4">
                {phase.tasks.map((task) => (
                  <div
                    key={task.id}
                    className={classNames(
                      "flex flex-col justify-between gap-4 rounded-xl border px-4 py-4 sm:flex-row sm:items-center",
                      statusStyles[task.status]
                    )}
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-100">{task.title}</p>
                      <p className="mt-1 text-xs text-slate-300">{task.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {(["pending", "in_progress", "complete", "blocked"] as const).map((statusOption) => (
                        <button
                          key={statusOption}
                          onClick={() => updateTaskStatus(phase.id, task.id, statusOption)}
                          className={classNames(
                            "rounded-lg border px-3 py-1 text-xs font-medium uppercase tracking-wide transition",
                            task.status === statusOption
                              ? "border-slate-50/30 bg-slate-50/20 text-slate-900"
                              : "border-slate-50/10 text-slate-200 hover:border-slate-50/30 hover:text-slate-100"
                          )}
                        >
                          {statusOption.replace("_", " ")}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
};

export default ProgressDashboard;
