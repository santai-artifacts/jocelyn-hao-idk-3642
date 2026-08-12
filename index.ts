import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import db, { q } from "./db.js";
import { MOVIES, MOVIE_MAP, searchMovies, getMovie } from "./movies.js";
import { layout, homePage, moviePage, profilePage, diaryPage, watchlistPage, listsPage, searchPage, loginPage } from "./templates.js";

const app = new Hono();

// Read session from ?_s= query param (localStorage-injected) OR cookie (fallback)
function getSessionId(c: any): string | null {
  return c.req.query("_s") || getCookie(c, "session") || null;
}

function getCurrentUser(c: any) {
  const sessionId = getSessionId(c);
  if (!sessionId) return null;
  const session = q("SELECT user_id FROM sessions WHERE id = ?").get(sessionId) as any;
  if (!session) return null;
  return q("SELECT * FROM users WHERE id = ?").get(session.user_id) as any;
}

function withSession(sessionId: string | null, path: string): string {
  if (!sessionId) return path;
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}_s=${encodeURIComponent(sessionId)}`;
}

// ─── Pages ───────────────────────────────────────────────────────────────────

app.get("/", (c) => {
  const user = getCurrentUser(c);
  const recentEntries = q(`
    SELECT de.*, u.username, u.display_name, u.avatar_color
    FROM diary_entries de JOIN users u ON de.user_id = u.id
    ORDER BY de.created_at DESC LIMIT 20
  `).all() as any[];
  return c.html(layout(homePage(user, MOVIES.slice(0, 12), recentEntries), "CineLog — Track your film life", user));
});

app.get("/login", (c) => {
  const user = getCurrentUser(c);
  if (user) return c.redirect("/");
  return c.html(layout(loginPage(), "Sign In — CineLog", null));
});

app.post("/login", async (c) => {
  const form = await c.req.formData();
  const username = (form.get("username") as string || "").trim().toLowerCase();
  if (!username || username.length < 2) {
    return c.html(layout(loginPage("Username must be at least 2 characters"), "Sign In — CineLog", null));
  }
  let user = q("SELECT * FROM users WHERE username = ?").get(username) as any;
  if (!user) {
    const colors = ["#14b8a6", "#8b5cf6", "#f59e0b", "#ef4444", "#3b82f6", "#ec4899"];
    const color = colors[username.length % colors.length];
    q("INSERT INTO users (username, display_name, avatar_color) VALUES (?, ?, ?)").run(username, username, color);
    user = q("SELECT * FROM users WHERE username = ?").get(username) as any;
  }
  const sessionId = crypto.randomUUID();
  q("INSERT INTO sessions (id, user_id) VALUES (?, ?)").run(sessionId, user.id);
  // Set cookie as fallback for non-iframe contexts
  setCookie(c, "session", sessionId, { path: "/", maxAge: 60 * 60 * 24 * 30 });
  // Primary: redirect with session in URL so JS can persist it to localStorage
  return c.redirect(`/?_s=${encodeURIComponent(sessionId)}`);
});

app.post("/logout", async (c) => {
  const form = await c.req.formData();
  const sessionId = (form.get("_s") as string) || getSessionId(c);
  if (sessionId) q("DELETE FROM sessions WHERE id = ?").run(sessionId);
  deleteCookie(c, "session");
  return c.redirect("/?_logout=1");
});

app.get("/films", (c) => {
  const sq = c.req.query("q") || "";
  const genre = c.req.query("genre") || "";
  const user = getCurrentUser(c);
  let results = sq ? searchMovies(sq) : MOVIES;
  if (genre) results = results.filter(m => m.genres.includes(genre));
  const allGenres = [...new Set(MOVIES.flatMap(m => m.genres))].sort();
  return c.html(layout(searchPage(results, sq, genre, allGenres, user), "Films — CineLog", user));
});

app.get("/films/:id", (c) => {
  const movie = getMovie(c.req.param("id"));
  if (!movie) return c.notFound();
  const user = getCurrentUser(c);

  const allEntries = q(`
    SELECT de.*, u.username, u.display_name, u.avatar_color
    FROM diary_entries de JOIN users u ON de.user_id = u.id
    WHERE de.movie_id = ? AND de.review != ''
    ORDER BY de.created_at DESC LIMIT 10
  `).all(movie.id) as any[];

  const ratingDist = q(`
    SELECT rating, COUNT(*) as count FROM diary_entries
    WHERE movie_id = ? GROUP BY rating ORDER BY rating
  `).all(movie.id) as any[];

  const totalRatings = ratingDist.reduce((s: number, r: any) => s + Number(r.count), 0);
  const avgRating = totalRatings > 0
    ? ratingDist.reduce((s: number, r: any) => s + Number(r.rating) * Number(r.count), 0) / totalRatings
    : movie.avgRating;

  let userEntry = null;
  let inWatchlist = false;
  if (user) {
    userEntry = q("SELECT * FROM diary_entries WHERE user_id = ? AND movie_id = ?").get(user.id, movie.id) as any;
    inWatchlist = !!(q("SELECT id FROM watchlist WHERE user_id = ? AND movie_id = ?").get(user.id, movie.id) as any);
  }

  return c.html(layout(moviePage(movie, allEntries, ratingDist, avgRating, totalRatings, userEntry, inWatchlist, user), `${movie.title} — CineLog`, user));
});

app.post("/films/:id/log", async (c) => {
  const sessionId = getSessionId(c);
  const user = getCurrentUser(c);
  if (!user) return c.redirect("/login");
  const movie = getMovie(c.req.param("id"));
  if (!movie) return c.notFound();

  const form = await c.req.formData();
  const rating = form.get("rating") ? parseInt(form.get("rating") as string) : null;
  const review = (form.get("review") as string || "").trim();
  const liked = form.get("liked") === "1" ? 1 : 0;
  const watchedDate = form.get("watched_date") as string || new Date().toISOString().split("T")[0];

  q(`
    INSERT INTO diary_entries (user_id, movie_id, rating, review, liked, watched_date)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, movie_id) DO UPDATE SET
      rating = excluded.rating, review = excluded.review,
      liked = excluded.liked, watched_date = excluded.watched_date
  `).run(user.id, movie.id, rating, review, liked, watchedDate);
  q("DELETE FROM watchlist WHERE user_id = ? AND movie_id = ?").run(user.id, movie.id);

  return c.redirect(withSession(sessionId, `/films/${movie.id}`));
});

app.post("/films/:id/watchlist", async (c) => {
  const sessionId = getSessionId(c);
  const user = getCurrentUser(c);
  if (!user) return c.redirect("/login");
  const form = await c.req.formData();
  const movieId = c.req.param("id");
  if (form.get("action") === "add") {
    q("INSERT OR IGNORE INTO watchlist (user_id, movie_id) VALUES (?, ?)").run(user.id, movieId);
  } else {
    q("DELETE FROM watchlist WHERE user_id = ? AND movie_id = ?").run(user.id, movieId);
  }
  return c.redirect(withSession(sessionId, `/films/${movieId}`));
});

app.get("/profile/:username", (c) => {
  const profileUser = q("SELECT * FROM users WHERE username = ?").get(c.req.param("username")) as any;
  if (!profileUser) return c.notFound();
  const currentUser = getCurrentUser(c);

  const entries = q(`SELECT * FROM diary_entries WHERE user_id = ? ORDER BY watched_date DESC, created_at DESC`).all(profileUser.id) as any[];
  const stats = {
    films: entries.length,
    thisYear: entries.filter((e: any) => e.watched_date?.startsWith("2026")).length,
    liked: entries.filter((e: any) => e.liked).length,
    reviews: entries.filter((e: any) => e.review).length,
  };
  const followers = Number((q("SELECT COUNT(*) as c FROM follows WHERE following_id = ?").get(profileUser.id) as any).c);
  const following = Number((q("SELECT COUNT(*) as c FROM follows WHERE follower_id = ?").get(profileUser.id) as any).c);
  const isFollowing = currentUser
    ? !!(q("SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?").get(currentUser.id, profileUser.id) as any)
    : false;

  return c.html(layout(
    profilePage(profileUser, currentUser, entries.slice(0, 8), entries.filter((e: any) => e.liked).slice(0, 4), stats, followers, following, isFollowing),
    `${profileUser.display_name} — CineLog`, currentUser
  ));
});

app.post("/profile/:username/follow", async (c) => {
  const sessionId = getSessionId(c);
  const user = getCurrentUser(c);
  if (!user) return c.redirect("/login");
  const profileUser = q("SELECT * FROM users WHERE username = ?").get(c.req.param("username")) as any;
  if (!profileUser || profileUser.id === user.id) return c.redirect(withSession(sessionId, `/profile/${c.req.param("username")}`));
  const form = await c.req.formData();
  if (form.get("action") === "follow") {
    q("INSERT OR IGNORE INTO follows (follower_id, following_id) VALUES (?, ?)").run(user.id, profileUser.id);
  } else {
    q("DELETE FROM follows WHERE follower_id = ? AND following_id = ?").run(user.id, profileUser.id);
  }
  return c.redirect(withSession(sessionId, `/profile/${profileUser.username}`));
});

app.get("/diary", (c) => {
  const user = getCurrentUser(c);
  if (!user) return c.redirect("/login");
  const entries = q(`SELECT * FROM diary_entries WHERE user_id = ? ORDER BY watched_date DESC, created_at DESC`).all(user.id) as any[];
  return c.html(layout(diaryPage(user, entries), "My Diary — CineLog", user));
});

app.get("/watchlist", (c) => {
  const user = getCurrentUser(c);
  if (!user) return c.redirect("/login");
  const items = q(`SELECT * FROM watchlist WHERE user_id = ? ORDER BY added_at DESC`).all(user.id) as any[];
  return c.html(layout(watchlistPage(user, items), "My Watchlist — CineLog", user));
});

app.get("/lists", (c) => {
  const user = getCurrentUser(c);
  if (!user) return c.redirect("/login");
  const userLists = q(`
    SELECT l.*, COUNT(lm.movie_id) as movie_count FROM lists l
    LEFT JOIN list_movies lm ON l.id = lm.list_id
    WHERE l.user_id = ? GROUP BY l.id ORDER BY l.created_at DESC
  `).all(user.id) as any[];
  for (const list of userLists) {
    const items = q(`SELECT movie_id FROM list_movies WHERE list_id = ? ORDER BY position LIMIT 4`).all(list.id) as any[];
    list.preview_movies = items.map((i: any) => MOVIE_MAP.get(i.movie_id)).filter(Boolean);
  }
  return c.html(layout(listsPage(user, userLists), "My Lists — CineLog", user));
});

app.post("/lists", async (c) => {
  const sessionId = getSessionId(c);
  const user = getCurrentUser(c);
  if (!user) return c.redirect("/login");
  const form = await c.req.formData();
  const name = (form.get("name") as string || "").trim();
  const description = (form.get("description") as string || "").trim();
  if (name) q("INSERT INTO lists (user_id, name, description) VALUES (?, ?, ?)").run(user.id, name, description);
  return c.redirect(withSession(sessionId, "/lists"));
});

const port = Number(process.env.PORT) || 3000;
serve({ fetch: app.fetch, port, hostname: "0.0.0.0" });
console.log(`CineLog running on http://0.0.0.0:${port}`);
