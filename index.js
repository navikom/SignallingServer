// HTTP server
var app = require('http').createServer(function(request, response) {
  request.addListener('end', function() {
    file.serve(request, response);
  }).resume();
});

var WebSocketServer = require('websocket').server;

new WebSocketServer({
  httpServer: app,
  autoAcceptConnections: false
}).on('request', onRequest);

// shared stuff

var CHANNELS = { };

function onRequest(socket) {
  var origin = socket.origin + socket.resource;

  var websocket = socket.accept(null, origin);

  websocket.on('message', function(message) {
    if (message.type === 'utf8') {
      onMessage(JSON.parse(message.utf8Data), websocket);
    }
  });

  websocket.on('close', function() {
    truncateChannels(websocket);
    console.log(Object.keys(CHANNELS).length);
  });
}

function onMessage(message, websocket) {
  if (message.checkPresence)
    checkPresence(message, websocket);
  else if (message.open)
    onOpen(message, websocket);
  else
    sendMessage(message, websocket);
}

function onOpen(message, websocket) {
  var channel = CHANNELS[message.channel];

  if (channel)
    CHANNELS[message.channel][channel.length] = websocket;
  else
    CHANNELS[message.channel] = [websocket];
}

function sendMessage(message, websocket) {
  const data = JSON.stringify(message);
  var channel = CHANNELS[message.channel];

  if (!channel) {
    console.error('no such channel exists');
    return;
  }

  for (var i = 0; i < channel.length; i++) {
    if (channel[i] && channel[i] != websocket) {
      try {
        channel[i].send(data);
      } catch(e) {
      }
    }
  }
}

function checkPresence(message, websocket) {
  websocket.sendUTF(JSON.stringify({
    isChannelPresent: !!CHANNELS[message.channel]
  }));
}

function swapArray(arr) {
  var swapped = [],
    length = arr.length;
  for (var i = 0; i < length; i++) {
    if (arr[i])
      swapped[swapped.length] = arr[i];
  }
  return swapped;
}

function truncateChannels(websocket) {
  for (var channel in CHANNELS) {
    var _channel = CHANNELS[channel];
    for (var i = 0; i < _channel.length; i++) {
      if (_channel[i] == websocket)
        delete _channel[i];
    }
    CHANNELS[channel] = swapArray(_channel);
    if (CHANNELS && CHANNELS[channel] && !CHANNELS[channel].length)
      delete CHANNELS[channel];
  }
}

app.listen(9443);