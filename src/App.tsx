import { useState, useRef, useEffect, createContext, useContext } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

type Screen = 'welcome' | 'login' | 'signup' | 'home' | 'journal' | 'checkin' | 'sos' | 'more' | 'privacy' | 'psychologist' | 'socialRedirect' | 'socialSuccess'
type AuthMode = 'login' | 'signup'
type NoteLog = { id: string; text: string; ts: string }
type Entry = {
  id: string; date: string; mood: number; note: string
  sleep: number; movement: number; water: number; mindfulness: number
  shared: boolean; logs: NoteLog[]; emotions: string[]
}
type Contact = { id: string; name: string; relation: string; phone: string; avatar: string }
type ChatMsg = { id: string; role: 'bloom' | 'user'; text: string; ts: string }

// ─── Constants ────────────────────────────────────────────────────────────────

const MOODS = [
  { emoji:'😔', label:'Low',   value:1, color:'#8E8E93', bg:'rgba(142,142,147,0.12)' },
  { emoji:'😕', label:'Down',  value:2, color:'#FF9500', bg:'rgba(255,149,0,0.12)'   },
  { emoji:'😐', label:'Okay',  value:3, color:'#FFCC00', bg:'rgba(255,204,0,0.12)'   },
  { emoji:'🙂', label:'Good',  value:4, color:'#34C759', bg:'rgba(52,199,89,0.12)'   },
  { emoji:'😄', label:'Great', value:5, color:'#007AFF', bg:'rgba(0,122,255,0.12)'   },
]

const WELLNESS = [
  { key:'sleep',       label:'Sleep',       icon:'🌙', unit:'hrs', max:10, color:'#AF52DE', trackColor:'rgba(175,82,222,0.15)' },
  { key:'movement',    label:'Movement',    icon:'🌿', unit:'min', max:90, color:'#34C759', trackColor:'rgba(52,199,89,0.15)'  },
  { key:'water',       label:'Hydration',   icon:'💧', unit:'gl',  max:8,  color:'#007AFF', trackColor:'rgba(0,122,255,0.15)'  },
  { key:'mindfulness', label:'Mindfulness', icon:'🕯', unit:'min', max:30, color:'#FF9500', trackColor:'rgba(255,149,0,0.15)'  },
]

const PHRASES = [
  "You don't have to be perfect to be worthy of care.",
  "Rest is not idleness. It is the soil from which your best self grows.",
  "Small steps forward are still steps forward.",
  "Your feelings are valid messengers — not permanent residents.",
  "Today, being gentle with yourself is enough.",
  "Breathe. You have survived every hard day so far.",
  "Healing isn't linear. Neither is a good life.",
  "You are allowed to take up space.",
]

const EMOTION_TAGS = [
  { label:'Grateful',    emoji:'🙏', color:'#34C759' },
  { label:'Anxious',     emoji:'😰', color:'#FF9500' },
  { label:'Hopeful',     emoji:'🌅', color:'#FFCC00' },
  { label:'Exhausted',   emoji:'😴', color:'#AF52DE' },
  { label:'Proud',       emoji:'💪', color:'#007AFF' },
  { label:'Lonely',      emoji:'🌧', color:'#8E8E93' },
  { label:'Content',     emoji:'☕', color:'#FF9500' },
  { label:'Overwhelmed', emoji:'🌊', color:'#5AC8FA' },
  { label:'Excited',     emoji:'✨', color:'#FFCC00' },
  { label:'Sad',         emoji:'💧', color:'#5856D6' },
  { label:'Peaceful',    emoji:'🕊', color:'#00C7BE' },
  { label:'Irritated',   emoji:'🔥', color:'#FF3B30' },
  { label:'Motivated',   emoji:'🚀', color:'#007AFF' },
  { label:'Confused',    emoji:'🌀', color:'#AF52DE' },
  { label:'Loved',       emoji:'💛', color:'#FFCC00' },
  { label:'Numb',        emoji:'🪨', color:'#8E8E93' },
]

const CONTACTS: Contact[] = [
  { id:'1', name:'Dr. Sarah Chen',  relation:'Psychologist',  phone:'+1 (555) 234-5678', avatar:'SC' },
  { id:'2', name:'Marcus Williams', relation:'Partner',       phone:'+1 (555) 891-2345', avatar:'MW' },
  { id:'3', name:'Leila Amara',     relation:'Best Friend',   phone:'+1 (555) 456-7890', avatar:'LA' },
  { id:'4', name:'Crisis Helpline', relation:'24/7 Support',  phone:'988',               avatar:'✦'  },
]

const BLOOM_RESPONSES: Record<string,string[]> = {
  sad:     ["I hear you. It's okay to feel this way — you don't need to be fixed. I'm here.", "That sounds really heavy. You don't have to carry it alone.", "Thank you for sharing. Sometimes just naming how we feel is the first step."],
  anxious: ["Let's slow down together — take one slow breath with me?", "Let's try to untangle it a little. What's weighing on you most right now?", "Your feelings are real and valid. Tell me what's on your mind."],
  good:    ["I love hearing that! What's been making things feel good?", "That's wonderful — hold onto that feeling. What happened today?", "You deserve those good moments. What's been bringing you joy?"],
  lonely:  ["Loneliness can feel so isolating. I'm here, and I'm glad you reached out.", "You're not invisible, even when it feels that way. I see you.", "I'm really glad you're talking to me right now."],
  default: ["I'm listening. Tell me as much or as little as you'd like.", "That's really interesting — can you say more?", "I'm here with you. How has the rest of your day been?", "What feels most important to you right now?", "You're doing better than you think. What's one small thing you're proud of today?"],
}

const SUGGESTED_STARTERS = ["I'm feeling overwhelmed","I just need to vent","I'm anxious about something","I had a good day","I feel really lonely","I can't sleep"]

// ─── Helpers ─────────────────────────────────────────────────────────────────

const todayStr = () => new Date().toISOString().split('T')[0]
const dayOfYear = () => { const n=new Date(),s=new Date(n.getFullYear(),0,0); return Math.floor((n.getTime()-s.getTime())/(864e5)) }
const fmtDate = (d:string) => new Date(d+'T12:00:00').toLocaleDateString('en-US',{weekday:'long',month:'short',day:'numeric'})
const fmtDateShort = (d:string) => new Date(d+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'})
const nowTs = () => new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})+' · '+new Date().toLocaleDateString('en-US',{month:'short',day:'numeric'})
const bloomReply = (t:string) => {
  const l=t.toLowerCase()
  if(l.match(/sad|cry|down|depress|hurt|pain/))  return BLOOM_RESPONSES.sad[Math.floor(Math.random()*3)]
  if(l.match(/anxi|stress|worry|overwhelm|panic/))return BLOOM_RESPONSES.anxious[Math.floor(Math.random()*3)]
  if(l.match(/good|great|happy|better|joy/))      return BLOOM_RESPONSES.good[Math.floor(Math.random()*3)]
  if(l.match(/alone|lonely|isolat|nobody/))       return BLOOM_RESPONSES.lonely[Math.floor(Math.random()*3)]
  const a=BLOOM_RESPONSES.default; return a[Math.floor(Math.random()*a.length)]
}

// ─── Liquid glass design system ───────────────────────────────────────────────

const LG = {
  // Base glass card
  card: {
    background:'rgba(255,255,255,0.72)',
    backdropFilter:'blur(40px) saturate(1.8)',
    WebkitBackdropFilter:'blur(40px) saturate(1.8)',
    border:'1px solid rgba(255,255,255,0.88)',
    boxShadow:'0 4px 16px rgba(0,0,0,0.07), 0 1px 4px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.9)',
    borderRadius:20,
  } as React.CSSProperties,

  // Elevated card
  cardHi: {
    background:'rgba(255,255,255,0.82)',
    backdropFilter:'blur(48px) saturate(2)',
    WebkitBackdropFilter:'blur(48px) saturate(2)',
    border:'1px solid rgba(255,255,255,0.95)',
    boxShadow:'0 8px 32px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.05), inset 0 1.5px 0 rgba(255,255,255,1)',
    borderRadius:22,
  } as React.CSSProperties,

  // Input field
  input: {
    background:'rgba(255,255,255,0.65)',
    backdropFilter:'blur(24px) saturate(1.6)',
    WebkitBackdropFilter:'blur(24px) saturate(1.6)',
    border:'1px solid rgba(255,255,255,0.85)',
    boxShadow:'0 2px 8px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.8)',
    borderRadius:13,
  } as React.CSSProperties,

  // Floating pill
  pill: {
    background:'rgba(255,255,255,0.78)',
    backdropFilter:'blur(48px) saturate(2)',
    WebkitBackdropFilter:'blur(48px) saturate(2)',
    border:'1px solid rgba(255,255,255,0.95)',
    boxShadow:'0 16px 48px rgba(0,0,0,0.13), 0 4px 16px rgba(0,0,0,0.07), inset 0 1.5px 0 rgba(255,255,255,1)',
    borderRadius:999,
  } as React.CSSProperties,
}

const fg = '#1C1C1E'
const fgSub = 'rgba(60,60,67,0.75)'
const fgMuted = 'rgba(60,60,67,0.38)'

const DarkCtx = createContext(false)

// ─── App Icon ─────────────────────────────────────────────────────────────────

function AppIcon({ size=72 }:{size?:number}) {
  const id=`icon-${size}`
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{display:'block',filter:`drop-shadow(0 ${size*.09}px ${size*.2}px rgba(0,122,255,0.28)) drop-shadow(0 ${size*.02}px ${size*.06}px rgba(0,0,0,0.14))`}}>
      <defs>
        <clipPath id={`${id}-c`}><rect width="100" height="100" rx="23.81"/></clipPath>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%"  stopColor="#e8f4ff"/>
          <stop offset="50%" stopColor="#f0e8ff"/>
          <stop offset="100%" stopColor="#e8fff4"/>
        </linearGradient>
        <radialGradient id={`${id}-core`} cx="45%" cy="38%" r="55%" gradientUnits="userSpaceOnUse">
          <stop offset="0%"  stopColor="#007AFF" stopOpacity="0.22"/>
          <stop offset="40%" stopColor="#AF52DE" stopOpacity="0.14"/>
          <stop offset="100%" stopColor="#34C759" stopOpacity="0.06"/>
        </radialGradient>
        <linearGradient id={`${id}-glass`} x1="0" y1="0" x2="60" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%"  stopColor="white" stopOpacity="0.70"/>
          <stop offset="100%" stopColor="white" stopOpacity="0.10"/>
        </linearGradient>
        <linearGradient id={`${id}-spec`} x1="15" y1="0" x2="85" y2="35" gradientUnits="userSpaceOnUse">
          <stop offset="0%"  stopColor="white" stopOpacity="0.95"/>
          <stop offset="100%" stopColor="white" stopOpacity="0"/>
        </linearGradient>
        <linearGradient id={`${id}-leaf`} x1="34" y1="74" x2="66" y2="26" gradientUnits="userSpaceOnUse">
          <stop offset="0%"  stopColor="#34C759"/>
          <stop offset="50%" stopColor="#007AFF"/>
          <stop offset="100%" stopColor="#AF52DE"/>
        </linearGradient>
        <filter id={`${id}-glow`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="3" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <g clipPath={`url(#${id}-c)`}>
        <rect width="100" height="100" fill={`url(#${id}-bg)`}/>
        <rect width="100" height="100" fill={`url(#${id}-core)`}/>
        <rect width="100" height="100" fill={`url(#${id}-glass)`}/>
        <g filter={`url(#${id}-glow)`}>
          <path d="M50 74 Q50 54 50 34" stroke={`url(#${id}-leaf)`} strokeWidth="3" strokeLinecap="round"/>
          <path d="M50 58 Q37 49 33 38 Q44 36 50 50" fill={`url(#${id}-leaf)`} fillOpacity="0.85"/>
          <path d="M50 46 Q63 37 67 26 Q56 26 50 40" fill={`url(#${id}-leaf)`} fillOpacity="0.65"/>
          <path d="M50 34 Q46 25 41 21 Q50 21 52 30" fill="#AF52DE" fillOpacity="0.70"/>
        </g>
        <ellipse cx="50" cy="13" rx="28" ry="9" fill={`url(#${id}-spec)`}/>
        <rect width="100" height="100" rx="23.81" fill="none" stroke="rgba(255,255,255,0.80)" strokeWidth="1.5"/>
      </g>
      <rect width="100" height="100" rx="23.81" fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="0.5"/>
    </svg>
  )
}

// ─── Subcomponents ────────────────────────────────────────────────────────────

function Ring({ value, max, color, size=56 }:{value:number;max:number;color:string;size?:number}) {
  const r=(size-8)/2,circ=2*Math.PI*r,pct=Math.min(value/max,1)
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{transform:'rotate(-90deg)'}}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(0,0,0,0.07)" strokeWidth={5}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={5}
        strokeLinecap="round" strokeDasharray={`${pct*circ} ${circ}`}
        style={{transition:'stroke-dasharray 0.7s ease'}}/>
    </svg>
  )
}

// Liquid glass toggle
function Toggle({ on, onChange, color='#007AFF' }:{on:boolean;onChange:()=>void;color?:string}) {
  return (
    <div onClick={onChange} style={{
      width:51,height:31,borderRadius:99,cursor:'pointer',flexShrink:0,
      background:on?color:'rgba(120,120,128,0.16)',
      position:'relative',transition:'background 0.25s',
      boxShadow:on?`0 0 0 0.5px ${color}40, inset 0 1px 2px rgba(0,0,0,0.1)`:'inset 0 1px 2px rgba(0,0,0,0.06)',
    }}>
      <div style={{
        position:'absolute',top:2,width:27,height:27,borderRadius:'50%',
        background:'white',
        boxShadow:'0 2px 6px rgba(0,0,0,0.22), 0 0.5px 1px rgba(0,0,0,0.12)',
        transition:'left 0.25s cubic-bezier(0.4,0,0.2,1)',
        left:on?22:2,
      }}/>
    </div>
  )
}

// Liquid glass slider
function Slider({ value, max, color, step=1, onChange }:{value:number;max:number;color:string;step?:number;onChange:(v:number)=>void}) {
  const pct=(value/max)*100
  return (
    <div style={{position:'relative',height:28,display:'flex',alignItems:'center'}}>
      <div style={{position:'absolute',left:0,right:0,height:5,borderRadius:99,background:'rgba(120,120,128,0.12)',overflow:'hidden'}}>
        <div style={{height:'100%',width:`${pct}%`,background:color,borderRadius:99,transition:'width 0.08s'}}/>
      </div>
      <input type="range" min={0} max={max} step={step} value={value}
        onChange={e=>onChange(parseFloat(e.target.value))}
        style={{position:'absolute',inset:0,width:'100%',opacity:0,cursor:'pointer',height:'100%'}}/>
      <div style={{
        position:'absolute',left:`calc(${pct}% - 13.5px)`,
        width:27,height:27,borderRadius:'50%',
        background:'white',
        boxShadow:'0 2px 8px rgba(0,0,0,0.20), 0 0.5px 1px rgba(0,0,0,0.10)',
        border:`2.5px solid ${color}`,
        transition:'left 0.08s',pointerEvents:'none',
      }}/>
    </div>
  )
}

function StatusBar({time}:{time:string}) {
  return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 24px 6px',fontSize:12,fontWeight:600,color:fg,letterSpacing:'-0.01em'}}>
      <span>{time}</span>
      <div style={{display:'flex',gap:5,alignItems:'center'}}>
        <span style={{fontSize:10,letterSpacing:'0.02em',color:fgSub}}>●●●●</span>
        <span style={{fontSize:10,color:fgSub}}>WiFi</span>
        <span style={{fontSize:11}}>🔋</span>
      </div>
    </div>
  )
}

// ─── SF Symbol–style icons ────────────────────────────────────────────────────

