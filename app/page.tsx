'use client'

import { useState, useEffect, useCallback } from 'react'
import { QRCodeSVG } from 'qrcode.react'

type QRCode = {
  id: string
  alias: string
  target_url: string
  scans: number
  created_at: string
}

const ADMIN_SECRET = 'sol-agency-2026'
const BASE_URL = typeof window !== 'undefined' ? window.location.origin : ''

export default function AdminDashboard() {
  const [codes, setCodes] = useState<QRCode[]>([])
  const [alias, setAlias] = useState('')
  const [targetUrl, setTargetUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editUrl, setEditUrl] = useState('')
  const [selectedQR, setSelectedQR] = useState<string | null>(null)
  const [error, setError] = useState('')

  const fetchCodes = useCallback(async () => {
    const res = await fetch('/api/qrcodes', {
      headers: { 'x-admin-secret': ADMIN_SECRET },
    })
    const data = await res.json()
    if (Array.isArray(data)) setCodes(data)
  }, [])

  useEffect(() => {
    fetchCodes()
    const interval = setInterval(fetchCodes, 10000) // Auto-refresh every 10s
    return () => clearInterval(interval)
  }, [fetchCodes])

  const createCode = async () => {
    if (!alias || !targetUrl) return setError('Both fields are required.')
    setError('')
    setLoading(true)
    const res = await fetch('/api/qrcodes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-secret': ADMIN_SECRET },
      body: JSON.stringify({ alias, target_url: targetUrl }),
    })
    const data = await res.json()
    if (data.error) setError(data.error)
    else { setAlias(''); setTargetUrl(''); fetchCodes() }
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
    if (!confirm('Delete this QR code? The physical stand will stop working.')) return
    await fetch('/api/qrcodes', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', 'x-admin-secret': ADMIN_SECRET },
      body: JSON.stringify({ id }),
    })
    fetchCodes()
  }

  const totalScans = codes.reduce((sum, c) => sum + c.scans, 0)

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-blue-400">🚀 Sol QR Engine</h1>
        <p className="text-gray-400 mt-1">Dynamic QR Code Manager</p>
      </div>

      {/* Stats Bar */}
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

      {/* Create New */}
      <div className="bg-gray-800 rounded-xl p-5 mb-8">
        <h2 className="font-semibold text-lg mb-4">➕ Add New Client</h2>
        {error && <p className="text-red-400 text-sm mb-3 bg-red-900/20 p-2 rounded">{error}</p>}
        <input
          className="w-full bg-gray-700 rounded-lg px-4 py-3 mb-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Client alias (e.g. spa504)"
          value={alias}
          onChange={(e) => setAlias(e.target.value)}
        />
        <input
          className="w-full bg-gray-700 rounded-lg px-4 py-3 mb-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Target URL (Google Review link, etc.)"
          value={targetUrl}
          onChange={(e) => setTargetUrl(e.target.value)}
        />
        <button
          onClick={createCode}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition"
        >
          {loading ? 'Creating...' : 'Create QR Code'}
        </button>
      </div>

      {/* QR Code Modal */}
      {selectedQR && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={() => setSelectedQR(null)}>
          <div className="bg-white rounded-2xl p-8 text-center" onClick={(e) => e.stopPropagation()}>
            <QRCodeSVG value={selectedQR} size={220} />
            <p className="text-gray-600 mt-4 text-sm break-all max-w-[220px]">{selectedQR}</p>
            <button
              className="mt-4 bg-gray-900 text-white px-6 py-2 rounded-full text-sm"
              onClick={() => setSelectedQR(null)}
            >Close</button>
          </div>
        </div>
      )}

      {/* Client List */}
      <div className="space-y-4">
        <h2 className="font-semibold text-lg">📋 Active Clients</h2>
        {codes.length === 0 && (
          <p className="text-gray-500 text-center py-8">No QR codes yet. Add your first client above.</p>
        )}
        {codes.map((code) => {
          const qrUrl = `${BASE_URL}/r/${code.alias}`
          return (
            <div key={code.id} className="bg-gray-800 rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-blue-400">/{code.alias}</span>
                    <span className="text-xs bg-green-900 text-green-300 px-2 py-0.5 rounded-full">
                      {code.scans} scans
                    </span>
                  </div>
                  
                  {editingId === code.id ? (
                    <div className="mt-3 flex gap-2">
                      <input
                        className="flex-1 bg-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                        value={editUrl}
                        onChange={(e) => setEditUrl(e.target.value)}
                      />
                      <button onClick={() => updateCode(code.id)} className="bg-green-600 text-white px-3 py-2 rounded text-sm">Save</button>
                      <button onClick={() => setEditingId(null)} className="bg-gray-600 text-white px-3 py-2 rounded text-sm">Cancel</button>
                    </div>
                  ) : (
                    <p className="text-gray-400 text-sm mt-1 truncate">{code.target_url}</p>
                  )}

                  <p className="text-gray-600 text-xs mt-2">
                    Added {new Date(code.created_at).toLocaleDateString()}
                  </p>
                </div>
                
                {/* QR Thumbnail */}
                <button
                  onClick={() => setSelectedQR(qrUrl)}
                  className="flex-shrink-0 bg-white p-1.5 rounded-lg hover:scale-105 transition"
                  title="View full QR code"
                >
                  <QRCodeSVG value={qrUrl} size={60} />
                </button>
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-3 pt-3 border-t border-gray-700">
                <button
                  onClick={() => { setEditingId(code.id); setEditUrl(code.target_url) }}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-sm py-2 rounded-lg transition"
                >
                  ✏️ Change URL
                </button>
                <button
                  onClick={() => setSelectedQR(qrUrl)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-sm py-2 rounded-lg transition"
                >
                  📱 View QR
                </button>
                <button
                  onClick={() => deleteCode(code.id)}
                  className="bg-red-900/40 hover:bg-red-900/60 text-red-400 text-sm px-4 py-2 rounded-lg transition"
                >
                  🗑️
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
