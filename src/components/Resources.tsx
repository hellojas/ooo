import { useState } from 'react'
import { Coffee } from './Coffee'
import { Jawn } from './Jawn'

const SECTIONS = [['coffee', 'Coffee shops'], ['jawn', 'Jawn']] as const

/** Reference material. Coffee shops is one section; Links is a single screen of the real deep links. */
export function Resources() {
  const [sec, setSec] = useState<(typeof SECTIONS)[number][0]>('coffee')
  return (
    <>
      <div className="subtabs" role="group" aria-label="Play">
        {SECTIONS.map(([id, label]) => <button key={id} aria-pressed={sec === id} onClick={() => setSec(id)}>{label}</button>)}
      </div>
      {sec === 'coffee' && <Coffee />}
      {sec === 'jawn' && <Jawn />}
    </>
  )
}
