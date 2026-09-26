# Real-Time Order Tracking & Live Support System

A full-stack app demonstrating **four communication protocols** in one project:

| Protocol | Where | Purpose |
|---|---|---|
| REST | `/api/v1/orders`, `/api/v1/catalog` | CRUD for orders & catalog |
| WebSockets (Socket.io) | root namespace | Live order status pushes + 1-on-1 chat |
| JSON-RPC 2.0 | `POST /rpc` | Action-style calls (e.g. `cancelOrder`) |
| SSE | `GET /events` | Live system alert stream |

## Project structure

```
order-tracker/
├── backend/         # Express + Socket.io + JSON-RPC + SSE
│   ├── server.js
│   └── package.json
├── frontend/         # Plain HTML/CSS/JS (no build step)
│   ├── index.html
│   ├── style.css
│   └── app.js
└── README.md
```

## Backend — local setup

```bash
cd backend
npm install
npm start
```

Server runs on `http://localhost:4000` by default (or `process.env.PORT`).

### REST endpoints

- `GET  /api/v1/catalog` — list menu items
- `GET  /api/v1/orders` — list all orders
- `GET  /api/v1/orders/:id` — get one order
- `POST /api/v1/orders` — create an order — body: `{ "customer": "Ali", "items": [{ "productId": "p1", "qty": 1 }] }`
- `PATCH /api/v1/orders/:id/status` — update status — body: `{ "status": "preparing" }`

### WebSocket (Socket.io) events

**Client → Server**
- `joinOrderRoom` `{ orderId }` — subscribe to an order's room (for both status updates & chat)
- `leaveOrderRoom` `{ orderId }`
- `chatMessage` `{ orderId, sender, text }` — send a chat message to everyone in that order's room

**Server → Client**
- `orderStatusUpdate` `{ orderId, status }` — pushed whenever an order's status changes (via REST PATCH or JSON-RPC cancel)
- `chatMessage` `{ orderId, sender, text, at }` — relayed chat message
- `systemNotice` `string` — e.g. "A participant joined order X"

### JSON-RPC 2.0 — `POST /rpc`

Request:
```json
{ "jsonrpc": "2.0", "method": "cancelOrder", "params": { "orderId": "ord-1001" }, "id": 1 }
```

Supported methods: `cancelOrder`, `getOrderStatus`, `listOrders`.

### SSE — `GET /events`

Open with `EventSource` (or `curl -N`) to receive a live stream of system alerts (new orders, status changes, cancellations, and a 30s heartbeat), formatted as:
```
data: {"message": "...", "at": "2026-09-26T12:00:00.000Z"}
```

## Frontend — local setup

The frontend is plain HTML/JS with no build step — just open `frontend/index.html` in a browser, or serve it with any static server. On load, enter your backend URL (e.g. `http://localhost:4000` locally, or your deployed Render/Railway URL) and click **Connect**.

## Deployment

**Backend (Render or Railway):**
1. Push this repo to GitHub.
2. Create a new Web Service, point it at this repo, set root directory to `backend`.
3. Build command: `npm install`. Start command: `npm start`.
4. Render/Railway auto-assigns `PORT` — the server already reads `process.env.PORT`.

**Frontend (Vercel or Netlify):**
1. Import the same repo, set root directory to `frontend`.
2. No build command needed (static site) — output directory: `frontend` (or `.` if importing frontend folder directly).
3. Once deployed, open the site and paste your live backend URL into the "Backend URL" field, then click Connect.

## Testing the live demo

1. Open the deployed frontend in two browser tabs (or two devices).
2. In both, connect to the same backend URL.
3. In Tab 1, place an order (REST).
4. In Tab 2, track that same order ID (WebSocket room join).
5. In Tab 1, change the role to **Support** and send a chat message — it should appear live in Tab 2.
6. Click **Cancel Order** (JSON-RPC) and watch the status update live in both tabs.
7. Watch the **Live System Alerts** panel — SSE pushes should appear automatically.
