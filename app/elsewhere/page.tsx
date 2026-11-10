"use client";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import { Icon } from "@/components/Icon";

type Ext = { id: string; name: string; url: string | null };
const withScheme = (u: string) => (u.trim() ? (/^https?:\/\//.test(u.trim()) ? u.trim() : `https://${u.trim()}`) : null);

export default function Elsewhere() {
  const [list, setList] = useState<Ext[]>([]);
  const [editing, setEditing] = useState<string | null>(null); // id being edited, "new" for the add form
  const load = () => supabase.from("external_games").select("id, name, url").order("created_at").then(({ data }) => setList(data ?? []));
  useEffect(() => void load(), []);

  async function save(e: FormEvent<HTMLFormElement>, id: string | null) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const row = { name: String(f.get("name")).trim(), url: withScheme(String(f.get("url"))) };
    if (!row.name) return;
    await (id ? supabase.from("external_games").update(row).eq("id", id) : supabase.from("external_games").insert(row));
    setEditing(null);
    load();
  }
  async function remove(id: string) {
    await supabase.from("external_games").delete().eq("id", id);
    setEditing(null);
    load();
  }

  const Form = ({ g }: { g: Ext | null }) => (
    <form className="card panel ext edit" onSubmit={(e) => save(e, g?.id ?? null)}>
      <input className="input" name="name" placeholder="game" defaultValue={g?.name ?? ""} required autoFocus />
      <input className="input" name="url" placeholder="link (optional)" defaultValue={g?.url ?? ""} inputMode="url" />
      <div className="row" style={{ gap: 8 }}>
        <button className="btn blue tag" type="submit">save</button>
        <button className="btn dim tag" type="button" onClick={() => setEditing(null)}>cancel</button>
        {g && <button className="btn red tag" type="button" style={{ marginLeft: "auto" }} onClick={() => remove(g.id)}>delete</button>}
      </div>
    </form>
  );

  return (
    <>
      <div className="plaque">elsewhere</div>
      <p className="hint">games to remember. tap the pencil to edit.</p>
      <div className="list">
        {list.map((g) =>
          editing === g.id ? (
            <Form key={g.id} g={g} />
          ) : (
            <div key={g.id} className="card panel ext">
              {g.url ? <a href={g.url} target="_blank" rel="noreferrer">{g.name} ↗</a> : <span>{g.name}</span>}
              <button className="btn dim tag pencil" onClick={() => setEditing(g.id)} aria-label={`edit ${g.name}`}><Icon name="pencil" /></button>
            </div>
          ),
        )}
        {editing === "new" ? (
          <Form g={null} />
        ) : (
          <button className="card panel" onClick={() => setEditing("new")}>
            <span>add one<small>name, link optional</small></span>
            <b className="tag blue">+ new</b>
          </button>
        )}
      </div>
    </>
  );
}
