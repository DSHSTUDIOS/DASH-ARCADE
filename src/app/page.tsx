"use client";

import {
  ArrowDown,
  ArrowRight,
  Gamepad2,
  Monitor,
  Smartphone,
  Users,
  Zap,
} from "@/components/ArcadeIcons";
import Link from "next/link";
import { games } from "@/games/registry";
import { Brand, GameCard, ModuleLabel } from "@/components/HubUI";
import DoodleScene from "@/components/DoodleScene";
import JellyAvatar from "@/components/JellyAvatar";

export default function Home() {
  return (
    <div className="page-shell landing">
      <header className="topbar">
        <Brand />
        <a href="#games" className="topbar-games">
          Browse games <ArrowDown size={15} />
        </a>
      </header>
      <main>
        <section className="hero">
          <div className="hero-copy">
            <ModuleLabel icon={<Zap size={14} fill="currentColor" />}>
              THE TV PARTY ARCADE
            </ModuleLabel>
            <h1>
              The party
              <br />
              is <em>on.</em>
            </h1>
            <p>
              Turn your TV into a party arcade. Grab your phone, rally your
              friends, and play eleven games in one room.
            </p>
            <div className="actions hero-actions">
              <Link href="/host" className="primary">
                <Monitor size={20} />
                <span>
                  Host Game Night<small>ON THE TV</small>
                </span>
                <ArrowRight size={18} />
              </Link>
              <Link href="/play" className="secondary">
                <Smartphone size={20} />
                <span>
                  Join with Room Code<small>ON YOUR PHONE</small>
                </span>
                <ArrowRight size={18} />
              </Link>
            </div>
          </div>
          <div className="hero-stage" aria-hidden="true">
            <DoodleScene />
            <div className="hero-blob blob-blue">
              <JellyAvatar
                shapeId={7}
                color="#70b7e1"
                expressionId={5}
                size={220}
              />
            </div>
            <div className="hero-blob blob-pink">
              <JellyAvatar
                shapeId={3}
                color="#e994af"
                expressionId={16}
                size={300}
              />
            </div>
            <div className="hero-blob blob-lime">
              <JellyAvatar
                shapeId={15}
                color="#a7cb75"
                expressionId={10}
                size={185}
              />
            </div>
          </div>
        </section>
        <div className="feature-strip">
          <span>
            <Monitor size={17} /> One big screen
          </span>
          <span>
            <Smartphone size={17} /> Phones as controllers
          </span>
          <span>
            <Users size={17} /> 2–12 players
          </span>
          <span>
            <Gamepad2 size={17} /> 11 party games
          </span>
        </div>
        <section className="library" id="games">
          <div className="library-heading">
            <ModuleLabel icon={<Gamepad2 size={15} />}>
              THE GAME LINEUP
            </ModuleLabel>
            <h2>Everybody plays.</h2>
          </div>
          <div className="library-grid">
            {games.map((game) => (
              <GameCard key={game.id} choice={game.id} />
            ))}
          </div>
        </section>
      </main>
      <footer className="landing-footer">
        <Brand />
        <span>Made by Pratik Dash.</span>
      </footer>
    </div>
  );
}
