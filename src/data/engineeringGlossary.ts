export interface EngineeringTerm { zh: string; en: string; category: string; notes: string; alternatives?: string[] }
export const engineeringGlossary: EngineeringTerm[] = [
 {zh:'试模',en:'molding trial',alternatives:['trial build'],category:'Tooling',notes:'Use molding trial for mold/process trials; trial build only for a product build context.'},
 {zh:'修模',en:'tooling modification',alternatives:['tool rework'],category:'Tooling',notes:'Select by tooling change or corrective rework context.'},
 {zh:'工程变更',en:'engineering change',alternatives:['EC','ECN'],category:'NPI',notes:'Preserve EC/ECN; ECN refers to the notification, not every change.'},
 {zh:'装配验证',en:'assembly validation',category:'NPI',notes:'Do not translate as assembly verification unless context requires it.'},
 {zh:'互换性验证',en:'interchangeability validation',category:'Validation',notes:'Validation of interchangeability, not merely mixed assembly.'},
 {zh:'混装验证',en:'mixed-build validation',category:'Validation',notes:'Do not assume cross-mold or cross-cavity unless specified.'},
 {zh:'跨模跨穴验证',en:'cross-mold / cross-cavity validation',category:'Validation',notes:'Preserve whether the note specifies molds, cavities, or both.'},
 {zh:'问题闭环',en:'issue closure',category:'Project',notes:'Closure requires evidence; never infer closure from an action plan.'},
 {zh:'改善措施',en:'corrective action',category:'Quality',notes:'Distinguish proposed actions from completed corrective actions.'},
 {zh:'根因',en:'root cause',category:'Quality',notes:'Only describe as confirmed when supported by evidence.'},
 {zh:'待验证假设',en:'assumption pending validation',category:'Quality',notes:'Never upgrade an assumption to a confirmed root cause.'},
 {zh:'量产准备',en:'production readiness',category:'NPI',notes:'Does not imply production approval.'},
 {zh:'试产',en:'pilot build',alternatives:['pilot run'],category:'NPI',notes:'Choose according to build event versus production process run.'},
 {zh:'量产',en:'mass production',alternatives:['MP'],category:'Manufacturing',notes:'Preserve MP if used.'},
 {zh:'首件检验',en:'FAI',alternatives:['First Article Inspection'],category:'Quality',notes:'Preserve FAI if used.'},
 {zh:'物料清单',en:'BOM',category:'NPI',notes:'Preserve BOM.'},
 {zh:'风险',en:'risk',category:'Project',notes:'Distinguish potential risk from observed issue.'},
 {zh:'负责人',en:'owner',category:'Project',notes:'Never infer an owner from a mentioned team.'},
 {zh:'下一步行动',en:'next step',alternatives:['next action'],category:'Project',notes:'Preserve the planned nature of future actions.'},
 ...['NPI','DFM','BOM','FAI','EC','ECN','MP'].map(term=>({zh:term,en:term,category:'Acronym',notes:'Preserve this industry acronym; do not expand automatically.'}))
];
