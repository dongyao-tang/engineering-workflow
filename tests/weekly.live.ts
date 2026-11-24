import {loadServerEnvironment} from '../server/config';
import {DeepSeekWeeklyReportProvider} from '../server/weeklyReport';
import {emptyIssue,pair} from '../src/domain/issue';
import {toWeeklyFacts,weeklyPeriodSchema} from '../src/domain/weekly';
import type {Issue} from '../src/types';

const config=loadServerEnvironment();
if(config.provider!=='deepseek'||!config.getKey()){console.log(JSON.stringify({skipped:'DeepSeek provider or key unavailable'}));process.exit(1);}
const provider=new DeepSeekWeeklyReportProvider(config);
function base(id:string,status:Issue['status'],riskLevel:Issue['riskLevel']):Issue{
 const i=emptyIssue(`Fictional weekly test ${id}`,'mock');i.id=id;i.status=status;i.riskLevel=riskLevel;
 i.createdAt='2026-09-21T02:00:00.000Z';i.updatedAt='2026-09-25T03:00:00.000Z';i.reviewedAt=i.createdAt;
 return i;
}
const blocked=base('W-001','blocked','high');
blocked.issue=pair('振动测试因样机放行不足受阻','Vibration validation blocked by insufficient released prototypes');
blocked.backgroundObservation=pair('所需 5 台样机中只有 3 台完成质量放行。','Only 3 of the 5 required prototypes have passed quality release.');
blocked.impact=pair('振动测试无法按计划开始，可能影响验证进度。','Vibration testing cannot start as planned and validation may be delayed.');
blocked.action=pair('项目经理林岚正在协调替换件和实验室窗口。','Project Manager 林岚 is coordinating replacement parts and the lab window.');
blocked.nextStep=pair('等待剩余 2 台样机质量放行后启动振动测试。','Start vibration testing once the remaining 2 prototypes are released by Quality.');
blocked.owner=pair('项目经理林岚','Project Manager 林岚');blocked.dueDate='2026-09-26';
blocked.history=[{date:'2026-09-23',status:'blocked',description:pair('因 2 台样机待放行而受阻','Blocked pending release of 2 prototypes'),evidence:'fictional test'}];

const closed=base('W-002','closed','medium');
closed.issue=pair('包装标签位置错误','Incorrect packaging label position');
closed.impact=pair('影响 6 台工程样机的标识。','Labeling was affected on 6 engineering prototypes.');
closed.action=pair('制造工程修订文件，6 台完成返工和复检。','Manufacturing Engineering revised the work instruction; all 6 units were reworked and reinspected.');
closed.nextStep=pair('无需后续措施。','No further action is required.');closed.owner=pair('制造工程团队','Manufacturing Engineering team');
closed.history=[{date:'2026-09-24',status:'closed',description:pair('质量确认 6 台合格并关闭','Quality confirmed all 6 units passed and closed the issue'),evidence:'fictional test'}];

const active=base('W-003','in_progress','medium');
active.issue=pair('支架来料划伤待调查','Incoming bracket scratches under investigation');
active.backgroundObservation=pair('抽检发现 4 件划伤。','Inspection found scratches on 4 brackets.');
active.impact=pair('可能影响外观验收，当前装配未停线。','May affect cosmetic acceptance; assembly has not stopped.');
active.rootCauseAssumption=pair('供应商怀疑周转箱摩擦，尚未证实。','Supplier suspects tote friction; root cause remains unconfirmed.');
active.action=pair('已隔离同批 120 件，并使用上一批合格库存。','The same lot of 120 units was placed on hold; assembly is using accepted inventory from the previous lot.');
active.nextStep=pair('供应商质量工程师赵磊于 2026-09-29 提供调查结论。','Supplier Quality Engineer 赵磊 will provide the investigation conclusion by 2026-09-29.');
active.owner=pair('供应商质量工程师赵磊','Supplier Quality Engineer 赵磊');active.dueDate='2026-09-29';
active.history=[{date:'2026-09-22',status:'open',description:pair('发现划伤','Scratches found'),evidence:'fictional test'},{date:'2026-09-25',status:'in_progress',description:pair('完成库存隔离','Inventory hold completed'),evidence:'fictional test'}];

const period={from:'2026-09-21',to:'2026-09-27'};
if(!weeklyPeriodSchema.safeParse(period).success)throw Error('Invalid period');
const draft=await provider.generate({projectName:'Project Atlas',period,issues:toWeeklyFacts([blocked,closed,active])});
const fields=Object.keys(draft.sections);
const checks={sixSections:fields.length===6,bilingual:fields.every(key=>{
 const field=draft.sections[key as keyof typeof draft.sections];return !!field.zh.trim()&&!!field.en.trim();
}),closedProgress:/W-002|标签|label|返工|rework|closed/i.test(draft.sections.keyProgress.zh+' '+draft.sections.keyProgress.en),
 blockedRisk:/Blocked|受阻/.test(draft.sections.criticalIssuesRisks.zh+' '+draft.sections.criticalIssuesRisks.en),
 noInventedSupport:!draft.sections.decisionsSupport.en.includes('customer approval')};
console.log(JSON.stringify({provider:config.provider,period,checks,warnings:draft.warnings.map(w=>w.en),sections:draft.sections}));
if(Object.values(checks).some(value=>!value))process.exitCode=1;
