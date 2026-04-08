import { useState, useCallback, useRef, useEffect } from 'react'
import {
  ReactFlow, addEdge, useNodesState, useEdgesState,
  Controls, Background, MiniMap, ReactFlowProvider,
  Handle, Position, MarkerType, useReactFlow,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

// ── Node type definitions ──────────────────────────────────
const NODE_TYPES = {
  process:  { label: 'Процесс',  bg: '#0d1d3a', color: '#7ab3f7', border: '#1e3e6e', radius: 6,  dashed: false },
  start:    { label: 'Начало',   bg: '#0d2a0d', color: '#5dde6e', border: '#1e5a1e', radius: 24, dashed: false },
  end:      { label: 'Конец',    bg: '#2a0d0d', color: '#e86060', border: '#5a1e1e', radius: 24, dashed: false },
  decision: { label: 'Решение',  bg: '#2a1a05', color: '#f0b840', border: '#6a4010', radius: 6,  dashed: false },
  note:     { label: 'Заметка',  bg: '#0d0d2a', color: '#9090d0', border: '#4040a0', radius: 4,  dashed: true  },
}

function makeNode(type, pos, label) {
  const t = NODE_TYPES[type] || NODE_TYPES.process
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type: 'rfNode',
    position: pos,
    data: { label: label ?? t.label, nodeType: type, bg: t.bg, color: t.color, border: t.border, radius: t.radius, dashed: t.dashed },
  }
}

function parseJson(str) {
  try { return JSON.parse(str) } catch { return [] }
}

// ── Custom node component ──────────────────────────────────
function RfNode({ data, selected }) {
  return (
    <div style={{
      background: data.bg,
      border: `${data.dashed ? '1.5px dashed' : '1.5px solid'} ${selected ? '#4f8ef7' : data.border}`,
      borderRadius: data.radius ?? 6,
      color: data.color,
      padding: '8px 16px',
      minWidth: 110,
      textAlign: 'center',
      fontSize: 13,
      fontWeight: 500,
      userSelect: 'none',
      boxShadow: selected ? '0 0 0 2px rgba(79,142,247,0.25)' : 'none',
    }}>
      <Handle type="target" position={Position.Top}   style={{ background: '#4f8ef7', width: 8, height: 8 }} />
      <Handle type="target" position={Position.Left}  id="l" style={{ background: '#4f8ef7', width: 8, height: 8 }} />
      <div>{data.label}</div>
      <Handle type="source" position={Position.Bottom} style={{ background: '#4f8ef7', width: 8, height: 8 }} />
      <Handle type="source" position={Position.Right}  id="r" style={{ background: '#4f8ef7', width: 8, height: 8 }} />
    </div>
  )
}

const RF_NODE_TYPES = { rfNode: RfNode }

