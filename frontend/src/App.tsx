import { useState, useRef, useCallback } from 'react'
import { Upload, FileText, Briefcase, Zap, ChevronRight, X, ExternalLink, CheckCircle, AlertCircle, Star, TrendingUp, User, Mail, Phone, Award, BookOpen, Building2, MapPin, DollarSign } from 'lucide-react'
import { analyseResume } from './utils/api'
import type { AnalyseResponse, JobMatch } from './types'
import './index.css'

type AppState = 'upload' | 'loading' | 'results'

const LOADING_STEPS = [
  { icon: FileText, label: 'PDF okunuyor...' },
  { icon: Zap, label: 'AI CV\'yi analiz ediyor...' },
  { icon: Briefcase, label: 'Uyumlu ilanlar aranıyor...' },
  { icon: Star, label: 'Sonuçlar hazırlanıyor...' },
]

function ScoreRing({ score, size = 80 }: { score: number; size?: number }) {
  const r = (size / 2) - 6
  const circ = 2 * Math.PI * r
  const filled = (score / 100) * circ
  const color = score >= 80 ? '#4ade80' : score >= 60 ? '#facc15' : '#f87171'
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="5" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="5"
        strokeDasharray={`${filled} ${circ}`} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 1.2s ease' }} />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central"
        style={{ transform: 'rotate(90deg)', transformOrigin: '50% 50%', fill: color,
          fontSize: size > 70 ? '18px' : '13px', fontWeight: '700', fontFamily: 'DM Mono, monospace' }}>
        {score}
      </text>
    </svg>
  )
}

function SkillBadge({ label, variant = 'default' }: { label: string; variant?: 'default' | 'matched' | 'missing' }) {
  const styles: Record<string, React.CSSProperties> = {
    default: { background: 'rgba(255,255,255,0.08)', color: '#e2e8f0' },
    matched: { background: 'rgba(74,222,128,0.15)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.3)' },
    missing: { background: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)' },
  }
  return (
    <span style={{
      display: 'inline-block', padding: '3px 10px', borderRadius: '999px',
      fontSize: '11px', fontWeight: 500, margin: '3px', ...styles[variant]
    }}>
      {label}
    </span>
  )
}

function JobCard({ job, index }: { job: JobMatch; index: number }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="job-card" style={{ animationDelay: `${index * 80}ms` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: '15px', fontWeight: 600, color: '#f1f5f9', marginBottom: '6px' }}>{job.title}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '12px', color: '#94a3b8' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Building2 size={11} />{job.company}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={11} />{job.location}</span>
            {job.salary !== 'Belirtilmemiş' && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#86efac' }}><DollarSign size={11} />{job.salary}</span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
          <ScoreRing score={job.matchScore} size={52} />
          <span style={{ fontSize: '10px', color: '#64748b' }}>uyum</span>
        </div>
      </div>

      {job.matchedSkills.length > 0 && (
        <div style={{ marginTop: '10px' }}>
          {job.matchedSkills.slice(0, expanded ? undefined : 4).map(s => <SkillBadge key={s} label={s} variant="matched" />)}
          {!expanded && job.matchedSkills.length > 4 && (
            <span style={{ fontSize: '11px', color: '#64748b', cursor: 'pointer' }} onClick={() => setExpanded(true)}>
              +{job.matchedSkills.length - 4} daha
            </span>
          )}
        </div>
      )}

      {expanded && job.description && (
        <p style={{ marginTop: '10px', fontSize: '12px', color: '#94a3b8', lineHeight: 1.6 }}>{job.description}</p>
      )}

      <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
        <a href={job.url} target="_blank" rel="noopener noreferrer"
          style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#818cf8',
            textDecoration: 'none', padding: '5px 12px', border: '1px solid rgba(129,140,248,0.3)', borderRadius: '6px' }}>
          <ExternalLink size={11} />İlana git
        </a>
        <button onClick={() => setExpanded(!expanded)}
          style={{ fontSize: '12px', color: '#64748b', background: 'transparent',
            border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '5px 12px', cursor: 'pointer' }}>
          {expanded ? 'Gizle' : 'Detay'}
        </button>
      </div>
    </div>
  )
}

