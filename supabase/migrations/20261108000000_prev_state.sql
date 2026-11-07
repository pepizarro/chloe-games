-- state before the last move + who made it, so the other player sees it replayed on open
alter table games add column prev jsonb, add column last_by text;