function NavIcon({ id, active, color, size=22, dark=false }:{id:string;active:boolean;color:string;size?:number;dark?:boolean}) {
  const c  = active ? color : dark ? 'rgba(235,235,245,0.32)' : 'rgba(60,60,67,0.34)'
  const sw = active ? 2.05 : 1.72
  const s  = size

  if (id==='home') return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M3 11.5L12 3l9 8.5" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M5 10.2V20.5a.5.5 0 00.5.5H9.5V16h5v5h4a.5.5 0 00.5-.5V10.2"
        stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"
        fill={active ? `${color}15` : 'none'}/>
    </svg>
  )
  if (id==='journal') return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <rect x="4" y="2.5" width="12.5" height="19" rx="2.5"
        stroke={c} strokeWidth={sw} fill={active ? `${color}15` : 'none'}/>
      <path d="M16.5 5H18a2 2 0 012 2v13a2 2 0 01-2 2h-1.5" stroke={c} strokeWidth={sw}/>
      <line x1="7.5" y1="8" x2="13.5" y2="8" stroke={c} strokeWidth={sw} strokeLinecap="round"/>
      <line x1="7.5" y1="11.5" x2="13.5" y2="11.5" stroke={c} strokeWidth={sw} strokeLinecap="round"/>
      <line x1="7.5" y1="15" x2="11"    y2="15"    stroke={c} strokeWidth={sw} strokeLinecap="round"/>
    </svg>
  )
  if (id==='sos') return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9.25" stroke={c} strokeWidth={sw} fill={active ? `${color}15` : 'none'}/>
      <line x1="12" y1="7.5" x2="12" y2="13.5" stroke={c} strokeWidth={sw+0.15} strokeLinecap="round"/>
      <circle cx="12" cy="16.8" r="0.95" fill={c}/>
    </svg>
  )
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <circle cx="5.5" cy="12" r={active?1.75:1.55} fill={c}/>
      <circle cx="12"  cy="12" r={active?1.75:1.55} fill={c}/>
      <circle cx="18.5" cy="12" r={active?1.75:1.55} fill={c}/>
    </svg>
  )
}

// ─── Floating tab bar — all 5 on a strict horizontal baseline ─────────────────

function BottomNav({active,onNav}:{active:Screen;onNav:(s:Screen)=>void}) {
  const isDark = useContext(DarkCtx)
  const isCheckin = active === 'checkin'

  const tabs: { id: Screen; label: string; accent: string; center?: boolean }[] = [
    { id:'home',    label:'Home',     accent:'#007AFF' },
    { id:'journal', label:'Journal',  accent:'#007AFF' },
    { id:'checkin', label:'Check In', accent:'#007AFF', center:true },
    { id:'sos',     label:'SOS',      accent:'#FF3B30' },
    { id:'more',    label:'More',     accent:'#007AFF' },
  ]

  return (
    <div style={{
      position:'fixed', bottom:20, left:0, right:0,
      display:'flex', justifyContent:'center',
      zIndex:20, pointerEvents:'none',
    }}>
      {/* Contact shadow cast on screen below */}
      <div style={{
        position:'absolute', bottom:-6, left:'18%', right:'18%', height:18,
        background:'radial-gradient(ellipse,rgba(0,0,0,0.10) 0%,transparent 72%)',
        filter:'blur(8px)', pointerEvents:'none',
      }}/>

      {/* ── Glass pill ────────────────────────────────────────────── */}
      <nav style={{
        display:'flex', alignItems:'center',
        width:336, height:66,
        padding:'0 5px',
        pointerEvents:'all', position:'relative',
        background: isDark?'rgba(28,28,30,0.90)':'rgba(252,252,255,0.80)',
        backdropFilter:'blur(64px) saturate(2.6) brightness(1.06)',
        WebkitBackdropFilter:'blur(64px) saturate(2.6) brightness(1.06)',
        borderRadius:33,
        transition:'background 0.3s',
        boxShadow: isDark?[
          '0 32px 64px rgba(0,0,0,0.55)',
          '0 12px 28px rgba(0,0,0,0.35)',
          '0 4px 10px rgba(0,0,0,0.22)',
          'inset 0 1px 0 rgba(255,255,255,0.08)',
          '0 0 0 0.8px rgba(255,255,255,0.06)',
          '0 0 0 1.5px rgba(0,0,0,0.55)',
        ].join(','):[
          '0 32px 64px rgba(0,0,0,0.11)',
          '0 12px 28px rgba(0,0,0,0.07)',
          '0 4px 10px rgba(0,0,0,0.05)',
          '0 1px 3px rgba(0,0,0,0.04)',
          'inset 0 1.5px 0 rgba(255,255,255,1.0)',
          'inset 0 -0.5px 0 rgba(255,255,255,0.55)',
          '0 0 0 0.8px rgba(255,255,255,0.94)',
          '0 0 0 1.5px rgba(0,0,0,0.042)',
        ].join(','),
      }}>
        {/* Top specular strip */}
        <div style={{
          position:'absolute', top:0, left:16, right:16, height:1,
          background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.85) 20%,rgba(255,255,255,0.85) 80%,transparent)',
          borderRadius:99, pointerEvents:'none',
        }}/>
        {/* Bottom inner shadow — depth cue */}
        <div style={{
          position:'absolute', bottom:0, left:16, right:16, height:12,
          background:'linear-gradient(0deg,rgba(0,0,0,0.025) 0%,transparent 100%)',
          borderRadius:'0 0 33px 33px', pointerEvents:'none',
        }}/>

        {tabs.map(({id,label,accent,center})=>{
          const isActive = active===id

          if (center) {
            /* ── Center "Check In" — larger icon container, same baseline ── */
            return (
              <button key={id}
                onClick={()=>onNav(id)}
                onMouseDown={e=>{e.currentTarget.style.transform='scale(0.91)';e.currentTarget.style.transition='transform 0.08s'}}
                onMouseUp={e=>{e.currentTarget.style.transform='scale(1)';e.currentTarget.style.transition='transform 0.22s cubic-bezier(0.34,1.56,0.64,1)'}}
                onMouseLeave={e=>{e.currentTarget.style.transform='scale(1)';e.currentTarget.style.transition='transform 0.22s cubic-bezier(0.34,1.56,0.64,1)'}}
                style={{
                  flex:1, display:'flex', flexDirection:'column',
                  alignItems:'center', justifyContent:'center',
                  gap:5, padding:'7px 4px',
                  borderRadius:999, position:'relative',
                  transition:'transform 0.22s cubic-bezier(0.34,1.56,0.64,1)',
                  marginTop:0, marginRight:0, marginLeft:0,
                }}>
                {/* Vivid filled icon container — the differentiating element */}
                <div style={{
                  width:42, height:42, borderRadius:14,
                  position:'relative', overflow:'hidden',
                  marginTop:0, marginRight:0, marginLeft:0,
                  background: isActive
                    ? 'linear-gradient(148deg,#3BA5FF 0%,#007AFF 46%,#005FCC 100%)'
                    : 'linear-gradient(148deg,#2EA8FF 0%,#007AFF 50%,#005FCC 100%)',
                  boxShadow:[
                    `0 6px 20px rgba(0,122,255,${isActive?'0.58':'0.40'})`,
                    '0 2px 6px rgba(0,122,255,0.28)',
                    '0 1px 2px rgba(0,0,0,0.12)',
                    'inset 0 1.5px 0 rgba(255,255,255,0.38)',
                    'inset 0 -1px 0 rgba(0,0,0,0.14)',
                  ].join(','),
                  transition:'box-shadow 0.25s',
                }}>
                  {/* Gloss arc */}
                  <div style={{
                    position:'absolute', top:2, left:'8%', right:'8%', height:'44%',
                    background:'linear-gradient(180deg,rgba(255,255,255,0.30) 0%,transparent 100%)',
                    borderRadius:'50% 50% 50% 50%/60% 60% 40% 40%',
                    pointerEvents:'none',
                  }}/>
                  <div style={{
                    position:'absolute', inset:0,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    border:'none',
                  }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                      {isActive
                        ? <path d="M5.5 12.5l4.5 4.5L18.5 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                        : <>
                            <line x1="12" y1="5.5" x2="12" y2="18.5" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                            <line x1="5.5" y1="12" x2="18.5" y2="12" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                          </>
                      }
                    </svg>
                  </div>
                </div>
                <span style={{
                  fontSize:9, fontWeight:isActive?700:600, letterSpacing:'0.01em',
                  color:isActive?'#007AFF':isDark?'rgba(235,235,245,0.38)':'rgba(60,60,67,0.45)',
                  lineHeight:1, transition:'color 0.2s',
                  marginRight:0, marginBottom:0, marginLeft:0,
                }}>{label}</span>
              </button>
            )
          }

          /* ── Regular tab ──────────────────────────────────────── */
          return (
            <button key={id}
              onClick={()=>onNav(id)}
              onMouseDown={e=>{e.currentTarget.style.transform='scale(0.88)';e.currentTarget.style.transition='transform 0.08s'}}
              onMouseUp={e=>{e.currentTarget.style.transform='scale(1)';e.currentTarget.style.transition='transform 0.22s cubic-bezier(0.34,1.56,0.64,1)'}}
              onMouseLeave={e=>{e.currentTarget.style.transform='scale(1)';e.currentTarget.style.transition='transform 0.22s cubic-bezier(0.34,1.56,0.64,1)'}}
              style={{
                flex:1, display:'flex', flexDirection:'column',
                alignItems:'center', justifyContent:'center',
                gap:5, padding:'7px 4px',
                borderRadius:999, position:'relative',
                transition:'transform 0.22s cubic-bezier(0.34,1.56,0.64,1)',
                background: isActive ? `${accent}0f` : 'transparent',
              }}>
              {/* Icon sits in a fixed 26×26 area to ensure uniform baseline */}
              <div style={{width:26, height:26, display:'flex', alignItems:'center', justifyContent:'center', position:'relative'}}>
                <NavIcon id={id} active={isActive} color={accent} dark={isDark}/>
                {/* Active selection ring glow */}
                {isActive && (
                  <div style={{
                    position:'absolute', inset:-4, borderRadius:'50%',
                    background:`radial-gradient(circle,${accent}20 0%,transparent 70%)`,
                    pointerEvents:'none',
                  }}/>
                )}
              </div>
              <span style={{
                fontSize:9, fontWeight:isActive?700:500, letterSpacing:'0.01em',
                color:isActive?accent:isDark?'rgba(235,235,245,0.35)':'rgba(60,60,67,0.40)',
                lineHeight:1, transition:'color 0.2s',
              }}>{label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}

// ─── Welcome ──────────────────────────────────────────────────────────────────

// ─── Shared onboarding primary button ────────────────────────────────────────

function PrimaryBtn({label,onClick,loading=false}:{label:string;onClick:()=>void;loading?:boolean}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      onMouseDown={e=>e.currentTarget.style.transform='scale(0.975)'}
      onMouseUp={e=>e.currentTarget.style.transform='scale(1)'}
      onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}
      style={{
        width:'100%', padding:'18px 0',
        borderRadius:16, fontSize:17, fontWeight:700,
        letterSpacing:'-0.015em',
        background:loading?'rgba(0,122,255,0.5)':'#007AFF',
        color:'white',
        boxShadow:loading?'none':[
          '0 4px 20px rgba(0,122,255,0.40)',
          '0 1px 4px rgba(0,122,255,0.20)',
          'inset 0 1px 0 rgba(255,255,255,0.22)',
        ].join(','),
        transition:'transform 0.14s cubic-bezier(0.34,1.56,0.64,1), background 0.2s, box-shadow 0.2s',
      }}
    >{loading?'…':label}</button>
  )
}

// ─── Welcome ─────────────────────────────────────────────────────────────────

function WelcomeScreen({onNav}:{onNav:(s:Screen)=>void}) {
  return (
    <div style={{
      flex:1, display:'flex', flexDirection:'column',
      background:'#FFFFFF', position:'relative', overflow:'hidden',
    }}>
      {/* Very subtle ambient tints — stays mostly white */}
      <div style={{position:'absolute',top:-80,left:-80,width:320,height:320,borderRadius:'50%',background:'radial-gradient(circle,rgba(0,122,255,0.055) 0%,transparent 65%)',pointerEvents:'none'}}/>
      <div style={{position:'absolute',bottom:160,right:-60,width:260,height:260,borderRadius:'50%',background:'radial-gradient(circle,rgba(175,82,222,0.04) 0%,transparent 65%)',pointerEvents:'none'}}/>

      {/* ── Upper brand area — generous whitespace ── */}
      <div style={{flex:1,display:'flex',flexDirection:'column',justifyContent:'center',padding:'0 32px',gap:20,position:'relative'}}>
        <AppIcon size={72}/>
        <div style={{marginTop:4}}>
          <h1 style={{
            fontSize:44, fontWeight:700, color:'#1C1C1E',
            letterSpacing:'-0.04em', lineHeight:1.05, marginBottom:14,
          }}>bloom</h1>
          <p style={{
            fontSize:17, color:'rgba(60,60,67,0.60)',
            lineHeight:1.65, fontWeight:400, maxWidth:260,
          }}>Your private wellness diary.<br/>Track, reflect, and grow — gently.</p>
        </div>

        {/* Feature trio */}
        <div style={{display:'flex',flexDirection:'column',gap:10,marginTop:8}}>
          {[
            {icon:'📔', text:'Daily mood & wellness check-ins'},
            {icon:'🔒', text:'Private by default, your data stays local'},
            {icon:'🌿', text:'Bloom AI companion, always here for you'},
          ].map(f=>(
            <div key={f.text} style={{display:'flex',alignItems:'center',gap:12}}>
              <span style={{fontSize:18,lineHeight:1}}>{f.icon}</span>
              <p style={{fontSize:14,color:'rgba(60,60,67,0.65)',fontWeight:500}}>{f.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Bottom action area — pinned ── */}
      <div style={{padding:'0 28px 40px',display:'flex',flexDirection:'column',gap:14,position:'relative'}}>

        <PrimaryBtn label="Get started" onClick={()=>onNav('signup')}/>

        {/* Divider */}
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{flex:1,height:1,background:'rgba(60,60,67,0.10)'}}/>
          <span style={{fontSize:12,color:'rgba(60,60,67,0.36)',fontWeight:500,letterSpacing:'0.01em'}}>or continue with</span>
          <div style={{flex:1,height:1,background:'rgba(60,60,67,0.10)'}}/>
        </div>

        {/* Social icon circles — compact */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:14}}>

          {/* Apple */}
          <button onClick={()=>onNav('socialRedirect')} style={{
            width:36,height:36,borderRadius:'50%',
            background:'#000000',flexShrink:0,
            display:'flex',alignItems:'center',justifyContent:'center',
            boxShadow:'0 1px 6px rgba(0,0,0,0.18),0 0.5px 2px rgba(0,0,0,0.10)',
            transition:'transform 0.14s cubic-bezier(0.34,1.56,0.64,1)',
          }}
            onMouseDown={e=>e.currentTarget.style.transform='scale(0.88)'}
            onMouseUp={e=>e.currentTarget.style.transform='scale(1)'}
            onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}
          >
            <svg width="10" height="13" viewBox="0 0 16 20" fill="none">
              <path d="M13.07 10.47c-.02-2.15 1.76-3.19 1.84-3.24-1-1.47-2.56-1.67-3.12-1.69-1.33-.13-2.6.78-3.27.78-.67 0-1.7-.76-2.8-.74C4.2 5.6 2.7 6.48 1.88 7.88c-1.67 2.88-.43 7.13 1.19 9.46.79 1.14 1.73 2.42 2.96 2.37 1.19-.05 1.64-.77 3.08-.77s1.84.77 3.09.74c1.28-.02 2.08-1.16 2.86-2.31.9-1.32 1.27-2.6 1.29-2.67-.03-.01-2.47-.95-2.5-3.23z" fill="white"/>
              <path d="M10.83 3.66c.66-.8 1.1-1.9.98-3.01-.95.04-2.09.63-2.77 1.43-.61.7-1.14 1.83-.99 2.9 1.05.08 2.12-.53 2.78-1.32z" fill="white"/>
            </svg>
          </button>

          {/* Google */}
          <button onClick={()=>onNav('socialRedirect')} style={{
            width:36,height:36,borderRadius:'50%',
            background:'#FFFFFF',flexShrink:0,
            display:'flex',alignItems:'center',justifyContent:'center',
            border:'1px solid rgba(60,60,67,0.13)',
            boxShadow:'0 1px 6px rgba(0,0,0,0.08),0 0.5px 2px rgba(0,0,0,0.05)',
            transition:'transform 0.14s cubic-bezier(0.34,1.56,0.64,1)',
          }}
            onMouseDown={e=>e.currentTarget.style.transform='scale(0.88)'}
            onMouseUp={e=>e.currentTarget.style.transform='scale(1)'}
            onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}
          >
            <svg width="13" height="13" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
              <path d="M3.964 10.706A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
          </button>

          {/* Facebook */}
          <button onClick={()=>onNav('socialRedirect')} style={{
            width:36,height:36,borderRadius:'50%',
            background:'#1877F2',flexShrink:0,
            display:'flex',alignItems:'center',justifyContent:'center',
            boxShadow:'0 1px 6px rgba(24,119,242,0.28),0 0.5px 2px rgba(24,119,242,0.14)',
            transition:'transform 0.14s cubic-bezier(0.34,1.56,0.64,1)',
          }}
            onMouseDown={e=>e.currentTarget.style.transform='scale(0.88)'}
            onMouseUp={e=>e.currentTarget.style.transform='scale(1)'}
            onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}
          >
            <svg width="7" height="13" viewBox="0 0 11 20" fill="none">
              <path d="M7 20V11h3.1l.47-3.6H7V5.23c0-1.04.29-1.75 1.78-1.75H10.7V.14C10.37.1 9.27 0 7.98 0 5.31 0 3.47 1.72 3.47 4.88V7.4H.4V11h3.07V20H7z" fill="white"/>
            </svg>
          </button>

        </div>

        {/* Already have account */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:5}}>
          <span style={{fontSize:15,color:'rgba(60,60,67,0.46)',fontWeight:400}}>Already have an account?</span>
          <button onClick={()=>onNav('login')} style={{fontSize:15,fontWeight:700,color:'#007AFF',padding:'2px 0'}}>Sign in</button>
        </div>

        {/* Legal */}
        <p style={{textAlign:'center',fontSize:11,color:'rgba(60,60,67,0.30)',lineHeight:1.55,fontWeight:400,marginTop:-2}}>
          Your data stays on your device by default.
        </p>
      </div>
    </div>
  )
}

