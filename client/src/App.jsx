import { useEffect, useRef, useState } from 'react'
import useSound from 'use-sound'

import { io } from 'socket.io-client'

import { bb, bk, bn, bp, bq, br, wb, wk, wn, wp, wq, wr, move, check, capture, castle, gameOver } from './assets'
const icons = { bb, bk, bn, bp, bq, br, wb, wk, wn, wp, wq, wr }
const sounds = { move, check, capture, castle, gameOver }

const socket = await io.connect("http://localhost:3001")

function App() {
  const tableEnd = useRef(null)
  let dragged = ""
  const soundboard = {
    move: useSound(sounds.move)[0],
    check: useSound(sounds.check)[0],
    capture: useSound(sounds.capture)[0],
    castle: useSound(sounds.castle)[0],
    gameOver: useSound(sounds.gameOver)[0]
  }

  const [board, setBoard] = useState(Array(8).fill([null, null, null, null, null, null, null, null]))
  const [availableMoves, setAvailableMoves] = useState([])
  const [selectedSquare, setSelectedSquare] = useState('')
  const [turn, setTurn] = useState('')
  const [isCheck, setIsCheck] = useState(false)
  const [isGameOver, setIsGameOver] = useState([false, {
    isCheckmate: false,
    isDraw: false,
    isStalemate: false
  }])
  const [history, setHistory] = useState([])
  const [color, setColor] = useState('')
  const [gameId, setGameId] = useState('')
  const [status, setStatus] = useState('lobby')

  const getMoves = async (square) => {
    if (turn === color[0]) {
      let result = await fetch(`http://localhost:3001/moves?square=${square}&gameId=${gameId}`)
      let data = await result.json()
      let moves = data.moves.map(move => move.to)
      setAvailableMoves(moves)
    }
  }

  useEffect(() => {
    const handlePosition = (data) => {
      setBoard(data.position)
      setTurn(data.turn)
      setIsCheck(data.isCheck)
      setIsGameOver([data.isGameOver, {
        isCheckmate: data.isCheckmate,
        isDraw: data.isDraw,
        isStalemate: data.isStalemate
      }])
      setHistory(data.history)
    }

    const handleTerminate = () => {
      setStatus('lobby')
      setGameId('')
      setBoard(Array(8).fill([null, null, null, null, null, null, null, null]))
      setAvailableMoves([])
      setSelectedSquare('')
      setTurn('')
      setIsCheck(false)
      setIsGameOver([false, {
        isCheckmate: false,
        isDraw: false,
        isStalemate: false
      }])
      setHistory([])
      setColor('')
    }

    socket.on('position', handlePosition)
    socket.on('color', setColor)
    socket.on('status', setStatus)
    socket.on('terminate', handleTerminate)
    socket.on('gameId', setGameId)
    socket.on('disconnect', () => {
      handleTerminate()
    })

    return () => {
      socket.off('position', handlePosition)
      socket.off('color', setColor)
      socket.off('status', setStatus)
      socket.off('terminate', handleTerminate)
      socket.off('disconnect')

    }
  }, [])

  useEffect(() => {
    if (history.length > 0) {
      let lastMove = history[history.length - 1]
      soundboard[lastMove.type]()
    }
    setSelectedSquare('')
    setAvailableMoves([])
  }, [history])

  const movePiece = (move) => {
    if (turn === color[0]) {
      socket.emit('move', { gameId: gameId, move: move })
    }
  }

  //click
  const handleSquareClick = (e) => {
    let square = e.target.getAttribute('square')

    if (selectedSquare !== square) {
      if (availableMoves.includes(square)) {
        movePiece(`${selectedSquare}${square}`)
      } else {
        setSelectedSquare(square)
        getMoves(square)
      }
    } else {
      setSelectedSquare('')
      setAvailableMoves([])
    }
  }
  //drag and drop
  const handleDragStart = async (e) => {
    dragged = e.target.getAttribute('square')

    let square = dragged
    if (selectedSquare !== square) {
      setSelectedSquare(square)
      getMoves(square)
    }
  }
  const handleDrop = (e) => {
    let square = e.target.getAttribute('square')

    if (availableMoves.includes(square)) {
      movePiece(`${selectedSquare}${square}`)
    }
  }

  return (
    <div className='absolute flex flex-wrap gap-3 items-center justify-center h-full w-full select-none'>
      <div className='hidden absolute text-white top-0 left-0'>
        status: {status}<br />
        color: {color}<br />
        gameId: {gameId}<br />
        turn: {turn}
      </div>
      {chessBoard({ board: board, handleSquareClick: handleSquareClick, handleDragStart: handleDragStart, handleDrop: handleDrop, availableMoves: availableMoves, history: history, isCheck: isCheck, isGameOver: isGameOver, turn: turn, selectedSquare: selectedSquare, color: color})}
      {panel({ history: history, tableEnd: tableEnd, socket: socket, status: status, color: color, gameId: gameId })}
    </div>
  )
}

