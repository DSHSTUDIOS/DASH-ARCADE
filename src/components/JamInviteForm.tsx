"use client";

import { useState } from "react";
import { spotifyInvite } from "@/lib/spotifyJam";

export default function JamInviteForm({
  submitLabel,
  onInvite,
}: {
  submitLabel: string;
  onInvite: (url: string) => void;
}) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  return (
    <form
      className="jam-form"
      onSubmit={(event) => {
        event.preventDefault();
        const url = spotifyInvite(value);
        if (!url) {
          setError("Copy the invite link from Spotify’s Jam menu.");
          return;
        }
        onInvite(url);
        setValue("");
        setError("");
      }}
    >
      <label>
        Spotify Jam invite link
        <input
          type="url"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          autoComplete="off"
          maxLength={512}
          required
          placeholder="https://spotify.link/…"
        />
      </label>
      <button className="secondary" type="submit">{submitLabel}</button>
      {error && <small role="alert">{error}</small>}
    </form>
  );
}
