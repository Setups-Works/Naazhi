"use client";
import Link from "next/link";
import type { ReactNode } from "react";
import { Icon as FA } from "@/components/ui/Icon";
import { faArrowRight } from "@fortawesome/free-solid-svg-icons";
import { appHref } from "../../lib/hosts";
import { useAuthState } from "./useAuthState";

/**
 * A call-to-action that adapts to the visitor: "Get started" (→ sign-up) when signed out,
 * "Dashboard" (→ the app) once signed in.
 */
export default function AuthLink({
  className = "btn btn-primary",
  children = "Get started",
  signedIn = "Dashboard",
  href = "/signup",
  arrow = false,
  style,
  onClick,
}: {
  className?: string;
  children?: ReactNode;
  signedIn?: ReactNode;
  href?: string;
  arrow?: boolean;
  style?: React.CSSProperties;
  onClick?: () => void;
}) {
  const state = useAuthState();
  return (
    <Link className={className} href={appHref(state === "in" ? "/dashboard" : href)} style={style} onClick={onClick}>
      {state === "in" ? signedIn : children} {arrow && <FA icon={faArrowRight} />}
    </Link>
  );
}
