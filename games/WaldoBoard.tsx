"use client";
import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent } from "react";
import { supabase, type Game } from "@/lib/supabase";
import { BEST_OF, IMAGES, waldo, type Found, type State, type Target } from "./waldo";
import css from "./waldo.module.css";

const COUNTDOWN = 3;
const sec = (ms: number) => (ms / 1000).toFixed(2) + "s";
const logErr = ({ error }: { error: unknown }) => error && console.error(error);

export function WaldoBoard({ game, me }: { game: Game<State>; me: string }) {
  const s = game.state;
  const { players } = game;
  const them = players.find((p) => p !== me)!;
  const phase = game.winner ? "done" : waldo.phase(s, players);
  const score = players.map((p, i) => `${p} ${waldo.wins(s.results, players)[i]}`).join(" · ");
  const readyFor = (p: string) => s.ready[p] ?? -1;
  const best = waldo.best(s, players);

  const patch = (path: string[], value: unknown) =>
    supabase.rpc("patch_state", { game_id: game.id, path, value, guard: { round: s.round } }).then(logErr);

  // Both clicked next/skip → following round. Both clicked stop → finish now. Guarded by round, so whichever
  // client lands second is a no-op.
  useEffect(() => {
    if (game.winner) return;
    const stop = waldo.stopped(s, players);
    if (!stop && (phase === "lobby" || !waldo.agreed(s, players, s.round + 1))) return;
    const next = waldo.next(s);
    const row =
      !stop && next.round < IMAGES.length && !waldo.over(next.results, players, best ?? IMAGES.length)
        ? { state: next }
        : { state: next, turn: null, winner: waldo.matchWinner(next.results, players) };
    supabase.from("games").update(row).eq("id", game.id).eq("state->>round", String(s.round)).then(logErr);
  }, [phase, s, players, game.id, game.winner, best]);

  const iStop = !!s.stop?.[me];
  const theyStop = !!s.stop?.[them];

  return (
    <div className={css.screen}>
      <header className={css.hud}>
        <Link href="/" className="btn red">◂</Link>
        <b>{Math.min(s.round + 1, best ?? IMAGES.length)}/{best ?? "?"}</b>
        <span>{score}</span>
        {!game.winner && (
          <button className={`btn ${iStop ? "dim" : "red"}`} onClick={() => patch(["stop", me], !iStop)}>
            {iStop ? "stop?" : theyStop ? `${them} wants to stop` : "stop"}
          </button>
        )}
      </header>
      {phase === "lobby" && !best && (
        <div className={css.sheet}>
          <p>how long a match?{s.votes?.[them] ? ` ${them} says best of ${s.votes[them]}.` : ""}</p>
          <div className="row" style={{ justifyContent: "center" }}>
            {BEST_OF.map((n) => (
              <button key={n} className={`btn ${s.votes?.[me] === n ? "gold" : s.votes?.[them] === n ? "orange" : "blue"}`} onClick={() => patch(["votes", me], n)}>
                best of {n}{s.votes?.[me] === n ? " ✓" : ""}
              </button>
            ))}
          </div>
          {s.votes?.[me] && !s.votes?.[them] && <p className="tag dim">waiting for {them} to pick…</p>}
          {s.votes?.[me] && s.votes?.[them] && s.votes[me] !== s.votes[them] && <p className="tag red">you disagree. one of you, switch.</p>}
        </div>
      )}
      {phase === "lobby" && best && (
        <div className={css.sheet}>
          <p>best of {best}. both of you have to be in.</p>
          {readyFor(me) >= s.round ? (
            <p className="tag dim">waiting for {them}…</p>
          ) : (
            <button className="btn blue" onClick={() => patch(["ready", me], s.round)}>
              {readyFor(them) >= s.round ? `${them} is ready. go?` : "i'm ready"}
            </button>
          )}
        </div>
      )}
      {(phase === "play" || phase === "result") && (
        <Round
          key={s.round}
          target={IMAGES[s.round]}
          found={s.found}
          me={me}
          them={them}
          last={s.round + 1 === IMAGES.length}
          waiting={readyFor(me) > s.round}
          onFound={(ms) => patch(["found", me], ms)}
          onNext={() => patch(["ready", me], s.round + 1)}
        />
      )}
      {phase === "done" && (
        <div className={css.sheet}>
          <div className="plaque">{game.winner === "draw" ? "draw!" : game.winner === me ? "you won!" : `${game.winner} won`}</div>
          <p>{score}</p>
          <Link href="/" className="btn gold">lobby</Link>
        </div>
      )}
    </div>
  );
}

