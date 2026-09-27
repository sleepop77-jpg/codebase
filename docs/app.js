// VibeBridge Core Logic (Khaki Edition)
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

// State
let files = [];
let openTabs = [];
let activeTab = null;
let pendingOps = null;

// DOM Elements
const fileTreeEl = $('#file-tree');
const editorTabsEl = $('#editor-tabs');
const codeEditor = $('#code-editor');
const chatView = $('#chat-view');
const editorView = $('#editor-view');
const flow = $('#flow');
const input = $('#input');
const sendBtn = $('#send');
const btnRefresh = $('#btn-refresh');
const btnPush = $('#btn-push');
const btnConnect = $('#btn-connect');
const valRepo = $('#val-repo');
const valPat = $('#val-pat');

// Icons
const iconFile = '<span class="dot" style="background:#6f7d33"></span>';
const iconFolder = '<span class="dot" style="background:#a8801f"></span>';

// Init
function init() {
    // Load saved connection
    const saved = JSON.parse(localStorage.getItem('vb_khaki') || 'null');
    if (saved) {
        setConn(saved.pat, saved.repo, saved.branch);
        $('#pat').value = saved.pat;
        $('#repo').value = saved.repo;
        $('#branch').value = saved.branch;
        updateCreds();
        loadRepo();
    }

    // Event Listeners
    btnConnect.onclick = handleConnect;
    btnRefresh.onclick = () => loadRepo(true);
    sendBtn.onclick = handleSend;
    btnPush.onclick = handlePush;
    
    input.addEventListener('input', () => {
        sendBtn.disabled = !input.value.trim();
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 160) + 'px';
    });

    input.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    });

    // Tab Switching
    $$('.sk-tab').forEach(tab => {
        tab.onclick = () => {
            $$('.sk-tab').forEach(t => t.classList.remove('on'));
            tab.classList.add('on');
            const view = tab.dataset.view;
            if (view === 'chat') {
                chatView.style.display = 'flex';
                editorView.style.display = 'none';
                editorTabsEl.style.display = 'none';
            } else {
                chatView.style.display = 'none';
                editorView.style.display = 'flex';
                editorTabsEl.style.display = 'flex';
            }
        };
    });

    // Wipe Data
    $('#btn-wipe').onclick = () => {
        if (confirm("Wipe all local data?")) {
            localStorage.clear();
            location.reload();
        }
    };

    // Copy Token
    $('#btn-copy-token').onclick = () => {
        const p = $('#pat').value;
        if (p) { navigator.clipboard.writeText(p); alert("Token copied"); }
    };
}

function updateCreds() {
    const r = $('#repo').value;
    const p = $('#pat').value;
    valRepo.textContent = r || "—";
    valPat.textContent = p ? (p.slice(0, 6) + "…" + p.slice(-4)) : "—";
}

async function handleConnect() {
    const pat = prompt("Enter GitHub PAT:");
    const repo = prompt("Enter Repo (owner/name):");
    if (!pat || !repo) return;

    try {
        setConn(pat, repo, "main");
        const login = await validate();
        localStorage.setItem('vb_khaki', JSON.stringify({ pat, repo, branch: "main" }));
        $('#pat').value = pat;
        $('#repo').value = repo;
        updateCreds();
        addMessage('ai', `Connected as ${login}. Loading files...`);
        loadRepo();
    } catch (e) {
        alert("Connection failed: " + e.message);
    }
}

async function loadRepo(force = false) {
    if (!$('#repo').value) return;
    fileTreeEl.innerHTML = '<div class="sk-tree-empty">Loading...</div>';
    try {
        files = await getTree();
        renderTree();
        addMessage('ai', `Loaded ${files.length} files.`);
    } catch (e) {
        fileTreeEl.innerHTML = `<div class="sk-tree-empty">Error: ${e.message}</div>`;
    }
}