function chessBoard({board, handleSquareClick, handleDragStart, handleDrop, availableMoves, history, isCheck, isGameOver, turn, selectedSquare, color}) {
  let numToLetter = ["a", "b", "c", "d", "e", "f", "g", "h"]

  let boardArr = []

  for(let i = 0; i < board.length; i++) {
    let boardInd = (color === 'white' ? i : 7 - i)
    let row = board[boardInd]

    for(let j = 0; j < board.length; j++) {
      let rowInd = (color === 'white' ? j : 7 - j)
      let square = row[rowInd]

      let bgColor = (rowInd + boardInd) % 2 === 1 ? 'bg-[#739552]' : 'bg-[#EBECD0]'
      let textColor = (rowInd + boardInd) % 2 === 0 ? 'text-[#739552]' : 'text-[#EBECD0]'
      let coord = `${numToLetter[rowInd]}${8 - boardInd}`
      boardArr.push(
        <div onDrop={handleDrop} onDragOver={(e) => { e.preventDefault(); }} className={`relative square flex flex-col ${bgColor} ${textColor}`} square={coord} onClick={handleSquareClick}>
          {rowInd === (color === 'white' ? 0 : 7) && <div square={coord} className='absolute text-xs font-semibold left-[3%]'>{8 - boardInd}</div>}
          {boardInd === (color === 'white' ? 7 : 0) && <div square={coord} className='absolute text-xs font-semibold self-end right-[5%] top-[69%]'>{numToLetter[rowInd]}</div>}
          {square != null ?
            <img
              src={icons[`${square.color}${square.type}`]}
              square={coord}
              className='m-auto z-20 h-[90%] w-[90%]'
              onDragStart={handleDragStart}
              draggable="true"
            /> : ""
          }
          {squareUnderlay({ square: square, coord: coord, history: history, availableMoves: availableMoves, isCheck: isCheck, turn: turn, selectedSquare: selectedSquare })}
        </div>
      )
    }
  }

  return (
    <div id="board" className='relative grid-rows-8 grid-cols-8 grid grabbable text-black h-[500px] w-[500px]'>
      {boardArr}
      {isGameOver[0] && <div className='absolute bg-zinc-800 bg-opacity-80 h-full w-full flex items-center justify-center z-40'>
        <div className='font-light text-white text-center text-4xl'>
          Game Over: <br/>
          {isGameOver[1].isCheckmate ? 'Checkmate' : isGameOver[1].isDraw ? 'Draw' : isGameOver[1].isStalemate ? 'Stalemate' : ''}
        </div>
      </div>}
    </div>
  )
}

