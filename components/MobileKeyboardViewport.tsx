'use client'

import {useEffect} from 'react'

export default function MobileKeyboardViewport(){
  useEffect(()=>{
    const viewport=window.visualViewport
    if(!viewport)return

    let frame=0
    let allowComposerFocus=false
    let resetFocusPermission=0

    const update=()=>{
      cancelAnimationFrame(frame)
      frame=requestAnimationFrame(()=>{
        const active=document.activeElement
        const isTextField=active instanceof HTMLTextAreaElement||active instanceof HTMLInputElement
        const keyboardHeight=Math.max(0,window.innerHeight-viewport.height-viewport.offsetTop)
        const isOpen=isTextField&&keyboardHeight>120
        document.documentElement.classList.toggle('mobile-keyboard-open',isOpen)
        document.documentElement.style.setProperty('--mobile-keyboard-height',`${keyboardHeight}px`)
      })
    }

    const onPointerDown=(event:PointerEvent)=>{
      const target=event.target instanceof Element?event.target:null
      allowComposerFocus=Boolean(target?.closest('.composer textarea'))
      window.clearTimeout(resetFocusPermission)
      resetFocusPermission=window.setTimeout(()=>{allowComposerFocus=false},500)
    }

    const onFocusIn=(event:FocusEvent)=>{
      const target=event.target
      if(target instanceof HTMLTextAreaElement&&target.closest('.composer')&&!allowComposerFocus){
        target.blur()
        return
      }
      update()
    }

    viewport.addEventListener('resize',update)
    window.addEventListener('pointerdown',onPointerDown,{capture:true})
    window.addEventListener('focusin',onFocusIn)
    window.addEventListener('focusout',update)
    update()

    return()=>{
      cancelAnimationFrame(frame)
      window.clearTimeout(resetFocusPermission)
      viewport.removeEventListener('resize',update)
      window.removeEventListener('pointerdown',onPointerDown,{capture:true})
      window.removeEventListener('focusin',onFocusIn)
      window.removeEventListener('focusout',update)
      document.documentElement.classList.remove('mobile-keyboard-open')
      document.documentElement.style.removeProperty('--mobile-keyboard-height')
    }
  },[])

  return null
}
