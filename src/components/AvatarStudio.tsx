"use client";

import {
  ChevronLeft,
  ChevronRight,
  Dices,
  Palette,
  Zap,
} from "@/components/ArcadeIcons";
import JellyAvatar, { faceNames, shapeNames } from "./JellyAvatar";
import { ModuleLabel } from "./HubUI";
import { COLORS, randomAvatar, type AvatarConfig } from "@/lib/types";

function OptionPicker({
  name,
  items,
  value,
  change,
}: {
  name: string;
  items: string[];
  value: number;
  change: (next: number) => void;
}) {
  return (
    <div className="option-picker">
      <label htmlFor={`avatar-${name}`}>{name}</label>
      <div className="option-input">
        <button
          className="icon-button"
          type="button"
          aria-label={`Previous ${name.toLowerCase()}`}
          onClick={() => change(value === 1 ? items.length : value - 1)}
        >
          <ChevronLeft size={19} />
        </button>
        <select
          id={`avatar-${name}`}
          value={value}
          onChange={(e) => change(Number(e.target.value))}
        >
          {items.map((item, i) => (
            <option key={item} value={i + 1}>
              {item} · {i + 1}/{items.length}
            </option>
          ))}
        </select>
        <button
          className="icon-button"
          type="button"
          aria-label={`Next ${name.toLowerCase()}`}
          onClick={() => change(value === items.length ? 1 : value + 1)}
        >
          <ChevronRight size={19} />
        </button>
      </div>
    </div>
  );
}
export default function AvatarStudio({
  avatar,
  onChange,
  onReady,
}: {
  avatar: AvatarConfig;
  onChange: (value: AvatarConfig) => void;
  onReady: () => void;
}) {
  return (
    <section className="panel phone-panel avatar-studio">
      <ModuleLabel icon={<Palette size={15} />}>AVATAR STUDIO</ModuleLabel>
      <h1>Build your Jelly.</h1>
      <div
        className="studio-preview"
        style={{ "--jelly-color": avatar.color } as React.CSSProperties}
      >
        <JellyAvatar {...avatar} size={165} />
      </div>
      <OptionPicker
        name="Shape"
        items={shapeNames}
        value={avatar.shapeId}
        change={(shapeId) => onChange({ ...avatar, shapeId })}
      />
      <OptionPicker
        name="Face"
        items={faceNames}
        value={avatar.expressionId}
        change={(expressionId) => onChange({ ...avatar, expressionId })}
      />
      <div className="option-picker">
        <label htmlFor="custom-color">Color</label>
        <div className="avatar-swatches">
          {COLORS.map(([name, color]) => (
            <button
              type="button"
              className="swatch"
              key={color}
              style={{ background: color }}
              aria-label={name}
              title={name}
              aria-pressed={avatar.color === color}
              onClick={() => onChange({ ...avatar, color })}
            />
          ))}
          <input
            type="color"
            id="custom-color"
            aria-label="Custom color wheel"
            value={avatar.color}
            onChange={(e) => onChange({ ...avatar, color: e.target.value })}
          />
        </div>
      </div>
      <div className="actions studio-actions">
        <button className="secondary" onClick={() => onChange(randomAvatar())}>
          <Dices size={18} /> Randomize Dice
        </button>
        <button className="primary" onClick={onReady}>
          <Zap size={17} /> Ready up!
        </button>
      </div>
    </section>
  );
}
