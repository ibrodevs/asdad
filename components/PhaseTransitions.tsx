'use client'

import {useEffect,useRef,useState} from 'react'
import {supabase} from '../lib/supabase'

type Phase='role_reveal'|'night'|'morning'|'discussion'|'voting'|'finished'|string
type Transition={phase:Phase,title:string,subtitle:string,icon:string,kind:string}
type AudioBus={master:GainNode,dry:GainNode,wet:GainNode,reverb:ConvolverNode}

const transitions:Record<string,Transition>={
  role_reveal:{phase:'role_reveal',title:'Роли распределены',subtitle:'Запомните свою сторону. Никому не доверяйте.',icon:'🎭',kind:'reveal'},
  night:{phase:'night',title:'Город засыпает',subtitle:'Просыпаются те, кто действует во тьме.',icon:'🌙',kind:'night'},
  morning:{phase:'morning',title:'Наступает рассвет',subtitle:'Город узнаёт, что произошло этой ночью.',icon:'🌅',kind:'dawn'},
  discussion:{phase:'discussion',title:'Время обсуждения',subtitle:'Ищите противоречия. Слушайте внимательно.',icon:'💬',kind:'discussion'},
  voting:{phase:'voting',title:'Начинается голосование',subtitle:'Решение города будет окончательным.',icon:'🗳️',kind:'voting'},
  finished:{phase:'finished',title:'Партия завершена',subtitle:'Город сделал свой последний выбор.',icon:'🏆',kind:'finished'}
}

function createImpulse(ctx:AudioContext,duration=2.8,decay=3.2){
  const length=Math.floor(ctx.sampleRate*duration)
  const impulse=ctx.createBuffer(2,length,ctx.sampleRate)
  for(let channel=0;channel<2;channel++){
    const data=impulse.getChannelData(channel)
    for(let i=0;i<length;i++)data[i]=(Math.random()*2-1)*Math.pow(1-i/length,decay)
  }
  return impulse
}

function createBus(ctx:AudioContext):AudioBus{
  const master=ctx.createGain()
  const compressor=ctx.createDynamicsCompressor()
  const dry=ctx.createGain()
  const wet=ctx.createGain()
  const reverb=ctx.createConvolver()
  master.gain.value=.78
  dry.gain.value=.88
  wet.gain.value=.32
  compressor.threshold.value=-20
  compressor.knee.value=18
  compressor.ratio.value=4
  compressor.attack.value=.006
  compressor.release.value=.28
  reverb.buffer=createImpulse(ctx)
  dry.connect(master)
  wet.connect(reverb).connect(master)
  master.connect(compressor).connect(ctx.destination)
  return {master,dry,wet,reverb}
}

function envelope(gain:GainNode,start:number,duration:number,peak:number,attack=.08,release=.5){
  gain.gain.cancelScheduledValues(start)
  gain.gain.setValueAtTime(.0001,start)
  gain.gain.exponentialRampToValueAtTime(Math.max(.0002,peak),start+attack)
  gain.gain.setValueAtTime(Math.max(.0002,peak*.86),Math.max(start+attack,start+duration-release))
  gain.gain.exponentialRampToValueAtTime(.0001,start+duration)
}

function tone(ctx:AudioContext,bus:AudioBus,frequency:number,start:number,duration:number,volume=.1,type:OscillatorType='sine',endFrequency?:number,wet=.28,detune=0){
  const oscillator=ctx.createOscillator()
  const gain=ctx.createGain()
  oscillator.type=type
  oscillator.detune.value=detune
  oscillator.frequency.setValueAtTime(Math.max(20,frequency),start)
  if(endFrequency)oscillator.frequency.exponentialRampToValueAtTime(Math.max(20,endFrequency),start+duration)
  envelope(gain,start,duration,volume,Math.min(.18,duration*.18),Math.min(.85,duration*.32))
  oscillator.connect(gain)
  gain.connect(bus.dry)
  const send=ctx.createGain();send.gain.value=wet;gain.connect(send).connect(bus.wet)
  oscillator.start(start);oscillator.stop(start+duration+.08)
}

