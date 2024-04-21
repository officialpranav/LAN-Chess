const express = require('express')
const app = express()
const http = require('http')
const { Server } = require('socket.io')
const cors = require('cors')
app.use(cors())

const { Chess } = require('chess.js')


const server = http.createServer(app)

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
})

const chess = new Chess()

const sendPosition = (emitter) => {
  let moveType = 'move'
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

io.on('connection', (socket) => {
  sendPosition(socket)

  socket.on('move', (move) => {
    chess.move(move)
    sendPosition(io)
  })

  socket.on('reset', () => {
    chess.reset()
    sendPosition(io)
  })

  socket.on('undo', () => {
    chess.undo()
    sendPosition(io)
  })
})

app.get('/moves', (req, res) => {
  res.send({
    moves: chess.moves({square: req.query.square, verbose: true})
  })
})

server.listen(3001, ()=>{
  console.log('Server is online')
})