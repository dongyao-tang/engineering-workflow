// Synthetic provider responses for contract tests ONLY, never used by application runtime.
import {analysisFields,type AnalysisField} from '../src/types';
import {pair} from '../src/domain/issue';
import {caseA,caseB} from './acceptanceCases';
export function fixture(which:'A'|'B'){
 const note=which==='A'?caseA:caseB;
 const provenance=Object.fromEntries(analysisFields.map(f=>[f,{kind:'extracted',evidence:[note.split('\n')[0]],rationale:pair('原文明确说明。','Explicitly stated in the note.')}])) as Record<AnalysisField,any>;
 const data=which==='A'?{
 issue:pair('定位销直径超差导致装配困难','Out-of-tolerance locating pin diameter causes assembly difficulty'),
 backgroundObservation:pair('抽检32件中7件直径超差，涉及整批200件。','7 of 32 sampled parts were out of tolerance; the affected lot contains 200 parts.'),
 impact:pair('可能造成装配停线、底座损伤，并影响验证样机准备。','May cause assembly line stoppage or base damage and affect validation prototype readiness.'),
 rootCauseAssumption:pair('初步怀疑供应商刀具补偿异常，根因待确认。','Abnormal tool compensation at the supplier is suspected; the root cause remains under investigation.'),
 action:pair('已冻结库存并追溯已领用物料，要求供应商筛选补料。','Existing inventory has been placed on hold and issued material has been traced as containment. The supplier has been requested to screen and replenish material.'),
 nextStep:pair('比对双方测量结果，并用替换件完成装配验证。','Compare measurement results from both parties and complete assembly validation using replacement parts.'),
 owner:pair('供应商质量工程师赵磊','Supplier Quality Engineer 赵磊'),riskLevel:'high',status:'open',dueDate:'2026-09-19'
 }:{
 issue:pair('包装防护不足导致运输外观损伤风险','Insufficient packaging protection presents a cosmetic damage risk during transport'),
 backgroundObservation:pair('拆箱确认内衬间隙过大、配件盒固定不足；新版样件已齐套。','Unpacking analysis confirmed excessive insert clearance and inadequate accessory-box retention; revised samples are ready.'),
 impact:pair('存在运输外观损伤风险；复验失败将影响包装放行。','Cosmetic damage may occur in transit; failed retesting would affect packaging release.'),
 rootCauseAssumption:pair('内衬间隙过大、配件盒固定不足。','Excessive insert clearance and inadequate accessory-box retention were confirmed.'),
 action:pair('已调整限位结构、增加防擦保护，旧版暂停正式出货。','The packaging team has adjusted the retention structure, added anti-scuff protection and suspended the previous version for official shipments.'),
 nextStep:pair('安排运输复验，通过后更新包装规范。','Arrange transport revalidation and update the packaging specification after passing.'),
 owner:pair('包装工程师孙悦','Packaging Engineer 孙悦'),riskLevel:'medium',status:'in_progress',dueDate:'2026-09-21'
 };
 for(const field of ['owner','dueDate','status','riskLevel'] as const){
 const prefix={owner:'负责人：',dueDate:'截止日期：',status:'状态：',riskLevel:'风险评估为'}[field];
 provenance[field].evidence=[note.split('\n').find(x=>x.startsWith(prefix))!];
 }
 return {...data,sourceLanguage:'zh',provenance,warnings:[]};
}