// ── Main editor ────────────────────────────────────────────
function DiagramEditor({ authFetch }) {
  const rf = useReactFlow()

  const [diagrams,  setDiagrams]  = useState([])
  const [activeId,  setActiveId]  = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])

  const nodesRef      = useRef(nodes)
  const edgesRef      = useRef(edges)
  const activeIdRef   = useRef(activeId)
  const diagramsRef   = useRef(diagrams)
  const initialized   = useRef(false)

  useEffect(() => { nodesRef.current    = nodes    }, [nodes])
  useEffect(() => { edgesRef.current    = edges    }, [edges])
  useEffect(() => { activeIdRef.current = activeId }, [activeId])
  useEffect(() => { diagramsRef.current = diagrams }, [diagrams])

  // UI state
  const [selNodes,    setSelNodes]    = useState([])
  const [selEdges,    setSelEdges]    = useState([])
  const [editNode,    setEditNode]    = useState(null)
  const [editEdge,    setEditEdge]    = useState(null)
  const [renamingId,  setRenamingId]  = useState(null)
  const [renamingVal, setRenamingVal] = useState('')
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [savedAt,     setSavedAt]     = useState(null)
  const [saveError,   setSaveError]   = useState(false)
  const [fullscreen,  setFullscreen]  = useState(false)

  const pageRef = useRef(null)

  function toggleFullscreen() {
    if (!fullscreen) {
      pageRef.current?.requestFullscreen?.()
    } else {
      document.exitFullscreen?.()
    }
  }

  useEffect(() => {
    function onFsChange() { setFullscreen(!!document.fullscreenElement) }
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  // History
  const history  = useRef([])
  const histIdx  = useRef(0)
  const skipHist = useRef(false)

  function pushHistory(ns, es) {
    if (skipHist.current) return
    history.current = history.current.slice(0, histIdx.current + 1)
    history.current.push({ nodes: JSON.parse(JSON.stringify(ns)), edges: JSON.parse(JSON.stringify(es)) })
    histIdx.current = history.current.length - 1
  }

  function applyHistory(idx) {
    const snap = history.current[idx]
    if (!snap) return
    skipHist.current = true
    setNodes(JSON.parse(JSON.stringify(snap.nodes)))
    setEdges(JSON.parse(JSON.stringify(snap.edges)))
    histIdx.current = idx
    setTimeout(() => { skipHist.current = false }, 0)
  }

  const canUndo = histIdx.current > 0
  const canRedo = histIdx.current < history.current.length - 1

  // Load diagrams from API
  useEffect(() => {
    authFetch('/api/diagrams')
      .then(r => r.json())
      .then(data => {
        if (!data.length) {
          // Create initial diagram
          const n1 = makeNode('start',    { x: 220, y: 60  }, 'Начало')
          const n2 = makeNode('process',  { x: 180, y: 170 }, 'Обработка заявки')
          const n3 = makeNode('decision', { x: 180, y: 300 }, 'Клиент согласен?')
          const n4 = makeNode('end',      { x: 60,  y: 430 }, 'Отказ')
          const n5 = makeNode('end',      { x: 320, y: 430 }, 'Продажа')
          const mk = (id, src, tgt, lbl) => ({ id, source: src, target: tgt, label: lbl, markerEnd: { type: MarkerType.ArrowClosed, color: '#4f8ef7' } })
          const initNodes = [n1, n2, n3, n4, n5]
          const initEdges = [
            { ...mk('e1', n1.id, n2.id), animated: true },
            mk('e2', n2.id, n3.id),
            mk('e3', n3.id, n4.id, 'Нет'),
            { ...mk('e4', n3.id, n5.id, 'Да'), sourceHandle: 'r' },
          ]
          return authFetch('/api/diagrams', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Схема продаж', nodesJson: JSON.stringify(initNodes), edgesJson: JSON.stringify(initEdges) })
          }).then(r => r.json()).then(d => [{ id: d.id, name: d.name, nodes: initNodes, edges: initEdges }])
        }
        return data.map(d => ({ id: d.id, name: d.name, nodes: parseJson(d.nodesJson), edges: parseJson(d.edgesJson) }))
      })
      .then(diags => {
        setDiagrams(diags)
        setActiveId(diags[0].id)
        setNodes(diags[0].nodes)
        setEdges(diags[0].edges)
        history.current = [{ nodes: diags[0].nodes, edges: diags[0].edges }]
        histIdx.current = 0
        initialized.current = true
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Auto-save to API (debounced 1.5s)
  useEffect(() => {
    if (!initialized.current || !activeIdRef.current) return
    const timer = setTimeout(() => {
      const name = diagramsRef.current.find(d => d.id === activeIdRef.current)?.name
      authFetch(`/api/diagrams/${activeIdRef.current}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, nodesJson: JSON.stringify(nodesRef.current), edgesJson: JSON.stringify(edgesRef.current) })
      })
        .then(() => { setSavedAt(new Date()); setSaveError(false) })
        .catch(() => setSaveError(true))
    }, 1500)
    return () => clearTimeout(timer)
  }, [nodes, edges])

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e) {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return
      const mod = e.ctrlKey || e.metaKey
      if (mod && e.key === 'z' && !e.shiftKey) { e.preventDefault(); if (canUndo) applyHistory(histIdx.current - 1) }
      if (mod && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); if (canRedo) applyHistory(histIdx.current + 1) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [canUndo, canRedo])

  // Add node at viewport center
  function addNode(type) {
    const vp = rf.getViewport()
    const cx = (window.innerWidth  * 0.45 - vp.x) / vp.zoom
    const cy = (window.innerHeight * 0.45 - vp.y) / vp.zoom
    const node = makeNode(type, { x: cx + Math.random() * 80 - 40, y: cy + Math.random() * 80 - 40 })
    setNodes(ns => { const next = [...ns, node]; pushHistory(next, edgesRef.current); return next })
    setShowAddMenu(false)
  }

  const onConnect = useCallback((params) => {
    const edge = { ...params, id: `e-${Date.now()}`, markerEnd: { type: MarkerType.ArrowClosed, color: '#4f8ef7' } }
    setEdges(es => { const next = addEdge(edge, es); pushHistory(nodesRef.current, next); return next })
  }, [])

  const onNodeDoubleClick = useCallback((_, node) => setEditNode({ id: node.id, label: node.data.label }), [])

  function commitNodeLabel() {
    if (!editNode) return
    setNodes(ns => { const next = ns.map(n => n.id === editNode.id ? { ...n, data: { ...n.data, label: editNode.label } } : n); pushHistory(next, edgesRef.current); return next })
    setEditNode(null)
  }

  const onEdgeDoubleClick = useCallback((_, edge) => setEditEdge({ id: edge.id, label: edge.label || '' }), [])

  function commitEdgeLabel() {
    if (!editEdge) return
    setEdges(es => es.map(e => e.id === editEdge.id ? { ...e, label: editEdge.label } : e))
    setEditEdge(null)
  }

  const onNodeDragStop = useCallback(() => pushHistory(nodesRef.current, edgesRef.current), [])
  const onNodesDelete  = useCallback(() => setTimeout(() => pushHistory(nodesRef.current, edgesRef.current), 0), [])
  const onEdgesDelete  = useCallback(() => setTimeout(() => pushHistory(nodesRef.current, edgesRef.current), 0), [])
  const onSelectionChange = useCallback(({ nodes: sn, edges: se }) => { setSelNodes(sn); setSelEdges(se) }, [])

  function setNodeProp(key, value) {
    const id = selNodes[0]?.id; if (!id) return
    setNodes(ns => ns.map(n => n.id === id ? { ...n, data: { ...n.data, [key]: value } } : n))
  }

  function changeNodeType(id, type) {
    const t = NODE_TYPES[type]
    setNodes(ns => ns.map(n => n.id === id
      ? { ...n, data: { ...n.data, nodeType: type, bg: t.bg, color: t.color, border: t.border, radius: t.radius, dashed: t.dashed } }
      : n))
  }

  function setEdgeProp(key, value) {
    const id = selEdges[0]?.id; if (!id) return
    setEdges(es => es.map(e => e.id === id ? { ...e, [key]: value } : e))
  }

  function deleteSelectedNode() {
    const id = selNodes[0]?.id; if (!id) return
    setNodes(ns => { const next = ns.filter(n => n.id !== id); pushHistory(next, edgesRef.current); return next })
    setEdges(es => { const next = es.filter(e => e.source !== id && e.target !== id); edgesRef.current = next; return next })
  }

  function deleteSelectedEdge() {
    const id = selEdges[0]?.id; if (!id) return
    setEdges(es => { const next = es.filter(e => e.id !== id); pushHistory(nodesRef.current, next); return next })
  }

  function switchDiagram(d) {
    if (d.id === activeId) return
    setDiagrams(prev => prev.map(x => x.id === activeId ? { ...x, nodes: nodesRef.current, edges: edgesRef.current } : x))
    setNodes(d.nodes); setEdges(d.edges); setActiveId(d.id)
    history.current = [{ nodes: d.nodes, edges: d.edges }]; histIdx.current = 0
  }

  function createDiagram() {
    const name = `Диаграмма ${diagrams.length + 1}`
    const n = makeNode('start', { x: 200, y: 80 }, 'Начало')
    authFetch('/api/diagrams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, nodesJson: JSON.stringify([n]), edgesJson: '[]' })
    })
      .then(r => r.json())
      .then(d => {
        const newDiagram = { id: d.id, name: d.name, nodes: [n], edges: [] }
        setDiagrams(prev => [...prev.map(x => x.id === activeId ? { ...x, nodes: nodesRef.current, edges: edgesRef.current } : x), newDiagram])
        setNodes([n]); setEdges([]); setActiveId(d.id)
        history.current = [{ nodes: [n], edges: [] }]; histIdx.current = 0
      })
      .catch(() => {})
  }

  function deleteDiagram(id) {
    if (diagrams.length === 1) return
    authFetch(`/api/diagrams/${id}`, { method: 'DELETE' }).catch(() => {})
    const next = diagrams.find(d => d.id !== id)
    setDiagrams(prev => prev.filter(d => d.id !== id))
    if (id === activeId) { setNodes(next.nodes); setEdges(next.edges); setActiveId(next.id) }
  }

  function commitRename(id) {
    if (renamingVal.trim()) {
      setDiagrams(prev => prev.map(x => x.id === id ? { ...x, name: renamingVal.trim() } : x))
      authFetch(`/api/diagrams/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: renamingVal.trim() })
      }).catch(() => {})
    }
    setRenamingId(null)
  }

  function exportJSON() {
    const data = JSON.stringify({ name: diagrams.find(d => d.id === activeId)?.name, nodes, edges }, null, 2)
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([data], { type: 'application/json' })), download: `diagram.json` })
    a.click()
  }

  function importJSON(e) {
    const file = e.target.files[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const d = JSON.parse(ev.target.result)
        const name = d.name || 'Импорт'
        const importNodes = d.nodes || []
        const importEdges = d.edges || []
        authFetch('/api/diagrams', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, nodesJson: JSON.stringify(importNodes), edgesJson: JSON.stringify(importEdges) })
        })
          .then(r => r.json())
          .then(created => {
            const newDiagram = { id: created.id, name: created.name, nodes: importNodes, edges: importEdges }
            setDiagrams(prev => [...prev.map(x => x.id === activeId ? { ...x, nodes: nodesRef.current, edges: edgesRef.current } : x), newDiagram])
            setNodes(importNodes); setEdges(importEdges); setActiveId(created.id)
          })
          .catch(() => alert('Ошибка импорта'))
      } catch { alert('Неверный формат файла') }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const selNode = selNodes[0] ? nodes.find(n => n.id === selNodes[0].id) : null
  const selEdge = selEdges[0] ? edges.find(e => e.id === selEdges[0].id) : null

  if (loading) {
    return <div className="diagram-loading">Загрузка диаграмм...</div>
  }

  return (
    <div className="diagram-page" ref={pageRef} onClick={() => setShowAddMenu(false)}>

      {/* ── Canvas ── */}
      <div className="diagram-canvas">
        <div className="diagram-toolbar" onClick={e => e.stopPropagation()}>
          <div style={{ position: 'relative' }}>
            <button className="btn-primary diagram-toolbar-btn" onClick={() => setShowAddMenu(v => !v)}>+ Узел ▾</button>
            {showAddMenu && (
              <div className="diagram-add-menu">
                {Object.entries(NODE_TYPES).map(([type, meta]) => (
                  <button key={type} className="diagram-add-menu-item" style={{ color: meta.color }} onClick={() => addNode(type)}>
                    {meta.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button className="diagram-toolbar-icon-btn" onClick={() => applyHistory(histIdx.current - 1)} disabled={!canUndo} title="Ctrl+Z">↩ Отменить</button>
          <button className="diagram-toolbar-icon-btn" onClick={() => applyHistory(histIdx.current + 1)} disabled={!canRedo} title="Ctrl+Y">↪ Повторить</button>
          <button className="diagram-toolbar-icon-btn" onClick={toggleFullscreen} title={fullscreen ? 'Выйти из полного экрана' : 'На весь экран'}>
            {fullscreen ? '⊡ Свернуть' : '⊞ На весь экран'}
          </button>
          {saveError
            ? <span className="diagram-saved-hint" style={{ color: '#e86060' }}>Ошибка сохранения</span>
            : savedAt && <span className="diagram-saved-hint">Сохранено {savedAt.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })}</span>
          }
          <span className="diagram-toolbar-hint">Двойной клик — редактировать · Delete — удалить · Тянуть от края — соединить</span>
        </div>

        <ReactFlow
          nodes={nodes} edges={edges}
          nodeTypes={RF_NODE_TYPES}
          onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDoubleClick={onNodeDoubleClick} onEdgeDoubleClick={onEdgeDoubleClick}
          onNodeDragStop={onNodeDragStop}
          onNodesDelete={onNodesDelete} onEdgesDelete={onEdgesDelete}
          onSelectionChange={onSelectionChange}
          fitView deleteKeyCode="Delete"
        >
          <Controls />
          <MiniMap zoomable pannable nodeColor={n => n.data?.color || '#4f8ef7'} />
          <Background gap={16} />
        </ReactFlow>

        {editNode && (
          <div className="diagram-overlay" onClick={commitNodeLabel}>
            <div className="diagram-popup" onClick={e => e.stopPropagation()}>
              <div className="diagram-popup-title">Текст узла</div>
              <input className="diagram-popup-input" autoFocus value={editNode.label}
                onChange={e => setEditNode({ ...editNode, label: e.target.value })}
                onKeyDown={e => { if (e.key === 'Enter') commitNodeLabel(); if (e.key === 'Escape') setEditNode(null) }}
              />
              <div className="diagram-popup-actions">
                <button className="btn-primary" onClick={commitNodeLabel}>Сохранить</button>
                <button className="btn-secondary" onClick={() => setEditNode(null)}>Отмена</button>
              </div>
            </div>
          </div>
        )}

        {editEdge && (
          <div className="diagram-overlay" onClick={commitEdgeLabel}>
            <div className="diagram-popup" onClick={e => e.stopPropagation()}>
              <div className="diagram-popup-title">Подпись связи</div>
              <input className="diagram-popup-input" autoFocus value={editEdge.label} placeholder="Оставьте пустым чтобы убрать"
                onChange={e => setEditEdge({ ...editEdge, label: e.target.value })}
                onKeyDown={e => { if (e.key === 'Enter') commitEdgeLabel(); if (e.key === 'Escape') setEditEdge(null) }}
              />
              <div className="diagram-popup-actions">
                <button className="btn-primary" onClick={commitEdgeLabel}>Сохранить</button>
                <button className="btn-secondary" onClick={() => setEditEdge(null)}>Отмена</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Right sidebar ── */}
      <aside className="diagram-sidebar" onClick={e => e.stopPropagation()}>
        {selNode ? (
          <div className="diagram-props">
            <div className="diagram-props-title">Свойства узла</div>
            <label className="diagram-props-label">Текст</label>
            <input className="diagram-props-input" value={selNode.data.label}
              onChange={e => setNodeProp('label', e.target.value)}
              onBlur={() => pushHistory(nodes, edges)} />
            <label className="diagram-props-label">Тип</label>
            <select className="diagram-props-select" value={selNode.data.nodeType || 'process'}
              onChange={e => changeNodeType(selNode.id, e.target.value)}>
              {Object.entries(NODE_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <label className="diagram-props-label">Цвет фона</label>
            <input type="color" className="diagram-props-color" value={selNode.data.bg} onChange={e => setNodeProp('bg', e.target.value)} />
            <label className="diagram-props-label">Цвет текста</label>
            <input type="color" className="diagram-props-color" value={selNode.data.color} onChange={e => setNodeProp('color', e.target.value)} />
            <label className="diagram-props-label">Цвет рамки</label>
            <input type="color" className="diagram-props-color" value={selNode.data.border} onChange={e => setNodeProp('border', e.target.value)} />
            <label className="diagram-props-label">Скругление: {selNode.data.radius ?? 6}px</label>
            <input type="range" min={0} max={40} className="diagram-props-range" value={selNode.data.radius ?? 6} onChange={e => setNodeProp('radius', Number(e.target.value))} />
            <label className="diagram-props-checkbox">
              <input type="checkbox" checked={selNode.data.dashed || false} onChange={e => setNodeProp('dashed', e.target.checked)} />
              Пунктирная рамка
            </label>
            <button className="btn-danger diagram-delete-btn" onClick={deleteSelectedNode}>Удалить узел</button>
          </div>
        ) : selEdge ? (
          <div className="diagram-props">
            <div className="diagram-props-title">Свойства связи</div>
            <label className="diagram-props-label">Подпись</label>
            <input className="diagram-props-input" value={selEdge.label || ''} placeholder="нет" onChange={e => setEdgeProp('label', e.target.value)} />
            <label className="diagram-props-label">Тип линии</label>
            <select className="diagram-props-select" value={selEdge.type || 'default'} onChange={e => setEdgeProp('type', e.target.value)}>
              <option value="default">Изогнутая</option>
              <option value="straight">Прямая</option>
              <option value="step">Ступенчатая</option>
              <option value="smoothstep">Плавная ступень</option>
            </select>
            <label className="diagram-props-checkbox">
              <input type="checkbox" checked={selEdge.animated || false} onChange={e => setEdgeProp('animated', e.target.checked)} />
              Анимация
            </label>
            <button className="btn-danger diagram-delete-btn" onClick={deleteSelectedEdge}>Удалить связь</button>
          </div>
        ) : (
          <div className="diagram-props-hint">Выберите узел или связь для настройки свойств</div>
        )}

        <div className="diagram-sidebar-divider" />

        <button className="btn-primary diagram-create-btn" onClick={createDiagram}>+ Создать диаграмму</button>

        <div className="diagram-list">
          {diagrams.map(d => (
            <div key={d.id} className={`diagram-list-item${d.id === activeId ? ' active' : ''}`} onClick={() => switchDiagram(d)}>
              {renamingId === d.id ? (
                <input className="diagram-rename-input" value={renamingVal} autoFocus
                  onChange={e => setRenamingVal(e.target.value)}
                  onBlur={() => commitRename(d.id)}
                  onKeyDown={e => { if (e.key === 'Enter') commitRename(d.id) }}
                  onClick={e => e.stopPropagation()} />
              ) : (
                <span className="diagram-list-name">{d.name}</span>
              )}
              <div className="diagram-list-actions">
                <button className="diagram-icon-btn" title="Переименовать"
                  onClick={e => { e.stopPropagation(); setRenamingId(d.id); setRenamingVal(d.name) }}>✎</button>
                <button className="diagram-icon-btn diagram-icon-btn-danger" title="Удалить"
                  disabled={diagrams.length === 1}
                  onClick={e => { e.stopPropagation(); deleteDiagram(d.id) }}>✕</button>
              </div>
            </div>
          ))}
        </div>
      </aside>
    </div>
  )
}

export default function DiagramPage({ authFetch }) {
  return (
    <ReactFlowProvider>
      <DiagramEditor authFetch={authFetch} />
    </ReactFlowProvider>
  )
}
