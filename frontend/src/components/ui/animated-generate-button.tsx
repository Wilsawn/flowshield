import * as React from "react";
import clsx from "clsx";

const sizes = {
  sm: { btn: "rounded-[20px] px-4 py-1.5", svg: "mr-1.5 h-3.5 w-3.5", txt: "text-[13px]" },
  md: { btn: "rounded-[24px] px-6 py-2.5", svg: "mr-2 h-4 w-4", txt: "text-[14px]" },
  lg: { btn: "rounded-[28px] px-8 py-3.5", svg: "mr-2.5 h-5 w-5", txt: "text-[15px]" },
};

export default function AnimatedGenerateButton({
  className,
  labelIdle = "Generate",
  labelActive = "Generating",
  generating = false,
  highlightHueDeg = 160,
  onClick,
  disabled = false,
  size = "md",
  icon: Icon,
  id,
}) {
  const s = sizes[size] || sizes.md;

  return (
    <div className={clsx("relative inline-block", className)} id={id}>
      {/* Visual layer — all the animated CSS magic */}
      <div
        className={clsx(
          "ui-anim-btn",
          "relative flex items-center justify-center select-none",
          s.btn,
          "bg-[hsl(var(--background))] text-[hsl(var(--foreground))]",
          "border border-[hsl(var(--border))]/20",
          "shadow-[inset_0px_1px_1px_rgba(255,255,255,0.2),inset_0px_2px_2px_rgba(255,255,255,0.15),inset_0px_4px_4px_rgba(255,255,255,0.1),inset_0px_8px_8px_rgba(255,255,255,0.05),inset_0px_16px_16px_rgba(255,255,255,0.05),0_-1px_1px_rgba(0,0,0,0.02),0_-2px_2px_rgba(0,0,0,0.03),0_-4px_4px_rgba(0,0,0,0.05),0_-8px_8px_rgba(0,0,0,0.06),0_-16px_16px_rgba(0,0,0,0.08)]",
          "transition-[box-shadow,border,background-color] duration-400",
          disabled && "opacity-60"
        )}
        style={{ "--highlight-hue": `${highlightHueDeg}deg` }}
      >
        {Icon ? (
          <Icon className={clsx("ui-anim-btn-svg flex-shrink-0 relative z-[2]", s.svg, "text-[var(--ui-anim-svg-fill)] transition-[color,filter,opacity] duration-400")} />
        ) : (
          <svg
            className={clsx("ui-anim-btn-svg flex-shrink-0 relative z-[2]", s.svg, "fill-[color:var(--ui-anim-svg-fill)] transition-[fill,filter,opacity] duration-400")}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
          </svg>
        )}
        <div className={clsx("relative z-[2] flex items-center whitespace-nowrap", s.txt)}>
          <div
            className={clsx(
              "ui-anim-txt-1",
              generating ? "opacity-0" : "animate-[ui-appear_1s_ease-in-out_forwards]"
            )}
          >
            {Array.from(labelIdle).map((ch, i) => (
              <span key={i} className="ui-anim-letter inline-block">
                {ch === " " ? "\u00A0" : ch}
              </span>
            ))}
          </div>
          <div
            className={clsx(
              "ui-anim-txt-2 absolute left-0",
              generating ? "opacity-100" : "opacity-0"
            )}
          >
            {Array.from(labelActive).map((ch, i) => (
              <span key={i} className="ui-anim-letter inline-block">
                {ch === " " ? "\u00A0" : ch}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Click layer — transparent button on top of everything */}
      <button
        onClick={onClick}
        disabled={disabled}
        className="absolute inset-0 z-[10] cursor-pointer bg-transparent border-none outline-none"
        aria-label={generating ? labelActive : labelIdle}
      />
    </div>
  );
}
