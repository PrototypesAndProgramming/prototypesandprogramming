// Tiny dependency-free markdown -> HTML renderer.
// Supports: headings, bold/italic, links, images, code (inline + fenced),
// blockquotes, unordered/ordered lists, paragraphs, hr, line breaks.
// Good enough for personal blog posts without pulling in a CDN library.
window.renderMarkdown = function renderMarkdown(md) {
  function escapeHtml(s) {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function inline(text) {
    text = escapeHtml(text);
    // images ![alt](src)
    text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2" loading="lazy">');
    // links [text](href)
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    // bold
    text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    // italic
    text = text.replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");
    // inline code
    text = text.replace(/`([^`]+)`/g, "<code>$1</code>");
    return text;
  }

  const lines = md.replace(/\r\n/g, "\n").split("\n");
  let html = "";
  let i = 0;
  let inList = null; // 'ul' | 'ol'
  let inCode = false;
  let codeBuf = [];
  let codeLang = "";

  function closeList() {
    if (inList) {
      html += `</${inList}>`;
      inList = null;
    }
  }

  while (i < lines.length) {
    const line = lines[i];

    // fenced code blocks
    if (/^```/.test(line)) {
      if (!inCode) {
        inCode = true;
        codeLang = line.replace(/^```/, "").trim();
        codeBuf = [];
      } else {
        inCode = false;
        html += `<pre><code class="lang-${escapeHtml(codeLang)}">${escapeHtml(codeBuf.join("\n"))}</code></pre>`;
      }
      i++;
      continue;
    }
    if (inCode) {
      codeBuf.push(line);
      i++;
      continue;
    }

    if (/^\s*$/.test(line)) {
      closeList();
      i++;
      continue;
    }

    // headings
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      closeList();
      const level = h[1].length;
      html += `<h${level}>${inline(h[2])}</h${level}>`;
      i++;
      continue;
    }

    // horizontal rule
    if (/^(-{3,}|\*{3,})\s*$/.test(line)) {
      closeList();
      html += "<hr>";
      i++;
      continue;
    }

    // blockquote
    if (/^>\s?/.test(line)) {
      closeList();
      const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      html += `<blockquote><p>${inline(buf.join(" "))}</p></blockquote>`;
      continue;
    }

    // unordered list
    if (/^\s*[-*+]\s+/.test(line)) {
      if (inList !== "ul") {
        closeList();
        html += "<ul>";
        inList = "ul";
      }
      html += `<li>${inline(line.replace(/^\s*[-*+]\s+/, ""))}</li>`;
      i++;
      continue;
    }

    // ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      if (inList !== "ol") {
        closeList();
        html += "<ol>";
        inList = "ol";
      }
      html += `<li>${inline(line.replace(/^\s*\d+\.\s+/, ""))}</li>`;
      i++;
      continue;
    }

    // paragraph (gather consecutive non-empty lines)
    closeList();
    const buf = [line];
    i++;
    while (
      i < lines.length &&
      !/^\s*$/.test(lines[i]) &&
      !/^#{1,4}\s+/.test(lines[i]) &&
      !/^```/.test(lines[i]) &&
      !/^\s*[-*+]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i]) &&
      !/^>\s?/.test(lines[i])
    ) {
      buf.push(lines[i]);
      i++;
    }
    html += `<p>${inline(buf.join(" "))}</p>`;
  }
  closeList();
  return html;
};

// Parses simple YAML-ish frontmatter:
// ---
// title: My Post
// date: 2026-09-16
// tags: [robotics, ai]
// excerpt: A short summary.
// ---
// body...
window.parseFrontmatter = function parseFrontmatter(raw) {
  const match = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
  if (!match) return { meta: {}, body: raw };
  const [, fmBlock, body] = match;
  const meta = {};
  fmBlock.split("\n").forEach((line) => {
    const m = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!m) return;
    let [, key, value] = m;
    value = value.trim();
    if (/^\[.*\]$/.test(value)) {
      meta[key] = value
        .slice(1, -1)
        .split(",")
        .map((s) => s.trim().replace(/^["']|["']$/g, ""))
        .filter(Boolean);
    } else {
      meta[key] = value.replace(/^["']|["']$/g, "");
    }
  });
  return { meta, body };
};