// ─── Social Redirect screen ───────────────────────────────────────────────────

function SocialRedirectScreen({onDone}:{onDone:()=>void}) {
  useEffect(()=>{
    const t=setTimeout(onDone, 2200)
    return ()=>clearTimeout(t)
  },[onDone])

  return (
    <div style={{
      flex:1,display:'flex',flexDirection:'column',alignItems:'center',
      justifyContent:'center',background:'#F2F2F7',padding:'0 32px',gap:0,
    }}>
      {/* Ambient glow */}
      <div style={{position:'absolute',top:'30%',left:'50%',transform:'translateX(-50%)',width:280,height:280,borderRadius:'50%',background:'radial-gradient(circle,rgba(0,122,255,0.07) 0%,transparent 65%)',pointerEvents:'none'}}/>

      {/* Provider card */}
      <div style={{
        width:'100%',
        background:'#FFFFFF',
        borderRadius:22,
        padding:'32px 28px',
        display:'flex',flexDirection:'column',alignItems:'center',gap:22,
        boxShadow:'0 4px 24px rgba(0,0,0,0.09),0 1px 4px rgba(0,0,0,0.05),inset 0 1px 0 rgba(255,255,255,1)',
        position:'relative',overflow:'hidden',
      }}>
        {/* Top shimmer strip */}
        <div style={{position:'absolute',top:0,left:0,right:0,height:3,background:'linear-gradient(90deg,#007AFF,#AF52DE,#34C759,#007AFF)',backgroundSize:'200% 100%',animation:'shimmer 1.8s linear infinite'}}/>

        {/* Spinning indicator */}
        <div style={{position:'relative',width:52,height:52}}>
          {/* Outer ring */}
          <svg width="52" height="52" viewBox="0 0 52 52" style={{position:'absolute',inset:0,animation:'spin 0.9s linear infinite'}}>
            <circle cx="26" cy="26" r="22" fill="none" stroke="rgba(0,122,255,0.12)" strokeWidth="3"/>
            <circle cx="26" cy="26" r="22" fill="none" stroke="#007AFF" strokeWidth="3"
              strokeLinecap="round" strokeDasharray="28 110"/>
          </svg>
          {/* Lock icon center */}
          <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
            <svg width="18" height="20" viewBox="0 0 18 20" fill="none">
              <rect x="1" y="9" width="16" height="11" rx="3" stroke="#007AFF" strokeWidth="1.6" fill="rgba(0,122,255,0.08)"/>
              <path d="M5 9V6a4 4 0 018 0v3" stroke="#007AFF" strokeWidth="1.6" strokeLinecap="round"/>
              <circle cx="9" cy="14.5" r="1.5" fill="#007AFF"/>
            </svg>
          </div>
        </div>

        {/* Copy */}
        <div style={{textAlign:'center',display:'flex',flexDirection:'column',gap:8}}>
          <p style={{fontSize:17,fontWeight:700,color:'#1C1C1E',letterSpacing:'-0.02em',lineHeight:1.2}}>Redirecting to secure<br/>login provider</p>
          <p style={{fontSize:13,color:'rgba(60,60,67,0.50)',fontWeight:400,lineHeight:1.5}}>You'll be returned to bloom<br/>once authentication is complete.</p>
        </div>

        {/* Progress dots */}
        <div style={{display:'flex',gap:6,alignItems:'center'}}>
          {[0,1,2,3].map(i=>(
            <div key={i} style={{
              width:6,height:6,borderRadius:'50%',
              background:'#007AFF',
              opacity: i===0?1:i===1?0.6:i===2?0.3:0.15,
              animation:`pulse 1.2s ease-in-out ${i*0.2}s infinite`,
            }}/>
          ))}
        </div>

        {/* SSL badge */}
        <div style={{display:'flex',alignItems:'center',gap:6,padding:'7px 14px',borderRadius:99,background:'rgba(52,199,89,0.08)',border:'1px solid rgba(52,199,89,0.18)'}}>
          <svg width="11" height="12" viewBox="0 0 11 12" fill="none">
            <path d="M5.5 1L1 3v3.5C1 9.09 3.02 11.5 5.5 11.5S10 9.09 10 6.5V3L5.5 1z" fill="rgba(52,199,89,0.15)" stroke="#34C759" strokeWidth="1.2"/>
            <path d="M3.5 6l1.5 1.5 2.5-2.5" stroke="#34C759" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span style={{fontSize:11,fontWeight:700,color:'#34C759',letterSpacing:'0.02em'}}>256-bit SSL encrypted</span>
        </div>
      </div>

      <style>{`
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes shimmer { from{background-position:200% 0} to{background-position:-200% 0} }
        @keyframes pulse { 0%,100%{transform:scale(1);opacity:inherit} 50%{transform:scale(1.35)} }
      `}</style>
    </div>
  )
}

// ─── Social Success screen ─────────────────────────────────────────────────────

function SocialSuccessScreen({onDone}:{onDone:()=>void}) {
  const [phase,setPhase]=useState(0)   // 0=check animating, 1=text in, 2=done
  useEffect(()=>{
    const t1=setTimeout(()=>setPhase(1),600)
    const t2=setTimeout(()=>setPhase(2),1300)
    const t3=setTimeout(onDone,2400)
    return ()=>{clearTimeout(t1);clearTimeout(t2);clearTimeout(t3)}
  },[onDone])

  return (
    <div style={{
      flex:1,display:'flex',flexDirection:'column',alignItems:'center',
      justifyContent:'center',background:'#FFFFFF',paddingLeft:'36px',paddingRight:'36px',paddingBottom:'32px',
      gap:0,position:'relative',overflow:'hidden',
    }}>
      {/* Expanding success ripple */}
      <div style={{
        position:'absolute',top:'50%',left:'50%',
        transform:'translate(-50%,-50%)',
        width: phase>=1?420:0,height:phase>=1?420:0,
        borderRadius:'50%',
        background:'radial-gradient(circle,rgba(52,199,89,0.07) 0%,transparent 65%)',
        transition:'width 0.8s cubic-bezier(0.4,0,0.2,1),height 0.8s cubic-bezier(0.4,0,0.2,1)',
        pointerEvents:'none',
      }}/>

      <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:24,position:'relative'}}>
        {/* Checkmark circle */}
        <div style={{
          width:80,height:80,borderRadius:'50%',
          background:'linear-gradient(145deg,#3DDC6B,#34C759)',
          display:'flex',alignItems:'center',justifyContent:'center',
          boxShadow:'0 8px 28px rgba(52,199,89,0.40),0 2px 8px rgba(52,199,89,0.22),inset 0 1px 0 rgba(255,255,255,0.28)',
          transform:phase>=0?'scale(1)':'scale(0)',
          transition:'transform 0.5s cubic-bezier(0.34,1.56,0.64,1)',
        }}>
          <svg width="34" height="26" viewBox="0 0 34 26" fill="none">
            <path
              d="M2 13L12 23L32 3"
              stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"
              strokeDasharray="46"
              strokeDashoffset={phase>=0?0:46}
              style={{transition:'stroke-dashoffset 0.5s cubic-bezier(0.4,0,0.2,1) 0.15s'}}
            />
          </svg>
        </div>

        {/* Welcome text */}
        <div style={{
          textAlign:'center',
          opacity:phase>=1?1:0,
          transform:phase>=1?'translateY(0)':'translateY(10px)',
          transition:'opacity 0.4s ease,transform 0.4s ease',
          display:'flex',flexDirection:'column',gap:8,
        }}>
          <p style={{fontSize:26,fontWeight:700,color:'#1C1C1E',letterSpacing:'-0.03em',lineHeight:1.15}}>You're in!</p>
          <p style={{fontSize:15,color:'rgba(60,60,67,0.52)',fontWeight:400,lineHeight:1.55}}>Welcome to bloom.<br/>Your wellness journey starts now.</p>
        </div>

        {/* App icon peek */}
        <div style={{
          opacity:phase>=2?1:0,
          transform:phase>=2?'scale(1)':'scale(0.8)',
          transition:'opacity 0.35s ease 0.1s,transform 0.35s cubic-bezier(0.34,1.56,0.64,1) 0.1s',
        }}>
          <AppIcon size={52}/>
        </div>
      </div>
    </div>
  )
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

function AuthScreen({mode,onBack,onSwitch,onAuth}:{mode:AuthMode;onBack:()=>void;onSwitch:()=>void;onAuth:()=>void}) {
  const [email,setEmail]=useState('')
  const [pass,setPass]=useState('')
  const [name,setName]=useState('')
  const [loading,setLoading]=useState(false)
  const [focused,setFocused]=useState<string|null>(null)

  const go=()=>{setLoading(true);setTimeout(()=>{setLoading(false);onAuth()},900)}

  const isLogin=mode==='login'
  const btnLabel=isLogin?'Log in':'Sign up'

  const inputStyle=(id:string): React.CSSProperties => ({
    width:'100%',
    padding:'15px 16px',
    borderRadius:13,
    fontSize:16,
    color:'#1C1C1E',
    background:'#FFFFFF',
    border:`1.5px solid ${focused===id?'#007AFF':'rgba(60,60,67,0.16)'}`,
    boxShadow:focused===id
      ?'0 0 0 3.5px rgba(0,122,255,0.12)'
      :'0 1px 3px rgba(0,0,0,0.06)',
    transition:'border-color 0.18s, box-shadow 0.18s',
    outline:'none',
  })

  return (
    <div style={{
      flex:1,display:'flex',flexDirection:'column',
      background:'#FFFFFF',overflow:'hidden',position:'relative',
    }}>
      {/* Subtle ambient */}
      <div style={{position:'absolute',top:-60,right:-60,width:240,height:240,borderRadius:'50%',background:'radial-gradient(circle,rgba(0,122,255,0.05) 0%,transparent 65%)',pointerEvents:'none'}}/>

      {/* ── Nav row ── */}
      <div style={{padding:'16px 20px 0',display:'flex',alignItems:'center'}}>
        <button onClick={onBack} style={{
          display:'flex',alignItems:'center',gap:4,
          color:'#007AFF',fontSize:16,fontWeight:500,
          padding:'8px 4px',
        }}>
          <svg width="10" height="17" viewBox="0 0 10 17" fill="none">
            <path d="M8.5 1.5L1.5 8.5L8.5 15.5" stroke="#007AFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back
        </button>
      </div>

      {/* ── Heading ── */}
      <div style={{padding:'28px 28px 0'}}>
        <h2 style={{
          fontSize:32, fontWeight:700, color:'#1C1C1E',
          letterSpacing:'-0.03em', lineHeight:1.1, marginBottom:8,
        }}>{isLogin?'Welcome back':'Create account'}</h2>
        <p style={{fontSize:15,color:'rgba(60,60,67,0.50)',fontWeight:400,lineHeight:1.5}}>
          {isLogin?'Sign in to your diary.':'Start your wellness journey.'}
        </p>
      </div>

      {/* ── Fields ── */}
      <div style={{flex:1,padding:'32px 28px 0',display:'flex',flexDirection:'column',gap:16}}>
        {!isLogin&&(
          <div style={{display:'flex',flexDirection:'column',gap:7}}>
            <label style={{fontSize:13,fontWeight:600,color:'rgba(60,60,67,0.55)',letterSpacing:'0.01em'}}>Full name</label>
            <input
              type="text" value={name} placeholder="e.g. Alex Morgan"
              onChange={e=>setName(e.target.value)}
              onFocus={()=>setFocused('name')} onBlur={()=>setFocused(null)}
              style={inputStyle('name')}/>
          </div>
        )}
        <div style={{display:'flex',flexDirection:'column',gap:7}}>
          <label style={{fontSize:13,fontWeight:600,color:'rgba(60,60,67,0.55)',letterSpacing:'0.01em'}}>Email</label>
          <input
            type="email" value={email} placeholder="you@example.com"
            onChange={e=>setEmail(e.target.value)}
            onFocus={()=>setFocused('email')} onBlur={()=>setFocused(null)}
            style={inputStyle('email')}/>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:7}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <label style={{fontSize:13,fontWeight:600,color:'rgba(60,60,67,0.55)',letterSpacing:'0.01em'}}>Password</label>
            {isLogin&&(
              <button style={{fontSize:13,color:'#007AFF',fontWeight:600}}>Forgot?</button>
            )}
          </div>
          <input
            type="password" value={pass} placeholder="••••••••"
            onChange={e=>setPass(e.target.value)}
            onFocus={()=>setFocused('pass')} onBlur={()=>setFocused(null)}
            style={inputStyle('pass')}/>
        </div>
      </div>

      {/* ── Bottom CTA — pinned ── */}
      <div style={{padding:'28px 28px 40px',display:'flex',flexDirection:'column',gap:14}}>
        <PrimaryBtn label={btnLabel} onClick={go} loading={loading}/>

        <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:5}}>
          <span style={{fontSize:14,color:'rgba(60,60,67,0.40)'}}>
            {isLogin?"Don't have an account?":'Already have an account?'}
          </span>
          <button
            onClick={onSwitch}
            style={{fontSize:14,fontWeight:700,color:'#007AFF'}}
          >{isLogin?'Sign up':'Sign in'}</button>
        </div>
      </div>
    </div>
  )
}

// ─── Home ─────────────────────────────────────────────────────────────────────

