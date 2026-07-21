'use client'

import {useEffect} from 'react'

export default function ChatSendGuard(){
  useEffect(()=>{
    const handlePointerDown=(event:PointerEvent)=>{
      const target=event.target as HTMLElement|null
      const button=target?.closest('.chatScreen .send') as HTMLButtonElement|null
      if(!button||button.disabled)return

      // Execute the send action before the mobile keyboard changes the viewport.
      // This prevents the same tap from landing on the Role item underneath.
      event.preventDefault()
      event.stopPropagation()
      button.click()
    }

    document.addEventListener('pointerdown',handlePointerDown,true)
    return()=>document.removeEventListener('pointerdown',handlePointerDown,true)
  },[])

  return null
}
