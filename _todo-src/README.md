# /todo — personal calendar + project tracker

React source for `prototypesandprogramming.com/todo`. Nothing on the main site
links here, and the page is marked `noindex`.

- `_todo-src/` — source (the leading underscore keeps GitHub Pages from serving it)
- `todo/` — built output that GitHub Pages serves. **Don't edit by hand.**

## Build

```bash
cd _todo-src
npm install
npm test        # repeat-pattern, tree and sync tests
npm run build   # writes ../todo
```

Commit both `_todo-src/` and `todo/`.

## Where the data lives

A file called `data.json` in a **private** repo (default `PrototypesAndProgramming/todo-data`),
read and written through the GitHub API with a fine-grained token that is stored only
in each browser you unlock it on. The public site holds no data at all.

"Lock / sign out" in Settings removes the token and the cached copy from that device.

## Data shape

```
events[]   { id, title, start "HH:MM", end, date, repeat{freq,interval,days[],until}, skip[],
             color, notes, children[] (sub-events: same shape, + days[] filter, no date/repeat),
             goals[] (deadline trees) }
projects[] { id, title, deadline, time, done, color, notes, children[] (ordered steps, same shape) }
```

Top-level items carry `updatedAt` so edits from phone and computer merge cleanly.
Settings → Export JSON gives you a full backup (and is the path to move the data into
a native app later).
