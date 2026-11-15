"use client";

import { memo, useId } from "react";
import type { AvatarConfig } from "@/lib/types";

export type Reaction = "idle" | "happy" | "shocked" | "winner";

// Radial profiles for droplet, bean, star, ghost, pear, cloud, horns, cushion,
// crown, puddle, mushroom, diamond, bell, pebble, heart, and clover.
const profiles = [
  [1.25, 0.87, 0.81, 0.89, 0.98, 1.12, 1.02, 1.12, 0.98, 0.89, 0.81, 0.87],
  [0.84, 0.82, 1.06, 1.13, 1.02, 0.9, 0.91, 1.03, 1.14, 1.05, 0.91, 0.85],
  [1.22, 0.9, 0.94, 1.18, 0.9, 1.09, 1.23, 0.99, 0.9, 1.19, 0.94, 0.9],
  [1, 0.99, 1, 1, 1.08, 0.96, 1.09, 0.96, 1.08, 1, 1, 0.99],
  [1, 0.79, 0.76, 0.9, 1.12, 1.13, 1, 1.13, 1.12, 0.9, 0.76, 0.79],
  [0.92, 1.02, 0.94, 1.15, 1.05, 0.92, 1, 0.93, 1.05, 1.15, 0.94, 1.02],
  [0.75, 1.2, 1.14, 0.89, 1.02, 1.09, 1, 1.09, 1.02, 0.89, 1.14, 1.2],
  [0.91, 1.01, 1.07, 1, 1.08, 1.01, 0.94, 1.01, 1.08, 1, 1.07, 1.01],
  [1.16, 0.81, 1.19, 1.04, 1.03, 1.02, 0.94, 1.02, 1.03, 1.04, 1.19, 0.81],
  [0.85, 0.86, 0.93, 1.09, 1.12, 0.98, 0.9, 0.99, 1.17, 1.12, 0.93, 0.86],
  [1.08, 1.13, 1.23, 1.11, 0.84, 0.89, 0.96, 0.89, 0.84, 1.11, 1.23, 1.13],
  [1.19, 0.88, 0.9, 1.18, 0.91, 0.9, 1.13, 0.9, 0.91, 1.18, 0.9, 0.88],
  [1.11, 1.01, 0.83, 0.86, 1.12, 1.07, 0.95, 1.07, 1.12, 0.86, 0.83, 1.01],
  [0.98, 0.99, 1.03, 1.11, 1, 0.89, 0.9, 1.03, 1.07, 1, 0.92, 0.91],
  [0.71, 1.15, 1.22, 1.03, 0.91, 0.96, 1.16, 0.96, 0.91, 1.03, 1.22, 1.15],
  [1.07, 1.02, 0.9, 1.14, 1, 0.95, 1.09, 0.94, 1, 1.14, 0.9, 1.02],
];
const silhouetteNames = [
  "Droplet",
  "Bean",
  "Chubby Star",
  "Ghost",
  "Pear",
  "Cloud",
  "Twin Horn",
  "Cushion",
  "Crown",
  "Puddle",
  "Mushroom",
  "Diamond",
  "Bell",
  "Pebble",
  "Heart",
  "Clover",
];
const variants = ["", " Tall", " Wide"];
export const shapeNames = variants.flatMap((variant) =>
  silhouetteNames.map((name) => name + variant),
);
export const faceNames = [
  "Happy",
  "Derpy",
  "Smug",
  "Angry",
  "Sunglasses",
  "Cyclops",
  "Dizzy",
  "Kitten",
  "Shocked",
  "Wink",
  "Pixel Glasses",
  "Starstruck",
  "Sleepy",
  "Tongue Out",
  "Worried",
  "Grinning",
  "Blushing",
  "Curious",
  "Googly",
  "Triumphant",
];

const paths = shapeNames.map((_, index) => {
  const variant = Math.floor(index / profiles.length);
  const points = profiles[index % profiles.length].map((radius, i) => {
    const angle = (i * Math.PI) / 6 - Math.PI / 2;
    const tilt = variant === 1 ? Math.sin(angle * 3) * 0.05 : 0;
    return [
      50 + (radius + tilt) * [34, 29, 38][variant] * Math.cos(angle),
      52 + radius * [33, 38, 27][variant] * Math.sin(angle),
    ];
  });
  const coordinate = (x: number, y: number) =>
    `${x.toFixed(2)} ${y.toFixed(2)}`;
  return (
    `M${points[0].join(" ")} ` +
    points
      .map(([x, y], i) => {
        const [px, py] = points.at(i - 1)!;
        const [nx, ny] = points[(i + 1) % points.length];
        const [fx, fy] = points[(i + 2) % points.length];
        return `C${coordinate(x + (nx - px) / 6, y + (ny - py) / 6)} ${coordinate(nx - (fx - x) / 6, ny - (fy - y) / 6)} ${coordinate(nx, ny)}`;
      })
      .join(" ") +
    " Z"
  );
});

