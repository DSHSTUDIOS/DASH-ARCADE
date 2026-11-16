import { Timer, findPlayer } from "@/components/GameUI";
import JellyAvatar from "@/components/JellyAvatar";
import { gameInfo } from "@/components/HubUI";
import type { HubView, TeamId } from "@/lib/types";
import { TEAM_IDS, teamNames } from "@/games/team/shared";

export default function TeamDraftBanner({
  room,
  now,
  me,
  onPick,
  onBalance,
}: {
  room: HubView;
  now: number;
  me?: string;
  onPick?: (team: TeamId) => void;
  onBalance?: () => void;
}) {
  const draft = room.teamDraft;
  if (!draft) return null;
  const cap = Math.ceil(draft.eligible.length / 2);
  const remaining = draft.eligible.filter((id) => !draft.picks[id]).length;

  return (
    <section className="team-draft team-surface">
      <header className="split team-draft-head">
        <div>
          <span className="eyebrow">{gameInfo(draft.game).title}</span>
          <h1>Team Split</h1>
        </div>
        <Timer now={now} deadline={room.deadline} duration={15} />
      </header>
      <p>Pick a side. Open spots will be filled when time runs out.</p>
      <div className="team-pair">
        {TEAM_IDS.map((team) => {
          const ids = draft.eligible.filter((id) => draft.picks[id] === team);
          const selected = me !== undefined && draft.picks[me] === team;
          return (
            <article key={team} className="team-box" data-team={team}>
              <header>
                <h2>{teamNames[team]}</h2>
                <b>
                  {ids.length} / {cap}
                </b>
              </header>
              <div className="team-jellies">
                {ids.map((id) => {
                  const player = findPlayer(room, id);
                  return (
                    player && (
                      <span key={id} title={player.name}>
                        <JellyAvatar {...player.avatar} size={35} />
                        {player.name}
                      </span>
                    )
                  );
                })}
              </div>
              {me && onPick && draft.eligible.includes(me) && (
                <button
                  type="button"
                  className="primary"
                  aria-pressed={selected}
                  disabled={!selected && ids.length >= cap}
                  onClick={() => onPick(team)}
                >
                  {selected
                    ? "Joined"
                    : ids.length >= cap
                      ? "Team full"
                      : `Join ${teamNames[team]}`}
                </button>
              )}
            </article>
          );
        })}
      </div>
      {onBalance && (
        <div className="split team-draft-foot">
          <p>{remaining} still choosing</p>
          <button className="secondary" data-tv-default onClick={onBalance}>
            Auto-Balance Teams
          </button>
        </div>
      )}
    </section>
  );
}