function Round({ target, found, me, them, last, waiting, onFound, onNext }: {
  target: Target; found: Found; me: string; them: string; last: boolean; waiting: boolean;
  onFound: (ms: number) => void; onNext: () => void;
}) {
  const [count, setCount] = useState(COUNTDOWN);
  const [loaded, setLoaded] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [ms, setMs] = useState(0);
  const [mine, setMine] = useState<number | null>(null);
  const [miss, setMiss] = useState<{ x: number; y: number; n: number } | null>(null);
  const start = useRef<number | null>(null);
  const view = useRef<HTMLDivElement>(null);
  const prevZoom = useRef(1);
  const live = count === 0 && loaded;
  const all: Found = mine === null ? found : { [me]: mine, ...found }; // DB wins over my optimistic time
  const over = Object.keys(all).length > 0;
  const winner = waldo.roundWinner(all);

  useEffect(() => {
    if (count === 0) return;
    const t = setTimeout(() => setCount(count - 1), 1000);
    return () => clearTimeout(t);
  }, [count]);

  // ponytail: each side times locally from the moment its own image is on screen and elapsed ms are compared, so
  // clock skew is irrelevant. A reload mid-round restarts that side's clock; two trusted players, not worth guarding.
  useEffect(() => {
    if (!live || over) return;
    start.current ??= performance.now();
    const t = setInterval(() => setMs(performance.now() - start.current!), 47);
    return () => clearInterval(t);
  }, [live, over]);

  // desktop zoom: ctrl/trackpad-pinch wheel. Phones pinch natively (touch-action: manipulation keeps pinch, drops double-tap zoom).
  // Native listener because React's wheel handler is passive and can't preventDefault.
  useEffect(() => {
    const el = view.current!;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      setZoom((z) => Math.min(5, Math.max(1, z - e.deltaY / 100)));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // keep the centre of the viewport fixed while zooming
  useLayoutEffect(() => {
    const el = view.current!;
    const k = zoom / prevZoom.current;
    prevZoom.current = zoom;
    el.scrollLeft = (el.scrollLeft + el.clientWidth / 2) * k - el.clientWidth / 2;
    el.scrollTop = (el.scrollTop + el.clientHeight / 2) * k - el.clientHeight / 2;
  }, [zoom]);

  function dbl(e: MouseEvent<HTMLImageElement>) {
    if (!live || over) return;
    const r = e.currentTarget.getBoundingClientRect();
    const fx = (e.clientX - r.left) / r.width;
    const fy = (e.clientY - r.top) / r.height;
    if (process.env.NODE_ENV === "development") console.log(`waldo: x ${fx.toFixed(3)} y ${fy.toFixed(3)}`);
    if (!waldo.hit(target, fx, fy, r.height / r.width)) return setMiss({ x: fx, y: fy, n: (miss?.n ?? 0) + 1 });
    const t = Math.round(performance.now() - start.current!);
    setMine(t);
    onFound(t);
  }

  return (
    <>
      <div className={css.sub}>
        <b className={css.timer}>{live ? sec(mine ?? ms) : count > 0 ? count : "…"}</b>
        {live && !over && (waiting ? <span className="tag dim">waiting for {them} to skip…</span> : <button className="btn dim" onClick={onNext}>skip</button>)}
      </div>
      <div ref={view} className={css.view}>
        <div className={css.canvas} style={{ width: `${zoom * 100}%`, visibility: live ? "visible" : "hidden" }}>
          <img src={target.src} alt="" draggable={false} onLoad={() => setLoaded(true)} onDoubleClick={dbl} />
          {over && <i className={css.ring} style={{ left: `${target.x * 100}%`, top: `${target.y * 100}%` }} />}
          {miss && <i key={miss.n} className={css.miss} style={{ left: `${miss.x * 100}%`, top: `${miss.y * 100}%` }}>✗</i>}
        </div>
      </div>
      {!live && (
        <div className={css.center}>
          <div className="plaque">{count > 0 ? count : "loading…"}</div>
          <p>find {target.hint}</p>
        </div>
      )}
      {live && !over && <p className={css.hint}>double-tap {target.hint}</p>}
      {over && (
        <div className={css.sheet}>
          {Object.entries(all).sort((a, b) => a[1] - b[1]).map(([p, t]) => <p key={p}>{p === me ? "you" : p} found it in {sec(t)}</p>)}
          {all[me] === undefined && <p>you didn&apos;t</p>}
          <div className="plaque">{winner === "draw" ? "tie!" : winner === me ? "you take it" : `${winner} takes it`}</div>
          {waiting ? (
            <p className="tag dim">waiting for {them}…</p>
          ) : (
            <button className="btn blue" onClick={onNext}>{last ? "final score" : "next one"}</button>
          )}
        </div>
      )}
    </>
  );
}
