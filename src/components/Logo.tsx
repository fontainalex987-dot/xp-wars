export function Logo({ size = 64, className }: { size?: number; className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 100 100" role="img" aria-label="XP Wars" className={className}>
      <rect width="100" height="100" rx="23" fill="#bef264" />
      <g transform="translate(13 13) scale(0.74)" fill="none" stroke="#0a0a0b" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 51 L39 70 L76 33" />
        <path d="M53 33 H76 V56" />
      </g>
    </svg>
  );
}
