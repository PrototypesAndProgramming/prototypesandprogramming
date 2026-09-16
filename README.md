# prototypesandprogramming.com

Your personal site: home page, projects, and a blog you publish to just by
adding markdown files. Plain HTML/CSS/JS — no build step, no framework.

## 1. Put this on GitHub

1. Create a new **public** repo on GitHub (e.g. `prototypesandprogramming`).
2. Push everything in this folder to that repo's `main` branch.
3. Open `js/config.js` and set `githubUser` / `githubRepo` / `githubBranch`
   to match the repo you just created. This is what lets the blog page find
   your posts automatically.

```bash
git init
git add .
git commit -m "Initial site"
git branch -M main
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

## 2. Turn on GitHub Pages

1. In the repo, go to **Settings → Pages**.
2. Under "Build and deployment", set **Source** to `Deploy from a branch`,
   branch `main`, folder `/ (root)`. Save.
3. Under "Custom domain", enter `prototypesandprogramming.com` and save.
   (There's already a `CNAME` file in this repo with that domain in it,
   which is what makes this work.)
4. Check "Enforce HTTPS" once it becomes available (can take a few minutes
   to an hour after DNS is set up).

## 3. Point your domain at GitHub Pages (in Sav's DNS settings)

In Sav, open DNS management for `prototypesandprogramming.com` and add:

**For the root domain (`prototypesandprogramming.com`)** — four A records
pointing at GitHub Pages' IPs:

| Type | Host | Value            |
|------|------|------------------|
| A    | @    | 185.199.108.153  |
| A    | @    | 185.199.109.153  |
| A    | @    | 185.199.110.153  |
| A    | @    | 185.199.111.153  |

**For `www.prototypesandprogramming.com`** (optional, if you want that to
work too) — a CNAME record:

| Type  | Host | Value                    |
|-------|------|--------------------------|
| CNAME | www  | `<you>.github.io`        |

DNS changes can take anywhere from a few minutes to a few hours to
propagate. Once they do, `prototypesandprogramming.com` will serve this
site directly from GitHub Pages, for free.

## 4. Publishing a new blog post

1. Add a new file to `posts/`, named like `2026-10-01-my-post-title.md`.
2. Give it frontmatter + content:

   ```
   ---
   title: My Post Title
   date: 2026-10-01
   tags: [robotics, ai]
   excerpt: One sentence summary shown in the blog list.
   ---
   Your post, written in normal markdown.
   ```

3. Commit and push. That's it — the blog and home page both pick it up
   automatically the next time someone loads the site, no rebuild needed.

   (`posts/manifest.json` is only a fallback used if the GitHub API can't
   be reached — you don't need to touch it once `js/config.js` is set up
   correctly, but it's a handy way to test locally before you push.)

## 5. Adding a project

Open `js/projects-data.js` and add an object to the `PROJECTS` array —
title, image, tags, description, and an optional link. The projects page
and the homepage's "featured" section both render from this one file.

## 6. Editing your info

- `about.html` — bio, resume link, socials.
- `js/nav.js` — nav bar links and footer (name, GitHub/LinkedIn links).
- `css/style.css` — colors are defined as CSS variables at the top
  (`--navy`, `--sky`, `--red`, `--bg`, etc.) if you ever want to tweak the
  palette.

## Testing locally

Because the blog fetches files over HTTP, opening `index.html` directly
with `file://` won't load posts. Run a tiny local server instead from this
folder:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`. Locally (with no GitHub repo pushed
yet) it'll automatically fall back to `posts/manifest.json` to find posts.
