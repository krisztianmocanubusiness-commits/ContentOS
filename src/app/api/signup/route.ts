import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

function slugify(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function initialsFromName(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "WS";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const firstName = typeof body.firstName === "string" ? body.firstName.trim() : "";
  const lastName = typeof body.lastName === "string" ? body.lastName.trim() : "";
  const workspaceName = typeof body.workspace === "string" ? body.workspace.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!firstName || !lastName || !workspaceName || !email || !password) {
    return NextResponse.json({ error: "All fields are required." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "An account with that email already exists." },
      { status: 409 }
    );
  }

  const name = `${firstName} ${lastName}`;
  const passwordHash = await bcrypt.hash(password, 10);

  const baseSlug = slugify(workspaceName) || "workspace";
  let slug = baseSlug;
  let suffix = 1;
  while (await prisma.workspace.findUnique({ where: { slug } })) {
    suffix += 1;
    slug = `${baseSlug}-${suffix}`;
  }

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        id: randomUUID(),
        name,
        email,
        passwordHash,
        initials: initialsFromName(name),
      },
    });

    const workspace = await tx.workspace.create({
      data: {
        id: randomUUID(),
        name: workspaceName,
        slug,
        plan: "Free",
        initials: initialsFromName(workspaceName),
      },
    });

    await tx.workspaceMembership.create({
      data: {
        id: randomUUID(),
        userId: user.id,
        workspaceId: workspace.id,
        role: "Owner",
        status: "Active",
      },
    });
  });

  return NextResponse.json({ success: true }, { status: 201 });
}
