// Leaderboard view. Loaded lazily with import() — only when the visitor
// opens a leaderboard or a bounty page — so it never weighs down the first
// load. Renders 25 rows at a time; the router appends more in place.

import { dateTime, esc, initials, makefunImage, money, num, winRate } from './format.js';

/** One page of leaderboard rows (25 at a time); the router appends more. */
export function leaderboardRows(entries, start, end) {
  return entries.slice(start, end).map((e) => {
    const v = e.values || {};
    const cost = e.cost?.micro_usd ? money(Number(e.cost.micro_usd) / 1_000_000) : '—';
    const low = v.judge_low !== undefined && v.judge_low !== null ? winRate(v.judge_low) : '—';
    const high = v.judge_high !== undefined && v.judge_high !== null ? winRate(v.judge_high) : '—';
    const img = makefunImage(e.image);
    return `<tr>
      <td class="lb-rank">${num(e.rank)}</td>
      <td><div class="lb-row">
        ${img
          ? `<img class="avatar" crossorigin="anonymous" src="${esc(img)}" alt="" loading="lazy" width="40" height="40">`
          : `<span class="avatar avatar-fallback" aria-hidden="true">${esc(initials(e.handle))}</span>`}
        <div class="lb-who"><a class="handle" href="#/u/${esc(e.handle)}">${esc(e.handle)}</a>
        <div class="title">${esc(e.title || '')}</div></div>
      </div></td>
      <td class="num winrate">${winRate(v.judge)}</td>
      <td class="num mono">${low} – ${high}</td>
      <td class="num">${v.valid === 1 ? '✓' : '—'}</td>
      <td class="num mono">${v.bytes !== undefined && v.bytes !== null ? num(v.bytes) + ' B' : '—'}</td>
      <td class="num mono">${cost}</td>
    </tr>`;
  }).join('');
}

export function leaderboardHTML(lb, slug) {
  const entries = lb.entries || [];
  const views = lb.views || [];
  const tabs = views.map((v) => {
    const current = (lb.view || 'performance') === v;
    return `<a class="chip" ${current ? 'aria-current="page"' : ''} href="#/bounty/${esc(slug)}/leaderboard${v === 'performance' ? '' : '?view=' + esc(v)}">${esc(v)}</a>`;
  }).join(' ');
  return `<p class="crumbs"><a href="#/">Board</a> / <a href="#/bounty/${esc(slug)}">${esc(lb.competition?.title || slug)}</a> / Leaderboard</p>
  <div class="page-head"><h1>Leaderboard — ${esc(lb.competition?.title || slug)}</h1>
    <p>${esc(lb.title || 'Results')} · ${lb.phase?.title || ''} phase · ranked by ${esc(lb.rank_key || 'judge')} win rate, tie-break ${esc(lb.tie_break?.title || 'size')}.</p></div>
  ${tabs ? `<p>${tabs}</p>` : ''}
  <div class="table-wrap"><table class="data">
    <thead><tr><th class="num">Rank</th><th>Entrant</th><th class="num">Win rate</th><th class="num">90% interval</th><th class="num">Valid</th><th class="num">Size</th><th class="num">Build cost</th></tr></thead>
    <tbody id="lb-body">${leaderboardRows(entries, 0, 25)}</tbody>
  </table></div>
  ${entries.length > 25
    ? `<div class="pager"><button class="btn" type="button" data-action="more" data-shown="25" data-total="${entries.length}">Show more (25 of ${num(entries.length)})</button></div>`
    : `<p class="count-note">${num(entries.length)} entries</p>`}`;
}

/** The top 5 of a leaderboard, as shown on its bounty page. */
export function leaderboardPreview(entries) {
  const top = (entries || []).slice(0, 5);
  if (!top.length) return '<p class="empty">No entries yet.</p>';
  const rows = top.map((e) => `<tr>
      <td class="lb-rank">${num(e.rank)}</td>
      <td><div class="lb-row">
        <div class="lb-who"><a class="handle" href="#/u/${esc(e.handle)}">${esc(e.handle)}</a>
        <div class="title">${esc(e.title || '')}</div></div>
      </div></td>
      <td class="num winrate">${winRate(e.values?.judge)}</td>
      <td class="num mono">${dateTime(e.received_at)}</td>
    </tr>`).join('');
  return `<div class="table-wrap"><table class="data">
    <thead><tr><th class="num">Rank</th><th>Entrant</th><th class="num">Win rate</th><th class="num">Entered</th></tr></thead>
    <tbody>${rows}</tbody></table></div>`;
}
