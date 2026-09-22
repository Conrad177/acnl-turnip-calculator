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
        "inline-flex size-12 shrink-0 items-center justify-center overflow-visible sm:size-14",
        className,
      )}
    >
      <img
        src={emoteSrc(name)}
        alt=""
        width={52}
        height={52}
        className="block size-11 object-contain object-center sm:size-12"
      />
    </span>
  );
}
