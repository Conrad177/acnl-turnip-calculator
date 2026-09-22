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
    <img
      src={emoteSrc(name)}
      alt=""
      width={56}
      height={56}
      className={cn("size-11 shrink-0 object-contain [image-rendering:pixelated] sm:size-12", className)}
    />
  );
}
