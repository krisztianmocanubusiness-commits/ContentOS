import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { slugify, initialsFromName } from "@/lib/naming";
import { getCallerMemberships } from "@/lib/workspace-access";

export async function GET() {
  const { userId, memberships } = await getCallerMemberships();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const workspaces = memberships.map((membership) => ({
    id: membership.workspace.id,
    slug: membership.workspace.slug,
    name: membership.workspace.name,
    plan: membership.workspace.plan,
    initials: membership.workspace.initials,
    role: membership.role,
  }));

  return NextResponse.json({ workspaces });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "Workspace name is required." }, { status: 400 });
  }

  const baseSlug = slugify(name) || "workspace";
  let slug = baseSlug;
  let suffix = 1;
  while (await prisma.workspace.findUnique({ where: { slug } })) {
    suffix += 1;
    slug = `${baseSlug}-${suffix}`;
  }

  const workspace = await prisma.$transaction(async (tx) => {
    const created = await tx.workspace.create({
      data: {
        id: randomUUID(),
        name,
        slug,
        plan: "Free",
        initials: initialsFromName(name),
      },
    });

    await tx.workspaceMembership.create({
      data: {
        id: randomUUID(),
        userId: session.user.id,
        workspaceId: created.id,
        role: "Owner",
        status: "Active",
      },
    });

    return created;
  });

  return NextResponse.json(
    {
      workspace: {
        id: workspace.id,
        slug: workspace.slug,
        name: workspace.name,
        plan: workspace.plan,
        initials: workspace.initials,
        role: "Owner" as const,
      },
    },
    { status: 201 }
  );
}
