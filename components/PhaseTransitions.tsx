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

function tone(ctx:AudioContext,frequency:number,start:number,duration:number,volume=.12,type:OscillatorType='sine',endFrequency?:number){
  const oscillator=ctx.createOscillator()
  const gain=ctx.createGain()
  oscillator.type=type
  oscillator.frequency.setValueAtTime(frequency,start)
  if(endFrequency)oscillator.frequency.exponentialRampToValueAtTime(Math.max(20,endFrequency),start+duration)
  gain.gain.setValueAtTime(.0001,start)
  gain.gain.exponentialRampToValueAtTime(volume,start+.025)
  gain.gain.exponentialRampToValueAtTime(.0001,start+duration)
  oscillator.connect(gain).connect(ctx.destination)
  oscillator.start(start)
  oscillator.stop(start+duration+.03)
}

function noise(ctx:AudioContext,start:number,duration:number,volume=.1){
  const length=Math.max(1,Math.floor(ctx.sampleRate*duration))
  const buffer=ctx.createBuffer(1,length,ctx.sampleRate)
  const data=buffer.getChannelData(0)
  for(let i=0;i<length;i++)data[i]=(Math.random()*2-1)*(1-i/length)
  const source=ctx.createBufferSource()
  const filter=ctx.createBiquadFilter()
  const gain=ctx.createGain()
  source.buffer=buffer
  filter.type='lowpass'
  filter.frequency.value=650
  gain.gain.setValueAtTime(volume,start)
  gain.gain.exponentialRampToValueAtTime(.0001,start+duration)
  source.connect(filter).connect(gain).connect(ctx.destination)
  source.start(start)
}

function playSound(ctx:AudioContext,kind:string,violent:boolean){
  if(ctx.state==='suspended')void ctx.resume()
  const now=ctx.currentTime+.03
  if(kind==='reveal'){
    tone(ctx,110,now,1.15,.16,'sawtooth',52)
    tone(ctx,220,now+.18,.85,.1,'sine',440)
    noise(ctx,now,.5,.06)
  }else if(kind==='night'){
    tone(ctx,82,now,2.4,.18,'sine',48)
    tone(ctx,123,now+.15,1.8,.08,'triangle',62)
    noise(ctx,now,.9,.055)
  }else if(kind==='dawn'){
    tone(ctx,196,now,.8,.1,'sine',392)
    tone(ctx,247,now+.16,.9,.1,'sine',494)
    tone(ctx,330,now+.32,1.05,.12,'triangle',660)
  }else if(kind==='discussion'){
    tone(ctx,330,now,.28,.11,'triangle',440)
    tone(ctx,440,now+.18,.38,.09,'sine',550)
  }else if(kind==='voting'){
    ;[0,.72,1.44].forEach((delay,index)=>{
      tone(ctx,index===2?105:82,now+delay,.25,index===2?.22:.16,'square',45)
      noise(ctx,now+delay,.16,index===2?.13:.08)
    })
  }else if(kind==='finished'){
    ;[262,330,392,523].forEach((frequency,index)=>tone(ctx,frequency,now+index*.15,1.25,.1,'triangle',frequency*1.05))
  }
  if(violent){
    tone(ctx,72,now+.08,.7,.28,'sawtooth',28)
    noise(ctx,now+.08,.48,.22)
  }
}

export default function PhaseTransitions(){
  const [active,setActive]=useState<Transition|null>(null)
  const [result,setResult]=useState('')
  const [muted,setMuted]=useState(false)
  const mutedRef=useRef(false)
  const audioRef=useRef<AudioContext|null>(null)
  const lastPhase=useRef('')
  const currentRoom=useRef('')
  const hideTimer=useRef<number|undefined>(undefined)
  const channelRef=useRef<any>(null)
  const pollTimer=useRef<number|undefined>(undefined)
  const connectTimer=useRef<number|undefined>(undefined)

  useEffect(()=>{
    const saved=localStorage.getItem('mafia-sound-muted')==='1'
    setMuted(saved)
    mutedRef.current=saved
    const unlock=()=>{
      if(!audioRef.current)audioRef.current=new AudioContext()
      if(audioRef.current.state==='suspended')void audioRef.current.resume()
    }
    window.addEventListener('pointerdown',unlock,{once:false,passive:true})
    window.addEventListener('keydown',unlock,{once:false})
    return()=>{
      window.removeEventListener('pointerdown',unlock)
      window.removeEventListener('keydown',unlock)
      void audioRef.current?.close()
    }
  },[])

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

      if(!mutedRef.current&&audioRef.current){
        try{playSound(audioRef.current,transition.kind,violent)}catch{}
      }

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
      if(initialize&&!lastPhase.current){lastPhase.current=response.data.status||'';return}
      show(response.data.status,response.data.last_result)
    }

    const disconnect=async()=>{
      if(channelRef.current){await supabase.removeChannel(channelRef.current);channelRef.current=null}
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
        .on('postgres_changes',{event:'UPDATE',schema:'public',table:'rooms',filter:`id=eq.${roomId}`},(payload:any)=>show(payload.new?.status,payload.new?.last_result))
        .subscribe()
      pollTimer.current=window.setInterval(()=>fetchStatus(roomId),1500)
    }

    const discoverRoom=()=>{
      const roomId=localStorage.getItem('mafia-room')||''
      if(roomId&&roomId!==currentRoom.current)connectToRoom(roomId)
      if(!roomId&&currentRoom.current){currentRoom.current='';lastPhase.current='';disconnect()}
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

  const toggleSound=()=>{
    const next=!muted
    setMuted(next)
    mutedRef.current=next
    localStorage.setItem('mafia-sound-muted',next?'1':'0')
    if(!next){
      if(!audioRef.current)audioRef.current=new AudioContext()
      void audioRef.current.resume()
      tone(audioRef.current,440,audioRef.current.currentTime+.02,.18,.08,'sine',660)
    }
  }

  return <>
    <button className="phaseSoundToggle" onClick={toggleSound} aria-label={muted?'Включить звуки':'Выключить звуки'} title={muted?'Включить звуки':'Выключить звуки'}>{muted?'🔇':'🔊'}</button>
    {active&&<div key={`${active.phase}-${Date.now()}`} className={`phaseTransition phase-${active.kind}`} aria-live="assertive">
      <div className="phaseBackdrop"/><div className="phaseRays"/><div className="phaseFog"/><div className="phaseStars"/><div className="phaseParticles"/>
      <div className="phaseCity"><span/><span/><span/><span/><span/><span/><span/></div>
      <div className="phaseContent">
        <div className="phaseIconRing"><div className="phaseIcon">{active.icon}</div></div>
        {active.kind==='voting'&&<div className="phaseCountdown"><i>3</i><i>2</i><i>1</i></div>}
        <div className="phaseEyebrow">Новая фаза</div><h1>{active.title}</h1>
        <p>{active.kind==='dawn'&&result?result:active.subtitle}</p><div className="phaseLine"/>
      </div>
    </div>}
  </>
}