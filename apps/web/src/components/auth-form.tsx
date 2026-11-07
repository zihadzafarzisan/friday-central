"use client";
import { useActionState } from "react";
import Link from "next/link";
import { authenticate } from "@/server/actions";
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
