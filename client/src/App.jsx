import { useEffect, useState } from 'react'
import useSound from 'use-sound'

import { io } from 'socket.io-client'

import { bb, bk, bn, bp, bq, br, wb, wk, wn, wp, wq, wr, move, check, capture, castle, gameOver} from './assets'
const icons = { bb, bk, bn, bp, bq, br, wb, wk, wn, wp, wq, wr}
const sounds = { move, check, capture, castle, gameOver}

const socket = io.connect("http://localhost:3001")
let numToLetter = ["a","b","c","d","e","f","g","h"]

function App() {
  let dragged = ""
  const [board, setBoard] = useState([])
  const [availableMoves, setAvailableMoves] = useState([])
  const [selectedSquare, setSelectedSquare] = useState('d')
  const [turn, setTurn] = useState('')
  const [isCheck, setIsCheck] = useState(false)
  const [isGameOver, setIsGameOver] = useState([false, {
    isCheckmate: false,
    isDraw: false,
    isStalemate: false
  }])
  const [history, setHistory] = useState([])

  const soundboard = {
    move: useSound(sounds.move)[0],
    check: useSound(sounds.check)[0],
    capture: useSound(sounds.capture)[0],
    castle: useSound(sounds.castle)[0],
    gameOver: useSound(sounds.gameOver)[0]
  }

  const getMoves = async (square) => {
    let result = await fetch(`http://localhost:3001/moves?square=${square}`)
    let data = await result.json()
    let moves = data.moves.map(move => move.to)
    setAvailableMoves(moves)
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
  
    socket.on('position', handlePosition)
  
    return () => {
      socket.off('position', handlePosition)
    }
  }, [])

  useEffect(() => {
    if(history.length > 0) {
      let lastMove = history[history.length-1]
      soundboard[lastMove.type]()
    }
  }, [history])

  //click
  const handleSquareClick = (e) => {
    let square = e.target.getAttribute('square')

    if(selectedSquare !== square) {
      if(availableMoves.includes(square)) {
        socket.emit('move', `${selectedSquare}${square}`)
        setSelectedSquare('')
        setAvailableMoves([])
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
    if(selectedSquare !== square) {
      setSelectedSquare(square)
      getMoves(square)
    }
  }
  const handleDrop = (e) => {
    e.preventDefault()

    let square = e.target.getAttribute('square')

    if(availableMoves.includes(square)) {
      socket.emit('move', `${selectedSquare}${square}`)
      setSelectedSquare('')
      setAvailableMoves([])
    }
  }

  return (
    <div className='absolute flex flex-col items-center justify-center h-full w-full select-none'>
      <div id="board" className='grid-rows-8 grid-cols-8 grid text-black h-[400px] w-[400px]'>
        {board.map((row, i) => row.map((square, j) => {
          let bgColor = (i+j)%2 === 1 ? 'bg-[#739552]' : 'bg-[#EBECD0]'
          let textColor = (i+j)%2 === 0 ? 'text-[#739552]' : 'text-[#EBECD0]'
          return(
              <div onDrop={handleDrop} onDragOver={(e) => {e.preventDefault()}} className={`relative square cursor-pointer flex flex-col ${bgColor} ${textColor}`} square={`${numToLetter[j]}${8-i}`} onClick={handleSquareClick}>
                {j===0 && <div square={`${numToLetter[j]}${8-i}`} className='absolute text-xs font-semibold left-[3%]'>{8-i}</div>}
                {i===7 && <div square={`${numToLetter[j]}${8-i}`} className='absolute text-xs font-semibold self-end right-[5%] top-[69%]'>{numToLetter[j]}</div>}
                {square != null ? 
                  <img 
                    src={icons[`${square.color}${square.type}`]} 
                    square={`${numToLetter[j]}${8-i}`} 
                    className='m-auto z-20 h-[90%] w-[90%]'
                    onDragStart={handleDragStart}
                    draggable="true"
                    /> : ""
                }
                {squareUnderlay({square: square, coord: `${numToLetter[j]}${8-i}`, history: history, availableMoves: availableMoves, isCheck: isCheck, turn: turn, selectedSquare: selectedSquare})}
              </div>
            )
        }))}
        {isGameOver[0] && <div className='absolute bg-white font-black m-20 z-40'>
          game over: {isGameOver[1].isCheckmate ? 'checkmate' : isGameOver[1].isDraw ? 'draw' : isGameOver[1].isStalemate ? 'stalemate' : ''}
        </div>}
      </div>
      <button 
        className='w-[400px]'
        onClick={() => {
          socket.emit('reset')
          setAvailableMoves([])
        }}
      >reset</button>
    </div>
  )
}


function squareUnderlay({square, coord, history, availableMoves, isCheck, turn, selectedSquare}){
  let availableMove = null
  let bg = ''
  if(availableMoves.includes(coord)) {
    if(square != null) {
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
      availableMove = <div square={coord} className='rounded-full bg-black bg-opacity-20 h-[40%] w-[40%]'/>
    }
  }

  if(history.length > 0) {
    let lastMove = history[history.length-1]
    if(coord === lastMove.from || coord === lastMove.to) {
      bg='bg-yellow-300 bg-opacity-65'
    }
  }
  
  if(selectedSquare === coord && square != null) {
    bg='bg-yellow-300 bg-opacity-65'
  }

  if(square != null && square.type === 'k' && isCheck && square.color===turn) {
    bg='bg-red-600 bg-opacity-70'
  }

  return (
    <div square={coord} className={`absolute ${bg} z-10 w-full h-full flex items-center justify-center`}>
      {availableMove}
    </div>
  )
}

export default App
