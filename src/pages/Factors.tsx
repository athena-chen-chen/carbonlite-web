// src/pages/Factors.tsx
import { useState } from "react";

type Factor = {
  id: string;
  name: string;
  scope: string;
  unit: string;
  value: number;
  jurisdiction: string;
  sourceAuthority: string;
  sourceDocument: string;
  sourceYear: number;
  verified: boolean;
  notes: string;
  updatedAt: string;
};

export const demoFactors: Factor[] = [
  {
    id: "1",
    name: "Diesel combustion — demo",
    scope: "Scope 1",
    unit: "kg CO₂e / L",
    value: 2.68,
    jurisdiction: "Canada",
    sourceAuthority: "Demo / Placeholder",
    sourceDocument: "Pilot demo factor library",
    sourceYear: 2025,
    verified: false,
    notes: "Demo factor — verify before reporting.",
    updatedAt: "2025-09-12",
  },
  {
    id: "2",
    name: "Natural gas combustion — demo",
    scope: "Scope 1",
    unit: "kg CO₂e / m³",
    value: 1.89,
    jurisdiction: "Canada",
    sourceAuthority: "Demo / Placeholder",
    sourceDocument: "Pilot demo factor library",
    sourceYear: 2025,
    verified: false,
    notes: "Demo factor — verify before reporting.",
    updatedAt: "2025-09-10",
  },
  {
    id: "3",
    name: "Electricity — Alberta grid",
    scope: "Scope 2",
    unit: "kg CO₂e / kWh",
    value: 0.53,
    jurisdiction: "Alberta, Canada",
    sourceAuthority: "Demo / Placeholder",
    sourceDocument: "Pilot demo factor library",
    sourceYear: 2025,
    verified: false,
    notes: "Electricity factors vary by province and reporting year. Replace with verified jurisdiction-specific factors before client or regulatory reporting.",
    updatedAt: "2025-09-30",
  },
];

export default function Factors() {
  const [factors, setFactors] = useState<Factor[]>(demoFactors);

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
                jurisdiction: draft.jurisdiction ?? f.jurisdiction,
                sourceAuthority: draft.sourceAuthority ?? f.sourceAuthority,
                sourceDocument: draft.sourceDocument ?? f.sourceDocument,
                sourceYear: draft.sourceYear ?? f.sourceYear,
                verified: draft.verified ?? f.verified,
                notes: draft.notes ?? f.notes,
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
      jurisdiction: "",
      sourceAuthority: "User-defined",
      sourceDocument: "",
      sourceYear: new Date().getFullYear(),
      verified: false,
      notes: "Verify the source and jurisdiction before reporting.",
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
            Demo factors are provided for workflow validation only. Users should
            verify applicable regional emission factors before relying on final
            reports.
          </div>
        </div>
      </section>

      {/* Table card */}
      <section className="card">
        <div className="card-body">
          <div className="card-row">
            <div className="page-title">Active Factors</div>
            <div className="page-hint">Demo factor library</div>
          </div>

          <div className="overflow-x-auto -mx-4 sm:-mx-6 md:mx-0">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="text-[11px] text-[rgb(var(--muted))] uppercase tracking-wide border-b border-[rgb(var(--border))]">
                  <th className="py-2 px-4 whitespace-nowrap">Name</th>
                  <th className="py-2 px-4 whitespace-nowrap">Scope</th>
                  <th className="py-2 px-4 whitespace-nowrap">Unit</th>
                  <th className="py-2 px-4 whitespace-nowrap">Value</th>
                  <th className="py-2 px-4 whitespace-nowrap">Jurisdiction / Region</th>
                  <th className="py-2 px-4 whitespace-nowrap">Source Authority</th>
                  <th className="py-2 px-4 whitespace-nowrap">Source Year</th>
                  <th className="py-2 px-4 whitespace-nowrap">Verified</th>
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

                      {/* Jurisdiction */}
                      <td className="py-3 px-4">
                        {isEditing ? (
                          <input
                            className="input"
                            value={draft.jurisdiction ?? ""}
                            placeholder="e.g. Alberta, Canada"
                            onChange={(e) => updateDraft("jurisdiction", e.target.value)}
                          />
                        ) : (
                          <div className="text-[rgb(var(--text))] text-xs font-medium leading-snug">
                            {f.jurisdiction || "Not specified"}
                          </div>
                        )}
                      </td>

                      {/* Source authority */}
                      <td className="py-3 px-4">
                        {isEditing ? (
                          <div className="grid gap-2">
                            <input
                              className="input"
                              value={draft.sourceAuthority ?? ""}
                              placeholder="Source authority"
                              onChange={(e) => updateDraft("sourceAuthority", e.target.value)}
                            />
                            <input
                              className="input"
                              value={draft.sourceDocument ?? ""}
                              placeholder="Source document"
                              onChange={(e) => updateDraft("sourceDocument", e.target.value)}
                            />
                          </div>
                        ) : (
                          <>
                            <div className="text-[rgb(var(--text))] text-xs font-medium leading-snug">
                              {f.sourceAuthority || "Source not specified"}
                            </div>
                            <div className="text-[10px] text-[rgb(var(--muted))] leading-snug">
                              {f.sourceDocument || "Source not specified"}
                            </div>
                          </>
                        )}
                      </td>

                      {/* Source year */}
                      <td className="py-3 px-4">
                        {isEditing ? (
                          <input
                            className="input"
                            type="number"
                            value={draft.sourceYear ?? ""}
                            onChange={(e) => updateDraft("sourceYear", Number(e.target.value))}
                          />
                        ) : (
                          <div className="text-[rgb(var(--text))] text-xs">
                            {f.sourceYear || "Not specified"}
                          </div>
                        )}
                      </td>

                      {/* Verified */}
                      <td className="py-3 px-4">
                        {isEditing ? (
                          <label className="inline-flex items-center gap-2 text-xs">
                            <input
                              type="checkbox"
                              checked={Boolean(draft.verified)}
                              onChange={(e) => updateDraft("verified", e.target.checked)}
                            />
                            Verified
                          </label>
                        ) : (
                          <div>
                            <span
                              className={
                                f.verified
                                  ? "inline-flex rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold text-emerald-800"
                                  : "inline-flex rounded-full bg-amber-100 px-2 py-1 text-[10px] font-semibold text-amber-800"
                              }
                            >
                              {f.verified ? "Verified" : "Unverified"}
                            </span>
                            {f.notes ? (
                              <div className="mt-2 max-w-64 text-[10px] leading-snug text-[rgb(var(--muted))]">
                                {f.notes}
                              </div>
                            ) : null}
                          </div>
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
