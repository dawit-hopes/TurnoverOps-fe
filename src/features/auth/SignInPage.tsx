import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Logo } from "../../components/layout/Logo";
import { useOps } from "../../state/OperationsContext";

export function SignInPage() {
  const navigate = useNavigate();
  const { signInWithGoogle } = useOps();
  const signInRef = useRef(signInWithGoogle);
  signInRef.current = signInWithGoogle;
  const buttonRef = useRef<HTMLDivElement>(null);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const [error, setError] = useState("");

  useEffect(() => {
    if (!clientId || !buttonRef.current) return;
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = () => {
      if (!window.google || !buttonRef.current) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => {
          void signInRef.current(response.credential)
            .then(() => navigate("/"))
            .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Google sign-in failed."));
        },
      });
      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: "outline",
        size: "large",
        width: 360,
        text: "continue_with",
      });
    };
    script.onerror = () => setError("Google sign-in could not be loaded.");
    document.head.appendChild(script);
    return () => {
      script.remove();
    };
  }, [clientId, navigate]);

  return (
    <main className="grid min-h-screen place-items-center bg-canvas px-4">
      <div className="w-full max-w-md">
        <Logo />
        <h1 className="mt-8 text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="mt-2 text-sm text-muted">Coordinate turnovers, cleaning assignments, and the few issues that still need you.</p>
        {clientId ? <div ref={buttonRef} className="mt-6" /> : (
          <p className="mt-6 text-sm text-danger">Set VITE_GOOGLE_CLIENT_ID to the same Google OAuth web client ID as the API, and allow http://localhost:5173 as a JavaScript origin.</p>
        )}
        {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
        
      </div>
    </main>
  );
}
