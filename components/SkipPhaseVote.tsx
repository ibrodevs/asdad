'use client'

import {useEffect,useMemo,useState} from 'react'
import {createPortal} from 'react-dom'
import {supabase} from '../lib/supabase'

type RoomState={
  id:string
  status:string
  current_day:number
  settings?:Record<string,unknown>|null
}

type PlayerState={user_id:string,status:string}

export default function SkipPhaseVote(){
  const [target,setTarget]=useState<HTMLElement|null>(null)
  const [room,setRoom]=useState<RoomState|null>(null)
  const [players,setPlayers]=useState<PlayerState[]>([])
  const [uid,setUid]=useState('')
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')

  useEffect(()=>{
    let frame=0
    const updateTarget=()=>{
      cancelAnimationFrame(frame)
      frame=requestAnimationFrame(()=>{
        const next=document.querySelector('.chatScreen .chatTabs') as HTMLElement|null
        setTarget(current=>current===next?current:next)
      })
    }
    updateTarget()
    const observer=new MutationObserver(updateTarget)
    observer.observe(document.body,{childList:true,subtree:true})
    return()=>{cancelAnimationFrame(frame);observer.disconnect()}
  },[])

  useEffect(()=>{
    let active=true
    let channel:ReturnType<typeof supabase.channel>|null=null
    const roomId=localStorage.getItem('mafia-room')
    if(!roomId)return

    const load=async()=>{
      const [{data:sessionData},{data:roomData},{data:playerData}]=await Promise.all([
        supabase.auth.getSession(),
        supabase.from('rooms').select('id,status,current_day,settings').eq('id',roomId).maybeSingle(),
        supabase.from('room_players').select('user_id,status').eq('room_id',roomId)
      ])
      if(!active)return
      setUid(sessionData.session?.user.id||'')
      setRoom(roomData as RoomState|null)
      setPlayers((playerData||[]) as PlayerState[])
    }

    load()
    channel=supabase.channel(`skip-phase-${roomId}`)
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'rooms',filter:`id=eq.${roomId}`},load)
      .on('postgres_changes',{event:'*',schema:'public',table:'room_players',filter:`room_id=eq.${roomId}`},load)
      .subscribe()

    return()=>{active=false;if(channel)supabase.removeChannel(channel)}
  },[target])

  const alivePlayers=useMemo(()=>players.filter(player=>player.status==='alive'),[players])
  const settings=(room?.settings||{}) as Record<string,unknown>
  const phaseMatches=settings.skip_phase_status===room?.status&&Number(settings.skip_phase_day)===Number(room?.current_day||0)
  const voters=phaseMatches&&Array.isArray(settings.skip_voters)?settings.skip_voters.map(String):[]
  const voted=voters.includes(uid)
  const required=alivePlayers.length
  const votes=voters.filter(voter=>alivePlayers.some(player=>player.user_id===voter)).length
  const alive=alivePlayers.some(player=>player.user_id===uid)
  const available=Boolean(room&&!['waiting','finished'].includes(room.status)&&alive)

  const vote=async()=>{
    if(!room||!available||busy||voted)return
    setBusy(true)
    setError('')
    const result=await supabase.rpc('vote_to_skip_phase',{p_room:room.id})
    if(result.error)setError(result.error.message.includes('DEAD_PLAYER')?'Голосовать могут только живые игроки':'Не удалось отправить голос')
    setBusy(false)
  }

  if(!target||!room||['waiting','finished'].includes(room.status))return null

  return createPortal(
    <div className="skipPhaseVote">
      <button type="button" className={voted?'skipPhaseButton voted':'skipPhaseButton'} disabled={!available||busy||voted} onClick={vote}>
        <span>{voted?'✓':'⏭️'}</span>
        <b>{voted?'Голос учтён':busy?'Отправляем...':'Пропустить фазу'}</b>
        <small>{votes} / {required}</small>
      </button>
      {error&&<div className="skipPhaseError">{error}</div>}
    </div>,
    target
  )
}
