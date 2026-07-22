'use client'

import {useEffect,useRef,useState} from 'react'
import {supabase} from '../lib/supabase'

type Phase='role_reveal'|'night'|'morning'|'discussion'|'voting'|'finished'|string

type Transition={phase:Phase,title:string,subtitle:string,icon:string,kind:string}

const transitions:Record<string,Transition>={
  role_reveal:{phase:'role_reveal',title:'Роли распределены',subtitle:'Запомните свою сторону. Никому не доверяйте.',icon:'🎭',kind:'reveal'},
  night:{phase:'night',title:'Город засыпает',subtitle:'Просыпаются те, кто действует во тьме.',icon:'🌙',kind:'night'},
  morning:{phase:'morning',title:'Наступает рассвет',subtitle:'Город узнаёт, что произошло этой ночью.',icon:'🌅',kind:'dawn'},
  discussion:{phase:'discussion',title:'Время обсуждения',subtitle:'Ищите противоречия. Слушайте внимательно.',icon:'💬',kind:'discussion'},
  voting:{phase:'voting',title:'Начинается голосование',subtitle:'Решение города будет окончательным.',icon:'🗳️',kind:'voting'},
  finished:{phase:'finished',title:'Партия завершена',subtitle:'Город сделал свой последний выбор.',icon:'🏆',kind:'finished'}
}

export default function PhaseTransitions(){
  const [active,setActive]=useState<Transition|null>(null)
  const [result,setResult]=useState('')
  const lastPhase=useRef('')
  const currentRoom=useRef('')
  const hideTimer=useRef<number|undefined>(undefined)
  const channelRef=useRef<any>(null)
  const pollTimer=useRef<number|undefined>(undefined)
  const connectTimer=useRef<number|undefined>(undefined)

  useEffect(()=>{
    let cancelled=false

    const show=(status:string,lastResult?:string|null)=>{
      if(!status||status===lastPhase.current)return
      const first=!lastPhase.current
      lastPhase.current=status
      if(first)return

      const transition=transitions[status]
      if(!transition)return

      window.clearTimeout(hideTimer.current)
      setResult(lastResult||'')
      setActive({...transition})

      const violent=Boolean(lastResult&&/(погиб|убит|устран|исключ|жертв|казн)/i.test(lastResult))
      if(violent){
        document.documentElement.classList.remove('phase-impact')
        requestAnimationFrame(()=>document.documentElement.classList.add('phase-impact'))
        window.setTimeout(()=>document.documentElement.classList.remove('phase-impact'),1100)
      }

      hideTimer.current=window.setTimeout(()=>setActive(null),status==='voting'?4200:3600)
    }

    const fetchStatus=async(roomId:string,initialize=false)=>{
      const response=await supabase.from('rooms').select('status,last_result').eq('id',roomId).maybeSingle()
      if(cancelled||!response.data)return
      if(initialize&&!lastPhase.current){
        lastPhase.current=response.data.status||''
        return
      }
      show(response.data.status,response.data.last_result)
    }

    const disconnect=async()=>{
      if(channelRef.current){
        await supabase.removeChannel(channelRef.current)
        channelRef.current=null
      }
      window.clearInterval(pollTimer.current)
    }

    const connectToRoom=async(roomId:string)=>{
      if(!roomId||roomId===currentRoom.current)return
      await disconnect()
      currentRoom.current=roomId
      lastPhase.current=''
      await fetchStatus(roomId,true)
      if(cancelled)return

      channelRef.current=supabase.channel(`phase-transitions-${roomId}-${Date.now()}`)
        .on('postgres_changes',{event:'UPDATE',schema:'public',table:'rooms',filter:`id=eq.${roomId}`},(payload:any)=>{
          show(payload.new?.status,payload.new?.last_result)
        })
        .subscribe()

      pollTimer.current=window.setInterval(()=>fetchStatus(roomId),1500)
    }

    const discoverRoom=()=>{
      const roomId=localStorage.getItem('mafia-room')||''
      if(roomId&&roomId!==currentRoom.current)connectToRoom(roomId)
      if(!roomId&&currentRoom.current){
        currentRoom.current=''
        lastPhase.current=''
        disconnect()
      }
    }

    discoverRoom()
    connectTimer.current=window.setInterval(discoverRoom,400)
    window.addEventListener('storage',discoverRoom)
    window.addEventListener('mafia-room-changed',discoverRoom as EventListener)

    return()=>{
      cancelled=true
      window.clearTimeout(hideTimer.current)
      window.clearInterval(connectTimer.current)
      window.clearInterval(pollTimer.current)
      document.documentElement.classList.remove('phase-impact')
      window.removeEventListener('storage',discoverRoom)
      window.removeEventListener('mafia-room-changed',discoverRoom as EventListener)
      if(channelRef.current)supabase.removeChannel(channelRef.current)
    }
  },[])

  if(!active)return null

  return <div key={`${active.phase}-${Date.now()}`} className={`phaseTransition phase-${active.kind}`} aria-live="assertive">
    <div className="phaseBackdrop"/>
    <div className="phaseRays"/>
    <div className="phaseFog"/>
    <div className="phaseStars"/>
    <div className="phaseParticles"/>
    <div className="phaseCity"><span/><span/><span/><span/><span/><span/><span/></div>
    <div className="phaseContent">
      <div className="phaseIconRing"><div className="phaseIcon">{active.icon}</div></div>
      {active.kind==='voting'&&<div className="phaseCountdown"><i>3</i><i>2</i><i>1</i></div>}
      <div className="phaseEyebrow">Новая фаза</div>
      <h1>{active.title}</h1>
      <p>{active.kind==='dawn'&&result?result:active.subtitle}</p>
      <div className="phaseLine"/>
    </div>
  </div>
}