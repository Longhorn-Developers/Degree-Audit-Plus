import React from "react";
import ReactDOM from "react-dom/client";
import "../styles/content.css";
import { RotateCcw, Upload, Settings } from "lucide-react";

/* ---------- Small UI helpers ---------- */
function ProgressBar({ value, total }: { value: number; total: number }) {
  const pct = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
  return (
    <div>
      <div className="h-2 w-full bg-gray-200 rounded-full">
        <div
          className="h-2 rounded-full bg-dap-primary"
          style={{ width: `${pct}%` }}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          role="progressbar"
        />
      </div>
      <div className="mt-1 text-xs text-gray-600 text-right">{pct}%</div>
    </div>
  );
}

function SectionCard({
  title,
  hoursCompleted,
  hoursTotal,
  children,
}: {
  title: string;
  hoursCompleted: number;
  hoursTotal: number;
  children?: React.ReactNode;
}) {
  return (
    <section className="border rounded-lg bg-white p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{title}</h3>
        <div className="text-sm text-gray-700">
          {hoursCompleted} / {hoursTotal} hours
        </div>
      </div>
      <ProgressBar value={hoursCompleted} total={hoursTotal} />
      {children}
    </section>
  );
}

function DegreeAuditPage() {
  const degreePct = 62;
  const completed = 0;
  const inProgress = 0;
  const remaining = 0;

  const majorHoursCompleted = 18;
  const majorHoursTotal = 60;

  const electiveHoursCompleted = 6;
  const electiveHoursTotal = 18;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <img
              className="rounded-full"
              src="/icon/LHD Logo.png"
              height={48}
              width={48}
              alt="Degree Audit Plus logo"
            />
            <div>
              <h1 className="text-2xl font-semibold">Lorem Ipsum Dolor Sit Amet</h1>
              <p className="text-sm text-gray-600">B.S. Computer Science, 2024 Catalog</p>
            </div>
          </div>

          <div className="flex space-x-2">
            <button
              className="flex items-center gap-2 px-3 py-2 border rounded-md text-gray-700 hover:bg-orange-100 transition"
            >
              <RotateCcw size={18} />
              Rerun
            </button>
            <button
              className="flex items-center gap-2 px-3 py-2 border rounded-md text-gray-700 hover:bg-orange-100 transition"
            >
              <Upload size={18} />
              Upload
            </button>
            <button
              className="flex items-center gap-2 px-3 py-2 border rounded-md text-gray-700 hover:bg-orange-100 transition"
            >
              <Settings size={18} />
              Settings
            </button>

          </div>
        </header>

        <section className="border rounded-lg bg-white p-6 space-y-6 shadow-sm">
          <h2 className="text-lg font-semibold">Degree Progress Overview:</h2>
          <div>
            <div className="h-3 bg-gray-200 rounded-full">
              <div
                className="h-3 bg-dap-primary rounded-full"
                style={{ width: `${degreePct}%` }}
              />
            </div>
            <div className="text-right text-xs text-gray-600 mt-1">{degreePct}%</div>
          </div>

          <div className="grid grid-cols-3 text-center">
            {[
              { label: "Completed", val: completed },
              { label: "In Progress", val: inProgress },
              { label: "Remaining", val: remaining },
            ].map((item) => (
              <div key={item.label} className="space-y-1">
                <div className="mx-auto w-14 h-14 bg-gray-200 rounded-full" />
                <p className="text-xl font-semibold">
                  {String(item.val).padStart(2, "0")}
                </p>
                <p className="text-sm text-gray-600">{item.label}</p>
              </div>
            ))}
          </div>

          <div className="border rounded-lg p-4 bg-gray-50 flex justify-between items-center">
            <div>
              <p className="font-semibold">Estimated Time to Degree</p>
              <p className="text-sm text-gray-600">Based on current progress</p>
            </div>
            <p className="text-3xl font-bold">
              0.0 <span className="text-sm font-normal text-gray-600">years</span>
            </p>
          </div>
        </section>

        <section className="border rounded-lg bg-white p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Core Curriculum</h3>
            <div className="w-32 h-2 bg-gray-200 rounded-full">
              <div className="w-1/4 h-2 bg-dap-primary rounded-full" />
            </div>
          </div>

          <div className="border rounded-lg p-4">
            <div className="flex justify-between items-center">
              <p className="font-medium">CORE (010)</p>
              <span className="text-sm text-green-700">Completed</span>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              RHE 306 or its equivalent are required.
            </p>
          </div>

        </section>

        <SectionCard
          title="Major"
          hoursCompleted={majorHoursCompleted}
          hoursTotal={majorHoursTotal}
        >
        </SectionCard>
        <SectionCard
          title="Electives"
          hoursCompleted={electiveHoursCompleted}
          hoursTotal={electiveHoursTotal}
        >
        </SectionCard>
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root")!);
root.render(
  <React.StrictMode>
    <DegreeAuditPage />
  </React.StrictMode>
);
