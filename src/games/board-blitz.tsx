import {
  Clover,
  Coins,
  Dices,
  Flame,
  Star,
  Zap,
} from "@/components/ArcadeIcons";
import { useEffect, useState } from "react";
import JellyAvatar from "@/components/JellyAvatar";
import {
  CoinCount,
  findPlayer,
  nameOf,
  PlayerBadge,
  Timer,
} from "@/components/GameUI";
import { keyed, orderBy, roll } from "@/lib/types";
import {
  defineGame,
  type GameContext,
  type GameResult,
  type ScreenProps,
} from "./types";

const tiles = [
  "blue",
  "lucky",
  "red",
  "blue",
  "chaos",
  "blue",
  "red",
  "lucky",
  "blue",
  "red",
  "chaos",
  "blue",
  "lucky",
  "red",
  "blue",
  "chaos",
] as const;
const tileIcons = { blue: Coins, red: Flame, lucky: Clover, chaos: Zap };
type Token = {
  position: number;
  coins: number;
  stars: number;
  move?: { from: number; steps: number; at: number };
};
type Board = {
  round: number;
  turn: number;
  star: number;
  players: Record<string, Token>;
  stage: "ROLL" | "MOVE" | "STAR" | "MASH" | "WAIT" | "DRAW" | "RESULT";
  deadline: number;
  note: string;
  die: number;
  taps: Record<string, number>;
  winners: string[];
};

function create({ ids, now }: GameContext): Board {
  return {
    round: 1,
    turn: 0,
    star: 2 + roll(13),
    players: keyed(ids, () => ({ position: 0, coins: 10, stars: 0 })),
    stage: "ROLL",
    deadline: now + 30000,
    note: "Roll the dice to get moving.",
    die: 0,
    taps: {},
    winners: [],
  };
}