function HomeScreen({entries,onNav}:{entries:Entry[];onNav:(s:Screen)=>void}) {
  const today=todayStr()
  const todayEntry=entries.find(e=>e.date===today)
  const avgMood=entries.length?Math.round(entries.reduce((a,b)=>a+b.mood,0)/entries.length*10)/10:0
  const streak=(()=>{
    let s=0
    const sorted=[...entries].sort((a,b)=>b.date.localeCompare(a.date))
    for(let i=0;i<7;i++){const d=new Date();d.setDate(d.getDate()-i);if(sorted[i]?.date===d.toISOString().split('T')[0])s++;else break}
    return s
  })()
  const last7=entries.slice(-7)
  const latest=entries[entries.length-1]
  const phrase=PHRASES[dayOfYear()%PHRASES.length]
  const currentMood=todayEntry?MOODS[todayEntry.mood-1]:null
  const now=new Date()
  const hour=now.getHours()
  const greeting=hour<12?'Good morning':hour<17?'Good afternoon':'Good evening'
  const dateStr=now.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})

  // Extra bottom padding = scroll feed clears: CTA button (64px) + gap (12px) + tab bar (88px)
  const feedPadBottom = !todayEntry ? 172 : 108

  return (
    <div style={{flex:1,display:'flex',flexDirection:'column',position:'relative',overflow:'hidden'}}>

      {/* ── Scrollable feed ────────────────────────────────────── */}
      <div style={{flex:1,overflowY:'auto',paddingBottom:feedPadBottom}}>

        {/* Section 1 — Greeting */}
        <div style={{padding:'8px 22px 0'}}>
          <p style={{
            fontSize:11,color:fgMuted,letterSpacing:'0.06em',
            textTransform:'uppercase',fontWeight:600,marginBottom:5,
          }}>{dateStr}</p>
          <h2 style={{fontSize:30,lineHeight:1.16,color:fg,fontWeight:700,letterSpacing:'-0.03em'}}>
            {greeting}
            {currentMood&&<span style={{color:currentMood.color}}> · {currentMood.label.toLowerCase()}</span>}
          </h2>
        </div>

        {/* Section 2 — Reflection */}
        <div style={{
          margin:'16px 20px 0',padding:'22px 22px 20px',
          borderRadius:22,position:'relative',overflow:'hidden',
          background:'linear-gradient(138deg,rgba(0,122,255,0.10) 0%,rgba(175,82,222,0.07) 55%,rgba(52,199,89,0.05) 100%)',
          backdropFilter:'blur(48px) saturate(2)',WebkitBackdropFilter:'blur(48px) saturate(2)',
          border:'1px solid rgba(255,255,255,0.88)',
          boxShadow:'0 6px 24px rgba(0,122,255,0.09),0 1px 4px rgba(0,0,0,0.04),inset 0 1.5px 0 rgba(255,255,255,0.95)',
        }}>
          <div style={{position:'absolute',top:-28,right:-28,width:100,height:100,borderRadius:'50%',background:'radial-gradient(circle,rgba(175,82,222,0.13) 0%,transparent 70%)',pointerEvents:'none',marginTop:0,marginRight:0,marginBottom:0,marginLeft:0}}/>
          <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:12}}>
            <div style={{width:5,height:5,borderRadius:'50%',background:'#007AFF',boxShadow:'0 0 6px rgba(0,122,255,0.7)'}}/>
            <p style={{fontSize:10,letterSpacing:'0.08em',textTransform:'uppercase',color:'#007AFF',fontWeight:700}}>Today's Reflection</p>
          </div>
          <p style={{fontSize:16,color:fg,fontFamily:"'DM Serif Display',serif",fontStyle:'italic',lineHeight:1.65,letterSpacing:'-0.005em'}}>"{phrase}"</p>
        </div>

        {/* Section 3 — Stats row */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,margin:'14px 20px 0'}}>
          {([
            {label:'Streak',  value:String(streak),        unit:'days', color:'#34C759'},
            {label:'Mood',    value:String(avgMood),        unit:'/ 5',  color:'#FF9500'},
            {label:'Entries', value:String(entries.length), unit:'total',color:'#007AFF'},
          ] as {label:string;value:string;unit:string;color:string}[]).map(s=>(
            <div key={s.label} style={{...LG.card,padding:'16px 8px 13px',textAlign:'center'}}>
              <p style={{fontSize:28,fontWeight:800,color:s.color,lineHeight:1,letterSpacing:'-0.04em'}}>{s.value}</p>
              <p style={{fontSize:9,color:fgMuted,marginTop:2,textTransform:'uppercase',letterSpacing:'0.05em',fontWeight:600}}>{s.unit}</p>
              <div style={{width:22,height:2,borderRadius:99,background:s.color,margin:'8px auto 0',opacity:0.45}}/>
              <p style={{fontSize:10,color:fgSub,marginTop:7,fontWeight:600}}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Section 4 — Weekly mood chart */}
        <div style={{...LG.card,margin:'14px 20px 0',padding:'20px 20px 16px'}}>
          <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',marginBottom:16}}>
            <p style={{fontSize:14,fontWeight:700,color:fg,letterSpacing:'-0.01em'}}>Weekly mood</p>
            <p style={{fontSize:11,color:'#007AFF',fontWeight:600}}>7 days</p>
          </div>
          <div style={{display:'flex',alignItems:'flex-end',gap:5,height:60}}>
            {last7.map((e,i)=>{
              const mood=MOODS[e.mood-1],h=(e.mood/5)*100
              return (
                <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:5}}>
                  <div style={{
                    width:'100%',borderRadius:5,
                    height:`${h}%`,minHeight:5,
                    background:`linear-gradient(180deg,${mood.color}d0,${mood.color}70)`,
                    boxShadow:`0 2px 6px ${mood.color}28`,
                    transition:'height 0.6s cubic-bezier(0.4,0,0.2,1)',
                  }}/>
                  <span style={{fontSize:9,color:fgMuted,fontWeight:600,letterSpacing:'0.02em'}}>{['M','T','W','T','F','S','S'][i]}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Section 5 — Wellness rings */}
        {latest&&(
          <div style={{...LG.card,margin:'14px 20px 0',padding:'20px'}}>
            <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',marginBottom:18}}>
              <p style={{fontSize:14,fontWeight:700,color:fg,letterSpacing:'-0.01em'}}>Yesterday's wellness</p>
              <p style={{fontSize:11,color:fgMuted,fontWeight:500}}>{fmtDateShort(latest.date)}</p>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6}}>
              {WELLNESS.map(w=>{
                const val=latest[w.key as keyof Entry] as number
                const pct=Math.min(val/w.max,1)
                return (
                  <div key={w.key} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:7}}>
                    <div style={{position:'relative',width:48,height:48}}>
                      <Ring value={val} max={w.max} color={w.color} size={48}/>
                      <span style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13}}>{w.icon}</span>
                    </div>
                    <div style={{textAlign:'center'}}>
                      <p style={{fontSize:13,fontWeight:800,color:fg,letterSpacing:'-0.02em',lineHeight:1}}>
                        {val}<span style={{fontSize:8,fontWeight:500,color:fgMuted}}>{w.unit}</span>
                      </p>
                      <div style={{width:34,height:2.5,borderRadius:99,background:'rgba(0,0,0,0.06)',marginTop:4,overflow:'hidden'}}>
                        <div style={{height:'100%',width:`${pct*100}%`,background:w.color,borderRadius:99}}/>
                      </div>
                      <p style={{fontSize:8,color:fgMuted,textTransform:'uppercase',letterSpacing:'0.04em',marginTop:4,fontWeight:600}}>{w.label}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Section 6 — Latest entry */}
        {latest&&(
          <div style={{margin:'14px 20px 0'}}>
            <p style={{fontSize:11,fontWeight:700,color:fgMuted,letterSpacing:'0.06em',textTransform:'uppercase',marginBottom:10}}>Latest entry</p>
            <div style={{
              ...LG.cardHi,padding:'18px 18px 16px',
              borderLeft:`3.5px solid ${MOODS[latest.mood-1].color}`,
              borderRadius:'0 20px 20px 0',
            }}>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
                <span style={{fontSize:26}}>{MOODS[latest.mood-1].emoji}</span>
                <div style={{flex:1}}>
                  <p style={{fontSize:14,fontWeight:700,color:fg,letterSpacing:'-0.015em'}}>{MOODS[latest.mood-1].label} day</p>
                  <p style={{fontSize:11,color:fgMuted,marginTop:2}}>{fmtDate(latest.date)}</p>
                </div>
                <div style={{display:'flex',flexWrap:'wrap',gap:4,justifyContent:'flex-end',maxWidth:110}}>
                  {(latest.emotions??[]).slice(0,2).map(label=>{
                    const tag=EMOTION_TAGS.find(t=>t.label===label);if(!tag)return null
                    return <span key={label} style={{fontSize:9,padding:'3px 8px',borderRadius:99,background:tag.color,color:'white',fontWeight:700}}>{tag.emoji} {tag.label}</span>
                  })}
                </div>
              </div>
              {latest.note&&<p style={{fontSize:13,color:fgSub,lineHeight:1.65,fontStyle:'italic'}}>"{latest.note}"</p>}
            </div>
          </div>
        )}
      </div>

      {/* ── Fixed CTA — floats above tab bar, beneath content ── */}
      {!todayEntry&&(
        <div style={{
          position:'absolute',bottom:88,left:20,right:20,
          zIndex:10,
        }}>
          {/* Soft fade bleed so content smoothly disappears behind it */}
          <div style={{
            position:'absolute',bottom:'100%',left:-20,right:-20,height:36,
            background:'linear-gradient(0deg,rgba(242,242,247,0.96) 0%,transparent 100%)',
            pointerEvents:'none',
          }}/>
          <button
            onClick={()=>onNav('checkin')}
            onMouseDown={e=>e.currentTarget.style.transform='scale(0.975)'}
            onMouseUp={e=>e.currentTarget.style.transform='scale(1)'}
            onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}
            style={{
              width:'100%',padding:'17px 0',borderRadius:17,
              fontSize:16,fontWeight:700,letterSpacing:'-0.015em',
              background:'#007AFF',color:'white',
              boxShadow:'0 8px 28px rgba(0,122,255,0.44),0 2px 6px rgba(0,122,255,0.22),inset 0 1px 0 rgba(255,255,255,0.20)',
              transition:'transform 0.14s cubic-bezier(0.34,1.56,0.64,1)',
              display:'flex',alignItems:'center',justifyContent:'center',gap:6,
            }}
          >
            Check in for today
            <span style={{fontSize:18,fontWeight:300,opacity:0.85,marginLeft:2}}>→</span>
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Entry Detail Sheet ───────────────────────────────────────────────────────

function EntryDetailSheet({entry,onClose,onSave}:{entry:Entry;onClose:()=>void;onSave:(u:Entry)=>void}) {
  const mood=MOODS[entry.mood-1]
  const [vals,setVals]=useState({sleep:entry.sleep,movement:entry.movement,water:entry.water,mindfulness:entry.mindfulness})
  const [emotions,setEmotions]=useState<string[]>(entry.emotions??[])
  const [logs,setLogs]=useState<NoteLog[]>(entry.logs??[])
  const [newText,setNewText]=useState('')
  const [saved,setSaved]=useState(false)
  const logsRef=useRef<HTMLDivElement>(null)

  const addLog=()=>{
    if(!newText.trim())return
    setLogs(p=>[...p,{id:Date.now().toString(),text:newText.trim(),ts:nowTs()}])
    setNewText('')
    setTimeout(()=>logsRef.current?.scrollIntoView({behavior:'smooth'}),50)
  }
  const toggleEmotion=(l:string)=>setEmotions(p=>p.includes(l)?p.filter(e=>e!==l):[...p,l])
  const handleSave=()=>{onSave({...entry,...vals,emotions,logs});setSaved(true);setTimeout(onClose,800)}

  return (
    <>
      <div onClick={onClose} style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.28)',zIndex:30,backdropFilter:'blur(6px)',WebkitBackdropFilter:'blur(6px)',animation:'fadeIn 0.2s ease'}}/>
      <div style={{
        position:'absolute',bottom:0,left:0,right:0,height:'93%',
        background:'rgba(242,242,247,0.88)',
        backdropFilter:'blur(48px) saturate(2)',WebkitBackdropFilter:'blur(48px) saturate(2)',
        borderRadius:'28px 28px 0 0',zIndex:40,display:'flex',flexDirection:'column',overflow:'hidden',
        animation:'slideUp 0.32s cubic-bezier(0.32,0.72,0,1)',
        border:'1px solid rgba(255,255,255,0.90)',borderBottom:'none',
        boxShadow:'0 -12px 48px rgba(0,0,0,0.12)',
      }}>
        <div style={{padding:'14px 18px 0',flexShrink:0,position:'relative',display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div style={{width:36,height:4,borderRadius:99,background:'rgba(60,60,67,0.18)'}}/>
          <button onClick={onClose} style={{
            position:'absolute',right:16,top:10,width:30,height:30,borderRadius:'50%',
            background:'rgba(120,120,128,0.12)',border:'1px solid rgba(255,255,255,0.7)',
            display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,color:fgSub,fontWeight:600,
          }}>✕</button>
        </div>

        <div style={{flex:1,overflowY:'auto',padding:'16px 22px 32px',display:'flex',flexDirection:'column',gap:18}}>
          {/* Header */}
          <div style={{...LG.card,padding:'16px 18px',background:`rgba(255,255,255,0.82)`}}>
            <p style={{fontSize:11,fontWeight:700,color:fgMuted,letterSpacing:'0.05em',textTransform:'uppercase'}}>{fmtDate(entry.date)}</p>
            <div style={{display:'flex',alignItems:'center',gap:10,marginTop:8}}>
              <span style={{fontSize:34}}>{mood.emoji}</span>
              <div>
                <p style={{fontSize:20,fontWeight:700,color:mood.color,letterSpacing:'-0.02em'}}>{mood.label}</p>
                <p style={{fontSize:12,color:fgMuted,marginTop:2}}>Original check-in mood</p>
              </div>
            </div>
            {entry.note&&<p style={{fontSize:13,color:fgSub,lineHeight:1.6,fontStyle:'italic',marginTop:10,borderTop:'1px solid rgba(60,60,67,0.08)',paddingTop:10}}>"{entry.note}"</p>}
          </div>

          {/* Emotions */}
          <div>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
              <p style={{fontSize:14,fontWeight:700,color:fg,letterSpacing:'-0.01em'}}>How did you feel?</p>
              {emotions.length>0&&<span style={{fontSize:11,color:fgMuted}}>{emotions.length} selected</span>}
            </div>
            <div style={{display:'flex',flexWrap:'wrap',gap:7}}>
              {EMOTION_TAGS.map(tag=>{
                const active=emotions.includes(tag.label)
                return (
                  <button key={tag.label} onClick={()=>toggleEmotion(tag.label)} style={{
                    padding:'7px 13px',borderRadius:99,fontSize:12,fontWeight:600,
                    background:active?tag.color:'rgba(255,255,255,0.72)',
                    color:active?'white':fg,
                    border:`1px solid ${active?tag.color:'rgba(255,255,255,0.85)'}`,
                    boxShadow:active?`0 2px 8px ${tag.color}40, inset 0 1px 0 rgba(255,255,255,0.3)`:'0 1px 3px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.8)',
                    transition:'all 0.15s',transform:active?'scale(1.03)':'scale(1)',
                    backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)',
                  }}>{tag.emoji} {tag.label}</button>
                )
              })}
            </div>
          </div>

          {/* Wellness */}
          <div style={{...LG.card,padding:'18px 20px',display:'flex',flexDirection:'column',gap:18}}>
            <p style={{fontSize:14,fontWeight:700,color:fg,letterSpacing:'-0.01em'}}>Wellness</p>
            {WELLNESS.map(w=>{
              const val=vals[w.key as keyof typeof vals]
              return (
                <div key={w.key}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:10}}>
                    <span style={{fontSize:13,fontWeight:500,color:fgSub}}>{w.icon} {w.label}</span>
                    <span style={{fontSize:14,fontWeight:700,color:w.color}}>{val} {w.unit}</span>
                  </div>
                  <Slider value={val} max={w.max} step={w.unit==='hrs'?0.5:5} color={w.color} onChange={v=>setVals(prev=>({...prev,[w.key]:v}))}/>
                </div>
              )
            })}
          </div>

          {/* Notes log */}
          <div>
            <p style={{fontSize:14,fontWeight:700,color:fg,letterSpacing:'-0.01em',marginBottom:12}}>Notes</p>
            {logs.length>0&&(
              <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:10}}>
                {logs.map(log=>(
                  <div key={log.id} style={{...LG.card,padding:'12px 14px'}}>
                    <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:6}}>
                      <span style={{fontSize:10,fontWeight:700,color:'#007AFF',letterSpacing:'0.06em',textTransform:'uppercase'}}>Note</span>
                      <span style={{fontSize:10,color:fgMuted}}>· {log.ts}</span>
                      <button onClick={()=>setLogs(p=>p.filter(l=>l.id!==log.id))} style={{marginLeft:'auto',fontSize:11,color:fgMuted,width:20,height:20,borderRadius:'50%',background:'rgba(120,120,128,0.12)',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
                    </div>
                    <p style={{fontSize:13,color:fg,lineHeight:1.6}}>{log.text}</p>
                  </div>
                ))}
                <div ref={logsRef}/>
              </div>
            )}
            <div style={{...LG.card,overflow:'hidden'}}>
              <textarea value={newText} onChange={e=>setNewText(e.target.value)}
                onKeyDown={e=>{if(e.key==='Enter'&&e.metaKey)addLog()}}
                placeholder="Add a thought… ⌘↵ to save" rows={3}
                style={{width:'100%',fontSize:14,lineHeight:1.65,color:fg,padding:'13px 14px'}}/>
              <div style={{padding:'8px 12px',borderTop:'1px solid rgba(60,60,67,0.06)',display:'flex',justifyContent:'space-between',alignItems:'center',background:'rgba(255,255,255,0.5)'}}>
                <span style={{fontSize:11,color:fgMuted}}>{newText.length>0?`${newText.length} chars`:'Auto-timestamped'}</span>
                <button onClick={addLog} disabled={!newText.trim()} style={{
                  padding:'6px 14px',borderRadius:99,fontSize:12,fontWeight:700,
                  background:newText.trim()?'#007AFF':'rgba(120,120,128,0.12)',
                  color:newText.trim()?'white':fgMuted,
                  boxShadow:newText.trim()?'0 2px 8px rgba(0,122,255,0.3)':'none',transition:'all 0.15s',
                }}>Add note</button>
              </div>
            </div>
          </div>

          <button onClick={handleSave} style={{
            padding:'17px',borderRadius:16,fontSize:16,fontWeight:700,letterSpacing:'-0.01em',
            background:saved?'#34C759':'#007AFF',color:'white',
            boxShadow:saved?'0 4px 16px rgba(52,199,89,0.35)':'0 4px 16px rgba(0,122,255,0.35)',
            transition:'all 0.2s',
          }}>{saved?'✓ Saved':'Save changes'}</button>
        </div>
      </div>
    </>
  )
}

