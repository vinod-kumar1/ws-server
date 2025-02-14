import { WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';

export default function handler(req, res) {
    if (req.method === 'GET') {
        const wss = new WebSocketServer({ noServer: true });
        let publicClients = new Set();

        wss.on('connection', (ws) => {
            console.log('New WebSocket connection established');
            let clientId;

            ws.on('message', (message) => {
                let msg;
                try {
                    msg = JSON.parse(message);
                } catch (err) {
                    console.error('Error parsing message:', err);
                    return;
                }

                switch (msg.type) {
                    case 'id':
                        clientId = uuidv4();
                        ws.client = clientId;
                        publicClients.add(clientId);
                        broadcastClients(publicClients);
                        break;

                    case 'message':
                        if (msg.client) {
                            sendMessageToClient(msg);
                        } else {
                            sendMessageToAllClients(msg.message);
                        }
                        break;

                    case 'close':
                        publicClients.delete(msg.client);
                        break;

                    default:
                        console.log('Unknown message type:', msg.type);
                }
            });

            ws.on('close', () => {
                console.log('Client disconnected');
                closeDisconnectedClients(ws.client);
            });
        });

        // WebSocket upgrade logic
        req.socket.on('upgrade', (req, socket, head) => {
            wss.handleUpgrade(req, socket, head, (ws) => {
                wss.emit('connection', ws, req);
            });
        });

        res.status(101).send('WebSocket server is ready');
    } else {
        res.status(200).send('WebSocket server is running');
    }

    // Helper functions
    function broadcastClients(clients) {
        wss.clients.forEach((ws) => {
            ws.send(JSON.stringify({ type: 'newClient', clients: Array.from(clients) }));
        });
    }

    function sendMessageToClient({ message, client }) {
        wss.clients.forEach((cl) => {
            if (cl.client === client) {
                cl.send(JSON.stringify({ type: 'message', message }));
            }
        });
    }

    function sendMessageToAllClients(message) {
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type: 'message', message }));
            }
        });
    }

    function closeDisconnectedClients(clientId) {
        publicClients.forEach((client) => {
            if (client === clientId) publicClients.delete(client);
        });
    }
}