function step(
  data: Board,
  { now, ids, online }: GameContext,
  event?: { player: string; type: string; value?: unknown },
): GameResult<Board> {
  const actor = ids[data.turn];
  const token = data.players[actor];
  const expired = now >= data.deadline;
  const nextTurn = (board: Board): GameResult<Board> => {
    if (board.turn + 1 < ids.length) {
      return {
        data: {
          ...board,
          turn: board.turn + 1,
          stage: "ROLL",
          deadline: now + 30000,
        },
      };
    }
    const mash = board.round % 2 === 1;
    return {
      data: {
        ...board,
        stage: mash ? "MASH" : "WAIT",
        deadline: now + (mash ? 10000 : 1800 + roll(3000)),
        taps: {},
        note: mash
          ? "Tap as fast as you can!"
          : "Wait for DRAW! An early tap disqualifies you.",
      },
    };
  };

  if (
    data.stage === "ROLL" &&
    (!online.includes(actor) ||
      expired ||
      (event?.player === actor && event.type === "roll"))
  ) {
    const die = 1 + roll(6);
    return {
      data: {
        ...data,
        die,
        stage: "MOVE",
        deadline: now + die * 150 + 330,
        players: {
          ...data.players,
          [actor]: {
            ...token,
            move: { from: token.position, steps: die, at: now },
          },
        },
        note: `Rolled a ${die}!`,
      },
      effect: "dice",
    };
  }
  if (data.stage === "MOVE" && expired) {
    const position = (token.position + data.die) % tiles.length;
    const crossed = Array.from(
      { length: data.die },
      (_, i) => (token.position + i + 1) % tiles.length,
    ).includes(data.star);
    const players = {
      ...data.players,
      [actor]: { ...token, position, move: undefined },
    };
    const current = players[actor];
    let note: string;
    if (position === data.star) note = "Golden Star tile!";
    else if (tiles[position] === "chaos") {
      const leader = orderBy(
        ids.filter((id) => id !== actor),
        (id) => players[id].coins,
      )[0];
      const outcome = roll(3);
      if (leader && outcome === 0) {
        players[leader] = { ...players[leader], coins: current.coins };
        current.coins = data.players[leader].coins;
        note = "Chaos! Swapped coins with the richest rival.";
      } else if (leader && outcome === 1) {
        const stolen = Math.min(4, players[leader].coins);
        players[leader] = {
          ...players[leader],
          coins: players[leader].coins - stolen,
        };
        current.coins += stolen;
        note = `Chaos! Stole ${stolen} coins from a rival.`;
      } else {
        current.coins += 8;
        note = "Chaos! The arcade donated 8 coins.";
      }
    } else {
      const delta =
        tiles[position] === "blue" ? 3 : tiles[position] === "red" ? -3 : 6;
      current.coins = Math.max(0, current.coins + delta);
      note = `${delta > 0 ? "+" : ""}${delta} coins`;
    }
    if (crossed && current.coins >= 15 && online.includes(actor)) {
      return {
        data: {
          ...data,
          players,
          stage: "STAR",
          deadline: now + 14000,
          note: note + " Spend 15 coins on a star?",
        },
        effect: "coin",
      };
    }
    return {
      ...nextTurn({
        ...data,
        players,
        note: crossed ? note + " A star costs 15 coins." : note,
      }),
      effect: "coin",
    };
  }
  if (
    data.stage === "STAR" &&
    (expired ||
      !online.includes(actor) ||
      (event?.player === actor && ["buy", "pass"].includes(event.type)))
  ) {
    if (!expired && event?.type === "buy" && token.coins >= 15) {
      return {
        ...nextTurn({
          ...data,
          star: (data.star + 1 + roll(15)) % 16,
          note: "Star purchased! The star moved.",
          players: {
            ...data.players,
            [actor]: {
              ...token,
              coins: token.coins - 15,
              stars: token.stars + 1,
            },
          },
        }),
        effect: "coin",
      };
    }
    return nextTurn({ ...data, note: "The star stays on the board." });
  }
  if (data.stage === "WAIT" && expired) {
    return {
      data: { ...data, stage: "DRAW", deadline: now + 3300, note: "DRAW!" },
      effect: "gavel",
    };
  }
  if (
    ["MASH", "WAIT", "DRAW"].includes(data.stage) &&
    !expired &&
    event?.type === "tap"
  ) {
    const old = data.taps[event.player];
    if (data.stage !== "MASH" && old !== undefined) return { data };
    return {
      data: {
        ...data,
        taps: {
          ...data.taps,
          [event.player]:
            data.stage === "MASH"
              ? (old ?? 0) + 1
              : data.stage === "WAIT"
                ? -1
                : now,
        },
      },
    };
  }
  if (["MASH", "DRAW"].includes(data.stage) && expired) {
    const eligible = ids.filter((id) => (data.taps[id] ?? -1) > 0);
    const winners = orderBy(
      eligible,
      (id) => data.taps[id] * (data.stage === "DRAW" ? -1 : 1),
    ).slice(0, 3);
    const players = { ...data.players };
    winners.forEach((id, i) => {
      players[id] = {
        ...players[id],
        coins: players[id].coins + [10, 5, 2][i],
      };
    });
    return {
      data: {
        ...data,
        players,
        winners,
        stage: "RESULT",
        deadline: now + 4200,
        note: "Minigame results",
      },
      effect: "coin",
    };
  }
  if (data.stage === "RESULT" && expired) {
    if (data.round === 6) {
      const rankings = [...ids].sort(
        (a, b) =>
          data.players[b].stars - data.players[a].stars ||
          data.players[b].coins - data.players[a].coins,
      );
      return { data, rankings };
    }
    return {
      data: {
        ...data,
        round: data.round + 1,
        turn: 0,
        stage: "ROLL",
        deadline: now + 30000,
        note: "Next round!",
      },
    };
  }
  return { data };
}

function BoardToken({
  token,
  avatar,
  index,
  total,
}: {
  token: Token;
  avatar: NonNullable<ReturnType<typeof findPlayer>>["avatar"];
  index: number;
  total: number;
}) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    if (!token.move) return;
    const move = token.move;
    const tick = () =>
      setProgress(
        Math.min(
          move.steps,
          Math.max(0, Math.floor((Date.now() - move.at) / 150)),
        ),
      );
    tick();
    const timer = setInterval(tick, 35);
    return () => clearInterval(timer);
  }, [token.move]);
  const pos = token.move ? token.move.from + progress : token.position;
  const angle = (pos / 16) * Math.PI * 2 - Math.PI / 2;
  const offset = (index - (total - 1) / 2) * Math.min(2.4, 12 / total);
  return (
    <div
      className="board-token"
      style={{
        left: `${50 + 35 * Math.cos(angle) + offset}%`,
        top: `${50 + 35 * Math.sin(angle)}%`,
        zIndex: index + 1,
      }}
    >
      <div key={pos} className={token.move ? "token-hop" : ""}>
        <JellyAvatar {...avatar} size={43} />
      </div>
    </div>
  );
}

