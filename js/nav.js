// Shared nav + footer injection so every page stays in sync.
(function () {
  const NAV_HTML = `
    <nav class="site-nav">
      <div class="container">
        <a href="/" class="brand">
          <img src="/images/logo-circle.png" alt="logo" />
          <span>prototypesandprogramming</span>
        </a>
        <button class="nav-toggle" aria-label="Toggle navigation" id="navToggle">
          <span></span><span></span><span></span>
        </button>
        <ul class="nav-links" id="navLinks">
          <li><a href="/" data-page="home">Home</a></li>
          <li><a href="/projects.html" data-page="projects">Projects</a></li>
          <li><a href="/blog.html" data-page="blog">Blog</a></li>
          <li><a href="/about.html" data-page="about">About</a></li>
        </ul>
      </div>
    </nav>
  `;

  const FOOTER_HTML = `
    <footer>
      <div class="container">
        <span>&copy; ${new Date().getFullYear()} Nathanael Oliver &mdash; prototypesandprogramming.com</span>
        <span>
          <a href="https://github.com/NathanaelOliver" target="_blank" rel="noopener noreferrer">GitHub</a>
          &nbsp;&middot;&nbsp;
          <a href="https://www.linkedin.com/in/nathanael-oliver-034bb220b/" target="_blank" rel="noopener noreferrer">LinkedIn</a>
        </span>
      </div>
    </footer>
  `;

  document.addEventListener("DOMContentLoaded", () => {
    const navMount = document.getElementById("site-nav");
    const footerMount = document.getElementById("site-footer");
    if (navMount) navMount.innerHTML = NAV_HTML;
    if (footerMount) footerMount.innerHTML = FOOTER_HTML;

    const toggle = document.getElementById("navToggle");
    const links = document.getElementById("navLinks");
    if (toggle && links) {
      toggle.addEventListener("click", () => links.classList.toggle("open"));
    }

    const page = document.body.dataset.page;
    if (page) {
      const active = document.querySelector(`.nav-links a[data-page="${page}"]`);
      if (active) active.classList.add("active");
    }
  });
})();
