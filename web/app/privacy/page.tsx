import Link from 'next/link'
import { BrandLogo } from '@/components/layout/BrandLogo'

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background px-6 py-8 text-primary">
      <div className="mx-auto flex max-w-3xl items-center justify-between">
        <BrandLogo href="/" />
        <Link href="/" className="text-sm font-semibold text-muted transition-colors hover:text-white">
          Back
        </Link>
      </div>

      <section className="mx-auto mt-16 max-w-3xl space-y-8">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-accent">Privacy</p>
          <h1 className="mt-3 font-syne text-4xl font-bold text-white">Your music data stays yours.</h1>
          <p className="mt-4 text-base leading-relaxed text-zinc-400">
            SpotYourVibe reads Spotify profile and listening data only to build your private dashboard.
            It does not sell personal data or expose your imported history to other users.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {[
            ['Spotify OAuth', 'Your Spotify profile, top tracks, top artists, and a server-side refresh token are stored so the app can sync your dashboard.'],
            ['Imported History', 'Streaming history JSON files are parsed in your browser, then saved to your account rows in Supabase.'],
            ['Frontend Secrets', 'The browser stores only the app session token. Spotify secrets and Supabase service keys stay on the backend.'],
            ['Deletion', 'Use Profile -> Delete my data to remove your account row and cascaded listening data from the app database.'],
          ].map(([title, body]) => (
            <article key={title} className="rounded-lg border border-white/[0.08] bg-[#101010] p-5">
              <h2 className="font-semibold text-white">{title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500">{body}</p>
            </article>
          ))}
        </div>

        <p className="text-sm leading-relaxed text-zinc-500">
          Signing out removes the local session token from this browser. Revoking Spotify access can be
          done from your Spotify account apps page.
        </p>
      </section>
    </main>
  )
}
