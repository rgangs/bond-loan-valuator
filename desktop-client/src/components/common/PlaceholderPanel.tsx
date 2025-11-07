type PlaceholderPanelProps = {
  title: string;
  description: string;
  nextSteps: string[];
};

const PlaceholderPanel = ({ title, description, nextSteps }: PlaceholderPanelProps) => {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8">
      <h2 className="text-xl font-semibold text-slate-100">{title}</h2>
      <p className="mt-2 text-sm text-slate-400">{description}</p>
      <div className="mt-6 space-y-3">
        {nextSteps.map((step) => (
          <div
            key={step}
            className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-slate-300"
          >
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-800 bg-slate-900/80 text-xs text-slate-400">
              *
            </span>
            <span>{step}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PlaceholderPanel;
