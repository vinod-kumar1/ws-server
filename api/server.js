const WebSocket = require('ws');
let { v4 } = require("uuid");

let app = require("express")();

app.get("/", (req, res) => {
    res.send("Done");
})
app.listen(3000);

// Create WebSocket server on port 8080
const wss = new WebSocket.Server({ port: 8080 });
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

export default app;