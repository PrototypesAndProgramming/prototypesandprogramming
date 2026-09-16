# prototypesandprogramming.com

Your personal site: home page, projects, and a blog you publish to just by
adding markdown files. Plain HTML/CSS/JS — no build step, no framework.

**Status:** this is already pushed to
[github.com/PrototypesAndProgramming/prototypesandprogramming](https://github.com/PrototypesAndProgramming/prototypesandprogramming)
on the `main` branch, and GitHub Pages is turned on with the custom domain
set to `prototypesandprogramming.com`. `js/config.js` is already pointed at
that repo. The only thing left is pointing your domain's DNS at GitHub Pages
(step below) — do that and the site goes live.

To make future changes, clone the repo and push commits as normal:

```bash
git clone https://github.com/PrototypesAndProgramming/prototypesandprogramming.git
```

## 1. Point your domain at GitHub Pages (in Sav's DNS settings)

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
| CNAME | www  | `prototypesandprogramming.github.io` |

DNS changes can take anywhere from a few minutes to a few hours to
propagate. Once they do, `prototypesandprogramming.com` will serve this
site directly from GitHub Pages, for free.

## 2. Publishing a new blog post

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

## 3. Adding a project

Open `js/projects-data.js` and add an object to the `PROJECTS` array —
title, image, tags, description, and an optional link. The projects page
and the homepage's "featured" section both render from this one file.

## 4. Editing your info

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