function chord(ctx:AudioContext,bus:AudioBus,frequencies:number[],start:number,duration:number,volume=.055,type:OscillatorType='sine',wet=.48){
  frequencies.forEach((frequency,index)=>{
    tone(ctx,bus,frequency,start+index*.018,duration,volume,type,undefined,wet,index%2===0?-4:4)
    tone(ctx,bus,frequency*2,start+index*.018,duration,volume*.22,'sine',undefined,wet+.08,index%2===0?3:-3)
  })
}

function noise(ctx:AudioContext,bus:AudioBus,start:number,duration:number,volume=.04,filterFrequency=900,filterType:BiquadFilterType='lowpass',wet=.35){
  const length=Math.max(1,Math.floor(ctx.sampleRate*duration))
  const buffer=ctx.createBuffer(2,length,ctx.sampleRate)
  for(let channel=0;channel<2;channel++){
    const data=buffer.getChannelData(channel)
    for(let i=0;i<length;i++)data[i]=(Math.random()*2-1)
  }
  const source=ctx.createBufferSource()
  const filter=ctx.createBiquadFilter()
  const gain=ctx.createGain()
  source.buffer=buffer
  filter.type=filterType
  filter.frequency.setValueAtTime(filterFrequency,start)
  if(filterType==='lowpass')filter.frequency.exponentialRampToValueAtTime(Math.max(120,filterFrequency*.55),start+duration)
  envelope(gain,start,duration,volume,Math.min(.3,duration*.18),Math.min(1.1,duration*.38))
  source.connect(filter).connect(gain)
  gain.connect(bus.dry)
  const send=ctx.createGain();send.gain.value=wet;gain.connect(send).connect(bus.wet)
  source.start(start);source.stop(start+duration+.04)
}

function bell(ctx:AudioContext,bus:AudioBus,frequency:number,start:number,volume=.08,duration=1.7){
  tone(ctx,bus,frequency,start,duration,volume,'sine',undefined,.7)
  tone(ctx,bus,frequency*2.01,start,duration*.72,volume*.34,'sine',undefined,.75)
  tone(ctx,bus,frequency*3.98,start,duration*.42,volume*.15,'sine',undefined,.78)
}

function playSound(ctx:AudioContext,bus:AudioBus,kind:string,violent:boolean){
  if(ctx.state==='suspended')void ctx.resume()
  const now=ctx.currentTime+.05

  if(kind==='reveal'){
    noise(ctx,bus,now,3.2,.028,1600,'bandpass',.65)
    tone(ctx,bus,58,now,3.35,.1,'sine',42,.55)
    chord(ctx,bus,[110,164.81,220],now+.18,2.75,.045,'triangle',.62)
    bell(ctx,bus,329.63,now+.72,.07,2.1)
    bell(ctx,bus,440,now+1.18,.055,1.8)
  }else if(kind==='night'){
    noise(ctx,bus,now,3.55,.035,520,'lowpass',.52)
    tone(ctx,bus,43.65,now,3.5,.13,'sine',32.7,.58)
    tone(ctx,bus,65.41,now+.12,3.15,.055,'triangle',49,.62)
    chord(ctx,bus,[87.31,130.81,174.61],now+.38,2.7,.03,'sine',.7)
    bell(ctx,bus,261.63,now+1.25,.035,1.7)
  }else if(kind==='dawn'){
    noise(ctx,bus,now,3.25,.02,2600,'highpass',.55)
    chord(ctx,bus,[130.81,164.81,196],now,3.15,.045,'sine',.62)
    ;[261.63,329.63,392,523.25].forEach((frequency,index)=>bell(ctx,bus,frequency,now+.32+index*.36,.055-index*.004,1.9))
    tone(ctx,bus,196,now+.3,2.7,.04,'triangle',392,.55)
  }else if(kind==='discussion'){
    chord(ctx,bus,[146.83,185,220],now,2.8,.035,'triangle',.48)
    bell(ctx,bus,440,now+.12,.065,1.45)
    bell(ctx,bus,554.37,now+.48,.05,1.55)
    noise(ctx,bus,now+.05,2.2,.018,1800,'bandpass',.35)
  }else if(kind==='voting'){
    tone(ctx,bus,49,now,3.5,.07,'sine',38,.45)
    noise(ctx,bus,now,3.3,.024,420,'lowpass',.42)
    ;[0,.9,1.8].forEach((delay,index)=>{
      const t=now+delay
      tone(ctx,bus,index===2?65.41:55,t,.68,index===2?.16:.12,'sine',30,.38)
      tone(ctx,bus,index===2?130.81:110,t,.42,index===2?.07:.05,'triangle',70,.45)
      noise(ctx,bus,t,.42,index===2?.075:.05,900,'lowpass',.32)
    })
    chord(ctx,bus,[98,146.83,196],now+2.28,1.25,.04,'sawtooth',.42)
  }else if(kind==='finished'){
    noise(ctx,bus,now,3.35,.018,3000,'highpass',.65)
    chord(ctx,bus,[130.81,164.81,196],now,3.35,.043,'sine',.68)
    ;[261.63,329.63,392,523.25,659.25].forEach((frequency,index)=>bell(ctx,bus,frequency,now+.16+index*.3,.055,2.05-index*.1))
    chord(ctx,bus,[261.63,329.63,392],now+1.35,1.9,.038,'triangle',.72)
  }

  if(violent){
    tone(ctx,bus,46.25,now+.06,1.35,.19,'sine',24,.42)
    tone(ctx,bus,92.5,now+.08,.85,.09,'sawtooth',38,.28)
    noise(ctx,bus,now+.04,.95,.12,700,'lowpass',.34)
  }
}

