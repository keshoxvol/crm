import { useEffect, useMemo, useRef, useState } from 'react'

const ALL_PAGES = [
  { key: 'clients', label: 'Клиенты' },
  { key: 'dialogs', label: 'Диалоги' },
  { key: 'reports', label: 'Отчёты' },
  { key: 'documents', label: 'Документы' },
  { key: 'instructions', label: 'Инструкции' },
  { key: 'ai', label: 'ИИ-ассистент' },
  { key: 'users', label: 'Пользователи' },
  { key: 'settings', label: 'Настройки' }
]

const ROLE_PAGES = {
  SUPERADMIN: ALL_PAGES.map((p) => p.key),
  ADMIN: ['clients', 'dialogs', 'reports', 'documents', 'instructions', 'ai', 'users', 'settings'],
  EMPLOYEE: ['clients', 'dialogs', 'documents', 'instructions', 'ai']
}

const AUTH_STORAGE_KEY = 'crm_auth'
const USERS_POLL_INTERVAL_MS = 15000
const CLIENTS_POLL_INTERVAL_MS = 15000
const DIALOGS_POLL_INTERVAL_MS = 30000

const CLIENT_SOURCE_OPTIONS = ['VK', 'WEBSITE', 'AVITO', 'PHONE', 'OTHER']
const CLIENT_STATUS_OPTIONS = ['NEW', 'IN_PROGRESS', 'CONTRACT', 'SOLD', 'REJECTED']
const CLIENT_TEMPERATURE_OPTIONS = ['HOT', 'WARM', 'COLD']
const CLIENT_MODEL_OPTIONS = ['LOS_400', 'LOS_400_GX', 'UNDEFINED']

const ROLE_LABELS = {
  SUPERADMIN: 'Суперадмин',
  ADMIN: 'Администратор',
  EMPLOYEE: 'Сотрудник'
}

const CLIENT_SOURCE_LABELS = {
  VK: 'ВКонтакте',
  WEBSITE: 'Сайт',
  AVITO: 'Авито',
  PHONE: 'Телефон',
  OTHER: 'Другое'
}

const CLIENT_STATUS_LABELS = {
  NEW: 'Новый',
  IN_PROGRESS: 'В работе',
  CONTRACT: 'Договор',
  SOLD: 'Продан',
  REJECTED: 'Отказ'
}

const CLIENT_TEMPERATURE_LABELS = {
  HOT: 'Горячий',
  WARM: 'Тёплый',
  COLD: 'Холодный'
}

const CLIENT_MODEL_LABELS = {
  LOS_400: 'ЛОСЬ 400',
  LOS_400_GX: 'ЛОСЬ 400 GX',
  UNDEFINED: 'Не определён'
}

const EMPTY_CREATE_CLIENT_FORM = {
  fullName: '',
  phone: '',
  vkProfile: '',
  source: 'WEBSITE',
  status: 'NEW',
  modelInterest: 'UNDEFINED',
  temperature: 'COLD',
  comment: '',
  reminderAt: ''
}

const EMPTY_EDIT_CLIENT_FORM = {
  id: '',
  fullName: '',
  phone: '',
  vkProfile: '',
  source: 'WEBSITE',
  status: 'NEW',
  modelInterest: 'UNDEFINED',
  temperature: 'COLD',
  comment: '',
  reminderAt: ''
}

