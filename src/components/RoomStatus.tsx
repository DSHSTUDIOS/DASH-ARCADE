import { Radio } from "@/components/ArcadeIcons";
import { usePartyRoom } from "@/lib/usePartyRoom";

type Status = ReturnType<typeof usePartyRoom>["status"];
const labels: Record<Status, string> = {
  connecting: "Connecting",
  live: "Live room",
  local: "Local tabs",
  offline: "Reconnecting",
  "secure-context-required": "HTTPS required",
};
export default function RoomStatus({ status }: { status: Status }) {
  return (
    <span className="room-status" data-status={status}>
      <Radio size={14} /> {labels[status]}
    </span>
  );
}
