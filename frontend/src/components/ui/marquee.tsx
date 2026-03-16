import { cn } from "@/lib/utils"

export default function Marquee({ children, className, reverse = false, pauseOnHover = true, speed = 40 }) {
  return (
    <div className={cn("flex overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]", className)}>
      <div
        className={cn(
          "flex shrink-0 gap-8 items-center",
          pauseOnHover && "hover:[animation-play-state:paused]"
        )}
        style={{
          animation: `marqueeScroll ${speed}s linear infinite${reverse ? ' reverse' : ''}`,
        }}
      >
        {children}
        {children}
      </div>
    </div>
  )
}
