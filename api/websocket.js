import { WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';

// Define the WebSocket server function
export default function handler(req, res) {
    if (req.method === 'GET') {
        // WebSocket server setup
        const wss = new WebSocketServer({ noServer: true });

        // Array to track connected clients
        let publicClients = new Set();

        // WebSocket connection handler
        wss.on('connection', (ws) => {
            console.log('New WebSocket connection established');
            let clientId;

            // Listen for incoming messages
            ws.on('message', (message) => {
                let msg;

                try {
                    msg = JSON.parse(message); // Parse incoming message safely
                } catch (err) {
                    console.error('Error parsing message:', err);
                    return; // If there's an error parsing, just return
                }

                // Handle message types
                switch (msg.type) {
                    case 'id':
                        clientId = uuidv4(); // Generate a new client ID
                        ws.client = clientId;
                        publicClients.add(clientId); // Add to the client set
                        broadcastClients(publicClients); // Broadcast updated client list
                        break;

                    case 'message':
                        // Send message to specific client or broadcast
                        if (msg.client) {
                            sendMessageToClient(msg);  // Send to specific client
                        } else {
                            sendMessageToAllClients(msg.message);  // Broadcast to all
                        }
                        break;

                    case 'close':
                        // Handle client disconnection
                        publicClients.delete(msg.client);
                        break;

                    default:
                        console.log('Unknown message type:', msg.type);
                }
            });

            // Handle client disconnection
            ws.on('close', () => {
                console.log('Client disconnected');
                closeDisconnectedClients(ws.client);
            });
        });

        // Upgrade HTTP request to WebSocket
        req.socket.on('upgrade', (req, socket, head) => {
            wss.handleUpgrade(req, socket, head, (ws) => {
                wss.emit('connection', ws, req);
            });
        });

        // Send a response to indicate the WebSocket server is ready
        res.status(101).send('WebSocket server is ready');

        console.log('WebSocket server is ready');
    } else {
        // Handle other HTTP requests
        res.status(200).send('WebSocket server is running');
    }

    // Function to broadcast the list of clients to all WebSocket clients
    function broadcastClients(clients) {
        wss.clients.forEach((ws) => {
            ws.send(JSON.stringify({ type: 'newClient', clients: Array.from(clients) }));
        });
    }

    // Function to send message to a specific client
    function sendMessageToClient({ message, client, name }) {
        wss.clients.forEach((cl) => {
            if (cl.client === client) {
                cl.send(JSON.stringify({ type: 'message', message, name }));
            }
        });
    }

    // Function to send message to all connected clients
    function sendMessageToAllClients(message) {
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type: 'message', message }));
            }
        });
    }

    // Handle disconnection of clients
    function closeDisconnectedClients(clientId) {
        publicClients.forEach((client) => {
            if (client === clientId) publicClients.delete(client);
        });
    }
}
