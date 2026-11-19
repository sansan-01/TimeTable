# Security and robustness audit

HTML_RESTYLE: alma.now 纸面等宽风 (status: pending owner-side aesthetic review).

| Severity | Location (path:line) | One-line risk | Fix applied |
| --- | --- | --- | --- |
| high | `index.html:44` | An unversioned CDN script could change without review and execute with the page's privileges. | Load the checked-in Marked build and set a script, object and base URI content security policy. |
| medium | `script.js:209` | Unsanitized Markdown could execute arbitrary JavaScript if a memo file were modified. | Parse into an inert template and rebuild allowed elements and attributes with validated link and image schemes. |
| medium | `script.js:149` | Course names and locations were interpreted as HTML, allowing script execution if a timetable file were modified. | Build the existing course markup with DOM nodes and assign values with `textContent`. |
| medium | `script.js:44`, `script.js:63` | A modified semester config could send a browser request outside the intended data directory. | Accept plain JSON filenames only and reject redirects when fetching data. |
| medium | `data/semester-23-24-1.json:4`, `data/semester-23-24-2.json:4`, `timetable.json:4`, `data/left.md:1` | Public static hosting exposes the timetable, including names and locations, and the memo files. | report-only — the requested content is preserved and hosting access controls are outside the repository. |
| low | `script.js:31`, `script.js:78` | HTTP errors, unexpected JSON shapes and malformed course rows could cause initialization or rendering failures. | Check HTTP status and response shape, validate numeric grid coordinates and skip malformed rows. |
| low | `script.js:57` | Rapid semester changes could show a stale response or leave the previous semester visible after a failed load. | Cancel superseded requests, discard late results and clear old courses on semester change. |
| low | `script.js:239` | Denied local storage or a saved semester that no longer exists could prevent a usable timetable from loading. | Handle storage errors and restore a saved semester only when it is still listed. |
| low | `script.js:91` | UTC boundaries could miscount local weeks, and clearing the date left stale courses visible. | Count local calendar days, including the start date in week one, and clear courses when there is no valid date. |
| low | `script.js:16` | Slow memo responses delayed the timetable and its controls. | Load memos independently of timetable initialization. |
| low | `style.css:22` | Fixed sidebar widths and inflexible controls could push the timetable off narrow viewports. | Stack the panels at narrow widths, wrap controls and keep horizontal scrolling within the grid. |
| low | `.gitignore:1` | Local credentials, editor state and generated artifacts could be added accidentally. | Ignore local environment files, common editor and OS artifacts, dependency directories and build output. |
| low | `marked.min.js:2` | The vendored Marked 15.0.12 is behind upstream major releases. | report-only — no reviewed XSS advisory was found that lists this version, and a major upgrade is outside this audit. [Upstream releases](https://github.com/markedjs/marked/releases) |
| low | `README.md:20`, `README.md:69` | The original run and deploy instructions omit assets and suggest opening the page directly from disk even though it fetches data over HTTP. | report-only — preserved the original README and documented serving the repository root over HTTP in the appended section. |

The credential scan found no suspected secrets in the tracked tree. The repository uses one vendored runtime dependency and has no package manager, lockfile, CI workflow or tracked binary build output. Marked documents that its output needs sanitizing. The reviewed data-URI XSS advisory applies to versions before 0.3.7, and the reviewed 2026 tokenizer advisory lists 18.0.0 through 18.0.1. [Marked documentation](https://marked.js.org/) · [XSS advisory](https://github.com/advisories/GHSA-7px7-7xjx-hxm8) · [Tokenizer advisory](https://github.com/advisories/GHSA-6v9c-7cg6-27q7)

Node checks covered both semesters, local storage fallback, week boundaries, HTTP failures, malformed data and overlapping requests using a DOM harness. The vendored parser produced the expected task list, quotation, list and link from the existing memos. The timetable and memo files match the original tracked versions.

## Preview verification

`docs/preview-alma.png` could not be generated. The requested Chromium command could not create its default profile. A retry with an explicit workspace profile found that the sandbox denies the loopback TCP socket required by `http.server`, and Chromium startup also failed on restricted socket operations. Visual browser verification remains pending.
Screenshot retaken by coordinator outside sandbox: docs/preview-alma.png (pending aesthetic review).
