// VibeBridge Core Logic
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

// State
let pendingOps = null;

// DOM Elements
const connectBtn = $('#connectBtn');
const codeEditor = $('#code');
const chatInput = $('#input');
const sendBtn = $('#sendBtn');
const chatBox = $('#chat');

// Init
connectBtn.onclick = async () => {
    const pat = prompt("Enter GitHub PAT:");
    const repo = prompt("Enter Repo (owner/name):");
    if (!pat || !repo) return;
    
    try {
        setConn(pat, repo, "main");
        const login = await validate();
        connectBtn.textContent = `Connected as ${login}`;
        connectBtn.style.backgroundColor = "#238636";
        addMessage('ai', `Connected to ${repo}. Ready to push.`);
    } catch (e) {
        alert("Connection failed: " + e.message);
    }
};

sendBtn.onclick = handleSend;
chatInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
    }
});

function addMessage(role, text) {
    const div = document.createElement('div');
    div.className = `msg ${role}`;
    div.innerHTML = `<div class="bubble">${text}</div>`;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
}

async function handleSend() {
    const text = chatInput.value.trim();
    if (!text) return;
    
    addMessage('user', text);
    chatInput.value = '';
    
    // Check if it's a payload
    if (text.includes("===VIBEBRIDGE===")) {
        const result = parsePayload(text);
        if (result.ops.length > 0) {
            pendingOps = result.ops;
            addMessage('ai', `Parsed ${result.ops.length} operations. Ready to push.`);
            
            // Auto-push for demo purposes (or add a button)
            if (confirm("Push changes to GitHub?")) {
                doPush();
            }
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

async function doPush() {
    if (!pendingOps) return;
    addMessage('ai', "Pushing...");
    try {
        const commit = await commitOps(pendingOps, "feat: update via VibeBridge");
        addMessage('ai', `Success! Commit: ${commit.sha.slice(0, 7)}`);
        pendingOps = null;
        // Reload page to see changes (simple approach)
        setTimeout(() => location.reload(), 2000);
    } catch (e) {
        addMessage('ai', `Error: ${e.message}`);
    }
}