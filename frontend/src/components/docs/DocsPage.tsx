import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { GRAPH_NODES } from './docsData'
import KnowledgeGraph from './KnowledgeGraph'
import DocPanel from './DocPanel'
import DocsMiniChat from './DocsMiniChat'
import FlowShieldLogo from '@/components/FlowShieldLogo'

function LegendShape({ shape, color }: { shape: string; color: string }) {
  const s = 10
  const h = s / 2
  let points: string
  switch (shape) {
    case 'diamond':
      points = `${h},0 ${s},${h} ${h},${s} 0,${h}`
      break
    case 'hexagon':
      points = Array.from({ length: 6 }, (_, i) => {
        const a = (Math.PI / 3) * i - Math.PI / 2
        return `${h + h * Math.cos(a)},${h + h * Math.sin(a)}`
      }).join(' ')
      break
    case 'triangle':
      points = `${h},0 ${s},${s} 0,${s}`
      break
    case 'square':
      return <span className="block w-2.5 h-2.5 rounded-[2px]" style={{ backgroundColor: color }} />
    default:
      return <span className="block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
  }
  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
      <polygon points={points} fill={color} />
    </svg>
  )
}

export default function DocsPage() {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

  const selectedNode = selectedNodeId
    ? GRAPH_NODES.find(n => n.id === selectedNodeId) ?? null
    : null

  return (
    <div className="relative w-full h-[calc(100vh-5rem)] md:h-[calc(100vh-4rem)] rounded-xl border border-white/[0.06] bg-[#060e09] overflow-hidden">
      {/* Graph fills the container */}
      <KnowledgeGraph
        selectedNodeId={selectedNodeId}
        onNodeSelect={(id) => setSelectedNodeId(id)}
      />

      {/* Header — logo + legend */}
      <div className="absolute top-4 left-4 right-4 flex items-center gap-5 pointer-events-none">
        <div className="flex items-center gap-2 shrink-0">
          <FlowShieldLogo size={22} />
          <span className="text-[14px] font-semibold text-white/80 tracking-tight">Docs</span>
        </div>
        <div className="w-px h-4 bg-white/[0.08]" />
        <div className="flex flex-wrap gap-3">
          {[
            { label: 'Frontend', color: '#34d399', shape: 'circle' },
            { label: 'Backend', color: '#a78bfa', shape: 'square' },
            { label: 'Contracts', color: '#22d3ee', shape: 'diamond' },
            { label: 'Agents', color: '#fbbf24', shape: 'hexagon' },
            { label: 'Infrastructure', color: '#fb7185', shape: 'triangle' },
          ].map(g => (
            <div key={g.label} className="flex items-center gap-1.5">
              <LegendShape shape={g.shape} color={g.color} />
              <span className="text-[10px] text-white/35 font-medium">{g.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Hint */}
      {!selectedNodeId && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[11px] text-white/20 pointer-events-none">
          Click a node to view documentation
        </div>
      )}

      {/* Slide-in doc panel */}
      <AnimatePresence>
        {selectedNode && (
          <DocPanel node={selectedNode} onClose={() => setSelectedNodeId(null)} />
        )}
      </AnimatePresence>

      {/* Mini AI chat */}
      <DocsMiniChat />
    </div>
  )
}
