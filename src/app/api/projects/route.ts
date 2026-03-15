import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

type ViewerRole = "owner" | "editor" | "viewer";
type BinaryState = Uint8Array<ArrayBuffer>;

function isJsonObject(value: unknown): value is Prisma.JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function encodeState(state: BinaryState | Buffer | null | undefined): string | null {
  if (!state || !state.length) return null;
  return Buffer.from(state).toString("base64");
}

function decodeState(encoded?: string | null): BinaryState | null {
  if (!encoded) return null;
  try {
    const buffer = Buffer.from(encoded, "base64");
    const cloned = new Uint8Array(buffer.length) as BinaryState;
    cloned.set(buffer);
    return cloned;
  } catch {
    return null;
  }
}

function normalizeBytes(bytes: BinaryState | null | undefined): BinaryState | null {
  if (!bytes) return null;
  const cloned = new Uint8Array(bytes.length) as BinaryState;
  cloned.set(bytes);
  return cloned;
}

async function resolveUniqueName(baseName: string, userId: string) {
  const normalized = baseName.trim();
  const existing = await prisma.project.findMany({
    where: {
      userId,
      OR: [{ name: normalized }, { name: { startsWith: `${normalized} (` } }],
    },
    select: { name: true },
  });

  const taken = new Set(existing.map(entry => entry.name));
  if (!taken.has(normalized)) {
    return normalized;
  }

  let suffix = 2;
  let candidate = `${normalized} (${suffix})`;
  while (taken.has(candidate)) {
    suffix += 1;
    candidate = `${normalized} (${suffix})`;
  }

  return candidate;
}

/* -------------------------------------------------------------------------- */
/*                                  GET ROUTE                                 */
/* -------------------------------------------------------------------------- */

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: "Database connection is not configured" },
      { status: 503 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [owned, shared] = await Promise.all([
    prisma.project.findMany({
      where: { userId: user.id },
      include: {
        collaborators: {
          where: { userId: user.id },
          select: { role: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.project.findMany({
      where: {
        collaborators: { some: { userId: user.id } },
        NOT: { userId: user.id },
      },
      include: {
        collaborators: {
          where: { userId: user.id },
          select: { role: true },
        },
        user: {
          select: { name: true, username: true, image: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const normalizedOwned = owned.map((project) => {
    const { collaborators: memberships, yjsState, ...rest } = project;
    void memberships;

    return {
      ...rest,
      yjsState: encodeState(yjsState),
      viewerRole: "owner" as ViewerRole,
    };
  });

  const normalizedShared = shared.map((project) => {
    const { collaborators: memberships, yjsState, ...rest } = project;
    const membershipRole = memberships[0]?.role;

    const viewerRole: ViewerRole =
      membershipRole === "editor"
        ? ("editor" as ViewerRole)
        : ("viewer" as ViewerRole);

    return {
      ...rest,
      yjsState: encodeState(yjsState),
      viewerRole,
    };
  });

  return NextResponse.json({ owned: normalizedOwned, shared: normalizedShared });
}

/* -------------------------------------------------------------------------- */
/*                                  POST ROUTE                                */
/* -------------------------------------------------------------------------- */

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email)
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: "Database connection is not configured" },
      { status: 503 },
    );
  }

  const user = await prisma.user.upsert({
    where: { email: session.user.email },
    update: {},
    create: {
      email: session.user.email,
      name: session.user.name ?? "Anonymous",
      image: session.user.image ?? "",
    },
  });

  const payload = await req.json();
  const { id, name, language, files, yjsState } = payload as {
    id?: string;
    name?: string;
    language?: string;
    files: unknown;
    yjsState?: string | null;
  };

  if (!isJsonObject(files))
    return NextResponse.json({ error: "Invalid project files" }, { status: 400 });

  if (!name?.trim())
    return NextResponse.json({ error: "Project name is required" }, { status: 400 });

  if (!language)
    return NextResponse.json({ error: "Project language is required" }, { status: 400 });

  const normalizedLanguage = language.trim();
  const decodedState = yjsState ? decodeState(yjsState) : undefined;

  // --------------------------------------------------------------------------
  // UPDATE EXISTING PROJECT
  // --------------------------------------------------------------------------
  if (id) {
    const existing = await prisma.project.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });

    if (!existing)
      return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const isOwner = existing.userId === user.id;
    const membership = isOwner
      ? null
      : await prisma.collaborator.findFirst({
          where: { projectId: id, userId: user.id },
        });

    if (!isOwner && !membership)
      return NextResponse.json({ error: "Project not found" }, { status: 404 });

    if (membership && membership.role !== "editor")
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

    const data: Prisma.ProjectUpdateInput = {
      files,
      ...(decodedState !== undefined ? { yjsState: normalizeBytes(decodedState) } : {}),
    };

    if (isOwner) {
      const trimmedName = name.trim();
      const duplicate = await prisma.project.findFirst({
        where: {
          userId: user.id,
          name: trimmedName,
          NOT: { id },
        },
        select: { id: true },
      });

      if (duplicate) {
        return NextResponse.json(
          { error: "A project with that name already exists" },
          { status: 409 },
        );
      }

      data.name = trimmedName;
      data.language = normalizedLanguage;
    }

    const project = await prisma.project.update({ where: { id }, data });

    const viewerRole: ViewerRole = isOwner
      ? ("owner" as ViewerRole)
      : membership?.role === "editor"
      ? ("editor" as ViewerRole)
      : ("viewer" as ViewerRole);

    return NextResponse.json({
      ...project,
      yjsState: encodeState(project.yjsState),
      viewerRole,
    });
  }

  // --------------------------------------------------------------------------
  // CREATE NEW PROJECT
  // --------------------------------------------------------------------------
  const uniqueName = await resolveUniqueName(name, user.id);

  const project = await prisma.project.create({
    data: {
      name: uniqueName,
      language: normalizedLanguage,
      files,
      user: { connect: { id: user.id } },
      shareToken: randomBytes(24).toString("hex"),
      ...(decodedState !== undefined ? { yjsState: normalizeBytes(decodedState) } : {}),
    },
  });

  return NextResponse.json({
    ...project,
    yjsState: encodeState(project.yjsState),
    viewerRole: "owner" as ViewerRole,
  });
}
