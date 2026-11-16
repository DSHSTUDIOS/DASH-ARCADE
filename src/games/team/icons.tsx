type IconProps = { size?: number; strokeWidth?: number };

export function BrainwavesIcon({ size = 28, strokeWidth = 2.6 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden="true"
      fill="none"
      stroke="#111113"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 25a13 13 0 0 1 26 0Z" fill="#F4F0EA" />
      <path d="M9 19l-3-2m10-4v-3m7 9 3-2M16 25l5-9" />
      <circle cx="16" cy="25" r="2" fill="#FF4F00" />
    </svg>
  );
}
export function CipherIcon({ size = 28, strokeWidth = 2.6 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden="true"
      fill="none"
      stroke="#111113"
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
    >
      <path d="M4 4h24v24H4Z" fill="#F4F0EA" />
      <path d="M4 4h12v12H4Z" fill="#FF4F00" />
      <path d="M16 16h12v12H16Z" fill="#0047FF" />
      <path d="M16 4v24M4 16h24" />
    </svg>
  );
}
export function SignalIcon({ size = 28, strokeWidth = 2.6 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden="true"
      fill="none"
      stroke="#111113"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="4" y="10" width="24" height="18" rx="3" fill="#F4F0EA" />
      <path d="M9 10 24 3M8 19h3l2-4 4 8 3-4h4" />
      <circle cx="25" cy="14" r="1.6" fill="#FF4F00" />
    </svg>
  );
}
export function DefuseIcon({ size = 28, strokeWidth = 2.6 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden="true"
      fill="none"
      stroke="#111113"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="4" y="5" width="24" height="22" rx="3" fill="#F4F0EA" />
      <path d="M9 10h14v8H9Z" fill="#0047FF" />
      <path d="M11 23h2m6 0h2m-9-9h2m4 0h2" stroke="#FF4F00" />
    </svg>
  );
}
