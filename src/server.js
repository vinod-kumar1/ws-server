const WebSocket = require("ws");
const http = require("http");
let { v4 } = require("uuid");

// Optionally create an HTTP server (helpful for debugging or serving static files)
const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("WebSocket server is running");
});

// Create WebSocket server
const wss = new WebSocket.Server({ server });
let publicClients = new Set();
let publicClienDetails = new Set();

wss.on("connection", (ws) => {
  console.log("A client connected");
  // Listen for messages from clients
  ws.on("message", (message) => {
    let msg;
    try {
      msg = JSON.parse(message);
    } catch (err) {
      console.log(err);
      return;
    }

    switch (msg.type) {
      case "newClient":
        let clientId = v4(msg.clientname);
        ws.client = clientId;
        ws.name = msg.clientname;
        publicClients.add(clientId);
        publicClienDetails.add({ name: msg.clientname, id: clientId });
        ws.send(
          JSON.stringify({
            type: "newClient",
            client: clientId,
            message: "New client created",
          })
        );
        sendMessageToAll();
        break;

      case "message":
        let { receiver, message, sendAll, name } = msg;
        receiver && !sendAll
          ? sendMessageToClient(receiver, message, name)
          : sendMessageToAll(message);
        break;
    }
  });

  function sendMessageToAll() {
    console.log("public, ", publicClienDetails);
    wss.clients.forEach((client) => {
      client.send(
        JSON.stringify({
          type: "updateClients",
          details: Array.from(publicClienDetails),
          name: client.name,
        })
      );
    });
  }

  function sendMessageToClient(clientId, message, name) {
    let clients = Array.from(wss.clients);
    for (let i = 0; i < clients.length; i++) {
      if (clients[i].client == clientId) {
        clients[i].send(
          JSON.stringify({ type: "message", message: message, name: name })
        );
        break;
      }
    }
  }

  ws.onclose = () => {
    console.log("Client Disconnected", ws.client);
    publicClients = new Set();
    wss.clients.forEach((client) => {
      if (client.readyState == WebSocket.OPEN) publicClients.add(client.client);
    });
    wss.clients.forEach((client) => {
      if (client.readyState == WebSocket.OPEN) {
        client.send(
          JSON.stringify({
            type: "updateClients",
            details: Array.from(publicClienDetails),
          })
        );
      }
    });
  };
});

// Start the HTTP server (also serves as WebSocket server)
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`WebSocket server is listening on port ${PORT}`);
});
