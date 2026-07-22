'use client'

import {useEffect,useState} from 'react'
import {createPortal} from 'react-dom'
import {supabase} from '../lib/supabase'

export default function PlayAgainControl(){
  const [target,setTarget]=useState<Element|null>(null)
  const [visible,setVisible]=useState(false)
  const [host,setHost]=useState(false)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')

  useEffect(()=>{
    let active=true
    const sync=async()=>{
      const roomId=localStorage.getItem('mafia-room')
      const modalTarget=document.querySelector('.resultModal .modalActions')
      setTarget(modalTarget)
      if(!roomId||!modalTarget){setVisible(false);setHost(false);return}
      const session=(await supabase.auth.getSession()).data.session
      if(!session){setVisible(false);setHost(false);return}
      const {data}=await supabase.from('rooms').select('status,host_id').eq('id',roomId).maybeSingle()
      if(!active)return
      setVisible(data?.status==='finished')
      setHost(data?.host_id===session.user.id)
    }
    sync()
    const timer=window.setInterval(sync,700)
    return()=>{active=false;window.clearInterval(timer)}
  },[])

  if(!visible||!target)return null

  const restart=async()=>{
    const roomId=localStorage.getItem('mafia-room')
    if(!roomId||busy)return
    setBusy(true)
    setError('')
    const {error}=await supabase.rpc('restart_game',{p_room:roomId})
    if(error)setError(error.message.includes('HOST_ONLY')?'Только ведущий может начать новую игру':error.message)
    setBusy(false)
  }

  return createPortal(
    <>
      {host?<button className="primary playAgainButton" disabled={busy} onClick={restart}>{busy?'Подготавливаем лобби...':'🔁 Играть снова'}</button>:<div className="playAgainWaiting">Ожидаем, когда ведущий запустит новую игру</div>}
      {error&&<div className="notice playAgainError">{error}</div>}
    </>,
    target
  )
}
