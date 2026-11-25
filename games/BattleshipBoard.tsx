"use client";
import { useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { supabase, type Game } from "@/lib/supabase";
import { notify } from "@/lib/push";
import type { Move } from "@/lib/games";
import { battleship as bs, N, type Ship, type State } from "./battleship";
import css from "./battleship.module.css";

const coord = (c: number) => "ABCDEFGHIJ"[c % N] + (Math.floor(c / N) + 1);

type Drag = { grab(c: number): void; move(c: number): void; drop(cancelled?: boolean): void };

/** Cell under the pointer, clamped onto the board so a drag past the edge still tracks. */
function cellAt(e: PointerEvent<HTMLDivElement>) {
  const r = e.currentTarget.getBoundingClientRect();
  const f = (v: number) => Math.max(0, Math.min(N - 1, Math.floor(v * N)));
  return f((e.clientY - r.top) / r.height) * N + f((e.clientX - r.left) / r.width);
}

/** One 10x10 sea. `fleet` decides hits; `show` picks which of its ships are drawn. `drag` makes the ships movable. */
function Sea({ fleet, show, shots, small, aim, held, last, onCell, drag }: {
  fleet: Ship[]; show: (s: Ship) => boolean; shots: number[]; small?: boolean;
  aim?: number | null; held?: number | null; last?: number; onCell?: (c: number) => void; drag?: Drag;
}) {
  return (
    <div
      className={`${css.sea}${small ? ` ${css.small}` : ""}${drag ? ` ${css.placing}` : ""}`}
      onPointerDown={drag && ((e) => (e.currentTarget.setPointerCapture(e.pointerId), drag.grab(cellAt(e))))}
      onPointerMove={drag && ((e) => drag.move(cellAt(e)))}
      onPointerUp={drag && (() => drag.drop())}
      onPointerCancel={drag && (() => drag.drop(true))}
    >
      {fleet.map((s, i) => show(s) && (
        // sprites are drawn bow-left; a vertical ship is the same strip turned about its bow cell
        <i
          key={i}
          className={`${css.ship}${s.h ? "" : ` ${css.v}`}${bs.sunk(s, shots) ? ` ${css.sunk}` : ""}${held === i ? ` ${css.lift}` : ""}`}
          style={{ "--x": s.at % N, "--y": Math.floor(s.at / N), "--len": s.len, backgroundImage: `url(/battleship/${i}.png)` } as CSSProperties}
        />
      ))}
      {Array.from({ length: N * N }, (_, c) => {
        const shot = shots.includes(c);
        const mark = !shot ? "" : bs.shipAt(fleet, c) >= 0 ? css.hit : css.miss;
        return (
          <button
            key={c}
            className={`${css.cell} ${mark}${aim === c ? ` ${css.aim}` : ""}${last === c ? ` ${css.last}` : ""}`}
            disabled={!onCell || shot}
            onClick={() => onCell?.(c)}
            aria-label={`${coord(c)}${shot ? (mark === css.hit ? ", hit" : ", miss") : ""}`}
          />
        );
      })}
    </div>
  );
}

/** One pip per ship, sized by length; sunk ones go red. */
const Tally = ({ fleet, shots }: { fleet: Ship[]; shots: number[] }) => (
  <span className={css.tally}>
    {fleet.map((s, i) => <i key={i} className={bs.sunk(s, shots) ? css.dead : ""} style={{ width: s.len * 7 }} />)}
  </span>
);

export function BattleshipBoard({ game, me, play }: { game: Game<State>; me: string; play: (m: Move<State>) => void }) {
  const s = game.state;
  const them = game.players.find((p) => p !== me)!;
  const myTurn = game.turn === me && !game.winner;
  const [sent, setSent] = useState<Ship[] | null>(null); // my fleet, from tapping ready until the row comes back
  const mine = s.ships[me] ?? sent ?? undefined, theirs = s.ships[them];
  const myShots = s.shots[me] ?? [], theirShots = s.shots[them] ?? [];
  const [draft, setDraft] = useState(() => bs.random());
  const [held, setHeld] = useState<number | null>(null); // ship being dragged
  const grip = useRef({ k: 0, moved: false }); // which segment of it is under the finger, and whether it left its cell
  const [aim, setAim] = useState<number | null>(null);

  if (!mine) {
    // drag moves a ship cell by cell (it just stays put where it would overlap); a tap that never left its cell turns it about its middle
    const drag: Drag = {
      grab(c) {
        const i = bs.shipAt(draft, c);
        if (i < 0) return;
        grip.current = { k: bs.cells(draft[i]).indexOf(c), moved: false };
        setHeld(i);
      },
      move(c) {
        if (held === null) return;
        const ship = draft[held], { k } = grip.current;
        const row = Math.floor(c / N), col = c % N;
        const to = bs.clamp({ ...ship, at: ship.h ? row * N + Math.max(0, col - k) : Math.max(0, row - k) * N + col });
        if (to.at === ship.at) return;
        grip.current.moved = true;
        const next = bs.put(draft, held, to);
        if (next) setDraft(next);
      },
      drop(cancelled) {
        if (held === null) return;
        const ship = draft[held];
        const next = !cancelled && !grip.current.moved && bs.put(draft, held, bs.turn(ship));
        if (next) setDraft(next);
        setHeld(null);
      },
    };
    // Both place at once, in either order: an atomic patch of my own key, so neither overwrites the other and `turn`
    // is left alone (whoever it already names fires first).
    const place = async () => {
      setSent(draft);
      const { error } = await supabase.rpc("patch_state", { game_id: game.id, path: ["ships", me], value: draft });
      if (error) return setSent(null), alert(error.message);
      notify(them, "Battleship", theirs ? `${me} placed their fleet. battle on!` : `${me} placed their fleet and is waiting for you`, `/game/${game.id}`);
    };
    return (
      <div className={css.wrap}>
        <p className={css.label}>place your fleet</p>
        <Sea fleet={draft} show={() => true} shots={[]} held={held} drag={drag} />
        <p className={css.note}>drag a ship to move it. tap it to turn.</p>
        <div className="row" style={{ justifyContent: "center" }}>
          <button className="btn dim" onClick={() => setDraft(bs.random())}>shuffle</button>
          <button
            className="btn gold"
            onClick={place}
          >
            ready
          </button>
        </div>
      </div>
    );
  }

  if (!theirs)
    return (
      <div className={css.wrap}>
        <p className={css.note}>{them} is placing their fleet…</p>
        <Sea fleet={mine} show={() => true} shots={[]} small />
      </div>
    );

  // first tap aims, second tap on the same cell fires: a 10-wide grid on a phone is easy to mis-tap
  function fire(c: number) {
    if (aim !== c) return setAim(c);
    const state = bs.fire(s, me, c);
    if (!state) return;
    setAim(null);
    const won = bs.lost(theirs, state.shots[me]);
    play({ state, winner: won ? me : null, turn: won ? null : them });
  }

  // what the last shot did, read off the state so it survives a reload and the opponent sees it too
  const by = game.last_by;
  const lastShot = by ? s.shots[by]?.at(-1) : undefined;
  let news = "";
  if (by && lastShot !== undefined) {
    const target = by === me ? theirs : mine;
    const ship = target[bs.shipAt(target, lastShot)];
    const what = !ship ? "missed" : bs.sunk(ship, s.shots[by]) ? `sank ${by === me ? "their" : "your"} ${ship.len}!` : "hit!";
    news = `${coord(lastShot)}: ${by === me ? "you" : by} ${what}`;
  }

  return (
    <div className={css.wrap}>
      <p className={css.label}>{them}&apos;s waters <Tally fleet={theirs} shots={myShots} /></p>
      <Sea
        fleet={theirs}
        show={(sh) => !!game.winner || bs.sunk(sh, myShots)}
        shots={myShots}
        aim={myTurn ? aim : null}
        last={by === me ? lastShot : undefined}
        onCell={myTurn ? fire : undefined}
      />
      <p className={css.note}>{myTurn && aim !== null ? `tap ${coord(aim)} again to fire` : news || (myTurn ? "pick a square" : " ")}</p>
      <p className={css.label}>your fleet <Tally fleet={mine} shots={theirShots} /></p>
      <Sea fleet={mine} show={() => true} shots={theirShots} last={by === them ? lastShot : undefined} small />
    </div>
  );
}
