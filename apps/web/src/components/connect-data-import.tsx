"use client";
import { useEffect, useState } from "react";
import {
  CONNECT_DATA_MAX_BYTES,
  CONNECT_DATA_STORAGE_KEY,
  connectDataBatchSchema,
  type ConnectDataEntry,
  type ConnectDataRecord,
  type MutationKind,
  type ActionResult,
} from "@friday/schemas";
import { Card } from "@/components/ui";

function parse(text: string) {
  if (new TextEncoder().encode(text).byteLength > CONNECT_DATA_MAX_BYTES)
    throw new Error("Sync up to 768 KB at a time.");
  const result = connectDataBatchSchema.safeParse(JSON.parse(text));
  if (!result.success) throw new Error(result.error.issues[0]?.message || "Invalid Connect data.");
  return result.data;
}
function Records({ entries }: { entries: ConnectDataEntry[] }) {
  return (
    <div className="stack">
      {entries.map((row) => (
        <details className="connect-data-record" key={row.endpoint}>
          <summary>GET {row.endpoint}</summary>
          <p className="muted">Captured {row.captured_at}</p>
          <pre>{JSON.stringify(row.data, null, 2)}</pre>
        </details>
      ))}
    </div>
  );
}
export function ConnectDataImport({
  records,
  act,
  preview,
}: {
  records: ConnectDataRecord[];
  preview: boolean;
  act: (kind: MutationKind, raw: unknown) => Promise<ActionResult>;
}) {
  const [text, setText] = useState("");
  const [entries, setEntries] = useState<ConnectDataEntry[] | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    function receive() {
      try {
        const raw = sessionStorage.getItem(CONNECT_DATA_STORAGE_KEY);
        if (!raw) return;
        sessionStorage.removeItem(CONNECT_DATA_STORAGE_KEY);
        if (new TextEncoder().encode(raw).byteLength > CONNECT_DATA_MAX_BYTES + 1024)
          throw new Error("Connect transfer is too large.");
        const envelope = JSON.parse(raw);
        if (
          envelope.version !== 1 ||
          typeof envelope.expiresAt !== "number" ||
          envelope.expiresAt < Date.now()
        )
          throw new Error("This Connect transfer expired. Sync again from Connect.");
        const rows = parse(JSON.stringify(envelope.entries));
        setEntries(rows);
        setText(JSON.stringify(rows, null, 2));
        setConfirmed(false);
        setMessage("Received Connect records. Open each response to review it before saving.");
      } catch (error) {
        setEntries(null);
        setConfirmed(false);
        setMessage(error instanceof Error ? error.message : "Invalid Connect data.");
      }
    }
    const timer = setTimeout(receive, 0);
    window.addEventListener("friday-connect-data", receive);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("friday-connect-data", receive);
    };
  }, []);
  async function save() {
    if (!confirmed || !entries) return;
    setPending(true);
    try {
      const result = await act("connect_data_import", { entries });
      setMessage(
        result.ok
          ? preview
            ? "Connect data saved in this temporary preview."
            : "Connect data saved privately to your account."
          : result.message,
      );
      if (result.ok) {
        setEntries(null);
        setText("");
        setConfirmed(false);
      }
    } catch {
      setMessage("Could not save Connect data. Please try again.");
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="stack connect-data" data-friday-connect-data="v1">
      <Card title="Sync your Connect data">
        <p>
          Enable “Capture other Connect records” in the extension, then visit the Connect pages you
          want to sync. Choose “Review other records in FRIDAY” to review and save captured
          responses here.
        </p>
        <p className="muted">
          This archive can hold grades, advising, fees and other JSON records that Connect displays.
          It captures successful GET responses as you browse. Authentication endpoints are excluded
          and known credential fields are redacted. Only you can read your saved archive.
        </p>
        <a className="action-button" href="/downloads/friday-connect-extension.zip" download>
          Download Connect extension
        </a>
        <details>
          <summary>Import an exported Connect data batch</summary>
          <label className="field">
            Connect data JSON
            <textarea
              rows={6}
              value={text}
              disabled={pending}
              maxLength={CONNECT_DATA_MAX_BYTES}
              onChange={(event) => {
                setText(event.target.value);
                setEntries(null);
                setConfirmed(false);
              }}
            />
          </label>
          <button
            className="action-button"
            disabled={pending || !text.trim()}
            onClick={() => {
              setEntries(null);
              setConfirmed(false);
              try {
                setEntries(parse(text));
                setMessage("");
              } catch (error) {
                setMessage(error instanceof Error ? error.message : "Invalid JSON.");
              }
            }}
          >
            Preview Connect data
          </button>
        </details>
        {entries && (
          <div className="stack">
            <h3>Review {entries.length} Connect responses</h3>
            <Records entries={entries} />
            <label className="connect-confirm">
              <input
                type="checkbox"
                checked={confirmed}
                disabled={pending}
                onChange={(event) => setConfirmed(event.target.checked)}
              />
              These are my Connect records. Save them privately and replace my earlier snapshots for
              these endpoints.
            </label>
            <button
              className="action-button primary"
              disabled={pending || !confirmed}
              onClick={save}
            >
              {pending ? "Saving…" : "Confirm Connect data import"}
            </button>
            <button
              className="action-button"
              disabled={pending}
              onClick={() => {
                setEntries(null);
                setConfirmed(false);
              }}
            >
              Cancel data review
            </button>
          </div>
        )}
        {message && <p role="status">{message}</p>}
      </Card>
      <Card title={`Your saved Connect responses (${records.length})`}>
        <p className="muted">
          Showing up to 100 recently imported endpoints. These are snapshots; source freshness is
          unknown. They do not change your degree credits, payments or official registration.
        </p>
        {records.length === 0 && <p>No Connect data saved yet.</p>}
        {records.map((record) => (
          <div className="stack" key={record.endpoint}>
            <Records entries={[record]} />
            <p className="muted">Last imported: {record.imported_at}</p>
            <button
              className="action-button"
              disabled={pending}
              onClick={async () => {
                setPending(true);
                try {
                  const result = await act("connect_data_delete", { endpoint: record.endpoint });
                  setMessage(result.ok ? "Connect response removed." : result.message);
                } catch {
                  setMessage("Could not remove this response.");
                } finally {
                  setPending(false);
                }
              }}
            >
              Remove {record.endpoint}
            </button>
          </div>
        ))}
        {records.length > 0 && (
          <button
            className="action-button"
            onClick={() => {
              const url = URL.createObjectURL(
                new Blob([JSON.stringify(records, null, 2)], { type: "application/json" }),
              );
              const anchor = document.createElement("a");
              anchor.href = url;
              anchor.download = "friday-connect-data.json";
              anchor.click();
              setTimeout(() => URL.revokeObjectURL(url), 1000);
            }}
          >
            Export saved Connect data
          </button>
        )}
      </Card>
    </div>
  );
}
