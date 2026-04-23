import React, { useState } from 'react';

export default function ConfirmButton({
  onConfirm,
  children = 'Delete',
  message = 'Are you sure?',
  className = 'btn btn-danger'
}: {
  onConfirm: () => void | Promise<void>;
  children?: React.ReactNode;
  message?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const go = async () => {
    setBusy(true);
    try { await onConfirm(); } finally { setBusy(false); setOpen(false); }
  };

  return (
    <>
      <button className={className} onClick={() => setOpen(true)}>{children}</button>
      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="card max-w-sm w-full">
            <div className="card-body space-y-4">
              <div className="text-base">{message}</div>
              <div className="flex justify-end gap-2">
                <button className="btn btn-outline" onClick={() => setOpen(false)}>Cancel</button>
                <button className="btn btn-danger" onClick={go} disabled={busy}>{busy ? '...' : 'Confirm'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