// ─── Journal ──────────────────────────────────────────────────────────────────

function JournalScreen({entries,onUpdateEntry}:{entries:Entry[];onUpdateEntry:(e:Entry)=>void}) {
  const [filter,setFilter]=useState<number|null>(null)
  const [selected,setSelected]=useState<Entry|null>(null)
  const filtered=[...entries].reverse().filter(e=>filter===null||e.mood===filter)
  const FILTER_LABELS=[
    {value:null, label:'All'},
    {value:1, label:'Low'},
    {value:2, label:'Down'},
    {value:3, label:'Okay'},
    {value:4, label:'Good'},
    {value:5, label:'Great'},
  ]
  return (
    <div style={{flex:1,display:'flex',flexDirection:'column',position:'relative',overflow:'hidden',background:'#F2F2F7'}}>
      {/* Static header */}
      <div style={{padding:'20px 24px 0',flexShrink:0}}>
        <h1 style={{fontSize:34,fontWeight:800,color:fg,letterSpacing:'-0.04em',lineHeight:1.05}}>Journal</h1>
        <p style={{fontSize:13,color:fgMuted,marginTop:3,fontWeight:500}}>{entries.length} entries recorded</p>
      </div>

      {/* Horizontal filter capsule bar */}
      <div style={{
        display:'flex',gap:7,padding:'12px 24px 10px',overflowX:'auto',flexShrink:0,
        scrollbarWidth:'none',WebkitOverflowScrolling:'touch' as any,
      }}>
        {FILTER_LABELS.map(f=>{
          const active = f.value===null ? filter===null : filter===f.value
          const mood = f.value!==null ? MOODS[f.value-1] : null
          return (
            <button key={String(f.value)} onClick={()=>setFilter(f.value===null?null:(filter===f.value?null:f.value))} style={{
              padding:'7px 16px',borderRadius:99,fontSize:12.5,fontWeight:700,flexShrink:0,
              background: active ? (mood?mood.color:fg) : 'rgba(255,255,255,0.82)',
              color: active ? 'white' : fgSub,
              border:'none',
              backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)',
              boxShadow: active
                ? `0 3px 10px ${mood?mood.color+'55':'rgba(0,0,0,0.22)'}`
                : '0 1px 4px rgba(0,0,0,0.06),inset 0 1px 0 rgba(255,255,255,0.9)',
              transition:'all 0.2s cubic-bezier(0.34,1.56,0.64,1)',
              letterSpacing:'-0.01em',
            }}>
              {f.label}
            </button>
          )
        })}
      </div>

      {/* Scrollable card list with bottom fade */}
      <div style={{flex:1,position:'relative',overflow:'hidden'}}>
        <div style={{
          height:'100%',overflowY:'auto',padding:'4px 20px 120px',
          display:'flex',flexDirection:'column',gap:11,
          scrollbarWidth:'none',WebkitOverflowScrolling:'touch' as any,
        }}>
          {filtered.map((entry,i)=>{
            const mood=MOODS[entry.mood-1]
            const isLast=i===filtered.length-1
            return (
              <button key={entry.id} onClick={()=>setSelected(entry)} style={{
                background:'#FFFFFF',
                borderRadius:22,
                border:'none',
                padding:'18px 18px 16px',
                textAlign:'left',width:'100%',cursor:'pointer',
                boxShadow:'0 2px 12px rgba(0,0,0,0.07),0 1px 3px rgba(0,0,0,0.04),inset 0 1px 0 rgba(255,255,255,1)',
                transition:'transform 0.18s cubic-bezier(0.34,1.56,0.64,1),box-shadow 0.18s',
                flexShrink:0,
                opacity: isLast ? 0.55 : 1,
              }}
                onMouseEnter={e=>{e.currentTarget.style.transform='scale(1.008)';e.currentTarget.style.boxShadow='0 8px 24px rgba(0,0,0,0.10),inset 0 1px 0 rgba(255,255,255,1)'}}
                onMouseLeave={e=>{e.currentTarget.style.transform='scale(1)';e.currentTarget.style.boxShadow='0 2px 12px rgba(0,0,0,0.07),0 1px 3px rgba(0,0,0,0.04),inset 0 1px 0 rgba(255,255,255,1)'}}
              >
                {/* Card header row */}
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12}}>
                  <div>
                    <p style={{fontSize:11,color:fgMuted,fontWeight:600,letterSpacing:'0.04em',textTransform:'uppercase'}}>{fmtDate(entry.date)}</p>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginTop:6}}>
                      <div style={{
                        width:32,height:32,borderRadius:10,
                        background:`${mood.color}18`,
                        display:'flex',alignItems:'center',justifyContent:'center',
                        fontSize:17,flexShrink:0,
                      }}>{mood.emoji}</div>
                      <div>
                        <p style={{fontSize:15,fontWeight:700,color:fg,letterSpacing:'-0.02em',lineHeight:1.1}}>{mood.label}</p>
                        {entry.shared&&<span style={{fontSize:9.5,padding:'1px 6px',borderRadius:99,background:'rgba(0,122,255,0.10)',color:'#007AFF',fontWeight:700}}>Shared</span>}
                      </div>
                    </div>
                  </div>
                  {/* Wellness rings */}
                  <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:8}}>
                    <div style={{display:'flex',gap:5}}>
                      {WELLNESS.map(w=>{
                        const val=entry[w.key as keyof Entry] as number
                        return (
                          <div key={w.key} style={{position:'relative',width:26,height:26}}>
                            <Ring value={val} max={w.max} color={w.color} size={26}/>
                            <span style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:7}}>{w.icon}</span>
                          </div>
                        )
                      })}
                    </div>
                    <span style={{fontSize:11,color:'#007AFF',fontWeight:600,letterSpacing:'-0.01em'}}>View ›</span>
                  </div>
                </div>

                {/* Divider */}
                <div style={{height:1,background:'rgba(60,60,67,0.07)',marginBottom:11}}/>

                {/* Emotions + note */}
                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  {(entry.emotions??[]).length>0&&(
                    <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
                      {(entry.emotions??[]).map(label=>{
                        const tag=EMOTION_TAGS.find(t=>t.label===label);if(!tag)return null
                        return (
                          <span key={label} style={{
                            fontSize:10.5,fontWeight:700,padding:'3px 10px',borderRadius:99,
                            background:tag.color+'22',color:tag.color,
                            border:`1px solid ${tag.color}30`,
                          }}>{tag.emoji} {tag.label}</span>
                        )
                      })}
                    </div>
                  )}
                  {entry.note
                    ? <p style={{fontSize:13,color:fgSub,lineHeight:1.58,fontStyle:'italic',letterSpacing:'-0.005em'}}>"{entry.note}"</p>
                    : <p style={{fontSize:12,color:fgMuted,fontStyle:'italic'}}>No note — tap to add one</p>
                  }
                  {(entry.logs??[]).length>0&&(
                    <p style={{fontSize:11,color:'#007AFF',fontWeight:700,marginTop:1}}>+{entry.logs.length} timestamped note{entry.logs.length>1?'s':''}</p>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {/* Bottom fade-out gradient — simulates scroll clipping */}
        <div style={{
          position:'absolute',bottom:0,left:0,right:0,height:96,
          background:'linear-gradient(to bottom,transparent 0%,#F2F2F7 100%)',
          pointerEvents:'none',
        }}/>
      </div>

      {selected&&<EntryDetailSheet entry={selected} onClose={()=>setSelected(null)} onSave={u=>{onUpdateEntry(u);setSelected(null)}}/>}
    </div>
  )
}

// ─── Check-In ─────────────────────────────────────────────────────────────────

