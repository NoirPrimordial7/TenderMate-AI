type NividaIQMarkProps = {
  className?: string;
  decorative?: boolean;
};

export function NividaIQMark({ className, decorative = true }: NividaIQMarkProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      role={decorative ? undefined : "img"}
      aria-hidden={decorative ? "true" : undefined}
      aria-label={decorative ? undefined : "NividaIQ"}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="64" height="64" rx="15" fill="#6C4DFF" />
      <path d="M15 48V16h9l17 20V16h8v32h-9L23 28v20H15Z" fill="#F4F2ED" />
      <path d="M41 16h8v9l-8-9Z" fill="#146CFF" />
      <circle cx="50" cy="50" r="5" fill="#D7FF33" stroke="#101010" strokeWidth="2" />
    </svg>
  );
}
