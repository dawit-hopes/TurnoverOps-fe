import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, RefreshCw, X } from "lucide-react";
import { Logo } from "../../components/layout/Logo";
import { useOps } from "../../state/OperationsContext";

export function SignInPage() {
  const navigate = useNavigate();
  const { signInWithGoogle } = useOps();
  const signInRef = useRef(signInWithGoogle);
  signInRef.current = signInWithGoogle;

  const buttonRef = useRef<HTMLDivElement>(null);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  const [isScriptLoading, setIsScriptLoading] = useState(Boolean(clientId));
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  const initGoogleButton = useCallback(() => {
    if (!window.google || !buttonRef.current || !clientId) return;

    try {
      buttonRef.current.innerHTML = "";
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => {
          setIsAuthenticating(true);
          setError(null);
          void signInRef
            .current(response.credential)
            .then(() => {
              navigate("/");
            })
            .catch((reason: unknown) => {
              setIsAuthenticating(false);
              setError(
                reason instanceof Error
                  ? reason.message
                  : "Google authentication failed. Please try again.",
              );
            });
        },
      });

      const containerWidth = buttonRef.current
        ? Math.floor(buttonRef.current.getBoundingClientRect().width)
        : 320;
      const targetWidth = Math.max(200, Math.min(340, containerWidth || 320));

      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: "outline",
        size: "large",
        width: targetWidth,
        text: "continue_with",
        shape: "rectangular",
      });

      setIsScriptLoading(false);
    } catch (err) {
      setIsScriptLoading(false);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load Google Sign-In widget.",
      );
    }
  }, [clientId, navigate]);

  useEffect(() => {
    if (!clientId) {
      setIsScriptLoading(false);
      return;
    }

    if (window.google) {
      initGoogleButton();
      return;
    }

    setIsScriptLoading(true);
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = () => {
      initGoogleButton();
    };
    script.onerror = () => {
      setIsScriptLoading(false);
      setError("Could not load Google Sign-In. Check your internet connection.");
    };

    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, [clientId, retryKey, initGoogleButton]);

  const handleRetry = () => {
    setError(null);
    setIsScriptLoading(true);
    setRetryKey((prev) => prev + 1);
  };

  return (
    <main className="grid min-h-screen place-items-center bg-canvas px-4 py-12">
      <div className="w-full max-w-sm">
        {/* Brand header */}
        <div className="flex flex-col items-center text-center">
          <Logo />
          <h1 className="mt-6 text-xl font-semibold tracking-tight text-ink">
            Sign in to TurnoverOps
          </h1>
          <p className="mt-1 text-sm text-muted">
            Coordinate turnovers, cleaning assignments, and scheduling issues.
          </p>
        </div>

        {/* Card */}
        <div className="mt-6 rounded-xl border border-line bg-white p-6 shadow-xs">
          {/* Missing Client ID alert */}
          {!clientId && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-amber-950">OAuth Client ID not set</p>
                  <p className="text-amber-800">
                    Add <code className="rounded bg-amber-100 px-1 py-0.5 font-mono text-[11px]">VITE_GOOGLE_CLIENT_ID</code> to your <code className="font-mono text-[11px]">.env</code> file.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error alert */}
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-danger flex items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-danger mt-0.5" />
                <div>
                  <p className="font-medium">{error}</p>
                  <button
                    type="button"
                    onClick={handleRetry}
                    className="mt-1 inline-flex items-center gap-1 font-semibold text-danger hover:underline cursor-pointer"
                  >
                    <RefreshCw size={11} />
                    Try again
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-700 p-0.5"
                aria-label="Dismiss error"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Google Sign In container */}
          {clientId && (
            <div className="relative">
              {isScriptLoading && (
                <div className="h-10 w-full rounded-md border border-line bg-zinc-50 flex items-center justify-center gap-2 text-xs text-muted">
                  <div className="h-3.5 w-3.5 rounded-full border-2 border-muted/30 border-t-muted animate-spin" />
                  <span>Loading sign-in…</span>
                </div>
              )}

              <div
                ref={buttonRef}
                className={`flex justify-center w-full min-h-[40px] ${
                  isScriptLoading ? "opacity-0 absolute pointer-events-none" : "opacity-100"
                }`}
              />

              {isAuthenticating && (
                <div className="absolute inset-0 z-10 flex items-center justify-center rounded-md bg-white/95 backdrop-blur-xs border border-line">
                  <div className="flex items-center gap-2 text-xs font-medium text-ink">
                    <RefreshCw className="h-3.5 w-3.5 animate-spin text-accent" />
                    <span>Signing in…</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Scope notice */}
          <p className="mt-4 border-t border-line/60 pt-3 text-center text-[11px] text-muted leading-relaxed">
            Calendar access is read-only. We only use it to detect turnover windows and never access personal emails.
          </p>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-muted">
          TurnoverOps © {new Date().getFullYear()}
        </p>
      </div>
    </main>
  );
}
