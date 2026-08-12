import type { Movie } from "./movies.js";
import { MOVIE_MAP } from "./movies.js";
import type { TVShow } from "./tvshows.js";
import { SHOW_MAP } from "./tvshows.js";
import type { Documentary } from "./documentaries.js";
import { DOC_MAP } from "./documentaries.js";

function esc(s: any): string {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function stars(rating: number | null, outOf10 = true): string {
  if (!rating) return '<span class="stars empty">☆☆☆☆☆</span>';
  const val = outOf10 ? rating / 2 : rating;
  const full = Math.floor(val);
  const half = val % 1 >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  return `<span class="stars">${'★'.repeat(full)}${half ? '<span class="half-star">½</span>' : ''}${'☆'.repeat(empty)}</span>`;
}

function avatar(user: any, size = 36): string {
  const initials = (user.display_name || user.username || "?").charAt(0).toUpperCase();
  return `<div class="avatar" style="width:${size}px;height:${size}px;background:${esc(user.avatar_color)};font-size:${Math.floor(size * 0.44)}px">${initials}</div>`;
}

function movieCard(movie: Movie, entry?: any): string {
  const hasWatched = !!entry;
  const liked = entry?.liked;
  return `
    <a href="/films/${movie.id}" class="movie-card">
      <div class="poster-wrap">
        <img src="${esc(movie.poster)}" alt="${esc(movie.title)}" loading="lazy">
        ${hasWatched ? `<div class="watched-badge">
          ${stars(entry.rating)}
          ${liked ? '<span class="heart-badge">♥</span>' : ''}
        </div>` : ''}
      </div>
      <div class="card-info">
        <span class="card-title">${esc(movie.title)}</span>
        <span class="card-year">${movie.year}</span>
      </div>
    </a>`;
}

export function layout(content: string, title: string, user: any): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(title)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,700;1,400&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg: #0a0b14;
      --surface: #13152a;
      --surface2: #1d2040;
      --border: #2d3158;
      --text: #e8eaf5;
      --muted: #8a8fa8;
      --accent: #7c6ff7;
      --accent-dim: #7c6ff722;
      --accent2: #f0b429;
      --red: #e85555;
      --purple: #a78bfa;
      --radius: 8px;
      --shadow: 0 2px 12px rgba(0,0,0,0.5);
    }

    body { background: var(--bg); color: var(--text); font-family: 'Inter', sans-serif; line-height: 1.6; min-height: 100vh; }

    a { color: inherit; text-decoration: none; }
    a:hover { color: var(--accent); }
    button, .btn { cursor: pointer; font-family: inherit; border: none; outline: none; }

    /* ── Navbar ── */
    nav {
      background: rgba(15,16,20,0.95);
      border-bottom: 1px solid var(--border);
      position: sticky; top: 0; z-index: 100;
      backdrop-filter: blur(10px);
    }
    .nav-inner {
      max-width: 1200px; margin: 0 auto;
      display: flex; align-items: center; gap: 8px;
      padding: 0 24px; height: 56px;
    }
    .nav-logo {
      font-family: 'Playfair Display', serif;
      font-size: 22px; font-weight: 700;
      color: var(--accent);
      letter-spacing: -0.5px;
      margin-right: 16px;
    }
    .nav-links { display: flex; gap: 4px; flex: 1; }
    .nav-links a {
      padding: 6px 14px;
      border-radius: 6px;
      font-size: 14px; font-weight: 500;
      color: var(--muted);
      transition: color 0.15s, background 0.15s;
    }
    .nav-links a:hover, .nav-links a.active { color: var(--text); background: var(--surface2); }
    .nav-right { display: flex; align-items: center; gap: 12px; margin-left: auto; }
    .nav-search form { display: flex; align-items: center; }
    .nav-search input {
      background: var(--surface2);
      border: 1px solid var(--border);
      border-radius: 20px;
      padding: 6px 14px;
      font-size: 13px;
      color: var(--text);
      width: 180px;
      transition: width 0.2s, border-color 0.15s;
    }
    .nav-search input:focus { width: 220px; border-color: var(--accent); outline: none; }
    .nav-search input::placeholder { color: var(--muted); }
    .nav-user { display: flex; align-items: center; gap: 10px; }
    .nav-user-info { text-align: right; }
    .nav-user-info .name { font-size: 13px; font-weight: 600; }
    .nav-user-info .sub { font-size: 11px; color: var(--muted); }
    .btn-ghost {
      background: transparent;
      border: 1px solid var(--border);
      color: var(--muted);
      padding: 6px 14px; border-radius: 6px;
      font-size: 13px;
      transition: all 0.15s;
    }
    .btn-ghost:hover { color: var(--text); border-color: var(--text); }
    .btn-primary {
      background: var(--accent);
      color: #0f1014;
      padding: 8px 18px; border-radius: 6px;
      font-size: 13px; font-weight: 600;
      transition: opacity 0.15s;
      display: inline-block;
    }
    .btn-primary:hover { opacity: 0.85; color: #0f1014; }

    /* ── Layout ── */
    .container { max-width: 1200px; margin: 0 auto; padding: 32px 24px; }
    .page-title {
      font-family: 'Playfair Display', serif;
      font-size: 28px; font-weight: 700;
      margin-bottom: 8px;
    }
    .section-title {
      font-size: 13px; font-weight: 600;
      text-transform: uppercase; letter-spacing: 1px;
      color: var(--muted); margin-bottom: 16px;
    }

    /* ── Avatar ── */
    .avatar {
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; color: #fff; flex-shrink: 0;
    }

    /* ── Movie Cards ── */
    .movies-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 16px;
    }
    .movie-card { display: flex; flex-direction: column; gap: 8px; }
    .movie-card:hover .card-title { color: var(--accent); }
    .poster-wrap {
      position: relative;
      border-radius: var(--radius);
      overflow: hidden;
      aspect-ratio: 2/3;
      background: var(--surface);
    }
    .poster-wrap img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform 0.3s; }
    .movie-card:hover .poster-wrap img { transform: scale(1.04); }
    .watched-badge {
      position: absolute; bottom: 0; left: 0; right: 0;
      background: linear-gradient(transparent, rgba(0,0,0,0.85));
      padding: 16px 8px 8px;
      display: flex; flex-direction: column; gap: 2px;
    }
    .card-info { display: flex; flex-direction: column; }
    .card-title { font-size: 13px; font-weight: 500; line-height: 1.3; }
    .card-year { font-size: 11px; color: var(--muted); }
    .stars { color: var(--accent2); font-size: 12px; }
    .stars.empty { color: var(--border); }
    .half-star { font-size: 10px; }
    .heart-badge { color: var(--red); font-size: 12px; }

    /* ── Film Hero ── */
    .film-hero {
      position: relative;
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      overflow: hidden;
    }
    .film-hero-backdrop {
      position: absolute; inset: 0;
      background-size: cover; background-position: center;
      filter: blur(2px) brightness(0.25);
      transform: scale(1.05);
    }
    .film-hero-inner {
      position: relative;
      max-width: 1200px; margin: 0 auto;
      padding: 48px 24px;
      display: flex; gap: 40px; align-items: flex-start;
    }
    .film-poster {
      width: 200px; flex-shrink: 0;
      border-radius: 10px; overflow: hidden;
      box-shadow: 0 8px 40px rgba(0,0,0,0.6);
    }
    .film-poster img { width: 100%; display: block; }
    .film-info { flex: 1; }
    .film-title { font-family: 'Playfair Display', serif; font-size: 36px; font-weight: 700; line-height: 1.1; }
    .film-meta { display: flex; align-items: center; gap: 16px; margin: 12px 0; flex-wrap: wrap; }
    .film-meta span { font-size: 14px; color: var(--muted); }
    .film-meta .sep { color: var(--border); }
    .film-director { font-size: 14px; }
    .film-director a { color: var(--accent); font-weight: 500; }
    .genre-tag {
      background: var(--surface2);
      border: 1px solid var(--border);
      padding: 3px 10px; border-radius: 20px;
      font-size: 12px; color: var(--muted);
      display: inline-block;
    }
    .genres { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 10px; }
    .film-synopsis { font-size: 15px; line-height: 1.7; color: #c5c9d6; max-width: 600px; margin-top: 16px; }
    .film-cast { margin-top: 16px; font-size: 13px; color: var(--muted); }
    .film-cast strong { color: var(--text); }
    .film-rating-display {
      display: flex; align-items: center; gap: 12px; margin-top: 20px;
    }
    .avg-stars { font-size: 22px; color: var(--accent2); }
    .rating-num { font-size: 32px; font-weight: 700; }
    .rating-count { font-size: 13px; color: var(--muted); }

    /* ── Log Form ── */
    .log-section {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 10px; padding: 24px;
    }
    .log-section h3 { font-size: 16px; font-weight: 600; margin-bottom: 20px; }
    .star-picker { display: flex; gap: 6px; margin-bottom: 16px; }
    .star-picker input[type=radio] { display: none; }
    .star-picker label {
      font-size: 28px; color: var(--border);
      cursor: pointer; transition: color 0.1s;
      line-height: 1;
    }
    .star-picker:hover label { color: var(--border); }
    .star-picker label:hover,
    .star-picker label:hover ~ label { color: var(--border) !important; }
    .star-picker input:checked ~ label { color: var(--border); }
    .star-picker label:hover, .star-picker input:checked + label,
    .star-picker label:has(~ input:checked) { color: var(--accent2); }
    /* Simpler star picker via JS */
    .star-row { display: flex; gap: 4px; margin-bottom: 16px; }
    .star-btn {
      font-size: 28px; color: var(--border);
      background: none; padding: 2px;
      transition: color 0.1s; cursor: pointer;
    }
    .star-btn.active, .star-btn:hover { color: var(--accent2); }
    .form-group { margin-bottom: 16px; }
    .form-group label { display: block; font-size: 13px; color: var(--muted); margin-bottom: 6px; }
    .form-group textarea, .form-group input[type=text], .form-group input[type=date] {
      width: 100%;
      background: var(--surface2);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 10px 14px;
      color: var(--text);
      font-family: inherit;
      font-size: 14px;
      resize: vertical;
      transition: border-color 0.15s;
    }
    .form-group textarea:focus, .form-group input:focus { border-color: var(--accent); outline: none; }
    .liked-toggle { display: flex; align-items: center; gap: 10px; }
    .liked-toggle input { display: none; }
    .liked-toggle label {
      font-size: 22px; cursor: pointer;
      color: var(--border); transition: color 0.15s;
    }
    .liked-toggle input:checked + label { color: var(--red); }

    /* ── Reviews ── */
    .review-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 10px; padding: 20px;
    }
    .review-header { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
    .review-user { font-weight: 600; font-size: 14px; }
    .review-date { font-size: 12px; color: var(--muted); }
    .review-body { font-size: 14px; line-height: 1.7; color: #c5c9d6; }
    .reviews-grid { display: flex; flex-direction: column; gap: 12px; }

    /* ── Rating Distribution ── */
    .rating-dist { display: flex; flex-direction: column; gap: 4px; margin-top: 20px; }
    .dist-row { display: flex; align-items: center; gap: 8px; }
    .dist-label { font-size: 12px; color: var(--muted); width: 20px; text-align: right; }
    .dist-bar-bg { flex: 1; height: 6px; background: var(--surface2); border-radius: 3px; overflow: hidden; }
    .dist-bar { height: 100%; background: var(--accent2); border-radius: 3px; transition: width 0.3s; }
    .dist-count { font-size: 12px; color: var(--muted); width: 28px; }

    /* ── Hero Home ── */
    .home-hero {
      background: linear-gradient(135deg, #0f1014 0%, #1a1d23 50%, #0f1014 100%);
      border-bottom: 1px solid var(--border);
      padding: 64px 24px;
      text-align: center;
    }
    .home-hero h1 { font-family: 'Playfair Display', serif; font-size: 52px; font-weight: 700; margin-bottom: 16px; }
    .home-hero h1 span { color: var(--accent); }
    .home-hero p { font-size: 18px; color: var(--muted); max-width: 480px; margin: 0 auto 32px; }
    .hero-cta { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }

    /* ── Activity Feed ── */
    .activity-item {
      display: flex; align-items: flex-start; gap: 12px;
      padding: 16px 0;
      border-bottom: 1px solid var(--border);
    }
    .activity-item:last-child { border-bottom: none; }
    .activity-poster { width: 40px; flex-shrink: 0; border-radius: 4px; overflow: hidden; }
    .activity-poster img { width: 100%; display: block; }
    .activity-body { flex: 1; min-width: 0; }
    .activity-text { font-size: 14px; }
    .activity-text a { color: var(--accent); font-weight: 500; }
    .activity-text a:hover { text-decoration: underline; }
    .activity-review { font-size: 13px; color: var(--muted); margin-top: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .activity-time { font-size: 12px; color: var(--muted); margin-top: 4px; }

    /* ── Profile ── */
    .profile-header {
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      padding: 40px 0;
    }
    .profile-inner { max-width: 1200px; margin: 0 auto; padding: 0 24px; display: flex; gap: 32px; align-items: flex-end; }
    .profile-avatar .avatar { width: 88px; height: 88px; font-size: 36px; }
    .profile-name { font-family: 'Playfair Display', serif; font-size: 32px; font-weight: 700; }
    .profile-username { color: var(--muted); font-size: 15px; margin-top: 2px; }
    .profile-bio { font-size: 14px; color: var(--muted); margin-top: 8px; max-width: 400px; }
    .profile-stats { display: flex; gap: 28px; margin-top: 16px; }
    .stat-item { display: flex; flex-direction: column; }
    .stat-num { font-size: 22px; font-weight: 700; }
    .stat-label { font-size: 12px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; }
    .profile-actions { margin-left: auto; display: flex; gap: 10px; align-items: flex-end; padding-bottom: 4px; }

    /* ── Diary ── */
    .diary-entry {
      display: flex; align-items: center; gap: 16px;
      padding: 14px 0; border-bottom: 1px solid var(--border);
    }
    .diary-entry:last-child { border-bottom: none; }
    .diary-date { font-size: 12px; color: var(--muted); width: 80px; flex-shrink: 0; }
    .diary-poster { width: 36px; flex-shrink: 0; border-radius: 4px; overflow: hidden; }
    .diary-poster img { width: 100%; display: block; }
    .diary-info { flex: 1; min-width: 0; }
    .diary-title { font-size: 15px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .diary-title a:hover { color: var(--accent); }
    .diary-review { font-size: 13px; color: var(--muted); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 400px; }
    .diary-rating { flex-shrink: 0; }

    /* ── Watchlist ── */
    .watchlist-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 20px;
    }

    /* ── Lists ── */
    .list-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 10px; padding: 20px;
      transition: border-color 0.15s;
    }
    .list-card:hover { border-color: var(--accent); }
    .list-name { font-size: 18px; font-weight: 600; margin-bottom: 6px; }
    .list-desc { font-size: 13px; color: var(--muted); margin-bottom: 16px; }
    .list-posters { display: flex; gap: 6px; }
    .list-posters img { width: 48px; height: 72px; object-fit: cover; border-radius: 4px; }
    .list-meta { font-size: 12px; color: var(--muted); margin-top: 12px; }
    .lists-grid { display: flex; flex-direction: column; gap: 12px; }

    /* ── Search ── */
    .search-hero { padding: 40px 24px; background: var(--surface); border-bottom: 1px solid var(--border); }
    .search-form { display: flex; gap: 10px; max-width: 600px; }
    .search-form input {
      flex: 1;
      background: var(--surface2);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 12px 18px;
      color: var(--text); font-family: inherit; font-size: 16px;
    }
    .search-form input:focus { outline: none; border-color: var(--accent); }
    .search-form button {
      background: var(--accent); color: #0f1014;
      padding: 12px 24px; border-radius: 8px;
      font-weight: 600; font-size: 14px;
      transition: opacity 0.15s;
    }
    .search-form button:hover { opacity: 0.85; }
    .genre-filters { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 16px; }
    .genre-btn {
      padding: 5px 14px; border-radius: 20px;
      font-size: 13px; background: var(--surface2);
      border: 1px solid var(--border); color: var(--muted);
      cursor: pointer; transition: all 0.15s;
    }
    .genre-btn:hover, .genre-btn.active { background: var(--accent-dim); border-color: var(--accent); color: var(--accent); }

    /* ── Login ── */
    .login-wrap {
      min-height: calc(100vh - 56px);
      display: flex; align-items: center; justify-content: center;
      padding: 40px 24px;
    }
    .login-box {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px; padding: 40px;
      width: 100%; max-width: 400px;
    }
    .login-title { font-family: 'Playfair Display', serif; font-size: 28px; font-weight: 700; margin-bottom: 8px; }
    .login-sub { font-size: 14px; color: var(--muted); margin-bottom: 28px; }
    .login-box input[type=text] {
      width: 100%;
      background: var(--surface2); border: 1px solid var(--border);
      border-radius: 8px; padding: 12px 16px;
      color: var(--text); font-family: inherit; font-size: 15px;
    }
    .login-box input:focus { outline: none; border-color: var(--accent); }
    .login-box .btn-primary { width: 100%; padding: 12px; font-size: 15px; margin-top: 16px; text-align: center; }
    .error-msg { color: var(--red); font-size: 13px; margin-top: 8px; }
    .login-note { text-align: center; font-size: 13px; color: var(--muted); margin-top: 20px; }

    /* ── Two-col layout ── */
    .two-col { display: flex; gap: 32px; }
    .two-col .main-col { flex: 1; min-width: 0; }
    .two-col .side-col { width: 280px; flex-shrink: 0; }

    /* ── Misc ── */
    .empty-state { text-align: center; padding: 60px 20px; color: var(--muted); }
    .empty-state p { font-size: 15px; margin-bottom: 16px; }
    .tag { background: var(--surface2); border: 1px solid var(--border); border-radius: 20px; padding: 4px 12px; font-size: 12px; color: var(--muted); }

    @media (max-width: 768px) {
      .home-hero h1 { font-size: 36px; }
      .film-hero-inner { flex-direction: column; }
      .film-poster { width: 140px; }
      .two-col { flex-direction: column; }
      .two-col .side-col { width: 100%; }
      .profile-inner { flex-direction: column; align-items: flex-start; }
      .profile-actions { margin-left: 0; }
    }
  </style>
</head>
<body>
  <nav>
    <div class="nav-inner">
      <a href="/" class="nav-logo">CineLog</a>
      <div class="nav-links">
        <a href="/films">Films</a>
        <a href="/shows">Shows</a>
        <a href="/docs">Docs</a>
        ${user ? `<a href="/diary">Diary</a><a href="/watchlist">Watchlist</a><a href="/lists">Lists</a>` : ''}
      </div>
      <div class="nav-right">
        <div class="nav-search">
          <form action="/films" method="get">
            <input type="text" name="q" placeholder="Search films..." autocomplete="off">
          </form>
        </div>
        ${user ? `
        <div class="nav-user">
          <a href="/profile/${esc(user.username)}" style="display:flex;align-items:center;gap:8px;">
            ${avatar(user, 32)}
            <div class="nav-user-info">
              <div class="name">${esc(user.display_name)}</div>
            </div>
          </a>
          <form method="post" action="/logout">
            <button class="btn-ghost" type="submit">Sign out</button>
          </form>
        </div>` : `
        <a href="/login" class="btn-primary">Sign in</a>`}
      </div>
    </div>
  </nav>
  ${content}
  <script>
  (function() {
    var params = new URLSearchParams(location.search);

    // Clear session on logout
    if (params.get('_logout')) {
      localStorage.removeItem('_cls');
      params.delete('_logout');
      history.replaceState(null, '', location.pathname + (params.size ? '?' + params : ''));
      return;
    }

    // Persist session from URL to localStorage
    var urlSession = params.get('_s');
    if (urlSession) {
      localStorage.setItem('_cls', urlSession);
      params.delete('_s');
      history.replaceState(null, '', location.pathname + (params.size ? '?' + params : '') + location.hash);
    }

    var session = localStorage.getItem('_cls');
    if (!session) return;

    // If page was rendered without a session (cookie blocked), reload with _s so server shows logged-in state
    var hasUser = document.querySelector('.nav-user');
    var isLoginPage = location.pathname === '/login';
    if (!hasUser && !isLoginPage) {
      location.replace(location.pathname + (location.search ? location.search + '&' : '?') + '_s=' + encodeURIComponent(session));
      return;
    }

    // Inject _s into all internal links
    document.querySelectorAll('a[href]').forEach(function(a) {
      var href = a.getAttribute('href') || '';
      if (!href.startsWith('/') || href.includes('_s=')) return;
      a.setAttribute('href', href + (href.includes('?') ? '&' : '?') + '_s=' + encodeURIComponent(session));
    });

    // Inject _s into all form actions (stays in query string, works for POST too)
    document.querySelectorAll('form').forEach(function(form) {
      var action = form.getAttribute('action') || location.pathname;
      if (!action.startsWith('/') || action.includes('_s=')) return;
      form.setAttribute('action', action + (action.includes('?') ? '&' : '?') + '_s=' + encodeURIComponent(session));
    });
  })();
  </script>
</body>
</html>`;
}

// ─── Home Page ────────────────────────────────────────────────────────────────

export function homePage(user: any, movies: Movie[], recentEntries: any[]): string {
  if (!user) {
    return `
    <div class="home-hero">
      <h1>Track films you've <span>watched</span>.<br>Tell your friends what's good.</h1>
      <p>CineLog is a social network for film lovers. Rate, review, and share your cinematic journey.</p>
      <div class="hero-cta">
        <a href="/login" class="btn-primary">Get started — it's free</a>
        <a href="/films" class="btn-ghost" style="padding:8px 18px;border-radius:6px;font-size:13px;font-weight:600;background:transparent;border:1px solid var(--border);color:var(--muted);display:inline-block;">Browse films</a>
      </div>
    </div>
    <div class="container">
      <div class="two-col">
        <div class="main-col">
          <div class="section-title">Popular Films</div>
          <div class="movies-grid">
            ${movies.map(m => movieCard(m)).join('')}
          </div>
        </div>
        <div class="side-col">
          <div class="section-title">Recent Activity</div>
          ${recentActivity(recentEntries)}
        </div>
      </div>
    </div>`;
  }

  return `
  <div class="container">
    <div class="two-col">
      <div class="main-col">
        <div class="section-title" style="margin-bottom:20px">Popular Films</div>
        <div class="movies-grid">
          ${movies.map(m => movieCard(m)).join('')}
        </div>
        <div style="margin-top:20px">
          <a href="/films" class="btn-ghost" style="display:inline-block;padding:8px 18px;border-radius:6px;font-size:13px;font-weight:600">Browse all films →</a>
        </div>
      </div>
      <div class="side-col">
        <div class="section-title">Recent Activity</div>
        ${recentActivity(recentEntries)}
      </div>
    </div>
  </div>`;
}

function recentActivity(entries: any[]): string {
  if (!entries.length) return `<div class="empty-state"><p>No activity yet.</p></div>`;
  return entries.map(e => {
    const movie = MOVIE_MAP.get(e.movie_id);
    if (!movie) return '';
    return `
    <div class="activity-item">
      <a href="/films/${movie.id}" class="activity-poster">
        <img src="${esc(movie.poster)}" alt="${esc(movie.title)}" loading="lazy">
      </a>
      <div class="activity-body">
        <div class="activity-text">
          <a href="/profile/${esc(e.username)}">${esc(e.display_name)}</a>
          watched <a href="/films/${movie.id}">${esc(movie.title)}</a>
          ${e.rating ? stars(Number(e.rating)) : ''}
          ${e.liked ? '<span style="color:var(--red)">♥</span>' : ''}
        </div>
        ${e.review ? `<div class="activity-review">"${esc(e.review)}"</div>` : ''}
      </div>
    </div>`;
  }).join('');
}

// ─── Movie Page ───────────────────────────────────────────────────────────────

export function moviePage(movie: Movie, entries: any[], ratingDist: any[], avgRating: number, totalRatings: number, userEntry: any, inWatchlist: boolean, user: any): string {
  const maxCount = Math.max(...ratingDist.map((r: any) => Number(r.count)), 1);
  const displayRating = totalRatings > 0 ? avgRating : movie.avgRating;
  const displayTotal = totalRatings > 0 ? totalRatings : movie.ratingsCount;

  return `
  <div class="film-hero">
    <div class="film-hero-backdrop" style="background-image:url(${esc(movie.backdrop)})"></div>
    <div class="film-hero-inner">
      <div class="film-poster">
        <img src="${esc(movie.poster)}" alt="${esc(movie.title)}">
      </div>
      <div class="film-info">
        <h1 class="film-title">${esc(movie.title)}</h1>
        <div class="film-meta">
          <span>${movie.year}</span>
          <span class="sep">·</span>
          <span>${movie.runtime}m</span>
          <span class="sep">·</span>
          <span>${esc(movie.language)}</span>
          <span class="sep">·</span>
          <span>${esc(movie.country)}</span>
        </div>
        <div class="film-director">Directed by <a href="/films?q=${encodeURIComponent(movie.director)}">${esc(movie.director)}</a></div>
        <div class="genres">${movie.genres.map(g => `<span class="genre-tag">${esc(g)}</span>`).join('')}</div>
        <p class="film-synopsis">${esc(movie.synopsis)}</p>
        <div class="film-cast"><strong>Cast:</strong> ${esc(movie.cast.join(', '))}</div>
        <div class="film-rating-display">
          <div>
            <div class="avg-stars">${'★'.repeat(Math.round(displayRating / 2))}</div>
            <div style="font-size:12px;color:var(--muted)">${displayRating.toFixed(1)} / 10 · ${displayTotal.toLocaleString()} ratings</div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="container">
    <div class="two-col">
      <div class="main-col">
        ${user ? `
        <div class="log-section" style="margin-bottom:32px">
          <h3>${userEntry ? 'Update your log' : 'Log this film'}</h3>
          <form method="post" action="/films/${esc(movie.id)}/log">
            <div class="form-group">
              <label>Rating</label>
              <div class="star-row" id="starRow">
                ${[1,2,3,4,5,6,7,8,9,10].map(i => `<button type="button" class="star-btn${userEntry?.rating >= i ? ' active' : ''}" data-val="${i}">${i <= 5 ? '★' : '★'}</button>`).join('')}
              </div>
              <input type="hidden" name="rating" id="ratingInput" value="${userEntry?.rating || ''}">
              <div style="font-size:12px;color:var(--muted);margin-top:4px" id="ratingLabel">${userEntry?.rating ? `${userEntry.rating}/10` : 'Click to rate'}</div>
            </div>
            <div class="form-group">
              <label>Review (optional)</label>
              <textarea name="review" rows="3" placeholder="Share your thoughts...">${esc(userEntry?.review || '')}</textarea>
            </div>
            <div style="display:flex;gap:20px;align-items:center;margin-bottom:16px">
              <div class="liked-toggle">
                <input type="checkbox" name="liked" value="1" id="liked" ${userEntry?.liked ? 'checked' : ''}>
                <label for="liked" title="Like this film">♥</label>
                <span style="font-size:13px;color:var(--muted)">Like</span>
              </div>
              <div class="form-group" style="flex:1;margin:0">
                <input type="date" name="watched_date" value="${esc(userEntry?.watched_date || new Date().toISOString().split('T')[0])}">
              </div>
            </div>
            <button type="submit" class="btn-primary">${userEntry ? 'Update log' : 'Save to diary'}</button>
          </form>
        </div>

        <div style="margin-bottom:32px">
          <form method="post" action="/films/${esc(movie.id)}/watchlist">
            <input type="hidden" name="action" value="${inWatchlist ? 'remove' : 'add'}">
            <button type="submit" class="btn-ghost" style="display:inline-flex;align-items:center;gap:6px">
              ${inWatchlist ? '✓ On watchlist' : '+ Add to watchlist'}
            </button>
          </form>
        </div>
        ` : `<div style="margin-bottom:32px;padding:20px;background:var(--surface);border:1px solid var(--border);border-radius:10px;text-align:center">
          <p style="color:var(--muted);margin-bottom:12px">Sign in to log this film</p>
          <a href="/login" class="btn-primary">Sign in</a>
        </div>`}

        <div class="section-title">Reviews</div>
        ${entries.length ? `<div class="reviews-grid">
          ${entries.map(e => `
          <div class="review-card">
            <div class="review-header">
              <div class="avatar" style="width:36px;height:36px;background:${esc(e.avatar_color)};font-size:14px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;color:#fff">${(e.display_name || e.username).charAt(0).toUpperCase()}</div>
              <div>
                <div class="review-user"><a href="/profile/${esc(e.username)}">${esc(e.display_name)}</a></div>
                <div class="review-date">${e.watched_date || ''} ${e.rating ? `· ${stars(Number(e.rating))}` : ''} ${e.liked ? '♥' : ''}</div>
              </div>
            </div>
            <div class="review-body">${esc(e.review)}</div>
          </div>`).join('')}
        </div>` : `<div class="empty-state"><p>No reviews yet. Be the first!</p></div>`}
      </div>

      <div class="side-col">
        <div class="section-title">Rating Distribution</div>
        <div class="rating-dist">
          ${[10,9,8,7,6,5,4,3,2,1].map(i => {
            const row = ratingDist.find((r: any) => Number(r.rating) === i);
            const count = row ? Number(row.count) : 0;
            const pct = (count / maxCount) * 100;
            return `<div class="dist-row">
              <div class="dist-label">${i}</div>
              <div class="dist-bar-bg"><div class="dist-bar" style="width:${pct}%"></div></div>
              <div class="dist-count">${count}</div>
            </div>`;
          }).join('')}
        </div>
      </div>
    </div>
  </div>

  <script>
    const stars = document.querySelectorAll('.star-btn');
    const input = document.getElementById('ratingInput');
    const label = document.getElementById('ratingLabel');
    let current = parseInt(input.value) || 0;

    function updateStars(val) {
      stars.forEach(s => {
        s.classList.toggle('active', parseInt(s.dataset.val) <= val);
      });
    }
    updateStars(current);

    stars.forEach(s => {
      s.addEventListener('mouseover', () => updateStars(parseInt(s.dataset.val)));
      s.addEventListener('mouseleave', () => updateStars(current));
      s.addEventListener('click', () => {
        current = parseInt(s.dataset.val);
        input.value = current;
        label.textContent = current + '/10';
        updateStars(current);
      });
    });
  </script>`;
}

// ─── Profile Page ─────────────────────────────────────────────────────────────

export function profilePage(profileUser: any, currentUser: any, recentEntries: any[], likedMovies: any[], stats: any, followers: number, following: number, isFollowing: boolean): string {
  const isSelf = currentUser && currentUser.id === profileUser.id;

  return `
  <div class="profile-header">
    <div class="profile-inner">
      <div class="profile-avatar">${avatar(profileUser, 88)}</div>
      <div style="flex:1">
        <div class="profile-name">${esc(profileUser.display_name)}</div>
        <div class="profile-username">@${esc(profileUser.username)}</div>
        ${profileUser.bio ? `<div class="profile-bio">${esc(profileUser.bio)}</div>` : ''}
        <div class="profile-stats">
          <div class="stat-item"><div class="stat-num">${stats.films}</div><div class="stat-label">Films</div></div>
          <div class="stat-item"><div class="stat-num">${stats.thisYear}</div><div class="stat-label">This year</div></div>
          <div class="stat-item"><div class="stat-num">${stats.liked}</div><div class="stat-label">Liked</div></div>
          <div class="stat-item"><div class="stat-num">${followers}</div><div class="stat-label">Followers</div></div>
          <div class="stat-item"><div class="stat-num">${following}</div><div class="stat-label">Following</div></div>
        </div>
      </div>
      <div class="profile-actions">
        ${!isSelf && currentUser ? `
        <form method="post" action="/profile/${esc(profileUser.username)}/follow">
          <input type="hidden" name="action" value="${isFollowing ? 'unfollow' : 'follow'}">
          <button type="submit" class="${isFollowing ? 'btn-ghost' : 'btn-primary'}" style="${isFollowing ? 'display:inline-flex;align-items:center;gap:6px;padding:8px 18px;border-radius:6px;font-size:13px;font-weight:600' : ''}">
            ${isFollowing ? '✓ Following' : 'Follow'}
          </button>
        </form>` : ''}
      </div>
    </div>
  </div>

  <div class="container">
    <div class="two-col">
      <div class="main-col">
        <div class="section-title">Recent Diary</div>
        ${recentEntries.length ? recentEntries.map(e => {
          const movie = MOVIE_MAP.get(e.movie_id);
          if (!movie) return '';
          return `<div class="diary-entry">
            <div class="diary-date">${e.watched_date || ''}</div>
            <a href="/films/${movie.id}" class="diary-poster"><img src="${esc(movie.poster)}" alt="${esc(movie.title)}" loading="lazy"></a>
            <div class="diary-info">
              <div class="diary-title"><a href="/films/${movie.id}">${esc(movie.title)}</a> <span style="color:var(--muted);font-size:12px">${movie.year}</span></div>
              ${e.review ? `<div class="diary-review">"${esc(e.review)}"</div>` : ''}
            </div>
            <div class="diary-rating">
              ${e.rating ? stars(Number(e.rating)) : ''}
              ${e.liked ? '<div style="color:var(--red);font-size:16px">♥</div>' : ''}
            </div>
          </div>`;
        }).join('') : `<div class="empty-state"><p>No diary entries yet.</p></div>`}
      </div>
      <div class="side-col">
        ${likedMovies.length ? `
        <div class="section-title">Liked Films</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:24px">
          ${likedMovies.map(e => {
            const movie = MOVIE_MAP.get(e.movie_id);
            if (!movie) return '';
            return `<a href="/films/${movie.id}" class="movie-card">
              <div class="poster-wrap"><img src="${esc(movie.poster)}" alt="${esc(movie.title)}" loading="lazy"></div>
              <div class="card-info"><span class="card-title">${esc(movie.title)}</span></div>
            </a>`;
          }).join('')}
        </div>` : ''}
      </div>
    </div>
  </div>`;
}

// ─── Diary Page ───────────────────────────────────────────────────────────────

export function diaryPage(user: any, entries: any[]): string {
  return `
  <div class="container">
    <div class="page-title" style="margin-bottom:24px">My Diary</div>
    ${entries.length ? entries.map(e => {
      const movie = MOVIE_MAP.get(e.movie_id);
      if (!movie) return '';
      return `<div class="diary-entry">
        <div class="diary-date">${e.watched_date || ''}</div>
        <a href="/films/${movie.id}" class="diary-poster"><img src="${esc(movie.poster)}" alt="${esc(movie.title)}" loading="lazy"></a>
        <div class="diary-info">
          <div class="diary-title"><a href="/films/${movie.id}">${esc(movie.title)}</a> <span style="color:var(--muted);font-size:12px">${movie.year}</span></div>
          ${e.review ? `<div class="diary-review">"${esc(e.review)}"</div>` : ''}
        </div>
        <div class="diary-rating" style="display:flex;align-items:center;gap:8px">
          ${e.rating ? stars(Number(e.rating)) : ''}
          ${e.liked ? '<span style="color:var(--red);font-size:16px">♥</span>' : ''}
        </div>
      </div>`;
    }).join('') : `<div class="empty-state"><p>Your diary is empty. Start logging films!</p><a href="/films" class="btn-primary">Browse films</a></div>`}
  </div>`;
}

// ─── Watchlist Page ───────────────────────────────────────────────────────────

export function watchlistPage(user: any, items: any[]): string {
  const movies = items.map(i => MOVIE_MAP.get(i.movie_id)).filter(Boolean) as Movie[];
  return `
  <div class="container">
    <div class="page-title" style="margin-bottom:24px">My Watchlist <span style="font-size:18px;color:var(--muted);font-weight:400">${movies.length} films</span></div>
    ${movies.length ? `<div class="watchlist-grid">${movies.map(m => movieCard(m)).join('')}</div>`
    : `<div class="empty-state"><p>Your watchlist is empty.</p><a href="/films" class="btn-primary">Browse films</a></div>`}
  </div>`;
}

// ─── Lists Page ───────────────────────────────────────────────────────────────

export function listsPage(user: any, lists: any[]): string {
  return `
  <div class="container">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:28px">
      <div class="page-title">My Lists</div>
      <button onclick="document.getElementById('newListModal').style.display='flex'" class="btn-primary">+ New List</button>
    </div>

    <div class="lists-grid">
      ${lists.map(l => `
      <div class="list-card">
        <div class="list-name">${esc(l.name)}</div>
        <div class="list-desc">${esc(l.description)}</div>
        <div class="list-posters">
          ${(l.preview_movies || []).map((m: Movie) => `<img src="${esc(m.poster)}" alt="${esc(m.title)}" loading="lazy">`).join('')}
        </div>
        <div class="list-meta">${l.movie_count} film${l.movie_count !== 1 ? 's' : ''}</div>
      </div>`).join('')}
    </div>

    ${!lists.length ? `<div class="empty-state"><p>No lists yet. Create your first list!</p></div>` : ''}
  </div>

  <!-- New List Modal -->
  <div id="newListModal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:200;align-items:center;justify-content:center">
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:32px;width:90%;max-width:440px">
      <div style="font-size:20px;font-weight:700;margin-bottom:20px">New List</div>
      <form method="post" action="/lists">
        <div class="form-group">
          <label>List name</label>
          <input type="text" name="name" placeholder="e.g. All-Time Favorites" required>
        </div>
        <div class="form-group">
          <label>Description (optional)</label>
          <input type="text" name="description" placeholder="What's this list about?">
        </div>
        <div style="display:flex;gap:10px">
          <button type="submit" class="btn-primary">Create list</button>
          <button type="button" onclick="document.getElementById('newListModal').style.display='none'" class="btn-ghost" style="padding:8px 18px;border-radius:6px;font-size:13px;font-weight:600">Cancel</button>
        </div>
      </form>
    </div>
  </div>`;
}

// ─── Search Page ──────────────────────────────────────────────────────────────

export function searchPage(movies: Movie[], query: string, genre: string, allGenres: string[], user: any): string {
  return `
  <div class="search-hero">
    <div style="max-width:1200px;margin:0 auto">
      <div class="page-title" style="margin-bottom:16px">Films</div>
      <form class="search-form" action="/films" method="get">
        <input type="text" name="q" value="${esc(query)}" placeholder="Search by title, director, actor, genre..." autofocus>
        <button type="submit">Search</button>
      </form>
      <div class="genre-filters" style="margin-top:16px">
        <a href="/films" class="genre-btn${!genre ? ' active' : ''}">All</a>
        ${allGenres.map(g => `<a href="/films?genre=${encodeURIComponent(g)}" class="genre-btn${genre === g ? ' active' : ''}">${esc(g)}</a>`).join('')}
      </div>
    </div>
  </div>
  <div class="container">
    ${query || genre ? `<div style="color:var(--muted);font-size:14px;margin-bottom:20px">${movies.length} result${movies.length !== 1 ? 's' : ''} ${query ? `for "${esc(query)}"` : ''} ${genre ? `in ${esc(genre)}` : ''}</div>` : ''}
    <div class="movies-grid">
      ${movies.map(m => movieCard(m)).join('')}
    </div>
    ${!movies.length ? `<div class="empty-state"><p>No films found.</p></div>` : ''}
  </div>`;
}

// ─── Login Page ───────────────────────────────────────────────────────────────

export function loginPage(error?: string): string {
  return `
  <div class="login-wrap">
    <div class="login-box">
      <div class="login-title">Welcome to CineLog</div>
      <div class="login-sub">Enter your username to sign in or create an account.</div>
      <form method="post" action="/login">
        <input type="text" name="username" placeholder="Username" autocomplete="off" autofocus>
        ${error ? `<div class="error-msg">${esc(error)}</div>` : ''}
        <button type="submit" class="btn-primary">Continue</button>
      </form>
      <div class="login-note">No password needed. Just pick a username and go.</div>
    </div>
  </div>`;
}

// ─── Show Card ────────────────────────────────────────────────────────────────

function showCard(show: TVShow, entry?: any): string {
  const hasWatched = !!entry;
  const liked = entry?.liked;
  const statusDot = show.status === 'Ongoing'
    ? '<span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#22c55e;margin-right:4px;vertical-align:middle"></span>'
    : '';
  return `
    <a href="/shows/${show.id}" class="movie-card">
      <div class="poster-wrap">
        <img src="${esc(show.poster)}" alt="${esc(show.title)}" loading="lazy">
        ${hasWatched ? `<div class="watched-badge">
          ${stars(entry.rating)}
          ${liked ? '<span class="heart-badge">♥</span>' : ''}
        </div>` : ''}
        <div style="position:absolute;top:6px;right:6px;background:rgba(0,0,0,0.75);border-radius:4px;padding:2px 6px;font-size:10px;font-weight:600;color:#fff">${show.seasons}S</div>
      </div>
      <div class="card-info">
        <span class="card-title">${esc(show.title)}</span>
        <span class="card-year">${show.firstAired} ${statusDot}${show.network}</span>
      </div>
    </a>`;
}

// ─── Shows Browse Page ────────────────────────────────────────────────────────

export function showsPage(shows: TVShow[], query: string, genre: string, allGenres: string[], user: any): string {
  return `
  <div class="search-hero">
    <div style="max-width:1200px;margin:0 auto">
      <div class="page-title" style="margin-bottom:16px">TV Shows</div>
      <form class="search-form" action="/shows" method="get">
        <input type="text" name="q" value="${esc(query)}" placeholder="Search by title, creator, cast, network..." autofocus>
        <button type="submit">Search</button>
      </form>
      <div class="genre-filters" style="margin-top:16px">
        <a href="/shows" class="genre-btn${!genre ? ' active' : ''}">All</a>
        ${allGenres.map(g => `<a href="/shows?genre=${encodeURIComponent(g)}" class="genre-btn${genre === g ? ' active' : ''}">${esc(g)}</a>`).join('')}
      </div>
    </div>
  </div>
  <div class="container">
    ${query || genre ? `<div style="color:var(--muted);font-size:14px;margin-bottom:20px">${shows.length} result${shows.length !== 1 ? 's' : ''} ${query ? `for "${esc(query)}"` : ''} ${genre ? `in ${esc(genre)}` : ''}</div>` : ''}
    <div class="movies-grid">
      ${shows.map(s => showCard(s)).join('')}
    </div>
    ${!shows.length ? `<div class="empty-state"><p>No shows found.</p></div>` : ''}
  </div>`;
}

// ─── Show Detail Page ─────────────────────────────────────────────────────────

export function showPage(show: TVShow, entries: any[], ratingDist: any[], avgRating: number, totalRatings: number, userEntry: any, inWatchlist: boolean, user: any): string {
  const maxCount = Math.max(...ratingDist.map((r: any) => Number(r.count)), 1);
  const displayRating = totalRatings > 0 ? avgRating : show.avgRating;
  const displayTotal = totalRatings > 0 ? totalRatings : show.ratingsCount;
  const isOngoing = show.status === 'Ongoing';

  return `
  <div class="film-hero">
    <div class="film-hero-backdrop" style="background-image:url(${esc(show.backdrop)})"></div>
    <div class="film-hero-inner">
      <div class="film-poster">
        <img src="${esc(show.poster)}" alt="${esc(show.title)}">
      </div>
      <div class="film-info">
        <h1 class="film-title">${esc(show.title)}</h1>
        <div class="film-meta">
          <span>${show.firstAired}</span>
          <span class="sep">·</span>
          <span>${show.seasons} season${show.seasons !== 1 ? 's' : ''} · ${show.episodes} episodes</span>
          <span class="sep">·</span>
          <span style="${isOngoing ? 'color:#22c55e' : ''}">${show.status}</span>
          <span class="sep">·</span>
          <span>${esc(show.network)}</span>
        </div>
        <div class="film-director">Created by <a href="/shows?q=${encodeURIComponent(show.creator)}">${esc(show.creator)}</a></div>
        <div class="genres">${show.genres.map(g => `<span class="genre-tag">${esc(g)}</span>`).join('')}</div>
        <p class="film-synopsis">${esc(show.synopsis)}</p>
        <div class="film-cast"><strong>Cast:</strong> ${esc(show.cast.join(', '))}</div>
        <div class="film-rating-display">
          <div>
            <div class="avg-stars">${'★'.repeat(Math.round(displayRating / 2))}</div>
            <div style="font-size:12px;color:var(--muted)">${displayRating.toFixed(1)} / 10 · ${displayTotal.toLocaleString()} ratings</div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="container">
    <div class="two-col">
      <div class="main-col">
        ${user ? `
        <div class="log-section" style="margin-bottom:32px">
          <h3>${userEntry ? 'Update your log' : 'Log this show'}</h3>
          <form method="post" action="/shows/${esc(show.id)}/log">
            <div class="form-group">
              <label>Rating</label>
              <div class="star-row" id="starRow">
                ${[1,2,3,4,5,6,7,8,9,10].map(i => `<button type="button" class="star-btn${userEntry?.rating >= i ? ' active' : ''}" data-val="${i}">★</button>`).join('')}
              </div>
              <input type="hidden" name="rating" id="ratingInput" value="${userEntry?.rating || ''}">
              <div style="font-size:12px;color:var(--muted);margin-top:4px" id="ratingLabel">${userEntry?.rating ? `${userEntry.rating}/10` : 'Click to rate'}</div>
            </div>
            <div class="form-group">
              <label>Season watched up to</label>
              <select name="season_watched" style="width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:6px;padding:10px 14px;color:var(--text);font-family:inherit;font-size:14px">
                <option value="">— select season —</option>
                ${Array.from({length: show.seasons}, (_, i) => i + 1).map(s =>
                  `<option value="${s}" ${userEntry?.season_watched == s ? 'selected' : ''}>Season ${s}${s === show.seasons ? (isOngoing ? ' (latest)' : ' (finale)') : ''}</option>`
                ).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>Review (optional)</label>
              <textarea name="review" rows="3" placeholder="Share your thoughts...">${esc(userEntry?.review || '')}</textarea>
            </div>
            <div style="display:flex;gap:20px;align-items:center;margin-bottom:16px">
              <div class="liked-toggle">
                <input type="checkbox" name="liked" value="1" id="liked" ${userEntry?.liked ? 'checked' : ''}>
                <label for="liked" title="Like this show">♥</label>
                <span style="font-size:13px;color:var(--muted)">Like</span>
              </div>
              <div class="form-group" style="flex:1;margin:0">
                <input type="date" name="watched_date" value="${esc(userEntry?.watched_date || new Date().toISOString().split('T')[0])}">
              </div>
            </div>
            <button type="submit" class="btn-primary">${userEntry ? 'Update log' : 'Save to diary'}</button>
          </form>
        </div>

        <div style="margin-bottom:32px">
          <form method="post" action="/shows/${esc(show.id)}/watchlist">
            <input type="hidden" name="action" value="${inWatchlist ? 'remove' : 'add'}">
            <button type="submit" class="btn-ghost" style="display:inline-flex;align-items:center;gap:6px">
              ${inWatchlist ? '✓ On watchlist' : '+ Add to watchlist'}
            </button>
          </form>
        </div>
        ` : `<div style="margin-bottom:32px;padding:20px;background:var(--surface);border:1px solid var(--border);border-radius:10px;text-align:center">
          <p style="color:var(--muted);margin-bottom:12px">Sign in to log this show</p>
          <a href="/login" class="btn-primary">Sign in</a>
        </div>`}

        <div class="section-title">Reviews</div>
        ${entries.length ? `<div class="reviews-grid">
          ${entries.map(e => `
          <div class="review-card">
            <div class="review-header">
              <div class="avatar" style="width:36px;height:36px;background:${esc(e.avatar_color)};font-size:14px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;color:#fff">${(e.display_name || e.username).charAt(0).toUpperCase()}</div>
              <div>
                <div class="review-user"><a href="/profile/${esc(e.username)}">${esc(e.display_name)}</a></div>
                <div class="review-date">
                  ${e.season_watched ? `S${e.season_watched} · ` : ''}${e.watched_date || ''} ${e.rating ? `· ${stars(Number(e.rating))}` : ''} ${e.liked ? '♥' : ''}
                </div>
              </div>
            </div>
            <div class="review-body">${esc(e.review)}</div>
          </div>`).join('')}
        </div>` : `<div class="empty-state"><p>No reviews yet. Be the first!</p></div>`}
      </div>

      <div class="side-col">
        <div class="section-title">Rating Distribution</div>
        <div class="rating-dist">
          ${[10,9,8,7,6,5,4,3,2,1].map(i => {
            const row = ratingDist.find((r: any) => Number(r.rating) === i);
            const count = row ? Number(row.count) : 0;
            const pct = (count / maxCount) * 100;
            return `<div class="dist-row">
              <div class="dist-label">${i}</div>
              <div class="dist-bar-bg"><div class="dist-bar" style="width:${pct}%"></div></div>
              <div class="dist-count">${count}</div>
            </div>`;
          }).join('')}
        </div>

        <div style="margin-top:32px">
          <div class="section-title">Show Info</div>
          <div style="display:flex;flex-direction:column;gap:10px;font-size:13px">
            <div style="display:flex;justify-content:space-between"><span style="color:var(--muted)">Network</span><span>${esc(show.network)}</span></div>
            <div style="display:flex;justify-content:space-between"><span style="color:var(--muted)">Seasons</span><span>${show.seasons}</span></div>
            <div style="display:flex;justify-content:space-between"><span style="color:var(--muted)">Episodes</span><span>${show.episodes}</span></div>
            <div style="display:flex;justify-content:space-between"><span style="color:var(--muted)">Status</span><span style="${isOngoing ? 'color:#22c55e' : ''}">${show.status}</span></div>
            <div style="display:flex;justify-content:space-between"><span style="color:var(--muted)">Language</span><span>${esc(show.language)}</span></div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <script>
    const stars = document.querySelectorAll('.star-btn');
    const input = document.getElementById('ratingInput');
    const label = document.getElementById('ratingLabel');
    let current = parseInt(input.value) || 0;

    function updateStars(val) {
      stars.forEach(s => {
        s.classList.toggle('active', parseInt(s.dataset.val) <= val);
      });
    }
    updateStars(current);

    stars.forEach(s => {
      s.addEventListener('mouseover', () => updateStars(parseInt(s.dataset.val)));
      s.addEventListener('mouseleave', () => updateStars(current));
      s.addEventListener('click', () => {
        current = parseInt(s.dataset.val);
        input.value = current;
        label.textContent = current + '/10';
        updateStars(current);
      });
    });
  </script>`;
}

// ─── Documentary Card ─────────────────────────────────────────────────────────

function docCard(doc: Documentary, entry?: any): string {
  const hasWatched = !!entry;
  const liked = entry?.liked;
  const hrs = Math.floor(doc.runtime / 60);
  const mins = doc.runtime % 60;
  const runtimeStr = hrs > 0 ? `${hrs}h${mins > 0 ? ` ${mins}m` : ''}` : `${mins}m`;
  return `
    <a href="/docs/${doc.id}" class="movie-card">
      <div class="poster-wrap">
        <img src="${esc(doc.poster)}" alt="${esc(doc.title)}" loading="lazy">
        ${hasWatched ? `<div class="watched-badge">
          ${stars(entry.rating)}
          ${liked ? '<span class="heart-badge">♥</span>' : ''}
        </div>` : ''}
        <div style="position:absolute;top:6px;right:6px;background:rgba(0,0,0,0.75);border-radius:4px;padding:2px 6px;font-size:10px;font-weight:600;color:#fff">${runtimeStr}</div>
      </div>
      <div class="card-info">
        <span class="card-title">${esc(doc.title)}</span>
        <span class="card-year">${doc.year} · ${esc(doc.genres[0])}</span>
      </div>
    </a>`;
}

// ─── Docs Browse Page ─────────────────────────────────────────────────────────

export function docsPage(docs: Documentary[], query: string, genre: string, allGenres: string[], user: any): string {
  return `
  <div class="search-hero">
    <div style="max-width:1200px;margin:0 auto">
      <div class="page-title" style="margin-bottom:16px">Documentaries</div>
      <form class="search-form" action="/docs" method="get">
        <input type="text" name="q" value="${esc(query)}" placeholder="Search by title, director, subject, genre..." autofocus>
        <button type="submit">Search</button>
      </form>
      <div class="genre-filters" style="margin-top:16px">
        <a href="/docs" class="genre-btn${!genre ? ' active' : ''}">All</a>
        ${allGenres.map(g => `<a href="/docs?genre=${encodeURIComponent(g)}" class="genre-btn${genre === g ? ' active' : ''}">${esc(g)}</a>`).join('')}
      </div>
    </div>
  </div>
  <div class="container">
    ${query || genre ? `<div style="color:var(--muted);font-size:14px;margin-bottom:20px">${docs.length} result${docs.length !== 1 ? 's' : ''} ${query ? `for "${esc(query)}"` : ''} ${genre ? `in ${esc(genre)}` : ''}</div>` : ''}
    <div class="movies-grid">
      ${docs.map(d => docCard(d)).join('')}
    </div>
    ${!docs.length ? `<div class="empty-state"><p>No documentaries found.</p></div>` : ''}
  </div>`;
}

// ─── Doc Detail Page ──────────────────────────────────────────────────────────

export function docPage(doc: Documentary, entries: any[], ratingDist: any[], avgRating: number, totalRatings: number, userEntry: any, inWatchlist: boolean, user: any): string {
  const maxCount = Math.max(...ratingDist.map((r: any) => Number(r.count)), 1);
  const displayRating = totalRatings > 0 ? avgRating : doc.avgRating;
  const displayTotal = totalRatings > 0 ? totalRatings : doc.ratingsCount;
  const hrs = Math.floor(doc.runtime / 60);
  const mins = doc.runtime % 60;
  const runtimeStr = hrs > 0 ? `${hrs}h ${mins > 0 ? `${mins}m` : ''}` : `${mins}m`;

  return `
  <div class="film-hero">
    <div class="film-hero-backdrop" style="background-image:url(${esc(doc.backdrop)})"></div>
    <div class="film-hero-inner">
      <div class="film-poster">
        <img src="${esc(doc.poster)}" alt="${esc(doc.title)}">
      </div>
      <div class="film-info">
        <h1 class="film-title">${esc(doc.title)}</h1>
        <div class="film-meta">
          <span>${doc.year}</span>
          <span class="sep">·</span>
          <span>${runtimeStr}</span>
          <span class="sep">·</span>
          <span>${esc(doc.language)}</span>
          <span class="sep">·</span>
          <span>${esc(doc.platform)}</span>
        </div>
        <div class="film-director">Directed by <a href="/docs?q=${encodeURIComponent(doc.director)}">${esc(doc.director)}</a></div>
        <div class="genres">${doc.genres.map(g => `<span class="genre-tag">${esc(g)}</span>`).join('')}</div>
        <p class="film-synopsis">${esc(doc.synopsis)}</p>
        ${doc.featuring.length ? `<div class="film-cast"><strong>Featuring:</strong> ${esc(doc.featuring.join(', '))}</div>` : ''}
        <div class="film-rating-display">
          <div>
            <div class="avg-stars">${'★'.repeat(Math.round(displayRating / 2))}</div>
            <div style="font-size:12px;color:var(--muted)">${displayRating.toFixed(1)} / 10 · ${displayTotal.toLocaleString()} ratings</div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="container">
    <div class="two-col">
      <div class="main-col">
        ${user ? `
        <div class="log-section" style="margin-bottom:32px">
          <h3>${userEntry ? 'Update your log' : 'Log this documentary'}</h3>
          <form method="post" action="/docs/${esc(doc.id)}/log">
            <div class="form-group">
              <label>Rating</label>
              <div class="star-row" id="starRow">
                ${[1,2,3,4,5,6,7,8,9,10].map(i => `<button type="button" class="star-btn${userEntry?.rating >= i ? ' active' : ''}" data-val="${i}">★</button>`).join('')}
              </div>
              <input type="hidden" name="rating" id="ratingInput" value="${userEntry?.rating || ''}">
              <div style="font-size:12px;color:var(--muted);margin-top:4px" id="ratingLabel">${userEntry?.rating ? `${userEntry.rating}/10` : 'Click to rate'}</div>
            </div>
            <div class="form-group">
              <label>Review (optional)</label>
              <textarea name="review" rows="3" placeholder="Share your thoughts...">${esc(userEntry?.review || '')}</textarea>
            </div>
            <div style="display:flex;gap:20px;align-items:center;margin-bottom:16px">
              <div class="liked-toggle">
                <input type="checkbox" name="liked" value="1" id="liked" ${userEntry?.liked ? 'checked' : ''}>
                <label for="liked" title="Like this documentary">♥</label>
                <span style="font-size:13px;color:var(--muted)">Like</span>
              </div>
              <div class="form-group" style="flex:1;margin:0">
                <input type="date" name="watched_date" value="${esc(userEntry?.watched_date || new Date().toISOString().split('T')[0])}">
              </div>
            </div>
            <button type="submit" class="btn-primary">${userEntry ? 'Update log' : 'Save to diary'}</button>
          </form>
        </div>

        <div style="margin-bottom:32px">
          <form method="post" action="/docs/${esc(doc.id)}/watchlist">
            <input type="hidden" name="action" value="${inWatchlist ? 'remove' : 'add'}">
            <button type="submit" class="btn-ghost" style="display:inline-flex;align-items:center;gap:6px">
              ${inWatchlist ? '✓ On watchlist' : '+ Add to watchlist'}
            </button>
          </form>
        </div>
        ` : `<div style="margin-bottom:32px;padding:20px;background:var(--surface);border:1px solid var(--border);border-radius:10px;text-align:center">
          <p style="color:var(--muted);margin-bottom:12px">Sign in to log this documentary</p>
          <a href="/login" class="btn-primary">Sign in</a>
        </div>`}

        <div class="section-title">Reviews</div>
        ${entries.length ? `<div class="reviews-grid">
          ${entries.map(e => `
          <div class="review-card">
            <div class="review-header">
              <div class="avatar" style="width:36px;height:36px;background:${esc(e.avatar_color)};font-size:14px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;color:#fff">${(e.display_name || e.username).charAt(0).toUpperCase()}</div>
              <div>
                <div class="review-user"><a href="/profile/${esc(e.username)}">${esc(e.display_name)}</a></div>
                <div class="review-date">${e.watched_date || ''} ${e.rating ? '· ' + stars(Number(e.rating)) : ''} ${e.liked ? '♥' : ''}</div>
              </div>
            </div>
            <div class="review-body">${esc(e.review)}</div>
          </div>`).join('')}
        </div>` : `<div class="empty-state"><p>No reviews yet. Be the first!</p></div>`}
      </div>

      <div class="side-col">
        <div class="section-title">Rating Distribution</div>
        <div class="rating-dist">
          ${[10,9,8,7,6,5,4,3,2,1].map(i => {
            const row = ratingDist.find((r: any) => Number(r.rating) === i);
            const count = row ? Number(row.count) : 0;
            const pct = (count / maxCount) * 100;
            return `<div class="dist-row">
              <div class="dist-label">${i}</div>
              <div class="dist-bar-bg"><div class="dist-bar" style="width:${pct}%"></div></div>
              <div class="dist-count">${count}</div>
            </div>`;
          }).join('')}
        </div>

        <div style="margin-top:32px">
          <div class="section-title">Info</div>
          <div style="display:flex;flex-direction:column;gap:10px;font-size:13px">
            <div style="display:flex;justify-content:space-between"><span style="color:var(--muted)">Director</span><span>${esc(doc.director)}</span></div>
            <div style="display:flex;justify-content:space-between"><span style="color:var(--muted)">Runtime</span><span>${runtimeStr}</span></div>
            <div style="display:flex;justify-content:space-between"><span style="color:var(--muted)">Platform</span><span>${esc(doc.platform)}</span></div>
            <div style="display:flex;justify-content:space-between"><span style="color:var(--muted)">Country</span><span>${esc(doc.country)}</span></div>
            <div style="display:flex;justify-content:space-between"><span style="color:var(--muted)">Language</span><span>${esc(doc.language)}</span></div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <script>
    (function() {
      const btns = document.querySelectorAll('.star-btn');
      const inp = document.getElementById('ratingInput');
      const lbl = document.getElementById('ratingLabel');
      let cur = parseInt(inp.value) || 0;
      function upd(v) { btns.forEach(b => b.classList.toggle('active', parseInt(b.dataset.val) <= v)); }
      upd(cur);
      btns.forEach(b => {
        b.addEventListener('mouseover', () => upd(parseInt(b.dataset.val)));
        b.addEventListener('mouseleave', () => upd(cur));
        b.addEventListener('click', () => { cur = parseInt(b.dataset.val); inp.value = cur; lbl.textContent = cur + '/10'; upd(cur); });
      });
    })();
  </script>`;
}