function CheckInScreen({onSave,onDone}:{onSave:(e:Entry)=>void;onDone:()=>void}) {
  const [step,setStep]=useState(0);const[mood,setMood]=useState<number|null>(null)
  const [vals,setVals]=useState({sleep:7,movement:20,water:5,mindfulness:10})
  const [note,setNote]=useState('');const[done,setDone]=useState(false)
  useEffect(()=>{if(done){const t=setTimeout(onDone,1800);return()=>clearTimeout(t)}},[done,onDone])
  const handleSave=()=>{if(!mood)return;onSave({id:Date.now().toString(),date:todayStr(),mood,note,sleep:vals.sleep,movement:vals.movement,water:vals.water,mindfulness:vals.mindfulness,shared:false,logs:[],emotions:[]});setDone(true)}

  if(done)return(
    <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:32,gap:18}}>
      <div style={{width:88,height:88,borderRadius:'50%',background:'#34C759',display:'flex',alignItems:'center',justifyContent:'center',fontSize:40,boxShadow:'0 8px 32px rgba(52,199,89,0.40)'}}>✓</div>
      <h2 style={{fontSize:26,fontWeight:700,color:fg,letterSpacing:'-0.02em',textAlign:'center'}}>Entry saved</h2>
      <p style={{fontSize:14,color:fgMuted,textAlign:'center',lineHeight:1.7}}>Well done for checking in today.<br/>Every entry is an act of self-care.</p>
    </div>
  )

  const steps=['Mood','Wellness','Note'];const pct=((step+1)/steps.length)*100
  return(
    <div style={{flex:1,display:'flex',flexDirection:'column',padding:'18px 24px',paddingBottom:100,overflow:'hidden'}}>
      <div style={{marginBottom:18}}>
        <h2 style={{fontSize:28,fontWeight:700,color:fg,letterSpacing:'-0.03em'}}>Today's Check-In</h2>
        <p style={{fontSize:13,color:fgMuted,marginTop:4}}>Step {step+1} of {steps.length} — {steps[step]}</p>
        <div style={{height:4,background:'rgba(60,60,67,0.10)',borderRadius:99,marginTop:12,overflow:'hidden'}}>
          <div style={{height:'100%',width:`${pct}%`,background:'#007AFF',borderRadius:99,transition:'width 0.4s cubic-bezier(0.4,0,0.2,1)'}}/>
        </div>
      </div>

      {step===0&&(
        <div style={{flex:1,display:'flex',flexDirection:'column',gap:10,overflowY:'auto'}}>
          <p style={{fontSize:16,fontWeight:600,color:fg,marginBottom:4}}>How are you feeling right now?</p>
          {MOODS.map(m=>(
            <button key={m.value} onClick={()=>setMood(m.value)} style={{
              display:'flex',alignItems:'center',gap:14,padding:'15px 18px',
              borderRadius:16,
              background:mood===m.value?m.color:'rgba(255,255,255,0.72)',
              backdropFilter:'blur(24px)',WebkitBackdropFilter:'blur(24px)',
              border:`1px solid ${mood===m.value?m.color:'rgba(255,255,255,0.88)'}`,
              boxShadow:mood===m.value?`0 4px 16px ${m.color}40, inset 0 1px 0 rgba(255,255,255,0.3)`:'0 2px 8px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.85)',
              transition:'all 0.18s',
            }}>
              <span style={{fontSize:26}}>{m.emoji}</span>
              <span style={{fontSize:15,fontWeight:700,color:mood===m.value?'white':fg,letterSpacing:'-0.01em'}}>{m.label}</span>
              {mood===m.value&&<span style={{marginLeft:'auto',color:'white',fontSize:15,fontWeight:700}}>✓</span>}
            </button>
          ))}
          <button onClick={()=>mood&&setStep(1)} style={{marginTop:'auto',padding:'17px',borderRadius:16,fontSize:16,fontWeight:700,letterSpacing:'-0.01em',background:mood?'#007AFF':'rgba(120,120,128,0.15)',color:mood?'white':fgMuted,boxShadow:mood?'0 4px 16px rgba(0,122,255,0.35)':'none',transition:'all 0.2s'}}>Continue →</button>
        </div>
      )}

      {step===1&&(
        <div style={{flex:1,display:'flex',flexDirection:'column',gap:0,overflowY:'auto'}}>
          <p style={{fontSize:16,fontWeight:600,color:fg,marginBottom:16}}>How did you take care of yourself?</p>
          <div style={{...LG.card,padding:'20px',display:'flex',flexDirection:'column',gap:20,flex:1}}>
            {WELLNESS.map(w=>{
              const val=vals[w.key as keyof typeof vals]
              return(
                <div key={w.key}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:12}}>
                    <span style={{fontSize:14,fontWeight:500,color:fgSub}}>{w.icon} {w.label}</span>
                    <span style={{fontSize:15,fontWeight:800,color:w.color,letterSpacing:'-0.02em'}}>{val} <span style={{fontSize:11,fontWeight:500}}>{w.unit}</span></span>
                  </div>
                  <Slider value={val} max={w.max} step={w.unit==='hrs'?0.5:5} color={w.color} onChange={v=>setVals(prev=>({...prev,[w.key]:v}))}/>
                </div>
              )
            })}
          </div>
          <div style={{display:'flex',gap:10,marginTop:14}}>
            <button onClick={()=>setStep(0)} style={{flex:1,padding:'15px',borderRadius:14,fontSize:14,fontWeight:700,...LG.card,color:fg}}>← Back</button>
            <button onClick={()=>setStep(2)} style={{flex:2,padding:'15px',borderRadius:14,fontSize:14,fontWeight:700,background:'#007AFF',color:'white',boxShadow:'0 4px 14px rgba(0,122,255,0.35)'}}>Continue →</button>
          </div>
        </div>
      )}

      {step===2&&(
        <div style={{flex:1,display:'flex',flexDirection:'column',gap:14}}>
          <p style={{fontSize:16,fontWeight:600,color:fg}}>Anything on your mind?</p>
          <p style={{fontSize:13,color:fgMuted}}>No pressure — this is just for you.</p>
          <div style={{flex:1,...LG.card,padding:'16px',minHeight:140}}>
            <textarea placeholder="Write freely here…" value={note} onChange={e=>setNote(e.target.value)} style={{width:'100%',height:'100%',fontSize:15,lineHeight:1.65,color:fg}}/>
          </div>
          <div style={{display:'flex',gap:10}}>
            <button onClick={()=>setStep(1)} style={{flex:1,padding:'15px',borderRadius:14,fontSize:14,fontWeight:700,...LG.card,color:fg}}>← Back</button>
            <button onClick={handleSave} style={{flex:2,padding:'15px',borderRadius:14,fontSize:14,fontWeight:700,background:'#34C759',color:'white',boxShadow:'0 4px 14px rgba(52,199,89,0.35)'}}>Save entry ✓</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── SOS ──────────────────────────────────────────────────────────────────────

function SOSScreen() {
  const [calling,setCalling]=useState<string|null>(null)
  return(
    <div style={{flex:1,overflowY:'auto',paddingBottom:100}}>
      <div style={{
        margin:'16px 24px 0',padding:'24px',borderRadius:22,position:'relative',overflow:'hidden',
        background:'linear-gradient(135deg,rgba(255,59,48,0.14) 0%,rgba(255,149,0,0.08) 100%)',
        backdropFilter:'blur(40px) saturate(1.8)',WebkitBackdropFilter:'blur(40px) saturate(1.8)',
        border:'1px solid rgba(255,255,255,0.85)',
        boxShadow:'0 4px 20px rgba(255,59,48,0.10), inset 0 1px 0 rgba(255,255,255,0.9)',
      }}>
        <div style={{position:'absolute',top:-20,right:-20,width:100,height:100,borderRadius:'50%',background:'rgba(255,255,255,0.12)'}}/>
        <p style={{fontSize:10,letterSpacing:'0.08em',textTransform:'uppercase',color:'#FF3B30',fontWeight:700,marginBottom:8}}>Emergency Support</p>
        <h2 style={{fontSize:26,fontWeight:700,color:fg,letterSpacing:'-0.025em',lineHeight:1.2}}>You are not<br/>alone right now.</h2>
        <p style={{fontSize:14,color:fgSub,marginTop:8,lineHeight:1.5}}>Reach out to someone who cares.</p>
      </div>

      <div style={{padding:'14px 24px',display:'flex',flexDirection:'column',gap:10}}>
        <div style={{...LG.card,padding:'14px 16px',background:'rgba(255,255,255,0.72)'}}>
          <p style={{fontSize:13,color:fg,lineHeight:1.6}}><strong style={{color:'#FF3B30'}}>Crisis line:</strong> Text or call <strong>988</strong> — free, confidential, 24/7.</p>
        </div>
        <p style={{fontSize:11,fontWeight:700,color:fgMuted,letterSpacing:'0.06em',textTransform:'uppercase',marginTop:4}}>Your contacts</p>
        {CONTACTS.map(c=>(
          <div key={c.id} style={{...LG.card,padding:'14px 16px',display:'flex',alignItems:'center',gap:12}}>
            <div style={{
              width:46,height:46,borderRadius:15,flexShrink:0,
              background:c.id==='4'?'rgba(255,59,48,0.12)':'rgba(0,122,255,0.10)',
              border:`1px solid ${c.id==='4'?'rgba(255,59,48,0.20)':'rgba(0,122,255,0.15)'}`,
              display:'flex',alignItems:'center',justifyContent:'center',
              fontSize:c.id==='4'?18:12,fontWeight:800,color:c.id==='4'?'#FF3B30':'#007AFF',
            }}>{c.avatar}</div>
            <div style={{flex:1}}>
              <p style={{fontSize:14,fontWeight:700,color:fg,letterSpacing:'-0.01em'}}>{c.name}</p>
              <p style={{fontSize:12,color:fgMuted,marginTop:2}}>{c.relation}</p>
            </div>
            <button onClick={()=>setCalling(c.id)} style={{
              padding:'10px 18px',borderRadius:99,fontSize:13,fontWeight:700,
              background:c.id==='4'?'#FF3B30':'#007AFF',color:'white',flexShrink:0,
              boxShadow:c.id==='4'?'0 3px 10px rgba(255,59,48,0.35)':'0 3px 10px rgba(0,122,255,0.30)',
            }}>{calling===c.id?'Calling…':'Call'}</button>
          </div>
        ))}
        <div style={{...LG.card,padding:'18px',marginTop:4}}>
          <p style={{fontSize:14,fontWeight:700,color:fg,marginBottom:12}}>🫁 Quick grounding</p>
          {['Name 5 things you can see','Name 4 things you can touch','Name 3 things you can hear','Take 3 slow, deep breaths'].map((t,i)=>(
            <div key={i} style={{display:'flex',alignItems:'flex-start',gap:10,padding:'9px 0',borderBottom:i<3?'1px solid rgba(60,60,67,0.06)':'none'}}>
              <span style={{width:22,height:22,borderRadius:'50%',background:'rgba(0,122,255,0.10)',color:'#007AFF',fontSize:11,fontWeight:800,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginTop:1}}>{i+1}</span>
              <p style={{fontSize:13,color:fgSub,lineHeight:1.5}}>{t}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── More ─────────────────────────────────────────────────────────────────────

// Profile avatar — light blue abstract plant
function ProfileAvatar({size=54}:{size?:number}) {
  return (
    <div style={{
      width:size,height:size,borderRadius:size*0.33,flexShrink:0,overflow:'hidden',
      background:'linear-gradient(145deg,#E8F4FF 0%,#C8E6FF 100%)',
      border:'1px solid rgba(0,122,255,0.12)',
      display:'flex',alignItems:'center',justifyContent:'center',
    }}>
      <svg width={size*0.58} height={size*0.62} viewBox="0 0 32 34" fill="none">
        <path d="M16 32 C16 32 8 26 8 18 C8 13.6 11.6 10 16 10 C20.4 10 24 13.6 24 18 C24 26 16 32 16 32Z" fill="#60B8FF" opacity="0.7"/>
        <path d="M16 10 C16 10 10 6 10 1" stroke="#34A8FF" strokeWidth="1.8" strokeLinecap="round"/>
        <path d="M16 14 C16 14 22 9 26 6" stroke="#60C8FF" strokeWidth="1.6" strokeLinecap="round" opacity="0.8"/>
        <path d="M16 18 C16 18 9 16 6 12" stroke="#34A8FF" strokeWidth="1.4" strokeLinecap="round" opacity="0.7"/>
        <circle cx="16" cy="10" r="2.5" fill="#007AFF" opacity="0.6"/>
      </svg>
    </div>
  )
}

// Icon containers for Access rows
function SettingsRowIcon({color,bg,children}:{color:string;bg:string;children:React.ReactNode}) {
  return (
    <div style={{
      width:40,height:40,borderRadius:11,flexShrink:0,
      background:bg,
      display:'flex',alignItems:'center',justifyContent:'center',
      boxShadow:`inset 0 1px 0 rgba(255,255,255,0.3), 0 1px 3px ${color}22`,
    }}>{children}</div>
  )
}

function MoreScreen({onNav,onLogout,isDark,onToggleDark}:{onNav:(s:Screen)=>void;onLogout:()=>void;isDark:boolean;onToggleDark:()=>void}) {
  const [notifOn,setNotifOn]=useState(true)
  const [reminderOn,setReminderOn]=useState(true)
  const [biometricOn,setBiometricOn]=useState(false)
  const [editOpen,setEditOpen]=useState(false)
  const [editName,setEditName]=useState('Alex Morgan')
  const [editEmail,setEditEmail]=useState('alex@example.com')
  const [editBio,setEditBio]=useState('Wellness enthusiast, daily journaler.')
  const [focused,setFocused]=useState<string|null>(null)

  const dk = isDark
  const dfg = dk ? '#F2F2F7' : fg
  const dfgSub = dk ? 'rgba(235,235,245,0.60)' : fgSub
  const dfgMuted = dk ? 'rgba(235,235,245,0.30)' : fgMuted
  const dBg = dk ? '#000000' : '#F2F2F7'
  const dCard = dk ? '#1C1C1E' : '#FFFFFF'
  const dCardShadow = dk ? '0 1px 3px rgba(0,0,0,0.40),0 2px 10px rgba(0,0,0,0.30)' : '0 1px 3px rgba(0,0,0,0.06),0 2px 10px rgba(0,0,0,0.04)'
  const dDivider = dk ? 'rgba(255,255,255,0.07)' : 'rgba(60,60,67,0.07)'

  const sectionLabel=(text:string) => (
    <p style={{
      fontSize:12,fontWeight:700,
      color: dk ? 'rgba(235,235,245,0.30)' : 'rgba(60,60,67,0.45)',
      letterSpacing:'0.055em',textTransform:'uppercase',
      marginBottom:8,paddingLeft:4,
    }}>{text}</p>
  )

  const divider = <div style={{height:1,background:dDivider,marginLeft:56}}/>

  const fieldStyle=(id:string):React.CSSProperties=>({
    width:'100%',padding:'12px 14px',
    borderRadius:11,fontSize:15,color:dfg,
    background: dk ? '#2C2C2E' : '#F2F2F7',
    border:`1.5px solid ${focused===id?'#007AFF':'transparent'}`,
    boxShadow:focused===id?'0 0 0 3px rgba(0,122,255,0.10)':'none',
    transition:'border-color 0.16s, box-shadow 0.16s',
    outline:'none',
  })

  const chevron = (
    <svg width="8" height="13" viewBox="0 0 8 13" fill="none">
      <path d="M1.5 1.5L6.5 6.5L1.5 11.5" stroke={dk?'rgba(235,235,245,0.25)':'rgba(60,60,67,0.28)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )

  return (
    <div style={{flex:1,overflowY:'auto',background:dBg,paddingBottom:108,position:'relative',transition:'background 0.3s'}}>

      {/* ── Header ── */}
      <div style={{padding:'16px 22px 12px'}}>
        <h2 style={{fontSize:30,fontWeight:700,color:dfg,letterSpacing:'-0.032em',lineHeight:1}}>Settings</h2>
      </div>

      {/* ── Profile card ── */}
      <div style={{margin:'0 16px 22px'}}>
        <div style={{
          background:dCard,borderRadius:18,
          padding:'15px 16px',
          display:'flex',alignItems:'center',gap:13,
          boxShadow:dCardShadow,transition:'background 0.3s',
        }}>
          <ProfileAvatar size={52}/>
          <div style={{flex:1,minWidth:0}}>
            <p style={{fontSize:16,fontWeight:700,color:dfg,letterSpacing:'-0.015em',lineHeight:1.2}}>{editName}</p>
            <p style={{fontSize:13,color:dfgMuted,marginTop:3,fontWeight:400}}>{editEmail}</p>
          </div>
          <button onClick={()=>setEditOpen(true)} style={{
            fontSize:14,fontWeight:600,
            padding:'7px 16px',borderRadius:99,
            background:dk?'rgba(0,122,255,0.18)':'rgba(0,122,255,0.09)',
            color:'#007AFF',
            border:dk?'1px solid rgba(0,122,255,0.28)':'1px solid rgba(0,122,255,0.14)',
            flexShrink:0,margin:0,
          }}>Edit</button>
        </div>
      </div>

      {/* ── Preferences ── */}
      <div style={{padding:'0 16px',marginBottom:22}}>
        {sectionLabel('Preferences')}
        <div style={{background:dCard,borderRadius:16,overflow:'hidden',boxShadow:dCardShadow,transition:'background 0.3s'}}>

          {/* Daily reminder */}
          <div style={{display:'flex',alignItems:'center',padding:'13px 16px',gap:12}}>
            <div style={{flex:1}}>
              <p style={{fontSize:15,fontWeight:500,color:dfg,lineHeight:1.2}}>Daily reminder</p>
              <p style={{fontSize:12,color:dfgMuted,marginTop:2}}>8:00 AM nudge</p>
            </div>
            <Toggle on={reminderOn} onChange={()=>setReminderOn(p=>!p)} color="#34C759"/>
          </div>
          <div style={{height:1,background:dDivider,marginLeft:16}}/>

          {/* Notifications */}
          <div style={{display:'flex',alignItems:'center',padding:'13px 16px',gap:12}}>
            <div style={{flex:1}}>
              <p style={{fontSize:15,fontWeight:500,color:dfg,lineHeight:1.2}}>Notifications</p>
              <p style={{fontSize:12,color:dfgMuted,marginTop:2}}>Check-in alerts</p>
            </div>
            <Toggle on={notifOn} onChange={()=>setNotifOn(p=>!p)} color="#34C759"/>
          </div>
          <div style={{height:1,background:dDivider,marginLeft:16}}/>

          {/* Dark mode — with crescent moon icon */}
          <div style={{display:'flex',alignItems:'center',padding:'13px 16px',gap:12}}>
            {/* Moon icon */}
            <div style={{
              width:34,height:34,borderRadius:10,flexShrink:0,
              background:dk?'rgba(88,86,214,0.22)':'rgba(88,86,214,0.10)',
              display:'flex',alignItems:'center',justifyContent:'center',
              transition:'background 0.3s',
            }}>
              <svg width="17" height="17" viewBox="0 0 20 20" fill="none">
                <path
                  d="M17.5 10.9A8 8 0 019.1 2.5a8 8 0 100 15 8 8 0 008.4-6.6z"
                  fill="#5856D6" opacity="0.18"
                  stroke="#5856D6" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
                />
              </svg>
            </div>
            <div style={{flex:1}}>
              <p style={{fontSize:15,fontWeight:500,color:dfg,lineHeight:1.2}}>Dark mode</p>
              <p style={{fontSize:12,color:dfgMuted,marginTop:2}}>System appearance</p>
            </div>
            <Toggle on={isDark} onChange={onToggleDark} color="#34C759"/>
          </div>

        </div>
      </div>

      {/* ── Access ── */}
      <div style={{padding:'0 16px'}}>
        {sectionLabel('Access')}
        <div style={{display:'flex',flexDirection:'column',gap:10}}>

          {/* Privacy Settings */}
          <button onClick={()=>onNav('privacy')} style={{
            background:dCard,borderRadius:16,padding:'13px 16px',
            display:'flex',alignItems:'center',gap:13,width:'100%',textAlign:'left',
            boxShadow:dCardShadow,transition:'background 0.3s',
          }}>
            <SettingsRowIcon color="#AF52DE" bg={dk?'rgba(175,82,222,0.18)':'linear-gradient(145deg,#F4E8FF,#E8D4FF)'}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <rect x="5" y="11" width="14" height="10" rx="2.5" stroke="#AF52DE" strokeWidth="1.8" fill="rgba(175,82,222,0.12)"/>
                <path d="M8 11V7a4 4 0 018 0v4" stroke="#AF52DE" strokeWidth="1.8" strokeLinecap="round"/>
                <circle cx="12" cy="16" r="1.4" fill="#AF52DE"/>
              </svg>
            </SettingsRowIcon>
            <div style={{flex:1}}>
              <p style={{fontSize:15,fontWeight:600,color:dfg,letterSpacing:'-0.01em'}}>Privacy Settings</p>
              <p style={{fontSize:12,color:dfgMuted,marginTop:2}}>Manage shared entries</p>
            </div>
            {chevron}
          </button>

          {/* Psychologist View */}
          <button onClick={()=>onNav('psychologist')} style={{
            background:dCard,borderRadius:16,padding:'13px 16px',
            display:'flex',alignItems:'center',gap:13,width:'100%',textAlign:'left',
            boxShadow:dCardShadow,transition:'background 0.3s',
          }}>
            <SettingsRowIcon color="#007AFF" bg={dk?'rgba(0,122,255,0.18)':'linear-gradient(145deg,#E8F4FF,#D0E8FF)'}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="8" r="3.5" stroke="#007AFF" strokeWidth="1.8" fill="rgba(0,122,255,0.10)"/>
                <path d="M5 19c0-3.314 3.134-6 7-6s7 2.686 7 6" stroke="#007AFF" strokeWidth="1.8" strokeLinecap="round"/>
                <path d="M17 11.5c1.5 0 2.5 1 2.5 2.5s-1 2.5-2.5 2.5" stroke="#007AFF" strokeWidth="1.6" strokeLinecap="round"/>
                <line x1="19" y1="13" x2="21" y2="13" stroke="#007AFF" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
            </SettingsRowIcon>
            <div style={{flex:1}}>
              <p style={{fontSize:15,fontWeight:600,color:dfg,letterSpacing:'-0.01em'}}>Psychologist View</p>
              <p style={{fontSize:12,color:dfgMuted,marginTop:2}}>Professional performance view</p>
            </div>
            {chevron}
          </button>

          {/* Biometric login */}
          <div style={{
            background:dCard,borderRadius:16,padding:'13px 16px',
            display:'flex',alignItems:'center',gap:13,
            boxShadow:dCardShadow,transition:'background 0.3s',
          }}>
            <SettingsRowIcon color="#34C759" bg={dk?'rgba(52,199,89,0.16)':'linear-gradient(145deg,#E8FFF0,#D0F5E0)'}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M12 3C9 3 6.5 5.5 6.5 8.5V11" stroke="#34C759" strokeWidth="1.8" strokeLinecap="round"/>
                <path d="M17.5 11V8.5C17.5 5.5 15 3 12 3" stroke="#34C759" strokeWidth="1.8" strokeLinecap="round"/>
                <rect x="4" y="11" width="16" height="10" rx="3" stroke="#34C759" strokeWidth="1.8" fill="rgba(52,199,89,0.10)"/>
                <path d="M9 16c0 1.657 1.343 3 3 3s3-1.343 3-3-1.343-3-3-3-3 1.343-3 3z" fill="#34C759" opacity="0.5"/>
                <circle cx="12" cy="16" r="1.2" fill="#34C759"/>
              </svg>
            </SettingsRowIcon>
            <div style={{flex:1}}>
              <p style={{fontSize:15,fontWeight:600,color:dfg,letterSpacing:'-0.01em'}}>Authentication Log-in</p>
              <p style={{fontSize:12,color:dfgMuted,marginTop:2}}>Face ID / Biometric unlock</p>
            </div>
            <Toggle on={biometricOn} onChange={()=>setBiometricOn(p=>!p)} color="#34C759"/>
          </div>

          {/* Log out */}
          <button onClick={onLogout} style={{
            background:dCard,borderRadius:16,padding:'13px 16px',
            display:'flex',alignItems:'center',gap:13,width:'100%',textAlign:'left',
            boxShadow:dCardShadow,transition:'background 0.3s',
          }}>
            <SettingsRowIcon color="#FF3B30" bg={dk?'rgba(255,59,48,0.16)':'linear-gradient(145deg,#FFF0EE,#FFE0DE)'}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4" stroke="#FF3B30" strokeWidth="1.8" strokeLinecap="round"/>
                <path d="M10 17l5-5-5-5" stroke="#FF3B30" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="15" y1="12" x2="3" y2="12" stroke="#FF3B30" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </SettingsRowIcon>
            <div style={{flex:1}}>
              <p style={{fontSize:15,fontWeight:600,color:'#FF3B30',letterSpacing:'-0.01em'}}>Log out</p>
              <p style={{fontSize:12,color:dfgMuted,marginTop:2}}>Sign out of your account and redirect to the welcome page</p>
            </div>
          </button>

        </div>
      </div>

      {/* ── Edit profile sheet ─────────────────────────────── */}
      {editOpen&&(
        <>
          {/* Scrim */}
          <div
            onClick={()=>setEditOpen(false)}
            style={{
              position:'absolute',inset:0,
              background:'rgba(0,0,0,0.22)',
              backdropFilter:'blur(4px)',WebkitBackdropFilter:'blur(4px)',
              zIndex:40,
              animation:'fadeIn 0.2s ease',
            }}
          />
          {/* Sheet — slides up ~52% of screen */}
          <div style={{
            position:'absolute',bottom:0,left:0,right:0,
            height:'54%',
            background:dk?'#1C1C1E':'#F2F2F7',
            borderRadius:'24px 24px 0 0',
            zIndex:50,
            display:'flex',flexDirection:'column',
            boxShadow:dk?'0 -8px 48px rgba(0,0,0,0.50)':'0 -8px 32px rgba(0,0,0,0.14), 0 -1px 0 rgba(255,255,255,0.6)',
            animation:'slideUp 0.34s cubic-bezier(0.32,0.72,0,1)',
            overflow:'hidden',
          }}>
            {/* Handle + header */}
            <div style={{
              padding:'12px 20px 12px',flexShrink:0,
              background:dk?'#1C1C1E':'#F2F2F7',
              borderBottom:`1px solid ${dDivider}`,
            }}>
              <div style={{width:36,height:4,borderRadius:99,background:dk?'rgba(255,255,255,0.18)':'rgba(60,60,67,0.18)',margin:'0 auto 14px'}}/>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <button onClick={()=>setEditOpen(false)} style={{fontSize:15,color:dfgSub,fontWeight:500,padding:0,margin:0}}>Cancel</button>
                <p style={{fontSize:16,fontWeight:700,color:dfg,letterSpacing:'-0.02em'}}>Edit Profile</p>
                <button
                  onClick={()=>setEditOpen(false)}
                  style={{fontSize:15,fontWeight:700,color:'#007AFF',padding:0,margin:0}}
                >Save</button>
              </div>
            </div>

            {/* Fields */}
            <div style={{flex:1,overflowY:'auto',padding:'18px 16px',display:'flex',flexDirection:'column',gap:12}}>
              {/* Avatar row */}
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8,marginBottom:4}}>
                <ProfileAvatar size={64}/>
                <button style={{fontSize:13,fontWeight:700,color:'#007AFF',padding:0,margin:0}}>Change photo</button>
              </div>

              {/* Name */}
              <div style={{background:'#FFFFFF',borderRadius:14,overflow:'hidden',boxShadow:'0 1px 3px rgba(0,0,0,0.05)'}}>
                <div style={{padding:'11px 14px 3px'}}>
                  <p style={{fontSize:11,fontWeight:600,color:'rgba(60,60,67,0.45)',letterSpacing:'0.04em',textTransform:'uppercase'}}>Full name</p>
                </div>
                <input
                  value={editName} onChange={e=>setEditName(e.target.value)}
                  onFocus={()=>setFocused('name')} onBlur={()=>setFocused(null)}
                  style={{...fieldStyle('name'),borderRadius:0,background:'transparent',padding:'4px 14px 11px',border:'none',boxShadow:'none',fontSize:15}}
                />
              </div>

              {/* Email */}
              <div style={{background:'#FFFFFF',borderRadius:14,overflow:'hidden',boxShadow:'0 1px 3px rgba(0,0,0,0.05)'}}>
                <div style={{padding:'11px 14px 3px'}}>
                  <p style={{fontSize:11,fontWeight:600,color:'rgba(60,60,67,0.45)',letterSpacing:'0.04em',textTransform:'uppercase'}}>Email</p>
                </div>
                <input
                  type="email" value={editEmail} onChange={e=>setEditEmail(e.target.value)}
                  onFocus={()=>setFocused('email')} onBlur={()=>setFocused(null)}
                  style={{...fieldStyle('email'),borderRadius:0,background:'transparent',padding:'4px 14px 11px',border:'none',boxShadow:'none',fontSize:15}}
                />
              </div>

              {/* Bio */}
              <div style={{background:'#FFFFFF',borderRadius:14,overflow:'hidden',boxShadow:'0 1px 3px rgba(0,0,0,0.05)'}}>
                <div style={{padding:'11px 14px 3px'}}>
                  <p style={{fontSize:11,fontWeight:600,color:'rgba(60,60,67,0.45)',letterSpacing:'0.04em',textTransform:'uppercase'}}>Bio</p>
                </div>
                <textarea
                  value={editBio} onChange={e=>setEditBio(e.target.value)} rows={2}
                  onFocus={()=>setFocused('bio')} onBlur={()=>setFocused(null)}
                  style={{width:'100%',background:'transparent',padding:'4px 14px 11px',border:'none',boxShadow:'none',fontSize:15,color:fg,resize:'none',outline:'none',lineHeight:1.55}}
                />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Privacy ──────────────────────────────────────────────────────────────────

function PrivacyScreen({entries,onToggle,onBack}:{entries:Entry[];onToggle:(id:string)=>void;onBack:()=>void}) {
  return(
    <div style={{flex:1,overflowY:'auto',paddingBottom:100}}>
      <div style={{padding:'16px 24px 0',display:'flex',alignItems:'center',gap:12,marginBottom:16}}>
        <button onClick={onBack} style={{color:'#007AFF',fontSize:15,fontWeight:600,display:'flex',alignItems:'center',gap:3}}>← Back</button>
        <h2 style={{fontSize:22,fontWeight:700,color:fg,letterSpacing:'-0.02em'}}>Privacy</h2>
      </div>
      <div style={{padding:'0 24px',marginBottom:14}}>
        <div style={{...LG.card,padding:'14px 16px',background:'rgba(0,122,255,0.06)',border:'1px solid rgba(0,122,255,0.14)'}}>
          <p style={{fontSize:13,color:'#007AFF',lineHeight:1.6}}><strong>Shared entries</strong> are visible to your psychologist. Toggle below.</p>
        </div>
      </div>
      <div style={{padding:'0 24px',display:'flex',flexDirection:'column',gap:8}}>
        {[...entries].reverse().map(e=>{
          const mood=MOODS[e.mood-1]
          return(
            <div key={e.id} style={{...LG.card,display:'flex',alignItems:'center',gap:12,padding:'13px 16px'}}>
              <span style={{fontSize:20}}>{mood.emoji}</span>
              <div style={{flex:1}}>
                <p style={{fontSize:13,fontWeight:700,color:fg,letterSpacing:'-0.01em'}}>{fmtDateShort(e.date)}</p>
                <p style={{fontSize:11,color:fgMuted,marginTop:2}}>{mood.label}</p>
              </div>
              <Toggle on={e.shared} onChange={()=>onToggle(e.id)} color="#007AFF"/>
              <span style={{fontSize:11,color:e.shared?'#007AFF':fgMuted,fontWeight:700,width:44,textAlign:'right'}}>{e.shared?'Shared':'Private'}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Psychologist ─────────────────────────────────────────────────────────────

function PsychologistScreen({entries,onBack}:{entries:Entry[];onBack:()=>void}) {
  const shared=entries.filter(e=>e.shared)
  const avgMood=shared.length?shared.reduce((a,b)=>a+b.mood,0)/shared.length:0
  const avgSleep=shared.length?shared.reduce((a,b)=>a+b.sleep,0)/shared.length:0
  const avgMove=shared.length?shared.reduce((a,b)=>a+b.movement,0)/shared.length:0
  const moodTrend=shared.slice(-3).map(e=>e.mood)
  const trendUp=moodTrend.length>=2&&moodTrend[moodTrend.length-1]>moodTrend[0]
  const moodDist=MOODS.map(m=>({...m,count:shared.filter(e=>e.mood===m.value).length}))
  return(
    <div style={{flex:1,overflowY:'auto',paddingBottom:100}}>
      <div style={{
        margin:'16px 24px 0',padding:'22px',borderRadius:22,position:'relative',overflow:'hidden',
        background:'linear-gradient(135deg,rgba(0,122,255,0.12) 0%,rgba(90,200,250,0.08) 100%)',
        backdropFilter:'blur(40px) saturate(1.8)',WebkitBackdropFilter:'blur(40px) saturate(1.8)',
        border:'1px solid rgba(255,255,255,0.88)',
        boxShadow:'0 4px 20px rgba(0,122,255,0.10), inset 0 1px 0 rgba(255,255,255,0.9)',
      }}>
        <div style={{position:'absolute',top:-20,right:-20,width:100,height:100,borderRadius:'50%',background:'rgba(255,255,255,0.12)'}}/>
        <button onClick={onBack} style={{color:'#007AFF',fontSize:14,marginBottom:12,display:'flex',alignItems:'center',gap:4,fontWeight:600}}>← Back</button>
        <p style={{fontSize:10,letterSpacing:'0.08em',textTransform:'uppercase',color:'#007AFF',fontWeight:700,marginBottom:6}}>Professional View</p>
        <h2 style={{fontSize:24,fontWeight:700,color:fg,letterSpacing:'-0.025em',lineHeight:1.2}}>Alex Morgan<br/>Performance Summary</h2>
        <p style={{fontSize:12,color:fgMuted,marginTop:6}}>{shared.length} shared entries</p>
      </div>

      <div style={{padding:'14px 24px',display:'flex',flexDirection:'column',gap:12}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
          {[
            {label:'Avg Mood',  value:avgMood.toFixed(1),  unit:'/5',      color:'#34C759', icon:'😊'},
            {label:'Trend',     value:trendUp?'↑ Rising':'→ Stable',unit:'',color:trendUp?'#34C759':'#FF9500',icon:'📈'},
            {label:'Avg Sleep', value:avgSleep.toFixed(1), unit:'hrs',     color:'#AF52DE', icon:'🌙'},
            {label:'Movement',  value:Math.round(avgMove), unit:'min/day', color:'#FF9500', icon:'🌿'},
          ].map(m=>(
            <div key={m.label} style={{...LG.card,padding:'16px'}}>
              <span style={{fontSize:22}}>{m.icon}</span>
              <p style={{fontSize:24,fontWeight:800,color:m.color,marginTop:8,lineHeight:1,letterSpacing:'-0.03em'}}>{m.value}</p>
              <p style={{fontSize:10,color:fgMuted,marginTop:1,textTransform:'uppercase',letterSpacing:'0.04em'}}>{m.unit}</p>
              <p style={{fontSize:11,color:fgSub,marginTop:6,fontWeight:700}}>{m.label}</p>
            </div>
          ))}
        </div>

        <div style={{...LG.card,padding:'18px'}}>
          <p style={{fontSize:12,fontWeight:700,color:fgMuted,letterSpacing:'0.06em',textTransform:'uppercase',marginBottom:14}}>Mood distribution</p>
          {[...moodDist].reverse().map(m=>{
            const pct=shared.length?(m.count/shared.length)*100:0
            return(
              <div key={m.value} style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
                <span style={{fontSize:14,width:20}}>{m.emoji}</span>
                <div style={{flex:1,height:6,background:'rgba(60,60,67,0.08)',borderRadius:99,overflow:'hidden'}}>
                  <div style={{height:'100%',width:`${pct}%`,background:m.color,borderRadius:99,transition:'width 0.6s'}}/>
                </div>
                <span style={{fontSize:12,color:fgMuted,width:24,textAlign:'right',fontWeight:600}}>{m.count}x</span>
              </div>
            )
          })}
        </div>

        <div>
          <p style={{fontSize:12,fontWeight:700,color:fgMuted,letterSpacing:'0.06em',textTransform:'uppercase',marginBottom:10}}>Shared notes</p>
          {shared.filter(e=>e.note).slice(-4).reverse().map(e=>{
            const mood=MOODS[e.mood-1]
            return(
              <div key={e.id} style={{...LG.card,padding:'14px',marginBottom:8}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:7}}>
                  <span style={{fontSize:14}}>{mood.emoji}</span>
                  <span style={{fontSize:11,fontWeight:700,color:mood.color}}>{mood.label}</span>
                  <span style={{marginLeft:'auto',fontSize:11,color:fgMuted,fontWeight:500}}>{fmtDateShort(e.date)}</span>
                </div>
                <p style={{fontSize:13,color:fgSub,lineHeight:1.55,fontStyle:'italic'}}>"{e.note}"</p>
              </div>
            )
          })}
        </div>

        <div style={{...LG.card,padding:'16px',background:'rgba(255,204,0,0.06)',border:'1px solid rgba(255,204,0,0.18)'}}>
          <p style={{fontSize:13,fontWeight:700,color:'#B8860B',marginBottom:10}}>📋 Clinical notes</p>
          <textarea placeholder="Add session notes here…" rows={4} style={{width:'100%',fontSize:13,lineHeight:1.65,color:fg}}/>
        </div>
      </div>
    </div>
  )
}

// ─── Bloom Chat ───────────────────────────────────────────────────────────────

function BloomScreen() {
  const [messages,setMessages]=useState<ChatMsg[]>([{id:'0',role:'bloom',ts:new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}),text:"Hi, I'm Bloom — your gentle companion. This is a safe, private space. How are you feeling right now?"}])
  const [input,setInput]=useState('');const[typing,setTyping]=useState(false)
  const bottomRef=useRef<HTMLDivElement>(null);const inputRef=useRef<HTMLInputElement>(null)
  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:'smooth'})},[messages,typing])
  const sendMessage=(text:string)=>{
    if(!text.trim())return
    const ts=new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})
    setMessages(p=>[...p,{id:Date.now().toString(),role:'user',text:text.trim(),ts}])
    setInput('');setTyping(true)
    setTimeout(()=>{setMessages(p=>[...p,{id:(Date.now()+1).toString(),role:'bloom',text:bloomReply(text),ts:new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})}]);setTyping(false)},900+Math.random()*700)
  }
  return(
    <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden',background:'#FFFFFF'}}>

      {/* Header */}
      <div style={{
        padding:'16px 20px 14px',flexShrink:0,
        background:'rgba(255,255,255,0.96)',
        backdropFilter:'blur(40px) saturate(2)',WebkitBackdropFilter:'blur(40px) saturate(2)',
        borderBottom:'1px solid rgba(60,60,67,0.08)',
        display:'flex',alignItems:'center',gap:13,
      }}>
        {/* Circular brand icon */}
        <div style={{
          width:46,height:46,borderRadius:'50%',flexShrink:0,overflow:'hidden',
          background:'linear-gradient(145deg,#C8A8FF 0%,#7B5CF8 42%,#3B82F6 100%)',
          display:'flex',alignItems:'center',justifyContent:'center',
          boxShadow:'0 4px 14px rgba(123,92,248,0.35),inset 0 1px 0 rgba(255,255,255,0.28)',
        }}>
          <svg width="22" height="26" viewBox="0 0 22 26" fill="none">
            <path d="M11 24 C11 24 4 18 4 11 C4 7.13 7.13 4 11 4 C14.87 4 18 7.13 18 11 C18 18 11 24 11 24Z" fill="rgba(255,255,255,0.88)"/>
            <path d="M11 4 C11 4 7 1.5 7 -1" stroke="rgba(255,255,255,0.65)" strokeWidth="1.6" strokeLinecap="round"/>
            <path d="M11 7 C11 7 16 3.5 19 2" stroke="rgba(255,255,255,0.50)" strokeWidth="1.4" strokeLinecap="round"/>
            <circle cx="11" cy="11" r="2.2" fill="rgba(255,255,255,0.45)"/>
          </svg>
        </div>

        {/* Title + subtitle */}
        <div style={{flex:1}}>
          <p style={{fontSize:17,fontWeight:700,color:fg,letterSpacing:'-0.025em',lineHeight:1.15}}>Bloom</p>
          <p style={{fontSize:11.5,color:fgMuted,marginTop:2,fontWeight:400,letterSpacing:'-0.005em'}}>Your AI companion • Always here</p>
        </div>

        {/* Online badge */}
        <div style={{display:'flex',alignItems:'center',gap:5,padding:'4px 9px',borderRadius:99,background:'rgba(52,199,89,0.08)',border:'1px solid rgba(52,199,89,0.16)'}}>
          <span style={{width:6,height:6,borderRadius:'50%',background:'#34C759',display:'inline-block',flexShrink:0,boxShadow:'0 0 5px rgba(52,199,89,0.7)'}}/>
          <span style={{fontSize:10.5,color:'#34C759',fontWeight:700,letterSpacing:'0.01em'}}>Online</span>
        </div>
      </div>

      {/* Privacy safety bar */}
      <div style={{
        padding:'8px 16px',flexShrink:0,
        background:'rgba(242,242,247,0.80)',
        borderBottom:'1px solid rgba(60,60,67,0.06)',
        display:'flex',alignItems:'center',justifyContent:'center',gap:6,
      }}>
        <svg width="11" height="13" viewBox="0 0 11 13" fill="none">
          <path d="M5.5 0.5L1 2.5V6C1 8.76 3.02 11.35 5.5 12C7.98 11.35 10 8.76 10 6V2.5L5.5 0.5Z" fill="rgba(60,60,67,0.15)" stroke="rgba(60,60,67,0.35)" strokeWidth="1.1" strokeLinejoin="round"/>
          <rect x="3.8" y="5.8" width="3.4" height="2.8" rx="0.6" fill="rgba(60,60,67,0.4)"/>
          <path d="M4.4 5.8V4.6a1.1 1.1 0 012.2 0v1.2" stroke="rgba(60,60,67,0.4)" strokeWidth="0.9" strokeLinecap="round"/>
        </svg>
        <p style={{fontSize:11,color:'rgba(60,60,67,0.50)',fontWeight:600,letterSpacing:'0.01em'}}>Private • Stays on your device</p>
      </div>

      {/* Messages */}
      <div style={{flex:1,overflowY:'auto',padding:'18px 18px 10px',display:'flex',flexDirection:'column',gap:14,background:'#FFFFFF',scrollbarWidth:'none'}}>
        {messages.map(msg=>{
          const isBloom=msg.role==='bloom'
          return(
            <div key={msg.id} style={{display:'flex',flexDirection:'column',alignItems:isBloom?'flex-start':'flex-end',gap:4}}>
              {isBloom&&(
                <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:1}}>
                  <div style={{
                    width:22,height:22,borderRadius:'50%',overflow:'hidden',flexShrink:0,
                    background:'linear-gradient(145deg,#C8A8FF 0%,#7B5CF8 42%,#3B82F6 100%)',
                    display:'flex',alignItems:'center',justifyContent:'center',
                  }}>
                    <svg width="10" height="12" viewBox="0 0 22 26" fill="none">
                      <path d="M11 24C11 24 4 18 4 11C4 7.13 7.13 4 11 4C14.87 4 18 7.13 18 11C18 18 11 24 11 24Z" fill="white" opacity="0.9"/>
                    </svg>
                  </div>
                  <span style={{fontSize:10,fontWeight:800,color:'#7B5CF8',letterSpacing:'0.07em'}}>BLOOM</span>
                </div>
              )}
              <div style={{
                maxWidth:'84%',padding:'13px 16px',
                borderRadius:isBloom?'5px 20px 20px 20px':'20px 5px 20px 20px',
                background:isBloom?'#F8F7FF':'linear-gradient(148deg,#3BA5FF 0%,#007AFF 100%)',
                border:isBloom?'1px solid rgba(123,92,248,0.10)':'none',
                boxShadow:isBloom
                  ?'0 2px 12px rgba(0,0,0,0.06),inset 0 1px 0 rgba(255,255,255,1)'
                  :'0 4px 16px rgba(0,122,255,0.32)',
              }}>
                <p style={{
                  fontSize:14.5,lineHeight:1.68,
                  color:isBloom?fg:'white',
                  fontFamily:isBloom?"'DM Serif Display',serif":'Inter,sans-serif',
                  fontStyle:isBloom?'italic':'normal',
                  letterSpacing:isBloom?'-0.005em':'0',
                }}>{msg.text}</p>
              </div>
              <span style={{fontSize:10,color:fgMuted,paddingLeft:5,paddingRight:5,fontWeight:500}}>{msg.ts}</span>
            </div>
          )
        })}
        {typing&&(
          <div style={{display:'flex',flexDirection:'column',alignItems:'flex-start',gap:4}}>
            <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:1}}>
              <div style={{width:22,height:22,borderRadius:'50%',overflow:'hidden',flexShrink:0,background:'linear-gradient(145deg,#C8A8FF 0%,#7B5CF8 42%,#3B82F6 100%)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <svg width="10" height="12" viewBox="0 0 22 26" fill="none"><path d="M11 24C11 24 4 18 4 11C4 7.13 7.13 4 11 4C14.87 4 18 7.13 18 11C18 18 11 24 11 24Z" fill="white" opacity="0.9"/></svg>
              </div>
              <span style={{fontSize:10,fontWeight:800,color:'#7B5CF8',letterSpacing:'0.07em'}}>BLOOM</span>
            </div>
            <div style={{padding:'14px 18px',borderRadius:'5px 20px 20px 20px',background:'#F8F7FF',border:'1px solid rgba(123,92,248,0.10)',boxShadow:'0 2px 12px rgba(0,0,0,0.06)',display:'flex',gap:6,alignItems:'center'}}>
              {[0,1,2].map(i=><span key={i} style={{width:6,height:6,borderRadius:'50%',background:'rgba(123,92,248,0.35)',display:'inline-block',animation:`bounce 1.2s ease-in-out ${i*0.22}s infinite`}}/>)}
            </div>
          </div>
        )}
        <div ref={bottomRef}/>
      </div>

      {/* Suggested starters */}
      {messages.length===1&&(
        <div style={{padding:'4px 16px 10px',display:'flex',gap:7,overflowX:'auto',flexShrink:0,scrollbarWidth:'none',WebkitOverflowScrolling:'touch' as any}}>
          {SUGGESTED_STARTERS.map(s=>(
            <button key={s} onClick={()=>sendMessage(s)} style={{
              padding:'8px 14px',borderRadius:99,fontSize:12,fontWeight:600,flexShrink:0,
              background:'#F8F7FF',color:'#7B5CF8',
              border:'1px solid rgba(123,92,248,0.18)',
              boxShadow:'0 1px 4px rgba(123,92,248,0.10)',
            }}>{s}</button>
          ))}
        </div>
      )}

      {/* Input bar */}
      <div style={{
        padding:'10px 14px 18px',flexShrink:0,
        background:'rgba(255,255,255,0.96)',
        backdropFilter:'blur(40px)',WebkitBackdropFilter:'blur(40px)',
        borderTop:'1px solid rgba(60,60,67,0.07)',
        display:'flex',gap:10,alignItems:'center',
      }}>
        <input ref={inputRef} value={input} onChange={e=>setInput(e.target.value)}
          onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage(input)}}}
          placeholder="Talk to Bloom…"
          style={{
            flex:1,padding:'12px 16px',borderRadius:99,
            background:'#F2F2F7',border:'none',outline:'none',
            fontSize:14,color:fg,fontFamily:'Inter,sans-serif',
          }}/>
        <button onClick={()=>sendMessage(input)} disabled={!input.trim()||typing} style={{
          width:44,height:44,borderRadius:'50%',flexShrink:0,
          background:input.trim()&&!typing?'linear-gradient(148deg,#3BA5FF 0%,#007AFF 100%)':'rgba(120,120,128,0.10)',
          display:'flex',alignItems:'center',justifyContent:'center',
          transition:'all 0.2s',border:'none',
          boxShadow:input.trim()&&!typing?'0 4px 14px rgba(0,122,255,0.38)':'none',
        }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M14 8L2 2l2.5 6L2 14l12-6z" fill={input.trim()&&!typing?'white':'rgba(60,60,67,0.25)'} strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      <style>{`@keyframes bounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-5px)}}`}</style>
    </div>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

function MainApp() {
  const [screen,setScreen]=useState<Screen>('welcome')
  const [bloomOpen,setBloomOpen]=useState(false)
  const [isDark,setIsDark]=useState(false)
  const [entries,setEntries]=useState<Entry[]>([
    {id:'1',date:'2026-07-25',mood:3,note:'Quiet morning, had tea outside. The garden was still and peaceful.',     sleep:7,  movement:20,water:5,mindfulness:10,shared:true, emotions:['Peaceful','Content'],         logs:[]},
    {id:'2',date:'2026-07-26',mood:4,note:'Good call with a friend, felt lighter after talking things through.',     sleep:8,  movement:35,water:6,mindfulness:15,shared:true, emotions:['Grateful','Loved'],           logs:[{id:'l1',text:'Ended up going for a walk after the call too — felt really alive.',ts:'3:42 PM · Jul 26'}]},
    {id:'3',date:'2026-07-27',mood:2,note:'Tired, stayed in. Not every day needs to be big.',                        sleep:6,  movement:10,water:4,mindfulness:5, shared:false,emotions:['Exhausted','Numb'],          logs:[]},
    {id:'4',date:'2026-07-28',mood:5,note:'Went for a long walk. Felt genuinely happy for the first time this week.',sleep:8.5,movement:60,water:7,mindfulness:20,shared:true, emotions:['Excited','Motivated','Grateful'],logs:[]},
    {id:'5',date:'2026-07-29',mood:3,note:'Average day. Work was fine. Cooked dinner at home.',                      sleep:7,  movement:15,water:5,mindfulness:0, shared:false,emotions:['Content'],                  logs:[]},
    {id:'6',date:'2026-07-30',mood:4,note:'Meditated in the morning. Felt more centred throughout the day.',         sleep:7.5,movement:30,water:6,mindfulness:25,shared:true, emotions:['Peaceful','Hopeful'],         logs:[]},
  ])
  const [time,setTime]=useState(()=>new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}))
  useEffect(()=>{const t=setInterval(()=>setTime(new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})),10000);return()=>clearInterval(t)},[])

  const isMainApp=['home','journal','checkin','sos','more','privacy','psychologist'].includes(screen)
  const showBottomNav=['home','journal','checkin','sos','more'].includes(screen)

  const handleAuth=()=>setScreen('home')
  const handleAddEntry=(e:Entry)=>setEntries(p=>[...p.filter(x=>x.date!==e.date),e].sort((a,b)=>a.date.localeCompare(b.date)))
  const handleToggleShare=(id:string)=>setEntries(p=>p.map(e=>e.id===id?{...e,shared:!e.shared}:e))
  const handleUpdateEntry=(u:Entry)=>setEntries(p=>p.map(e=>e.id===u.id?u:e))

  return (
    <DarkCtx.Provider value={isDark}>
    <div style={{
      width:390,minHeight:844,
      background:isDark?'#000000':'#F2F2F7',
      borderRadius:52,
      overflow:'hidden',
      boxShadow:isDark
        ?'0 40px 100px rgba(0,0,0,0.55), 0 0 0 10px #111, 0 0 0 12px #222'
        :'0 40px 100px rgba(0,0,0,0.22), 0 0 0 10px #d8d8e0, 0 0 0 12px #e4e4ec',
      position:'relative',display:'flex',flexDirection:'column',
      transition:'background 0.3s',
    }}>
      {/* Ambient gradient mesh */}
      <div style={{position:'absolute',inset:0,pointerEvents:'none',zIndex:0}}>
        <div style={{position:'absolute',top:-60,left:-40,width:280,height:280,borderRadius:'50%',background:'radial-gradient(circle,rgba(0,122,255,0.09) 0%,transparent 65%)'}}/>
        <div style={{position:'absolute',bottom:200,right:-60,width:240,height:240,borderRadius:'50%',background:'radial-gradient(circle,rgba(175,82,222,0.07) 0%,transparent 65%)'}}/>
        <div style={{position:'absolute',top:'45%',left:'30%',width:200,height:200,borderRadius:'50%',background:'radial-gradient(circle,rgba(52,199,89,0.05) 0%,transparent 65%)'}}/>
      </div>

      <div style={{position:'relative',zIndex:1,display:'flex',flexDirection:'column',flex:1}}>
        <StatusBar time={time}/>
        <div style={{flex:1,display:'flex',flexDirection:'column',position:'relative',overflow:'hidden'}}>
          {screen==='welcome'      &&<WelcomeScreen onNav={setScreen}/>}
          {screen==='login'        &&<AuthScreen mode="login"  onBack={()=>setScreen('welcome')} onSwitch={()=>setScreen('signup')} onAuth={handleAuth}/>}
          {screen==='signup'       &&<AuthScreen mode="signup" onBack={()=>setScreen('welcome')} onSwitch={()=>setScreen('login')}  onAuth={handleAuth}/>}
          {screen==='home'         &&<HomeScreen entries={entries} onNav={setScreen}/>}
          {screen==='journal'      &&<JournalScreen entries={entries} onUpdateEntry={handleUpdateEntry}/>}
          {screen==='checkin'      &&<CheckInScreen onSave={handleAddEntry} onDone={()=>setScreen('journal')}/>}
          {screen==='sos'          &&<SOSScreen/>}
          {screen==='more'         &&<MoreScreen onNav={setScreen} onLogout={()=>setScreen('welcome')} isDark={isDark} onToggleDark={()=>setIsDark(p=>!p)}/>}
          {screen==='privacy'      &&<PrivacyScreen entries={entries} onToggle={handleToggleShare} onBack={()=>setScreen('more')}/>}
          {screen==='psychologist' &&<PsychologistScreen entries={entries} onBack={()=>setScreen('more')}/>}
          {screen==='socialRedirect'&&<SocialRedirectScreen onDone={()=>setScreen('socialSuccess')}/>}
          {screen==='socialSuccess' &&<SocialSuccessScreen  onDone={()=>setScreen('home')}/>}

          {showBottomNav&&<BottomNav active={screen} onNav={setScreen}/>}

          {/* Bloom FAB */}
          {isMainApp&&(
            <button onClick={()=>setBloomOpen(true)} style={{
              position:'absolute',
              bottom:showBottomNav?106:28,
              right:20,width:54,height:54,borderRadius:'50%',
              background:'none',border:'none',padding:0,
              transition:'transform 0.18s cubic-bezier(0.4,0,0.2,1)',zIndex:20,
            }}
              onMouseEnter={e=>e.currentTarget.style.transform='scale(1.10)'}
              onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}
            ><div style={{borderRadius:40,overflow:'hidden',lineHeight:0}}><AppIcon size={54}/></div></button>
          )}

          {/* Bloom sheet */}
          {bloomOpen&&(
            <>
              <div onClick={()=>setBloomOpen(false)} style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.22)',zIndex:30,backdropFilter:'blur(8px)',WebkitBackdropFilter:'blur(8px)',animation:'fadeIn 0.2s ease'}}/>
              <div style={{
                position:'absolute',bottom:0,left:0,right:0,height:'88%',
                borderRadius:'28px 28px 0 0',zIndex:40,display:'flex',flexDirection:'column',overflow:'hidden',
                animation:'slideUp 0.32s cubic-bezier(0.32,0.72,0,1)',
                boxShadow:'0 -12px 48px rgba(0,0,0,0.10)',
                border:'1px solid rgba(255,255,255,0.90)',borderBottom:'none',
              }}>
                <div style={{
                  padding:'12px 16px 0',flexShrink:0,position:'relative',
                  display:'flex',alignItems:'center',justifyContent:'center',
                  background:'rgba(242,242,247,0.95)',backdropFilter:'blur(40px)',WebkitBackdropFilter:'blur(40px)',
                  marginTop:0, marginRight:0, marginLeft:0,
                }}>
                  <div style={{width:36,height:4,borderRadius:99,background:'rgba(60,60,67,0.18)'}}/>
                  <button onClick={()=>setBloomOpen(false)} style={{
                    position:'absolute',right:14,top:10,width:30,height:30,borderRadius:'50%',
                    background:'rgba(120,120,128,0.12)',border:'1px solid rgba(255,255,255,0.80)',
                    display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,color:fgSub,fontWeight:600,
                  }}>✕</button>
                </div>
                <BloomScreen/>
              </div>
            </>
          )}

          <style>{`
            @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
            @keyframes slideUp { from{transform:translateY(100%)} to{transform:translateY(0)} }
          `}</style>
        </div>
      </div>
    </div>
    </DarkCtx.Provider>
  )
}

export default function App() {
  return (
    <div className="min-h-screen bg-neutral-900 flex items-center justify-center sm:p-4 overflow-auto">
      <div style={{
        width:'100%',
        maxWidth:390,
        height:'100vh',
        maxHeight:844,
        background:'#000000',
        overflow:'hidden',
        position:'relative',
        display:'flex',
        flexDirection:'column',
      }} className="sm:rounded-[52px] sm:border-[12px] sm:border-[#e4e4ec] sm:shadow-2xl">
        <div style={{position:'relative',zIndex:1,display:'flex',flexDirection:'column',flex:1,overflow:'hidden'}}>
          <MainApp />
        </div>
      </div>
    </div>
  );
}
