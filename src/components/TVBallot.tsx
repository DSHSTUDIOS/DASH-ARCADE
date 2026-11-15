"use client";

import { useEffect, useState } from "react";
import { GameCard } from "@/components/HubUI";
import { choices } from "@/lib/hub";
import type { GameChoice, HubView } from "@/lib/types";

const perPage = 6;
const pageCount = Math.ceil(choices.length / perPage);

export default function TVBallot({
  room,
  contender,
}: {
  room: HubView;
  contender?: GameChoice;
}) {
  const [page, setPage] = useState(0);
  const [manual, setManual] = useState(false);

  useEffect(() => {
    if (manual || contender || pageCount <= 1) return;
    const timer = window.setInterval(() => {
      if (document.hidden || document.querySelector('[aria-modal="true"]'))
        return;
      setPage((current) => (current + 1) % pageCount);
    }, 8500);
    return () => window.clearInterval(timer);
  }, [manual, contender]);

  return contender ? (
    <div className="roulette-card">
      <GameCard key={contender} choice={contender} room={room} highlighted />
    </div>
  ) : (
    <div className="tv-ballot">
      <div className="vote-grid" key={page}>
        {choices
          .slice(page * perPage, page * perPage + perPage)
          .map((choice) => (
            <GameCard key={choice} choice={choice} room={room} />
          ))}
      </div>
      {pageCount > 1 && (
        <div className="tv-ballot-pages" aria-label="Game card pages">
          {Array.from({ length: pageCount }, (_, index) => (
            <button
              key={index}
              className="secondary"
              aria-label={`Show games ${index * perPage + 1} to ${Math.min(choices.length, (index + 1) * perPage)}`}
              aria-pressed={page === index}
              onClick={() => {
                setPage(index);
                setManual(true);
              }}
            >
              {index + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
