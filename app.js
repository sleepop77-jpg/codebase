// If Then AI - Core Logic
const $ = s => document.querySelector(s);
const chatFlow = $('#chat-flow');
const userInput = $('#user-input');
const sendBtn = $('#send-btn');
const buildBtn = $('#build-btn');
const historyList = $('#history-list');

// State
let logicState = {
    trigger: '',
    action: ''
};

// Auto-resize textarea
userInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
});

// Add Message to Chat
function addMessage(role, text, isCode = false) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `msg ${role}`;
    
    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    
    if (isCode) {
        bubble.innerHTML = `<div>Generated Logic Payload:</div><div class="code-block">${text}</div>`;
    } else {
        bubble.innerHTML = text;
    }
    
    msgDiv.appendChild(bubble);
    chatFlow.appendChild(msgDiv);
    chatFlow.scrollTop = chatFlow.scrollHeight;
}

// Build Logic Handler
buildBtn.addEventListener('click', () => {
    const triggerType = $('#trigger-type').value;
    const triggerVal = $('#trigger-val').value;
    const actionType = $('#action-type').value;
    const actionVal = $('#action-val').value;

    if (!triggerVal || !actionVal) {
        addMessage('ai', "Please fill in both the Trigger and Action fields.");
        return;
    }

    logicState = { trigger: `${triggerType}: ${triggerVal}`, action: `${actionType}: ${actionVal}` };
    
    addMessage('user', `Building logic:<br>IF ${logicState.trigger}<br>THEN ${logicState.action}`);
    
    // Simulate AI Processing
    setTimeout(() => {
        const payload = generatePayload(logicState);
        addMessage('ai', payload, true);
        addToHistory(logicState);
    }, 800);
});

// Generate Mock Payload
function generatePayload(state) {
    return JSON.stringify({
        version: "1.0",
        trigger: state.trigger,
        action: state.action,
        timestamp: new Date().toISOString(),
        status: "ready_to_deploy"
    }, null, 2);
}

// Add to History
function addToHistory(state) {
    if (historyList.querySelector('.empty-state')) {
        historyList.innerHTML = '';
    }
    
    const item = document.createElement('div');
    item.style.cssText = "font-size: 11px; padding: 8px; border-bottom: 1px solid #30363d; color: #8b949e;";
    item.innerHTML = `<strong>${state.trigger.split(':')[0]}</strong> → ${state.action.split(':')[0]}`;
    historyList.prepend(item);
}

// Chat Handler
sendBtn.addEventListener('click', handleChat);
userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleChat();
    }
});

function handleChat() {
    const text = userInput.value.trim();
    if (!text) return;

    addMessage('user', text);
    userInput.value = '';
    userInput.style.height = 'auto';

    // Simple AI Response Simulation
    setTimeout(() => {
        let response = "I can help with that. Try adjusting the parameters on the left and clicking 'Build Logic'.";
        
        if (text.toLowerCase().includes('help')) {
            response = "I am If Then AI. I turn your natural language rules into executable logic payloads. Define your trigger and action on the left panel to get started.";
        } else if (text.toLowerCase().includes('github')) {
            response = "To push to GitHub, select 'Push to GitHub' in the Action dropdown and describe the commit message you want to generate.";
        }
        
        addMessage('ai', response);
    }, 600);
}

// Clear Chat
$('#clear-chat').addEventListener('click', () => {
    chatFlow.innerHTML = '';
    addMessage('ai', "Context cleared. Ready for new logic.");
});