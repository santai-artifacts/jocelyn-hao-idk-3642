import { Hono } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import db from "./db";
import { MOVIES, MOVIE_MAP, searchMovies, getMovie, starsFromRating } from "./movies";
import { layout, homePage, moviePage, profilePage, diaryPage, watchlistPage, listsPage, searchPage, loginPage } from "./templates";

const app = new Hono();

// ─── Auth helpers ───────────────────────────────────────────────────────────

function getCurrentUser(c: any) {
  const sessionId = getCookie(c, "session");
  if (!sessionId) return null;
  const session = db.query("SELECT user_id FROM sessions WHERE id = ?").get(sessionId) as any;
  if (!session) return null;
  return db.query("SELECT * FROM users WHERE id = ?").get(session.user_id) as any;
}

function requireAuth(c: any) {
  const user = getCurrentUser(c);
  if (!user) return c.redirect("/login");
  return user;
}

// ─── Routes ─────────────────────────────────────────────────────────────────

app.get("/", (c) => {
  const user = getCurrentUser(c);
  const recentEntries = db.query(`
    SELECT de.*, u.username, u.display_name, u.avatar_color
    FROM diary_entries de
    JOIN users u ON de.user_id = u.id
    ORDER BY de.created_at DESC
    LIMIT 20
  `).all() as any[];

  const popularMovies = MOVIES.slice(0, 12);
  return c.html(layout(homePage(user, popularMovies, recentEntries), "CineLog — Track your film life", user));
});

app.get("/login", (c) => {
  const user = getCurrentUser(c);
  if (user) return c.redirect("/");
  return c.html(layout(loginPage(), "Sign In — CineLog", null));
});

