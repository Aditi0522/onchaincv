import { useState, useEffect } from 'react'
import {
  connectWallet, setProfile, addEntry, removeEntry,
  getProfile, getEntries, getTotalProfiles,
  short, CONTRACT_ID,
} from './lib/stellar'

const CURRENT_YEAR = new Date().getFullYear()

// ── Timeline entry ─────────────────────────────────────────────────────────
function TimelineEntry({ entry, isOwner, onRemove, busy }) {
  const period = entry.is_current
    ? `${entry.from_year} — Present`
    : `${entry.from_year} — ${entry.to_year}`

  return (
    <div className="timeline-entry">
      <div className="te-line">
        <div className="te-dot" />
        <div className="te-connector" />
      </div>
      <div className="te-content">
        <div className="te-header">
          <div className="te-titles">
            <div className="te-role">{entry.title}</div>
            <div className="te-company">{entry.company}</div>
          </div>
          <div className="te-right">
            <div className="te-period">{period}</div>
            {entry.is_current && <span className="te-current-badge">CURRENT</span>}
          </div>
        </div>
        <p className="te-desc">{entry.description}</p>
        {isOwner && (
          <button
            className="btn-remove-entry"
            onClick={() => onRemove(entry.id)}
            disabled={busy}
            title="Remove this entry"
          >×</button>
        )}
      </div>
    </div>
  )
}

