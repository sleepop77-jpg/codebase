#!/usr/bin/env bash
set -euo pipefail

# Run: bash setup.sh
# Creates separate index.html, styles.css, and app.js files in the current directory.

cat > index.html <<'VIBE_EOF_HTML'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Coding Workspace</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <header class="topbar">
    <div class="brand">Coding Workspace</div>
    <div class="actions">
      <button id="new-file" type="button">New File</button>
      <button id="save" type="button">Save</button>
      <button id="run" type="button">Run</button>
      <button id="reset" type="button">Reset</button>
    </div>
  </header>

  <main class="workspace">
    <aside class="sidebar">
      <div class="pane-header">Files</div>
      <ul id="file-list" class="file-list"></ul>
    </aside>

    <section class="editor-pane">
      <div class="pane-header">
        <span id="current-file">index.html</span>
      </div>
      <textarea
        id="editor"
        spellcheck="false"
        autocapitalize="off"
        autocomplete="off"
        autocorrect="off"
        wrap="off"
      ></textarea>
    </section>

    <section class="preview-pane">
      <div class="pane-header">Preview</div>
      <iframe
        id="preview"
        title="Workspace preview"
        sandbox="allow-scripts allow-forms allow-modals allow-popups"
      ></iframe>
    </section>
  </main>

  <footer class="statusbar">
    <span id="status-file">index.html</span>
    <span id="status-position">Ln 1, Col 1</span>
    <span id="status-message">Ready</span>
  </footer>

  <script src="app.js"></script>
</body>
</html>
VIBE_EOF_HTML

cat > styles.css <<'VIBE_EOF_CSS'
:root {
  color-scheme: dark;
  --bg: #0f1115;
  --panel: #151821;
  --panel-alt: #10131a;
  --border: #2a3040;
  --text: #e8edf7;
  --muted: #9aa7bf;
  --accent: #4f8cff;
  --accent-border: #77a7ff;
  --danger: #b34552;
}

* {
  box-sizing: border-box;
}

html,
body {
  height: 100%;
}

body {
  margin: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: var(--bg);
  color: var(--text);
  font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  background: var(--panel);
}

.brand {
  font-size: 16px;
  font-weight: 650;
  letter-spacing: 0.2px;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

button {
  appearance: none;
  border: 1px solid var(--border);
  background: #1a2030;
  color: var(--text);
  border-radius: 8px;
  padding: 9px 12px;
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}

button:hover {
  border-color: var(--accent-border);
  background: #20283b;
}

button:active {
  transform: translateY(1px);
}

.workspace {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 230px minmax(0, 1fr) minmax(0, 1fr);
}

.sidebar,
.editor-pane,
.preview-pane {
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.sidebar {
  background: var(--panel);
  border-right: 1px solid var(--border);
}

.editor-pane {
  background: var(--panel-alt);
  border-right: 1px solid var(--border);
}

.preview-pane {
  background: var(--panel);
}

.pane-header {
  padding: 10px 12px;
  border-bottom: 1px solid var(--border);
  color: var(--muted);
  font-size: 13px;
  background: var(--panel);
}

.file-list {
  list-style: none;
  margin: 0;
  padding: 8px;
  overflow: auto;
}

.file-item {
  margin: 0 0 4px;
}

.file-button {
  width: 100%;
  text-align: left;
  padding: 8px 10px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--text);
  border-radius: 8px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 13px;
}

.file-button:hover {
  background: #1b2030;
  border-color: var(--border);
}

.file-button.active {
  background: #1d2739;
  border-color: var(--accent);
  color: #ffffff;
}

#editor {
  flex: 1;
  width: 100%;
  border: 0;
  outline: none;
  resize: none;
  padding: 14px;
  background: var(--panel-alt);
  color: var(--text);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 14px;
  line-height: 1.55;
  tab-size: 2;
}

#preview {
  flex: 1;
  width: 100%;
  border: 0;
  background: #ffffff;
}

.statusbar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px 12px;
  border-top: 1px solid var(--border);
  background: var(--panel);
  color: var(--muted);
  font-size: 12px;
}

#status-message {
  margin-left: auto;
}

@media (max-width: 960px) {
  .workspace {
    grid-template-columns: 1fr;
    grid-template-rows: 180px minmax(0, 1fr) minmax(0, 1fr);
  }

  .sidebar {
    border-right: 0;
    border-bottom: 1px solid var(--border);
  }

  .editor-pane {
    border-right: 0;
    border-bottom: 1px solid var(--border);
  }
}
VIBE_EOF_CSS

