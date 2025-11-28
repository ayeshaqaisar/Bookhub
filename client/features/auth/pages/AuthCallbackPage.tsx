import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getBackendClient } from "@/lib/backendClient";

const SUCCESS_REDIRECT_DELAY_MS = 1200;
const isBrowser = typeof window !== "undefined";

type Status = "loading" | "success" | "error";

const STATUS_CONTENT: Record<Status, { title: string; description: string }> = {
  loading: {
    title: "Verifying your email",
    description: "Please wait while we confirm your account.",
  },
  success: {
    title: "Email verified",
    description: "You're all set! Redirecting you to your profile.",
  },
  error: {
    title: "Verification failed",
    description: "We couldn't verify your email. Please try again.",
  },
};

function collectErrorFromUrl() {
  if (!isBrowser) return null;
  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = window.location.hash.startsWith("#")
    ? new URLSearchParams(window.location.hash.slice(1))
    : new URLSearchParams();

  return (
    searchParams.get("error_description") ??
    searchParams.get("error") ??
    hashParams.get("error_description") ??
    hashParams.get("error")
  );
}

function hasVerificationPayload() {
  if (!isBrowser) return false;
  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = window.location.hash.startsWith("#")
    ? new URLSearchParams(window.location.hash.slice(1))
    : new URLSearchParams();

  return (
    searchParams.has("code") ||
    hashParams.has("access_token") ||
    hashParams.has("refresh_token") ||
    hashParams.has("code")
  );
}

export function AuthCallback() {
  const navigate = useNavigate();
  const supabase = useMemo(() => getBackendClient(), []);

  const [status, setStatus] = useState<Status>("loading");
  const [details, setDetails] = useState<string | null>(null);
  const handledRef = useRef(false);

  useEffect(() => {
    if (!isBrowser || handledRef.current) return;
    handledRef.current = true;

    let timeoutId: number | null = null;

    const urlError = collectErrorFromUrl();
    if (urlError) {
      setStatus("error");
      setDetails(urlError);
      return () => {
        if (timeoutId !== null) {
          window.clearTimeout(timeoutId);
        }
      };
    }

    if (!hasVerificationPayload()) {
      setStatus("error");
      setDetails("Missing verification information. Please request a new confirmation email.");
      return () => {
        if (timeoutId !== null) {
          window.clearTimeout(timeoutId);
        }
      };
    }

    const handleSession = async () => {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const hashParams = window.location.hash.startsWith("#")
          ? new URLSearchParams(window.location.hash.slice(1))
          : new URLSearchParams();

        const code = searchParams.get("code") ?? hashParams.get("code");
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
          if (error) throw error;
        } else {
          throw new Error("Missing verification tokens. Please request a new confirmation email.");
        }

        window.history.replaceState({}, document.title, window.location.pathname);
        setStatus("success");
        setDetails(null);
        timeoutId = window.setTimeout(() => {
          navigate("/profile", { replace: true });
        }, SUCCESS_REDIRECT_DELAY_MS);
      } catch (error) {
        setStatus("error");
        setDetails(error instanceof Error ? error.message : "Unknown error occurred while verifying your email.");
      }
    };

    void handleSession();

    return () => {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [navigate, supabase]);

  const { title, description } = STATUS_CONTENT[status];

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            {status === "success" && <CheckCircle2 className="h-12 w-12 text-green-500" />}
            {status === "error" && <XCircle className="h-12 w-12 text-destructive" />}
            {status === "loading" && <Loader2 className="h-12 w-12 text-primary animate-spin" />}
          </div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {details && <p className="text-sm text-muted-foreground">{details}</p>}
          {status === "error" && (
            <div className="space-y-2">
              <Button className="w-full" onClick={() => navigate("/login", { replace: true })}>
                Back to login
              </Button>
              <Button variant="outline" className="w-full" onClick={() => navigate("/register", { replace: true })}>
                Create account
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default AuthCallback;
