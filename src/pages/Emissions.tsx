// src/pages/Emissions.tsx
import { useState } from "react";

type FuelRecord = {
  id: string;
  facility: string;
  fuelType: string;
  amount: number;
  unit: string;
  date: string;
  note?: string;
};

export default function Emissions() {
  // mock data as if already entered
  const [records, setRecords] = useState<FuelRecord[]>([
    {
      id: "1",
      facility: "Calgary Plant",
      fuelType: "Diesel",
      amount: 12400,
      unit: "L",
      date: "2025-09-28",
      note: "Backup generator runtime for UPS test",
    },
    {
      id: "2",
      facility: "Vancouver Warehouse",
      fuelType: "Natural Gas",
      amount: 3200,
      unit: "m³",
      date: "2025-09-27",
      note: "Process heat",
    },
    {
      id: "3",
      facility: "Edmonton Office",
      fuelType: "Diesel",
      amount: 180,
      unit: "L",
      date: "2025-09-26",
    },
  ]);

  // modal visible?
  const [open, setOpen] = useState(false);

  // draft form values in modal
  const [draft, setDraft] = useState<Omit<FuelRecord, "id">>({
    facility: "",
    fuelType: "Diesel",
    amount: 0,
    unit: "L",
    date: new Date().toISOString().slice(0, 10), // yyyy-mm-dd
    note: "",
  });

  function resetDraft() {
    setDraft({
      facility: "",
      fuelType: "Diesel",
      amount: 0,
      unit: "L",
      date: new Date().toISOString().slice(0, 10),
      note: "",
    });
  }

  function handleOpen() {
    resetDraft();
    setOpen(true);
  }

  function handleClose() {
    setOpen(false);
  }

  function handleSave() {
    // Basic validation idea: require facility, amount >0
    if (!draft.facility.trim()) {
      alert("Facility is required.");
      return;
    }
    if (draft.amount <= 0) {
      alert("Amount must be > 0.");
      return;
    }

    const newRow: FuelRecord = {
      id: crypto.randomUUID(),
      ...draft,
    };

    setRecords((prev) => [newRow, ...prev]);
    setOpen(false);
  }

  return (
    <>
      {/* Header card */}
      <section className="card">
        <div className="card-body">
          <div className="card-row">
            <div>
              <div className="page-title">Fuel Combustion Records</div>
              <div className="page-hint">
                Scope&nbsp;1 • Onsite diesel / natural gas usage
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                className="text-xs font-medium bg-emerald-600 text-white rounded-lg px-3 py-2 hover:bg-emerald-700"
                onClick={handleOpen}
              >
                + Add fuel data
              </button>
            </div>
          </div>

          <div className="text-[11px] text-[rgb(var(--muted))] leading-snug mt-3">
            These values feed Scope 1 emissions and compliance filings.
            Make sure meter or delivery slips are accurate.
          </div>
        </div>
      </section>

      {/* Table card */}
      <section className="card">
        <div className="card-body">
          <div className="card-row">
            <div className="page-title">Recent Entries</div>
            <div className="page-hint">Latest first</div>
          </div>

          <div className="overflow-x-auto -mx-4 sm:-mx-6 md:mx-0">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="text-[11px] text-[rgb(var(--muted))] uppercase tracking-wide border-b border-[rgb(var(--border))]">
                  <th className="py-2 px-4 whitespace-nowrap">Facility</th>
                  <th className="py-2 px-4 whitespace-nowrap">Fuel</th>
                  <th className="py-2 px-4 whitespace-nowrap">Amount</th>
                  <th className="py-2 px-4 whitespace-nowrap">Date</th>
                  <th className="py-2 px-4 whitespace-nowrap">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgb(var(--border))]">
                {records.map((r) => (
                  <tr key={r.id} className="align-top">
                    <td className="py-3 px-4">
                      <div className="font-medium text-[rgb(var(--text))]">
                        {r.facility}
                      </div>
                      <div className="text-[10px] text-[rgb(var(--muted))] leading-snug">
                        Scope 1 source
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="text-[rgb(var(--text))] text-xs font-medium">
                        {r.fuelType}
                      </div>
                      <div className="text-[10px] text-[rgb(var(--muted))] leading-snug">
                        {r.unit}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="text-[rgb(var(--text))] text-sm font-semibold">
                        {r.amount.toLocaleString()} {r.unit}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-[rgb(var(--text))] text-xs whitespace-nowrap">
                      {r.date}
                    </td>

                    <td className="py-3 px-4 text-xs text-[rgb(var(--text))] leading-snug max-w-[200px] break-words">
                      {r.note || <span className="text-[rgb(var(--muted))]">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="text-[10px] text-[rgb(var(--muted))] leading-snug mt-4">
            Changes here will affect downstream reporting (Dashboard, Analysis, Reports).
          </div>
        </div>
      </section>

      {/* Modal */}
      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/40 z-40" onClick={handleClose} />

          {/* Modal panel */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md card shadow-xl">
              <div className="card-body space-y-4">
                {/* Header */}
                <div className="card-row">
                  <div className="page-title">Add Fuel Data</div>
                  <button
                    className="text-[10px] font-medium border border-[rgb(var(--border))]
                               text-[rgb(var(--text))] rounded-lg px-2 py-1
                               hover:bg-[rgb(var(--card))]/60"
                    onClick={handleClose}
                  >
                    ✕
                  </button>
                </div>
                <div className="page-hint">
                  This will create a new Scope 1 combustion record.
                </div>

                {/* Form */}
                <div className="space-y-4">
                  {/* Facility */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-medium text-[rgb(var(--text))]">
                      Facility <span className="text-red-600">*</span>
                    </label>
                    <input
                      className="input"
                      placeholder="Calgary Plant"
                      value={draft.facility}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, facility: e.target.value }))
                      }
                    />
                    <div className="text-[10px] text-[rgb(var(--muted))] leading-snug">
                      Where was the fuel burned?
                    </div>
                  </div>

                  {/* Fuel type + unit in a row */}
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 flex flex-col gap-1">
                      <label className="text-[11px] font-medium text-[rgb(var(--text))]">
                        Fuel type
                      </label>
                      <select
                        className="input"
                        value={draft.fuelType}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, fuelType: e.target.value }))
                        }
                      >
                        <option>Diesel</option>
                        <option>Natural Gas</option>
                        <option>Gasoline</option>
                        <option>Propane</option>
                      </select>
                    </div>

                    <div className="w-full sm:w-24 flex flex-col gap-1">
                      <label className="text-[11px] font-medium text-[rgb(var(--text))]">
                        Unit
                      </label>
                      <select
                        className="input"
                        value={draft.unit}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, unit: e.target.value }))
                        }
                      >
                        <option value="L">L</option>
                        <option value="m³">m³</option>
                        <option value="gal">gal</option>
                        <option value="kWh">kWh</option>
                      </select>
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-medium text-[rgb(var(--text))]">
                      Amount burned <span className="text-red-600">*</span>
                    </label>
                    <input
                      className="input"
                      type="number"
                      min={0}
                      step="0.01"
                      value={draft.amount}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          amount: Number(e.target.value),
                        }))
                      }
                    />
                    <div className="text-[10px] text-[rgb(var(--muted))] leading-snug">
                      Raw activity data. Example: 12,400 L diesel for backup gen.
                    </div>
                  </div>

                  {/* Date */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-medium text-[rgb(var(--text))]">
                      Date of usage
                    </label>
                    <input
                      className="input"
                      type="date"
                      value={draft.date}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, date: e.target.value }))
                      }
                    />
                    <div className="text-[10px] text-[rgb(var(--muted))] leading-snug">
                      Usually delivery slip date or meter read date.
                    </div>
                  </div>

                  {/* Note */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-medium text-[rgb(var(--text))]">
                      Note / context
                    </label>
                    <textarea
                      className="input min-h-[60px]"
                      placeholder="Generator test after UPS failure…"
                      value={draft.note}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, note: e.target.value }))
                      }
                    />
                    <div className="text-[10px] text-[rgb(var(--muted))] leading-snug">
                      This note can appear in audit trail and reports.
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2 justify-end pt-2">
                  <button
                    className="text-xs font-medium border border-[rgb(var(--border))]
                               text-[rgb(var(--text))] rounded-lg px-3 py-2
                               hover:bg-[rgb(var(--card))]/60"
                    onClick={handleClose}
                  >
                    Cancel
                  </button>

                  <button
                    className="text-xs font-medium bg-emerald-600 text-white rounded-lg px-3 py-2 hover:bg-emerald-700"
                    onClick={handleSave}
                  >
                    Save entry
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
