import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getCleanerRejection, rejectCleanerAssignment, type CleanerRejectionDetails, type CleanerRejectionResult } from "../../services/apiOperations";
import { Button } from "../../components/ui/Button";

export function RejectAssignmentPage() {
  const { token = "" } = useParams();
  const [details, setDetails] = useState<CleanerRejectionDetails | null>(null);
  const [result, setResult] = useState<CleanerRejectionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void getCleanerRejection(token)
      .then((value) => {
        if (!cancelled) setDetails(value);
      })
      .catch(() => {
        if (!cancelled) setError("This link could not be checked. Ask the manager for a new assignment email.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function decline() {
    setBusy(true);
    setError("");
    try {
      setResult(await rejectCleanerAssignment(token));
    } catch {
      setError("The response could not be recorded. Please try again or contact the manager.");
    } finally {
      setBusy(false);
    }
  }

  const timezone = details?.timezone || "UTC";
  return (
    <main className="grid min-h-screen place-items-center bg-canvas px-4 py-10 text-ink">
      <section className="w-full max-w-lg space-y-6 rounded-xl border border-line bg-white p-6 shadow-sm sm:p-8">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted">TurnoverOps · Cleaner response</p>
          <h1 className="text-2xl font-semibold tracking-tight">{result?.title || details?.title || (loading ? "Checking this job…" : "Could not open this job")}</h1>
          <p className="text-sm leading-6 text-muted">{result?.detail || details?.detail || error}</p>
        </div>

        {details?.property_name && details.scheduled_start && details.scheduled_end ? (
          <dl className="space-y-3 rounded-lg bg-zinc-50 p-4 text-sm">
            <div>
              <dt className="text-muted">Property</dt>
              <dd className="mt-0.5 font-medium">{details.property_name}</dd>
            </div>
            <div>
              <dt className="text-muted">Scheduled time</dt>
              <dd className="mt-0.5 font-medium">
                {formatMoment(details.scheduled_start, timezone)}–{formatClock(details.scheduled_end, timezone)}
              </dd>
            </div>
          </dl>
        ) : null}

        {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}

        {details?.can_decline && !result ? (
          <div className="space-y-3">
            <Button disabled={busy || loading} onClick={() => void decline()}>
              {busy ? "Recording response…" : "Reject this job"}
            </Button>
            <p className="text-xs leading-5 text-muted">The job remains assigned unless you choose to reject it. TurnoverOps will look for another available cleaner after you submit.</p>
          </div>
        ) : null}

        {!details?.can_decline || result ? (
          <Link className="inline-flex text-sm font-medium text-accent underline underline-offset-4" to="/">
            Close this page
          </Link>
        ) : null}
      </section>
    </main>
  );
}

function formatMoment(value: string, timezone: string) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
  }).format(new Date(value));
}

function formatClock(value: string, timezone: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
  }).format(new Date(value));
}