cat > app.js <<'VIBE_EOF_JS'
(() => {
  'use strict';

  const STORAGE_KEY = 'coding-workspace-v1';

  const DEFAULT_FILES = {
    'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Workspace Preview</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <main class="panel">
    <h1>Coding Workspace</h1>
    <p>Edit files on the left, then choose Run to refresh this preview.</p>
    <button id="demo-action" type="button">Increment count</button>
    <output id="demo-output">0</output>
  </main>
  <script src="script.js"></script>
</body>
</html>
`,
    'styles.css': `:root {
  color-scheme: dark;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100vh;
  display: grid;
  place-items: center;
  font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  background: #111827;
  color: #f9fafb;
}

.panel {
  display: grid;
  gap: 12px;
  justify-items: start;
  min-width: 280px;
  padding: 32px;
  border: 1px solid #374151;
  border-radius: 12px;
  background: #1f2937;
}

h1 {
  margin: 0;
  font-size: 28px;
}

p {
  margin: 0;
  color: #d1d5db;
}

button {
  appearance: none;
  border: 1px solid #4b5563;
  border-radius: 8px;
  padding: 10px 14px;
  font: inherit;
  background: #2563eb;
  color: #ffffff;
  cursor: pointer;
}

button:hover {
  background: #1d4ed8;
}

output {
  font-size: 20px;
  font-variant-numeric: tabular-nums;
  color: #93c5fd;
}
`,
    'script.js': `let count = 0;

const button = document.getElementById('demo-action');
const output = document.getElementById('demo-output');

if (button && output) {
  button.addEventListener('click', function () {
    count += 1;
    output.textContent = String(count);
  });
}
`
  };

  const fileList = document.getElementById('file-list');
  const editor = document.getElementById('editor');
  const preview = document.getElementById('preview');
  const currentFile = document.getElementById('current-file');
  const statusFile = document.getElementById('status-file');
  const statusPosition = document.getElementById('status-position');
  const statusMessage = document.getElementById('status-message');
  const newFileButton = document.getElementById('new-file');
  const saveButton = document.getElementById('save');
  const runButton = document.getElementById('run');
  const resetButton = document.getElementById('reset');

  if (!fileList || !editor || !preview) {
    return;
  }

  let state = loadState();
  let files = state.files;
  let activeFile = state.activeFile;
  let previewUrls = [];
  let statusTimer = 0;

  function defaultState() {
    return {
      files: Object.assign({}, DEFAULT_FILES),
      activeFile: 'index.html'
    };
  }

  function loadState() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return defaultState();
      }

      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed.files !== 'object' || Array.isArray(parsed.files)) {
        return defaultState();
      }

      const loadedFiles = {};
      for (const [name, value] of Object.entries(parsed.files)) {
        if (typeof name === 'string' && name.trim()) {
          loadedFiles[name] = typeof value === 'string' ? value : String(value ?? '');
        }
      }

      if (Object.keys(loadedFiles).length === 0) {
        return defaultState();
      }

      const loadedActiveFile =
        typeof parsed.activeFile === 'string' && loadedFiles[parsed.activeFile] !== undefined
          ? parsed.activeFile
          : Object.keys(loadedFiles)[0];

      return {
        files: loadedFiles,
        activeFile: loadedActiveFile
      };
    } catch (error) {
      return defaultState();
    }
  }

  function saveState() {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          files,
          activeFile
        })
      );
    } catch (error) {
      setStatus('Storage unavailable');
    }
  }

  function setStatus(message) {
    if (!statusMessage) {
      return;
    }

    statusMessage.textContent = message;
    window.clearTimeout(statusTimer);
    statusTimer = window.setTimeout(() => {
      statusMessage.textContent = 'Ready';
    }, 2500);
  }

  function renderFileList() {
    fileList.innerHTML = '';

    const names = Object.keys(files).sort();
    for (const name of names) {
      const item = document.createElement('li');
      item.className = 'file-item';

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'file-button' + (name === activeFile ? ' active' : '');
      button.textContent = name;
      button.addEventListener('click', () => {
        openFile(name);
      });

      item.appendChild(button);
      fileList.appendChild(item);
    }
  }

  function openFile(name) {
    if (files[name] === undefined) {
      return;
    }

    activeFile = name;
    editor.value = String(files[name] ?? '');

    if (currentFile) {
      currentFile.textContent = name;
    }

    renderFileList();
    updateStatus();
    saveState();
    editor.focus();
  }

  function updateStatus() {
    const value = editor.value;
    const position = editor.selectionStart || 0;
    const before = value.slice(0, position);
    const lines = before.split('\n');
    const line = lines.length;
    const col = lines[lines.length - 1].length + 1;

    if (statusFile) {
      statusFile.textContent = activeFile;
    }

    if (statusPosition) {
      statusPosition.textContent = `Ln ${line}, Col ${col}, ${value.length} chars`;
    }
  }

  function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function getMimeType(path) {
    const lower = path.toLowerCase();

    if (lower.endsWith('.html') || lower.endsWith('.htm')) {
      return 'text/html';
    }

    if (lower.endsWith('.css')) {
      return 'text/css';
    }

    if (lower.endsWith('.js') || lower.endsWith('.mjs')) {
      return 'text/javascript';
    }

    if (lower.endsWith('.json')) {
      return 'application/json';
    }

    if (lower.endsWith('.svg')) {
      return 'image/svg+xml';
    }

    if (lower.endsWith('.txt')) {
      return 'text/plain';
    }

    return 'text/plain';
  }

  function clearPreviewUrls() {
    const oldUrls = previewUrls;
    previewUrls = [];

    if (oldUrls.length) {
      window.setTimeout(() => {
        oldUrls.forEach((url) => {
          URL.revokeObjectURL(url);
        });
      }, 1000);
    }
  }

  function buildPreview() {
    clearPreviewUrls();

    const htmlFile =
      Object.keys(files).find((name) => name === 'index.html') ||
      Object.keys(files).find((name) => name.toLowerCase().endsWith('.html'));

    if (!htmlFile) {
      preview.removeAttribute('src');
      preview.srcdoc = '<!doctype html><html><body><p>No HTML file found.</p></body></html>';
      return;
    }

    const urls = {};

    for (const [name, content] of Object.entries(files)) {
      const blob = new Blob([String(content ?? '')], {
        type: getMimeType(name)
      });
      urls[name] = URL.createObjectURL(blob);
      previewUrls.push(urls[name]);
    }

    let html = String(files[htmlFile] ?? '');

    for (const [name, url] of Object.entries(urls)) {
      if (name === htmlFile) {
        continue;
      }

      const escaped = escapeRegExp(name);
      const pattern = new RegExp(
        '(href|src)\\s*=\\s*["\'](?:\\./)?' + escaped + '["\']',
        'gi'
      );

      html = html.replace(pattern, (match, attr) => {
        return attr + '="' + url + '"';
      });
    }

    const htmlBlob = new Blob([html], {
      type: 'text/html'
    });
    const htmlUrl = URL.createObjectURL(htmlBlob);
    previewUrls.push(htmlUrl);

    preview.removeAttribute('srcdoc');
    preview.src = htmlUrl;
  }

  function createFile() {
    const requestedName = window.prompt('Enter a file name:', 'script.js');
    if (requestedName === null) {
      return;
    }

    const name = requestedName.trim();
    if (!name) {
      setStatus('File name is required');
      return;
    }

    if (files[name] !== undefined) {
      setStatus('File already exists');
      return;
    }

    files[name] = '';
    activeFile = name;
    saveState();
    renderFileList();
    openFile(name);
    setStatus('Created ' + name);
  }

  function resetWorkspace() {
    const confirmed = window.confirm('Reset all files to defaults? This cannot be undone.');
    if (!confirmed) {
      return;
    }

    files = Object.assign({}, DEFAULT_FILES);
    activeFile = 'index.html';
    saveState();
    renderFileList();
    openFile(activeFile);
    buildPreview();
    setStatus('Workspace reset');
  }

  editor.addEventListener('input', () => {
    files[activeFile] = editor.value;
    saveState();
    updateStatus();
  });

  editor.addEventListener('keyup', updateStatus);
  editor.addEventListener('click', updateStatus);

  editor.addEventListener('keydown', (event) => {
    if (event.key !== 'Tab') {
      return;
    }

    event.preventDefault();
    const start = editor.selectionStart;
    const end = editor.selectionEnd;

    editor.setRangeText('  ', start, end, 'end');
    files[activeFile] = editor.value;
    saveState();
    updateStatus();
  });

  if (newFileButton) {
    newFileButton.addEventListener('click', createFile);
  }

  if (saveButton) {
    saveButton.addEventListener('click', () => {
      saveState();
      setStatus('Saved');
    });
  }

  if (runButton) {
    runButton.addEventListener('click', () => {
      buildPreview();
      setStatus('Preview updated');
    });
  }

  if (resetButton) {
    resetButton.addEventListener('click', resetWorkspace);
  }

  renderFileList();
  openFile(activeFile);
  buildPreview();
})();
VIBE_EOF_JS