//highights squares and displays moves on the board
function squareUnderlay({ square, coord, history, availableMoves, isCheck, turn, selectedSquare }) {
  let availableMove = null
  let bg = ''
  if (availableMoves.includes(coord)) {
    if (square != null) {
      availableMove = <div style={{
        border: '4px solid black',
        borderRadius: '50%',
        height: '100%',
        width: '100%',
        opacity: '0.2'
      }}
        square={coord}
      />
    } else {
      availableMove = <div square={coord} className='rounded-full bg-black bg-opacity-20 h-[40%] w-[40%]' />
    }
  }

  if (history.length > 0) {
    let lastMove = history[history.length - 1]
    if (coord === lastMove.from || coord === lastMove.to) {
      bg = 'bg-yellow-300 bg-opacity-65'
    }
  }

  if (selectedSquare === coord && square != null) {
    bg = 'bg-yellow-300 bg-opacity-65'
  }

  if (square != null && square.type === 'k' && isCheck && square.color === turn) {
    bg = 'bg-red-600 bg-opacity-70'
  }

  return (
    <div square={coord} className={`absolute ${bg} z-10 w-full h-full flex items-center justify-center`}>
      {availableMove}
    </div>
  )
}

function controlPanel({ history, tableEnd, socket, status, gameId }) {
  return (
    <div className='h-[500px] gap-3 w-96 bg-zinc-700 bg-opacity-90 rounded-xl p-3 flex flex-col'>
      <div>
        <p>Opponent</p>
      </div>
      <div className='flex flex-col gap-3 grow justify-center'>
        <div ref={tableEnd} className='h-40 overflow-auto bg-zinc-900 bg-opacity-35 rounded-xl p-2 select-text'>
          <table className='w-3/5 table-auto'>
            {history.map((move, i) => {
              if (i % 2 === 0) {
                return (
                  <tr className='text-center  font-semibold text-sm'>
                    <td className='font-normal text-gray-400'>{i / 2 + 1}.</td>
                    <td>{move.san}</td>
                    <td>{history[i + 1]?.san}</td>
                  </tr>
                )
              } else {
                return
              }
            })}
          </table>
        </div>
        <div className='grid grid-cols-2 gap-2'>
          <button className='' onClick={() => {
            socket.emit('undo', gameId)
          }}>
            Undo
          </button>
          <button
            className='px-2'
            onClick={() => {
              socket.emit('reset', gameId)
            }}
          >Reset Game</button>
        </div>
        <button
          className='px-2'
          onClick={() => {
            socket.emit('leave', gameId)
          }}>
          Leave
        </button>
        {status === 'waiting' && <div>
          <p>Waiting for opponent to connect...</p>
        </div>}
        {status === 'ready' && <div className='text-xs text-gray-500'>
          <p>Connected to Room: <em className='text-emerald-700'>{gameId}</em></p>
        </div>}
      </div>
      <div>
        <p>You</p>
      </div>
    </div>
  )
}

function gameJoinPanel({ socket, status, color, gameId }) {

  return (
    <div className='h-[500px] gap-3 w-96 bg-zinc-700 bg-opacity-90 rounded-xl p-3 flex flex-col'>
      <div>
        <p className='text-center text-white text-2xl font-bold'>Game Lobby</p>
      </div>
      <div className='flex gap-2 text-sm'>
        <input required id="roomInput" className='grow py-1 px-2 rounded-lg' type='text' placeholder='Join or create a room by entering a code' />
        <button
          className='px-2'
          onClick={() => {
            if(!document.getElementById('roomInput').reportValidity()) {
              return
            }
            socket.emit('join', document.getElementById('roomInput').value)
          }}>
          Join
        </button>
        <button
          className='px-2 hidden'
          onClick={() => {
            socket.emit('leave', gameId)
          }}>
          Leave
        </button>
      </div>
      <div className='hidden'>
        <p>Color: {color}</p>
        <p>Status: {status}</p>
        <p>Game: {gameId}</p>
      </div>
    </div>
  )
}

//render the correct panel based on the game status
function panel({ history, tableEnd, socket, status, color, gameId }) {
  //note tableEnd is a ref, i didnt want to rename it cuz id have to refactor :)
  if (status === 'lobby' || status === 'fail') {
    return (gameJoinPanel({ socket: socket, status: status, color: color, gameId: gameId }))
  } else {
    return (controlPanel({ history: history, tableEnd: tableEnd, socket: socket, status: status, gameId: gameId }))
  }
}

export default App
