import { useState, useCallback } from 'react'
import {
  ReactFlow,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

const INITIAL_NODES = [
  { id: '1', position: { x: 200, y: 80 }, data: { label: 'Начало' }, style: { background: '#4f8ef7', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px' } },
  { id: '2', position: { x: 200, y: 200 }, data: { label: 'Шаг 1' }, style: { borderRadius: 8, padding: '10px 18px' } },
  { id: '3', position: { x: 200, y: 320 }, data: { label: 'Конец' }, style: { background: '#e74c3c', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px' } },
]

const INITIAL_EDGES = [
  { id: 'e1-2', source: '1', target: '2', animated: true },
  { id: 'e2-3', source: '2', target: '3', animated: true },
]

function newDiagramNodes() {
  return [
    { id: '1', position: { x: 200, y: 80 }, data: { label: 'Начало' }, style: { background: '#4f8ef7', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px' } },
  ]
}

export default function DiagramPage() {
  const [diagrams, setDiagrams] = useState([
    { id: 1, name: 'Схема продаж', nodes: INITIAL_NODES, edges: INITIAL_EDGES },
  ])
  const [selectedId, setSelectedId] = useState(1)
  const [nodes, setNodes, onNodesChange] = useNodesState(INITIAL_NODES)
  const [edges, setEdges, onEdgesChange] = useEdgesState(INITIAL_EDGES)
  const [editingId, setEditingId] = useState(null)
  const [editingName, setEditingName] = useState('')

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  )

  function selectDiagram(d) {
    setDiagrams((prev) => prev.map((x) => x.id === selectedId ? { ...x, nodes, edges } : x))
    setNodes(d.nodes)
    setEdges(d.edges)
    setSelectedId(d.id)
  }

  function createDiagram() {
    const id = Date.now()
    const name = `Диаграмма ${diagrams.length + 1}`
    const newNodes = newDiagramNodes()
    const newDiagram = { id, name, nodes: newNodes, edges: [] }
    setDiagrams((prev) => {
      const updated = prev.map((x) => x.id === selectedId ? { ...x, nodes, edges } : x)
      return [...updated, newDiagram]
    })
    setNodes(newNodes)
    setEdges([])
    setSelectedId(id)
  }

  function startRename(d) {
    setEditingId(d.id)
    setEditingName(d.name)
  }

  function commitRename(id) {
    if (editingName.trim()) {
      setDiagrams((prev) => prev.map((x) => x.id === id ? { ...x, name: editingName.trim() } : x))
    }
    setEditingId(null)
  }

  function deleteDiagram(id) {
    if (diagrams.length === 1) return
    const next = diagrams.find((d) => d.id !== id)
    setDiagrams((prev) => prev.filter((d) => d.id !== id))
    setNodes(next.nodes)
    setEdges(next.edges)
    setSelectedId(next.id)
  }

  return (
    <div className="diagram-page">
      <div className="diagram-canvas">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
          deleteKeyCode="Delete"
        >
          <Controls />
          <MiniMap zoomable pannable />
          <Background gap={16} />
        </ReactFlow>
      </div>
      <aside className="diagram-sidebar">
        <button className="btn-primary diagram-create-btn" onClick={createDiagram}>
          + Создать диаграмму
        </button>
        <div className="diagram-list">
          {diagrams.map((d) => (
            <div
              key={d.id}
              className={`diagram-list-item${d.id === selectedId ? ' active' : ''}`}
              onClick={() => selectDiagram(d)}
            >
              {editingId === d.id ? (
                <input
                  className="diagram-rename-input"
                  value={editingName}
                  autoFocus
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={() => commitRename(d.id)}
                  onKeyDown={(e) => { if (e.key === 'Enter') commitRename(d.id) }}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className="diagram-list-name">{d.name}</span>
              )}
              <div className="diagram-list-actions">
                <button
                  className="diagram-icon-btn"
                  title="Переименовать"
                  onClick={(e) => { e.stopPropagation(); startRename(d) }}
                >✎</button>
                <button
                  className="diagram-icon-btn diagram-icon-btn-danger"
                  title="Удалить"
                  onClick={(e) => { e.stopPropagation(); deleteDiagram(d.id) }}
                  disabled={diagrams.length === 1}
                >✕</button>
              </div>
            </div>
          ))}
        </div>
      </aside>
    </div>
  )
}
