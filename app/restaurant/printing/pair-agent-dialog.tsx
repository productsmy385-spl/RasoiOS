"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { TextField } from "@/components/ui/inputs";
import { createPrintAgentPairingAction } from "./actions";

/**
 * Pair a print agent (SA-AGT-01; S1-P16-T006).
 *
 * The pairing code is shown exactly once: the server stores only its SHA-256 hash and forgets the code itself
 * (ADR-007 §1, SC-PRINT-02). The dialog therefore says so plainly and counts the ten minutes down, instead of
 * offering a "show again" that could not work.
 */
export type IssuedPairing = { agentId: string; name: string; pairingCode: string; expiresAt: string };

function remainingLabel(expiresAt: string, nowMs: number): string {
  const seconds = Math.max(0, Math.round((Date.parse(expiresAt) - nowMs) / 1000));
  if (seconds === 0) return "This code has expired. Create another one.";
  const minutes = Math.floor(seconds / 60);
  return `Expires in ${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

export function PairAgentDialog({ open, onClose, onPaired }: { open: boolean; onClose: () => void; onPaired: () => void }) {
  const [name, setName] = React.useState("");
  const [issued, setIssued] = React.useState<IssuedPairing | null>(null);
  const [fieldError, setFieldError] = React.useState<string | undefined>(undefined);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const [nowMs, setNowMs] = React.useState(() => Date.now());
  // The agent talks to this same site; read on the client so the command shows the address the admin is using.
  const serverOrigin = typeof window === "undefined" ? "https://<this-site>" : window.location.origin;

  React.useEffect(() => {
    if (!open) return;
    setName("");
    setIssued(null);
    setFieldError(undefined);
    setFormError(null);
  }, [open]);

  React.useEffect(() => {
    if (!issued) return;
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [issued]);

  async function create() {
    setPending(true);
    setFieldError(undefined);
    setFormError(null);
    const result = await createPrintAgentPairingAction({ name });
    setPending(false);
    if (!result.ok) {
      if (result.error.fieldErrors?.name) setFieldError(result.error.fieldErrors.name[0]);
      else setFormError(result.error.message);
      return;
    }
    setIssued(result.data);
    setNowMs(Date.now());
    onPaired();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={issued ? `Pairing code for ${issued.name}` : "Pair a print agent"}
      description={
        issued
          ? "Type this code into the print agent on the restaurant PC. It is shown once and works for ten minutes."
          : "Give the restaurant PC a name you will recognise. You will get a one-time code to type into the agent."
      }
      footer={
        issued ? (
          <Button variant="primary" onClick={onClose}>
            Done
          </Button>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose} disabled={pending}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => void create()} loading={pending} loadingLabel="Creating…">
              Create code
            </Button>
          </>
        )
      }
    >
      <div className="flex flex-col gap-4">
        {formError && (
          <p role="alert" className="rounded-xl border border-status-danger/30 bg-status-danger/12 px-3 py-2 text-body text-status-danger">
            {formError}
          </p>
        )}
        {issued ? (
          <div className="flex flex-col gap-3">
            <p
              aria-label={`Pairing code ${issued.pairingCode.split("").join(" ")}`}
              className="rounded-2xl border border-border-strong bg-raised px-4 py-6 text-center text-display-m text-numeric tracking-[0.3em] text-fg-primary"
            >
              {issued.pairingCode}
            </p>
            <p className="text-caption text-fg-secondary" aria-live="polite">
              {remainingLabel(issued.expiresAt, nowMs)}
            </p>
            <ol className="flex list-decimal flex-col gap-2 pl-5 text-body text-fg-secondary">
              <li>On the restaurant PC, unzip the RASOIOS print agent download (Windows or Linux) and open a terminal as administrator in that folder.</li>
              <li>
                Run the installer with this code:
                <code className="mt-1 block overflow-x-auto whitespace-pre rounded-xl border border-border-subtle bg-raised px-3 py-2 text-caption text-fg-primary">
                  {`Windows: powershell -ExecutionPolicy Bypass -File install.ps1 -ServerUrl ${serverOrigin} -PairingCode ${issued.pairingCode}\nLinux:   sudo sh install.sh ${serverOrigin} ${issued.pairingCode}`}
                </code>
              </li>
              <li>Assign this agent to each printer on the Printers tab, then send a test print.</li>
            </ol>
          </div>
        ) : (
          <TextField
            name="name"
            label="Device name"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            error={fieldError}
            placeholder="Counter PC"
            maxLength={60}
          />
        )}
      </div>
    </Dialog>
  );
}
