import { cn } from "@/lib/utils"

export default function Marquee({ children, className, reverse = false, pauseOnHover = true, speed = 40 }) {
  return (
    <div className={cn("overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]", className)}>
      <div
        className={cn(
          "flex w-max items-center gap-8",
          pauseOnHover && "hover:[animation-play-state:paused]"
        )}
        style={{
          animation: `marqueeScroll ${speed}s linear infinite${reverse ? ' reverse' : ''}`,
          willChange: 'transform',
        }}
      >
        <div className="flex shrink-0 items-center gap-8">{children}</div>
        <div className="flex shrink-0 items-center gap-8">{children}</div>
      </div>
    </div>
  )
}
