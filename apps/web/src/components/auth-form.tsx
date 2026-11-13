"use client";
import { useActionState } from "react";
import Link from "next/link";
import { authenticate } from "@/server/actions";
import { signInWithStudentGoogle } from "@/server/google-auth";
import { Field } from "@/components/ui";
import type { ActionResult } from "@friday/schemas";
export function AuthForm({
  mode,
  configured,
  next = "/app",
  admin = false,
}: {
  mode: "login" | "signup" | "forgot" | "reset" | "resend";
  configured: boolean;
  next?: string;
  admin?: boolean;
}) {
  const [state, action, pending] = useActionState(authenticate.bind(null, mode), {
    ok: false,
    message: "",
  } as ActionResult);
  const signup = mode === "signup";
  const [googleState, googleAction, googlePending] = useActionState(signInWithStudentGoogle, {
    ok: false,
    message: "",
  } as ActionResult);
  if (!admin && (mode === "login" || mode === "signup"))
    return (
      <form action={googleAction} className="demo-card stack auth-card">
        <p>Use your BRACU student Google Workspace account (@g.bracu.ac.bd).</p>
        {!configured && (
          <div className="demo-banner">
            Account services aren’t connected yet.{" "}
            <Link href="/preview">Explore the student preview</Link>.
          </div>
        )}
        <input type="hidden" name="next" value={next} />
        <button
          className="action-button primary"
          type="submit"
          disabled={googlePending || !configured}
        >
          {googlePending ? "Opening Google…" : "Continue with Google"}
        </button>
        {googleState.message && (
          <p role="status" className="warning">
            {googleState.message}
          </p>
        )}
        <p className="form-notice">
          After signing in, complete your student profile. Connect data sync uses the browser
          extension while you are signed into Connect.
        </p>
        <Link href="/admin/login">Administrator sign-in</Link>
      </form>
    );
  return (
    <form action={action} className="demo-card stack auth-card">
      {!configured && (
        <div className="demo-banner">
          Account services aren’t connected yet.{" "}
          <Link href="/preview">Explore the student preview</Link> or{" "}
          <Link href="/preview/admin">admin preview</Link>.
        </div>
      )}
      <input type="hidden" name="next" value={next} />
      <input type="hidden" name="portal" value={admin ? "admin" : "student"} />
      {signup && (
        <>
          <Field label="Full name" name="full_name" />
          <Field label="Student ID" name="student_id" placeholder="26101001" />
        </>
      )}
      {mode !== "reset" && (
        <Field
          label={admin ? "Admin email" : "University email"}
          name="email"
          type="email"
          placeholder={admin ? "Your invited account" : "name@g.bracu.ac.bd"}
        />
      )}
      {["login", "signup", "reset"].includes(mode) && (
        <Field
          label={mode === "reset" ? "New password" : "Password"}
          name="password"
          type="password"
        />
      )}
      {(signup || mode === "reset") && (
        <p className="form-notice">
          Use at least 8 characters, uppercase and lowercase letters, and a number.
        </p>
      )}
      {state.fields && (
        <ul className="warning">
          {Object.entries(state.fields).map(([name, messages]) => (
            <li key={name}>
              {name.replaceAll("_", " ")}: {messages.join(" ")}
            </li>
          ))}
        </ul>
      )}
      <button className="action-button primary" type="submit" disabled={pending || !configured}>
        {pending
          ? "Please wait…"
          : {
              login: "Sign in",
              signup: "Create account",
              forgot: "Send recovery link",
              reset: "Update password",
              resend: "Resend verification email",
            }[mode]}
      </button>
      {state.message && (
        <p role="status" className={state.ok ? "positive" : "warning"}>
          {state.message}
        </p>
      )}
      {mode === "login" && (
        <div className="actions">
          <Link href="/forgot-password">Forgot password?</Link>
          {!admin && <Link href="/signup">Create account</Link>}
        </div>
      )}
      {signup && <Link href="/login">Already registered? Sign in</Link>}
      {admin && (
        <p className="form-notice">
          Admin accounts are invite-only. Student accounts cannot access this portal.
        </p>
      )}
    </form>
  );
}
