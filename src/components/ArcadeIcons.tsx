import type { ReactNode } from "react";

type Props = {
  size?: number;
  strokeWidth?: number;
  className?: string;
  color?: string;
  fill?: string;
};
const ink = "#35283d",
  cream = "#fff5db",
  orange = "#e9a079",
  mint = "#9fc47c",
  volt = "#f6d372",
  pink = "#eaa0bc",
  blue = "#9bbde5";
function badge(art: ReactNode, highlight = "M6 7h4") {
  return function ArcadeIcon({
    size = 24,
    strokeWidth = 2.15,
    className,
  }: Props) {
    return (
      <svg
        aria-hidden="true"
        className={className}
        width={size}
        height={size}
        viewBox="0 0 28 28"
        fill="none"
      >
        <g
          transform="translate(1 .8) rotate(-4 14 14)"
          opacity=".55"
          fill={ink}
          stroke={ink}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {art}
        </g>
        <g
          fill={cream}
          stroke={ink}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {art}
        </g>
        {highlight && (
          <path
            d={highlight}
            stroke="#fff"
            opacity=".68"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
        )}
      </svg>
    );
  };
}

export const Gamepad2 = badge(
  <>
    <path
      d="M4 9q1-4 5-4h10q3 .2 4 4l2 9q.7 4-3 4-1 0-5-4h-6q-4 4-6 4-3-.5-2-4Z"
      fill={orange}
    />
    <path d="M7 12h6m-3-3v6" />
    <circle cx="19" cy="10.5" r="1" fill={volt} />
    <circle cx="21" cy="14" r="1" fill={cream} />
  </>,
);
export const Monitor = badge(
  <>
    <rect x="3" y="4" width="22" height="15" rx="3" fill={blue} />
    <path d="M7 8h14v7H7Z" fill={cream} />
    <path d="M14 19v4m-6 0h12" />
  </>,
  "M7 10h9",
);
export const Smartphone = badge(
  <>
    <rect x="7" y="2.5" width="14" height="22" rx="3" fill={mint} />
    <path d="M10 7h8v11h-8Z" fill={cream} />
    <path d="M13 21.5h2" />
  </>,
  "M11 9h4",
);
export const Dices = badge(
  <>
    <path d="m4 7 12-4 8 5-2 13-12 4-8-8Z" fill={volt} />
    <path d="m4 7 8 6 12-5m-12 5-2 12M7 12l.2.2m.8 6 .2.2m9-6 .2.2m2 5 .2.2m-7-10 .2.2" />
  </>,
  "m8 7 6-2",
);
export const Brush = badge(
  <>
    <path d="M9 16 20 3q2-1 4 2l-11 14Z" fill={blue} />
    <path d="M10 15q6 2 4 6-3 5-11 3 3-2 2-4 .2-4 5-5Z" fill={pink} />
  </>,
  "m13 13 6-7",
);
export const Palette = badge(
  <>
    <path
      d="M24 12q0-8-10-9Q3 3 3 13q0 11 10 11 4 0 4-4-.2-3 3-3 4 0 4-5Z"
      fill={pink}
    />
    <circle cx="9" cy="10" r="1.5" fill={cream} />
    <circle cx="15" cy="7.5" r="1.5" fill={mint} />
    <circle cx="19" cy="12" r="1.5" fill={volt} />
    <path d="M8 16h3" />
  </>,
  "M6 13q0-5 4-7",
);
export const Gavel = badge(
  <>
    <path d="m9 12 4-4 10 11-3 3Z" fill={orange} />
    <path d="m4 10 8-8 8 8-8 8Z" fill={volt} />
    <path d="M4 22h9l2 3H2Z" fill={pink} />
  </>,
  "m7 9 5-5",
);
export const Layers3 = badge(
  <>
    <path d="m3 16 11-6 11 6-11 8Z" fill={blue} />
    <path d="m3 12 11-6 11 6-11 8Z" fill={pink} />
    <path d="m3 8 11-6 11 6-11 8Z" fill={cream} />
  </>,
  "M8 8l6-3",
);
export const SwatchBook = badge(
  <>
    <rect
      x="4"
      y="6"
      width="11"
      height="17"
      rx="2"
      transform="rotate(-20 8 14)"
      fill={mint}
    />
    <rect
      x="12"
      y="4"
      width="11"
      height="19"
      rx="2"
      transform="rotate(15 17 13)"
      fill={orange}
    />
    <path d="m15 11 5 1m-5 4 4 1" />
  </>,
  "m16 7 3 1",
);
export const Crown = badge(
  <>
    <path d="m3 8 6 5 5-9 5 9 6-5-3 14H6Z" fill={volt} />
    <path d="M7 18h14" />
    <path d="m14 13-2 3 2 1 2-1Z" fill={pink} />
  </>,
  "M8 15l2 1",
);
export const Trophy = badge(
  <>
    <path d="M6 5H3v5q0 4 6 4m13-9h3v5q0 4-6 4" />
    <path d="M7 3h14v7q0 6-5 7v4l5 3H7l5-3v-4q-5-1-5-7Z" fill={volt} />
    <path d="m11 9 2 2 4-4" />
  </>,
  "M10 5h7",
);
export const Zap = badge(
  <path d="m15 2-11 14h8l-1 10 13-15h-9l2-9Z" fill={volt} />,
  "m13 6-5 7",
);
export const Sparkles = badge(
  <>
    <path d="m12 3 3 7 7 3-7 3-3 8-3-8-7-3 7-3Z" fill={volt} />
    <path d="m22 2 1 4 3 1-3 1-1 4-1-4-3-1 3-1Z" fill={pink} />
  </>,
  "m11 8-1 3",
);
export const Flame = badge(
  <>
    <path
      d="M14 2c4 7 10 10 10 16a10 10 0 0 1-20 0c0-3 2-7 5-8l1 4q5-5 4-12Z"
      fill={orange}
    />
    <path d="M15 13q9 8 2 11-6 2-8-3 4-2 6-8Z" fill={volt} />
  </>,
  "m7 16-1 3",
);
export const Star = badge(
  <path
    d="m14 2 3.6 7.4 8.4 1.3-6 5.9 1.4 8.4-7.4-4-7.4 4 1.4-8.4-6-5.9 8.4-1.3Z"
    fill={volt}
  />,
  "m12 8-2 4",
);
export const Clover = badge(
  <>
    <path
      d="M14 10q-6-12-11-3-3 6 7 7-12 1-6 8 5 7 11-4 4 10 9 3 5-7-7-8 10-2 5-8-5-6-8 5Z"
      fill={mint}
    />
    <path d="m15 15 2 9" />
  </>,
  "M6 9q2-3 4 0",
);
export const Coins = badge(
  <>
    <path d="M4 12h17v8c0 5-17 5-17 0Z" fill={orange} />
    <ellipse cx="12.5" cy="12" rx="8.5" ry="4" fill={volt} />
    <path d="M6 17q6 4 13 0" />
    <circle cx="19" cy="7" r="5" fill={volt} />
  </>,
  "m17 6 3-2",
);
export const BadgeDollarSign = badge(
  <>
    <circle cx="14" cy="14" r="10" fill={mint} />
    <path d="M17 10c-7-5-10 4-3 4s4 9-4 4m4-12v16" />
  </>,
  "M7 12q1-5 6-5",
);
export const Users = badge(
  <>
    <path d="M14 21q0-9 5-9t6 9Z" fill={pink} />
    <circle cx="20" cy="8" r="4" fill={orange} />
    <path d="M2 23q0-10 8-10t8 10Z" fill={mint} />
    <circle cx="10" cy="8" r="5" fill={cream} />
  </>,
  "m7 7 3-2",
);
export const Clock3 = badge(
  <>
    <circle cx="14" cy="14" r="11" fill={cream} />
    <path d="M14 7v7h6" strokeWidth="3" />
    <path d="M6 14h2m6 6v2" />
  </>,
  "M8 9l3-2",
);
export const Vote = badge(
  <>
    <path d="M4 10h20v14H4Z" fill={blue} />
    <path d="M4 10 8 6h13l3 4Z" fill={cream} />
    <path d="M8 15h12" />
    <path d="m10 4 9-2 2 11-9 2Z" fill={volt} />
  </>,
  "m13 6 4-1",
);
export const Flag = badge(
  <>
    <path d="M5 24V4" />
    <path d="M5 4q6-3 10 0t10 0v11q-6 2-10 0t-10 0Z" fill={orange} />
  </>,
  "m8 6 5-1",
);
export const Headphones = badge(
  <>
    <path d="M4 16V12a10 10 0 1 1 20 0v4h-3v-4a7 7 0 1 0-14 0v4Z" fill={mint} />
    <rect x="3" y="13" width="6" height="10" rx="2" fill={pink} />
    <rect x="19" y="13" width="6" height="10" rx="2" fill={pink} />
  </>,
  "M9 7q3-3 6-2",
);
export const Volume2 = badge(
  <>
    <path d="M3 10h5l6-6v20l-6-6H3Z" fill={orange} />
    <path d="M18 10q5 4 0 8m3-11q8 7 0 14" />
  </>,
  "M5 12h4",
);
export const VolumeX = badge(
  <>
    <path d="M3 10h5l6-6v20l-6-6H3Z" fill={pink} />
    <path d="m18 10 7 8m0-8-7 8" />
  </>,
  "M5 12h4",
);
export const Radio = badge(
  <>
    <circle cx="14" cy="14" r="4.5" fill={mint} />
    <path d="M7 8q-6 6 0 12m14-12q6 6 0 12M4 5q-8 9 0 18M24 5q8 9 0 18" />
  </>,
  "M12 13l1-1",
);
export const Copy = badge(
  <>
    <rect x="4" y="3" width="14" height="16" rx="2" fill={pink} />
    <rect x="9" y="8" width="15" height="17" rx="2" fill={cream} />
    <path d="M13 13h7m-7 4h7" />
  </>,
  "m11 10 7 0",
);
export const Eraser = badge(
  <>
    <path d="m4 15 11-12 10 9-10 12H9Z" fill={pink} />
    <path d="m9 10 11 9M14 24h11" />
  </>,
  "m14 7 2-2",
);
export const Send = badge(
  <>
    <path d="M2 4 25 11l-20 13 2-9Z" fill={orange} />
    <path d="m7 15 18-4" />
  </>,
  "m7 7 8 2",
);
export const Check = badge(
  <path d="m3 13 6 6L23 5l3 4L9 26 1 17Z" fill={mint} />,
  "m11 17 9-9",
);
export const ArrowRight = badge(
  <path d="M3 11h12V5l11 9-11 9v-6H3Z" fill={volt} />,
  "M5 13h10",
);
export const ArrowLeft = badge(
  <path d="M25 11H13V5L2 14l11 9v-6h12Z" fill={volt} />,
  "M15 13h8",
);
export const ArrowDown = badge(
  <path d="M11 3v12H5l9 11 9-11h-6V3Z" fill={volt} />,
  "M13 5v8",
);
export const ArrowDownToLine = badge(
  <>
    <path d="M11 3v10H5l9 9 9-9h-6V3Z" fill={mint} />
    <path d="M4 24h20" />
  </>,
  "M13 5v7",
);
export const ChevronRight = badge(
  <path d="m8 3 13 11L8 25l-4-5 8-6-8-6Z" fill={cream} />,
  "m9 7 7 6",
);
export const ChevronLeft = badge(
  <path d="M20 3 7 14l13 11 4-5-8-6 8-6Z" fill={cream} />,
  "m19 7-7 6",
);
export const RotateCw = badge(
  <path
    d="M19 6 19 2l7 8-7 6v-5a7 7 0 1 0 1 9l4 2a12 12 0 1 1-5-16Z"
    fill={orange}
  />,
  "M6 14q1-6 7-6",
);
export const RotateCcw = badge(
  <path
    d="M9 6V2l-7 8 7 6v-5a7 7 0 1 1-1 9l-4 2a12 12 0 1 0 5-16Z"
    fill={orange}
  />,
  "M22 14q-1-6-7-6",
);
