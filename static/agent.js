let swRegistration = null;
async function tryRegister() {
  const candidates = ['/sw.js', '/static/sw.js'];
  for (const path of candidates) {
  try {
   const reg = await navigator.serviceWorker.register(path);
   swRegistration = reg;
   return reg;
  } catch (err) {}
  }
  return null;
}

// ----- PUSH subscribe helper -----
function urlBase64ToUint8Array(base64String) {
  if (!base64String) return null;
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const out = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) out[i] = rawData.charCodeAt(i);
  return out;
}

async function subscribeToPush() {
  if (!swRegistration) {
    await tryRegister();
    if (!swRegistration) return;
  }
  if (Notification.permission !== 'granted') {
    const p = await Notification.requestPermission();
    if (p !== 'granted') return;
  }
  if (!PUBLIC_VAPID_KEY) return;

  try {
    // reuse existing subscription when available
    const existing = await swRegistration.pushManager.getSubscription();
    let sub = existing;
    if (!sub) {
      const key = urlBase64ToUint8Array(PUBLIC_VAPID_KEY);
      sub = await swRegistration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
    }

    // Send subscription to server (server should dedupe)
    try {
      await fetch('/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ subscription: sub, userId })
      });
    } catch (err) { console.warn('send subscription failed', err); }
  } catch (err) { console.warn(err); }
}


// ----- WebSocket -----
function wsScheme() { return location.protocol === 'https:' ? 'wss' : 'ws'; }
let ws = null;
let reconnectDelay = 1000;
const maxDelay = 30000;
let shouldReconnect = true;

function createWs() {
  return new WebSocket(`${wsScheme()}://${window.location.host}/ws/${userId}`);
}

function connectWs() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) { return; }
  ws = createWs();

  ws.onopen = () => {
  reconnectDelay = 1000;
  };
  ws.onmessage = (ev) => {
  try {
   const data = JSON.parse(ev.data);
   if (data.type === 'notification') {
     // Prefer SW if available:
     if (swRegistration) {
     try {
      swRegistration.showNotification(data.title || 'Agent', { 
        body: data.message || data.body || '',
        icon: '/icons/icon-192.png',
        badge: '/icons/badge-72.png'
      });
     } catch (e) {
      // fallback
      if (Notification.permission === 'granted') new Notification(data.title || 'Agent', { 
        body: data.message || data.body || '',
        icon: '/icons/icon-192.png'
      });
     }
     } else {
     if (Notification.permission === 'granted') new Notification(data.title || 'Agent', { 
      body: data.message || data.body || '',
      icon: '/icons/icon-192.png'
     });
     }
   }
  } catch (e) {}
  };
  ws.onclose = (ev) => {
  if (shouldReconnect) scheduleReconnect();
  };
  ws.onerror = (err) => {};
}

function scheduleReconnect() {
  if (!shouldReconnect) return;
  if (!navigator.onLine) {
  window.addEventListener('online', () => connectWs(), { once: true });
  return;
  }
  setTimeout(() => {
  reconnectDelay = Math.min(maxDelay, Math.floor(reconnectDelay * 1.5));
  connectWs();
  }, reconnectDelay);
}

window.addEventListener('beforeunload', () => { shouldReconnect = false; try { ws && ws.close(); } catch(e){} });

// ----------------- Existing code & agent CRUD (kept) -----------------
function showModal() {
   // FIX: Ensure the modal shows using flex
  document.getElementById('createModal').classList.remove('hidden');
   document.getElementById('createModal').classList.add('flex');
  document.getElementById('title').focus();
}

function closeMainModal() {
   // FIX: Remove flex as well as adding hidden
  document.getElementById('createModal').classList.add('hidden');
   document.getElementById('createModal').classList.remove('flex');
  document.getElementById('agentForm').reset();
  document.getElementById('notification').checked = true;
}

