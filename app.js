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
  color-scheme: light;
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
  background: #efe5c2;
  color: #3d3618;
}

.panel {
  display: grid;
  gap: 12px;
  justify-items: start;
  min-width: 280px;
  padding: 32px;
  border: 1px solid #c8b97e;
  border-radius: 12px;
  background: #f7f0d6;
  box-shadow: 0 12px 32px rgba(93, 78, 20, 0.18);
}

h1 {
  margin: 0;
  font-size: 28px;
  color: #6f5e0a;
}

p {
  margin: 0;
  color: #7c7040;
}

button {
  appearance: none;
  border: 1px solid #6f5e0a;
  border-radius: 8px;
  padding: 10px 14px;
  font: inherit;
  background: #b8860b;
  color: #ffffff;
  cursor: pointer;
}

button:hover {
  background: #9a7009;
}

output {
  font-size: 20px;
  font-variant-numeric: tabular-nums;
  color: #6f5e0a;
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
  const deleteButton = document.getElementById('delete-file');
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
  let previewTimer = 0;

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

  function schedulePreview() {
    window.clearTimeout(previewTimer);
    previewTimer = window.setTimeout(buildPreview, 800);
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

  function deleteFile() {
    if (Object.keys(files).length <= 1) {
      setStatus('Cannot delete the last file');
      return;
    }

    const name = activeFile;
    const confirmed = window.confirm('Delete ' + name + '? This cannot be undone.');
    if (!confirmed) {
      return;
    }

    delete files[name];
    const next = Object.keys(files).sort()[0];
    activeFile = next;
    saveState();
    renderFileList();
    openFile(next);
    buildPreview();
    setStatus('Deleted ' + name);
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
    schedulePreview();
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
    schedulePreview();
  });

  window.addEventListener('keydown', (event) => {
    const mod = event.ctrlKey || event.metaKey;
    if (!mod) {
      return;
    }

    if (event.key === 's' || event.key === 'S') {
      event.preventDefault();
      saveState();
      setStatus('Saved');
    } else if (event.key === 'Enter') {
      event.preventDefault();
      buildPreview();
      setStatus('Preview updated');
    }
  });

  if (newFileButton) {
    newFileButton.addEventListener('click', createFile);
  }

  if (deleteButton) {
    deleteButton.addEventListener('click', deleteFile);
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