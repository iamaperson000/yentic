"use client"

import { useEffect, useMemo, useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"

const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/

type Status = "idle" | "checking" | "available" | "unavailable" | "error"

interface SetupProfileFormProps {
  defaultBio?: string
  suggestedName?: string
}

export default function SetupProfileForm({ defaultBio = "", suggestedName = "" }: SetupProfileFormProps) {
  const router = useRouter()
  const { update } = useSession()
  const [username, setUsername] = useState(deriveInitialUsername(suggestedName))
  const [bio, setBio] = useState(defaultBio)
  const [status, setStatus] = useState<Status>("idle")
  const [message, setMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const isValidPattern = useMemo(() => USERNAME_REGEX.test(username), [username])
  const shouldCheckAvailability = username.length > 0 && isValidPattern

  useEffect(() => {
    if (!shouldCheckAvailability) return

    let cancelled = false
    const controller = new AbortController()

    const preflight = setTimeout(() => {
      if (cancelled) return
      setStatus("checking")
      setMessage(null)
    }, 0)

    const timeout = setTimeout(() => {
      fetch(`/api/user/check-username?username=${encodeURIComponent(username)}`, {
        signal: controller.signal,
      })
        .then(async (res) => {
          if (cancelled) return
          if (!res.ok) {
            setStatus("error")
            setMessage("Unable to check username right now. Please try again.")
            return
          }

          const data = (await res.json()) as { available?: boolean; reason?: string }
          if (data.available) {
            setStatus("available")
            setMessage(null)
          } else {
            setStatus("unavailable")
            setMessage(data.reason ?? "That username is already taken.")
          }
        })
        .catch(() => {
          if (cancelled) return
          setStatus("error")
          setMessage("Unable to check username right now. Please try again.")
        })
    }, 400)

    return () => {
      cancelled = true
      controller.abort()
      clearTimeout(preflight)
      clearTimeout(timeout)
    }
  }, [username, shouldCheckAvailability])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!USERNAME_REGEX.test(username)) {
      setStatus("error")
      setMessage("Usernames must be 3-20 characters using lowercase letters, numbers, or underscores.")
      return
    }

    setSubmitting(true)
    setMessage(null)

    const normalizedBio = bio.trim().length > 0 ? bio.trim() : null

    const response = await fetch("/api/user/update-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, bio: normalizedBio }),
    })

    if (!response.ok) {
      const data = await response.json().catch(() => ({ error: "Unable to save changes" }))
      setSubmitting(false)
      setStatus(response.status === 409 ? "unavailable" : "error")
      setMessage(data.error ?? "Unable to save changes")
      return
    }

    setStatus("available")
    if (update) {
      try {
        await update({ username, bio: normalizedBio })
      } catch (error) {
        console.error("Failed to refresh session", error)
      }
    }
    router.push("/dashboard")
    router.refresh()
  }

  const showPatternHint = username.length > 0 && !isValidPattern
  const displayStatus = shouldCheckAvailability ? status : "idle"

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2 text-left">
        <label htmlFor="username" className="text-sm font-medium text-white">
          Username
        </label>
        <div className="relative flex items-center">
          <span className="pointer-events-none absolute left-3 text-white/50">@</span>
          <input
            id="username"
            name="username"
            value={username}
            onChange={(event) => setUsername(event.target.value.toLowerCase())}
            className="w-full rounded-lg border border-white/10 bg-black/40 px-9 py-3 text-base text-white outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/40"
            placeholder="yourname"
            autoComplete="off"
            spellCheck={false}
            maxLength={20}
            minLength={3}
            required
          />
        </div>
        {showPatternHint && (
          <p className="text-xs text-amber-300/80">
            Use 3-20 lowercase letters, numbers, or underscores.
          </p>
        )}
        {displayStatus === "checking" && <p className="text-xs text-white/60">Checking availability…</p>}
        {shouldCheckAvailability && message && displayStatus !== "checking" && (
          <p className={`text-xs ${displayStatus === "available" ? "text-emerald-400" : "text-rose-400"}`}>{message}</p>
        )}
        {shouldCheckAvailability && displayStatus === "available" && !message && (
          <p className="text-xs text-emerald-400">Nice! That username is available.</p>
        )}
      </div>

      <div className="space-y-2 text-left">
        <label htmlFor="bio" className="text-sm font-medium text-white">
          Bio <span className="text-white/40">(optional)</span>
        </label>
        <textarea
          id="bio"
          name="bio"
          value={bio}
          onChange={(event) => setBio(event.target.value)}
          className="h-32 w-full rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/40"
          placeholder="Tell people what you’re building."
        />
        <p className="text-xs text-white/40">You can update this later from your profile page.</p>
      </div>

      <button
        type="submit"
        disabled={submitting || displayStatus === "checking"}
        className="w-full rounded-lg bg-emerald-500 px-4 py-3 text-sm font-semibold text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-500/60"
      >
        {submitting ? "Saving…" : "Save and continue"}
      </button>
    </form>
  )
}

function deriveInitialUsername(suggested: string) {
  if (!suggested) return ""
  return suggested
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 20)
}
