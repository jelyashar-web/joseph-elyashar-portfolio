'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTheme } from '../../context/ThemeContext'
import dynamic from 'next/dynamic'

const CanvasBlockEditor = dynamic(() => import('../../../components/CanvasBlockEditor'), { ssr: false })
import {
  LayoutDashboard,
  FileText,
  Tags,
  Settings,
  Plus,
  Trash2,
  Edit3,
  Save,
  X,
  Lock,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Search,
  RefreshCw,
  Sparkles,
  Image,
  MessageSquare,
  Hammer,
  Play,
  Cpu,
  Eye,
  EyeOff,
  Terminal,
} from 'lucide-react'

interface Post {
  slug: string
  title: string
  excerpt: string
  content: string
  date: string
  readTime: string
  tags: string[]
  category: string
  wordCount?: number
  imageUrl?: string
}

interface TopicRecord {
  topics: string[]
  writtenAt: string
  slug: string
}

type Tab = 'posts' | 'topics' | 'settings' | 'ai' | 'images' | 'comments' | 'deploy'

const API_BASE = process.env.NEXT_PUBLIC_AGENT_URL?.replace('/chat', '') || 'http://localhost:3004'

function getAuthHeader(password: string) {
  return 'Basic ' + btoa('admin:' + password)
}

export default function AdminPage() {
  const { theme } = useTheme()
  const [password, setPassword] = useState('')
  const [authed, setAuthed] = useState(false)
  const [authError, setAuthError] = useState('')
  const [tab, setTab] = useState<Tab>('posts')
  const [loading, setLoading] = useState(false)
  const [posts, setPosts] = useState<Post[]>([])
  const [topics, setTopics] = useState<TopicRecord[]>([])
  const [settings, setSettings] = useState({ systemPrompt: '' })
  const [editingPost, setEditingPost] = useState<Post | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // AI Generator state
  const [generateCount, setGenerateCount] = useState(1)
  const [pipelineStatus, setPipelineStatus] = useState<'idle' | 'running'>('idle')
  const [generationLog, setGenerationLog] = useState<string[]>([])

  // Image Generator state
  const [imagePrompt, setImagePrompt] = useState('')
  const [imageStyle, setImageStyle] = useState('cinematic')
  const [imageWidth, setImageWidth] = useState(1024)
  const [imageHeight, setImageHeight] = useState(576)
  const [generatedImages, setGeneratedImages] = useState<Array<{ url: string; prompt: string; date: string }>>([])
  const [generatingImage, setGeneratingImage] = useState(false)

  // Comments state
  const [allComments, setAllComments] = useState<Array<any>>([])

  // Build & Deploy state
  const [buildOutput, setBuildOutput] = useState<string[]>([])
  const [building, setBuilding] = useState(false)
  const [lastBuild, setLastBuild] = useState<string | null>(null)

  // Logs state
  const [logFiles, setLogFiles] = useState<Array<{ name: string; size: number; modified: string }>>([])
  const [activeLog, setActiveLog] = useState<string | null>(null)
  const [logContent, setLogContent] = useState<string[]>([])

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3000)
  }, [])

  async function apiFetch(path: string, opts?: RequestInit) {
    const res = await fetch(`${API_BASE}${path}`, {
      ...opts,
      headers: {
        ...(opts?.headers || {}),
        Authorization: getAuthHeader(password),
        'Content-Type': 'application/json',
      },
    })
    if (res.status === 401 || res.status === 403) {
      setAuthed(false)
      setAuthError('סיסמה שגויה')
      throw new Error('Unauthorized')
    }
    return res
  }

  const loadPosts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiFetch('/admin/posts')
      const data = await res.json()
      setPosts(data)
    } catch {
      showToast('error', 'שגיאה בטעינת פוסטים')
    } finally {
      setLoading(false)
    }
  }, [password, authed])

  const loadTopics = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiFetch('/admin/topics')
      const data = await res.json()
      setTopics(data)
    } catch {
      showToast('error', 'שגיאה בטעינת נושאים')
    } finally {
      setLoading(false)
    }
  }, [password, authed])

  const loadSettings = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiFetch('/admin/settings')
      const data = await res.json()
      setSettings(data)
    } catch {
      showToast('error', 'שגיאה בטעינת הגדרות')
    } finally {
      setLoading(false)
    }
  }, [password, authed])

  const loadPipelineStatus = useCallback(async () => {
    try {
      const res = await apiFetch('/admin/pipeline/status')
      const data = await res.json()
      setPipelineStatus(data.running ? 'running' : 'idle')
    } catch {
      // silently fail
    }
  }, [password, authed])

  const loadLogFiles = useCallback(async () => {
    try {
      const res = await apiFetch('/admin/logs')
      const data = await res.json()
      setLogFiles(data.logs || [])
    } catch {
      showToast('error', 'שגיאה בטעינת לוגים')
    }
  }, [password, authed])

  const loadLogContent = useCallback(async (filename: string) => {
    try {
      const res = await apiFetch(`/admin/logs/${filename}`)
      const data = await res.json()
      setLogContent(data.lines || [])
      setActiveLog(filename)
    } catch {
      showToast('error', 'שגיאה בטעינת קובץ לוג')
    }
  }, [password, authed])

  const loadAllComments = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiFetch('/admin/comments')
      const data = await res.json()
      setAllComments(data.comments || [])
    } catch {
      showToast('error', 'שגיאה בטעינת תגובות')
    } finally {
      setLoading(false)
    }
  }, [password, authed])

  useEffect(() => {
    if (!authed) return
    if (tab === 'posts') loadPosts()
    if (tab === 'topics') loadTopics()
    if (tab === 'settings') loadSettings()
    if (tab === 'ai') { loadPipelineStatus(); loadLogFiles() }
    if (tab === 'comments') loadAllComments()
    if (tab === 'deploy') { loadPipelineStatus(); setLastBuild(localStorage.getItem('lastBuildTime')) }
  }, [tab, authed, loadPosts, loadTopics, loadSettings, loadPipelineStatus, loadLogFiles, loadAllComments])

  // Poll pipeline status every 5 seconds when on AI tab
  useEffect(() => {
    if (!authed || tab !== 'ai') return
    const interval = setInterval(loadPipelineStatus, 5000)
    return () => clearInterval(interval)
  }, [authed, tab, loadPipelineStatus])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setAuthError('')
    try {
      const res = await apiFetch('/admin/posts')
      if (res.ok) {
        setAuthed(true)
        const data = await res.json()
        setPosts(data)
      } else {
        setAuthError('סיסמה שגויה')
      }
    } catch {
      setAuthError('סיסמה שגויה')
    }
  }

  async function savePost(post: Post) {
    setLoading(true)
    try {
      const exists = posts.some(p => p.slug === post.slug && p.slug !== editingPost?.slug)
      const method = editingPost ? 'PUT' : 'POST'
      const path = editingPost ? `/admin/posts/${editingPost.slug}` : '/admin/posts'
      if (!editingPost && exists) {
        showToast('error', 'פוסט עם slug זה כבר קיים')
        return
      }
      const res = await apiFetch(path, {
        method,
        body: JSON.stringify(post),
      })
      if (res.ok) {
        showToast('success', editingPost ? 'פוסט עודכן' : 'פוסט נוצר')
        setEditingPost(null)
        setIsCreating(false)
        loadPosts()
      } else {
        showToast('error', 'שגיאה בשמירה')
      }
    } catch {
      showToast('error', 'שגיאה בשמירה')
    } finally {
      setLoading(false)
    }
  }

  async function deletePost(slug: string) {
    if (!confirm('האם אתה בטוח שברצונך למחוק פוסט זה?')) return
    setLoading(true)
    try {
      const res = await apiFetch(`/admin/posts/${slug}`, { method: 'DELETE' })
      if (res.ok) {
        showToast('success', 'פוסט נמחק')
        loadPosts()
      } else {
        showToast('error', 'שגיאה במחיקה')
      }
    } catch {
      showToast('error', 'שגיאה במחיקה')
    } finally {
      setLoading(false)
    }
  }

  async function deleteTopic(slug: string) {
    if (!confirm('האם אתה בטוח?')) return
    setLoading(true)
    try {
      const res = await apiFetch(`/admin/topics/${slug}`, { method: 'DELETE' })
      if (res.ok) {
        showToast('success', 'נושא נמחק')
        loadTopics()
      } else {
        showToast('error', 'שגיאה במחיקה')
      }
    } catch {
      showToast('error', 'שגיאה במחיקה')
    } finally {
      setLoading(false)
    }
  }

  async function saveSettings() {
    setLoading(true)
    try {
      const res = await apiFetch('/admin/settings', {
        method: 'POST',
        body: JSON.stringify({ systemPrompt: settings.systemPrompt }),
      })
      if (res.ok) {
        showToast('success', 'הגדרות נשמרו')
      } else {
        showToast('error', 'שגיאה בשמירת הגדרות')
      }
    } catch {
      showToast('error', 'שגיאה בשמירת הגדרות')
    } finally {
      setLoading(false)
    }
  }

  // ─── AI Generator Handlers ───
  async function handleGeneratePosts() {
    if (pipelineStatus === 'running') {
      showToast('error', 'המערכת כבר רצה כרגע')
      return
    }
    setGenerationLog(prev => [...prev, `[${new Date().toLocaleTimeString('he-IL')}] מתחיל יצירת ${generateCount} פוסטים...`])
    try {
      const res = await apiFetch('/admin/generate-content', {
        method: 'POST',
        body: JSON.stringify({ count: generateCount }),
      })
      const data = await res.json()
      if (res.ok || res.status === 202) {
        showToast('success', data.message || 'הייצור התחיל')
        setPipelineStatus('running')
        setGenerationLog(prev => [...prev, `[${new Date().toLocaleTimeString('he-IL')}] בקשה נשלחה — ${data.logFile}`])
      } else {
        showToast('error', data.error || 'שגיאה בהתחלת ייצור')
      }
    } catch {
      showToast('error', 'שגיאה בהתחלת ייצור')
    }
  }

  async function handleGenerateImage() {
    if (!imagePrompt.trim()) {
      showToast('error', 'הזן prompt לתמונה')
      return
    }
    setGeneratingImage(true)
    try {
      const res = await apiFetch('/admin/generate-image', {
        method: 'POST',
        body: JSON.stringify({ prompt: imagePrompt, width: imageWidth, height: imageHeight }),
      })
      const data = await res.json()
      if (res.ok) {
        showToast('success', 'תמונה נוצרה בהצלחה')
        setGeneratedImages(prev => [{ url: data.imageUrl, prompt: imagePrompt, date: new Date().toISOString() }, ...prev])
        setImagePrompt('')
      } else {
        showToast('error', data.error || 'שגיאה ביצירת תמונה')
      }
    } catch {
      showToast('error', 'שגיאה ביצירת תמונה')
    } finally {
      setGeneratingImage(false)
    }
  }

  async function handleBuild() {
    if (pipelineStatus === 'running') {
      showToast('error', 'המערכת כבר רצה כרגע — המתן לסיום')
      return
    }
    setBuilding(true)
    setBuildOutput(prev => [...prev, `[${new Date().toLocaleTimeString('he-IL')}] מתחיל בניית האתר...`])
    try {
      const res = await apiFetch('/admin/build', { method: 'POST', body: JSON.stringify({}) })
      const data = await res.json()
      if (res.ok || res.status === 202) {
        showToast('success', data.message || 'הבנייה התחילה')
        setPipelineStatus('running')
        setBuildOutput(prev => [...prev, `[${new Date().toLocaleTimeString('he-IL')}] בקשת בנייה נשלחה`])
        localStorage.setItem('lastBuildTime', new Date().toISOString())
        setLastBuild(new Date().toISOString())
      } else {
        showToast('error', data.error || 'שגיאה בהתחלת בנייה')
      }
    } catch {
      showToast('error', 'שגיאה בהתחלת בנייה')
    } finally {
      setBuilding(false)
    }
  }

  async function handleDeleteComment(slug: string, commentId: string) {
    if (!confirm('האם אתה בטוח שברצונך למחוק תגובה זו?')) return
    try {
      const res = await apiFetch(`/admin/comments/${slug}/${commentId}`, { method: 'DELETE' })
      if (res.ok) {
        showToast('success', 'תגובה נמחקה')
        loadAllComments()
      } else {
        showToast('error', 'שגיאה במחיקת תגובה')
      }
    } catch {
      showToast('error', 'שגיאה במחיקת תגובה')
    }
  }

  const filteredPosts = posts.filter(p =>
    p.title?.includes(searchQuery) ||
    p.slug?.includes(searchQuery) ||
    p.category?.includes(searchQuery)
  )

  const isDark = theme === 'dark'
  const bgMain = isDark ? 'bg-black' : 'bg-gray-50'
  const textMain = isDark ? 'text-white' : 'text-gray-900'
  const cardBg = isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'
  const inputBg = isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
  const hoverBg = isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'

  if (!authed) {
    return (
      <main className={`min-h-screen ${bgMain} flex items-center justify-center px-4`} dir="rtl">
        <div className={`w-full max-w-md ${cardBg} border rounded-2xl p-8 shadow-2xl`}>
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-r from-purple-600 to-cyan-500 flex items-center justify-center">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h1 className={`text-2xl font-bold ${textMain}`}>ניהול מערכת</h1>
            <p className="text-gray-500 mt-2">הזן סיסמה כדי להמשיך</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="סיסמה"
                className={`w-full rounded-xl px-4 py-3 border focus:outline-none focus:ring-2 focus:ring-purple-500 ${inputBg}`}
                autoFocus
              />
            </div>
            {authError && (
              <div className="flex items-center gap-2 text-red-400 text-sm">
                <AlertTriangle className="w-4 h-4" />
                {authError}
              </div>
            )}
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-600 to-cyan-500 text-white font-semibold py-3 rounded-xl hover:opacity-90 transition-opacity"
            >
              כניסה
            </button>
          </form>
        </div>
      </main>
    )
  }

  return (
    <main className={`min-h-screen ${bgMain} ${textMain}`} dir="rtl">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
          <div className={`flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl ${
            toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
          }`}>
            {toast.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            {toast.message}
          </div>
        </div>
      )}

      {/* Header */}
      <header className={`border-b ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 flex items-center justify-center">
              <LayoutDashboard className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className={`text-lg font-bold ${textMain}`}>ElyasharLabs CMS</h1>
              <p className="text-xs text-gray-500">ניהול תוכן ומערכת</p>
            </div>
          </div>
          <button
            onClick={() => setAuthed(false)}
            className="text-sm text-gray-500 hover:text-red-400 transition-colors"
          >
            התנתק
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Tabs */}
        <div className={`flex gap-2 mb-6 border-b ${isDark ? 'border-white/10' : 'border-gray-200'} pb-2 flex-wrap`}>
          {[
            { id: 'posts' as Tab, label: 'פוסטים', icon: FileText },
            { id: 'topics' as Tab, label: 'נושאים', icon: Tags },
            { id: 'ai' as Tab, label: 'AI Generator', icon: Sparkles },
            { id: 'images' as Tab, label: 'תמונות', icon: Image },
            { id: 'comments' as Tab, label: 'תגובות', icon: MessageSquare },
            { id: 'deploy' as Tab, label: 'בנייה', icon: Hammer },
            { id: 'settings' as Tab, label: 'הגדרות', icon: Settings },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                tab === id
                  ? 'bg-purple-600/20 text-purple-400'
                  : `text-gray-500 ${hoverBg}`
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Posts Tab */}
        {tab === 'posts' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${cardBg} w-full max-w-md`}>
                <Search className="w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="חפש פוסטים..."
                  className={`bg-transparent border-none outline-none text-sm w-full ${textMain} placeholder-gray-500`}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={loadPosts}
                  className={`p-2 rounded-xl border ${cardBg} ${hoverBg} transition-colors`}
                  title="רענן"
                >
                  <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={() => { setTab('ai') }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 text-white text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  <Sparkles className="w-4 h-4" />
                  צור עם AI
                </button>
                <button
                  onClick={() => { setIsCreating(true); setEditingPost(null) }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-purple-500/30 text-purple-400 text-sm font-medium hover:bg-purple-500/10 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  פוסט חדש
                </button>
              </div>
            </div>

            {/* Posts Table */}
            <div className={`border rounded-2xl overflow-hidden ${cardBg}`}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={`border-b ${isDark ? 'border-white/10' : 'border-gray-200'} ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                      <th className="text-right px-4 py-3 font-medium text-gray-500">כותרת</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-500">קטגוריה</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-500">תאריך</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-500">מילים</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-500">פעולות</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPosts.map((post, i) => (
                      <tr
                        key={post.slug}
                        className={`border-b ${isDark ? 'border-white/5' : 'border-gray-100'} ${hoverBg} transition-colors`}
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium">{post.title}</div>
                          <div className="text-xs text-gray-500">{post.slug}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs ${isDark ? 'bg-purple-600/20 text-purple-400' : 'bg-purple-100 text-purple-700'}`}>
                            {post.category || 'ללא'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {post.date ? new Date(post.date).toLocaleDateString('he-IL') : '-'}
                        </td>
                        <td className="px-4 py-3 text-gray-500">{post.wordCount?.toLocaleString() || '-'}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => { setEditingPost(post); setIsCreating(false) }}
                              className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'} transition-colors text-cyan-400`}
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deletePost(post.slug)}
                              className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'} transition-colors text-red-400`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredPosts.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                          {loading ? (
                            <div className="flex items-center justify-center gap-2">
                              <Loader2 className="w-5 h-5 animate-spin" />
                              טוען...
                            </div>
                          ) : (
                            'אין פוסטים'
                          )}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Topics Tab */}
        {tab === 'topics' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className={`text-lg font-bold ${textMain}`}>נושאים שנכתבו</h2>
              <button
                onClick={loadTopics}
                className={`p-2 rounded-xl border ${cardBg} ${hoverBg} transition-colors`}
              >
                <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <div className={`border rounded-2xl overflow-hidden ${cardBg}`}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={`border-b ${isDark ? 'border-white/10' : 'border-gray-200'} ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                      <th className="text-right px-4 py-3 font-medium text-gray-500">נושאים</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-500">Slug</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-500">תאריך כתיבה</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-500">פעולות</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topics.map((topic) => (
                      <tr key={topic.slug} className={`border-b ${isDark ? 'border-white/5' : 'border-gray-100'} ${hoverBg} transition-colors`}>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {topic.topics.map(t => (
                              <span key={t} className={`px-2 py-1 rounded-full text-xs ${isDark ? 'bg-white/10 text-gray-400' : 'bg-gray-100 text-gray-600'}`}>
                                {t}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-500">{topic.slug}</td>
                        <td className="px-4 py-3 text-gray-500">
                          {topic.writtenAt ? new Date(topic.writtenAt).toLocaleDateString('he-IL') : '-'}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => deleteTopic(topic.slug)}
                            className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'} transition-colors text-red-400`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {topics.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                          {loading ? (
                            <div className="flex items-center justify-center gap-2">
                              <Loader2 className="w-5 h-5 animate-spin" />
                              טוען...
                            </div>
                          ) : (
                            'אין נושאים'
                          )}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* AI Generator Tab */}
        {tab === 'ai' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className={`text-lg font-bold ${textMain}`}>מחולל תוכן AI</h2>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${pipelineStatus === 'running' ? 'bg-yellow-400 animate-pulse' : 'bg-green-500'}`} />
                <span className="text-sm text-gray-500">{pipelineStatus === 'running' ? 'רץ כרגע...' : 'מוכן'}</span>
              </div>
            </div>

            <div className={`border rounded-2xl p-6 ${cardBg} space-y-4`}>
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium text-gray-500">כמות פוסטים:</label>
                <select
                  value={generateCount}
                  onChange={e => setGenerateCount(parseInt(e.target.value))}
                  className={`rounded-xl px-3 py-2 border text-sm ${inputBg}`}
                >
                  {[1, 2, 3, 4, 5].map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleGeneratePosts}
                disabled={pipelineStatus === 'running'}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {pipelineStatus === 'running' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                צור פוסטים
              </button>

              {generationLog.length > 0 && (
                <div className={`mt-4 p-4 rounded-xl border font-mono text-xs overflow-y-auto max-h-48 ${isDark ? 'bg-black border-gray-800 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
                  {generationLog.map((line, i) => (
                    <div key={i}>{line}</div>
                  ))}
                </div>
              )}
            </div>

            {/* Duplicate Prevention Info */}
            <div className={`border rounded-2xl p-6 ${cardBg}`}>
              <div className="flex items-center gap-2 mb-4">
                <Tags className="w-5 h-5 text-purple-400" />
                <h3 className={`text-sm font-bold ${textMain}`}>נושאים שנכתבו כבר (מניעת כפילויות)</h3>
              </div>
              <p className="text-xs text-gray-500 mb-3">
                המערכת לא תיצור פוסט על נושאים שכבר קיימים ברשימה זו. ניתן למחוק נושאים מהטאב "נושאים" כדי לאפשר יצירה מחדש.
              </p>
              <div className="flex flex-wrap gap-2">
                {topics.slice(0, 20).map(t => (
                  <span key={t.slug} className={`px-2 py-1 rounded-full text-xs ${isDark ? 'bg-white/10 text-gray-400' : 'bg-gray-100 text-gray-600'}`}>
                    {t.topics.slice(0, 3).join(', ')}
                  </span>
                ))}
                {topics.length > 20 && (
                  <span className="text-xs text-gray-500">+{topics.length - 20} נוספים...</span>
                )}
                {topics.length === 0 && (
                  <span className="text-xs text-gray-500">אין נושאים עדיין — המערכת תיצור מהכל</span>
                )}
              </div>
            </div>

            <h3 className={`text-md font-bold ${textMain}`}>לוגים אחרונים</h3>
            <div className={`border rounded-2xl overflow-hidden ${cardBg}`}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={`border-b ${isDark ? 'border-white/10' : 'border-gray-200'} ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                      <th className="text-right px-4 py-3 font-medium text-gray-500">קובץ</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-500">גודל</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-500">עודכן</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-500">פעולות</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logFiles.map(f => (
                      <tr key={f.name} className={`border-b ${isDark ? 'border-white/5' : 'border-gray-100'} ${hoverBg}`}>
                        <td className="px-4 py-3 font-mono text-xs">{f.name}</td>
                        <td className="px-4 py-3 text-gray-500">{(f.size / 1024).toFixed(1)} KB</td>
                        <td className="px-4 py-3 text-gray-500">{new Date(f.modified).toLocaleString('he-IL')}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => loadLogContent(f.name)}
                            className="text-cyan-400 hover:text-cyan-300 text-sm"
                          >
                            צפה
                          </button>
                        </td>
                      </tr>
                    ))}
                    {logFiles.length === 0 && (
                      <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500">אין לוגים</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {activeLog && logContent.length > 0 && (
              <div className={`mt-4 p-4 rounded-xl border font-mono text-xs overflow-y-auto max-h-96 ${isDark ? 'bg-black border-gray-800 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold">{activeLog}</span>
                  <button onClick={() => setActiveLog(null)} className="text-gray-500 hover:text-red-400"><X className="w-4 h-4" /></button>
                </div>
                {logContent.map((line, i) => (
                  <div key={i} className="whitespace-pre-wrap">{line}</div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Image Generator Tab */}
        {tab === 'images' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className={`text-lg font-bold ${textMain}`}>מחולל תמונות AI</h2>
            </div>

            <div className={`border rounded-2xl p-6 ${cardBg} space-y-4`}>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Prompt (תיאור התמונה)</label>
                <textarea
                  value={imagePrompt}
                  onChange={e => setImagePrompt(e.target.value)}
                  rows={3}
                  placeholder="תאר את התמונה שברצונך ליצור..."
                  className={`w-full rounded-xl px-4 py-3 border focus:outline-none focus:ring-2 focus:ring-purple-500 ${inputBg}`}
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">רוחב</label>
                  <input
                    type="number"
                    value={imageWidth}
                    onChange={e => setImageWidth(parseInt(e.target.value) || 1024)}
                    className={`w-full rounded-xl px-4 py-2 border ${inputBg}`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">גובה</label>
                  <input
                    type="number"
                    value={imageHeight}
                    onChange={e => setImageHeight(parseInt(e.target.value) || 576)}
                    className={`w-full rounded-xl px-4 py-2 border ${inputBg}`}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-500 mb-1">סגנון</label>
                  <select
                    value={imageStyle}
                    onChange={e => setImageStyle(e.target.value)}
                    className={`w-full rounded-xl px-4 py-2 border ${inputBg}`}
                  >
                    {['cinematic', 'modern', 'dark', 'minimal', 'colorful', 'enterprise'].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                onClick={handleGenerateImage}
                disabled={generatingImage || !imagePrompt.trim()}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {generatingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Image className="w-4 h-4" />}
                צור תמונה
              </button>
            </div>

            {generatedImages.length > 0 && (
              <>
                <h3 className={`text-md font-bold ${textMain}`}>תמונות שנוצרו</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {generatedImages.map((img, i) => (
                    <div key={i} className={`border rounded-2xl overflow-hidden ${cardBg}`}>
                      <img src={img.url} alt={img.prompt} className="w-full h-48 object-cover" />
                      <div className="p-3">
                        <p className="text-xs text-gray-500 line-clamp-2">{img.prompt}</p>
                        <p className="text-xs text-gray-400 mt-1">{new Date(img.date).toLocaleString('he-IL')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Comments Tab */}
        {tab === 'comments' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className={`text-lg font-bold ${textMain}`}>תגובות</h2>
              <button
                onClick={loadAllComments}
                className={`p-2 rounded-xl border ${cardBg} ${hoverBg}`}
              >
                <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <div className={`border rounded-2xl overflow-hidden ${cardBg}`}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={`border-b ${isDark ? 'border-white/10' : 'border-gray-200'} ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                      <th className="text-right px-4 py-3 font-medium text-gray-500">פוסט</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-500">מחבר</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-500">תוכן</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-500">תאריך</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-500">פעולות</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allComments.map(c => (
                      <tr key={c.id} className={`border-b ${isDark ? 'border-white/5' : 'border-gray-100'} ${hoverBg}`}>
                        <td className="px-4 py-3 text-xs text-gray-500">{c.slug}</td>
                        <td className="px-4 py-3">{c.name}</td>
                        <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{c.content}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{new Date(c.timestamp).toLocaleString('he-IL')}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleDeleteComment(c.slug, c.id)}
                            className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {allComments.length === 0 && (
                      <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">{loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'אין תגובות'}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Build & Deploy Tab */}
        {tab === 'deploy' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className={`text-lg font-bold ${textMain}`}>בנייה &amp; פריסה</h2>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${pipelineStatus === 'running' ? 'bg-yellow-400 animate-pulse' : 'bg-green-500'}`} />
                <span className="text-sm text-gray-500">{pipelineStatus === 'running' ? 'עובד...' : 'מוכן'}</span>
              </div>
            </div>

            <div className={`border rounded-2xl p-6 ${cardBg} space-y-4`}>
              {lastBuild && (
                <p className="text-sm text-gray-500">
                  בנייה אחרונה: {new Date(lastBuild).toLocaleString('he-IL')}
                </p>
              )}

              <button
                onClick={handleBuild}
                disabled={building || pipelineStatus === 'running'}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {building ? <Loader2 className="w-4 h-4 animate-spin" /> : <Hammer className="w-4 h-4" />}
                בנה אתר מחדש
              </button>

              {buildOutput.length > 0 && (
                <div className={`mt-4 p-4 rounded-xl border font-mono text-xs overflow-y-auto max-h-48 ${isDark ? 'bg-black border-gray-800 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
                  {buildOutput.map((line, i) => (
                    <div key={i}>{line}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {tab === 'settings' && (
          <div className="space-y-6 max-w-3xl">
            <h2 className={`text-lg font-bold ${textMain}`}>הגדרות מערכת</h2>

            {/* Sales Agent Settings */}
            <div className={`border rounded-2xl p-6 ${cardBg}`}>
              <h3 className="text-sm font-bold text-gray-500 mb-4">סוכן מכירות (System Prompt)</h3>
              <textarea
                value={settings.systemPrompt}
                onChange={e => setSettings(s => ({ ...s, systemPrompt: e.target.value }))}
                rows={12}
                className={`w-full rounded-xl px-4 py-3 border focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-xs ${inputBg}`}
              />
              <div className="mt-4 flex justify-end">
                <button
                  onClick={saveSettings}
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  שמור הגדרות
                </button>
              </div>
            </div>

            {/* Pipeline Config (read-only display for now) */}
            <div className={`border rounded-2xl p-6 ${cardBg}`}>
              <h3 className="text-sm font-bold text-gray-500 mb-4">תצורת Pipeline</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">פוסטים ליום:</span>
                  <span className={textMain}>{process.env.POSTS_PER_DAY || '3'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">מודל AI:</span>
                  <span className={textMain}>{process.env.OLLAMA_MODEL || 'kimi-k2.5'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">model תמונות:</span>
                  <span className={textMain}>fal-ai/flux-pro/v1.1</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">API Server:</span>
                  <span className={textMain}>http://localhost:3004</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Static Site:</span>
                  <span className={textMain}>http://localhost:3000</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Post Editor Modal */}
      {(editingPost || isCreating) && (
        <PostEditor
          post={editingPost}
          isDark={isDark}
          cardBg={cardBg}
          inputBg={inputBg}
          textMain={textMain}
          onSave={savePost}
          onCancel={() => { setEditingPost(null); setIsCreating(false) }}
          loading={loading}
        />
      )}
    </main>
  )
}

function PostEditor({
  post,
  isDark,
  cardBg,
  inputBg,
  textMain,
  onSave,
  onCancel,
  loading,
}: {
  post: Post | null
  isDark: boolean
  cardBg: string
  inputBg: string
  textMain: string
  onSave: (post: Post) => void
  onCancel: () => void
  loading: boolean
}) {
  const [form, setForm] = useState<Post>(
    post || {
      slug: '',
      title: '',
      excerpt: '',
      content: '',
      date: new Date().toISOString(),
      readTime: '5 דקות קריאה',
      tags: [],
      category: 'טכנולוגיה',
    }
  )
  const [tagInput, setTagInput] = useState('')

  const update = (field: keyof Post, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const addTag = () => {
    if (tagInput.trim() && !form.tags.includes(tagInput.trim())) {
      update('tags', [...form.tags, tagInput.trim()])
      setTagInput('')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" dir="rtl">
      <div className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto border rounded-2xl shadow-2xl ${cardBg}`}>
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-white/10 bg-inherit rounded-t-2xl">
          <h3 className={`text-lg font-bold ${textMain}`}>
            {post ? 'עריכת פוסט' : 'פוסט חדש'}
          </h3>
          <button onClick={onCancel} className="p-1 rounded-lg hover:bg-white/10 transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">כותרת</label>
            <input
              type="text"
              value={form.title}
              onChange={e => update('title', e.target.value)}
              className={`w-full rounded-xl px-4 py-2 border focus:outline-none focus:ring-2 focus:ring-purple-500 ${inputBg}`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Slug</label>
            <input
              type="text"
              value={form.slug}
              onChange={e => update('slug', e.target.value)}
              className={`w-full rounded-xl px-4 py-2 border focus:outline-none focus:ring-2 focus:ring-purple-500 ${inputBg}`}
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">קטגוריה</label>
            <input
              type="text"
              value={form.category}
              onChange={e => update('category', e.target.value)}
              className={`w-full rounded-xl px-4 py-2 border focus:outline-none focus:ring-2 focus:ring-purple-500 ${inputBg}`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">תקציר</label>
            <textarea
              value={form.excerpt}
              onChange={e => update('excerpt', e.target.value)}
              rows={3}
              className={`w-full rounded-xl px-4 py-2 border focus:outline-none focus:ring-2 focus:ring-purple-500 ${inputBg}`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">תוכן המאמר</label>
            <div className="mt-1">
              <CanvasBlockEditor
                initialHtml={form.content}
                onChange={(html) => update('content', html)}
                isDark={isDark}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">תגיות</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addTag()}
                placeholder="הוסף תגית..."
                className={`flex-1 rounded-xl px-4 py-2 border focus:outline-none focus:ring-2 focus:ring-purple-500 ${inputBg}`}
              />
              <button
                onClick={addTag}
                className="px-4 py-2 rounded-xl bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {form.tags.map(tag => (
                <span key={tag} className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${isDark ? 'bg-white/10 text-gray-400' : 'bg-gray-100 text-gray-600'}`}>
                  {tag}
                  <button onClick={() => update('tags', form.tags.filter(t => t !== tag))} className="hover:text-red-400">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={onCancel}
              className={`px-4 py-2 rounded-xl border ${cardBg} ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'} transition-colors`}
            >
              ביטול
            </button>
            <button
              onClick={() => onSave(form)}
              disabled={loading || !form.title || !form.slug}
              className="flex items-center gap-2 px-6 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              שמור
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