const mouths = [
  "M41 59 Q50 70 59 59 Z",
  "M43 61 Q50 65 59 58",
  "M43 61 Q54 63 60 55",
  "M44 62 Q50 57 56 62",
  "M42 58 Q50 68 59 58",
  "M44 61 Q50 67 56 61",
  "M42 60 Q45 54 48 61 T57 60",
  "M40 58 Q44 65 50 58 Q56 65 60 58",
  "",
  "M43 60 Q53 70 61 58",
  "M43 60 H57",
  "M41 58 Q50 73 59 58 Z",
  "M46 62 H54",
  "M41 59 Q50 71 59 59 Z",
  "M41 63 Q50 53 59 63",
  "M38 57 Q50 77 62 57 Z",
  "M45 60 Q50 64 55 60",
  "M47 61 Q51 63 55 59",
  "M41 61 Q53 68 61 57",
  "M38 56 Q50 76 62 56 Z",
];

function JellyAvatar({
  shapeId,
  color,
  expressionId,
  reaction = "idle",
  size,
}: AvatarConfig & {
  reaction?: Reaction;
  size: number;
}) {
  const id = useId().replace(/:/g, "");
  const path = paths[shapeId - 1] ?? paths[0];
  const face =
    reaction === "shocked" ? 9 : reaction === "winner" ? 12 : expressionId;
  return (
    <svg
      className="jelly"
      data-reaction={reaction}
      aria-hidden="true"
      viewBox="0 0 100 100"
      width={size}
      height={size}
    >
      <defs>
        <pattern
          id={id + "wax"}
          width="23"
          height="19"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(-17)"
        >
          <path
            d="M-4 1Q8 4 28 0M-3 7Q12 2 27 6M-4 10q17 2 32-3M-3 13q16 5 30 0M-4 19q21-6 32-1"
            fill="none"
            stroke="#352846"
            strokeWidth="1.05"
            opacity=".22"
          />
          <path
            d="M-4 4 28 2M-3 9q18-4 29-1M-4 15 29 12M-3 18q13-1 27-3"
            fill="none"
            stroke="#fffbec"
            strokeWidth="1.25"
            opacity=".58"
          />
          <path
            d="m3 6 5-2m-2 12 6-3m3-6 5-3m-2 12 4-1"
            stroke="#fff8dc"
            strokeWidth="1.1"
            opacity=".85"
            strokeLinecap="round"
          />
        </pattern>
        <filter id={id + "pencil"} x="-8%" y="-8%" width="116%" height="116%">
          <feTurbulence
            baseFrequency=".18"
            numOctaves="2"
            seed={shapeId}
            result="ink"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="ink"
            scale="2.6"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
        <clipPath id={id + "clip"}>
          <path d={path} />
        </clipPath>
      </defs>
      <g className="jelly-body">
        <g
          className="jelly-limbs"
          fill="none"
          stroke="#30253b"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M22 60q-8 4-14-4m0 0-2-4m2 4-5 1m75 1q9 2 15-7m0 0 2-4m-2 4 5-1M40 77l-5 12q-5-2-8 0m31-12 6 11q4-4 8-1" />
          <path
            d="M22 59q-9 4-13-4m31 24-4 8m22-8 6 8"
            strokeWidth=".7"
            opacity=".6"
          />
        </g>
        <path
          d={path}
          fill={color}
          stroke="#30253b"
          strokeWidth="2.4"
          className="jelly-ink"
          filter={`url(#${id}pencil)`}
        />
        <g clipPath={`url(#${id}clip)`}>
          <path d={path} fill={`url(#${id}wax)`} />
          <path
            d="M18 62Q29 79 51 78T86 62M22 65q24 22 58 5M29 74q17 10 38 2"
            fill="none"
            stroke="#342445"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity=".18"
          />
          <path
            d="M24 40q4-10 15-13m-12 17q3-10 15-15m-10 1 9-5"
            fill="none"
            stroke="#fff5df"
            strokeWidth="1.6"
            strokeLinecap="round"
            opacity=".91"
          />
        </g>
        <path
          d={path}
          fill="none"
          stroke="#30253b"
          strokeWidth=".78"
          transform="translate(1.1 -.8)"
          opacity=".61"
        />
        <ellipse
          cx="34"
          cy="57"
          rx="5"
          ry="2.4"
          fill="#fd537f"
          opacity={face === 17 ? 0.85 : 0.32}
        />
        <ellipse
          cx="66"
          cy="57"
          rx="5"
          ry="2.4"
          fill="#fd537f"
          opacity={face === 17 ? 0.85 : 0.32}
        />
        <g
          fill="#21132d"
          stroke="#21132d"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {face === 5 ? (
            <>
              <path d="M32 46 H68 M33 46 H47 L46 53 H36 Z M53 46 H67 L64 53 H54 Z" />
              <path d="M37 48 H42 M57 48 H62" stroke="#fff" opacity=".72" />
            </>
          ) : face === 11 ? (
            <>
              <path d="M31 46 H69 M34 46 H47 V53 H36 V50 H34 Z M53 46 H66 V50 H64 V53 H53 Z" />
              <path d="M37 48 h3 m16 0 h3" stroke="#fff" />
            </>
          ) : face === 7 ? (
            [40, 60].map((x) => (
              <path
                key={x}
                transform={`translate(${x - 40})`}
                d="M41 50 q-2 3-5 0 q-2-4 3-5 q6-1 6 5 q-1 6-7 5"
                fill="none"
                strokeWidth="1.3"
              />
            ))
          ) : face === 12 ? (
            [40, 60].map((x) => (
              <path
                key={x}
                transform={`translate(${x - 40})`}
                d="M40 43 L42 48 L47 49 L43 52 L44 57 L40 54 L36 57 L37 52 L33 49 L38 48 Z"
                fill="#ffeb79"
                strokeWidth="1.1"
              />
            ))
          ) : face === 13 ? (
            <path d="M36 51 H44 M56 51 H64" />
          ) : face === 6 ? (
            <g className="jelly-eyes">
              <ellipse cx="50" cy="49" rx="9" ry="7" fill="#fff" />
              <circle cx="52" cy="50" r="3.65" stroke="none" />
            </g>
          ) : (
            <g className="jelly-eyes">
              {[40, 60].map((x, i) =>
                face === 10 && i === 1 ? (
                  <path key={x} d="M55 51 Q60 46 65 51" fill="none" />
                ) : (
                  <g key={x} stroke="none">
                    <ellipse
                      cx={x}
                      cy={face === 2 && i === 1 ? 47 : 49}
                      rx={face === 19 || face === 2 ? 5.8 - i : 3.75}
                      ry={
                        face === 19 ? 6.6 - i : face === 18 && i === 1 ? 3 : 5.4
                      }
                      fill={face === 19 ? "#fff" : undefined}
                    />
                    {face === 19 ? (
                      <circle
                        cx={x + (i === 0 ? 1.5 : -1.5)}
                        cy={i === 0 ? 51 : 47}
                        r="2.6"
                      />
                    ) : (
                      <circle
                        cx={x + 1}
                        cy={face === 2 && i === 1 ? 45.5 : 47.5}
                        r="1.25"
                        fill="white"
                      />
                    )}
                  </g>
                ),
              )}
            </g>
          )}
          {face === 4 && <path d="M35 43 L44 47 M56 47 L65 43" />}
          {face === 15 && <path d="M35 46 L44 42 M56 42 L65 46" />}
          {face === 18 && <path d="M54 44 Q59 39 64 42" fill="none" />}
          {face === 9 ? (
            <ellipse cx="50" cy="61" rx="4.3" ry="5.5" />
          ) : (
            <path
              d={mouths[face - 1]}
              fill={[1, 12, 14, 16, 20].includes(face) ? "#21132d" : "none"}
            />
          )}
          {face === 14 && (
            <path d="M47 64 Q51 72 54 64 Z" fill="#fb6b9a" stroke="none" />
          )}
          {[16, 20].includes(face) && (
            <path d="M42 58 H58 Q50 65 42 58 Z" fill="white" stroke="none" />
          )}
        </g>
      </g>
    </svg>
  );
}

export default memo(JellyAvatar);
