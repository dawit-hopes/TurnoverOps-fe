import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Logo } from "../../components/layout/Logo";
import { finishCalendarConnect } from "../../services/apiOperations";
import { authToken } from "../../services/http";

export function GoogleCalendarCallback() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("Connecting Google Calendar…");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    const oauthError = params.get("error");
    if (!authToken()) {
      setMessage("Sign in again, then connect Google Calendar from Settings.");
      return;
    }
    if (oauthError) {
      setMessage("Google Calendar authorization was cancelled.");
      return;
    }
    if (!code || !state) {
      setMessage("The authorization response did not include a code.");
      return;
    }
    void finishCalendarConnect(code, state)
      .then(() => navigate("/settings", { replace: true }))
      .catch((error: unknown) => setMessage(error instanceof Error ? error.message : "Google Calendar could not be connected."));
  }, [navigate]);

  return (
    <main className="grid min-h-screen place-items-center bg-canvas px-4">
      <div className="w-full max-w-md">
        <Logo />
        <p className="mt-6 text-sm text-muted">{message}</p>
      </div>
    </main>
  );
}
