import { useRef, useEffect, useCallback, useState, useMemo } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import * as d3 from 'd3-force'
import { GRAPH_NODES, GRAPH_LINKS, GROUP_COLORS, GROUP_SHAPES } from './docsData'

interface Props {
  selectedNodeId: string | null
  onNodeSelect: (id: string) => void
}

// Place each group in a different region so the layout spreads horizontally
const GROUP_POSITIONS: Record<string, { x: number; y: number }> = {
  frontend:  { x: -200, y:  100 },
  backend:   { x:  200, y:  100 },
  contracts: { x:    0, y: -120 },
  agents:    { x:  150, y:  -30 },
  infra:     { x: -180, y: -130 },
}

function drawShape(
  ctx: CanvasRenderingContext2D,
  shape: string,
  x: number,
  y: number,
  size: number,
) {
  ctx.beginPath()
  switch (shape) {
    case 'diamond': {
      ctx.moveTo(x, y - size)
      ctx.lineTo(x + size, y)
      ctx.lineTo(x, y + size)
      ctx.lineTo(x - size, y)
      ctx.closePath()
      break
    }
    case 'hexagon': {
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 2
        const px = x + size * Math.cos(angle)
        const py = y + size * Math.sin(angle)
        if (i === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      ctx.closePath()
      break
    }
    case 'square': {
      const half = size * 0.85
      ctx.rect(x - half, y - half, half * 2, half * 2)
      break
    }
    case 'triangle': {
      ctx.moveTo(x, y - size)
      ctx.lineTo(x + size * 0.95, y + size * 0.7)
      ctx.lineTo(x - size * 0.95, y + size * 0.7)
      ctx.closePath()
      break
    }
    default: {
      ctx.arc(x, y, size, 0, 2 * Math.PI)
      break
    }
  }
}

export default function KnowledgeGraph({ selectedNodeId, onNodeSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const graphRef = useRef<any>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const obs = new ResizeObserver(([entry]) => {
      setDimensions({ width: entry.contentRect.width, height: entry.contentRect.height })
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  // Seed initial positions so the simulation starts spread out
  const graphData = useMemo(() => ({
    nodes: GRAPH_NODES.map((n, i) => {
      const gp = GROUP_POSITIONS[n.group] || { x: 0, y: 0 }
      // Scatter within group region
      const angle = (i / GRAPH_NODES.length) * Math.PI * 2
      return {
        id: n.id,
        label: n.label,
        group: n.group,
        shape: n.shape,
        x: gp.x + Math.cos(angle) * 40,
        y: gp.y + Math.sin(angle) * 40,
      }
    }),
    links: GRAPH_LINKS.map(l => ({ source: l.source, target: l.target })),
  }), [])

  // Configure forces after mount
  useEffect(() => {
    const fg = graphRef.current
    if (!fg) return

    // Repulsion between all nodes
    fg.d3Force('charge', d3.forceManyBody().strength(-300).distanceMax(500))
    // Link spring length
    fg.d3Force('link')?.distance(80).strength(0.3)
    // Pull nodes toward their group's target region
    fg.d3Force('x', d3.forceX((node: any) => {
      return (GROUP_POSITIONS[node.group]?.x || 0)
    }).strength(0.12))
    fg.d3Force('y', d3.forceY((node: any) => {
      return (GROUP_POSITIONS[node.group]?.y || 0)
    }).strength(0.12))
    // Prevent node overlap
    fg.d3Force('collide', d3.forceCollide(30))

    // Reheat so new forces take effect
    fg.d3ReheatSimulation()

    const timer = setTimeout(() => {
      fg.zoomToFit(600, 60)
    }, 1500)
    return () => clearTimeout(timer)
  }, [])

  const handleNodeClick = useCallback((node: any) => {
    onNodeSelect(node.id)
  }, [onNodeSelect])

  const nodeCanvasObject = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const color = GROUP_COLORS[node.group] || '#34d399'
    const shape = node.shape || GROUP_SHAPES[node.group] || 'circle'
    const isSelected = node.id === selectedNodeId
    const radius = isSelected ? 10 : 7
    const x = node.x || 0
    const y = node.y || 0

    // Subtle glow for selected
    if (isSelected) {
      ctx.save()
      ctx.globalAlpha = 0.12
      drawShape(ctx, shape, x, y, 18)
      ctx.fillStyle = color
      ctx.fill()
      ctx.restore()
    }

    // Node shape
    drawShape(ctx, shape, x, y, radius)
    ctx.fillStyle = isSelected ? color : color + 'cc'
    ctx.fill()

    // Border
    ctx.strokeStyle = isSelected ? '#fff' : color + '40'
    ctx.lineWidth = isSelected ? 1.5 : 0.5
    ctx.stroke()

    // Label
    const fontSize = isSelected ? 11 / globalScale : 9 / globalScale
    ctx.font = `${isSelected ? '600' : '400'} ${fontSize}px 'Geist Sans', system-ui, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillStyle = isSelected ? '#fff' : 'rgba(255,255,255,0.45)'
    ctx.fillText(node.label, x, y + radius + 3 / globalScale)
  }, [selectedNodeId])

  const linkColor = useCallback((link: any) => {
    const sourceNode = GRAPH_NODES.find(n => n.id === (link.source?.id || link.source))
    const color = sourceNode ? GROUP_COLORS[sourceNode.group] : '#34d399'
    return color + '40'
  }, [])

  return (
    <div ref={containerRef} className="w-full h-full">
      <ForceGraph2D
        ref={graphRef}
        graphData={graphData}
        width={dimensions.width}
        height={dimensions.height}
        backgroundColor="rgba(0,0,0,0)"
        nodeCanvasObject={nodeCanvasObject}
        nodePointerAreaPaint={(node: any, color, ctx) => {
          ctx.beginPath()
          ctx.arc(node.x || 0, node.y || 0, 14, 0, 2 * Math.PI)
          ctx.fillStyle = color
          ctx.fill()
        }}
        onNodeClick={handleNodeClick}
        linkColor={linkColor}
        linkWidth={1.5}
        linkDirectionalParticles={1}
        linkDirectionalParticleWidth={1.5}
        linkDirectionalParticleSpeed={0.003}
        linkDirectionalParticleColor={linkColor}
        d3AlphaDecay={0.03}
        d3VelocityDecay={0.4}
        cooldownTicks={200}
        warmupTicks={100}
        enableNodeDrag={true}
        enableZoomInteraction={true}
        enablePanInteraction={true}
      />
    </div>
  )
}