// --- MODIFIED FUNCTION ---
async function loadAgents() {
  const agentsContainer = document.getElementById('agentsContainer');
   const emptyStateContainer = document.getElementById('emptyStateContainer');

   // Show loading spinner immediately and hide empty state
  agentsContainer.innerHTML = `
  <div class="col-span-full flex justify-center items-center py-16">
   <div class="loading-spinner"></div>
  </div>
  `;
   agentsContainer.classList.remove('hidden');
   emptyStateContainer.classList.add('hidden');

  try {
  const res = await fetch('/agents', { method: 'GET', credentials: 'include' });
  if (!res.ok) throw new Error('Failed to load');
  const agents = await res.json();
  
  if (agents.length === 0) {
       // If no agents, show the empty state and hide the (now empty) agents container
       emptyStateContainer.classList.remove('hidden');
       agentsContainer.classList.add('hidden');
  agentsContainer.innerHTML = ''; // Clear spinner
  } else {
       // If agents exist, ensure the correct containers are visible/hidden
       emptyStateContainer.classList.add('hidden');
       agentsContainer.classList.remove('hidden');
  agentsContainer.innerHTML = ''; // Clear spinner before adding cards

  agents.forEach(agent => {
    const card = document.createElement('div');
         // Using dark mode classes for better contrast
    card.className = 'bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow duration-200';
    card.innerHTML = `
    <div class="mb-4">
     <h3 class="text-xl font-semibold text-black dark:text-white">${escapeHtml(agent.title)}</h3>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 text-sm">
     <div class="space-y-1">
       <span class="text-gray-500 dark:text-gray-400 block text-xs uppercase tracking-wide font-medium">Time</span>
       <span class="text-gray-900 dark:text-gray-100 font-medium">${escapeHtml(agent.time)}</span>
     </div>
     <div class="space-y-1">
       <span class="text-gray-500 dark:text-gray-400 block text-xs uppercase tracking-wide font-medium">Frequency</span>
       <span class="text-gray-900 dark:text-gray-100 font-medium">${escapeHtml(agent.frequency)}</span>
     </div>
     <div class="md:col-span-2 space-y-1">
       <span class="text-gray-500 dark:text-gray-400 block text-xs uppercase tracking-wide font-medium">Prompt</span>
       <div class="whitespace-pre-wrap break-words text-gray-900 dark:text-gray-200 max-h-24 overflow-y-auto border border-gray-100 dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-900">${escapeHtml(agent.prompt)}</div>
     </div>
    </div>
    <div class="flex flex-wrap items-center justify-between gap-4 mb-6 text-sm">
     <span class="text-gray-600 dark:text-gray-300 flex items-center">
       <div class="w-2 h-2 ${agent.notification ? 'bg-green-500' : 'bg-yellow-500'} rounded-full mr-2"></div>
       Notification: ${agent.notification ? 'Enabled' : 'Disabled'}
     </span>
     <span class="text-gray-600 dark:text-gray-300 flex items-center">
       <div class="w-2 h-2 ${agent.paused ? 'bg-yellow-500' : 'bg-green-500'} rounded-full mr-2"></div>
       Status: ${agent.paused ? 'Paused' : 'Active'}
     </span>
    </div>
    <div class="flex flex-col sm:flex-row gap-3">
     <button class="bg-black dark:bg-white text-white dark:text-black text-sm px-6 py-3 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 focus:outline-none focus:ring-0 transition-colors duration-200 flex-1 sm:flex-none font-medium shadow-sm" onclick="togglePause(${agent.id}, ${agent.paused}, this)">${agent.paused ? 'Resume' : 'Pause'}</button>
     <button class="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm px-6 py-3 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-0 transition-colors duration-200 flex-1 sm:flex-none font-medium border border-gray-200 dark:border-gray-600" onclick="deleteAgent(${agent.id}, this)">Delete</button>
    </div>
    `;
    agentsContainer.appendChild(card);
  });
  }
  } catch (err) {
  agentsContainer.innerHTML = `
   <div class="col-span-full text-center py-16">
     <p class="text-red-500 text-lg mb-6">Failed to load tasks. Please try again.</p>
     <button onclick="loadAgents()" class="bg-black text-white px-6 py-3 rounded-lg text-sm hover:bg-gray-900 transition-colors">Retry</button>
   </div>
  `;
       // Ensure error message is visible
       agentsContainer.classList.remove('hidden');
       emptyStateContainer.classList.add('hidden');
  }
}

document.getElementById('agentForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalText = submitBtn.innerHTML;
  submitBtn.innerHTML = '<span class="flex items-center justify-center"><div class="loading-spinner-dark mr-2"></div>Creating...</span>';
  submitBtn.disabled = true;
  const payload = {
  title: document.getElementById('title').value,
  time: document.getElementById('time').value,
  frequency: document.getElementById('frequency').value,
  prompt: document.getElementById('prompt').value,
  notification: document.getElementById('notification').checked
  };
  try {
  const res = await fetch('/agents', {
   method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload), credentials: 'include'
  });
  if (!res.ok) throw new Error('Create failed');
  
  // Calling the fixed loadAgents will now correctly refresh the UI
     await loadAgents();
     
  submitBtn.innerHTML = originalText; // Revert to original text immediately
  submitBtn.disabled = false;
  closeMainModal();
  } catch (err) {
  submitBtn.innerHTML = originalText;
  submitBtn.disabled = false;
  alert('Failed to create agent. Please try again.');
  }
});

async function togglePause(id, paused, btn) {
  const originalText = btn.innerHTML;
  btn.innerHTML = '<span class="flex items-center justify-center"><div class="loading-spinner-dark mr-1"></div>Updating...</span>';
  btn.disabled = true;
  try {
  const res = await fetch(`/agents/${id}`, {
   method: 'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({paused: !paused}), credentials: 'include'
  });
  if (!res.ok) throw new Error('Toggle failed');
  await loadAgents();
  } catch (err) {
  btn.innerHTML = originalText;
  btn.disabled = false;
  alert('Failed to update agent. Please try again.');
  }
}

async function deleteAgent(id, btn) {
  if (!confirm('Are you sure you want to delete this task?')) return;
  const originalText = btn.innerHTML;
  btn.innerHTML = '<span class="flex items-center justify-center"><div class="loading-spinner-delete mr-1"></div>Deleting...</span>';
  btn.disabled = true;
  try {
  const res = await fetch(`/agents/${id}`, { method: 'DELETE', credentials: 'include' });
  if (!res.ok) throw new Error('Delete failed');
  await loadAgents();
  } catch (err) {
  btn.innerHTML = originalText;
  btn.disabled = false;
  alert('Failed to delete agent. Please try again.');
  }
}

function escapeHtml(s){
  if (!s && s !== 0) return '';
  return String(s).replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]||c));
}

function openAgentModal() {
  document.getElementById('agent-modal').classList.remove('hidden');
}

function closeAgentModal() {
  document.getElementById('agent-modal').classList.add('hidden');
}

// ----- Boot sequence -----
(async function init(){
  if ('serviceWorker' in navigator) {
  await tryRegister();
  }
  await subscribeToPush();
  if ('WebSocket' in window) connectWs();
  await loadAgents();
})();