export default function App() {
  const [state, setState] = useState<AppState>('upload')
  const [dragOver, setDragOver] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [loadingStep, setLoadingStep] = useState(0)
  const [result, setResult] = useState<AnalyseResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'jobs' | 'profile' | 'tips'>('jobs')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith('.pdf')) { setError('Sadece PDF dosyaları destekleniyor.'); return }
    if (file.size > 10 * 1024 * 1024) { setError('Dosya 10MB\'dan büyük olamaz.'); return }
    setSelectedFile(file)
    setError(null)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleAnalyse = async () => {
    if (!selectedFile) return
    setState('loading'); setError(null)
    const stepInterval = setInterval(() => setLoadingStep(s => Math.min(s + 1, LOADING_STEPS.length - 1)), 1800)
    try {
      const data = await analyseResume(selectedFile)
      clearInterval(stepInterval)
      setResult(data); setState('results')
    } catch (err) {
      clearInterval(stepInterval)
      setError(err instanceof Error ? err.message : 'Bir hata oluştu.')
      setState('upload'); setLoadingStep(0)
    }
  }

  const reset = () => { setState('upload'); setSelectedFile(null); setResult(null); setError(null); setLoadingStep(0) }

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="logo-icon"><Briefcase size={16} /></div>
            <span className="logo-text">ResumeAI</span>
          </div>
          {state === 'results' && (
            <button className="btn-ghost" onClick={reset}><X size={14} />Yeni analiz</button>
          )}
        </div>
      </header>

      <main className="main">
        {state === 'upload' && (
          <div className="upload-page">
            <div className="hero">
              <div className="hero-badge"><Zap size={12} />AI Destekli</div>
              <h1 className="hero-title">CV'nizi analiz edin,<br />hayalinizdeki işi bulun</h1>
              <p className="hero-sub">PDF yükleyin — yapay zeka saniyeler içinde becerilerinizi çıkarır, uyumlu iş ilanlarını sıralar</p>
            </div>

            <div className={`drop-zone ${dragOver ? 'drag-over' : ''} ${selectedFile ? 'has-file' : ''}`}
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}>
              <input ref={fileInputRef} type="file" accept=".pdf" style={{ display: 'none' }}
                onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
              {selectedFile ? (
                <div className="file-selected">
                  <div className="file-icon"><FileText size={24} /></div>
                  <div>
                    <p className="file-name">{selectedFile.name}</p>
                    <p className="file-size">{(selectedFile.size / 1024).toFixed(0)} KB</p>
                  </div>
                  <CheckCircle size={20} color="#4ade80" />
                </div>
              ) : (
                <div className="upload-prompt">
                  <div className="upload-icon"><Upload size={28} /></div>
                  <p className="upload-text">PDF'i sürükleyin veya tıklayın</p>
                  <p className="upload-sub">Maks. 10MB</p>
                </div>
              )}
            </div>

            {error && <div className="error-banner"><AlertCircle size={14} />{error}</div>}

            <button className="btn-primary" disabled={!selectedFile} onClick={handleAnalyse}>
              Analiz Et <ChevronRight size={16} />
            </button>

            <div className="features-row">
              {[
                { icon: Zap, label: 'Beceri Analizi' },
                { icon: Briefcase, label: 'İlan Eşleştirme' },
                { icon: TrendingUp, label: 'ATS Skoru' },
                { icon: Star, label: 'CV Önerileri' },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="feature-chip"><Icon size={12} />{label}</div>
              ))}
            </div>
          </div>
        )}

        {state === 'loading' && (
          <div className="loading-page">
            <div className="loading-orb" />
            <h2 className="loading-title">Analiz ediliyor...</h2>
            <div className="loading-steps">
              {LOADING_STEPS.map(({ icon: Icon, label }, i) => (
                <div key={i} className={`loading-step ${i <= loadingStep ? 'active' : ''} ${i < loadingStep ? 'done' : ''}`}>
                  <div className="step-dot">{i < loadingStep ? <CheckCircle size={14} /> : <Icon size={14} />}</div>
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {state === 'results' && result && (
          <div className="results-page">
            <div className="summary-bar">
              <div className="summary-profile">
                <div className="avatar">{result.profile.name?.[0] || '?'}</div>
                <div>
                  <p className="summary-name">{result.profile.name || 'Aday'}</p>
                  <p className="summary-title">{result.profile.title}</p>
                </div>
              </div>
              <div className="summary-stats">
                <div className="stat"><ScoreRing score={result.atsScore} size={64} /><span className="stat-label">ATS Skoru</span></div>
                <div className="stat"><span className="stat-num">{result.jobMatches.length}</span><span className="stat-label">İlan</span></div>
                <div className="stat"><span className="stat-num">{result.profile.skills.length}</span><span className="stat-label">Beceri</span></div>
              </div>
            </div>

            {result.summary && <div className="summary-text"><p>{result.summary}</p></div>}

            <div className="tabs">
              {([
                { key: 'jobs', label: `İlanlar (${result.jobMatches.length})`, icon: Briefcase },
                { key: 'profile', label: 'Profil', icon: User },
                { key: 'tips', label: 'Öneriler', icon: TrendingUp },
              ] as const).map(({ key, label, icon: Icon }) => (
                <button key={key} className={`tab ${activeTab === key ? 'active' : ''}`} onClick={() => setActiveTab(key)}>
                  <Icon size={13} />{label}
                </button>
              ))}
            </div>

            {activeTab === 'jobs' && (
              <div className="tab-content">
                {result.jobMatches.map((job, i) => <JobCard key={i} job={job} index={i} />)}
              </div>
            )}

            {activeTab === 'profile' && (
              <div className="tab-content">
                <div className="profile-grid">
                  <div className="profile-card">
                    <h3 className="card-title"><User size={14} />İletişim</h3>
                    {result.profile.email && <p className="info-row"><Mail size={12} />{result.profile.email}</p>}
                    {result.profile.phone && <p className="info-row"><Phone size={12} />{result.profile.phone}</p>}
                    <p className="info-row"><Award size={12} />{result.profile.yearsOfExperience} yıl deneyim</p>
                  </div>
                  <div className="profile-card">
                    <h3 className="card-title"><Zap size={14} />Beceriler</h3>
                    <div>{result.profile.skills.map(s => <SkillBadge key={s} label={s} />)}</div>
                  </div>
                  {result.profile.workHistory.length > 0 && (
                    <div className="profile-card full-width">
                      <h3 className="card-title"><Building2 size={14} />Deneyim</h3>
                      {result.profile.workHistory.map((w, i) => (
                        <div key={i} className="timeline-item">
                          <div className="timeline-dot" />
                          <div>
                            <p className="timeline-role">{w.role}</p>
                            <p className="timeline-company">{w.company} · {w.duration}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {result.profile.education.length > 0 && (
                    <div className="profile-card full-width">
                      <h3 className="card-title"><BookOpen size={14} />Eğitim</h3>
                      {result.profile.education.map((e, i) => (
                        <div key={i} className="timeline-item">
                          <div className="timeline-dot" />
                          <div>
                            <p className="timeline-role">{e.degree}</p>
                            <p className="timeline-company">{e.institution} · {e.year}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'tips' && (
              <div className="tab-content">
                <div className="tips-grid">
                  {result.atsImprovements.length > 0 && (
                    <div className="tips-card">
                      <h3 className="card-title"><TrendingUp size={14} />ATS İyileştirmeleri</h3>
                      {result.atsImprovements.map((tip, i) => (
                        <div key={i} className="tip-item">
                          <span className="tip-num">{i + 1}</span>
                          <p className="tip-text">{tip}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {result.missingSkills.length > 0 && (
                    <div className="tips-card">
                      <h3 className="card-title"><AlertCircle size={14} />Eksik Beceriler</h3>
                      <p className="tips-sub">Bu becerileri edinmek profilinizi güçlendirecek:</p>
                      <div>{result.missingSkills.map(s => <SkillBadge key={s} label={s} variant="missing" />)}</div>
                    </div>
                  )}
                  {result.atsImprovements.length === 0 && result.missingSkills.length === 0 && (
                    <div className="tips-card">
                      <p style={{ color: '#94a3b8', fontSize: '13px' }}>CV'niz oldukça güçlü görünüyor! 🎉</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}