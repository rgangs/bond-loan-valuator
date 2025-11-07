import { create } from "zustand";

export type ProgressStatus = "pending" | "in_progress" | "complete" | "blocked";

export type ProgressTask = {
  id: string;
  title: string;
  description: string;
  status: ProgressStatus;
};

export type ProgressPhase = {
  id: string;
  title: string;
  eta?: string;
  tasks: ProgressTask[];
};

type ProgressState = {
  phases: ProgressPhase[];
  updateTaskStatus: (phaseId: string, taskId: string, status: ProgressStatus) => void;
};

const initialPhases: ProgressPhase[] = [
  {
    id: "phase-1",
    title: "Setup & Auth",
    eta: "Complete",
    tasks: [
      {
        id: "task-electron",
        title: "Electron runtime & preload bridge",
        description: "Configure Electron main process and secure IPC preload.",
        status: "complete"
      },
      {
        id: "task-vite",
        title: "Vite + React + Tailwind scaffold",
        description: "Set up React 18 + TypeScript project with Tailwind CSS.",
        status: "complete"
      },
      {
        id: "task-auth-shell",
        title: "Application shell & Auth wiring",
        description: "Implement layout, routing, and authentication context.",
        status: "complete"
      }
    ]
  },
  {
    id: "phase-2",
    title: "Hierarchy UI",
    eta: "Live",
    tasks: [
      {
        id: "task-funds",
        title: "Fund manager UI",
        description: "List, search, and CRUD funds.",
        status: "complete"
      },
      {
        id: "task-portfolios",
        title: "Portfolio manager UI",
        description: "Portfolio listing with breadcrumbs.",
        status: "complete"
      },
      {
        id: "task-asset-classes",
        title: "Asset class manager UI",
        description: "Asset class workflow by portfolio.",
        status: "pending"
      }
    ]
  },
  {
    id: "phase-3",
    title: "Securities & Upload",
    eta: "Mixed",
    tasks: [
      {
        id: "task-securities",
        title: "Security list & filters",
        description: "Comprehensive security table with filters and badges.",
        status: "complete"
      },
      {
        id: "task-upload",
        title: "CSV/Excel upload",
        description: "Drag & drop file ingestion with validation.",
        status: "pending"
      }
    ]
  },
  {
    id: "phase-4",
    title: "Valuation Workflow",
    eta: "Rolling out",
    tasks: [
      {
        id: "task-valuation-setup",
        title: "Valuation setup screens",
        description: "Curve selection and run configuration.",
        status: "complete"
      },
      {
        id: "task-progress-tracker",
        title: "Run progress tracking",
        description: "UI feedback for valuation run lifecycle.",
        status: "in_progress"
      }
    ]
  },
  {
    id: "phase-5",
    title: "Results & Audit",
    eta: "Live",
    tasks: [
      {
        id: "task-results-dashboard",
        title: "Results dashboard",
        description: "Charts, metrics, and exports.",
        status: "complete"
      },
      {
        id: "task-audit-trail",
        title: "Audit trail viewer",
        description: "Detailed log of security changes.",
        status: "complete"
      }
    ]
  }
];

export const useProgressStore = create<ProgressState>()((set) => ({
  phases: initialPhases,
  updateTaskStatus: (phaseId: string, taskId: string, status: ProgressStatus) =>
    set((state) => ({
      phases: state.phases.map((phase) =>
        phase.id === phaseId
          ? {
              ...phase,
              tasks: phase.tasks.map((task) => (task.id === taskId ? { ...task, status } : task))
            }
          : phase
      )
    }))
}));

export const computeProgress = (phases: ProgressPhase[]) => {
  const totals = phases.reduce(
    (acc, phase) => {
      acc.tasks += phase.tasks.length;
      phase.tasks.forEach((task) => {
        if (task.status === "complete") acc.complete += 1;
        if (task.status === "in_progress") acc.inProgress += 1;
        if (task.status === "blocked") acc.blocked += 1;
      });
      return acc;
    },
    { tasks: 0, complete: 0, inProgress: 0, blocked: 0 }
  );
  const percent = totals.tasks === 0 ? 0 : Math.round((totals.complete / totals.tasks) * 100);
  return { ...totals, percent };
};
