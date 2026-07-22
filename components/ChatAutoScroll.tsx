'use client'

import {useEffect} from 'react'

export default function ChatAutoScroll(){
  useEffect(()=>{
    let frame=0
    let observer:MutationObserver|null=null
    let currentChat:HTMLElement|null=null

    const scrollToBottom=(behavior:ScrollBehavior='auto')=>{
      if(!currentChat||!document.querySelector('.chatScreen'))return
      cancelAnimationFrame(frame)
      frame=requestAnimationFrame(()=>{
        if(!currentChat)return
        currentChat.scrollTo({top:currentChat.scrollHeight,behavior})
      })
    }

    const connect=()=>{
      const chat=document.querySelector('.chatScreen .chat') as HTMLElement|null
      if(chat===currentChat)return

      observer?.disconnect()
      currentChat=chat
      if(!chat)return

      observer=new MutationObserver((records)=>{
        const addedMessage=records.some(record=>
          Array.from(record.addedNodes).some(node=>
            node instanceof HTMLElement&&(node.classList.contains('msg')||Boolean(node.querySelector?.('.msg')))
          )
        )
        if(addedMessage)scrollToBottom('smooth')
      })
      observer.observe(chat,{childList:true})
      scrollToBottom('auto')
    }

    const rootObserver=new MutationObserver(connect)
    rootObserver.observe(document.body,{childList:true,subtree:true})
    connect()

    const handleViewport=()=>scrollToBottom('auto')
    window.visualViewport?.addEventListener('resize',handleViewport)

    return()=>{
      cancelAnimationFrame(frame)
      observer?.disconnect()
      rootObserver.disconnect()
      window.visualViewport?.removeEventListener('resize',handleViewport)
    }
  },[])

  return null
}
