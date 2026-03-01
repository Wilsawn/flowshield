import { useCallback, useMemo } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  MarkerType,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

/* ─── Custom Node: Dashboard ─── */
function DashboardNode() {
  return (
    <div className="w-[380px] rounded-2xl border border-white/[0.08] bg-[#0c1018]/95 backdrop-blur-xl shadow-2xl shadow-black/50 overflow-hidden">
      <Handle type="source" position={Position.Right} id="dash-out" className="!w-2.5 !h-2.5 !bg-emerald-400 !border-2 !border-emerald-400/30" />
      <Handle type="source" position={Position.Bottom} id="dash-bottom" className="!w-2.5 !h-2.5 !bg-emerald-400 !border-2 !border-emerald-400/30" />
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]">
        <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
        <span className="ml-3 text-[11px] text-white/25 font-medium">FlowShield — Dashboard</span>
        <span className="ml-auto text-[8px] text-white/15 italic">Illustrative example</span>
      </div>
      <div className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] text-white/20 uppercase tracking-wider">Risk Score</p>
            <p className="text-[28px] font-bold text-emerald-400 leading-none mt-1">12</p>
          </div>
          <div className="px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <span className="text-[10px] font-semibold text-emerald-400">COMPLIANT</span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Balance', value: '199,999 FLOW', color: 'text-white/60' },
            { label: 'Deposited', value: '50,000 USDC', color: 'text-emerald-400/70' },
            { label: 'Borrowed', value: '12,000 USDC', color: 'text-cyan-400/70' },
          ].map(s => (
            <div key={s.label} className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-3">
              <p className="text-[9px] text-white/20 uppercase">{s.label}</p>
              <p className={`text-[12px] font-semibold mt-1 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/[0.04] border border-emerald-500/10">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] text-emerald-400/60 font-medium">Flow Testnet · Block #98,412,087</span>
          <span className="ml-auto text-[9px] text-white/15">Gas: Sponsored</span>
        </div>
      </div>
    </div>
  )
}

/* ─── Custom Node: Builder Copilot ─── */
function CopilotNode() {
  return (
    <div className="w-[340px] rounded-2xl border border-white/[0.08] bg-[#0c1018]/95 backdrop-blur-xl shadow-2xl shadow-black/50 overflow-hidden">
      <Handle type="target" position={Position.Left} id="cop-in" className="!w-2.5 !h-2.5 !bg-cyan-400 !border-2 !border-cyan-400/30" />
      <Handle type="source" position={Position.Bottom} id="cop-out" className="!w-2.5 !h-2.5 !bg-cyan-400 !border-2 !border-cyan-400/30" />
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]">
        <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
        <span className="ml-3 text-[11px] text-white/25 font-medium">Builder Copilot</span>
      </div>
      <div className="p-4 space-y-3">
        <div className="flex justify-end">
          <div className="max-w-[80%] px-3.5 py-2.5 rounded-2xl rounded-br-md bg-emerald-500/15 border border-emerald-500/20">
            <p className="text-[12px] text-white/70">Does my Cadence contract handle the travel rule for EU users?</p>
          </div>
        </div>
        <div className="flex justify-start">
          <div className="max-w-[90%] px-3.5 py-2.5 rounded-2xl rounded-bl-md bg-white/[0.03] border border-white/[0.06]">
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="w-4 h-4 rounded-md bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center text-[8px] font-bold text-[#060a13]">AI</span>
              <span className="text-[10px] text-white/25">FlowShield Copilot</span>
            </div>
            <p className="text-[12px] text-white/50 leading-relaxed">Your contract checks <code className="text-[11px] px-1 py-0.5 rounded bg-white/[0.06] text-emerald-400/80 font-mono">isCompliant()</code> but doesn't enforce the <span className="text-amber-400/80 font-medium">MiCA travel rule threshold</span> of €1,000.</p>
          </div>
        </div>
        <div className="flex gap-2 ml-1">
          <span className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-medium text-emerald-400">Apply Fix</span>
          <span className="px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-[10px] font-medium text-white/30">View Code</span>
        </div>
      </div>
    </div>
  )
}

/* ─── Custom Node: Regulatory Radar ─── */
function RadarNode() {
  return (
    <div className="w-[400px] rounded-2xl border border-white/[0.08] bg-[#0c1018]/95 backdrop-blur-xl shadow-2xl shadow-black/50 overflow-hidden">
      <Handle type="target" position={Position.Top} id="radar-in" className="!w-2.5 !h-2.5 !bg-amber-400 !border-2 !border-amber-400/30" />
      <Handle type="target" position={Position.Left} id="radar-left" className="!w-2.5 !h-2.5 !bg-amber-400 !border-2 !border-amber-400/30" />
      <Handle type="source" position={Position.Right} id="radar-right" className="!w-2.5 !h-2.5 !bg-emerald-400 !border-2 !border-emerald-400/30" />
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]">
        <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
        <span className="ml-3 text-[11px] text-white/25 font-medium">Regulatory Radar</span>
        <span className="ml-auto text-[8px] text-white/15 italic">Sample data</span>
      </div>
      <div className="p-4">
        <div className="flex items-center gap-1 mb-4">
          {[
            { label: 'AI Scans', done: true },
            { label: 'Finds Gaps', done: true },
            { label: 'Human Reviews', active: true },
            { label: 'Push On-Chain', done: false },
          ].map((s, i) => (
            <div key={i} className="flex items-center flex-1">
              <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg flex-1 text-[9px] font-medium border ${
                s.done ? 'bg-emerald-500/[0.06] border-emerald-500/15 text-emerald-400/60' :
                s.active ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400' :
                'bg-white/[0.01] border-white/[0.04] text-white/20'
              }`}>
                {s.done && <span className="text-emerald-400">✓</span>}
                {s.active && <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />}
                <span className="truncate">{s.label}</span>
              </div>
              {i < 3 && <span className="text-white/10 mx-0.5 shrink-0">›</span>}
            </div>
          ))}
        </div>
        <div className="rounded-xl bg-amber-500/[0.04] border border-amber-500/15 p-3 flex items-start gap-3">
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-amber-400 text-[11px]">!</span>
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-white/70">EU — MiCA Travel Rule Gap</p>
            <p className="text-[10px] text-white/30 mt-0.5">Threshold should be €1,000 but is set to $3,000</p>
            <div className="flex gap-2 mt-2">
              <span className="px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-medium text-emerald-400">Approve Fix</span>
              <span className="px-2 py-1 rounded bg-white/[0.03] border border-white/[0.06] text-[9px] font-medium text-white/25">Reject</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Custom Node: Small status badge ─── */
