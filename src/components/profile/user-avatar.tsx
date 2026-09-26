import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : (parts[0] ?? "?").slice(0, 2);
  return letters.toUpperCase();
}

// Sin foto: iniciales sobre navy-600 (handoff v2). Las variantes neutral-200 y coral-100
// se piden con `textClassName` donde el fondo lo necesite.
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
      <AvatarFallback className={cn("bg-navy-600 font-semibold text-surface", textClassName)}>{initials(name)}</AvatarFallback>
    </Avatar>
  );
}
