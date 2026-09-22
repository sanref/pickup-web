import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : (parts[0] ?? "?").slice(0, 2);
  return letters.toUpperCase();
}

// Sin foto: iniciales sobre accent-2-300 (handoff).
export function UserAvatar({
  name,
  src,
  className,
  textClassName,
}: {
  name: string;
  src?: string | null;
  className?: string;
  textClassName?: string;
}) {
  return (
    <Avatar className={cn("size-9", className)}>
      {src && <AvatarImage src={src} alt="" referrerPolicy="no-referrer" />}
      <AvatarFallback className={cn("bg-accent-2-300 font-semibold text-accent-2-900", textClassName)}>{initials(name)}</AvatarFallback>
    </Avatar>
  );
}
