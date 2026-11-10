"use client";
import Link from "next/link";
import { useAuthState } from "./useAuthState";

/** Site header actions: a quiet "Log in" link and a "Get started" button for visitors, a single "Dashboard" button once signed in. */
export default function HeaderAuth() {
  const state = useAuthState();
  if (state === "in")
    return (
      <Link href="/dashboard" className="btn btn-primary btn-sm max-sm:hidden">
        Dashboard
      </Link>
    );
  return (
    <>
      <Link href="/login" className="px-2 text-[14px] whitespace-nowrap text-fg-muted transition-colors hover:text-fg max-sm:hidden">
        Log in
      </Link>
      <Link href="/signup" className="btn btn-primary btn-sm whitespace-nowrap max-sm:hidden">
        Get started
      </Link>
    </>
  );
}
