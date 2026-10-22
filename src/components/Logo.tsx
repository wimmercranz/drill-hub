/** Drillpin logo: a white push pin on an orange tile. */
export default function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#ea580c" />
      <g transform="rotate(35 16 16)" fill="#fff">
        <rect x="11" y="6" width="10" height="3" rx="1.5" />
        <path d="M12.5 9h7l1 7h-9z" />
        <rect x="9" y="15.5" width="14" height="3" rx="1.5" />
        <path d="M15.2 18.5h1.6L16 27z" />
      </g>
    </svg>
  );
}
