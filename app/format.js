// Small formatting helpers. No dependencies; every function is pure.

export function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/** "$736" or "$147.50": whole dollars stay whole, cents always show two digits. */
export function money(value) {
  const n = typeof value === 'string' ? Number.parseFloat(value) : Number(value);
  if (!Number.isFinite(n)) return '—';
  const digits = Number.isInteger(n) ? 0 : 2;
  const text = n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  return '$' + text;
}

export function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toLocaleString('en-US') : '—';
}

/** A win-rate stored as micro units (956066) as "95.6%". */
export function winRate(micro) {
  const n = Number(micro);
  if (!Number.isFinite(n)) return '—';
  return (n / 10_000).toFixed(1) + '%';
}

/** "17 Nov 2026 · 12:30 UTC" — always UTC, so every reader sees the same time. */
export function dateTime(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()} · ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`;
}

/**
 * Time left until a deadline, as short text plus whether entries are still open.
 * A bounty past its deadline is closed even when its status still reads open,
 * so the deadline — never the status alone — decides the badge.
 */
export function timeLeft(iso, now = Date.now()) {
  const end = new Date(iso).getTime();
  if (Number.isNaN(end)) return { text: '—', open: false };
  const diff = end - now;
  const abs = Math.abs(diff);
  const mins = Math.floor(abs / 60_000);
  const days = Math.floor(mins / 1440);
  const hours = Math.floor((mins % 1440) / 60);
  const rest = mins % 60;
  let span;
  if (days > 0) span = `${days}d ${hours}h`;
  else if (hours > 0) span = `${hours}h ${rest}m`;
  else span = `${rest}m`;
  if (diff >= 0) return { text: `${span} left`, open: true };
  return { text: `ended ${span} ago`, open: false };
}

/** "Open · entries open" / "Closed · entries closed" / "Resolved", by deadline first. */
export function bountyStatus(c, now = Date.now()) {
  if (c.status === 'resolved' || c.resolvedAt) return { label: 'Resolved', cls: 'time-closed' };
  const left = timeLeft(c.deadline, now);
  return left.open
    ? { label: 'Open · entries open', cls: 'time-open' }
    : { label: 'Closed · entries closed', cls: 'time-closed' };
}

/**
 * The board filter phase of a bounty: 'open' while its deadline is ahead,
 * 'judging' once entries have closed but no result is published, 'done'
 * once it is resolved. The deadline — never the status alone — decides
 * between open and judging, because a past-deadline bounty still reads open.
 */
export function bountyPhase(c, now = Date.now()) {
  if (c.status === 'resolved' || c.resolvedAt) return 'done';
  return timeLeft(c.deadline, now).open ? 'open' : 'judging';
}

/** Turn an API image path into an absolute URL on make.fun. */
export function imageUrl(path) {
  if (!path) return '';
  if (typeof path === 'object') path = path.url || path.url_small || '';
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return 'https://make.fun' + (path.startsWith('/') ? path : '/' + path);
}

/**
 * The avatar URL to actually load: only images served by make.fun itself.
 * The API also points at third-party hosts (e.g. GitHub avatars); those are
 * left out on purpose — loading them would pull in another origin's bytes,
 * and a dead one would log a failed request. The caller renders initials
 * instead, so every row still has an avatar.
 */
export function makefunImage(path) {
  if (!path) return '';
  if (typeof path === 'object') path = path.url || path.url_small || '';
  if (!path) return '';
  if (path.startsWith('/')) return 'https://make.fun' + path;
  if (path.startsWith('https://make.fun/')) return path;
  return '';
}

/** Two-letter monogram for a handle, used where no make.fun avatar exists. */
export function initials(handle) {
  const letters = String(handle || '').replace(/[^a-zA-Z0-9]/g, '');
  return (letters.slice(0, 2) || '?').toUpperCase();
}

/**
 * A tiny safe Markdown renderer for bounty descriptions and rules:
 * headings, paragraphs, lists, bold, italic, code and links. HTML in the
 * source is escaped first, and links are restricted to http(s).
 */
export function renderMarkdown(src) {
  const lines = String(src || '').replace(/\r\n?/g, '\n').split('\n');
  let out = '';
  let list = null; // 'ul' | 'ol' | null
  let para = [];
  const closeList = () => { if (list) { out += `</${list}>`; list = null; } };
  const flushPara = () => {
    if (para.length) { out += `<p>${inline(para.join(' '))}</p>`; para = []; }
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    const bullet = line.match(/^[-*]\s+(.*)$/);
    const ordered = line.match(/^\d+[.)]\s+(.*)$/);
    if (heading) {
      closeList(); flushPara();
      const level = heading[1].length;
      out += `<h${level}>${inline(heading[2])}</h${level}>`;
    } else if (bullet || ordered) {
      flushPara();
      const kind = bullet ? 'ul' : 'ol';
      if (list !== kind) { closeList(); out += `<${kind}>`; list = kind; }
      out += `<li>${inline((bullet || ordered)[1])}</li>`;
    } else if (line.trim() === '') {
      closeList(); flushPara();
    } else {
      para.push(line.trim());
    }
  }
  closeList(); flushPara();
  return out;
}

function inline(text) {
  let s = esc(text);
  s = s.replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" rel="noopener">$1</a>');
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  return s;
}
