export function serverDateContext(now=new Date(),timeZone=Intl.DateTimeFormat().resolvedOptions().timeZone){
 const parts=new Intl.DateTimeFormat('en-US',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
 const value=(type:string)=>parts.find(part=>part.type===type)?.value;
 return {referenceDate:`${value('year')}-${value('month')}-${value('day')}`,timeZone};
}
