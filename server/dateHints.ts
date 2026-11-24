import {validDate} from '../src/domain/issue';
export interface RelativeDateHint { phrase:string; date:string }
const weekdays=['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
const chineseWeekdays='一二三四五六日天';
export function relativeDateHints(note:string,referenceDate:string):RelativeDateHint[]{
 if(!validDate(referenceDate))return [];
 const base=new Date(`${referenceDate}T12:00:00Z`),day=base.getUTCDay()||7;
 const nextMonday=8-day;
 const matches=[...note.matchAll(/\b(?:today|tomorrow|yesterday|next\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday))\b|今天|明天|昨天|下(?:周|星期)[一二三四五六日天]/gi)];
 const hints:RelativeDateHint[]=[];
 for(const match of matches){
  const phrase=match[0],lower=phrase.toLowerCase();let offset:number;
  if(/^(today|今天)$/.test(lower))offset=0;
  else if(/^(tomorrow|明天)$/.test(lower))offset=1;
  else if(/^(yesterday|昨天)$/.test(lower))offset=-1;
  else if(lower.startsWith('next '))offset=nextMonday+weekdays.indexOf(lower.slice(5));
  else offset=nextMonday+chineseWeekdays.indexOf(phrase.at(-1)??'')%7;
  const date=new Date(base);date.setUTCDate(date.getUTCDate()+offset);
  if(!hints.some(h=>h.phrase.toLowerCase()===lower))hints.push({phrase,date:date.toISOString().slice(0,10)});
 }
 return hints;
}
