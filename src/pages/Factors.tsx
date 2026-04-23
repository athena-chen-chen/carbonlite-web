// src/pages/Factors.tsx
import { useState } from "react";

type Factor = {
  id: string;
  name: string;
  scope: string;
  unit: string;
  value: number;
  source: string;
  updatedAt: string;
};

export default function Factors() {
  // temp mock data, normally you'd fetch this from API
  const [factors, setFactors] = useState<Factor[]>([
    {
      id: "1",
      name: "Diesel combustion (stationary)",
      scope: "Scope 1",
      unit: "kg CO₂e / L",
      value: 2.68,
      source: "Canada NIR 2024 (AB adj.)",
      updatedAt: "2025-09-12",
    },
    {
      id: "2",
      name: "Natural gas combustion (industrial)",
      scope: "Scope 1",
      unit: "kg CO₂e / m³",
      value: 1.89,
      source: "Canada NIR 2024",
      updatedAt: "2025-09-10",
    },
    {
      id: "3",
      name: "Alberta grid electricity",
      scope: "Scope 2",
      unit: "kg CO₂e / kWh",
      value: 0.53,
      source: "Alberta Grid Intensity Sept 2025",
      updatedAt: "2025-09-30",
    },
  ]);

  // Track which row is currently being edited
  const [editingId, setEditingId] = useState<string | null>(null);

  // local draft edits for the currently edited row
  const [draft, setDraft] = useState<Partial<Factor>>({});

  function startEdit(row: Factor) {
    setEditingId(row.id);
    setDraft(row);
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft({});
  }

  function saveEdit() {
    if (!editingId) return;
    setFactors((prev) =>
        prev.map((f) =>
          f.id === editingId
            ? {
                ...f,
                name: draft.name ?? f.name,
                scope: draft.scope ?? f.scope,
                unit: draft.unit ?? f.unit,
                value:
                  draft.value !== undefined
                    ? Number(draft.value)
                    : f.value,
                source: draft.source ?? f.source,
              }
            : f
        )
    );
    setEditingId(null);
    setDraft({});
  }

  function updateDraft<K extends keyof Factor>(key: K, value: Factor[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function addNewFactor() {
    const newFactor: Factor = {
      id: crypto.randomUUID(),
      name: "New factor",
      scope: "Scope 1",
      unit: "kg CO₂e / unit",
      value: 0,
      source: "User-defined",
      updatedAt: new Date().toISOString().slice(0, 10), // yyyy-mm-dd
    };
    setFactors((prev) => [newFactor, ...prev]);
    setEditingId(newFactor.id);
    setDraft(newFactor);
  }

  return (
    <>
      {/* Header card */}
      <section className="card">
        <div className="card-body">
          <div className="card-row">
            <div>
              <div className="page-title">Emission Factors</div>
              <div className="page-hint">
                Factors are used to convert activity (L diesel, kWh electricity)
                into tCO₂e.
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                className="text-xs font-medium bg-emerald-600 text-white rounded-lg px-3 py-2 hover:bg-emerald-700"
                onClick={addNewFactor}
              >
                + Add Factor
              </button>
            </div>
          </div>

          <div className="text-[11px] text-[rgb(var(--muted))] leading-snug mt-3">
            When you update a factor, future calculations use the new value.
            Past emissions should remain historically correct (don’t retroactively
            rewrite audit history).
          </div>
        </div>
      </section>

      {/* Table card */}
      <section className="card">
        <div className="card-body">
          <div className="card-row">
            <div className="page-title">Active Factors</div>
            <div className="page-hint">Internal only</div>
          </div>

          <div className="overflow-x-auto -mx-4 sm:-mx-6 md:mx-0">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="text-[11px] text-[rgb(var(--muted))] uppercase tracking-wide border-b border-[rgb(var(--border))]">
                  <th className="py-2 px-4 whitespace-nowrap">Name</th>
                  <th className="py-2 px-4 whitespace-nowrap">Scope</th>
                  <th className="py-2 px-4 whitespace-nowrap">Unit</th>
                  <th className="py-2 px-4 whitespace-nowrap">Value</th>
                  <th className="py-2 px-4 whitespace-nowrap">Source</th>
                  <th className="py-2 px-4 whitespace-nowrap text-right">Updated</th>
                  <th className="py-2 px-4 whitespace-nowrap text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[rgb(var(--border))]">
                {factors.map((f) => {
                  const isEditing = f.id === editingId;

                  return (
                    <tr key={f.id} className="align-top">
                      {/* Name */}
                      <td className="py-3 px-4">
                        {isEditing ? (
                          <input
                            className="input"
                            value={draft.name ?? ""}
                            onChange={(e) => updateDraft("name", e.target.value)}
                          />
                        ) : (
                          <>
                            <div className="font-medium text-[rgb(var(--text))]">
                              {f.name}
                            </div>
                          </>
                        )}
                      </td>

                      {/* Scope */}
                      <td className="py-3 px-4">
                        {isEditing ? (
                          <select
                            className="input"
                            value={draft.scope ?? ""}
                            onChange={(e) => updateDraft("scope", e.target.value as Factor["scope"])}
                          >
                            <option>Scope 1</option>
                            <option>Scope 2</option>
                            <option>Scope 3</option>
                          </select>
                        ) : (
                          <div className="text-[rgb(var(--text))] text-xs font-medium">
                            {f.scope}
                          </div>
                        )}
                      </td>

                      {/* Unit */}
                      <td className="py-3 px-4">
                        {isEditing ? (
                          <input
                            className="input"
                            value={draft.unit ?? ""}
                            onChange={(e) => updateDraft("unit", e.target.value)}
                          />
                        ) : (
                          <div className="text-[rgb(var(--text))] text-xs">
                            {f.unit}
                          </div>
                        )}
                      </td>

                      {/* Value */}
                      <td className="py-3 px-4">
                        {isEditing ? (
                          <input
                            className="input"
                            type="number"
                            step="0.01"
                            value={draft.value ?? 0}
                            onChange={(e) => updateDraft("value", Number(e.target.value))}
                          />
                        ) : (
                          <div className="text-[rgb(var(--text))] text-sm font-semibold">
                            {f.value}
                          </div>
                        )}
                      </td>

                      {/* Source */}
                      <td className="py-3 px-4">
                        {isEditing ? (
                          <input
                            className="input"
                            value={draft.source ?? ""}
                            onChange={(e) => updateDraft("source", e.target.value)}
                          />
                        ) : (
                          <>
                            <div className="text-[rgb(var(--text))] text-xs font-medium leading-snug">
                              {f.source}
                            </div>
                            <div className="text-[10px] text-[rgb(var(--muted))] leading-snug">
                              method: static
                            </div>
                          </>
                        )}
                      </td>

                      {/* Updated date */}
                      <td className="py-3 px-4 text-right text-[10px] text-[rgb(var(--muted))] whitespace-nowrap">
                        {f.updatedAt}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        {isEditing ? (
                          <div className="row-actions">
                            <button
                              className="text-xs font-medium bg-emerald-600 text-white rounded-lg px-3 py-2 hover:bg-emerald-700"
                              onClick={saveEdit}
                            >
                              Save
                            </button>
                            <button
                              className="text-xs font-medium border border-[rgb(var(--border))]
                                         text-[rgb(var(--text))] rounded-lg px-3 py-2
                                         hover:bg-[rgb(var(--card))]/60"
                              onClick={cancelEdit}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="row-actions">
                            <button
                              className="text-xs font-medium border border-[rgb(var(--border))]
                                         text-[rgb(var(--text))] rounded-lg px-3 py-2
                                         hover:bg-[rgb(var(--card))]/60"
                              onClick={() => startEdit(f)}
                            >
                              Edit
                            </button>
                            <button
                              className="text-xs font-medium text-red-600 border border-red-300 dark:border-red-700 rounded-lg px-3 py-2 hover:bg-red-50 dark:hover:bg-red-950/40"
                              onClick={() => {
                                setFactors(prev =>
                                  prev.filter((row) => row.id !== f.id)
                                );
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="text-[10px] text-[rgb(var(--muted))] leading-snug mt-4">
            Factors drive calculation logic in Emissions → Analysis → Reports.
            Changing these numbers changes cost-of-carbon and compliance output.
            Track changes with audit trail for regulators.
          </div>
        </div>
      </section>
    </>
  );
}
