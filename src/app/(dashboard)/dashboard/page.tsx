import { redirect } from "next/navigation";

import { getCallerMemberships } from "@/lib/workspace-access";

/**
 * /dashboard (no workspace in the URL) is a resolver, not a real page —
 * it exists so login/signup/links have one stable place to send someone
 * and have them land in the right workspace, without a client-side
 * fetch-then-redirect round trip.
 */
export default async function DashboardResolverPage() {
  const { memberships } = await getCallerMemberships();
  const first = memberships[0];

  if (!first) {
    redirect("/dashboard/no-workspace");
  }

  redirect(`/w/${first.workspace.slug}/dashboard`);
}
