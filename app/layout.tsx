import './globals.css'
import './player-fixes.css'
import './chat-improvements.css'
import './gameplay-v2.css'
export const metadata={title:'Mafia by Ibro — Мафия онлайн',description:'Mafia by Ibro — атмосферная онлайн-мафия с событиями и автоматическим ведущим'}
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="ru"><body>{children}</body></html>}