import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { GRAPH_NODES } from './docsData'
import KnowledgeGraph from './KnowledgeGraph'
import DocPanel from './DocPanel'
import DocsMiniChat from './DocsMiniChat'
import FlowShieldLogo from '@/components/FlowShieldLogo'

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
            { label: 'Frontend', color: '#34d399', shape: 'rounded-full' },
            { label: 'Backend', color: '#a78bfa', shape: 'rounded-[2px]' },
            { label: 'Contracts', color: '#22d3ee', shape: 'rotate-45 rounded-[1px]' },
            { label: 'Agents', color: '#fbbf24', shape: 'rotate-45 rounded-[1px]' },
            { label: 'Infrastructure', color: '#fb7185', shape: 'rounded-sm' },
          ].map(g => (
            <div key={g.label} className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 ${g.shape}`} style={{ backgroundColor: g.color }} />
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
