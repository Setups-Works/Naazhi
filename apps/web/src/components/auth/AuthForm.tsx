"use client";
import GoogleMark from "./GoogleMark";
import { buttonClass } from "../site/ui";
import { Field, LastUsed, linkCls, Meter, Or, PrimaryButton, SecondaryButton, TextInput, TextLink } from "./ui";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Icon as FA } from "@/components/ui/Icon";
import {
  faArrowRight,
  faCircleCheck,
  faEnvelopeOpenText,
  faEye,
  faEyeSlash,
  faSpinner,
  faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";
import { authClient, oneTapAuthClient } from "../../lib/auth/client";
import { EMAIL_RE } from "../../lib/validate";
import { safeNext } from "../../lib/auth/redirect";
import DesktopCodeSignIn from "./DesktopCodeSignIn";

type Mode = "login" | "signup" | "forgot" | "reset";

const COPY: Record<Mode, { eyebrow: string; title: string; quiet: string; sub: string; cta: string }> = {
  login: { eyebrow: "Welcome back", title: "Log in to your", quiet: "workspace.", sub: "Pick up where you left off.", cta: "Log in" },
  signup: {
    eyebrow: "Create your account",
    title: "Start your",
    quiet: "workspace.",
    sub: "One place for notes, mail, calendar and meetings.",
    cta: "Create account",
  },
  forgot: {
    eyebrow: "Forgot password",
    title: "Reset your",
    quiet: "password.",
    sub: "Enter your email and we’ll send you a one-time reset code.",
    cta: "Send reset code",
  },
  reset: {
    eyebrow: "New password",
    title: "Choose a new",
    quiet: "password.",
    sub: "Make it at least 8 characters.",
    cta: "Update password",
  },
};

function strength(p: string) {
  let s = 0;
  if (p.length >= 8) s++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++;
  if (/\d/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p) || p.length >= 14) s++;
  return s;
}
const LABELS = ["Too short", "Weak", "Okay", "Good", "Strong"];
const USERNAME_RE = /^[A-Za-z0-9_.]{3,30}$/;

function friendly(msg: string) {
  const m = msg.toLowerCase();
  if (m.includes("invalid login") || m.includes("invalid email or password")) return "That email and password don’t match.";
  if (m.includes("invalid username or password")) return "That email or username and password don’t match.";
  if (m.includes("username_is_already_taken") || m.includes("username already taken"))
    return "That username is already in use. Choose another one.";
  if (m.includes("not verified") || m.includes("not confirmed")) return "Please confirm your email first — check your inbox.";
  if (m.includes("already exists") || m.includes("already registered")) return "An account with this email already exists. Try logging in.";
  if (m.includes("suspended")) return "This account has been suspended. Contact support if you think this is a mistake.";
  if (m.includes("rate limit") || m.includes("too many")) return "Too many attempts. Please wait a minute and try again.";
  if (m.includes("password should be")) return "Choose a stronger password (at least 8 characters).";
  return msg;
}

