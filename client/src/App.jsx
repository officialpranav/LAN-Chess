import { useEffect, useState } from 'react'
import './App.css'

import { io } from 'socket.io-client'

import { bb, bk, bn, bp, bq, br, wb, wk, wn, wp, wq, wr} from './assets'
const icons = { bb, bk, bn, bp, bq, br, wb, wk, wn, wp, wq, wr}

const socket = io.connect("http://localhost:3001")
let numToLetter = ["a","b","c","d","e","f","g","h"]
let i = 0
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

  const getMoves = async (square) => {
    let result = await fetch(`http://localhost:3001/moves?square=${square}`)
    let data = await result.json()
    let moves = data.moves.map(move => move.to)
    setAvailableMoves(moves)
  }

  socket.once('position', (data) => {
    setBoard(data.position)
    setTurn(data.turn)
    setIsCheck(data.isCheck)
    setIsGameOver([data.isGameOver, {
      isCheckmate: data.isCheckmate,
      isDraw: data.isDraw,
      isStalemate: data.isStalemate
    }])
    i++
    console.log(i)
    setHistory(data.history)
  })

  const handleSquareClick = async (e) => {
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
                {(square != null && square.type === 'k' && isCheck && square.color===turn) && <div square={`${numToLetter[j]}${8-i}`} className='absolute bg-red-600 bg-opacity-70 h-full w-full z-10'/>}
                {availableMoves.includes(`${numToLetter[j]}${8-i}`) && <div square={`${numToLetter[j]}${8-i}`} className='absolute bg-black bg-opacity-50 h-full w-full z-20'/>}
                {lastMoveOverlay({square: `${numToLetter[j]}${8-i}`})}
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
        }}
      >reset</button>
    </div>
  )
}

function lastMoveOverlay({square}){
  if(history.length > 0) {
    if(square === history.from || square === history.to) {
      console.log(square)
      return(
        <div className='absolute bg-yellow-300 bg-opacity-70 h-full w-full z-20'/>
      )

    }
  }
}

export default App
