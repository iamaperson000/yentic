"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Project = {
  id: string;
  name: string;
  language: string;
  updatedAt: string;
};

export default function DashboardHome() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        const res = await fetch("/api/projects");
        if (res.ok) {
          const data = await res.json();
          if (mounted) setProjects(data);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-[#06070d] via-[#090b19] to-[#040509] text-white">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(120,119,198,0.25),_transparent_60%)]" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-[1200px] flex-col gap-8 px-6 py-10 sm:px-10 sm:py-14">
        <header className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold sm:text-4xl">Your projects</h1>
            <p className="mt-1 text-white/60">Pick up where you left off or start something new.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/ide/web"
              className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-black shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400"
            >
              New Web Project
            </Link>
            <Link
              href="/ide"
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white/80 transition hover:border-white/40 hover:bg-white/10 hover:text-white"
            >
              All workspaces
            </Link>
          </div>
        </header>

        <section className="rounded-3xl border border-white/10 bg-black/40 p-4 sm:p-6">
          {loading ? (
            <div className="text-white/50">Loading…</div>
          ) : projects.length === 0 ? (
            <div className="flex flex-col items-start gap-4 p-4 text-white/70 sm:flex-row sm:items-center sm:justify-between">
              <p>No projects yet. Create your first one.</p>
              <Link
                href="/ide/web"
                className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-black shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400"
              >
                New Project
              </Link>
            </div>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((p) => (
                <li key={p.id} className="group rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:border-white/20 hover:bg-white/10">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-base font-semibold text-white">{p.name}</div>
                      <div className="mt-1 text-xs uppercase tracking-[0.25em] text-white/40">{p.language}</div>
                    </div>
                    <Link
                      href="/ide"
                      className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white/80 transition hover:border-white/30 hover:bg-white/15 hover:text-white"
                    >
                      Open
                    </Link>
                  </div>
                  <div className="mt-3 text-xs text-white/40">Updated {new Date(p.updatedAt).toLocaleString()}</div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
