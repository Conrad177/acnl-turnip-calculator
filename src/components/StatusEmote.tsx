import { emoteSrc, type EmoteName } from "../lib/emote.ts";
import { cn } from "../lib/utils.ts";

export function StatusEmote({
  name,
  className,
}: {
  name: EmoteName;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex size-12 shrink-0 items-center justify-center overflow-visible rounded-full bg-[#f7e2b0] sm:size-14",
        className,
      )}
    >
      <img
        src={emoteSrc(name)}
        alt=""
        width={48}
        height={48}
        className="block size-10 object-contain object-center drop-shadow-[0_1px_0_rgba(107,62,27,0.35)] sm:size-11"
      />
    </span>
  );
}
