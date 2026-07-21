'use client'

import {useEffect} from 'react'

export default function ChatHeaderTimer(){
  useEffect(()=>{
    const syncTimer=()=>{
      const chatScreen=document.querySelector('.chatScreen')
      const headerCode=document.querySelector('.mobileGameHeader .code') as HTMLElement|null
      const chatTimer=document.querySelector('.chatPhaseTimer') as HTMLElement|null

      if(!headerCode)return

      if(chatScreen){
        headerCode.classList.add('chatHeaderTimerReplacement')
        headerCode.textContent=chatTimer?.textContent?.trim()||'⏱️ —:—'
        headerCode.setAttribute('aria-label','Таймер текущей фазы')
        headerCode.setAttribute('tabindex','-1')
      }else{
        headerCode.classList.remove('chatHeaderTimerReplacement')
        headerCode.removeAttribute('aria-label')
        headerCode.removeAttribute('tabindex')
      }
    }

    syncTimer()
    const interval=window.setInterval(syncTimer,200)
    const observer=new MutationObserver(syncTimer)
    observer.observe(document.body,{subtree:true,childList:true,characterData:true})

    return()=>{
      window.clearInterval(interval)
      observer.disconnect()
    }
  },[])

  return null
}
