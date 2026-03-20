import { motion } from 'framer-motion'
import { X, ChevronRight, FileCode2, FolderOpen, ExternalLink } from 'lucide-react'
import { type DocNode, GROUP_COLORS, GROUP_LABELS, GITHUB_BASE } from './docsData'

interface Props {
  node: DocNode
  onClose: () => void
}

export default function DocPanel({ node, onClose }: Props) {
  const groupColor = GROUP_COLORS[node.group]

  return (
    <motion.div
      className="absolute top-0 right-0 bottom-0 w-full md:w-[460px] z-40 flex flex-col"
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Backdrop — fully opaque so graph doesn't bleed through */}
      <div className="absolute inset-0 bg-[#060e09] border-l border-white/[0.06]" />

      <div className="relative z-10 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-white/[0.06] shrink-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span
                className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-md"
                style={{ color: groupColor, backgroundColor: groupColor + '15' }}
              >
                {GROUP_LABELS[node.group]}
              </span>
            </div>
            <h2 className="text-[18px] font-bold text-white tracking-tight">{node.content.title}</h2>
            <p className="text-[13px] text-white/35 mt-1 leading-relaxed">{node.content.description}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/20 hover:text-white/60 hover:bg-white/[0.06] transition-colors shrink-0 mt-0.5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 chat-scroll">
          {/* Browse directory link */}
          <a
            href={`${GITHUB_BASE}/${node.repoPath}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 px-4 py-3 rounded-xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.12] transition-all group"
          >
            <FolderOpen className="w-4 h-4 shrink-0" style={{ color: groupColor }} />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-white/70 group-hover:text-white/90 transition-colors truncate">
                {node.repoPath}
              </p>
              <p className="text-[10px] text-white/25">Browse on GitHub</p>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-white/15 group-hover:text-white/40 transition-colors shrink-0" />
          </a>

          {/* File tree */}
          {node.content.files.length > 0 && (
            <div>
              <h3 className="flex items-center gap-2 text-[12px] font-semibold text-white/40 uppercase tracking-wider mb-2">
                Files
              </h3>
              <div className="rounded-xl border border-white/[0.06] bg-[#060e09] overflow-hidden divide-y divide-white/[0.04]">
                {node.content.files.map((file) => (
                  <a
                    key={file.path}
                    href={`${GITHUB_BASE}/${file.path}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.03] transition-colors group"
                  >
                    <FileCode2 className="w-3.5 h-3.5 text-white/20 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-[12px] font-mono text-white/60 group-hover:text-white/80 transition-colors">
                        {file.name}
                      </span>
                      {file.description && (
                        <span className="text-[11px] text-white/20 ml-2">{file.description}</span>
                      )}
                    </div>
                    <ExternalLink className="w-3 h-3 text-white/0 group-hover:text-white/30 transition-colors shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Sections */}
          {node.content.sections.map((section, i) => (
            <div key={i}>
              <h3 className="flex items-center gap-2 text-[14px] font-semibold text-white/80 mb-2">
                <ChevronRight className="w-3 h-3 shrink-0" style={{ color: groupColor }} />
                {section.heading}
              </h3>
              <div className="text-[13px] text-white/45 leading-[1.75] whitespace-pre-line">
                {section.body}
              </div>
              {section.code && (
                <div className="rounded-lg border border-white/[0.06] bg-[#060e09] overflow-hidden my-3">
                  <div className="flex items-center px-3 py-1.5 border-b border-white/[0.06]">
                    <span className="text-[10px] text-white/25 font-mono uppercase">{section.code.language}</span>
                  </div>
                  <pre className="p-3 overflow-x-auto text-[12px] leading-[1.8] font-mono text-white/60">
                    <code>{section.code.snippet}</code>
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
