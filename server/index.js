const express = require('express')
const app = express()
const http = require('http')
const { Server } = require('socket.io')
const cors = require('cors')
app.use(cors())

const { Chess } = require('chess.js')

let x = 233

const server = http.createServer(app)

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
})

const sendPosition = (emitter, gameId) => {
  let moveType = 'move'
  if(!games[gameId]) {
    return
  }
  let chess = games[gameId].game
  
  if(chess.history().length > 0) {
    let lastMove = chess.history({verbose: true})[chess.history().length - 1]
    if(lastMove.flags.includes('k') || lastMove.flags.includes('q')) {
      moveType = 'castle'
    }
    if(lastMove.flags.includes('e') || lastMove.flags.includes('c')) {
      moveType = 'capture'
    }
    if(chess.inCheck()) {
      moveType = 'check'
    }
    if(chess.isGameOver()) {
      moveType = 'gameOver'
    }
  }

  emitter.emit('position',{
    position: chess.board(),
    turn: chess.turn(),
    history: chess.history({verbose: true}).map(move => {
      return {
        from: move.from,
        to: move.to,
        type: moveType,
        san: move.san
      }
    }),
    isCheck: chess.isCheck(),
    isCheckmate: chess.isCheckmate(),
    isDraw: chess.isDraw(),
    isStalemate: chess.isStalemate(),
    isGameOver: chess.isGameOver()
  })
}

const games = {}
const rooms = {}

io.on('connection', (socket) => {
  socket.on('join', (gameId) => {
    if(!games[gameId]) {
      socket.join(gameId)
      rooms[socket.id] = gameId
      socket.emit('gameId', gameId)
      //create new game
      games[gameId] = {
        game: new Chess(),
        numPlayers: 1,
        players: {
          host: socket.id,
          opponent: ''
        },
        status: 'waiting'
      }
      //assign color
      socket.emit('color', 'white')
      //send status to room
      io.to(gameId).emit('status','waiting')
      sendPosition(io.to(gameId), gameId)
    } else if(games[gameId]['numPlayers'] === 1){
      socket.join(gameId)
      rooms[socket.id] = gameId
      socket.emit('gameId', gameId)
      //join existing game
      games[gameId]['numPlayers'] = 2
      games[gameId]['players']['opponent'] = socket.id
      socket.emit('color', 'black')
      games[gameId].status = 'ready'
      //send status to room
      io.to(gameId).emit('status', 'ready')
      //start the game
      sendPosition(io.to(gameId), gameId)
    } else {
      socket.emit('status', 'fail')
    }
  })

  socket.on('move', (data) => {
    let gameId = data.gameId
    let move = data.move
    if(games[gameId].status === 'ready') {
      games[gameId].game.move(move)
      sendPosition(io.to(gameId), gameId)
    }
  })

  socket.on('reset', (gameId) => {
    if(games[gameId].status === 'ready') {
      games[gameId].game.reset()
      sendPosition(io.to(gameId), gameId)
    }
  })

  socket.on('undo', (gameId) => {
    if(games[gameId].status === 'ready') {
      games[gameId].game.undo()
      sendPosition(io.to(gameId), gameId)
    }
  })

  socket.on('leave', (gameId) => {
    //check if socket is host
    if(games[gameId].players.host === socket.id) {
      io.in(gameId).fetchSockets().then((sockets) => {
        for(let socket of sockets) {
          socket.leave(gameId)
          delete rooms[socket.id]
          socket.emit('terminate')
        }
      })
      delete games[gameId]
      //check is socket is player
    } else if (games[gameId].players.opponent === socket.id) {
      games[gameId]['numPlayers'] = 1
      games[gameId]['players']['opponent'] = ''
      games[gameId]['status'] = 'waiting'
      io.to(gameId).emit('status', 'waiting')
      delete rooms[socket.id]
      socket.leave(gameId)
      socket.emit('terminate')
    }
  })

  socket.on('disconnect', () => {
    //check if socket is in a room
    let gameId = ''
    if(rooms[socket.id]) {
      gameId = rooms[socket.id]
    }

    //if socket is in a room
    if(gameId !== '' && gameId) {
      console.log('gg', gameId)
      //if socket is a host
      if(games[gameId].players.host === socket.id) {
        //leave room and terminate the game
        io.to(gameId).emit('terminate')
        io.in(gameId).fetchSockets().then((sockets) => {
          for(let socket of sockets) {
            socket.leave(gameId)
            socket.emit('gameId', '')
          }
        })
        delete games[gameId]
      } else if(games[gameId].players.opponent === socket.id){
        games[gameId]['numPlayers'] = 1
        games[gameId]['players']['opponent'] = ''
        games[gameId]['status'] = 'waiting'
        io.to(gameId).emit('status', 'waiting')
        socket.leave(gameId)
      }
    }
  })
})

app.get('/moves', (req, res) => {
  let gameId = req.query.gameId
  if(games[gameId]?.status !== 'ready') {
    res.send({
      moves: [],
      error: 'Game not ready'
    })
    return
  }
  try {
    res.send({
      moves: games[req.query.gameId].game.moves({square: req.query.square, verbose: true})
    })
  } catch(err){
    res.send({
      moves: [],
      error: err.message
    })
  }
})

server.listen(3001, ()=>{
  console.log('Server is online')
})