function initSocket(io) {
  io.on('connection', (socket) => {
    socket.on('room:join', ({ userId }) => {
      if (userId) socket.join(String(userId))
    })
  })
}

function emitToUser(io, userId, event, payload) {
  if (!io || !userId) return
  io.to(String(userId)).emit(event, payload)
}

module.exports = { initSocket, emitToUser }