function StatusNode({ data }) {
  return (
    <div className="px-4 py-2.5 rounded-xl border border-white/[0.06] bg-[#0c1018]/90 backdrop-blur-xl shadow-lg shadow-black/30">
      <Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-emerald-400/50 !border-emerald-400/20" />
      <Handle type="source" position={Position.Right} className="!w-2 !h-2 !bg-emerald-400/50 !border-emerald-400/20" />
      <div className="flex items-center gap-2">
        <span className={`w-1.5 h-1.5 rounded-full ${data.color || 'bg-emerald-400'} ${data.pulse ? 'animate-pulse' : ''}`} />
        <span className="text-[10px] font-medium text-white/40">{data.label}</span>
        {data.badge && (
          <span className={`text-[8px] px-1.5 py-0.5 rounded font-semibold ${data.badgeClass || 'bg-emerald-500/10 text-emerald-400'}`}>{data.badge}</span>
        )}
      </div>
    </div>
  )
}

const nodeTypes = {
  dashboard: DashboardNode,
  copilot: CopilotNode,
  radar: RadarNode,
  status: StatusNode,
}

const initialNodes = [
  {
    id: 'dashboard',
    type: 'dashboard',
    position: { x: 0, y: 40 },
  },
  {
    id: 'copilot',
    type: 'copilot',
    position: { x: 520, y: 0 },
  },
  {
    id: 'radar',
    type: 'radar',
    position: { x: 200, y: 380 },
  },
  {
    id: 'status-flow',
    type: 'status',
    position: { x: 660, y: 480 },
    data: { label: 'Flow Testnet', color: 'bg-emerald-400', pulse: true, badge: 'LIVE', badgeClass: 'bg-emerald-500/10 text-emerald-400' },
  },
  {
    id: 'status-compliance',
    type: 'status',
    position: { x: -60, y: 380 },
    data: { label: 'Compliance Check', color: 'bg-cyan-400', pulse: false, badge: 'PASSED', badgeClass: 'bg-cyan-500/10 text-cyan-400' },
  },
]