function getStoredAuth() {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function labelOf(value, labels) {
  if (!value) return '-'
  return labels[value] || value
}

function apiStatusLabel(status) {
  if (status === 'ok') return 'доступен'
  if (status === 'error') return 'недоступен'
  return 'проверка'
}

function formatDialogTime(isoStr) {
  if (!isoStr) return ''
  const d = new Date(isoStr)
  const diffDays = Math.floor((Date.now() - d) / 86400000)
  if (diffDays === 0) return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  if (diffDays < 7) return d.toLocaleDateString('ru-RU', { weekday: 'short' })
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
}

function toApiDateTime(localDateTimeValue) {
  if (!localDateTimeValue) return undefined
  return new Date(localDateTimeValue).toISOString()
}

function toInputDateTime(isoValue) {
  if (!isoValue) return ''
  const date = new Date(isoValue)
  const timezoneOffsetMs = date.getTimezoneOffset() * 60 * 1000
  return new Date(date.getTime() - timezoneOffsetMs).toISOString().slice(0, 16)
}

export default function App() {
  const [auth, setAuth] = useState(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [activePage, setActivePage] = useState('clients')
  const [health, setHealth] = useState('loading')
  const [users, setUsers] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [clients, setClients] = useState([])
  const [loadingClients, setLoadingClients] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [createPasswordRepeat, setCreatePasswordRepeat] = useState('')
  const [showCreatePassword, setShowCreatePassword] = useState(false)
  const [showCreatePasswordRepeat, setShowCreatePasswordRepeat] = useState(false)
  const [createError, setCreateError] = useState('')

  const [loginForm, setLoginForm] = useState({ email: '', password: '' })

  const [createForm, setCreateForm] = useState({
    email: '',
    password: '',
    role: 'EMPLOYEE'
  })

  const [editForm, setEditForm] = useState({
    id: '',
    email: '',
    password: '',
    role: 'EMPLOYEE'
  })
  const [editPasswordRepeat, setEditPasswordRepeat] = useState('')
  const [showEditPassword, setShowEditPassword] = useState(false)
  const [showEditPasswordRepeat, setShowEditPasswordRepeat] = useState(false)
  const [editError, setEditError] = useState('')
  const [showCreateClientForm, setShowCreateClientForm] = useState(false)
  const [createClientError, setCreateClientError] = useState('')
  const [editClientError, setEditClientError] = useState('')
  const [vkMessages, setVkMessages] = useState([])
  const [vkSyncing, setVkSyncing] = useState(false)
  const [vkError, setVkError] = useState('')
  const [vkSyncAllRunning, setVkSyncAllRunning] = useState(false)
  const [vkSyncAllResult, setVkSyncAllResult] = useState(null)
  const [vkSyncAllError, setVkSyncAllError] = useState('')

  const [dialogs, setDialogs] = useState([])
  const [loadingDialogs, setLoadingDialogs] = useState(false)
  const [selectedDialog, setSelectedDialog] = useState(null)
  const [dialogMessages, setDialogMessages] = useState([])
  const [loadingDialogMessages, setLoadingDialogMessages] = useState(false)
  const chatMessagesRef = useRef(null)
  const selectedDialogRef = useRef(null)
  const [chatInputText, setChatInputText] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)
  const [sendMessageError, setSendMessageError] = useState('')
  const [aiAnalysis, setAiAnalysis] = useState('')
  const [aiAnalysisLoading, setAiAnalysisLoading] = useState(false)
  const [aiAnalysisExpanded, setAiAnalysisExpanded] = useState(false)
  const [aiChatMessages, setAiChatMessages] = useState([])
  const [aiChatInput, setAiChatInput] = useState('')
  const [aiChatLoading, setAiChatLoading] = useState(false)
  const aiChatEndRef = useRef(null)
  const [prompts, setPrompts] = useState([])
  const [promptsSaving, setPromptsSaving] = useState({})
  const [promptsSaved, setPromptsSaved] = useState({})

  const [clientFilters, setClientFilters] = useState({
    q: '',
    status: '',
    source: '',
    temperature: '',
    modelInterest: ''
  })

  const [createClientForm, setCreateClientForm] = useState({ ...EMPTY_CREATE_CLIENT_FORM })

  const [editClientForm, setEditClientForm] = useState({ ...EMPTY_EDIT_CLIENT_FORM })

  const availablePages = useMemo(() => {
    if (!auth?.role) return []
    const allowed = ROLE_PAGES[auth.role] || []
    return ALL_PAGES.filter((page) => allowed.includes(page.key))
  }, [auth])

  useEffect(() => {
    fetch('/api/public/health')
      .then((res) => res.json())
      .then(() => setHealth('ok'))
      .catch(() => setHealth('error'))

    const stored = getStoredAuth()
    if (!stored?.authHeader) {
      setAuthChecked(true)
      return
    }

    fetch('/api/auth/me', {
      headers: { Authorization: stored.authHeader }
    })
      .then((res) => {
        if (!res.ok) throw new Error('unauthorized')
        return res.json()
      })
      .then((me) => {
        const current = {
          authHeader: stored.authHeader,
          email: me.email,
          role: me.role
        }
        setAuth(current)
      })
      .catch(() => localStorage.removeItem(AUTH_STORAGE_KEY))
      .finally(() => setAuthChecked(true))
  }, [])

  useEffect(() => {
    if (!auth || activePage !== 'users') return

    loadUsers()
    const intervalId = window.setInterval(() => {
      loadUsers(true)
    }, USERS_POLL_INTERVAL_MS)

    return () => window.clearInterval(intervalId)
  }, [activePage, auth])

  useEffect(() => {
    if (!auth || activePage !== 'clients') return

    loadClients()
    const intervalId = window.setInterval(() => {
      loadClients(true)
    }, CLIENTS_POLL_INTERVAL_MS)

    return () => window.clearInterval(intervalId)
  }, [activePage, auth, clientFilters])

  useEffect(() => {
    if (!auth || activePage !== 'dialogs') return
    loadDialogs()
    const intervalId = window.setInterval(() => loadDialogs(true), DIALOGS_POLL_INTERVAL_MS)
    return () => window.clearInterval(intervalId)
  }, [activePage, auth])


  useEffect(() => {
    selectedDialogRef.current = selectedDialog
  }, [selectedDialog])

  useEffect(() => {
    if (!auth || activePage !== 'dialogs') return
    const url = `/api/vk/events?auth=${encodeURIComponent(auth.authHeader)}`
    const es = new EventSource(url)

    es.addEventListener('message_new', (e) => {
      const data = JSON.parse(e.data)
      setDialogMessages((prev) => {
        if (selectedDialogRef.current?.clientId !== data.clientId) return prev
        if (prev.some((m) => m.id === data.message.id)) return prev
        return [...prev, data.message]
      })
      setDialogs((prev) => {
        const exists = prev.some((d) => d.clientId === data.clientId)
        if (!exists) {
          loadDialogs(true)
          return prev
        }
        return prev.map((d) => {
          if (d.clientId !== data.clientId) return d
          const isSelected = selectedDialogRef.current?.clientId === data.clientId
          return {
            ...d,
            lastMessageText: data.message.text,
            lastMessageAt: data.message.sentAt,
            lastMessageDirection: data.message.direction,
            unreadCount: isSelected ? d.unreadCount : d.unreadCount + 1
          }
        })
      })
    })

    es.addEventListener('message_read', (e) => {
      const data = JSON.parse(e.data)
      setSelectedDialog((prev) => {
        if (!prev || prev.clientId !== data.clientId) return prev
        return { ...prev, outReadId: data.outReadId }
      })
      setDialogs((prev) => prev.map((d) =>
        d.clientId === data.clientId ? { ...d, outReadId: data.outReadId } : d
      ))
    })

    return () => es.close()
  }, [activePage, auth])

  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight
    }
  }, [dialogMessages])

  useEffect(() => {
    if (!auth || activePage !== 'settings') return
    authFetch('/api/ai/prompts')
      .then((res) => res.json())
      .then((data) => setPrompts(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [activePage, auth])

  function savePrompt(key, content) {
    setPromptsSaving((p) => ({ ...p, [key]: true }))
    setPromptsSaved((p) => ({ ...p, [key]: false }))
    authFetch(`/api/ai/prompts/${key}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    })
      .then((res) => res.json())
      .then((updated) => {
        setPrompts((prev) => prev.map((p) => p.key === key ? { ...p, content: updated.content } : p))
        setPromptsSaved((p) => ({ ...p, [key]: true }))
        setTimeout(() => setPromptsSaved((p) => ({ ...p, [key]: false })), 2000)
      })
      .catch(() => {})
      .finally(() => setPromptsSaving((p) => ({ ...p, [key]: false })))
  }

  useEffect(() => {
    if (aiChatEndRef.current) {
      aiChatEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [aiChatMessages])

  function sendAiMessage() {
    const text = aiChatInput.trim()
    if (!text || aiChatLoading) return
    const updated = [...aiChatMessages, { role: 'user', content: text }]
    setAiChatMessages(updated)
    setAiChatInput('')
    setAiChatLoading(true)
    authFetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.reply) {
          setAiChatMessages((prev) => [...prev, { role: 'assistant', content: data.reply }])
        }
      })
      .catch(() => {
        setAiChatMessages((prev) => [...prev, { role: 'assistant', content: '⚠️ Ошибка. Попробуй ещё раз.' }])
      })
      .finally(() => setAiChatLoading(false))
  }

  function authFetch(url, options = {}) {
    if (!auth?.authHeader) {
      return Promise.reject(new Error('unauthorized'))
    }
    const headers = {
      ...(options.headers || {}),
      Authorization: auth.authHeader
    }

    return fetch(url, { ...options, headers }).then((res) => {
      if (res.status === 401) {
        doLogout()
        throw new Error('unauthorized')
      }
      return res
    })
  }

  function doLogout() {
    localStorage.removeItem(AUTH_STORAGE_KEY)
    setAuth(null)
    setActivePage('clients')
  }

  function submitLogin(event) {
    event.preventDefault()
    setLoginError('')

    fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loginForm)
    })
      .then((res) => {
        if (!res.ok) throw new Error('invalid_credentials')
        return res.json()
      })
      .then((data) => {
        const current = {
          authHeader: data.authHeader,
          email: data.email,
          role: data.role
        }
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(current))
        setAuth(current)
        setLoginForm({ email: '', password: '' })
      })
      .catch(() => setLoginError('Неверный email или пароль'))
  }

  function loadUsers(silent = false) {
    if (!silent) {
      setLoadingUsers(true)
    }
    authFetch('/api/users')
      .then((res) => res.json())
      .then((data) => setUsers(Array.isArray(data) ? data : []))
      .finally(() => {
        if (!silent) {
          setLoadingUsers(false)
        }
      })
  }

  function buildClientQuery() {
    const params = new URLSearchParams()
    if (clientFilters.q.trim()) params.set('q', clientFilters.q.trim())
    if (clientFilters.status) params.set('status', clientFilters.status)
    if (clientFilters.source) params.set('source', clientFilters.source)
    if (clientFilters.temperature) params.set('temperature', clientFilters.temperature)
    if (clientFilters.modelInterest) params.set('modelInterest', clientFilters.modelInterest)
    const query = params.toString()
    return query ? `?${query}` : ''
  }

  function loadClients(silent = false) {
    if (!silent) {
      setLoadingClients(true)
    }
    authFetch(`/api/clients${buildClientQuery()}`)
      .then((res) => res.json())
      .then((data) => setClients(Array.isArray(data) ? data : []))
      .finally(() => {
        if (!silent) {
          setLoadingClients(false)
        }
      })
  }

  function submitCreate(event) {
    event.preventDefault()
    setCreateError('')
    if (createForm.password.length < 8) {
      setCreateError('Пароль должен быть не короче 8 символов')
      return
    }
    if (createForm.password !== createPasswordRepeat) {
      setCreateError('Пароли не совпадают')
      return
    }

    authFetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createForm)
    })
      .then((res) => {
        if (!res.ok) throw new Error('create_failed')
      })
      .then(() => {
        setCreateForm({ email: '', password: '', role: 'EMPLOYEE' })
        setCreatePasswordRepeat('')
        loadUsers()
      })
      .catch(() => setCreateError('Не удалось создать пользователя'))
  }

  function submitUpdate(event) {
    event.preventDefault()
    if (!editForm.id) return
    setEditError('')

    if (editForm.password) {
      if (editForm.password.length < 8) {
        setEditError('Новый пароль должен быть не короче 8 символов')
        return
      }
      if (editForm.password !== editPasswordRepeat) {
        setEditError('Новые пароли не совпадают')
        return
      }
    }

    const payload = {
      email: editForm.email || undefined,
      password: editForm.password || undefined,
      role: editForm.role || undefined
    }

    authFetch(`/api/users/${editForm.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then((res) => {
        if (!res.ok) throw new Error('update_failed')
      })
      .then(() => {
        setEditForm({ id: '', email: '', password: '', role: 'EMPLOYEE' })
        setEditPasswordRepeat('')
        loadUsers()
      })
      .catch(() => setEditError('Не удалось изменить пользователя'))
  }

  function submitCreateClient(event) {
    event.preventDefault()
    setCreateClientError('')
    if (!createClientForm.phone.trim()) {
      setCreateClientError('Телефон обязателен')
      return
    }
    authFetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...createClientForm,
        reminderAt: toApiDateTime(createClientForm.reminderAt)
      })
    })
      .then((res) => {
        if (!res.ok) throw new Error('create_client_failed')
      })
      .then(() => {
        setCreateClientForm({ ...EMPTY_CREATE_CLIENT_FORM })
        loadClients()
      })
      .catch(() => setCreateClientError('Не удалось создать клиента'))
  }

  function submitUpdateClient(event) {
    event.preventDefault()
    if (!editClientForm.id) return
    setEditClientError('')
    authFetch(`/api/clients/${editClientForm.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: editClientForm.fullName || undefined,
        vkProfile: editClientForm.vkProfile || undefined,
        source: editClientForm.source || undefined,
        status: editClientForm.status || undefined,
        modelInterest: editClientForm.modelInterest || undefined,
        temperature: editClientForm.temperature || undefined,
        comment: editClientForm.comment || undefined,
        reminderAt: toApiDateTime(editClientForm.reminderAt)
      })
    })
      .then((res) => {
        if (!res.ok) throw new Error('update_client_failed')
      })
      .then(() => {
        setEditClientForm({ ...EMPTY_EDIT_CLIENT_FORM })
        loadClients()
      })
      .catch(() => setEditClientError('Не удалось изменить клиента'))
  }

  function selectUserForEdit(user) {
    setShowCreateForm(false)
    setCreateError('')
    setEditForm({
      id: String(user.id),
      email: user.email || '',
      password: '',
      role: user.role || 'EMPLOYEE'
    })
    setEditPasswordRepeat('')
    setEditError('')
  }

  function selectClientForEdit(client) {
    setShowCreateClientForm(false)
    setCreateClientError('')
    setEditClientError('')
    setVkMessages([])
    setVkError('')
    setEditClientForm({
      id: String(client.id),
      fullName: client.fullName || '',
      phone: client.phone || '',
      vkProfile: client.vkProfile || '',
      source: client.source || 'WEBSITE',
      status: client.status || 'NEW',
      modelInterest: client.modelInterest || 'UNDEFINED',
      temperature: client.temperature || 'COLD',
      comment: client.comment || '',
      reminderAt: toInputDateTime(client.reminderAt)
    })
    if (client.vkProfile) {
      loadVkMessages(client.id)
    }
  }

  function syncAllVkConversations() {
    setVkSyncAllRunning(true)
    setVkSyncAllResult(null)
    setVkSyncAllError('')
    authFetch('/api/vk/sync-all', { method: 'POST' })
      .then((res) => {
        if (!res.ok) return res.json().then((e) => { throw new Error(e.message || 'sync_failed') })
        return res.json()
      })
      .then((data) => {
        setVkSyncAllResult(data)
        loadClients()
      })
      .catch((err) => setVkSyncAllError(err.message || 'Не удалось синхронизировать'))
      .finally(() => setVkSyncAllRunning(false))
  }

  function loadDialogs(silent = false) {
    if (!silent) setLoadingDialogs(true)
    authFetch('/api/vk/dialogs')
      .then((res) => res.json())
      .then((data) => setDialogs(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => { if (!silent) setLoadingDialogs(false) })
  }

  function selectDialog(dialog) {
    setSelectedDialog(dialog)
    setChatInputText('')
    setSendMessageError('')
    setAiAnalysis('')
    setAiAnalysisExpanded(false)
    setLoadingDialogMessages(true)
    authFetch(`/api/clients/${dialog.clientId}/vk-messages`)
      .then((res) => res.json())
      .then((data) => setDialogMessages(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoadingDialogMessages(false))
    if (dialog.unreadCount > 0) {
      authFetch(`/api/clients/${dialog.clientId}/vk-messages/mark-read`, { method: 'POST' })
        .then(() => setDialogs((prev) => prev.map((d) => d.clientId === dialog.clientId ? { ...d, unreadCount: 0 } : d)))
        .catch(() => {})
    }
    setAiAnalysisLoading(true)
    authFetch(`/api/clients/${dialog.clientId}/ai-analyze`, { method: 'POST' })
      .then((res) => res.json())
      .then((data) => setAiAnalysis(data.analysis || data.error || ''))
      .catch(() => setAiAnalysis(''))
      .finally(() => setAiAnalysisLoading(false))
  }

  function handleSendMessage() {
    if (!chatInputText.trim() || !selectedDialog || sendingMessage) return
    setSendingMessage(true)
    setSendMessageError('')
    const text = chatInputText.trim()
    authFetch(`/api/clients/${selectedDialog.clientId}/vk-messages/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    })
      .then((res) => {
        if (!res.ok) return res.json().then((e) => { throw new Error(e.message || 'Ошибка отправки') })
        setChatInputText('')
        return authFetch(`/api/clients/${selectedDialog.clientId}/vk-messages`)
      })
      .then((res) => res.json())
      .then((data) => { if (Array.isArray(data)) setDialogMessages(data) })
      .catch((err) => setSendMessageError(err.message || 'Не удалось отправить'))
      .finally(() => setSendingMessage(false))
  }

  function loadVkMessages(clientId) {
    authFetch(`/api/clients/${clientId}/vk-messages`)
      .then((res) => res.json())
      .then((data) => setVkMessages(Array.isArray(data) ? data : []))
      .catch(() => {})
  }

  function syncVkMessages(clientId) {
    setVkSyncing(true)
    setVkError('')
    authFetch(`/api/clients/${clientId}/vk-messages/sync`, { method: 'POST' })
      .then((res) => {
        if (!res.ok) return res.json().then((e) => { throw new Error(e.message || 'sync_failed') })
        return res.json()
      })
      .then((data) => setVkMessages(Array.isArray(data) ? data : []))
      .catch((err) => setVkError(err.message || 'Не удалось синхронизировать'))
      .finally(() => setVkSyncing(false))
  }

  function toggleCreateClientForm() {
    setShowCreateClientForm((current) => {
      const next = !current
      if (next) {
        setEditClientForm({ ...EMPTY_EDIT_CLIENT_FORM })
        setEditClientError('')
      }
      return next
    })
  }

  function toggleCreateForm() {
    setShowCreateForm((current) => {
      const next = !current
      if (next) {
        setEditForm({ id: '', email: '', password: '', role: 'EMPLOYEE' })
        setEditPasswordRepeat('')
        setEditError('')
      } else {
        setCreateError('')
      }
      return next
    })
  }

  function generatePassword() {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%'
    let password = ''
    for (let i = 0; i < 12; i += 1) {
      password += alphabet[Math.floor(Math.random() * alphabet.length)]
    }
    setCreateForm((p) => ({ ...p, password }))
    setCreatePasswordRepeat(password)
    setShowCreatePassword(true)
    setShowCreatePasswordRepeat(true)
  }

  if (!authChecked) {
    return <div className="app-shell"><main className="page"><p>Проверка сессии...</p></main></div>
  }

  if (!auth) {
    return (
      <div className="app-shell auth-layout">
        <main className="page auth-page">
          <div className="eyebrow">ВСЗ.CRM</div>
          <h1>Вход в систему</h1>
          <p>Авторизуйтесь, чтобы получить доступ к CRM.</p>

          <form onSubmit={submitLogin} className="card-form auth-form">
            <input
              placeholder="Эл. почта"
              type="email"
              value={loginForm.email}
              onChange={(e) => setLoginForm((p) => ({ ...p, email: e.target.value }))}
              required
            />
            <input
              placeholder="Пароль"
              type="password"
              value={loginForm.password}
              onChange={(e) => setLoginForm((p) => ({ ...p, password: e.target.value }))}
              required
            />
            <button type="submit">Войти</button>
          </form>
          {loginError ? <p className="error-text">{loginError}</p> : null}
          <p className="hint-text">Тестовый вход: admin@vsz.local / admin123</p>
        </main>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <div className="eyebrow">ВСЗ.CRM</div>
          <h1>ЛОСЬ 400</h1>
        </div>
        <div className="header-right">
          <span className={`status-chip status-${health}`}>API: {apiStatusLabel(health)}</span>
          <span className="role-chip">{auth.email} ({labelOf(auth.role, ROLE_LABELS)})</span>
          <button type="button" className="logout-btn" onClick={doLogout}>Выйти</button>
        </div>
      </header>

      <nav className="main-nav">
        {availablePages.map((page) => (
          <button
            key={page.key}
            type="button"
            className={page.key === activePage ? 'nav-btn active' : 'nav-btn'}
            onClick={() => setActivePage(page.key)}
          >
            {page.label}
          </button>
        ))}
      </nav>

      <main className={activePage === 'dialogs' || activePage === 'ai' ? 'page page-messenger' : 'page'}>
        {activePage === 'dialogs' ? (
          <div className="messenger">
            <div className="messenger-list">
              <div className="messenger-list-header">
                <h3>Диалоги ВКонтакте</h3>
                <span className="hint-text">{dialogs.length} {dialogs.length === 1 ? 'диалог' : 'диалогов'}</span>
              </div>
              <div className="messenger-list-body">
                {loadingDialogs && dialogs.length === 0 ? (
                  <p className="hint-text" style={{ padding: '12px' }}>Загрузка...</p>
                ) : dialogs.length === 0 ? (
                  <p className="hint-text" style={{ padding: '12px' }}>Нет диалогов. Синхронизируйте на странице Клиентов.</p>
                ) : (
                  dialogs.map((d) => (
                    <div
                      key={d.clientId}
                      className={`messenger-item${selectedDialog?.clientId === d.clientId ? ' messenger-item-active' : ''}${d.unreadCount > 0 ? ' messenger-item-unread' : ''}`}
                      onClick={() => selectDialog(d)}
                    >
                      <div className="messenger-item-avatar">
                        {(d.clientName || d.vkProfile || '?')[0].toUpperCase()}
                      </div>
                      <div className="messenger-item-body">
                        <div className="messenger-item-top">
                          <span className="messenger-item-name">{d.clientName || `vk:${d.vkProfile}`}</span>
                          <span className="messenger-item-time">{formatDialogTime(d.lastMessageAt)}</span>
                        </div>
                        <div className="messenger-item-preview">
                          {d.lastMessageDirection === 'OUT' ? '↩ ' : ''}{d.lastMessageText || '(вложение)'}
                          {d.unreadCount > 0 ? <span className="unread-badge">{d.unreadCount}</span> : null}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="messenger-chat">
              {selectedDialog ? (
                <>
                  <div className="messenger-chat-header">
                    <div>
                      <div className="messenger-chat-name">{selectedDialog.clientName || `vk:${selectedDialog.vkProfile}`}</div>
                      <div className="messenger-chat-sub">
                        vk.com/id{selectedDialog.vkProfile} · {selectedDialog.messageCount} сообщений
                      </div>
                    </div>
                  </div>
                  {(aiAnalysisLoading || aiAnalysis) ? (
                    <div className="ai-analysis">
                      {aiAnalysisLoading ? (
                        <span className="ai-analysis-loading">🤖 Анализирую клиента...</span>
                      ) : (
                        <>
                          <div className="ai-analysis-header" onClick={() => setAiAnalysisExpanded((v) => !v)}>
                            <span className="ai-analysis-title">🤖 Анализ клиента</span>
                            <span className="ai-analysis-toggle">{aiAnalysisExpanded ? '▲ Свернуть' : '▼ Развернуть'}</span>
                          </div>
                          {aiAnalysisExpanded
                            ? <div className="ai-analysis-body">{aiAnalysis}</div>
                            : <div className="ai-analysis-preview" onClick={() => setAiAnalysisExpanded(true)}>{aiAnalysis}</div>
                          }
                        </>
                      )}
                    </div>
                  ) : null}
                  <div className="messenger-chat-messages" ref={chatMessagesRef}>
                    {loadingDialogMessages ? (
                      <p className="hint-text">Загрузка...</p>
                    ) : dialogMessages.length === 0 ? (
                      <p className="hint-text">Нет сообщений</p>
                    ) : (
                      dialogMessages.map((msg, i) => {
                        const showDate = i === 0 || new Date(msg.sentAt).toDateString() !== new Date(dialogMessages[i - 1].sentAt).toDateString()
                        return (
                          <div key={msg.id}>
                            {showDate ? (
                              <div className="chat-date-sep">
                                {new Date(msg.sentAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                              </div>
                            ) : null}
                            <div className={`chat-msg chat-msg-${msg.direction === 'OUT' ? 'out' : 'in'}`}>
                              <div className="chat-msg-bubble">
                                <span className="chat-msg-text">{msg.text || '(вложение без текста)'}</span>
                                <span className="chat-msg-time">
                                  {new Date(msg.sentAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                                  {msg.direction === 'OUT' ? (
                                    <span className={`msg-check${msg.vkMsgId <= (selectedDialog?.outReadId || 0) ? ' msg-check-read' : ''}`}>
                                      {msg.vkMsgId <= (selectedDialog?.outReadId || 0) ? ' ✓✓' : ' ✓'}
                                    </span>
                                  ) : null}
                                </span>
                              </div>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                  <div className="chat-input-area">
                    <input
                      type="text"
                      placeholder="Написать сообщение..."
                      value={chatInputText}
                      onChange={(e) => setChatInputText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage() } }}
                      disabled={sendingMessage}
                    />
                    <button
                      type="button"
                      onClick={handleSendMessage}
                      disabled={!chatInputText.trim() || sendingMessage}
                    >
                      {sendingMessage ? '...' : 'Отправить'}
                    </button>
                  </div>
                  {sendMessageError ? <p className="error-text" style={{ padding: '4px 20px 8px', margin: 0 }}>{sendMessageError}</p> : null}
                </>
              ) : (
                <div className="messenger-chat-empty">
                  <p>Выберите диалог</p>
                </div>
              )}
            </div>
          </div>
        ) : activePage === 'clients' ? (
          <section>
            <h2>Клиенты</h2>
            <p>Таблица клиентов с фильтрами, созданием и редактированием по клику на строку.</p>

            <div className="vk-sync-all-bar">
              <button
                type="button"
                disabled={vkSyncAllRunning}
                className={vkSyncAllRunning ? 'ghost-btn' : ''}
                onClick={syncAllVkConversations}
              >
                {vkSyncAllRunning ? 'Синхронизация ВК...' : 'Синхронизировать диалоги ВКонтакте'}
              </button>
              {vkSyncAllResult ? (
                <span className="vk-sync-all-result">
                  Диалогов: {vkSyncAllResult.totalConversations} · Новых клиентов: {vkSyncAllResult.newClientsCreated} · Совпало: {vkSyncAllResult.existingClientsMatched} · Новых сообщений: {vkSyncAllResult.totalMessagesSynced}
                </span>
              ) : null}
              {vkSyncAllError ? <span className="error-text">{vkSyncAllError}</span> : null}
            </div>

            <div className="table-wrap">
              <div className="table-head">
                <h3>База клиентов</h3>
                <div className="table-actions">
                  <button type="button" onClick={toggleCreateClientForm}>
                    {showCreateClientForm ? 'Скрыть создание' : 'Создать клиента'}
                  </button>
                </div>
              </div>

              <div className="filters-grid">
                <input
                  placeholder="Поиск: имя, телефон, VK"
                  value={clientFilters.q}
                  onChange={(e) => setClientFilters((p) => ({ ...p, q: e.target.value }))}
                />
                <select
                  value={clientFilters.status}
                  onChange={(e) => setClientFilters((p) => ({ ...p, status: e.target.value }))}
                >
                  <option value="">Все статусы</option>
                  {CLIENT_STATUS_OPTIONS.map((value) => <option key={value} value={value}>{labelOf(value, CLIENT_STATUS_LABELS)}</option>)}
                </select>
                <select
                  value={clientFilters.source}
                  onChange={(e) => setClientFilters((p) => ({ ...p, source: e.target.value }))}
                >
                  <option value="">Все источники</option>
                  {CLIENT_SOURCE_OPTIONS.map((value) => <option key={value} value={value}>{labelOf(value, CLIENT_SOURCE_LABELS)}</option>)}
                </select>
                <select
                  value={clientFilters.temperature}
                  onChange={(e) => setClientFilters((p) => ({ ...p, temperature: e.target.value }))}
                >
                  <option value="">Все температуры</option>
                  {CLIENT_TEMPERATURE_OPTIONS.map((value) => <option key={value} value={value}>{labelOf(value, CLIENT_TEMPERATURE_LABELS)}</option>)}
                </select>
                <select
                  value={clientFilters.modelInterest}
                  onChange={(e) => setClientFilters((p) => ({ ...p, modelInterest: e.target.value }))}
                >
                  <option value="">Все модели</option>
                  {CLIENT_MODEL_OPTIONS.map((value) => <option key={value} value={value}>{labelOf(value, CLIENT_MODEL_LABELS)}</option>)}
                </select>
              </div>

              {showCreateClientForm ? (
                <form onSubmit={submitCreateClient} className="card-form inline-form">
                  <h3>Создать клиента</h3>
                  <div className="form-grid">
                    <label className="field">
                      <span className="field-label">ФИО</span>
                      <input value={createClientForm.fullName} onChange={(e) => setCreateClientForm((p) => ({ ...p, fullName: e.target.value }))} />
                    </label>
                    <label className="field">
                      <span className="field-label">Телефон</span>
                      <input value={createClientForm.phone} onChange={(e) => setCreateClientForm((p) => ({ ...p, phone: e.target.value }))} required />
                    </label>
                    <label className="field">
                      <span className="field-label">VK профиль/ID</span>
                      <input value={createClientForm.vkProfile} onChange={(e) => setCreateClientForm((p) => ({ ...p, vkProfile: e.target.value }))} />
                    </label>
                    <label className="field">
                      <span className="field-label">Напоминание</span>
                      <input type="datetime-local" value={createClientForm.reminderAt} onChange={(e) => setCreateClientForm((p) => ({ ...p, reminderAt: e.target.value }))} />
                    </label>
                    <label className="field">
                      <span className="field-label">Источник</span>
                      <select value={createClientForm.source} onChange={(e) => setCreateClientForm((p) => ({ ...p, source: e.target.value }))}>
                        {CLIENT_SOURCE_OPTIONS.map((value) => <option key={value} value={value}>{labelOf(value, CLIENT_SOURCE_LABELS)}</option>)}
                      </select>
                    </label>
                    <label className="field">
                      <span className="field-label">Статус</span>
                      <select value={createClientForm.status} onChange={(e) => setCreateClientForm((p) => ({ ...p, status: e.target.value }))}>
                        {CLIENT_STATUS_OPTIONS.map((value) => <option key={value} value={value}>{labelOf(value, CLIENT_STATUS_LABELS)}</option>)}
                      </select>
                    </label>
                    <label className="field">
                      <span className="field-label">Модель</span>
                      <select value={createClientForm.modelInterest} onChange={(e) => setCreateClientForm((p) => ({ ...p, modelInterest: e.target.value }))}>
                        {CLIENT_MODEL_OPTIONS.map((value) => <option key={value} value={value}>{labelOf(value, CLIENT_MODEL_LABELS)}</option>)}
                      </select>
                    </label>
                    <label className="field">
                      <span className="field-label">Температура</span>
                      <select value={createClientForm.temperature} onChange={(e) => setCreateClientForm((p) => ({ ...p, temperature: e.target.value }))}>
                        {CLIENT_TEMPERATURE_OPTIONS.map((value) => <option key={value} value={value}>{labelOf(value, CLIENT_TEMPERATURE_LABELS)}</option>)}
                      </select>
                    </label>
                    <label className="field field-wide">
                      <span className="field-label">Комментарий</span>
                      <textarea
                        rows={4}
                        placeholder="Удобно писать заметки: детали заявки, договорённости, следующий шаг."
                        value={createClientForm.comment}
                        onChange={(e) => setCreateClientForm((p) => ({ ...p, comment: e.target.value }))}
                      />
                    </label>
                  </div>
                  <button type="submit">Создать</button>
                  {createClientError ? <p className="error-text">{createClientError}</p> : null}
                </form>
              ) : null}

              {editClientForm.id ? (
                <>
                <form onSubmit={submitUpdateClient} className="card-form inline-form">
                  <div className="inline-form-head">
                    <h3>Изменить клиента</h3>
                    <button
                      type="button"
                      className="ghost-btn"
                      onClick={() => { setEditClientForm({ ...EMPTY_EDIT_CLIENT_FORM }); setVkMessages([]); setVkError('') }}
                    >
                      Закрыть
                    </button>
                  </div>
                  <div className="form-grid">
                    <label className="field">
                      <span className="field-label">ID клиента</span>
                      <input value={editClientForm.id} readOnly />
                    </label>
                    <label className="field">
                      <span className="field-label">Телефон (неизменяемый)</span>
                      <input value={editClientForm.phone} readOnly />
                    </label>
                    <label className="field">
                      <span className="field-label">ФИО</span>
                      <input value={editClientForm.fullName} onChange={(e) => setEditClientForm((p) => ({ ...p, fullName: e.target.value }))} />
                    </label>
                    <label className="field">
                      <span className="field-label">VK профиль/ID</span>
                      <input value={editClientForm.vkProfile} onChange={(e) => setEditClientForm((p) => ({ ...p, vkProfile: e.target.value }))} />
                    </label>
                    <label className="field">
                      <span className="field-label">Напоминание</span>
                      <input type="datetime-local" value={editClientForm.reminderAt} onChange={(e) => setEditClientForm((p) => ({ ...p, reminderAt: e.target.value }))} />
                    </label>
                    <label className="field">
                      <span className="field-label">Источник</span>
                      <select value={editClientForm.source} onChange={(e) => setEditClientForm((p) => ({ ...p, source: e.target.value }))}>
                        {CLIENT_SOURCE_OPTIONS.map((value) => <option key={value} value={value}>{labelOf(value, CLIENT_SOURCE_LABELS)}</option>)}
                      </select>
                    </label>
                    <label className="field">
                      <span className="field-label">Статус</span>
                      <select value={editClientForm.status} onChange={(e) => setEditClientForm((p) => ({ ...p, status: e.target.value }))}>
                        {CLIENT_STATUS_OPTIONS.map((value) => <option key={value} value={value}>{labelOf(value, CLIENT_STATUS_LABELS)}</option>)}
                      </select>
                    </label>
                    <label className="field">
                      <span className="field-label">Модель</span>
                      <select value={editClientForm.modelInterest} onChange={(e) => setEditClientForm((p) => ({ ...p, modelInterest: e.target.value }))}>
                        {CLIENT_MODEL_OPTIONS.map((value) => <option key={value} value={value}>{labelOf(value, CLIENT_MODEL_LABELS)}</option>)}
                      </select>
                    </label>
                    <label className="field">
                      <span className="field-label">Температура</span>
                      <select value={editClientForm.temperature} onChange={(e) => setEditClientForm((p) => ({ ...p, temperature: e.target.value }))}>
                        {CLIENT_TEMPERATURE_OPTIONS.map((value) => <option key={value} value={value}>{labelOf(value, CLIENT_TEMPERATURE_LABELS)}</option>)}
                      </select>
                    </label>
                    <label className="field field-wide">
                      <span className="field-label">Комментарий</span>
                      <textarea
                        rows={4}
                        placeholder="Зафиксируйте историю общения, важные детали и договорённости."
                        value={editClientForm.comment}
                        onChange={(e) => setEditClientForm((p) => ({ ...p, comment: e.target.value }))}
                      />
                    </label>
                  </div>
                  <button type="submit">Сохранить</button>
                  {editClientError ? <p className="error-text">{editClientError}</p> : null}
                </form>

                {editClientForm.vkProfile ? (
                  <div className="card-form inline-form vk-dialog-wrap">
                    <div className="inline-form-head">
                      <h3>VK Диалог</h3>
                      <button
                        type="button"
                        className={vkSyncing ? 'ghost-btn' : ''}
                        disabled={vkSyncing}
                        onClick={() => syncVkMessages(editClientForm.id)}
                      >
                        {vkSyncing ? 'Синхронизация...' : 'Синхронизировать'}
                      </button>
                    </div>
                    {vkError ? <p className="error-text">{vkError}</p> : null}
                    <div className="vk-dialog">
                      {vkMessages.length === 0 && !vkSyncing ? (
                        <p className="hint-text">Нажмите «Синхронизировать» для загрузки переписки из ВКонтакте.</p>
                      ) : (
                        vkMessages.map((msg) => (
                          <div key={msg.id} className={`vk-msg vk-msg-${msg.direction === 'OUT' ? 'out' : 'in'}`}>
                            <div className="vk-msg-bubble">
                              <span className="vk-msg-text">{msg.text || '(вложение без текста)'}</span>
                              <span className="vk-msg-time">{new Date(msg.sentAt).toLocaleString('ru-RU')}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ) : null}
                </>
              ) : null}

              {loadingClients ? (
                <p>Загрузка...</p>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>ФИО</th>
                      <th>Телефон</th>
                      <th>Источник</th>
                      <th>Статус</th>
                      <th>Температура</th>
                      <th>Модель</th>
                      <th>Напоминание</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clients.map((client) => (
                      <tr
                        key={client.id}
                        className="table-row-clickable"
                        onClick={() => selectClientForEdit(client)}
                      >
                        <td>{client.id}</td>
                        <td>{client.fullName || '-'}</td>
                        <td>{client.phone}</td>
                        <td>{labelOf(client.source, CLIENT_SOURCE_LABELS)}</td>
                        <td>{labelOf(client.status, CLIENT_STATUS_LABELS)}</td>
                        <td>{labelOf(client.temperature, CLIENT_TEMPERATURE_LABELS)}</td>
                        <td>{labelOf(client.modelInterest, CLIENT_MODEL_LABELS)}</td>
                        <td>{client.reminderAt ? new Date(client.reminderAt).toLocaleString('ru-RU') : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        ) : activePage === 'users' && (auth.role === 'SUPERADMIN' || auth.role === 'ADMIN') ? (
          <section>
            <h2>Пользователи</h2>
            <p>Основное пространство отдано таблице. Формы открываются по кнопкам.</p>

            <div className="table-wrap">
              <div className="table-head">
                <h3>Таблица пользователей</h3>
                <div className="table-actions">
                  <button type="button" onClick={toggleCreateForm}>
                    {showCreateForm ? 'Скрыть создание' : 'Создать пользователя'}
                  </button>
                </div>
              </div>
              {showCreateForm ? (
                <form onSubmit={submitCreate} className="card-form inline-form">
                  <h3>Создать пользователя</h3>
                  <div className="form-grid">
                    <label className="field">
                      <span className="field-label">Эл. почта</span>
                      <input
                        value={createForm.email}
                        onChange={(e) => setCreateForm((p) => ({ ...p, email: e.target.value }))}
                        required
                      />
                    </label>
                    <label className="field">
                      <span className="field-label">Роль</span>
                      <select
                        value={createForm.role}
                        onChange={(e) => setCreateForm((p) => ({ ...p, role: e.target.value }))}
                      >
                        <option value="SUPERADMIN">{labelOf('SUPERADMIN', ROLE_LABELS)}</option>
                        <option value="ADMIN">{labelOf('ADMIN', ROLE_LABELS)}</option>
                        <option value="EMPLOYEE">{labelOf('EMPLOYEE', ROLE_LABELS)}</option>
                      </select>
                    </label>
                  </div>
                  <p className="form-section-title">Пароль</p>
                  <div className="password-row">
                    <input
                      placeholder="Пароль (минимум 8 символов)"
                      type={showCreatePassword ? 'text' : 'password'}
                      value={createForm.password}
                      onChange={(e) => setCreateForm((p) => ({ ...p, password: e.target.value }))}
                      required
                    />
                    <button type="button" className="ghost-btn" onClick={() => setShowCreatePassword((v) => !v)}>
                      {showCreatePassword ? 'Скрыть' : 'Показать'}
                    </button>
                  </div>
                  <div className="password-row">
                    <input
                      placeholder="Повторите пароль"
                      type={showCreatePasswordRepeat ? 'text' : 'password'}
                      value={createPasswordRepeat}
                      onChange={(e) => setCreatePasswordRepeat(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className="ghost-btn"
                      onClick={() => setShowCreatePasswordRepeat((v) => !v)}
                    >
                      {showCreatePasswordRepeat ? 'Скрыть' : 'Показать'}
                    </button>
                  </div>
                  <button type="button" className="ghost-btn" onClick={generatePassword}>
                    Сгенерировать пароль
                  </button>
                  <button type="submit">Создать</button>
                  {createError ? <p className="error-text">{createError}</p> : null}
                </form>
              ) : null}
              {editForm.id ? (
                <form onSubmit={submitUpdate} className="card-form inline-form">
                  <div className="inline-form-head">
                    <h3>Изменить пользователя</h3>
                    <button
                      type="button"
                      className="ghost-btn"
                      onClick={() => {
                        setEditForm({ id: '', email: '', password: '', role: 'EMPLOYEE' })
                        setEditPasswordRepeat('')
                        setEditError('')
                      }}
                    >
                      Закрыть
                    </button>
                  </div>
                  <input
                    placeholder="ID пользователя"
                    value={editForm.id}
                    readOnly
                  />
                  <div className="form-grid">
                    <label className="field">
                      <span className="field-label">Новый email</span>
                      <input
                        value={editForm.email}
                        onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
                      />
                    </label>
                    <label className="field">
                      <span className="field-label">Роль</span>
                      <select
                        value={editForm.role}
                        onChange={(e) => setEditForm((p) => ({ ...p, role: e.target.value }))}
                      >
                        <option value="SUPERADMIN">{labelOf('SUPERADMIN', ROLE_LABELS)}</option>
                        <option value="ADMIN">{labelOf('ADMIN', ROLE_LABELS)}</option>
                        <option value="EMPLOYEE">{labelOf('EMPLOYEE', ROLE_LABELS)}</option>
                      </select>
                    </label>
                  </div>
                  <p className="form-section-title">Смена пароля (опционально)</p>
                  <div className="password-row">
                    <input
                      placeholder="Новый пароль (опционально)"
                      type={showEditPassword ? 'text' : 'password'}
                      value={editForm.password}
                      onChange={(e) => setEditForm((p) => ({ ...p, password: e.target.value }))}
                    />
                    <button type="button" className="ghost-btn" onClick={() => setShowEditPassword((v) => !v)}>
                      {showEditPassword ? 'Скрыть' : 'Показать'}
                    </button>
                  </div>
                  <div className="password-row">
                    <input
                      placeholder="Повтор нового пароля"
                      type={showEditPasswordRepeat ? 'text' : 'password'}
                      value={editPasswordRepeat}
                      onChange={(e) => setEditPasswordRepeat(e.target.value)}
                      disabled={!editForm.password}
                    />
                    <button
                      type="button"
                      className="ghost-btn"
                      onClick={() => setShowEditPasswordRepeat((v) => !v)}
                      disabled={!editForm.password}
                    >
                      {showEditPasswordRepeat ? 'Скрыть' : 'Показать'}
                    </button>
                  </div>
                  <button type="submit">Сохранить</button>
                  {editError ? <p className="error-text">{editError}</p> : null}
                </form>
              ) : null}
              {loadingUsers ? (
                <p>Загрузка...</p>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Email</th>
                      <th>Роль</th>
                      <th>Создан</th>
                      <th>Изменён</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr
                        key={user.id}
                        className="table-row-clickable"
                        onClick={() => selectUserForEdit(user)}
                      >
                        <td>{user.id}</td>
                        <td>{user.email}</td>
                        <td>{labelOf(user.role, ROLE_LABELS)}</td>
                        <td>{user.createdAt}</td>
                        <td>{user.updatedAt}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        ) : activePage === 'ai' ? (
          <div className="ai-assistant">
            <div className="ai-assistant-messages">
              {aiChatMessages.length === 0 ? (
                <div className="ai-assistant-empty">
                  <p>Привет! Я помощник менеджера по продажам.</p>
                  <p>Могу помочь составить ответ клиенту, написать КП или проконсультировать по продукту.</p>
                </div>
              ) : (
                aiChatMessages.map((msg, i) => (
                  <div key={i} className={`ai-msg ai-msg-${msg.role}`}>
                    <div className="ai-msg-bubble">{msg.content}</div>
                  </div>
                ))
              )}
              {aiChatLoading ? (
                <div className="ai-msg ai-msg-assistant">
                  <div className="ai-msg-bubble ai-msg-typing">●●●</div>
                </div>
              ) : null}
              <div ref={aiChatEndRef} />
            </div>
            <div className="ai-assistant-input">
              <textarea
                placeholder="Напиши вопрос или задачу..."
                value={aiChatInput}
                rows={2}
                onChange={(e) => setAiChatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAiMessage() } }}
                disabled={aiChatLoading}
              />
              <div className="ai-assistant-actions">
                <button type="button" onClick={sendAiMessage} disabled={!aiChatInput.trim() || aiChatLoading}>
                  {aiChatLoading ? 'Думаю...' : 'Отправить'}
                </button>
                {aiChatMessages.length > 0 ? (
                  <button type="button" className="ghost-btn" onClick={() => setAiChatMessages([])}>
                    Очистить
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        ) : activePage === 'settings' ? (
          <section>
            <h2>Настройки</h2>
            <h3 style={{ marginTop: '24px', marginBottom: '4px' }}>Промпты ИИ-ассистента</h3>
            <p>Изменения вступают в силу немедленно — перезапуск не нужен.</p>
            {prompts.length === 0 ? (
              <p className="hint-text">Загрузка...</p>
            ) : (
              <div className="prompts-list">
                {prompts.map((p) => {
                  const label = p.key === 'analyze_system' ? 'Системный промпт (роль ИИ)'
                    : p.key === 'analyze_user' ? 'Пользовательский промпт (задание)'
                    : p.key
                  const hint = p.key === 'analyze_user'
                    ? 'Используй {history} — сюда подставится переписка с клиентом.'
                    : null
                  return (
                    <div key={p.key} className="prompt-card card-form">
                      <label className="prompt-label">{label}</label>
                      {hint ? <p className="hint-text" style={{ margin: '4px 0 8px' }}>{hint}</p> : null}
                      <textarea
                        className="prompt-textarea"
                        defaultValue={p.content}
                        rows={6}
                        id={`prompt-${p.key}`}
                      />
                      <div className="prompt-actions">
                        <button
                          type="button"
                          disabled={promptsSaving[p.key]}
                          onClick={() => {
                            const el = document.getElementById(`prompt-${p.key}`)
                            savePrompt(p.key, el.value)
                          }}
                        >
                          {promptsSaving[p.key] ? 'Сохранение...' : 'Сохранить'}
                        </button>
                        {promptsSaved[p.key] ? <span className="save-ok">✓ Сохранено</span> : null}
                        <span className="hint-text">Обновлён: {new Date(p.updatedAt).toLocaleString('ru-RU')}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        ) : (
          <section>
            <h2>{availablePages.find((p) => p.key === activePage)?.label}</h2>
            <p>Страница доступна авторизованным пользователям с соответствующей ролью.</p>
          </section>
        )}
      </main>
    </div>
  )
}
