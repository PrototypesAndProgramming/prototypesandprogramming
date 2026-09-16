// ============================================================
// BLOG ENGINE
// Lists and renders posts straight from the /posts folder.
// To add a post: drop a new .md file into /posts (see
// posts/2026-09-16-welcome-to-the-site.md for the format) and
// push it to GitHub. Nothing else needs to be edited — this
// script asks the GitHub API what's in the folder at load time.
// A local posts/manifest.json is used as a fallback when the
// GitHub API can't be reached (e.g. testing before you've pushed
// a repo, or you've hit the anonymous API rate limit).
// ============================================================

async function listPostFiles() {
  const { githubUser, githubRepo, githubBranch } = window.SITE_CONFIG || {};
  if (githubUser && githubRepo) {
    try {
      const res = await fetch(
        `https://api.github.com/repos/${githubUser}/${githubRepo}/contents/posts?ref=${githubBranch || "main"}`
      );
      if (res.ok) {
        const data = await res.json();
        const files = data
          .filter((f) => f.type === "file" && f.name.endsWith(".md"))
          .map((f) => ({ name: f.name, url: f.download_url }));
        if (files.length) return files;
      }
    } catch (e) {
      console.warn("GitHub API post listing failed, falling back to manifest.json", e);
    }
  }
  // Fallback: local manifest (used for local testing or if the API call fails)
  try {
    const res = await fetch("posts/manifest.json");
    if (res.ok) {
      const names = await res.json();
      return names.map((name) => ({ name, url: `posts/${name}` }));
    }
  } catch (e) {
    console.warn("manifest.json fallback also failed", e);
  }
  return [];
}

async function fetchPost(file) {
  const res = await fetch(file.url);
  const raw = await res.text();
  const { meta, body } = window.parseFrontmatter(raw);
  const slug = file.name.replace(/\.md$/, "");
  return {
    slug,
    title: meta.title || slug,
    date: meta.date || "",
    tags: meta.tags || [],
    excerpt: meta.excerpt || "",
    body,
  };
}

async function loadAllPosts() {
  const files = await listPostFiles();
  const posts = await Promise.all(files.map(fetchPost));
  posts.sort((a, b) => (a.date < b.date ? 1 : -1));
  return posts;
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

window.BlogEngine = { loadAllPosts, fetchPost, formatDate, listPostFiles };
