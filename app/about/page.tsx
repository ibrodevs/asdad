import Link from 'next/link'
import {roles,eventEffects,eventIcons} from '../../components/data'
import './about.css'

const phases=[
 ['1','Знакомство','Игроки изучают свою роль и секретную миссию.'],
 ['2','Ночь','Активные роли выбирают цели, мафия обсуждает действия в закрытом чате.'],
 ['3','Утро','Ведущий объявляет результаты ночи и новое происшествие.'],
 ['4','Обсуждение','Живые игроки общаются, анализируют события и ищут мафию.'],
 ['5','Голосование','Каждый живой игрок выбирает кандидата на исключение.']
]
const missions=[
 ['Пережить три дня','Оставайтесь живы до начала четвёртого дня.'],
 ['Три голосования','Примите участие минимум в трёх дневных голосованиях.'],
 ['Общий выбор','Проголосуйте за того же игрока, что и другой участник.'],
 ['Пережить цель','Останьтесь в игре дольше указанного игрока.'],
 ['Дожить до финала','Будьте живы в момент завершения партии.']
]
const roleEntries=Object.entries(roles) as [string,any][]
const eventNames:any={blackout:'Отключение света',anonymous_day:'Анонимный день',double_vote:'Весомый голос',last_word:'Последнее слово',info_leak:'Утечка информации',judgment_day:'Судный день',curfew:'Комендантский час',fake_evidence:'Поддельная улика',secret_alliance:'Тайный союз',black_market:'Чёрный рынок'}

export default function AboutGame(){return <main className="guidePage">
 <header className="guideTop"><div><span>MAFIA BY IBRO</span><h1>Об игре</h1></div><Link href="/" className="guideBack">← Вернуться</Link></header>
 <section className="guideHero"><div className="guideEyebrow">правила тёмного города</div><h2>Найдите мафию раньше, чем город окажется под её контролем.</h2><p>Каждая партия проходит автоматически по таймеру. Игроки получают скрытые роли, используют способности, выполняют секретные миссии и адаптируются к происшествиям, которые меняют правила дня.</p><div className="guideStats"><div><b>4–12</b><span>игроков</span></div><div><b>12</b><span>ролей</span></div><div><b>10</b><span>происшествий</span></div></div></section>
 <section className="guideSection"><div className="guideTitle"><span>01</span><div><h3>Как проходит партия</h3><p>Создатель запускает игру один раз, после чего фазы переключаются автоматически.</p></div></div><div className="phaseList">{phases.map(x=><article key={x[0]}><b>{x[0]}</b><div><h4>{x[1]}</h4><p>{x[2]}</p></div></article>)}</div></section>
 <section className="guideSection"><div className="guideTitle"><span>02</span><div><h3>Роли</h3><p>Роль скрыта от остальных. Не раскрывайте её без необходимости.</p></div></div><div className="roleGuideGrid">{roleEntries.map(([key,r])=><article key={key}><div className="guideIcon">{r[0]}</div><div><h4>{r[1]}</h4><p>{r[2]}</p><small>{['don','mafia','blackmailer','framed'].includes(key)?'Команда мафии':['maniac','jester','survivor'].includes(key)?'Независимая роль':'Команда города'}</small></div></article>)}</div></section>
 <section className="guideSection"><div className="guideTitle"><span>03</span><div><h3>Происшествия</h3><p>Каждое утро одно случайное событие изменяет правила текущего дня.</p></div></div><div className="eventGuideGrid">{Object.entries(eventEffects).map(([key,effect])=><article key={key}><div className="guideIcon">{eventIcons[key]||'⚡'}</div><div><h4>{eventNames[key]||key}</h4><p>{String(effect)}</p></div></article>)}</div></section>
 <section className="guideSection"><div className="guideTitle"><span>04</span><div><h3>Секретные миссии</h3><p>Личная дополнительная цель не заменяет командную победу, но даёт отдельную награду.</p></div></div><div className="missionGuide">{missions.map((m,i)=><article key={m[0]}><span>0{i+1}</span><div><h4>{m[0]}</h4><p>{m[1]}</p></div></article>)}</div></section>
 <section className="guideSection"><div className="guideTitle"><span>05</span><div><h3>Условия победы</h3></div></div><div className="winGrid"><article><b>🏙️ Город</b><p>Все участники мафии и Маньяк устранены.</p></article><article><b>🔪 Мафия</b><p>Количество мафии становится не меньше числа остальных живых игроков.</p></article><article><b>🪓 Маньяк</b><p>Остаётся единственным живым игроком.</p></article><article><b>🃏 Шут</b><p>Город исключает его дневным голосованием.</p></article><article><b>🧳 Выживший</b><p>Остаётся живым к моменту окончания партии.</p></article></div></section>
 <section className="guideSection tips"><div className="guideTitle"><span>06</span><div><h3>Полезные советы</h3></div></div><div className="tipsGrid"><p><b>Следите за противоречиями.</b> Сравнивайте слова игроков с результатами ночи и голосования.</p><p><b>Не спешите раскрывать роль.</b> Ценная информация может сделать вас целью мафии.</p><p><b>Используйте чат команды.</b> Мафия может координироваться ночью отдельно от города.</p><p><b>Читайте эффект события.</b> Происшествие может полностью изменить стратегию дня.</p></div></section>
 <Link href="/" className="guideStart">Перейти к игре</Link>
 </main>}