export default function PhaseTransitions(){
  const [active,setActive]=useState<Transition|null>(null)
  const [result,setResult]=useState('')
  const [muted,setMuted]=useState(false)
  const mutedRef=useRef(false)
  const audioRef=useRef<AudioContext|null>(null)
  const busRef=useRef<AudioBus|null>(null)
  const lastPhase=useRef('')
  const currentRoom=useRef('')
  const hideTimer=useRef<number|undefined>(undefined)
  const channelRef=useRef<any>(null)
  const pollTimer=useRef<number|undefined>(undefined)
  const connectTimer=useRef<number|undefined>(undefined)

  const ensureAudio=()=>{
    if(!audioRef.current){
      audioRef.current=new AudioContext()
      busRef.current=createBus(audioRef.current)
    }
    if(audioRef.current.state==='suspended')void audioRef.current.resume()
    return audioRef.current
  }

  useEffect(()=>{
    const saved=localStorage.getItem('mafia-sound-muted')==='1'
    setMuted(saved);mutedRef.current=saved
    const unlock=()=>ensureAudio()
    window.addEventListener('pointerdown',unlock,{passive:true})
    window.addEventListener('keydown',unlock)
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

      if(!mutedRef.current){
        try{
          const ctx=ensureAudio()
          if(busRef.current)playSound(ctx,busRef.current,transition.kind,violent)
        }catch{}
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
      await disconnect();currentRoom.current=roomId;lastPhase.current=''
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

    discoverRoom();connectTimer.current=window.setInterval(discoverRoom,400)
    window.addEventListener('storage',discoverRoom)
    window.addEventListener('mafia-room-changed',discoverRoom as EventListener)
    return()=>{
      cancelled=true
      window.clearTimeout(hideTimer.current);window.clearInterval(connectTimer.current);window.clearInterval(pollTimer.current)
      document.documentElement.classList.remove('phase-impact')
      window.removeEventListener('storage',discoverRoom)
      window.removeEventListener('mafia-room-changed',discoverRoom as EventListener)
      if(channelRef.current)supabase.removeChannel(channelRef.current)
    }
  },[])

  const toggleSound=()=>{
    const next=!muted
    setMuted(next);mutedRef.current=next
    localStorage.setItem('mafia-sound-muted',next?'1':'0')
    if(!next){
      const ctx=ensureAudio()
      if(busRef.current){bell(ctx,busRef.current,440,ctx.currentTime+.03,.05,1.05);bell(ctx,busRef.current,659.25,ctx.currentTime+.2,.035,.9)}
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
