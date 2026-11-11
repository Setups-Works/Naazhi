import { notFound, redirect } from "next/navigation";
import { currentUser, userDb } from "../../../server/session";
import { cleanOnboarding, stepOfSlug, stepPath } from "../../../lib/onboarding";
import { homePath } from "../../../lib/hosts";

export const dynamic = "force-dynamic";

/**
 * Routing glue only: /onboarding goes to the screen the person had reached (or home, once they have finished), and a name that is not a screen is a 404.
 * The screens themselves are drawn by the layout's flow, which reads the address.
 */
export default async function Page({ params }: { params: Promise<{ step?: string[] }> }) {
  const { step } = await params;
  if (!step) {
    const user = await currentUser();
    const { data } = user ? await userDb(user.id).from("profiles").select("onboarding").maybeSingle() : { data: null };
    const o = cleanOnboarding(data?.onboarding);
    redirect(o.completed ? homePath() : stepPath(o.step));
  }
  if (step.length !== 1 || stepOfSlug(step[0]) === null) notFound();
  return null;
}
