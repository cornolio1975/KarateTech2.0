const http = require('http');
const os = require('os');
const { parse } = require('url');
const next = require('next');
const { WebSocketServer, WebSocket } = require('ws');

const port = parseInt(process.env.PORT || '3000', 10);
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev, hostname: '0.0.0.0', port });
const handle = app.getRequestHandler();

function getLanIps() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(interfaces)) {
    const iface = interfaces[name];
    if (!iface) continue;
    for (const alias of iface) {
      if (alias.family === 'IPv4' && !alias.internal) {
        ips.push(alias.address);
      }
    }
  }
  return ips;
}

app.prepare().then(() => {
  const server = http.createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  // Attach WebSocket server on /ws path
  const wss = new WebSocketServer({ server, path: '/ws' });

  // Store connected clients with metadata
  const clients = new Map();

  wss.on('connection', (ws, req) => {
    const ip = req.socket.remoteAddress;
    const clientId = `client-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    clients.set(ws, { id: clientId, ip, connectedAt: new Date() });

    // Send welcome / acknowledgment
    ws.send(JSON.stringify({
      type: 'SERVER_HELLO',
      clientId,
      serverTime: new Date().toISOString(),
      activeClientsCount: clients.size
    }));

    // Broadcast updated client count to all
    broadcast({
      type: 'LAN_CLIENT_COUNT',
      count: clients.size
    });

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());

        // Echo/broadcast message to all OTHER clients on LAN
        wss.clients.forEach((client) => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
          }
        });
      } catch (err) {
        console.error('Error handling WebSocket message:', err);
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
      broadcast({
        type: 'LAN_CLIENT_COUNT',
        count: clients.size
      });
    });

    ws.on('error', (err) => {
      console.warn(`WebSocket error for client ${clientId}:`, err.message);
      clients.delete(ws);
    });
  });

  function broadcast(obj) {
    const payload = JSON.stringify(obj);
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  }

  server.listen(port, '0.0.0.0', (err) => {
    if (err) throw err;
    const lanIps = getLanIps();
    const primaryIp = lanIps[0] || 'localhost';

    console.log('\n' + '='.repeat(64));
    console.log('       🥋 KARATETECH 2.0 — LOCAL TOURNAMENT SERVER');
    console.log('='.repeat(64));
    console.log(`  Local Access:    http://localhost:${port}`);
    lanIps.forEach((ip) => {
      console.log(`  LAN Access:      http://${ip}:${port}`);
    });
    console.log(`  WebSocket Sync:  ws://${primaryIp}:${port}/ws`);
    console.log('  Database:        SQLite WAL Mode (karatetech.sqlite)');
    console.log('  Network Mode:    OFFLINE FIRST (LAN Synchronized)');
    console.log('='.repeat(64) + '\n');
  });
});