function renderTree() {
    fileTreeEl.innerHTML = '';
    if (!files.length) {
        fileTreeEl.innerHTML = '<div class="sk-tree-empty">Repo looks empty</div>';
        return;
    }

    // Simple flat list for now (can be expanded to tree later)
    files.forEach(f => {
        const div = document.createElement('div');
        div.className = 'sk-tree-item';
        const name = f.path.split('/').pop();
        div.innerHTML = `${iconFile} <span>${name}</span>`;
        div.title = f.path;
        div.onclick = () => openFile(f.path);
        fileTreeEl.appendChild(div);
    });
}

async function openFile(path) {
    // Check if already open
    let tab = openTabs.find(t => t.path === path);
    if (!tab) {
        try {
            const content = await getFile(path);
            tab = { path, content, modified: false };
            openTabs.push(tab);
        } catch (e) {
            addMessage('ai', `Failed to load ${path}`);
            return;
        }
    }

    activeTab = tab;
    codeEditor.value = tab.content;
    
    // Switch to editor view if in chat view
    if (chatView.style.display !== 'none') {
        $$('.sk-tab')[0].click(); // Click "github" tab
    }

    renderTabs();
    
    // Highlight in tree
    $$('.sk-tree-item').forEach(el => el.classList.remove('active'));
    Array.from(fileTreeEl.children).find(el => el.title === path)?.classList.add('active');
}

function renderTabs() {
    editorTabsEl.innerHTML = '';
    openTabs.forEach(tab => {
        const div = document.createElement('div');
        div.className = `sk-editor-tab ${tab === activeTab ? 'active' : ''}`;
        const name = tab.path.split('/').pop();
        div.innerHTML = `<span>${name}${tab.modified ? ' •' : ''}</span>`;
        div.onclick = () => openFile(tab.path);
        
        const close = document.createElement('span');
        close.innerHTML = '&times;';
        close.style.marginLeft = '8px';
        close.onclick = (e) => {
            e.stopPropagation();
            openTabs = openTabs.filter(t => t !== tab);
            if (activeTab === tab) {
                activeTab = openTabs.length ? openTabs[openTabs.length - 1] : null;
                codeEditor.value = activeTab ? activeTab.content : '';
            }
            renderTabs();
        };
        div.appendChild(close);
        editorTabsEl.appendChild(div);
    });
}

// Sync editor changes back to tab
codeEditor.addEventListener('input', () => {
    if (activeTab) {
        activeTab.content = codeEditor.value;
        activeTab.modified = true;
        renderTabs();
    }
});

function addMessage(role, text) {
    const div = document.createElement('div');
    div.className = `msg ${role}`;
    div.textContent = text;
    flow.appendChild(div);
    flow.scrollTop = flow.scrollHeight;
}

async function handleSend() {
    const text = input.value.trim();
    if (!text) return;

    addMessage('user', text);
    input.value = '';
    input.style.height = 'auto';
    sendBtn.disabled = true;

    // Check if it's a payload
    if (text.includes("===VIBEBRIDGE===")) {
        const result = parsePayload(text);
        if (result.ops.length > 0) {
            pendingOps = result.ops;
            addMessage('ai', `Parsed ${result.ops.length} operations. Ready to push.`);
            btnPush.disabled = false;
            btnPush.textContent = `Push staged (${result.ops.length})`;
        } else {
            addMessage('ai', "No operations found in payload.");
        }
    } else {
        // Simple echo for now
        setTimeout(() => {
            addMessage('ai', "I'm a fresh instance. Paste a VibeBridge payload to update my code.");
        }, 500);
    }
}

async function handlePush() {
    if (!pendingOps) return;
    btnPush.disabled = true;
    btnPush.textContent = "Pushing...";
    
    try {
        const commit = await commitOps(pendingOps, "feat: update via VibeBridge");
        addMessage('ai', `Success! Commit: ${commit.sha.slice(0, 7)}`);
        pendingOps = null;
        btnPush.textContent = "Push staged (0)";
        // Reload tree
        loadRepo(true);
    } catch (e) {
        addMessage('ai', `Error: ${e.message}`);
        btnPush.disabled = false;
        btnPush.textContent = `Push staged (${pendingOps.length})`;
    }
}

init();