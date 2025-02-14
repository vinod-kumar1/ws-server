const WebSocket = require('ws');
let { v4 } = require("uuid");

export default function Server(req, res) {

    if (req.method == "GET") {
        // Create WebSocket server on port 8080
        const wss = new WebSocket.Server({ noServer: true });
        // Connection event handler
        let publicClients = new Set();

        wss.on('connection', (ws) => {
            //  listen to the incomming messages
            ws.on('message', (message) => {
                let msg;

                try {
                    msg = JSON.parse(message); // Parse incoming message safely
                } catch (err) {

                    console.error('Error parsing message:', err);
                    return; // If there's an error parsing, just return
                }

                switch (msg.type) {
                    case "id":
                        console.log("New client connected: " + msg.id);
                        clientId = v4(msg.id);
                        ws.client = clientId;
                        publicClients.add(clientId)
                        wss.clients.forEach(ws => ws.send(JSON.stringify({ type: "newClient", client: Array.from(publicClients) })));
                        break;

                    case "message":
                        !message.client ? sendMessageToAllClients(msg.message) : sendMessageToClient(msg);
                        break;
                    case "close":
                        publicClients.delete(msg.client);

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

        req.socket.on("upgrade", (req, socket, head) => {
            wss.handleUpgrade(req, socket, head, ws => {
                ws.emit("connection", ws, req);
            })
        })
        res.status(101).send("WS server ready");

        console.log('WebSocket server is running on ws://localhost:8080');

        function sendMessageToClient({ message, client, name }) {
            wss.clients.forEach(cl => {
                // console.log(client, cl.client, "nc-l");
                if (cl.client == client) {
                    cl.send(JSON.stringify({ type: "message", message: message, name: name }));
                }
            });
        }

        function closeDisconnectedClients(closeClient) {
            wss.clients.forEach((client) => {
                if (client.client == closeClient) publicClients.delete(client);
            })
        }

        // Function to send a message from the server to all clients
        function sendMessageToAllClients(message) {
            wss.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ type: "message", message: message }));
                }
            });
        }


    }
    else {
        res.status(200).send('WebSocket server is up and running');
    }
}