export default function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const c = COPY[mode];
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [viaBrowser, setViaBrowser] = useState(false);
  const [passkeyBusy, setPasskeyBusy] = useState(false);
  const [err, setErr] = useState(params.get("error") === "link" ? "That link has expired or was already used. Please try again." : "");
  const [done, setDone] = useState<null | "confirm" | "reset">(null);
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [show, setShow] = useState(false);
  const [lastUsedMethod, setLastUsedMethod] = useState<string | null>(null);
  const [cfg, setCfg] = useState<{ google: boolean; googleClientId: string | null; configured: boolean } | null>(null);
  const score = useMemo(() => strength(pw), [pw]);
  // Google One Tap: the small "Continue as …" prompt that appears on its own when the visitor is signed in to Google in this browser.
  // The Sign-in button below stays as the fallback if the prompt is dismissed or the browser blocks it.
  useEffect(() => {
    setLastUsedMethod(authClient.getLastUsedLoginMethod());
  }, []);
  useEffect(() => {
    // One Tap is a Google pop-up, which the desktop window can't show (see google() below).
    if (!cfg?.googleClientId || (mode !== "login" && mode !== "signup") || window.naazhiDesktop) return;
    void oneTapAuthClient(cfg.googleClientId)
      .oneTap({
        callbackURL: next,
        // Wording of the prompt: "Sign in with Google" on the login page, "Sign up with Google" on the signup page.
        context: mode === "signup" ? "signup" : "signin",
        // Keep the upgraded One Tap experience on Safari/Firefox (they block third-party cookies via ITP).
        additionalOptions: { itp_support: true },
        // We never sign in silently: the visitor always taps "Continue as …" first.
        autoSelect: false,
        fetchOptions: { onSuccess: () => window.location.assign(next) },
      })
      .catch(() => undefined);
  }, [cfg, mode, next]);
  useEffect(() => {
    fetch("/api/v1/auth-config")
      .then((r) => r.json())
      .then(setCfg)
      .catch(() => setCfg(null));
  }, []);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr("");
    const f = new FormData(e.currentTarget);
    const name = String(f.get("name") || "").trim();
    const username = String(f.get("username") || "").trim();
    if (mode === "login" && !EMAIL_RE.test(email.trim()) && !USERNAME_RE.test(email.trim()))
      return setErr("Enter a valid email address or a username with 3–30 letters, numbers, dots or underscores.");
    if ((mode === "signup" || (mode === "forgot" && !otpSent)) && !EMAIL_RE.test(email.trim()))
      return setErr("Please enter a valid email address.");
    const resettingWithOtp = mode === "forgot" && otpSent;
    if ((mode === "signup" || mode === "reset" || resettingWithOtp) && pw.length < 8)
      return setErr("Your password needs at least 8 characters.");
    if (resettingWithOtp && !/^\d{6}$/.test(otp.trim())) return setErr("Enter the 6-digit code from your email.");
    if (resettingWithOtp && pw !== confirmPw) return setErr("Your passwords don’t match.");
    if (mode === "signup" && !name) return setErr("Please tell us your name.");
    if (mode === "signup" && !USERNAME_RE.test(username))
      return setErr("Choose a username with 3–30 letters, numbers, dots or underscores.");
    if (cfg && !cfg.configured) return setErr("We can’t reach the server right now. Please try again in a moment.");

    setBusy(true);
    try {
      if (mode === "login") {
        const identifier = email.trim();
        const { error } = EMAIL_RE.test(identifier)
          ? await authClient.signIn.email({ email: identifier, password: pw })
          : await authClient.signIn.username({ username: identifier, password: pw });
        if (error) {
          // Unverified accounts get a fresh verification email automatically; show the "confirm" screen.
          if (error.status === 403 && /verif/i.test(error.message ?? "")) return setDone("confirm");
          throw new Error(error.message || "Invalid login");
        }
        router.push(next);
        router.refresh();
        return;
      }
      if (mode === "signup") {
        const { data, error } = await authClient.signUp.email({
          email: email.trim(),
          password: pw,
          name,
          username,
          callbackURL: next,
        });
        if (error) throw new Error(error.message || "Couldn’t create the account.");
        if (data?.token) {
          router.push(next);
          router.refresh();
        } else setDone("confirm");
        return;
      }
      if (mode === "forgot") {
        if (!otpSent) {
          const { error } = await authClient.emailOtp.requestPasswordReset({ email: email.trim() });
          if (error) throw new Error(error.message || "Couldn’t send the email.");
          setOtpSent(true);
          return;
        }
        const { error } = await authClient.emailOtp.resetPassword({ email: email.trim(), otp: otp.trim(), password: pw });
        if (error) throw new Error(error.message || "Couldn’t update the password.");
        setDone("reset");
        return;
      }
      const token = params.get("token");
      if (!token) throw new Error("That link has expired or was already used. Please request a new one.");
      const { error } = await authClient.resetPassword({ newPassword: pw, token });
      if (error) throw new Error(error.message || "Couldn’t update the password.");
      router.push("/login");
      router.refresh();
    } catch (x) {
      setErr(friendly(x instanceof Error ? x.message : "Something went wrong."));
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    setErr("");
    // Google refuses sign-in inside the desktop app's window, so the app sends the person to their own browser and signs in on return.
    if (window.naazhiDesktop) return void setViaBrowser(true);
    setGoogleBusy(true);
    try {
      const { error } = await authClient.signIn.social({ provider: "google", callbackURL: next });
      if (error) setErr(friendly(error.message ?? "Couldn’t start Google sign-in."));
    } catch (x) {
      setErr(friendly(x instanceof Error ? x.message : "Couldn’t start Google sign-in."));
    } finally {
      setGoogleBusy(false);
    }
  }

  async function signInWithPasskey() {
    setErr("");
    setPasskeyBusy(true);
    try {
      const { error } = await authClient.signIn.passkey();
      if (error) throw new Error(error.message || "Couldn’t sign in with that passkey.");
      window.location.assign(next);
    } catch (x) {
      setErr(friendly(x instanceof Error ? x.message : "Couldn’t sign in with that passkey."));
    } finally {
      setPasskeyBusy(false);
    }
  }

  async function resend() {
    setBusy(true);
    const { error } = await authClient.sendVerificationEmail({ email: email.trim(), callbackURL: next });
    setBusy(false);
    setErr(error ? friendly(error.message ?? "") : "");
  }

  async function resendResetCode() {
    setBusy(true);
    const { error } = await authClient.emailOtp.requestPasswordReset({ email: email.trim() });
    setBusy(false);
    setErr(error ? friendly(error.message ?? "") : "");
  }

  if (done)
    return (
      <div className="flex flex-col items-center gap-4 py-3 text-center" role="status">
        <span className="grid size-[72px] place-items-center rounded-full bg-green-bg text-[28px] text-green-fg">
          <FA icon={done === "confirm" ? faEnvelopeOpenText : faCircleCheck} />
        </span>
        <h2 className="m-0 font-serif text-[28px] leading-tight font-semibold tracking-[-0.022em]">
          {done === "reset" ? "Password updated" : "Confirm your email"}
        </h2>
        <p className="m-0 text-[15px] leading-relaxed text-fg-muted">
          {done === "reset" ? (
            "You can now log in with your new password."
          ) : (
            <>
              We sent a confirmation link to <b className="text-fg">{email}</b>. Open it to activate your account.
            </>
          )}
        </p>
        {done === "confirm" && (
          <SecondaryButton type="button" onClick={resend} disabled={busy}>
            Resend email
          </SecondaryButton>
        )}
        {err && <FormError>{err}</FormError>}
        <Link href="/login" className={done === "reset" ? `${buttonClass("primary")} w-full` : linkCls}>
          Back to log in
        </Link>
      </div>
    );

  const oneTap = !!cfg?.google && (mode === "login" || mode === "signup");
  const locked = busy || googleBusy || passkeyBusy;
  const checking = mode === "signup" || mode === "reset" || (mode === "forgot" && otpSent);

  if (viaBrowser) return <DesktopCodeSignIn next={next} onCancel={() => setViaBrowser(false)} />;

  return (
    <div className="flex flex-col gap-5 short:gap-3">
      <header className="flex flex-col gap-2 short:gap-1">
        <p className="m-0 text-[12px] font-semibold tracking-[0.1em] text-green-fg uppercase">{c.eyebrow}</p>
        <h1 className="m-0 font-serif text-[clamp(30px,4vw,38px)] short:text-[28px] leading-[1.06] font-semibold tracking-[-0.03em]">
          {c.title} <span className="text-fg-faint">{c.quiet}</span>
        </h1>
        <p className="m-0 text-[15px] leading-relaxed text-fg-muted">
          {mode === "forgot" && otpSent
            ? `If an account exists for ${email}, a code is on its way. Enter it below to set a new password.`
            : c.sub}
        </p>
      </header>

      {cfg && !cfg.configured && (
        <p className="at-amber tint m-0 flex items-start gap-2.5 rounded-r2 p-3.5 text-[13px] leading-relaxed" role="note">
          <FA icon={faTriangleExclamation} className="mt-0.5" />
          <span>
            We can’t reach the server right now. Please try again in a moment.
          </span>
        </p>
      )}

      {oneTap && (
        <div className="flex flex-col gap-3">
          <SecondaryButton type="button" onClick={google} disabled={locked}>
            <GoogleMark />
            {googleBusy ? (
              <>
                <FA icon={faSpinner} spin /> Connecting to Google…
              </>
            ) : (
              <>
                Continue with Google
                {lastUsedMethod === "google" && <LastUsed />}
              </>
            )}
          </SecondaryButton>
          {mode === "login" && (
            <SecondaryButton type="button" onClick={signInWithPasskey} disabled={locked}>
              {passkeyBusy ? <FA icon={faSpinner} spin /> : <Image src="/passkey-icon.png" alt="" width={18} height={18} />}
              Continue with a passkey
              {lastUsedMethod === "passkey" && <LastUsed />}
            </SecondaryButton>
          )}
          <Or />
        </div>
      )}

      <form className="flex flex-col gap-4 short:gap-2.5" onSubmit={submit} noValidate>
        {mode === "signup" && (
          <Field label="Full name">
            <TextInput name="name" autoComplete="name" maxLength={80} placeholder="Ada Lovelace" />
          </Field>
        )}
        {mode === "signup" && (
          <Field label="Username" hint="You can use this with your password to log in.">
            <TextInput
              name="username"
              autoComplete="username"
              minLength={3}
              maxLength={30}
              pattern="[A-Za-z0-9_.]{3,30}"
              required
              placeholder="ada.lovelace"
            />
          </Field>
        )}
        {mode !== "reset" && !(mode === "forgot" && otpSent) && (
          <Field
            label={mode === "login" ? "Email or username" : "Email"}
            aside={mode === "login" && (lastUsedMethod === "email" || lastUsedMethod === "username") ? <LastUsed /> : undefined}
          >
            <TextInput
              type={mode === "login" ? "text" : "email"}
              autoComplete={mode === "login" ? "username" : "email"}
              maxLength={254}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={mode === "login" ? "you@example.com or username" : "you@example.com"}
            />
          </Field>
        )}
        {mode === "forgot" && otpSent && (
          <>
            <p className="m-0 text-[13.5px] text-fg-muted">
              Reset code sent to <b className="text-fg">{email}</b> ·{" "}
              <button
                className={linkCls}
                type="button"
                onClick={() => {
                  setOtpSent(false);
                  setOtp("");
                  setPw("");
                  setConfirmPw("");
                }}
              >
                Change email
              </button>
            </p>
            <Field label="6-digit code">
              <TextInput
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="123456"
              />
            </Field>
          </>
        )}
        {(mode !== "forgot" || otpSent) && (
          <Field
            label={mode === "reset" || mode === "forgot" ? "New password" : "Password"}
            aside={
              mode === "login" ? (
                <Link href="/forgot-password" className={`${linkCls} text-[13px]`}>
                  Forgot password?
                </Link>
              ) : undefined
            }
          >
            <span className="relative block">
              <TextInput
                type={show ? "text" : "password"}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                placeholder={mode === "login" ? "Your password" : "At least 8 characters"}
                className="pr-12"
              />
              <button
                type="button"
                aria-label={show ? "Hide password" : "Show password"}
                onClick={() => setShow(!show)}
                className="absolute top-1/2 right-2 grid size-9 -translate-y-1/2 place-items-center rounded-full text-fg-subtle transition-colors hover:bg-surface-muted hover:text-fg"
              >
                <FA icon={show ? faEyeSlash : faEye} />
              </button>
            </span>
            {checking && pw && <Meter score={score} label={LABELS[score]!} />}
          </Field>
        )}
        {mode === "forgot" && otpSent && (
          <>
            <Field label="Confirm new password">
              <TextInput
                type="password"
                autoComplete="new-password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                placeholder="Enter it again"
              />
            </Field>
            <button className={`${linkCls} self-start text-[14px]`} type="button" onClick={resendResetCode} disabled={busy}>
              Resend code
            </button>
          </>
        )}
        {err && <FormError>{err}</FormError>}
        <PrimaryButton disabled={busy}>
          {busy ? (
            <>
              <FA icon={faSpinner} spin /> Please wait…
            </>
          ) : (
            <>
              {mode === "forgot" && otpSent ? "Verify code & reset password" : c.cta} <FA icon={faArrowRight} />
            </>
          )}
        </PrimaryButton>
      </form>

      <p className="m-0 text-center text-[14px] text-fg-muted">
        {mode === "login" && (
          <>
            New here? <TextLink href="/signup">Create an account</TextLink>
          </>
        )}
        {mode === "signup" && (
          <>
            Already have an account? <TextLink href="/login">Log in</TextLink>
          </>
        )}
        {(mode === "forgot" || mode === "reset") && (
          <>
            Remembered it? <TextLink href="/login">Back to log in</TextLink>
          </>
        )}
      </p>
    </div>
  );
}

function FormError({ children }: { children: React.ReactNode }) {
  return (
    <p className="at-clay tint m-0 rounded-r2 px-4 py-3 text-[13.5px] leading-snug" role="alert">
      {children}
    </p>
  );
}
