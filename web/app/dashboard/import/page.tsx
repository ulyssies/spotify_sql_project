'use client'

import { useState, useCallback, useEffect, useRef, DragEvent, ChangeEvent } from 'react'
import Link from 'next/link'
import { Upload, ExternalLink, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { api } from '@/lib/api'
import type { ImportStatus, StreamingHistoryItem, ImportResult } from '@/lib/types'

// ─── Step indicator ──────────────────────────────────────────────────────────

function Steps({ current }: { current: 1 | 2 | 3 }) {
  const steps = ['Request your data', 'Upload files', 'View your stats']
  return (
    <div className="flex items-center gap-0 mb-10">
      {steps.map((label, i) => {
        const n = (i + 1) as 1 | 2 | 3
        const done = n < current
        const active = n === current
        return (
          <div key={n} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={[
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono font-medium',
                  done  ? 'bg-[#1DB954] text-black'    : '',
                  active ? 'bg-white text-black'        : '',
                  !done && !active ? 'bg-[#1f1f1f] text-[#666666]' : '',
                ].join(' ')}
              >
                {done ? <CheckCircle2 size={14} /> : n}
              </div>
              <span className={['text-xs whitespace-nowrap', active ? 'text-white' : 'text-[#666666]'].join(' ')}>
                {label}
              </span>
            </div>
            {i < 2 && (
              <div className="h-px w-16 bg-[#1f1f1f] mx-2 mt-[-14px] shrink-0" />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Preview ─────────────────────────────────────────────────────────────────

interface Preview {
  total: number
  earliest: string
  latest: string
  top3: { name: string; artist: string; count: number }[]
  items: StreamingHistoryItem[]
}

function buildPreview(items: StreamingHistoryItem[]): Preview {
  const counts = new Map<string, { name: string; artist: string; count: number }>()
  let earliest = items[0].ts
  let latest = items[0].ts

  for (const item of items) {
    if (item.ts < earliest) earliest = item.ts
    if (item.ts > latest)   latest   = item.ts

    const uri = item.spotify_track_uri
    const existing = counts.get(uri)
    if (existing) {
      existing.count++
    } else {
      counts.set(uri, {
        name:   item.master_metadata_track_name,
        artist: item.master_metadata_album_artist_name,
        count:  1,
      })
    }
  }

  const top3 = Array.from(counts.values()).sort((a, b) => b.count - a.count).slice(0, 3)

  return {
    total: items.length,
    earliest: earliest.slice(0, 10),
    latest:   latest.slice(0, 10),
    top3,
    items,
  }
}

// ─── Parsing ──────────────────────────────────────────────────────────────────

interface ShortHistoryItem {
  endTime: string       // "2024-11-15 03:22"
  artistName: string
  trackName: string
  msPlayed: number
}

function readFileAsJSON(file: File): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        resolve(JSON.parse(e.target?.result as string))
      } catch {
        reject(new Error(`${file.name} is not valid JSON`))
      }
    }
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`))
    reader.readAsText(file)
  })
}

function isExtendedFormat(item: unknown): item is StreamingHistoryItem {
  if (typeof item !== 'object' || item === null) return false
  const o = item as Record<string, unknown>
  return (
    typeof o.ts === 'string' &&
    typeof o.ms_played === 'number' &&
    typeof o.master_metadata_track_name === 'string'
  )
}

function isShortFormat(item: unknown): item is ShortHistoryItem {
  if (typeof item !== 'object' || item === null) return false
  const o = item as Record<string, unknown>
  return (
    typeof o.endTime === 'string' &&
    typeof o.msPlayed === 'number' &&
    typeof o.trackName === 'string' &&
    typeof o.artistName === 'string'
  )
}

function normalizeShortItem(item: ShortHistoryItem): StreamingHistoryItem {
  // "2024-11-15 03:22" → "2024-11-15T03:22:00Z"
  const ts = item.endTime.replace(' ', 'T') + ':00Z'
  return {
    ts,
    ms_played: item.msPlayed,
    master_metadata_track_name: item.trackName,
    master_metadata_album_artist_name: item.artistName,
    master_metadata_album_album_name: null,
    // Pseudo-URI for deduplication — no real Spotify URI in short format
    spotify_track_uri: `unknown:${item.artistName}:${item.trackName}`,
  }
}

async function parseFiles(files: File[]): Promise<{ items: StreamingHistoryItem[]; error?: string }> {
  const nonJson = files.filter((f) => !f.name.endsWith('.json'))
  if (nonJson.length > 0) {
    return { items: [], error: `Only .json files are accepted (rejected: ${nonJson.map((f) => f.name).join(', ')})` }
  }

  const all: StreamingHistoryItem[] = []

  for (const file of files) {
    let parsed: unknown
    try {
      parsed = await readFileAsJSON(file)
    } catch (e) {
      return { items: [], error: (e as Error).message }
    }

    if (!Array.isArray(parsed)) {
      return { items: [], error: `${file.name} must contain a JSON array` }
    }

    for (const raw of parsed) {
      if (isExtendedFormat(raw)) {
        // Extended streaming history (StreamingHistory_music_*.json)
        if (!raw.spotify_track_uri) continue   // local files / podcasts
        if (raw.ms_played < 30000) continue    // under 30s
        if (raw.skipped === true) continue
        all.push(raw)
      } else if (isShortFormat(raw)) {
        // Short export (StreamingHistory*.json)
        if (raw.msPlayed < 30000) continue     // under 30s
        all.push(normalizeShortItem(raw))
      }
      // Unknown shape — skip silently
    }
  }

  if (all.length === 0) {
    return { items: [], error: 'No valid streams found after filtering. Make sure you selected Spotify streaming history JSON files.' }
  }

  return { items: all }
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function ImportPage() {
  const [status, setStatus] = useState<ImportStatus | null | 'loading'>('loading')
  const [dragging, setDragging] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [showDropzone, setShowDropzone] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    api.getImportStatus()
      .then((s) => setStatus(s))
      .catch(() => setStatus(null))
  }, [])

  async function handleFiles(files: FileList | File[]) {
    setParseError(null)
    setPreview(null)
    const arr = Array.from(files)
    const { items, error } = await parseFiles(arr)
    if (error) {
      setParseError(error)
      return
    }
    setPreview(buildPreview(items))
  }

  const onDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(false)
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files)
  }, [])

  const onDragOver = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setDragging(true) }
  const onDragLeave = () => setDragging(false)

  const onInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) handleFiles(e.target.files)
  }

  async function confirmUpload() {
    if (!preview) return
    setUploading(true)
    setUploadError(null)
    try {
      const r = await api.importStreamingHistory(preview.items)
      setResult(r)
      setPreview(null)
      const updated = await api.getImportStatus().catch(() => null)
      setStatus(updated)
    } catch (e) {
      setUploadError((e as Error).message)
    } finally {
      setUploading(false)
    }
  }

  // Determine active step for indicator
  const hasImported = status !== 'loading' && status !== null
  const activeStep: 1 | 2 | 3 = result ? 3 : 2

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-syne font-bold text-white mb-2">Import Data</h1>
      <p className="text-[#666666] text-sm mb-8">
        Upload your Spotify streaming history to unlock real play counts and listening time.
      </p>

      <Steps current={activeStep} />

      {/* ── Step 1: Request ── */}
      <section className="mb-6 p-5 rounded-xl border border-[#1f1f1f] bg-[#0a0a0a]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-white font-medium mb-1">1. Request your Spotify data</h2>
            <p className="text-[#666666] text-sm leading-relaxed">
              Go to your Spotify account privacy page, scroll to{' '}
              <span className="text-white">"Download your data"</span>, select{' '}
              <span className="text-white">Extended streaming history only</span> (not account data), and click
              Request. Spotify emails a download link — it can take up to 30 days.
            </p>
            <p className="text-[#444] text-xs mt-2">Already have your files? Skip to step 2 below.</p>
          </div>
          <a
            href="https://www.spotify.com/account/privacy/"
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 flex items-center gap-1.5 text-xs text-[#1DB954] hover:text-white border border-[#1DB954]/30 hover:border-white/20 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
          >
            Open Spotify <ExternalLink size={12} />
          </a>
        </div>
      </section>

      {/* ── Step 2: Upload ── */}
      <section className="mb-6">
        <h2 className="text-white font-medium mb-3">2. Upload your streaming history files</h2>

        {/* Status card if already imported */}
        {hasImported && !showDropzone && !result && (
          <div className="p-5 rounded-xl border border-[#1f1f1f] bg-[#0a0a0a] mb-4">
            {status === null ? null : (
              <>
                <div className="flex items-center gap-2 text-[#1DB954] text-sm font-medium mb-3">
                  <CheckCircle2 size={15} />
                  Import history found
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-white font-mono text-xl">{status.total_streams.toLocaleString()}</p>
                    <p className="text-[#666666] text-xs mt-0.5">total streams</p>
                  </div>
                  <div>
                    <p className="text-white font-mono text-sm">{status.date_range.from.slice(0,10)}</p>
                    <p className="text-white font-mono text-sm">{status.date_range.to.slice(0,10)}</p>
                    <p className="text-[#666666] text-xs mt-0.5">date range</p>
                  </div>
                  <div>
                    <p className="text-white font-mono text-sm">{status.last_import.slice(0,10)}</p>
                    <p className="text-[#666666] text-xs mt-0.5">last import</p>
                  </div>
                </div>
                <p className="text-[#444] text-xs mt-4">Duplicate streams are automatically ignored.</p>
              </>
            )}
            <button
              onClick={() => setShowDropzone(true)}
              className="mt-4 text-sm text-[#666666] hover:text-white transition-colors"
            >
              + Import more files
            </button>
          </div>
        )}

        {/* Drop zone */}
        {(!hasImported || showDropzone) && !result && (
          <>
            <div
              onDrop={onDrop}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className="cursor-pointer flex flex-col items-center justify-center gap-3 py-16 px-8 rounded-xl transition-colors"
              style={{
                border: `2px dashed ${dragging ? '#1DB954' : '#1f1f1f'}`,
                borderRadius: 12,
              }}
            >
              <Upload size={36} className="text-[#333]" />
              <p className="text-white text-sm font-medium">Drop your StreamingHistory files here</p>
              <p className="text-[#666666] text-xs">Accepts multiple .json files at once</p>
              <span className="text-xs text-[#444] mt-1 underline underline-offset-2">or click to browse</span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              multiple
              className="hidden"
              onChange={onInputChange}
            />

            {parseError && (
              <div className="mt-3 flex items-start gap-2 text-red-400 text-xs p-3 rounded-lg bg-red-400/10 border border-red-400/20">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                {parseError}
              </div>
            )}
          </>
        )}

        {/* Preview */}
        {preview && !uploading && (
          <div className="mt-4 p-5 rounded-xl border border-[#1f1f1f] bg-[#0a0a0a]">
            <h3 className="text-white text-sm font-medium mb-4">Preview</h3>
            <div className="grid grid-cols-3 gap-4 text-center mb-5">
              <div>
                <p className="text-white font-mono text-xl">{preview.total.toLocaleString()}</p>
                <p className="text-[#666666] text-xs mt-0.5">streams found</p>
              </div>
              <div>
                <p className="text-white font-mono text-sm">{preview.earliest}</p>
                <p className="text-white font-mono text-sm">{preview.latest}</p>
                <p className="text-[#666666] text-xs mt-0.5">date range</p>
              </div>
              <div />
            </div>

            <p className="text-[#666666] text-xs uppercase tracking-wider mb-2">Top tracks in this import</p>
            <ul className="space-y-1.5 mb-5">
              {preview.top3.map((t, i) => (
                <li key={i} className="flex items-center justify-between text-sm">
                  <span className="text-white truncate">{t.name}</span>
                  <span className="text-[#666666] font-mono text-xs shrink-0 ml-4">{t.count} plays</span>
                </li>
              ))}
            </ul>

            {uploadError && (
              <div className="mb-3 flex items-start gap-2 text-red-400 text-xs p-3 rounded-lg bg-red-400/10 border border-red-400/20">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                {uploadError}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={confirmUpload}
                className="px-4 py-2 text-sm font-medium bg-[#1DB954] text-black rounded-lg hover:bg-[#17a349] transition-colors"
              >
                Confirm & Upload
              </button>
              <button
                onClick={() => { setPreview(null); setParseError(null) }}
                className="px-4 py-2 text-sm text-[#666666] hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {uploading && (
          <div className="mt-4 flex items-center gap-3 text-sm text-[#666666] p-4">
            <Loader2 size={18} className="animate-spin" />
            Processing your streaming history…
          </div>
        )}
      </section>

      {/* ── Step 3: Success ── */}
      {result && (
        <section className="p-5 rounded-xl border border-[#1DB954]/30 bg-[#1DB954]/5">
          <div className="flex items-center gap-2 text-[#1DB954] font-medium mb-2">
            <CheckCircle2 size={16} />
            Import complete
          </div>
          <p className="text-[#666666] text-sm mb-1">
            <span className="text-white font-mono">{result.imported.toLocaleString()}</span> streams imported
            {result.duplicates_skipped > 0 && (
              <>, <span className="text-white font-mono">{result.duplicates_skipped.toLocaleString()}</span> duplicates skipped</>
            )}
          </p>
          <Link
            href="/dashboard/tracks"
            className="inline-block mt-3 text-sm text-[#1DB954] hover:text-white transition-colors underline underline-offset-2"
          >
            View your tracks →
          </Link>
        </section>
      )}
    </div>
  )
}
