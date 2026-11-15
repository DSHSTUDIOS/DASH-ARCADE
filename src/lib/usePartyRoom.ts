"use client";

import { createClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Action, HubView, Player, Stroke } from "./types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishable =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const events = ["PLAYER_ACTION", "STATE_SYNC", "CANVAS_STROKE"] as const;
type EventName = (typeof events)[number];
type Status =
  "connecting" | "local" | "live" | "offline" | "secure-context-required";
type Role = "host" | "player";
type Peer = {
  id: string;
  role: Role;
  key: string;
  joinedAt: number;
  player?: Player;
};
type Packet = { to: string; iv: string; data: string };
type Frame = { from: string; packets: Packet[] };
type Envelope<T> = { seq: number; body: T };
type IncomingAction = Envelope<{ epoch: number; action: Action }>;
export type CanvasMessage = { key: string; batch: Stroke[] | "clear" };
type Callbacks = {
  onAction?: (player: string, epoch: number, action: Action) => void;
  onSync?: (state: HubView) => void;
  onCanvas?: (data: CanvasMessage) => void;
};
type Transport = {
  track: (peer: Peer) => void;
  send: (event: EventName, value: Frame) => void;
  close: () => void;
};
const encoder = new TextEncoder(),
  decoder = new TextDecoder();

function encode(bytes: Uint8Array) {
  let value = "";
  for (let i = 0; i < bytes.length; i += 8192)
    value += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(value);
}
function decode(value: string) {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}
function isPeer(data: unknown): data is Peer {
  if (!data || typeof data !== "object") return false;
  const p = data as Peer;
  return (
    typeof p.id === "string" &&
    /^[a-f0-9-]{36}$/i.test(p.id) &&
    (p.role === "host" || p.role === "player") &&
    typeof p.key === "string" &&
    p.key.length <= 180 &&
    Number.isFinite(p.joinedAt)
  );
}

function localTransport(
  topic: string,
  receive: (event: EventName, frame: Frame) => void,
  presence: (peers: Peer[]) => void,
): Transport {
  const channel = new BroadcastChannel(topic);
  const peers = new Map<string, { peer: Peer; seen: number }>();
  let self: Peer | undefined;
  const report = () => presence([...peers.values()].map((entry) => entry.peer));
  const announce = (discover = false) => {
    if (self) channel.postMessage({ presence: self, discover });
  };
  channel.onmessage = ({ data }) => {
    if (!data || typeof data !== "object") return;
    if (isPeer(data.presence)) {
      const peer = data.presence;
      const old = peers.get(peer.id);
      peers.set(peer.id, { peer, seen: Date.now() });
      if (!old || JSON.stringify(old.peer) !== JSON.stringify(peer)) report();
      if (data.discover) announce();
    } else if (
      typeof data.leave === "string" &&
      peers.get(data.leave)?.peer.key === data.key
    ) {
      peers.delete(data.leave);
      report();
    } else if (events.includes(data.event)) receive(data.event, data.frame);
  };
  const heartbeat = setInterval(() => {
    announce();
    let changed = false;
    for (const [id, entry] of peers) {
      if (Date.now() - entry.seen > 12000) {
        peers.delete(id);
        changed = true;
      }
    }
    if (changed) report();
  }, 2500);
  const leave = () => {
    if (self) channel.postMessage({ leave: self.id, key: self.key });
  };
  const rejoin = () => announce(true);
  window.addEventListener("pagehide", leave);
  window.addEventListener("pageshow", rejoin);
  return {
    track(peer) {
      const first = !self;
      self = peer;
      announce(first);
    },
    send(event, frame) {
      channel.postMessage({ event, frame });
    },
    close() {
      leave();
      clearInterval(heartbeat);
      channel.close();
      window.removeEventListener("pagehide", leave);
      window.removeEventListener("pageshow", rejoin);
    },
  };
}

