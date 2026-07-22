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
  voting:{phase:'voting',title:'Начинается голосование',subtitle:'Решение города будет окончательным.',icon:'⏳',kind:'voting'},
  finished:{phase:'finished',title:'Партия завершена',subtitle:'Город сделал свой последний выбор.',icon:'🏆',kind:'finished'}
}

export default function PhaseTransitions(){
  const [active,setActive]=useState<Transition|null>(null)
  const lastPhase=useRef<string>('')
  const hideTimer=useRef<number|undefined>(undefined)

  useEffect(()=>{
    let channel:any
    let cancelled=false

    const show=(status:string,lastResult?:string|null)=>{
      if(!status||status===lastPhase.current)return
      const first=!lastPhase.current
      lastPhase.current=status
      if(first)return

      const transition=transitions[status]
      if(!transition)return

      window.clearTimeout(hideTimer.current)
      setActive(transition)

      const violent=Boolean(lastResult&&/(погиб|убит|устран|исключ|жертв|казн)/i.test(lastResult))
      if(violent){
        document.documentElement.classList.remove('phase-impact')
        requestAnimationFrame(()=>document.documentElement.classList.add('phase-impact'))
        window.setTimeout(()=>document.documentElement.classList.remove('phase-impact'),700)
      }

      hideTimer.current=window.setTimeout(()=>setActive(null),status==='voting'?2100:1900)
    }

    const connect=async()=>{
      const roomId=localStorage.getItem('mafia-room')
      if(!roomId)return
      const initial=await supabase.from('rooms').select('status,last_result').eq('id',roomId).maybeSingle()
      if(cancelled)return
      if(initial.data?.status)lastPhase.current=initial.data.status

      channel=supabase.channel(`phase-transitions-${roomId}`)
        .on('postgres_changes',{event:'UPDATE',schema:'public',table:'rooms',filter:`id=eq.${roomId}`},(payload:any)=>{
          show(payload.new?.status,payload.new?.last_result)
        })
        .subscribe()
    }

    connect()
    return()=>{
      cancelled=true
      window.clearTimeout(hideTimer.current)
      document.documentElement.classList.remove('phase-impact')
      if(channel)supabase.removeChannel(channel)
    }
  },[])

  if(!active)return null

  return <div className={`phaseTransition phase-${active.kind}`} aria-live="assertive">
    <div className="phaseBackdrop"/>
    <div className="phaseStars"/>
    <div className="phaseCity">
      <span/><span/><span/><span/><span/><span/><span/>
    </div>
    <div className="phaseContent">
      <div className="phaseIcon">{active.icon}</div>
      {active.kind==='voting'&&<div className="phaseCountdown"><i>3</i><i>2</i><i>1</i></div>}
      <div className="phaseEyebrow">Новая фаза</div>
      <h1>{active.title}</h1>
      <p>{active.subtitle}</p>
      <div className="phaseLine"/>
    </div>
  </div>
}