function TV({ data, room, now }: ScreenProps<Board>) {
  const ids = Object.keys(data.players);
  const isMini = ["MASH", "WAIT", "DRAW", "RESULT"].includes(data.stage);
  return (
    <div className="game-columns">
      <div className="board">
        {tiles.map((tile, i) => {
          const angle = (i / 16) * Math.PI * 2 - Math.PI / 2;
          const Icon = data.star === i ? Star : tileIcons[tile];
          return (
            <div
              key={i}
              className="board-tile"
              data-tile={data.star === i ? "star" : tile}
              style={{
                left: `${50 + 41 * Math.cos(angle)}%`,
                top: `${50 + 41 * Math.sin(angle)}%`,
              }}
            >
              <Icon size={20} />
              <small>{i + 1}</small>
            </div>
          );
        })}
        {ids.map((id, i) => {
          const avatar = findPlayer(room, id)?.avatar;
          return (
            avatar && (
              <BoardToken
                key={id}
                token={data.players[id]}
                avatar={avatar}
                index={i}
                total={ids.length}
              />
            )
          );
        })}
        <div className="board-middle">
          <span className="eyebrow">ROUND {data.round} / 6</span>
          <h2>
            {isMini
              ? data.round % 2
                ? "Button Masher"
                : "Quick Draw"
              : nameOf(room, ids[data.turn])}
          </h2>
          {data.stage === "MOVE" && (
            <strong className="die-pop">{data.die}</strong>
          )}
          <p>{data.note}</p>
          {data.stage !== "WAIT" && (
            <Timer deadline={data.deadline} now={now} />
          )}
          {data.stage === "RESULT" &&
            data.winners.map((id, i) => (
              <small key={id}>
                {nameOf(room, id)} +{[10, 5, 2][i]}
              </small>
            ))}
        </div>
      </div>
      <aside className="panel game-sidebar">
        <h3>Standings</h3>
        {ids.map((id) => (
          <PlayerBadge
            key={id}
            player={findPlayer(room, id)}
            detail={
              <span className="inline-stats">
                <Star size={14} /> {data.players[id].stars}{" "}
                <CoinCount coins={data.players[id].coins} />
              </span>
            }
            dim={!room.online.includes(id)}
          />
        ))}
        <div className="tile-legend">
          <span>Blue +3</span>
          <span>Red −3</span>
          <span>Lucky +6</span>
          <span>Star 15 coins</span>
        </div>
      </aside>
    </div>
  );
}

function Phone({ data, room, now, me, send }: ScreenProps<Board>) {
  const ids = Object.keys(data.players);
  const actor = ids[data.turn];
  const token = data.players[me];
  const mini = ["MASH", "WAIT", "DRAW", "RESULT"].includes(data.stage);
  return (
    <div className="controller-stack">
      <div className="split">
        <span className="eyebrow">ROUND {data.round} / 6</span>
        {data.stage !== "WAIT" && <Timer deadline={data.deadline} now={now} />}
      </div>
      <h2>
        {mini
          ? data.round % 2
            ? "Button Masher"
            : "Quick Draw"
          : actor === me
            ? "Your turn"
            : `${nameOf(room, actor)}’s turn`}
      </h2>
      <p>{data.note}</p>
      <div className="inline-stats">
        <Star size={18} /> {token.stars} stars <CoinCount coins={token.coins} />
      </div>
      {data.stage === "ROLL" && actor === me && (
        <button className="primary action-xl" onClick={() => send("roll")}>
          <Dices /> Roll dice
        </button>
      )}
      {data.stage === "STAR" && actor === me && (
        <div className="actions">
          <button className="primary" onClick={() => send("buy")}>
            <Star size={18} /> Buy star
          </button>
          <button className="secondary" onClick={() => send("pass")}>
            Pass
          </button>
        </div>
      )}
      {["MASH", "WAIT", "DRAW"].includes(data.stage) && (
        <button
          className={`primary action-xl ${data.stage === "DRAW" ? "draw-now" : ""}`}
          disabled={data.stage !== "MASH" && data.taps[me] !== undefined}
          onPointerDown={(e) => {
            if (e.button === 0) send("tap");
          }}
          onClick={(e) => {
            if (e.detail === 0) send("tap");
          }}
        >
          {data.stage === "MASH"
            ? `TAP! · ${data.taps[me] ?? 0}`
            : data.taps[me] === -1
              ? "Too early!"
              : data.taps[me]
                ? "Hit!"
                : data.stage === "DRAW"
                  ? "DRAW!"
                  : "Hold…"}{" "}
        </button>
      )}
      {data.stage === "RESULT" &&
        data.winners.map((id, i) => (
          <PlayerBadge
            key={id}
            player={findPlayer(room, id)}
            detail={`+${[10, 5, 2][i]} coins`}
          />
        ))}
    </div>
  );
}

export default defineGame<Board, Board>({
  id: "board-blitz",
  title: "Board Blitz",
  category: "BOARD PARTY",
  accent: "#b2f575",
  icon: Dices,
  description: "Roll, race, and hoard stars on a chaotic board.",
  create,
  step,
  playerView: (data) =>
    data.stage === "WAIT" ? { ...data, deadline: 0 } : data,
  TV,
  Phone,
});
