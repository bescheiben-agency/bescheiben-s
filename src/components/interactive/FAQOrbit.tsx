import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {gsap} from 'gsap';
import {Flip} from 'gsap/Flip';
import './faq-orbit.css';
gsap.registerPlugin(Flip);
type Item={question:string;answer:string};
interface Props{items:Item[];idPrefix:string;}
export default function FAQOrbit({items,idPrefix}:Props){
 const [active,setActive]=useState(0);
 const root=useRef<HTMLDivElement>(null);
 const previous=useRef<ReturnType<typeof Flip.getState>|null>(null);
 const animation=useRef<gsap.core.Timeline|null>(null);
 useEffect(()=>{
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  const finish=()=>{animation.current?.progress(1).kill();animation.current=null;};
  const visibility=()=>{if(document.hidden)finish();};
  const preference=()=>{if(reduced.matches)finish();};
  const observer=new IntersectionObserver(entries=>{if(!entries[0]?.isIntersecting)finish();});
  if(root.current)observer.observe(root.current);
  reduced.addEventListener('change',preference);
  document.addEventListener('visibilitychange',visibility);
  return()=>{finish();observer.disconnect();reduced.removeEventListener('change',preference);document.removeEventListener('visibilitychange',visibility);};
 },[]);
 useLayoutEffect(()=>{
  if(previous.current&&!document.hidden&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches){animation.current=Flip.from(previous.current,{duration:.55,ease:'power2.inOut',scale:false,nested:true});}
  previous.current=null;
  return()=>{animation.current?.progress(1).kill();animation.current=null;};
 },[active]);
 function select(index:number){if(index===active)return;animation.current?.progress(1).kill();animation.current=null;if(root.current&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches)previous.current=Flip.getState(root.current.querySelectorAll('.faq-orbit-card'));setActive(index);}
 const positions=items.map((_,i)=>i).filter(i=>i!==active);
 return <div className="faq-orbit" ref={root} role="group" aria-label="Perguntas e respostas" data-faq-orbit>
  <svg className="faq-orbit-lines" viewBox="0 0 900 680" fill="none" aria-hidden="true"><ellipse cx="450" cy="340" rx="420" ry="220" transform="rotate(-15 450 340)"/><ellipse cx="450" cy="340" rx="395" ry="280" transform="rotate(16 450 340)"/><path d="M75 540C90 15 712 108 821 580"/><circle cx="92" cy="305" r="5"/><circle cx="751" cy="558" r="5"/><circle cx="539" cy="100" r="4"/></svg>
  {items.map((item,i)=><article key={item.question} className={`faq-orbit-card ${i===active?'faq-orbit-card--active':''}`} data-faq-item data-position={i===active?'center':positions.indexOf(i)}>
   <button type="button" id={`${idPrefix}-trigger-${i}`} aria-controls={`${idPrefix}-answer-${i}`} aria-expanded={i===active} onClick={()=>select(i)} onKeyDown={e=>{if(e.key==='ArrowRight'||e.key==='ArrowDown'){e.preventDefault();select((i+1)%items.length);root.current?.querySelector<HTMLButtonElement>(`#${CSS.escape(idPrefix)}-trigger-${(i+1)%items.length}`)?.focus();}if(e.key==='ArrowLeft'||e.key==='ArrowUp'){e.preventDefault();const j=(i+items.length-1)%items.length;select(j);root.current?.querySelector<HTMLButtonElement>(`#${CSS.escape(idPrefix)}-trigger-${j}`)?.focus();}}}><span>{item.question}</span><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d={i===active?'M6 12h12':'M5 12h14m-6-6 6 6-6 6'} stroke="currentColor" strokeWidth="1.4"/></svg></button>
   <div id={`${idPrefix}-answer-${i}`} hidden={i!==active} role="region" aria-labelledby={`${idPrefix}-trigger-${i}`} className="faq-orbit-answer"><p>{item.answer}</p></div>
  </article>)}
 </div>;
}
