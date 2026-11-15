"use client";

import { useEffect, useRef, useState } from "react";
import { Eraser } from "@/components/ArcadeIcons";
import { BRUSHES, type Stroke } from "@/lib/types";

const unit = (n: number) =>
  Math.round(Math.max(0, Math.min(1, n)) * 1000) / 1000;

function paint(context: CanvasRenderingContext2D, stroke: Stroke) {
  const { width, height } = context.canvas;
  context.strokeStyle = stroke.color;
  context.lineWidth = stroke.width * 1.5;
  context.lineCap = "round";
  context.beginPath();
  context.moveTo(stroke.x1 * width, stroke.y1 * height);
  context.lineTo(stroke.x2 * width + 0.01, stroke.y2 * height);
  context.stroke();
}

export default function TouchCanvas({
  strokes,
  onDraw,
}: {
  strokes: readonly Stroke[];
  onDraw?: (batch: Stroke[] | "clear") => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const pointer = useRef<{ id: number; x: number; y: number } | undefined>(
    undefined,
  );
  const pending = useRef<Stroke[]>([]);
  const send = useRef(onDraw);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [color, setColor] = useState<string>(BRUSHES[0]);
  const [width, setWidth] = useState(4);

  function flush() {
    clearTimeout(timer.current);
    timer.current = undefined;
    if (pending.current.length) send.current?.(pending.current.splice(0));
  }

  useEffect(() => {
    send.current = onDraw;
  }, [onDraw]);
  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    strokes.forEach((stroke) => paint(ctx, stroke));
    pending.current.forEach((stroke) => paint(ctx, stroke));
  }, [strokes]);
  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <div className="canvas-wrap">
      <canvas
        ref={canvas}
        width={720}
        height={480}
        aria-label={onDraw ? "Drawing pad" : "Live drawing"}
        data-drawing={Boolean(onDraw)}
        onPointerDown={(e) => {
          if (!onDraw || pointer.current) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          const rect = e.currentTarget.getBoundingClientRect();
          const x = unit((e.clientX - rect.left) / rect.width),
            y = unit((e.clientY - rect.top) / rect.height);
          pointer.current = { id: e.pointerId, x, y };
          const dot = { x1: x, y1: y, x2: x, y2: y, color, width };
          pending.current.push(dot);
          const ctx = canvas.current?.getContext("2d");
          if (ctx) paint(ctx, dot);
          timer.current ??= setTimeout(flush, 100);
        }}
        onPointerMove={(e) => {
          const point = pointer.current;
          if (!onDraw || point?.id !== e.pointerId) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const x = unit((e.clientX - rect.left) / rect.width),
            y = unit((e.clientY - rect.top) / rect.height);
          if (x === point.x && y === point.y) return;
          const stroke = {
            x1: point.x,
            y1: point.y,
            x2: x,
            y2: y,
            color,
            width,
          };
          pointer.current = { id: e.pointerId, x, y };
          pending.current.push(stroke);
          const ctx = canvas.current?.getContext("2d");
          if (ctx) paint(ctx, stroke);
          if (pending.current.length >= 40) flush();
          timer.current ??= setTimeout(flush, 100);
        }}
        onLostPointerCapture={(e) => {
          if (pointer.current?.id !== e.pointerId) return;
          pointer.current = undefined;
          flush();
        }}
      />
      {onDraw && (
        <div className="brush-toolbar">
          {BRUSHES.map((brush) => (
            <button
              key={brush}
              type="button"
              aria-label={`Brush ${brush}`}
              aria-pressed={brush === color}
              style={{ background: brush }}
              className="swatch"
              onClick={() => setColor(brush)}
            />
          ))}
          {[4, 10].map((size) => (
            <button
              key={size}
              type="button"
              className="brush-size"
              aria-label={size === 4 ? "Fine brush" : "Broad brush"}
              aria-pressed={size === width}
              onClick={() => setWidth(size)}
            >
              <i style={{ width: size + 3, height: size + 3 }} />
            </button>
          ))}
          <button
            type="button"
            className="subtle clear-brush"
            onClick={() => {
              pending.current = [];
              flush();
              canvas.current?.getContext("2d")?.clearRect(0, 0, 720, 480);
              onDraw("clear");
            }}
          >
            <Eraser size={16} /> Clear
          </button>
        </div>
      )}
    </div>
  );
}
