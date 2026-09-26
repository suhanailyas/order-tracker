let socket = null;
let backendUrl = '';
let currentOrderId = null;
let rpcId = 1;

const $ = (id) => document.getElementById(id);

// ---------------------------------------------------------------------------
// Connect to backend (WebSocket + set base URL for REST/RPC/SSE)
// ---------------------------------------------------------------------------
$('connectBtn').addEventListener('click', () => {
  backendUrl = $('backendUrl').value.trim().replace(/\/$/, '');
  if (!backendUrl) return alert('Enter your backend URL first.');

  if (socket) socket.disconnect();
  socket = io(backendUrl, { transports: ['websocket', 'polling'] });

  socket.on('connect', () => {
    $('connStatus').className = 'status-dot online';
    loadOrders();
    connectSSE();
  });
  socket.on('disconnect', () => {
    $('connStatus').className = 'status-dot offline';
  });
  socket.on('orderStatusUpdate', ({ orderId, status }) => {
    if (orderId === currentOrderId) {
      $('trackStatus').textContent = `Order ${orderId} status: ${status}`;
    }
    loadOrders();
  });
  socket.on('chatMessage', ({ orderId, sender, text, at }) => {
    if (orderId !== currentOrderId) return;
    appendChat(sender, text);
  });
  socket.on('systemNotice', (msg) => appendAlert(msg));
});

// ---------------------------------------------------------------------------
// REST: orders + catalog
// ---------------------------------------------------------------------------
async function loadOrders() {
  const res = await fetch(`${backendUrl}/api/v1/orders`);
  const { data } = await res.json();
  $('ordersList').innerHTML = data
    .map((o) => `<li><b>${o.id}</b> — ${o.customer} — <em>${o.status}</em></li>`)
    .join('');
}

$('newOrderForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!backendUrl) return alert('Connect to backend first.');
  const customer = $('customerName').value.trim();
  const productId = $('itemName').value.trim();
  await fetch(`${backendUrl}/api/v1/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customer, items: [{ productId, qty: 1 }] }),
  });
  $('newOrderForm').reset();
  loadOrders();
});

// ---------------------------------------------------------------------------
// WebSocket: track an order + join its chat room
// ---------------------------------------------------------------------------
$('trackBtn').addEventListener('click', () => {
  if (!socket) return alert('Connect to backend first.');
  const orderId = $('trackOrderId').value.trim();
  if (!orderId) return;

  if (currentOrderId) socket.emit('leaveOrderRoom', { orderId: currentOrderId });
  currentOrderId = orderId;
  socket.emit('joinOrderRoom', { orderId });
  $('trackStatus').textContent = `Watching order ${orderId} for live updates…`;
  $('cancelBtn').disabled = false;
  $('chatLog').innerHTML = '';
});

// ---------------------------------------------------------------------------
// JSON-RPC 2.0: cancelOrder
// ---------------------------------------------------------------------------
$('cancelBtn').addEventListener('click', async () => {
  if (!currentOrderId) return;
  const res = await fetch(`${backendUrl}/rpc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'cancelOrder',
      params: { orderId: currentOrderId },
      id: rpcId++,
    }),
  });
  const json = await res.json();
  if (json.error) alert(`RPC error: ${json.error.message}`);
  else $('trackStatus').textContent = `Order ${json.result.orderId} status: ${json.result.status}`;
});

// ---------------------------------------------------------------------------
// Chat (over WebSocket)
// ---------------------------------------------------------------------------
$('chatForm').addEventListener('submit', (e) => {
  e.preventDefault();
  if (!socket || !currentOrderId) return alert('Track an order first.');
  const text = $('chatInput').value.trim();
  if (!text) return;
  const role = document.querySelector('input[name="role"]:checked').value;
  socket.emit('chatMessage', { orderId: currentOrderId, sender: role, text });
  $('chatInput').value = '';
});

function appendChat(sender, text) {
  const div = document.createElement('div');
  div.className = 'msg';
  div.innerHTML = `<b>${sender}:</b> ${text}`;
  $('chatLog').appendChild(div);
  $('chatLog').scrollTop = $('chatLog').scrollHeight;
}

// ---------------------------------------------------------------------------
// SSE: live system alerts
// ---------------------------------------------------------------------------
function connectSSE() {
  const es = new EventSource(`${backendUrl}/events`);
  es.onmessage = (event) => {
    const data = JSON.parse(event.data);
    appendAlert(data.message);
  };
}

function appendAlert(message) {
  const li = document.createElement('li');
  li.textContent = `${new Date().toLocaleTimeString()} — ${message}`;
  $('alertsList').prepend(li);
}