const initialEdges = [
  {
    id: 'dash-to-copilot',
    source: 'dashboard',
    target: 'copilot',
    sourceHandle: 'dash-out',
    targetHandle: 'cop-in',
    animated: true,
    style: { stroke: 'rgba(52,211,153,0.25)', strokeWidth: 1.5 },
    markerEnd: { type: MarkerType.ArrowClosed, color: 'rgba(52,211,153,0.4)', width: 16, height: 16 },
  },
  {
    id: 'copilot-to-radar',
    source: 'copilot',
    target: 'radar',
    sourceHandle: 'cop-out',
    targetHandle: 'radar-in',
    animated: true,
    style: { stroke: 'rgba(34,211,238,0.2)', strokeWidth: 1.5 },
    markerEnd: { type: MarkerType.ArrowClosed, color: 'rgba(34,211,238,0.35)', width: 16, height: 16 },
  },
  {
    id: 'dash-to-compliance',
    source: 'dashboard',
    target: 'status-compliance',
    sourceHandle: 'dash-bottom',
    animated: true,
    style: { stroke: 'rgba(52,211,153,0.15)', strokeWidth: 1 },
  },
  {
    id: 'compliance-to-radar',
    source: 'status-compliance',
    target: 'radar',
    targetHandle: 'radar-left',
    animated: true,
    style: { stroke: 'rgba(251,191,36,0.15)', strokeWidth: 1 },
    markerEnd: { type: MarkerType.ArrowClosed, color: 'rgba(251,191,36,0.3)', width: 14, height: 14 },
  },
  {
    id: 'radar-to-flow',
    source: 'radar',
    target: 'status-flow',
    sourceHandle: 'radar-right',
    animated: true,
    style: { stroke: 'rgba(52,211,153,0.18)', strokeWidth: 1 },
    markerEnd: { type: MarkerType.ArrowClosed, color: 'rgba(52,211,153,0.3)', width: 14, height: 14 },
  },
]

const fitViewOptions = { padding: 0.15, maxZoom: 0.9 }

export default function ProductShowcase() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  return (
    <div className="w-full h-[600px] md:h-[680px] rounded-2xl border border-white/[0.04] bg-[#080c14] overflow-hidden relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        minZoom={0.3}
        maxZoom={1.5}
        fitView
        fitViewOptions={fitViewOptions}
        proOptions={{ hideAttribution: true }}
        className="product-showcase-flow"
      >
        <Background variant="dots" color="rgba(255,255,255,0.08)" gap={20} size={1.5} />
        <Controls
          showInteractive={false}
          className="!bg-[#0c1018]/80 !border-white/[0.06] !rounded-xl !shadow-lg [&>button]:!bg-transparent [&>button]:!border-white/[0.06] [&>button]:!text-white/60 [&>button:hover]:!text-white/90 [&>button]:!w-7 [&>button]:!h-7"
        />
      </ReactFlow>
      {/* Subtle gradient overlay at edges */}
      <div className="absolute inset-0 pointer-events-none rounded-2xl" style={{
        background: 'linear-gradient(to right, #080c14 0%, transparent 5%, transparent 95%, #080c14 100%), linear-gradient(to bottom, #080c14 0%, transparent 5%, transparent 95%, #080c14 100%)',
      }} />
    </div>
  )
}
