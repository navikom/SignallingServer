const express = require('express'),
  expressApp = express(),
  socketio = require('socket.io'),
  http = require('http'),
  server = http.createServer(expressApp),
  uuid = require('node-uuid'),
  rooms = {};

const getKeys = function(object, value) {
  for(const key in object) {
    for(const kKey in object[key]) {
      if(object[key][kKey] === value) {
        return [key, kKey];
      }
    }
  }
  return null;
};
const run = function (config) {
  server.listen(config.PORT);
  console.log('Listening on', config.PORT);
  socketio.listen(server, {log: false})
    .on('connection', function (socket) {
      socket.on('init', function (data, fn) {
        const currentRoom = (data || {}).room || uuid.v4();
        const id = data.id;
        const room = rooms[currentRoom];
        if (!data.room) {
          rooms[currentRoom] = { [id]: socket };
          fn(currentRoom, id);
          console.log('Room created, with #', currentRoom);
        } else {
          if (!room) {
            return;
          }
          fn(currentRoom, id);
          for(const key in room) {
            room[key].emit('peer.connected', {id: id});
          }
          room[id] = socket;
          console.log('Peer connected to room', currentRoom, 'with #', id);
        }
      });

      socket.on('msg', function (data, fn) {
        const to = data.to;
        const currentRoom = data.room;
        if (rooms[currentRoom] && rooms[currentRoom][to]) {
          //console.log('Redirecting message to', to, 'by', data.by);
          rooms[currentRoom][to].emit('msg', data);
        } else {
          console.warn('Invalid user');
        }
        fn && fn();
      });

      socket.on('disconnect', function () {
        const keys = getKeys(rooms, socket);
        if (keys === null) {
          return;
        }
        const [currentRoom, id] = keys;
        delete rooms[currentRoom][id];
        for(const userId in rooms[currentRoom]) {
          rooms[currentRoom][userId] && rooms[currentRoom][userId].emit('peer.disconnected', {id: id});
        }
        if(Object.keys(rooms[currentRoom]).length === 0) {
          delete rooms[currentRoom];
        }
      });
    });
};

run({PORT: 9443});