// ── Resume card ────────────────────────────────────────────────────────────
function ResumeCard({ profile, entries, wallet, address, onAction }) {
  const isOwner = wallet && address === wallet
  const [busy, setBusy] = useState(false)

  const handleRemove = async (id) => {
    setBusy(true)
    try {
      const hash = await removeEntry(wallet, id)
      onAction({ ok: true, msg: 'Entry removed', hash, refresh: true })
    } catch (e) { onAction({ ok: false, msg: e.message }) }
    finally { setBusy(false) }
  }

  const initials = profile?.name
    ? profile.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : short(address).slice(0, 2).toUpperCase()

  return (
    <div className="resume-card">
      {/* Header */}
      <div className="rc-header">
        <div className="rc-avatar">{initials}</div>
        <div className="rc-identity">
          <h1 className="rc-name">{profile?.name || 'Anonymous'}</h1>
          {profile?.headline && <p className="rc-headline">{profile.headline}</p>}
          <div className="rc-addr-row">
            <span className="rc-addr">{short(address)}</span>
            <a
              className="rc-stellar-link"
              href={`https://stellar.expert/explorer/testnet/account/${address}`}
              target="_blank" rel="noreferrer"
            >view on Stellar ↗</a>
          </div>
          {profile?.website && (
            <a className="rc-website" href={profile.website} target="_blank" rel="noreferrer">
              {profile.website}
            </a>
          )}
        </div>
        <div className="rc-verified">
          <div className="rc-verified-icon">✓</div>
          <div className="rc-verified-label">On-chain verified</div>
          <div className="rc-network">Stellar Testnet</div>
        </div>
      </div>

      {/* Divider */}
      <div className="rc-divider" />

      {/* Experience */}
      <div className="rc-section">
        <div className="rc-section-header">
          <h2 className="rc-section-title">Experience</h2>
          <span className="rc-count">{entries.length} {entries.length === 1 ? 'entry' : 'entries'}</span>
        </div>

        {entries.length === 0 ? (
          <p className="rc-empty">No work entries yet.</p>
        ) : (
          <div className="timeline">
            {[...entries].reverse().map(entry => (
              <TimelineEntry
                key={entry.id}
                entry={entry}
                isOwner={isOwner}
                onRemove={handleRemove}
                busy={busy}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Profile edit form ──────────────────────────────────────────────────────
function ProfileForm({ wallet, existing, onSaved }) {
  const [name,     setName]     = useState(existing?.name     || '')
  const [headline, setHeadline] = useState(existing?.headline || '')
  const [website,  setWebsite]  = useState(existing?.website  || '')
  const [busy,     setBusy]     = useState(false)
  const [err,      setErr]      = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setBusy(true); setErr('')
    try {
      const hash = await setProfile(wallet, name, headline, website)
      onSaved(hash)
    } catch (e) { setErr(e.message) }
    finally { setBusy(false) }
  }

  return (
    <form className="edit-form" onSubmit={handleSubmit}>
      <div className="ef-title">{existing ? 'Edit Profile' : 'Create Profile'}</div>
      <div className="ef-field">
        <label>Full Name</label>
        <input value={name} onChange={e => setName(e.target.value)}
          placeholder="Ada Lovelace" maxLength={80} required disabled={busy} />
      </div>
      <div className="ef-field">
        <label>Headline</label>
        <input value={headline} onChange={e => setHeadline(e.target.value)}
          placeholder="Software Engineer & Researcher" maxLength={80} disabled={busy} />
      </div>
      <div className="ef-field">
        <label>Website</label>
        <input value={website} onChange={e => setWebsite(e.target.value)}
          placeholder="https://your-site.com" maxLength={80} disabled={busy} />
      </div>
      {err && <p className="ef-err">{err}</p>}
      <button type="submit" className="btn-save" disabled={busy}>
        {busy ? 'Signing…' : 'Save to Chain'}
      </button>
    </form>
  )
}

// ── Add entry form ─────────────────────────────────────────────────────────
function AddEntryForm({ wallet, onAdded }) {
  const [title,     setTitle]     = useState('')
  const [company,   setCompany]   = useState('')
  const [desc,      setDesc]      = useState('')
  const [fromYear,  setFromYear]  = useState(String(CURRENT_YEAR))
  const [toYear,    setToYear]    = useState(String(CURRENT_YEAR))
  const [isCurrent, setIsCurrent] = useState(true)
  const [busy,      setBusy]      = useState(false)
  const [err,       setErr]       = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setBusy(true); setErr('')
    try {
      const hash = await addEntry(
        wallet, title, company, desc,
        parseInt(fromYear), parseInt(toYear), isCurrent
      )
      onAdded(hash)
      setTitle(''); setCompany(''); setDesc('')
    } catch (e) { setErr(e.message) }
    finally { setBusy(false) }
  }

  return (
    <form className="edit-form" onSubmit={handleSubmit}>
      <div className="ef-title">Add Work Experience</div>
      <div className="ef-field">
        <label>Job Title</label>
        <input value={title} onChange={e => setTitle(e.target.value)}
          placeholder="Senior Engineer" maxLength={80} required disabled={busy} />
      </div>
      <div className="ef-field">
        <label>Company</label>
        <input value={company} onChange={e => setCompany(e.target.value)}
          placeholder="Acme Corp" maxLength={80} required disabled={busy} />
      </div>
      <div className="ef-field">
        <label>Description</label>
        <textarea value={desc} onChange={e => setDesc(e.target.value)}
          placeholder="What you built and contributed…" maxLength={200} rows={3} disabled={busy} />
        <span className="ef-chars">{desc.length}/200</span>
      </div>

      <div className="ef-row">
        <div className="ef-field">
          <label>From Year</label>
          <input type="number" min="1900" max={CURRENT_YEAR}
            value={fromYear} onChange={e => setFromYear(e.target.value)} required disabled={busy} />
        </div>
        {!isCurrent && (
          <div className="ef-field">
            <label>To Year</label>
            <input type="number" min="1900" max={CURRENT_YEAR}
              value={toYear} onChange={e => setToYear(e.target.value)} disabled={busy} />
          </div>
        )}
      </div>

      <label className="ef-check">
        <input type="checkbox" checked={isCurrent}
          onChange={e => setIsCurrent(e.target.checked)} disabled={busy} />
        <span>I currently work here</span>
      </label>

      {err && <p className="ef-err">{err}</p>}
      <button type="submit" className="btn-save" disabled={busy || !title || !company}>
        {busy ? 'Signing…' : 'Add to Chain'}
      </button>
    </form>
  )
}

// ── Lookup bar ─────────────────────────────────────────────────────────────
function LookupBar({ onLookup }) {
  const [addr, setAddr] = useState('')
  return (
    <form className="lookup-bar" onSubmit={e => { e.preventDefault(); onLookup(addr.trim()) }}>
      <input
        className="lookup-input"
        value={addr}
        onChange={e => setAddr(e.target.value)}
        placeholder="Paste a Stellar address to view their CV…"
      />
      <button type="submit" className="btn-lookup" disabled={!addr.trim()}>View CV</button>
    </form>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function App() {
  const [wallet,        setWallet]        = useState(null)
  const [viewAddress,   setViewAddress]   = useState(null)
  const [profile,       setProfile_]      = useState(null)
  const [entries,       setEntries]       = useState([])
  const [totalProfiles, setTotalProfiles] = useState(0)
  const [loading,       setLoading]       = useState(false)
  const [tab,           setTab]           = useState('cv')      // cv | edit | add
  const [toast,         setToast]         = useState(null)

  useEffect(() => { getTotalProfiles().then(setTotalProfiles) }, [])

  const loadCV = async (addr) => {
    setLoading(true)
    setViewAddress(addr)
    try {
      const [p, e] = await Promise.all([getProfile(addr), getEntries(addr)])
      setProfile_(p)
      setEntries(e)
    } catch {}
    setLoading(false)
    setTab('cv')
  }

  const handleConnect = async () => {
    try {
      const addr = await connectWallet()
      setWallet(addr)
      loadCV(addr)
    } catch (e) { showToast(false, e.message) }
  }

  const showToast = (ok, msg, hash) => {
    setToast({ ok, msg, hash })
    setTimeout(() => setToast(null), 6000)
  }

  const handleAction = ({ ok, msg, hash, refresh }) => {
    showToast(ok, msg, hash)
    if (ok && refresh && viewAddress) loadCV(viewAddress)
  }

  const handleSaved = (hash) => {
    showToast(true, 'Profile saved on-chain!', hash)
    setTab('cv')
    if (wallet) loadCV(wallet)
  }

  const handleAdded = (hash) => {
    showToast(true, 'Experience added on-chain!', hash)
    setTab('cv')
    if (wallet) loadCV(wallet)
  }

  const isOwnCV = wallet && viewAddress === wallet

  return (
    <div className="app">
      {/* ── Header ── */}
      <header className="header">
        <div className="brand">
          <div className="brand-mark">CV</div>
          <div className="brand-text">
            <div className="brand-name">OnChainCV</div>
            <div className="brand-tag">Stellar · Soroban</div>
          </div>
        </div>

        <LookupBar onLookup={loadCV} />

        <div className="header-actions">
          <div className="profiles-badge">
            <span className="pb-n">{totalProfiles}</span>
            <span className="pb-l">profiles</span>
          </div>
          {wallet
            ? <div className="wallet-pill"><span className="wdot" />{short(wallet)}</div>
            : <button className="btn-connect" onClick={handleConnect}>Connect Wallet</button>
          }
        </div>
      </header>

      {/* ── Toast ── */}
      {toast && (
        <div className={`toast ${toast.ok ? 'toast-ok' : 'toast-err'}`}>
          <span>{toast.msg}</span>
          {toast.hash && (
            <a href={`https://stellar.expert/explorer/testnet/tx/${toast.hash}`}
              target="_blank" rel="noreferrer" className="toast-link">TX ↗</a>
          )}
        </div>
      )}

      <div className="layout">
        {/* ── Sidebar ── */}
        {isOwnCV && (
          <aside className="sidebar">
            <div className="sidebar-title">My CV</div>
            <nav className="sidebar-nav">
              {[
                { id: 'cv',   label: 'View CV' },
                { id: 'edit', label: 'Edit Profile' },
                { id: 'add',  label: '+ Add Experience' },
              ].map(t => (
                <button key={t.id}
                  className={`snav-btn ${tab === t.id ? 'snav-active' : ''}`}
                  onClick={() => setTab(t.id)}>
                  {t.label}
                </button>
              ))}
            </nav>
            <div className="sidebar-note">
              All changes are signed by your wallet and stored permanently on-chain.
            </div>
            <a className="sidebar-contract"
              href={`https://stellar.expert/explorer/testnet/contract/${CONTRACT_ID}`}
              target="_blank" rel="noreferrer">Contract ↗</a>
          </aside>
        )}

        {/* ── Main ── */}
        <main className={`main ${!isOwnCV ? 'main-full' : ''}`}>
          {!viewAddress ? (
            <div className="landing">
              <h2 className="landing-title">Your resume, signed by your wallet.</h2>
              <p className="landing-sub">Connect Freighter to build your on-chain CV, or paste any Stellar address to view theirs.</p>
              <button className="btn-connect-lg" onClick={handleConnect}>Connect Freighter</button>
            </div>
          ) : loading ? (
            <div className="cv-loading">
              <div className="spinner" />
              <span>Loading CV from chain…</span>
            </div>
          ) : (
            <>
              {tab === 'cv' && (
                <ResumeCard
                  profile={profile}
                  entries={entries}
                  wallet={wallet}
                  address={viewAddress}
                  onAction={handleAction}
                />
              )}
              {tab === 'edit' && isOwnCV && (
                <ProfileForm wallet={wallet} existing={profile} onSaved={handleSaved} />
              )}
              {tab === 'add' && isOwnCV && (
                <AddEntryForm wallet={wallet} onAdded={handleAdded} />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}