app.post("/login", async (c) => {
  const form = await c.req.formData();
  const username = form.get("username") as string;

  if (!username || username.length < 2) {
    return c.html(layout(loginPage("Username must be at least 2 characters"), "Sign In — CineLog", null));
  }

  let user = db.query("SELECT * FROM users WHERE username = ?").get(username.toLowerCase()) as any;
  if (!user) {
    const colors = ['#14b8a6', '#8b5cf6', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899'];
    const color = colors[Math.floor(username.length % colors.length)];
    db.query("INSERT INTO users (username, display_name, avatar_color) VALUES (?, ?, ?)").run(
      username.toLowerCase(), username, color
    );
    user = db.query("SELECT * FROM users WHERE username = ?").get(username.toLowerCase()) as any;
  }

  const sessionId = crypto.randomUUID();
  db.query("INSERT INTO sessions (id, user_id) VALUES (?, ?)").run(sessionId, user.id);
  setCookie(c, "session", sessionId, { path: "/", maxAge: 60 * 60 * 24 * 30 });
  return c.redirect("/");
});

app.post("/logout", (c) => {
  const sessionId = getCookie(c, "session");
  if (sessionId) db.query("DELETE FROM sessions WHERE id = ?").run(sessionId);
  deleteCookie(c, "session");
  return c.redirect("/");
});

app.get("/films", (c) => {
  const q = c.req.query("q") || "";
  const genre = c.req.query("genre") || "";
  const user = getCurrentUser(c);
  let results = q ? searchMovies(q) : MOVIES;
  if (genre) results = results.filter(m => m.genres.includes(genre));
  const allGenres = [...new Set(MOVIES.flatMap(m => m.genres))].sort();
  return c.html(layout(searchPage(results, q, genre, allGenres, user), `Films — CineLog`, user));
});

app.get("/films/:id", (c) => {
  const movie = getMovie(c.req.param("id"));
  if (!movie) return c.notFound();
  const user = getCurrentUser(c);

  const allEntries = db.query(`
    SELECT de.*, u.username, u.display_name, u.avatar_color
    FROM diary_entries de
    JOIN users u ON de.user_id = u.id
    WHERE de.movie_id = ? AND de.review != ''
    ORDER BY de.created_at DESC
    LIMIT 10
  `).all(movie.id) as any[];

  const ratingDist = db.query(`
    SELECT rating, COUNT(*) as count FROM diary_entries
    WHERE movie_id = ? GROUP BY rating ORDER BY rating
  `).all(movie.id) as any[];

  const totalRatings = ratingDist.reduce((s: number, r: any) => s + r.count, 0);
  const avgRating = totalRatings > 0
    ? ratingDist.reduce((s: number, r: any) => s + r.rating * r.count, 0) / totalRatings
    : movie.avgRating;

  let userEntry = null;
  let inWatchlist = false;
  if (user) {
    userEntry = db.query("SELECT * FROM diary_entries WHERE user_id = ? AND movie_id = ?").get(user.id, movie.id) as any;
    inWatchlist = !!(db.query("SELECT id FROM watchlist WHERE user_id = ? AND movie_id = ?").get(user.id, movie.id) as any);
  }

  return c.html(layout(moviePage(movie, allEntries, ratingDist, avgRating, totalRatings, userEntry, inWatchlist, user), `${movie.title} — CineLog`, user));
});

app.post("/films/:id/log", async (c) => {
  const user = getCurrentUser(c);
  if (!user) return c.redirect("/login");
  const movie = getMovie(c.req.param("id"));
  if (!movie) return c.notFound();

  const form = await c.req.formData();
  const rating = parseInt(form.get("rating") as string) || null;
  const review = (form.get("review") as string || "").trim();
  const liked = form.get("liked") === "1" ? 1 : 0;
  const watchedDate = form.get("watched_date") as string || new Date().toISOString().split("T")[0];

  db.query(`
    INSERT INTO diary_entries (user_id, movie_id, rating, review, liked, watched_date)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, movie_id) DO UPDATE SET
      rating = excluded.rating,
      review = excluded.review,
      liked = excluded.liked,
      watched_date = excluded.watched_date
  `).run(user.id, movie.id, rating, review, liked, watchedDate);

  // Remove from watchlist if logged
  db.query("DELETE FROM watchlist WHERE user_id = ? AND movie_id = ?").run(user.id, movie.id);

  return c.redirect(`/films/${movie.id}`);
});

app.post("/films/:id/watchlist", async (c) => {
  const user = getCurrentUser(c);
  if (!user) return c.redirect("/login");
  const form = await c.req.formData();
  const action = form.get("action") as string;
  const movieId = c.req.param("id");

  if (action === "add") {
    db.query("INSERT OR IGNORE INTO watchlist (user_id, movie_id) VALUES (?, ?)").run(user.id, movieId);
  } else {
    db.query("DELETE FROM watchlist WHERE user_id = ? AND movie_id = ?").run(user.id, movieId);
  }
  return c.redirect(`/films/${movieId}`);
});

app.get("/profile/:username", (c) => {
  const username = c.req.param("username");
  const profileUser = db.query("SELECT * FROM users WHERE username = ?").get(username) as any;
  if (!profileUser) return c.notFound();

  const currentUser = getCurrentUser(c);

  const entries = db.query(`
    SELECT * FROM diary_entries WHERE user_id = ? ORDER BY watched_date DESC, created_at DESC
  `).all(profileUser.id) as any[];

  const stats = {
    films: entries.length,
    thisYear: entries.filter((e: any) => e.watched_date?.startsWith("2026")).length,
    liked: entries.filter((e: any) => e.liked).length,
    reviews: entries.filter((e: any) => e.review).length,
  };

  const followers = db.query("SELECT COUNT(*) as c FROM follows WHERE following_id = ?").get(profileUser.id) as any;
  const following = db.query("SELECT COUNT(*) as c FROM follows WHERE follower_id = ?").get(profileUser.id) as any;
  const isFollowing = currentUser
    ? !!(db.query("SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?").get(currentUser.id, profileUser.id) as any)
    : false;

  const recentEntries = entries.slice(0, 8);
  const likedMovies = entries.filter((e: any) => e.liked).slice(0, 4);

  return c.html(layout(
    profilePage(profileUser, currentUser, recentEntries, likedMovies, stats, followers.c, following.c, isFollowing),
    `${profileUser.display_name} — CineLog`, currentUser
  ));
});

app.post("/profile/:username/follow", async (c) => {
  const user = getCurrentUser(c);
  if (!user) return c.redirect("/login");
  const profileUser = db.query("SELECT * FROM users WHERE username = ?").get(c.req.param("username")) as any;
  if (!profileUser || profileUser.id === user.id) return c.redirect(`/profile/${c.req.param("username")}`);

  const form = await c.req.formData();
  const action = form.get("action") as string;
  if (action === "follow") {
    db.query("INSERT OR IGNORE INTO follows (follower_id, following_id) VALUES (?, ?)").run(user.id, profileUser.id);
  } else {
    db.query("DELETE FROM follows WHERE follower_id = ? AND following_id = ?").run(user.id, profileUser.id);
  }
  return c.redirect(`/profile/${profileUser.username}`);
});

app.get("/diary", (c) => {
  const user = getCurrentUser(c);
  if (!user) return c.redirect("/login");
  const entries = db.query(`
    SELECT * FROM diary_entries WHERE user_id = ? ORDER BY watched_date DESC, created_at DESC
  `).all(user.id) as any[];
  return c.html(layout(diaryPage(user, entries), "My Diary — CineLog", user));
});

app.get("/watchlist", (c) => {
  const user = getCurrentUser(c);
  if (!user) return c.redirect("/login");
  const items = db.query(`
    SELECT * FROM watchlist WHERE user_id = ? ORDER BY added_at DESC
  `).all(user.id) as any[];
  return c.html(layout(watchlistPage(user, items), "My Watchlist — CineLog", user));
});

app.get("/lists", (c) => {
  const user = getCurrentUser(c);
  if (!user) return c.redirect("/login");
  const userLists = db.query(`
    SELECT l.*, COUNT(lm.movie_id) as movie_count
    FROM lists l
    LEFT JOIN list_movies lm ON l.id = lm.list_id
    WHERE l.user_id = ?
    GROUP BY l.id
    ORDER BY l.created_at DESC
  `).all(user.id) as any[];

  for (const list of userLists) {
    const items = db.query(`
      SELECT movie_id FROM list_movies WHERE list_id = ? ORDER BY position LIMIT 4
    `).all(list.id) as any[];
    list.preview_movies = items.map((i: any) => MOVIE_MAP.get(i.movie_id)).filter(Boolean);
  }

  return c.html(layout(listsPage(user, userLists), "My Lists — CineLog", user));
});

app.post("/lists", async (c) => {
  const user = getCurrentUser(c);
  if (!user) return c.redirect("/login");
  const form = await c.req.formData();
  const name = (form.get("name") as string || "").trim();
  const description = (form.get("description") as string || "").trim();
  if (name) {
    db.query("INSERT INTO lists (user_id, name, description) VALUES (?, ?, ?)").run(user.id, name, description);
  }
  return c.redirect("/lists");
});

// API for dynamic rating display
app.get("/api/movie/:id/stats", (c) => {
  const movieId = c.req.param("id");
  const movie = getMovie(movieId);
  if (!movie) return c.json({ error: "not found" }, 404);

  const rows = db.query(`
    SELECT rating, COUNT(*) as count FROM diary_entries
    WHERE movie_id = ? AND rating IS NOT NULL GROUP BY rating
  `).all(movieId) as any[];

  const total = rows.reduce((s: number, r: any) => s + r.count, 0) + movie.ratingsCount;
  const userSum = rows.reduce((s: number, r: any) => s + r.rating * r.count, 0);
  const avg = total > 0
    ? (userSum + movie.avgRating * movie.ratingsCount) / total
    : movie.avgRating;

  return c.json({ avgRating: Math.round(avg * 10) / 10, totalRatings: total, distribution: rows });
});

export default { port: process.env.PORT || 3000, fetch: app.fetch };
