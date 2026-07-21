'use client'

import {useEffect} from 'react'

export default function MobileKeyboardViewport(){
  useEffect(()=>{
    const viewport=window.visualViewport
    if(!viewport)return

    const update=()=>{
      const active=document.activeElement
      const isTextField=active instanceof HTMLTextAreaElement||active instanceof HTMLInputElement
      const keyboardHeight=Math.max(0,window.innerHeight-viewport.height-viewport.offsetTop)
      const isOpen=isTextField&&keyboardHeight>120
      document.documentElement.classList.toggle('mobile-keyboard-open',isOpen)
      document.documentElement.style.setProperty('--mobile-keyboard-height',`${keyboardHeight}px`)
    }

    viewport.addEventListener('resize',update)
    viewport.addEventListener('scroll',update)
    window.addEventListener('focusin',update)
    window.addEventListener('focusout',update)
    update()

    return()=>{
      viewport.removeEventListener('resize',update)
      viewport.removeEventListener('scroll',update)
      window.removeEventListener('focusin',update)
      window.removeEventListener('focusout',update)
      document.documentElement.classList.remove('mobile-keyboard-open')
      document.documentElement.style.removeProperty('--mobile-keyboard-height')
    }
  },[])

  return null
}
