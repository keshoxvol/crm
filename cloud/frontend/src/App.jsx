import { useEffect, useMemo, useRef, useState } from 'react'

const ALL_PAGES = [
  { key: 'clients', label: 'Клиенты' },
  { key: 'orders', label: 'Заявки' },
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
  ADMIN: ['clients', 'orders', 'dialogs', 'reports', 'documents', 'instructions', 'ai', 'users', 'settings'],
  EMPLOYEE: ['clients', 'orders', 'dialogs', 'documents', 'instructions', 'ai'],
  OPERATOR: ['instructions']
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
  EMPLOYEE: 'Сотрудник',
  OPERATOR: 'Оператор'
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

const ORDER_STATUS_OPTIONS = ['NEW', 'QUALIFICATION', 'ENGAGEMENT', 'PROPOSAL', 'DEPOSIT', 'PRODUCTION', 'DELIVERED', 'CANCELLED']
const ORDER_STATUS_FUNNEL = ['NEW', 'QUALIFICATION', 'ENGAGEMENT', 'PROPOSAL', 'DEPOSIT', 'PRODUCTION', 'DELIVERED']
const ORDER_SOURCE_OPTIONS = ['WEBSITE', 'VK', 'AVITO', 'PHONE', 'MANUAL']
const ORDER_MODEL_OPTIONS = ['LOS_400', 'LOS_400_GX', 'UNDEFINED']

const ORDER_STATUS_LABELS = {
  NEW: 'Новая',
  QUALIFICATION: 'Квалификация',
  ENGAGEMENT: 'Вовлечение',
  PROPOSAL: 'Предложение',
  DEPOSIT: 'Бронь',
  PRODUCTION: 'Производство',
  DELIVERED: 'Передана',
  CANCELLED: 'Отменена'
}

const ORDER_SOURCE_LABELS = {
  WEBSITE: 'Сайт',
  VK: 'ВКонтакте',
  AVITO: 'Авито',
  PHONE: 'Телефон',
  MANUAL: 'Вручную'
}

const ORDER_MODEL_LABELS = {
  LOS_400: 'ЛОСЬ 400',
  LOS_400_GX: 'ЛОСЬ 400 GX',
  UNDEFINED: 'Не определена'
}

const EMPTY_CREATE_ORDER_FORM = {
  clientId: '',
  contactName: '',
  contactPhone: '',
  model: 'UNDEFINED',
  status: 'NEW',
  source: 'MANUAL',
  desiredColor: '',
  depositAmount: '',
  notes: ''
}

const EMPTY_EDIT_ORDER_FORM = {
  id: '',
  clientId: '',
  contactName: '',
  contactPhone: '',
  model: 'UNDEFINED',
  status: 'NEW',
  source: 'MANUAL',
  desiredColor: '',
  depositAmount: '',
  notes: ''
}

const EMPTY_CREATE_CLIENT_FORM = {
  fullName: '',
  phone: '',
  vkProfile: '',
  source: 'WEBSITE',
  temperature: 'COLD',
  comment: ''
}

const EMPTY_EDIT_CLIENT_FORM = {
  id: '',
  fullName: '',
  phone: '',
  vkProfile: '',
  vkId: '',
  source: 'WEBSITE',
  temperature: 'COLD',
  comment: ''
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

function parseHash() {
  const h = window.location.hash.replace(/^#\/?/, '')
  const [page, id] = h.split('/')
  const validPages = ALL_PAGES.map((p) => p.key)
  const resolvedPage = validPages.includes(page) ? page : 'clients'
  return { page: resolvedPage, id: id ? Number(id) : null }
}

function pushRoute(page, id) {
  const hash = id ? `#/${page}/${id}` : `#/${page}`
  window.history.pushState(null, '', hash)
}

export default function App() {
  const [auth, setAuth] = useState(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [activePage, setActivePage] = useState(() => parseHash().page)
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

  const [documents, setDocuments] = useState([])
  const [loadingDocuments, setLoadingDocuments] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState(null)
  const [documentEditMode, setDocumentEditMode] = useState(false)
  const [documentMetaForm, setDocumentMetaForm] = useState({ title: '', description: '' })
  const [documentFormError, setDocumentFormError] = useState('')
  const [documentUploadForm, setDocumentUploadForm] = useState({ title: '', description: '' })
  const [documentUploadFile, setDocumentUploadFile] = useState(null)
  const [documentUploadError, setDocumentUploadError] = useState('')
  const [documentUploading, setDocumentUploading] = useState(false)
  const [documentReplaceFile, setDocumentReplaceFile] = useState(null)
  const [documentHistoryOpen, setDocumentHistoryOpen] = useState(false)
  const [showDocumentUploadForm, setShowDocumentUploadForm] = useState(false)

  const [instructions, setInstructions] = useState([])
  const [loadingInstructions, setLoadingInstructions] = useState(false)
  const [selectedInstruction, setSelectedInstruction] = useState(null)
  const [instructionEditMode, setInstructionEditMode] = useState(false)
  const [instructionForm, setInstructionForm] = useState({ number: '', title: '', steps: [] })
  const [instructionFormError, setInstructionFormError] = useState('')
  const [replacingFile, setReplacingFile] = useState(null) // { fileId, file, fileName }
  const [fileUploadError, setFileUploadError] = useState('')
  const [photoUrls, setPhotoUrls] = useState({}) // { [fileId]: presignedUrl }
  const [lightboxUrl, setLightboxUrl] = useState(null)
  const [focusedStepId, setFocusedStepId] = useState(null)

  const [clientFilters, setClientFilters] = useState({
    q: '',
    status: '',
    source: '',
    temperature: ''
  })

  const [orders, setOrders] = useState([])
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [orderFilters, setOrderFilters] = useState({ status: '', source: '', model: '' })
  const [showCreateOrderForm, setShowCreateOrderForm] = useState(false)
  const [createOrderForm, setCreateOrderForm] = useState({ ...EMPTY_CREATE_ORDER_FORM })
  const [createOrderError, setCreateOrderError] = useState('')
  const [editOrderForm, setEditOrderForm] = useState({ ...EMPTY_EDIT_ORDER_FORM })
  const [editOrderError, setEditOrderError] = useState('')
  const [orderClientSearch, setOrderClientSearch] = useState('')
  const [orderClientResults, setOrderClientResults] = useState([])
  const [clientOrders, setClientOrders] = useState([])
  const [loadingClientOrders, setLoadingClientOrders] = useState(false)

  const [createClientForm, setCreateClientForm] = useState({ ...EMPTY_CREATE_CLIENT_FORM })

  const [editClientForm, setEditClientForm] = useState({ ...EMPTY_EDIT_CLIENT_FORM })

  const availablePages = useMemo(() => {
    if (!auth?.role) return []
    const allowed = ROLE_PAGES[auth.role] || []
    return ALL_PAGES.filter((page) => allowed.includes(page.key))
  }, [auth])

  function navigate(page, id = null) {
    if (page !== activePage) {
      setSelectedInstruction(null)
      setSelectedDocument(null)
      setSelectedDialog(null)
      setInstructionEditMode(false)
      setDocumentEditMode(false)
    }
    setActivePage(page)
    pushRoute(page, id)
  }

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

  // On first load after auth resolves — open detail view if id is in URL
  useEffect(() => {
    if (!auth) return
    const { page, id } = parseHash()
    if (!window.location.hash) {
      window.history.replaceState(null, '', `#/${page}`)
    }
    if (id) {
      if (page === 'instructions') openInstruction(id)
      if (page === 'documents') openDocument(id)
    }
  }, [auth]) // eslint-disable-line react-hooks/exhaustive-deps

  // Browser back / forward
  useEffect(() => {
    function onPopState() {
      const { page, id } = parseHash()
      setActivePage(page)
      if (!id) {
        setSelectedInstruction(null)
        setSelectedDocument(null)
        setSelectedDialog(null)
        setInstructionEditMode(false)
        setDocumentEditMode(false)
      } else {
        if (page === 'instructions') openInstruction(id)
        if (page === 'documents') openDocument(id)
      }
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [auth]) // eslint-disable-line react-hooks/exhaustive-deps

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
    if (!auth || activePage !== 'orders') return
    loadOrders()
    const intervalId = window.setInterval(() => loadOrders(true), CLIENTS_POLL_INTERVAL_MS)
    return () => window.clearInterval(intervalId)
  }, [activePage, auth, orderFilters])

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

  useEffect(() => {
    if (!auth || activePage !== 'instructions') return
    loadInstructions()
  }, [activePage, auth])

  useEffect(() => {
    if (!auth || activePage !== 'documents') return
    loadDocuments()
  }, [activePage, auth])

  useEffect(() => {
    if (!lightboxUrl) return
    const handler = (e) => { if (e.key === 'Escape') setLightboxUrl(null) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [lightboxUrl])

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
    navigate('clients')
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
        temperature: editClientForm.temperature || undefined,
        comment: editClientForm.comment || undefined
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
    setClientOrders([])
    loadClientOrders(client.id)
    setEditClientForm({
      id: String(client.id),
      fullName: client.fullName || '',
      phone: client.phone || '',
      vkProfile: client.vkProfile || '',
      vkId: client.vkId ? String(client.vkId) : '',
      source: client.source || 'WEBSITE',
      temperature: client.temperature || 'COLD',
      comment: client.comment || ''
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
    pushRoute('dialogs', dialog.clientId)
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

  function loadClientOrders(clientId) {
    setLoadingClientOrders(true)
    authFetch(`/api/orders?clientId=${clientId}`)
      .then((res) => res.json())
      .then((data) => setClientOrders(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoadingClientOrders(false))
  }

  function searchClientsForOrder(q) {
    setOrderClientSearch(q)
    if (!q.trim()) { setOrderClientResults([]); return }
    authFetch(`/api/clients?q=${encodeURIComponent(q.trim())}`)
      .then((res) => res.json())
      .then((data) => setOrderClientResults(Array.isArray(data) ? data.slice(0, 6) : []))
      .catch(() => {})
  }

  function pickClientForOrder(client, formSetter) {
    formSetter((p) => ({
      ...p,
      clientId: String(client.id),
      contactName: p.contactName || client.fullName || '',
      contactPhone: p.contactPhone || client.phone || ''
    }))
    setOrderClientSearch(client.fullName ? `${client.fullName} (${client.phone})` : client.phone)
    setOrderClientResults([])
  }

  function clearClientFromOrder(formSetter) {
    formSetter((p) => ({ ...p, clientId: '' }))
    setOrderClientSearch('')
    setOrderClientResults([])
  }

  function loadOrders(silent = false) {
    if (!silent) setLoadingOrders(true)
    const params = new URLSearchParams()
    if (orderFilters.status) params.set('status', orderFilters.status)
    if (orderFilters.source) params.set('source', orderFilters.source)
    if (orderFilters.model) params.set('model', orderFilters.model)
    authFetch(`/api/orders?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => setOrders(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoadingOrders(false))
  }

  function submitCreateOrder(e) {
    e.preventDefault()
    setCreateOrderError('')
    const body = {
      clientId: createOrderForm.clientId ? Number(createOrderForm.clientId) : null,
      contactName: createOrderForm.contactName || null,
      contactPhone: createOrderForm.contactPhone || null,
      model: createOrderForm.model,
      status: createOrderForm.status,
      source: createOrderForm.source,
      desiredColor: createOrderForm.desiredColor || null,
      depositAmount: createOrderForm.depositAmount ? Number(createOrderForm.depositAmount) : null,
      notes: createOrderForm.notes || null
    }
    authFetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then((res) => {
        if (!res.ok) return res.json().then((e) => { throw new Error(e.message || 'Ошибка создания') })
        return res.json()
      })
      .then(() => {
        setShowCreateOrderForm(false)
        setCreateOrderForm({ ...EMPTY_CREATE_ORDER_FORM })
        loadOrders()
      })
      .catch((err) => setCreateOrderError(err.message || 'Ошибка создания заявки'))
  }

  function submitUpdateOrder(e) {
    e.preventDefault()
    setEditOrderError('')
    const body = {
      clientId: editOrderForm.clientId ? Number(editOrderForm.clientId) : null,
      contactName: editOrderForm.contactName || null,
      contactPhone: editOrderForm.contactPhone || null,
      model: editOrderForm.model,
      status: editOrderForm.status,
      source: editOrderForm.source,
      desiredColor: editOrderForm.desiredColor || null,
      depositAmount: editOrderForm.depositAmount ? Number(editOrderForm.depositAmount) : null,
      notes: editOrderForm.notes || null
    }
    authFetch(`/api/orders/${editOrderForm.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then((res) => {
        if (!res.ok) return res.json().then((e) => { throw new Error(e.message || 'Ошибка сохранения') })
        return res.json()
      })
      .then(() => {
        setEditOrderForm({ ...EMPTY_EDIT_ORDER_FORM })
        loadOrders()
      })
      .catch((err) => setEditOrderError(err.message || 'Ошибка сохранения заявки'))
  }

  function navigateToOrder(orderId) {
    authFetch(`/api/orders/${orderId}`)
      .then((res) => res.json())
      .then((order) => {
        navigate('orders')
        setShowCreateOrderForm(false)
        setOrderClientSearch(order.clientName
          ? `${order.clientName}${order.contactPhone ? ` (${order.contactPhone})` : ''}`
          : '')
        setOrderClientResults([])
        setEditOrderForm({
          id: order.id,
          clientId: order.clientId ?? '',
          contactName: order.contactName ?? '',
          contactPhone: order.contactPhone ?? '',
          model: order.model ?? 'UNDEFINED',
          status: order.status ?? 'NEW',
          source: order.source ?? 'MANUAL',
          desiredColor: order.desiredColor ?? '',
          depositAmount: order.depositAmount ?? '',
          notes: order.notes ?? ''
        })
        setEditOrderError('')
      })
      .catch(() => {})
  }

  function selectOrderForEdit(order) {
    setShowCreateOrderForm(false)
    setOrderClientSearch(order.clientName
      ? `${order.clientName}${order.contactPhone ? ` (${order.contactPhone})` : ''}`
      : '')
    setOrderClientResults([])
    setEditOrderForm({
      id: order.id,
      clientId: order.clientId ?? '',
      contactName: order.contactName ?? '',
      contactPhone: order.contactPhone ?? '',
      model: order.model ?? 'UNDEFINED',
      status: order.status ?? 'NEW',
      source: order.source ?? 'MANUAL',
      desiredColor: order.desiredColor ?? '',
      depositAmount: order.depositAmount ?? '',
      notes: order.notes ?? ''
    })
    setEditOrderError('')
  }

  function toggleCreateOrderForm() {
    setShowCreateOrderForm((current) => {
      const next = !current
      if (next) {
        setEditOrderForm({ ...EMPTY_EDIT_ORDER_FORM })
        setEditOrderError('')
        setOrderClientSearch('')
        setOrderClientResults([])
      }
      return next
    })
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

  function loadInstructions() {
    setLoadingInstructions(true)
    authFetch('/api/instructions')
      .then((res) => res.json())
      .then((data) => setInstructions(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoadingInstructions(false))
  }

  function openInstruction(id, keepEditMode = false) {
    authFetch(`/api/instructions/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setActivePage('instructions')
        setSelectedInstruction(data)
        if (!keepEditMode) setInstructionEditMode(false)
        if (!keepEditMode) pushRoute('instructions', id)
        // Prefetch presigned URLs for all photos
        const photoFiles = (data.steps || []).flatMap((s) => (s.files || []).filter((f) => f.fileType === 'PHOTO'))
        if (photoFiles.length === 0) return
        Promise.all(
          photoFiles.map((f) =>
            authFetch(`/api/instructions/files/${f.id}/download-url`)
              .then((r) => r.json())
              .then((d) => ({ id: f.id, url: d.url }))
              .catch(() => null)
          )
        ).then((results) => {
          const map = {}
          results.forEach((r) => { if (r) map[r.id] = r.url })
          setPhotoUrls(map)
        })
      })
      .catch(() => {})
  }

  function startCreateInstruction() {
    setSelectedInstruction(null)
    setInstructionForm({ number: '', title: '', steps: [] })
    setInstructionFormError('')
    setInstructionEditMode(true)
  }

  function startEditInstruction() {
    setInstructionForm({
      number: selectedInstruction.number,
      title: selectedInstruction.title,
      steps: selectedInstruction.steps.map((s) => ({
        id: s.id,
        stepNumber: s.stepNumber,
        title: s.title || '',
        comment: s.comment || ''
      }))
    })
    setInstructionFormError('')
    setInstructionEditMode(true)
  }

  const dragStepIdx = useRef(null)

  function addStep() {
    const nextNum = instructionForm.steps.length + 1
    setInstructionForm((f) => ({
      ...f,
      steps: [...f.steps, { stepNumber: nextNum, title: '', comment: '' }]
    }))
  }

  function moveStep(fromIdx, toIdx) {
    setInstructionForm((f) => {
      const steps = [...f.steps]
      const [moved] = steps.splice(fromIdx, 1)
      steps.splice(toIdx, 0, moved)
      return { ...f, steps: steps.map((s, i) => ({ ...s, stepNumber: i + 1 })) }
    })
  }

  function removeStep(idx) {
    setInstructionForm((f) => ({
      ...f,
      steps: f.steps.filter((_, i) => i !== idx).map((s, i) => ({ ...s, stepNumber: i + 1 }))
    }))
  }

  function saveInstructionForm() {
    if (!instructionForm.number || !instructionForm.title) {
      setInstructionFormError('Заполните номер и название')
      return
    }
    const isNew = !selectedInstruction
    const url = isNew ? '/api/instructions' : `/api/instructions/${selectedInstruction.id}`
    const method = isNew ? 'POST' : 'PUT'
    authFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        number: Number(instructionForm.number),
        title: instructionForm.title,
        steps: instructionForm.steps.map((s, i) => ({
          id: s.id || null,
          stepNumber: i + 1,
          title: s.title,
          comment: s.comment
        }))
      })
    })
      .then((res) => res.json())
      .then((data) => {
        setInstructionEditMode(false)
        openInstruction(data.id)
        loadInstructions()
      })
      .catch(() => setInstructionFormError('Ошибка сохранения'))
  }

  function deleteInstruction(id) {
    if (!window.confirm('Удалить инструкцию?')) return
    authFetch(`/api/instructions/${id}`, { method: 'DELETE' })
      .then(() => {
        setSelectedInstruction(null)
        navigate('instructions')
        loadInstructions()
      })
      .catch(() => {})
  }

  function handleStepPaste(e, stepId) {
    if (!instructionEditMode) return
    const items = e.clipboardData?.items
    if (!items) return
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        const file = item.getAsFile()
        if (file) uploadStepFile(stepId, file, 'PHOTO')
        break
      }
    }
  }

  function uploadStepFile(stepId, file, fileType) {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', fileType)
    setFileUploadError('')
    authFetch(`/api/instructions/steps/${stepId}/files`, {
      method: 'POST',
      body: formData
    })
      .then((res) => {
        if (!res.ok) throw new Error()
        return res.json()
      })
      .then(() => openInstruction(selectedInstruction.id, true))
      .catch(() => setFileUploadError('Ошибка загрузки файла'))
  }

  function replaceStepFile(fileId, file, bumpVersion) {
    const formData = new FormData()
    formData.append('file', file)
    setFileUploadError('')
    authFetch(`/api/instructions/files/${fileId}?bumpVersion=${bumpVersion}`, {
      method: 'PUT',
      body: formData
    })
      .then((res) => {
        if (!res.ok) throw new Error()
        return res.json()
      })
      .then(() => {
        setReplacingFile(null)
        openInstruction(selectedInstruction.id, true)
      })
      .catch(() => setFileUploadError('Ошибка замены файла'))
  }

  function deleteStepFile(fileId) {
    if (!window.confirm('Удалить файл?')) return
    authFetch(`/api/instructions/files/${fileId}`, { method: 'DELETE' })
      .then(() => openInstruction(selectedInstruction.id, true))
      .catch(() => {})
  }

  function downloadFile(fileId, fileName) {
    authFetch(`/api/instructions/files/${fileId}/download-url`)
      .then((res) => res.json())
      .then((data) => triggerDownload(data.url, fileName))
      .catch(() => {})
  }

  function loadDocuments() {
    setLoadingDocuments(true)
    authFetch('/api/documents')
      .then((res) => res.json())
      .then((data) => setDocuments(data))
      .catch(() => {})
      .finally(() => setLoadingDocuments(false))
  }

  function openDocument(id) {
    authFetch(`/api/documents/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setActivePage('documents')
        setSelectedDocument(data)
        setDocumentEditMode(false)
        setDocumentHistoryOpen(false)
        setDocumentFormError('')
        setDocumentReplaceFile(null)
        pushRoute('documents', id)
      })
      .catch(() => {})
  }

  function startEditDocumentMeta() {
    setDocumentMetaForm({ title: selectedDocument.title, description: selectedDocument.description || '' })
    setDocumentEditMode(true)
    setDocumentFormError('')
  }

  function saveDocumentMeta() {
    if (!documentMetaForm.title.trim()) { setDocumentFormError('Название обязательно'); return }
    authFetch(`/api/documents/${selectedDocument.id}/meta`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(documentMetaForm)
    })
      .then((res) => res.json())
      .then((data) => {
        setSelectedDocument(data)
        setDocumentEditMode(false)
        setDocuments((prev) => prev.map((d) => d.id === data.id
          ? { ...d, title: data.title, description: data.description, updatedAt: data.updatedAt }
          : d))
      })
      .catch(() => setDocumentFormError('Ошибка сохранения'))
  }

  function saveDocumentUpload() {
    if (!documentUploadForm.title.trim()) { setDocumentUploadError('Название обязательно'); return }
    if (!documentUploadFile) { setDocumentUploadError('Выберите файл'); return }
    const fd = new FormData()
    fd.append('title', documentUploadForm.title)
    if (documentUploadForm.description) fd.append('description', documentUploadForm.description)
    fd.append('file', documentUploadFile)
    setDocumentUploading(true)
    authFetch('/api/documents', { method: 'POST', body: fd })
      .then((res) => res.json())
      .then((data) => {
        setDocuments((prev) => [{ id: data.id, title: data.title, description: data.description, fileName: data.fileName, size: data.size, version: data.version, createdAt: data.createdAt, updatedAt: data.updatedAt }, ...prev])
        setShowDocumentUploadForm(false)
        setDocumentUploadForm({ title: '', description: '' })
        setDocumentUploadFile(null)
        setDocumentUploadError('')
      })
      .catch(() => setDocumentUploadError('Ошибка загрузки'))
      .finally(() => setDocumentUploading(false))
  }

  function replaceDocumentFile() {
    if (!documentReplaceFile) return
    const fd = new FormData()
    fd.append('file', documentReplaceFile)
    setDocumentUploading(true)
    authFetch(`/api/documents/${selectedDocument.id}/file`, { method: 'PUT', body: fd })
      .then((res) => res.json())
      .then((data) => {
        setSelectedDocument(data)
        setDocumentReplaceFile(null)
        setDocuments((prev) => prev.map((d) => d.id === data.id
          ? { ...d, fileName: data.fileName, size: data.size, version: data.version, updatedAt: data.updatedAt }
          : d))
      })
      .catch(() => {})
      .finally(() => setDocumentUploading(false))
  }

  function deleteDocument(id) {
    if (!window.confirm('Удалить документ?')) return
    authFetch(`/api/documents/${id}`, { method: 'DELETE' })
      .then(() => {
        setDocuments((prev) => prev.filter((d) => d.id !== id))
        if (selectedDocument?.id === id) setSelectedDocument(null)
      })
      .catch(() => {})
  }

  function triggerDownload(url, fileName) {
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.style.display = 'none'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  function downloadDocument(id, fileName) {
    authFetch(`/api/documents/${id}/download-url`)
      .then((res) => res.json())
      .then((data) => triggerDownload(data.url, fileName))
      .catch(() => {})
  }

  function downloadDocumentVersion(versionId, fileName) {
    authFetch(`/api/documents/versions/${versionId}/download-url`)
      .then((res) => res.json())
      .then((data) => triggerDownload(data.url, fileName))
      .catch(() => {})
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
            onClick={() => navigate(page.key)}
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
                      <span className="field-label">Источник</span>
                      <select value={createClientForm.source} onChange={(e) => setCreateClientForm((p) => ({ ...p, source: e.target.value }))}>
                        {CLIENT_SOURCE_OPTIONS.map((value) => <option key={value} value={value}>{labelOf(value, CLIENT_SOURCE_LABELS)}</option>)}
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
                      <span className="field-label">Телефон</span>
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
                      <span className="field-label">Источник</span>
                      <select value={editClientForm.source} onChange={(e) => setEditClientForm((p) => ({ ...p, source: e.target.value }))}>
                        {CLIENT_SOURCE_OPTIONS.map((value) => <option key={value} value={value}>{labelOf(value, CLIENT_SOURCE_LABELS)}</option>)}
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

                <div className="card-form inline-form">
                  <h3>Заявки клиента</h3>
                  {loadingClientOrders ? (
                    <p className="hint-text">Загрузка...</p>
                  ) : clientOrders.length === 0 ? (
                    <p className="hint-text">Нет привязанных заявок</p>
                  ) : (
                    <table>
                      <thead>
                        <tr>
                          <th>№</th>
                          <th>Дата</th>
                          <th>Источник</th>
                          <th>Модель</th>
                          <th>Статус</th>
                          <th>Аванс</th>
                        </tr>
                      </thead>
                      <tbody>
                        {clientOrders.map((order) => (
                          <tr
                            key={order.id}
                            className="table-row-clickable"
                            onClick={() => navigateToOrder(order.id)}
                          >
                            <td>{order.id}</td>
                            <td>{new Date(order.createdAt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                            <td>{labelOf(order.source, ORDER_SOURCE_LABELS)}</td>
                            <td>{labelOf(order.model, ORDER_MODEL_LABELS)}</td>
                            <td><span className={`order-status-chip order-status-${order.status}`}>{labelOf(order.status, ORDER_STATUS_LABELS)}</span></td>
                            <td>{order.depositAmount ? `${Number(order.depositAmount).toLocaleString('ru-RU')} ₽` : '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
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
                      <th>Температура</th>
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
                        <td>{labelOf(client.temperature, CLIENT_TEMPERATURE_LABELS)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        ) : activePage === 'orders' ? (
          <section>
            <h2>Заявки на лодку</h2>
            <p>Заявки поступают с сайта автоматически или создаются вручную.</p>

            <div className="table-wrap">
              <div className="table-head">
                <h3>Список заявок</h3>
                <div className="table-actions">
                  <button type="button" onClick={toggleCreateOrderForm}>
                    {showCreateOrderForm ? 'Скрыть форму' : 'Создать заявку'}
                  </button>
                </div>
              </div>

              <div className="filters-grid">
                <select
                  value={orderFilters.status}
                  onChange={(e) => setOrderFilters((p) => ({ ...p, status: e.target.value }))}
                >
                  <option value="">Все статусы</option>
                  {ORDER_STATUS_OPTIONS.map((v) => <option key={v} value={v}>{labelOf(v, ORDER_STATUS_LABELS)}</option>)}
                </select>
                <select
                  value={orderFilters.source}
                  onChange={(e) => setOrderFilters((p) => ({ ...p, source: e.target.value }))}
                >
                  <option value="">Все источники</option>
                  {ORDER_SOURCE_OPTIONS.map((v) => <option key={v} value={v}>{labelOf(v, ORDER_SOURCE_LABELS)}</option>)}
                </select>
                <select
                  value={orderFilters.model}
                  onChange={(e) => setOrderFilters((p) => ({ ...p, model: e.target.value }))}
                >
                  <option value="">Все модели</option>
                  {ORDER_MODEL_OPTIONS.map((v) => <option key={v} value={v}>{labelOf(v, ORDER_MODEL_LABELS)}</option>)}
                </select>
              </div>

              {showCreateOrderForm ? (
                <form onSubmit={submitCreateOrder} className="card-form inline-form">
                  <h3>Создать заявку</h3>
                  <div className="form-grid">
                    <div className="field field-wide">
                      <span className="field-label">Клиент</span>
                      <div className="client-search-wrap">
                        <input
                          placeholder="Поиск по имени или телефону..."
                          value={orderClientSearch}
                          onChange={(e) => searchClientsForOrder(e.target.value)}
                          autoComplete="off"
                        />
                        {createOrderForm.clientId ? (
                          <div className="client-search-linked">
                            <span>Привязан клиент #{createOrderForm.clientId}</span>
                            <button type="button" className="ghost-btn" onClick={() => clearClientFromOrder(setCreateOrderForm)}>Отвязать</button>
                          </div>
                        ) : null}
                        {orderClientResults.length > 0 ? (
                          <div className="client-search-results">
                            {orderClientResults.map((c) => (
                              <div key={c.id} className="client-search-item" onClick={() => pickClientForOrder(c, setCreateOrderForm)}>
                                <span className="client-search-name">{c.fullName || '(без имени)'}</span>
                                <span className="client-search-phone">{c.phone}</span>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                    <label className="field">
                      <span className="field-label">Имя контакта</span>
                      <input
                        value={createOrderForm.contactName}
                        onChange={(e) => setCreateOrderForm((p) => ({ ...p, contactName: e.target.value }))}
                      />
                    </label>
                    <label className="field">
                      <span className="field-label">Телефон контакта</span>
                      <input
                        value={createOrderForm.contactPhone}
                        onChange={(e) => setCreateOrderForm((p) => ({ ...p, contactPhone: e.target.value }))}
                      />
                    </label>
                    <label className="field">
                      <span className="field-label">Модель</span>
                      <select value={createOrderForm.model} onChange={(e) => setCreateOrderForm((p) => ({ ...p, model: e.target.value }))}>
                        {ORDER_MODEL_OPTIONS.map((v) => <option key={v} value={v}>{labelOf(v, ORDER_MODEL_LABELS)}</option>)}
                      </select>
                    </label>
                    <label className="field">
                      <span className="field-label">Источник</span>
                      <select value={createOrderForm.source} onChange={(e) => setCreateOrderForm((p) => ({ ...p, source: e.target.value }))}>
                        {ORDER_SOURCE_OPTIONS.map((v) => <option key={v} value={v}>{labelOf(v, ORDER_SOURCE_LABELS)}</option>)}
                      </select>
                    </label>
                    <label className="field">
                      <span className="field-label">Статус</span>
                      <select value={createOrderForm.status} onChange={(e) => setCreateOrderForm((p) => ({ ...p, status: e.target.value }))}>
                        {ORDER_STATUS_OPTIONS.map((v) => <option key={v} value={v}>{labelOf(v, ORDER_STATUS_LABELS)}</option>)}
                      </select>
                    </label>
                    <label className="field">
                      <span className="field-label">Желаемый цвет</span>
                      <input
                        value={createOrderForm.desiredColor}
                        onChange={(e) => setCreateOrderForm((p) => ({ ...p, desiredColor: e.target.value }))}
                      />
                    </label>
                    <label className="field">
                      <span className="field-label">Аванс (руб.)</span>
                      <input
                        type="number"
                        min="0"
                        value={createOrderForm.depositAmount}
                        onChange={(e) => setCreateOrderForm((p) => ({ ...p, depositAmount: e.target.value }))}
                      />
                    </label>
                    <label className="field field-wide">
                      <span className="field-label">Заметки</span>
                      <textarea
                        rows={3}
                        value={createOrderForm.notes}
                        onChange={(e) => setCreateOrderForm((p) => ({ ...p, notes: e.target.value }))}
                      />
                    </label>
                  </div>
                  <button type="submit">Создать</button>
                  {createOrderError ? <p className="error-text">{createOrderError}</p> : null}
                </form>
              ) : null}

              {editOrderForm.id ? (
                <form onSubmit={submitUpdateOrder} className="card-form inline-form">
                  <div className="inline-form-head">
                    <h3>Редактировать заявку #{editOrderForm.id}</h3>
                    <button type="button" className="ghost-btn" onClick={() => setEditOrderForm({ ...EMPTY_EDIT_ORDER_FORM })}>Закрыть</button>
                  </div>
                  {/* Визуальная воронка */}
                  <div className="order-funnel">
                    {ORDER_STATUS_FUNNEL.map((s) => {
                      const idx = ORDER_STATUS_FUNNEL.indexOf(s)
                      const curIdx = ORDER_STATUS_FUNNEL.indexOf(editOrderForm.status)
                      const isPast = curIdx !== -1 && idx < curIdx
                      const isCurrent = editOrderForm.status === s
                      return (
                        <button
                          key={s}
                          type="button"
                          className={`funnel-step${isPast ? ' funnel-past' : ''}${isCurrent ? ' funnel-current' : ''}`}
                          onClick={() => setEditOrderForm((p) => ({ ...p, status: s }))}
                          title={ORDER_STATUS_LABELS[s]}
                        >
                          {ORDER_STATUS_LABELS[s]}
                        </button>
                      )
                    })}
                    <button
                      type="button"
                      className={`funnel-step funnel-cancel-btn${editOrderForm.status === 'CANCELLED' ? ' funnel-current-cancel' : ''}`}
                      onClick={() => setEditOrderForm((p) => ({ ...p, status: 'CANCELLED' }))}
                    >
                      ✕
                    </button>
                  </div>
                  <div className="form-grid">
                    <div className="field field-wide">
                      <span className="field-label">Клиент</span>
                      <div className="client-search-wrap">
                        <input
                          placeholder="Поиск по имени или телефону..."
                          value={orderClientSearch}
                          onChange={(e) => searchClientsForOrder(e.target.value)}
                          autoComplete="off"
                        />
                        {editOrderForm.clientId ? (
                          <div className="client-search-linked">
                            <span>Привязан клиент #{editOrderForm.clientId}</span>
                            <button type="button" className="ghost-btn" onClick={() => clearClientFromOrder(setEditOrderForm)}>Отвязать</button>
                          </div>
                        ) : null}
                        {orderClientResults.length > 0 ? (
                          <div className="client-search-results">
                            {orderClientResults.map((c) => (
                              <div key={c.id} className="client-search-item" onClick={() => pickClientForOrder(c, setEditOrderForm)}>
                                <span className="client-search-name">{c.fullName || '(без имени)'}</span>
                                <span className="client-search-phone">{c.phone}</span>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                    <label className="field">
                      <span className="field-label">Имя контакта</span>
                      <input
                        value={editOrderForm.contactName}
                        onChange={(e) => setEditOrderForm((p) => ({ ...p, contactName: e.target.value }))}
                      />
                    </label>
                    <label className="field">
                      <span className="field-label">Телефон контакта</span>
                      <input
                        value={editOrderForm.contactPhone}
                        onChange={(e) => setEditOrderForm((p) => ({ ...p, contactPhone: e.target.value }))}
                      />
                    </label>
                    <label className="field">
                      <span className="field-label">Модель</span>
                      <select value={editOrderForm.model} onChange={(e) => setEditOrderForm((p) => ({ ...p, model: e.target.value }))}>
                        {ORDER_MODEL_OPTIONS.map((v) => <option key={v} value={v}>{labelOf(v, ORDER_MODEL_LABELS)}</option>)}
                      </select>
                    </label>
                    <label className="field">
                      <span className="field-label">Источник</span>
                      <select value={editOrderForm.source} onChange={(e) => setEditOrderForm((p) => ({ ...p, source: e.target.value }))}>
                        {ORDER_SOURCE_OPTIONS.map((v) => <option key={v} value={v}>{labelOf(v, ORDER_SOURCE_LABELS)}</option>)}
                      </select>
                    </label>
                    <label className="field">
                      <span className="field-label">Желаемый цвет</span>
                      <input
                        value={editOrderForm.desiredColor}
                        onChange={(e) => setEditOrderForm((p) => ({ ...p, desiredColor: e.target.value }))}
                      />
                    </label>
                    <label className="field">
                      <span className="field-label">Аванс (руб.)</span>
                      <input
                        type="number"
                        min="0"
                        value={editOrderForm.depositAmount}
                        onChange={(e) => setEditOrderForm((p) => ({ ...p, depositAmount: e.target.value }))}
                      />
                    </label>
                    <label className="field field-wide">
                      <span className="field-label">Заметки</span>
                      <textarea
                        rows={3}
                        value={editOrderForm.notes}
                        onChange={(e) => setEditOrderForm((p) => ({ ...p, notes: e.target.value }))}
                      />
                    </label>
                  </div>
                  <button type="submit">Сохранить</button>
                  {editOrderError ? <p className="error-text">{editOrderError}</p> : null}
                </form>
              ) : null}

              {loadingOrders ? (
                <p>Загрузка...</p>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>№</th>
                      <th>Дата</th>
                      <th>Источник</th>
                      <th>Клиент / Контакт</th>
                      <th>Телефон</th>
                      <th>Модель</th>
                      <th>Статус</th>
                      <th>Цвет</th>
                      <th>Аванс</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.length === 0 ? (
                      <tr><td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Заявок пока нет</td></tr>
                    ) : orders.map((order) => (
                      <tr
                        key={order.id}
                        className="table-row-clickable"
                        onClick={() => selectOrderForEdit(order)}
                      >
                        <td>{order.id}</td>
                        <td>{new Date(order.createdAt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                        <td>{labelOf(order.source, ORDER_SOURCE_LABELS)}</td>
                        <td>{order.clientName || order.contactName || '-'}</td>
                        <td>{order.contactPhone || '-'}</td>
                        <td>{labelOf(order.model, ORDER_MODEL_LABELS)}</td>
                        <td><span className={`order-status-chip order-status-${order.status}`}>{labelOf(order.status, ORDER_STATUS_LABELS)}</span></td>
                        <td>{order.desiredColor || '-'}</td>
                        <td>{order.depositAmount ? `${Number(order.depositAmount).toLocaleString('ru-RU')} ₽` : '-'}</td>
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
                        <option value="OPERATOR">{labelOf('OPERATOR', ROLE_LABELS)}</option>
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
                        <option value="OPERATOR">{labelOf('OPERATOR', ROLE_LABELS)}</option>
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
        ) : activePage === 'documents' ? (
          <section>
            {/* Header */}
            <div className="table-head">
              <h2>Документы</h2>
              {!selectedDocument && !showDocumentUploadForm && (auth.role === 'ADMIN' || auth.role === 'SUPERADMIN') && (
                <button type="button" className="ghost-btn" onClick={() => { setShowDocumentUploadForm(true); setDocumentUploadForm({ title: '', description: '' }); setDocumentUploadFile(null); setDocumentUploadError('') }}>
                  + Загрузить
                </button>
              )}
              {selectedDocument && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" className="ghost-btn" onClick={() => window.history.back()}>← Назад</button>
                  {!documentEditMode && (auth.role === 'ADMIN' || auth.role === 'SUPERADMIN') && (
                    <>
                      <button type="button" className="ghost-btn" onClick={startEditDocumentMeta}>Редактировать</button>
                      <button type="button" className="ghost-btn" style={{ color: 'var(--red)' }} onClick={() => deleteDocument(selectedDocument.id)}>Удалить</button>
                    </>
                  )}
                  {documentEditMode && (
                    <>
                      <button type="button" onClick={saveDocumentMeta}>Сохранить</button>
                      <button type="button" className="ghost-btn" onClick={() => { setDocumentEditMode(false); setDocumentFormError('') }}>Отмена</button>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Upload form */}
            {showDocumentUploadForm && !selectedDocument && (
              <div className="card-form" style={{ maxWidth: '560px' }}>
                <h3 style={{ margin: '0 0 16px' }}>Новый документ</h3>
                <label className="form-label">Название *</label>
                <input
                  className="form-input"
                  value={documentUploadForm.title}
                  onChange={(e) => setDocumentUploadForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Например: Договор поставки"
                />
                <label className="form-label" style={{ marginTop: '12px' }}>Описание</label>
                <textarea
                  className="form-input"
                  rows={3}
                  value={documentUploadForm.description}
                  onChange={(e) => setDocumentUploadForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Краткое описание документа"
                />
                <label className="form-label" style={{ marginTop: '12px' }}>Файл *</label>
                <input
                  type="file"
                  className="form-input"
                  onChange={(e) => setDocumentUploadFile(e.target.files[0] || null)}
                />
                {documentUploadFile && (
                  <p className="hint-text" style={{ marginTop: '4px' }}>{documentUploadFile.name} ({(documentUploadFile.size / 1024).toFixed(0)} КБ)</p>
                )}
                {documentUploadError && <p className="error-text">{documentUploadError}</p>}
                <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                  <button type="button" onClick={saveDocumentUpload} disabled={documentUploading}>
                    {documentUploading ? 'Загрузка...' : 'Сохранить'}
                  </button>
                  <button type="button" className="ghost-btn" onClick={() => setShowDocumentUploadForm(false)}>Отмена</button>
                </div>
              </div>
            )}

            {/* Document detail */}
            {selectedDocument ? (
              <div>
                {documentEditMode ? (
                  <div className="card-form" style={{ maxWidth: '560px' }}>
                    <label className="form-label">Название *</label>
                    <input
                      className="form-input"
                      value={documentMetaForm.title}
                      onChange={(e) => setDocumentMetaForm((f) => ({ ...f, title: e.target.value }))}
                    />
                    <label className="form-label" style={{ marginTop: '12px' }}>Описание</label>
                    <textarea
                      className="form-input"
                      rows={3}
                      value={documentMetaForm.description}
                      onChange={(e) => setDocumentMetaForm((f) => ({ ...f, description: e.target.value }))}
                    />
                    {documentFormError && <p className="error-text">{documentFormError}</p>}
                  </div>
                ) : (
                  <div className="card-form" style={{ maxWidth: '640px' }}>
                    <h3 style={{ margin: '0 0 4px' }}>{selectedDocument.title}</h3>
                    {selectedDocument.description && (
                      <p style={{ margin: '0 0 16px', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>{selectedDocument.description}</p>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderTop: '1px solid var(--border)' }}>
                      <span style={{ flex: 1, fontSize: '14px' }}>
                        📄 {selectedDocument.fileName}
                        <span className="hint-text" style={{ marginLeft: '8px' }}>
                          v{selectedDocument.version} · {(selectedDocument.size / 1024).toFixed(0)} КБ
                        </span>
                      </span>
                      <button type="button" className="btn-download" onClick={() => downloadDocument(selectedDocument.id, selectedDocument.fileName)}>
                        <i className="dl-icon">↓</i> Скачать
                      </button>
                    </div>

                    {/* Replace file (admin only) */}
                    {(auth.role === 'ADMIN' || auth.role === 'SUPERADMIN') && (
                      <div style={{ paddingTop: '12px', borderTop: '1px solid var(--border)', marginTop: '4px' }}>
                        <p className="hint-text" style={{ marginBottom: '8px' }}>Заменить файл (станет версией {selectedDocument.version + 1})</p>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <input type="file" className="form-input" style={{ flex: 1 }}
                            onChange={(e) => setDocumentReplaceFile(e.target.files[0] || null)}
                          />
                          <button type="button" disabled={!documentReplaceFile || documentUploading} onClick={replaceDocumentFile}>
                            {documentUploading ? 'Загрузка...' : 'Заменить'}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Version history */}
                    {selectedDocument.versions && selectedDocument.versions.length > 0 && (
                      <div style={{ paddingTop: '12px', borderTop: '1px solid var(--border)', marginTop: '8px' }}>
                        <button
                          type="button"
                          className="ghost-btn"
                          style={{ padding: '4px 0', fontSize: '13px' }}
                          onClick={() => setDocumentHistoryOpen((v) => !v)}
                        >
                          {documentHistoryOpen ? '▾' : '▸'} История версий ({selectedDocument.versions.length})
                        </button>
                        {documentHistoryOpen && (
                          <table className="data-table" style={{ marginTop: '8px' }}>
                            <thead>
                              <tr>
                                <th>Версия</th>
                                <th>Файл</th>
                                <th>Размер</th>
                                <th>Дата</th>
                                <th></th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedDocument.versions.map((v) => (
                                <tr key={v.id}>
                                  <td>v{v.versionNumber}</td>
                                  <td>{v.fileName}</td>
                                  <td>{(v.size / 1024).toFixed(0)} КБ</td>
                                  <td>{new Date(v.uploadedAt).toLocaleString('ru-RU')}</td>
                                  <td>
                                    <button type="button" className="ghost-btn" onClick={() => downloadDocumentVersion(v.id, v.fileName)}>
                                      Скачать
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    )}

                    <p className="hint-text" style={{ marginTop: '12px', fontSize: '12px' }}>
                      Создан: {new Date(selectedDocument.createdAt).toLocaleString('ru-RU')} ·
                      Обновлён: {new Date(selectedDocument.updatedAt).toLocaleString('ru-RU')}
                    </p>
                  </div>
                )}
              </div>
            ) : !showDocumentUploadForm ? (
              /* Documents table */
              loadingDocuments ? (
                <p className="hint-text">Загрузка...</p>
              ) : documents.length === 0 ? (
                <p className="hint-text">Документов нет. Загрузите первый документ.</p>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Название</th>
                      <th>Описание</th>
                      <th>Файл</th>
                      <th>Версия</th>
                      <th>Обновлён</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {documents.map((doc) => (
                      <tr key={doc.id} className="table-row-clickable" onClick={() => openDocument(doc.id)}>
                        <td style={{ fontWeight: 500 }}>{doc.title}</td>
                        <td style={{ color: 'var(--text-secondary)', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {doc.description || '—'}
                        </td>
                        <td>📄 {doc.fileName}</td>
                        <td>v{doc.version}</td>
                        <td>{new Date(doc.updatedAt).toLocaleDateString('ru-RU')}</td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <button type="button" className="btn-download" onClick={() => downloadDocument(doc.id, doc.fileName)}>
                            <i className="dl-icon">↓</i> Скачать
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            ) : null}
          </section>
        ) : activePage === 'instructions' ? (
          <section>
            <div className="table-head">
              <h2>Инструкции</h2>
              {!instructionEditMode && !selectedInstruction && (auth.role === 'ADMIN' || auth.role === 'SUPERADMIN') && (
                <button type="button" className="ghost-btn" onClick={startCreateInstruction}>+ Создать</button>
              )}
              {selectedInstruction && !instructionEditMode && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" className="ghost-btn" onClick={() => window.history.back()}>← Назад</button>
                  {(auth.role === 'ADMIN' || auth.role === 'SUPERADMIN') && (
                    <>
                      <button type="button" className="ghost-btn" onClick={startEditInstruction}>Редактировать</button>
                      <button type="button" className="ghost-btn" style={{ color: 'var(--red)' }} onClick={() => deleteInstruction(selectedInstruction.id)}>Удалить</button>
                    </>
                  )}
                </div>
              )}
              {instructionEditMode && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  {selectedInstruction && <button type="button" className="ghost-btn" onClick={() => setInstructionEditMode(false)}>Отмена</button>}
                  {!selectedInstruction && <button type="button" className="ghost-btn" onClick={() => setInstructionEditMode(false)}>Отмена</button>}
                </div>
              )}
            </div>

            {/* Edit / Create form */}
            {instructionEditMode ? (
              <div className="card-form" style={{ maxWidth: '700px', marginTop: '16px' }}>
                <div className="form-grid">
                  <div className="field">
                    <label className="field-label">Номер</label>
                    <input type="number" value={instructionForm.number} onChange={(e) => setInstructionForm((f) => ({ ...f, number: e.target.value }))} />
                  </div>
                  <div className="field field-wide">
                    <label className="field-label">Название</label>
                    <input type="text" value={instructionForm.title} onChange={(e) => setInstructionForm((f) => ({ ...f, title: e.target.value }))} />
                  </div>
                </div>

                <div className="form-section-title" style={{ marginTop: '16px' }}>Шаги</div>
                {instructionForm.steps.map((step, idx) => {
                  const savedStep = step.id && selectedInstruction
                    ? selectedInstruction.steps.find((s) => s.id === step.id)
                    : null
                  return (
                    <div
                      key={idx}
                      className={[
                        'card-form',
                        step.id && focusedStepId === step.id ? 'step-card-focused' : '',
                        step.id && focusedStepId !== step.id ? 'step-card-pasteable' : ''
                      ].filter(Boolean).join(' ')}
                      tabIndex={0}
                      style={{ marginBottom: '8px', outline: 'none' }}
                      onClick={(e) => e.currentTarget.focus()}
                      onFocus={() => step.id && setFocusedStepId(step.id)}
                      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setFocusedStepId(null) }}
                      onPaste={(e) => step.id && handleStepPaste(e, step.id)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontWeight: 600 }}>Шаг {idx + 1}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {step.id && (
                            <span className={`step-paste-hint${focusedStepId === step.id ? ' active' : ''}`}>
                              {focusedStepId === step.id ? '📋 Вставьте фото Ctrl+V' : '🖱 Нажмите для вставки'}
                            </span>
                          )}
                          <button type="button" className="ghost-btn" style={{ color: 'var(--red)' }} onClick={() => removeStep(idx)}>Удалить шаг</button>
                        </div>
                      </div>
                      <div className="form-grid">
                        <div className="field field-wide">
                          <label className="field-label">Название</label>
                          <input type="text" value={step.title} onChange={(e) => { const steps = [...instructionForm.steps]; steps[idx] = { ...steps[idx], title: e.target.value }; setInstructionForm((f) => ({ ...f, steps })) }} />
                        </div>
                        <div className="field field-wide">
                          <label className="field-label">Комментарий</label>
                          <textarea rows={3} value={step.comment} onChange={(e) => { const steps = [...instructionForm.steps]; steps[idx] = { ...steps[idx], comment: e.target.value }; setInstructionForm((f) => ({ ...f, steps })) }} />
                        </div>
                      </div>

                      {savedStep ? (
                        <div style={{ marginTop: '12px' }}>
                          {/* Photos */}
                          {savedStep.files.filter((f) => f.fileType === 'PHOTO').length > 0 && (
                            <div style={{ marginBottom: '10px' }}>
                              <div className="field-label" style={{ marginBottom: '8px' }}>Фото</div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {savedStep.files.filter((f) => f.fileType === 'PHOTO').map((f) => (
                                  <div key={f.id} style={{ position: 'relative', display: 'inline-block' }}>
                                    {photoUrls[f.id] ? (
                                      <img
                                        src={photoUrls[f.id]}
                                        alt={f.fileName}
                                        title={f.fileName}
                                        onClick={() => setLightboxUrl(photoUrls[f.id])}
                                        style={{ height: '80px', width: 'auto', maxWidth: '140px', objectFit: 'cover', borderRadius: '6px', cursor: 'zoom-in', border: '1px solid var(--border)', display: 'block' }}
                                      />
                                    ) : (
                                      <div style={{ height: '80px', width: '80px', borderRadius: '6px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '12px' }}>…</div>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => deleteStepFile(f.id)}
                                      title="Удалить"
                                      style={{ position: 'absolute', top: '3px', right: '3px', background: 'rgba(0,0,0,0.55)', color: '#fff', border: 'none', borderRadius: '50%', width: '20px', height: '20px', fontSize: '11px', lineHeight: '20px', textAlign: 'center', cursor: 'pointer', padding: 0 }}
                                    >✕</button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* CNC files */}
                          {savedStep.files.filter((f) => f.fileType === 'CNC_FILE').length > 0 && (
                            <div style={{ marginBottom: '10px' }}>
                              <div className="field-label" style={{ marginBottom: '6px' }}>Файлы ЧПУ</div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {savedStep.files.filter((f) => f.fileType === 'CNC_FILE').map((f) => (
                                  <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                    <span style={{ fontFamily: 'monospace', fontSize: '13px' }}>{f.fileName}</span>
                                    <span className="hint-text">v{f.version}</span>
                                    <button type="button" className="ghost-btn" onClick={() => downloadFile(f.id, f.fileName)}>↓ Скачать</button>
                                    {replacingFile && replacingFile.fileId === f.id ? (
                                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span className="hint-text">{replacingFile.fileName}</span>
                                        <button type="button" className="ghost-btn" onClick={() => replaceStepFile(f.id, replacingFile.file, false)}>Сохранить</button>
                                        <button type="button" className="ghost-btn" onClick={() => replaceStepFile(f.id, replacingFile.file, true)}>Сохранить v{f.version + 1}</button>
                                        <button type="button" className="ghost-btn" onClick={() => setReplacingFile(null)}>Отмена</button>
                                      </span>
                                    ) : (
                                      <>
                                        <label className="ghost-btn" style={{ cursor: 'pointer' }}>
                                          Заменить
                                          <input type="file" style={{ display: 'none' }} onChange={(e) => { if (e.target.files[0]) setReplacingFile({ fileId: f.id, file: e.target.files[0], fileName: e.target.files[0].name }) }} />
                                        </label>
                                        <button type="button" className="ghost-btn" style={{ color: 'var(--red)' }} onClick={() => deleteStepFile(f.id)}>Удалить</button>
                                      </>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Upload buttons */}
                          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                            <label className="ghost-btn" style={{ cursor: 'pointer' }}>
                              + Фото
                              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => { if (e.target.files[0]) uploadStepFile(step.id, e.target.files[0], 'PHOTO') }} />
                            </label>
                            <label className="ghost-btn" style={{ cursor: 'pointer' }}>
                              + Файл ЧПУ
                              <input type="file" style={{ display: 'none' }} onChange={(e) => { if (e.target.files[0]) uploadStepFile(step.id, e.target.files[0], 'CNC_FILE') }} />
                            </label>
                          </div>
                        </div>
                      ) : (
                        <p className="hint-text" style={{ marginTop: '8px', fontSize: '12px' }}>Сохраните инструкцию, чтобы добавить файлы к этому шагу</p>
                      )}
                    </div>
                  )
                })}
                <button type="button" className="ghost-btn" style={{ marginTop: '8px' }} onClick={addStep}>+ Добавить шаг</button>

                {instructionFormError && <p className="error-text">{instructionFormError}</p>}
                <div style={{ marginTop: '16px' }}>
                  <button type="button" onClick={saveInstructionForm}>Сохранить</button>
                </div>
              </div>

            ) : selectedInstruction ? (
              /* Detail view */
              <div style={{ marginTop: '16px' }}>
                <h3 style={{ marginBottom: '16px' }}>#{selectedInstruction.number} — {selectedInstruction.title}</h3>
                {fileUploadError && <p className="error-text">{fileUploadError}</p>}
                {selectedInstruction.steps.length === 0 ? (
                  <p className="hint-text">Шаги не добавлены</p>
                ) : (
                  selectedInstruction.steps.map((step) => (
                    <div
                      key={step.id}
                      className={[
                        'card-form',
                        instructionEditMode && focusedStepId === step.id ? 'step-card-focused' : '',
                        instructionEditMode && focusedStepId !== step.id ? 'step-card-pasteable' : ''
                      ].filter(Boolean).join(' ')}
                      tabIndex={instructionEditMode ? 0 : undefined}
                      onClick={(e) => { if (instructionEditMode) e.currentTarget.focus() }}
                      onFocus={() => instructionEditMode && setFocusedStepId(step.id)}
                      onBlur={() => setFocusedStepId(null)}
                      onPaste={(e) => handleStepPaste(e, step.id)}
                      style={{ marginBottom: '16px', outline: 'none' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: step.comment ? '8px' : '12px' }}>
                        <span style={{ fontWeight: 600 }}>Шаг {step.stepNumber}{step.title ? `: ${step.title}` : ''}</span>
                        {instructionEditMode && (
                          <span className={`step-paste-hint${focusedStepId === step.id ? ' active' : ''}`}>
                            {focusedStepId === step.id ? '📋 Вставьте фото Ctrl+V' : '🖱 Нажмите для вставки'}
                          </span>
                        )}
                      </div>
                      {step.comment && <p style={{ marginBottom: '12px', color: 'var(--text-secondary)' }}>{step.comment}</p>}

                      {/* Photos */}
                      {step.files.filter((f) => f.fileType === 'PHOTO').length > 0 && (
                        <div style={{ marginBottom: '12px' }}>
                          <div className="field-label" style={{ marginBottom: '8px' }}>Фото</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {step.files.filter((f) => f.fileType === 'PHOTO').map((f) => (
                              <div key={f.id} style={{ position: 'relative', display: 'inline-block' }}>
                                {photoUrls[f.id] ? (
                                  <div className="photo-thumb-wrap" onClick={() => setLightboxUrl(photoUrls[f.id])}>
                                    <img
                                      src={photoUrls[f.id]}
                                      alt={f.fileName}
                                      title={f.fileName}
                                      style={{ height: '110px', width: 'auto', maxWidth: '180px', objectFit: 'cover', display: 'block', border: '1px solid var(--border)' }}
                                    />
                                    <div className="photo-zoom-overlay">
                                      <span className="photo-zoom-icon">🔍</span>
                                    </div>
                                  </div>
                                ) : (
                                  <div style={{ height: '110px', width: '110px', borderRadius: '6px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '20px' }}>⋯</div>
                                )}
                                {(auth.role === 'ADMIN' || auth.role === 'SUPERADMIN') && instructionEditMode && (
                                  <button
                                    type="button"
                                    onClick={() => deleteStepFile(f.id)}
                                    title="Удалить"
                                    style={{ position: 'absolute', top: '3px', right: '3px', background: 'rgba(0,0,0,0.55)', color: '#fff', border: 'none', borderRadius: '50%', width: '20px', height: '20px', fontSize: '11px', lineHeight: '20px', textAlign: 'center', cursor: 'pointer', padding: 0, zIndex: 1 }}
                                  >✕</button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* CNC files */}
                      {step.files.filter((f) => f.fileType === 'CNC_FILE').length > 0 && (
                        <div style={{ marginBottom: '12px' }}>
                          <div className="field-label" style={{ marginBottom: '6px' }}>Файлы ЧПУ</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {step.files.filter((f) => f.fileType === 'CNC_FILE').map((f) => (
                              <div key={f.id} className="cnc-file-row">
                                <span style={{ fontFamily: 'monospace', fontSize: '13px', flex: 1 }}>📂 {f.fileName}</span>
                                <span className="hint-text">v{f.version} · {(f.size / 1024).toFixed(0)} КБ</span>
                                <button type="button" className="btn-download" onClick={() => downloadFile(f.id, f.fileName)}>
                                  <i className="dl-icon">↓</i> Скачать
                                </button>
                                {(auth.role === 'ADMIN' || auth.role === 'SUPERADMIN') && instructionEditMode && (
                                  <>
                                    {replacingFile && replacingFile.fileId === f.id ? (
                                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span className="hint-text">{replacingFile.fileName}</span>
                                        <button type="button" className="ghost-btn" onClick={() => replaceStepFile(f.id, replacingFile.file, false)}>Сохранить</button>
                                        <button type="button" className="ghost-btn" onClick={() => replaceStepFile(f.id, replacingFile.file, true)}>Сохранить v{f.version + 1}</button>
                                        <button type="button" className="ghost-btn" onClick={() => setReplacingFile(null)}>Отмена</button>
                                      </span>
                                    ) : (
                                      <>
                                        <label className="ghost-btn" style={{ cursor: 'pointer' }}>
                                          Заменить
                                          <input type="file" style={{ display: 'none' }} onChange={(e) => { if (e.target.files[0]) setReplacingFile({ fileId: f.id, file: e.target.files[0], fileName: e.target.files[0].name }) }} />
                                        </label>
                                        <button type="button" className="ghost-btn" style={{ color: 'var(--red)' }} onClick={() => deleteStepFile(f.id)}>Удалить</button>
                                      </>
                                    )}
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Upload buttons for admin */}
                      {(auth.role === 'ADMIN' || auth.role === 'SUPERADMIN') && instructionEditMode && (
                        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                          <label className="ghost-btn" style={{ cursor: 'pointer' }}>
                            + Фото
                            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => { if (e.target.files[0]) uploadStepFile(step.id, e.target.files[0], 'PHOTO') }} />
                          </label>
                          <label className="ghost-btn" style={{ cursor: 'pointer' }}>
                            + Файл ЧПУ
                            <input type="file" style={{ display: 'none' }} onChange={(e) => { if (e.target.files[0]) uploadStepFile(step.id, e.target.files[0], 'CNC_FILE') }} />
                          </label>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

            ) : (
              /* List view */
              loadingInstructions ? (
                <p className="hint-text">Загрузка...</p>
              ) : instructions.length === 0 ? (
                <p className="hint-text">Нет инструкций</p>
              ) : (
                <div className="table-wrap" style={{ marginTop: '16px' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>№</th>
                        <th>Название</th>
                        <th>Обновлено</th>
                      </tr>
                    </thead>
                    <tbody>
                      {instructions.map((instr) => (
                        <tr key={instr.id} className="table-row-clickable" onClick={() => openInstruction(instr.id)}>
                          <td>{instr.number}</td>
                          <td>{instr.title}</td>
                          <td>{new Date(instr.updatedAt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
          {/* Lightbox */}
          {lightboxUrl && (
            <div
              onClick={() => setLightboxUrl(null)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out' }}
            >
              <img
                src={lightboxUrl}
                alt=""
                onClick={(e) => e.stopPropagation()}
                style={{ maxWidth: '92vw', maxHeight: '92vh', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 8px 40px rgba(0,0,0,0.6)', cursor: 'default' }}
              />
              <button
                onClick={() => setLightboxUrl(null)}
                style={{ position: 'fixed', top: '16px', right: '20px', background: 'none', border: 'none', color: '#fff', fontSize: '28px', cursor: 'pointer', lineHeight: 1 }}
              >✕</button>
            </div>
          )}
        </section>
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
