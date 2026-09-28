'use client'

import { useState, useEffect, useCallback } from 'react'
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react'

type QRCode = {
  id: string
  alias: string
  business_name: string
  target_url: string
  scans: number
  created_at: string
}

const ADMIN_SECRET = 'sol-agency-2026'
const BASE_URL = typeof window !== 'undefined' ? window.location.origin : ''

function extractReviewLink(input: string): string {
  if (!input) return 'https://google.com' // Fallback for pre-printing
  if (input.includes('writereview') || input.includes('g.page/r')) return input
  const patterns = [
    /place_id=([^&]+)/,
    /!1s([^!]+).*!3m/,
    /\/place\/[^/]+\/([^/?]+)/,
  ]
  for (const pattern of patterns) {
    const match = input.match(pattern)
    if (match) return `https://search.google.com/local/writereview?placeid=${match[1]}`
  }
  return input
}

export default function AdminDashboard() {
  const [codes, setCodes] = useState<QRCode[]>([])
  const [businessName, setBusinessName] = useState('')
  const [googleUrl, setGoogleUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editUrl, setEditUrl] = useState('')
  const [selectedQR, setSelectedQR] = useState<{ url: string; name: string } | null>(null)
  const [error, setError] = useState('')

  const fetchCodes = useCallback(async () => {
    const res = await fetch('/api/qrcodes', { headers: { 'x-admin-secret': ADMIN_SECRET } })
    const data = await res.json()
    if (Array.isArray(data)) setCodes(data)
  }, [])

  useEffect(() => {
    fetchCodes()
    const interval = setInterval(fetchCodes, 10000)
    return () => clearInterval(interval)
  }, [fetchCodes])

  const createCode = async () => {
    if (!businessName) return setError('Stand Name is required.')
    setError('')
    setLoading(true)
    
    // If no URL provided, it defaults to google.com so he can pre-print
    const reviewLink = googleUrl ? extractReviewLink(googleUrl) : 'https://google.com'
    const alias = businessName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')
    
    const res = await fetch('/api/qrcodes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-secret': ADMIN_SECRET },
      body: JSON.stringify({ alias, business_name: businessName, target_url: reviewLink }),
    })
    const data = await res.json()
    if (data.error) setError(data.error)
    else { setBusinessName(''); setGoogleUrl(''); fetchCodes() }
    setLoading(false)
  }

  const updateCode = async (id: string) => {
    await fetch('/api/qrcodes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-admin-secret': ADMIN_SECRET },
      body: JSON.stringify({ id, target_url: editUrl }),
    })
    setEditingId(null)
    fetchCodes()
  }

  const deleteCode = async (id: string) => {
    if (!confirm('Delete this QR? The physical stand will stop working.')) return
    await fetch('/api/qrcodes', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', 'x-admin-secret': ADMIN_SECRET },
      body: JSON.stringify({ id }),
    })
    fetchCodes()
  }

  const downloadQR = (alias: string) => {
    const canvas = document.getElementById(`qr-canvas-${alias}`) as HTMLCanvasElement
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `${alias}-pure-qr.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }
  
  const copyLink = (url: string) => {
    navigator.clipboard.writeText(url)
    alert("Dynamic link copied to clipboard!")
  }

  const totalScans = codes.reduce((sum, c) => sum + c.scans, 0)

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 max-w-2xl mx-auto">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-blue-400">🚀 Sol QR Engine</h1>
        <p className="text-gray-400 mt-1">Dynamic Google Review QR Manager</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-gray-800 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-blue-400">{codes.length}</p>
          <p className="text-gray-400 text-sm">Active Stands</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-green-400">{totalScans}</p>
          <p className="text-gray-400 text-sm">Total Scans</p>
        </div>
      </div>

      <div className="bg-gray-800 rounded-xl p-5 mb-8">
        <h2 className="font-semibold text-lg mb-1">➕ Add New Stand (Pre-Print Mode)</h2>
        <p className="text-gray-400 text-xs mb-4">Just type "stand-01" and hit Generate. URL is optional.</p>
        {error && <p className="text-red-400 text-sm mb-3 bg-red-900/20 p-2 rounded">{error}</p>}
        <input
          className="w-full bg-gray-700 rounded-lg px-4 py-3 mb-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Stand Name (e.g. stand-01)"
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
        />
        <input
          className="w-full bg-gray-700 rounded-lg px-4 py-3 mb-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Optional: Google Maps URL (Leave blank to add later)"
          value={googleUrl}
          onChange={(e) => setGoogleUrl(e.target.value)}
        />
        {googleUrl && (
          <p className="text-xs text-green-400 mb-3 bg-green-900/10 p-2 rounded break-all">
            ✅ Review link: {extractReviewLink(googleUrl)}
          </p>
        )}
        <button
          onClick={createCode}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition"
        >
          {loading ? 'Generating...' : '⚡ Generate QR Code'}
        </button>
      </div>

      {selectedQR && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setSelectedQR(null)}>
          <div className="bg-white rounded-2xl p-8 text-center" onClick={(e) => e.stopPropagation()}>
            <QRCodeSVG value={selectedQR.url} size={240} />
            <p className="text-gray-800 font-bold mt-4 text-lg">{selectedQR.name}</p>
            <p className="text-gray-500 text-sm mt-1">Right-click image to copy, or click download below.</p>
            <button className="mt-5 bg-gray-900 text-white px-6 py-2 rounded-full text-sm" onClick={() => setSelectedQR(null)}>Close</button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h2 className="font-semibold text-lg">📋 Active Stands</h2>
        {codes.length === 0 && <p className="text-gray-500 text-center py-8">No codes yet. Add your first one above.</p>}
        {codes.map((code) => {
          const qrUrl = `${BASE_URL}/r/${code.alias}`
          const name = code.business_name || code.alias
          return (
            <div key={code.id} className="bg-gray-800 rounded-xl p-4">
              <div className="hidden">
                {/* 1024px size for super high quality prints */}
                <QRCodeCanvas id={`qr-canvas-${code.alias}`} value={qrUrl} size={1024} />
              </div>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-white text-lg">{name}</span>
                    <span className="text-xs bg-green-900 text-green-300 px-2 py-0.5 rounded-full">⭐ {code.scans} scans</span>
                  </div>
                  <p className="text-blue-400 text-xs mt-0.5 font-mono cursor-pointer hover:text-blue-300 inline-block p-1 bg-gray-900 rounded" onClick={() => copyLink(qrUrl)}>/{code.alias} 📋</p>
                  {editingId === code.id ? (
                    <div className="mt-3 flex gap-2">
                      <input
                        className="flex-1 bg-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                        value={editUrl}
                        onChange={(e) => setEditUrl(e.target.value)}
                        placeholder="New target URL"
                      />
                      <button onClick={() => updateCode(code.id)} className="bg-green-600 text-white px-3 py-2 rounded text-sm">Save</button>
                      <button onClick={() => setEditingId(null)} className="bg-gray-600 text-white px-3 py-2 rounded text-sm">Cancel</button>
                    </div>
                  ) : (
                    <div className="mt-2">
                      <p className="text-gray-400 text-xs truncate">Target: {code.target_url}</p>
                      {code.target_url === 'https://google.com' && (
                        <span className="text-yellow-400 text-xs font-bold">⚠️ Placeholder URL (Needs updating)</span>
                      )}
                    </div>
                  )}
                </div>
                <button onClick={() => setSelectedQR({ url: qrUrl, name })} className="flex-shrink-0 bg-white p-1.5 rounded-lg hover:scale-105 transition" title="View Full QR">
                  <QRCodeSVG value={qrUrl} size={60} />
                </button>
              </div>
              <div className="flex gap-2 mt-3 pt-3 border-t border-gray-700">
                <button onClick={() => { setEditingId(code.id); setEditUrl(code.target_url) }} className="flex-1 bg-gray-700 hover:bg-gray-600 text-sm py-2 rounded-lg transition">✏️ Change URL</button>
                <button onClick={() => downloadQR(code.alias)} className="flex-1 bg-blue-900/40 hover:bg-blue-900/60 text-blue-300 text-sm py-2 rounded-lg transition font-semibold">⬇️ High-Res PNG</button>
                <button onClick={() => deleteCode(code.id)} className="bg-red-900/40 hover:bg-red-900/60 text-red-400 text-sm px-4 py-2 rounded-lg transition">🗑️</button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