function realtimeTransport(
  topic: string,
  id: string,
  receive: (event: EventName, frame: Frame) => void,
  presence: (peers: Peer[]) => void,
  status: (status: Status) => void,
): Transport {
  const client = createClient(url!, publishable!, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  const channel = client.channel(topic, {
    config: { broadcast: { self: false }, presence: { key: id } },
  });
  let current: Peer | undefined,
    subscribed = false,
    closed = false;
  channel.on("presence", { event: "sync" }, () => {
    presence(
      Object.values(channel.presenceState<Peer>()).flat().filter(isPeer),
    );
  });
  events.forEach((event) =>
    channel.on("broadcast", { event }, ({ payload }) =>
      receive(event, payload as Frame),
    ),
  );
  channel.subscribe((state) => {
    if (closed) return;
    subscribed = state === "SUBSCRIBED";
    if (subscribed) {
      if (current) void channel.track(current);
      status("live");
    } else {
      presence([]);
      status("offline");
    }
  });
  return {
    track(peer) {
      current = peer;
      if (subscribed) void channel.track(peer);
    },
    send(event, payload) {
      if (subscribed) void channel.send({ type: "broadcast", event, payload });
    },
    close() {
      closed = true;
      void client
        .removeChannel(channel)
        .finally(() => client.realtime.disconnect());
    },
  };
}

type Connection = {
  peers: Map<string, Peer>;
  send: <T>(event: EventName, frames: { to: string; body: T }[]) => void;
};

export function usePartyRoom(
  code: string,
  role: Role,
  id: string,
  player: Player | undefined,
  callbacks: Callbacks,
) {
  const [status, setStatus] = useState<Status>("connecting");
  const [peers, setPeers] = useState<Peer[]>([]);
  const latest = useRef(callbacks);
  const profile = useRef(player);
  const connection = useRef<Connection | null>(null);
  const tracked = useRef<{ self: Peer; transport: Transport } | null>(null);
  useEffect(() => {
    latest.current = callbacks;
  }, [callbacks]);
  useEffect(() => {
    profile.current = player;
    if (tracked.current)
      tracked.current.transport.track({ ...tracked.current.self, player });
  }, [player]);

  useEffect(() => {
    if (!id || !code) return;
    setStatus("connecting");
    setPeers([]);
    let stopped = false;
    let transport: Transport | undefined;
    const peerMap = new Map<string, Peer>();
    const latestPeerKey = new Map<string, string>();
    const pairKeys = new Map<string, Promise<CryptoKey>>();
    const seen = new Map<string, number>();
    let sequence = 0;
    let incoming = Promise.resolve();
    let actions = Promise.resolve();
    let pinnedHost: string | undefined;

    async function start() {
      if (!globalThis.crypto?.subtle) {
        setStatus("secure-context-required");
        return;
      }
      const pair = await crypto.subtle.generateKey(
        { name: "ECDH", namedCurve: "P-256" },
        false,
        ["deriveKey"],
      );
      const pub = encode(
        new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey)),
      );
      if (stopped) return;
      const self: Peer = { id, role, key: pub, joinedAt: Date.now() };
      function shared(peer: Peer) {
        const cacheKey = peer.id + peer.key;
        let derived = pairKeys.get(cacheKey);
        if (!derived) {
          derived = crypto.subtle
            .importKey(
              "raw",
              decode(peer.key),
              { name: "ECDH", namedCurve: "P-256" },
              false,
              [],
            )
            .then((publicKey) =>
              crypto.subtle.deriveKey(
                { name: "ECDH", public: publicKey },
                pair.privateKey,
                { name: "AES-GCM", length: 256 },
                false,
                ["encrypt", "decrypt"],
              ),
            );
          pairKeys.set(cacheKey, derived);
        }
        return derived;
      }
      const additionalData = (event: EventName, from: string, to: string) =>
        encoder.encode(`${code}/${event}/${from}/${to}`);
      function receive(event: EventName, frame: Frame) {
        if (
          stopped ||
          !frame ||
          typeof frame.from !== "string" ||
          !Array.isArray(frame.packets) ||
          frame.packets.length > 12
        )
          return;
        const peer = peerMap.get(frame.from);
        if (
          !peer ||
          (role === "host"
            ? event !== "PLAYER_ACTION" || peer.role !== "player"
            : event === "PLAYER_ACTION" || peer.id !== pinnedHost)
        )
          return;
        const packet = frame.packets.find((item) => item?.to === id);
        if (
          !packet ||
          typeof packet.data !== "string" ||
          packet.data.length > 235000 ||
          typeof packet.iv !== "string" ||
          packet.iv.length !== 16
        )
          return;
        incoming = incoming
          .then(async () => {
            const key = await shared(peer);
            const data = await crypto.subtle.decrypt(
              {
                name: "AES-GCM",
                iv: decode(packet.iv),
                additionalData: additionalData(event, peer.id, id),
              },
              key,
              decode(packet.data),
            );
            const envelope = JSON.parse(
              decoder.decode(data),
            ) as Envelope<unknown>;
            const sender = peer.id + peer.key + event;
            if (
              stopped ||
              peerMap.get(peer.id)?.key !== peer.key ||
              !Number.isSafeInteger(envelope.seq) ||
              envelope.seq <= (seen.get(sender) ?? 0)
            )
              return;
            seen.set(sender, envelope.seq);
            if (event === "PLAYER_ACTION") {
              const { epoch, action } = envelope.body as IncomingAction["body"];
              if (
                Number.isSafeInteger(epoch) &&
                action &&
                typeof action.type === "string"
              )
                latest.current.onAction?.(peer.id, epoch, action);
            }
            if (event === "STATE_SYNC")
              latest.current.onSync?.(envelope.body as HubView);
            if (event === "CANVAS_STROKE")
              latest.current.onCanvas?.(envelope.body as CanvasMessage);
          })
          .catch(() => {
            /* Ignore malformed, stale, or unauthenticated packets. */
          });
      }

      function presence(members: Peer[]) {
        if (stopped) return;
        const active = new Map<string, Peer>();
        members
          .filter((peer) => peer.id !== id)
          .sort((a, b) => a.joinedAt - b.joinedAt)
          .forEach((peer) => active.set(peer.id, peer));
        if (role === "player" && !pinnedHost) {
          pinnedHost = [...active.values()].find(
            (peer) => peer.role === "host",
          )?.id;
        }
        for (const peer of active.values()) {
          const previous = latestPeerKey.get(peer.id);
          if (previous && previous !== peer.key) {
            pairKeys.delete(peer.id + previous);
            events.forEach((event) => seen.delete(peer.id + previous + event));
          }
          latestPeerKey.set(peer.id, peer.key);
        }
        if (
          JSON.stringify([...peerMap.values()]) ===
          JSON.stringify([...active.values()])
        )
          return;
        peerMap.clear();
        active.forEach((peer, key) => peerMap.set(key, peer));
        setPeers([...active.values()]);
      }

      connection.current = {
        peers: peerMap,
        send<T>(event: EventName, frames: { to: string; body: T }[]) {
          const seq = ++sequence;
          const emit = async () => {
            const encoded = await Promise.all(
              frames.map(async ({ to, body }): Promise<Packet | null> => {
                const peer = peerMap.get(to);
                if (!peer || (role === "player" && to !== pinnedHost))
                  return null;
                try {
                  const iv = crypto.getRandomValues(new Uint8Array(12));
                  const ciphertext = await crypto.subtle.encrypt(
                    {
                      name: "AES-GCM",
                      iv,
                      additionalData: additionalData(event, id, to),
                    },
                    await shared(peer),
                    encoder.encode(JSON.stringify({ seq, body })),
                  );
                  return {
                    to,
                    iv: encode(iv),
                    data: encode(new Uint8Array(ciphertext)),
                  };
                } catch {
                  return null;
                }
              }),
            );
            if (stopped) return;
            let packets: Packet[] = [],
              size = 0;
            for (const packet of encoded) {
              if (!packet || packet.data.length > 235000) continue;
              if (size + packet.data.length > 235000) {
                transport?.send(event, { from: id, packets });
                packets = [];
                size = 0;
              }
              packets.push(packet);
              size += packet.data.length + 100;
            }
            if (packets.length) transport?.send(event, { from: id, packets });
          };
          if (role === "player" || event === "CANVAS_STROKE")
            actions = actions.then(emit).catch(() => {});
          else void emit();
        },
      };
      transport =
        url && publishable
          ? realtimeTransport(`room:${code}`, id, receive, presence, setStatus)
          : localTransport(`room:${code}`, receive, presence);
      tracked.current = { self, transport };
      transport.track({ ...self, player: profile.current });
      if (!url || !publishable) setStatus("local");
    }

    void start().catch(() => {
      if (!stopped) setStatus("offline");
    });
    return () => {
      stopped = true;
      tracked.current = null;
      connection.current = null;
      transport?.close();
    };
  }, [code, role, id]);

  const sendAction = useCallback((epoch: number, action: Action) => {
    const host = [...(connection.current?.peers.values() ?? [])].find(
      (peer) => peer.role === "host",
    );
    if (host)
      connection.current?.send("PLAYER_ACTION", [
        { to: host.id, body: { epoch, action } },
      ]);
  }, []);
  const sync = useCallback(
    (frames: { to: string; body: HubView }[]) =>
      connection.current?.send("STATE_SYNC", frames),
    [],
  );
  const relayCanvas = useCallback(
    (frames: { to: string; body: CanvasMessage }[]) =>
      connection.current?.send("CANVAS_STROKE", frames),
    [],
  );
  return { status, peers, sendAction, sync, relayCanvas };
}
