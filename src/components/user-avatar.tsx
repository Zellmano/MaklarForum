export function UserAvatar({ url, name, size = "md" }: { url?: string | null; name: string; size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "h-8 w-8 text-xs", md: "h-10 w-10 text-sm", lg: "h-14 w-14 text-lg" };

  return (
    <div className={`${sizes[size]} shrink-0 overflow-hidden rounded-full bg-gray-100`}>
      {url ? (
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="flex h-full w-full items-center justify-center font-medium text-[var(--muted)]">
          {name.charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  );
}
