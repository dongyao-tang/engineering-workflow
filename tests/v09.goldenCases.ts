export const referenceDate='2026-09-20';
export const timeZone='Asia/Shanghai';
export const cases=[
 {id:1,title:'Mixed-language note with two independent issues',note:'今天试装发现 upper cover 与 cable bracket 干涉，3 台无法正常闭合；工程团队明天测量支架尺寸，Root Cause 还没确认。同时，包装跌落测试后有 2 台外壳擦伤，初步怀疑 inner tray 限位不足，包装组下周三安排复测。两件事分别由机械和包装团队处理，互不依赖。'},
 {id:2,title:'Missing owner, due date and root cause',note:'AP-01 样机通电后，状态灯偶尔不亮，10 台中出现 1 台。重复上电后恢复，目前只记录了样机编号，尚未安排负责人，也没有确定完成日期。现场暂时保留异常样机，等待进一步排查。'},
 {id:3,title:'Explicitly closed historical issue',note:'9 月 12 日发现装配指导书把标签粘贴位置标错，影响了 6 台工程样机。制造工程当天修订文件，6 台已完成返工和复检，质量于 9 月 14 日确认全部合格。此问题已正式 Closed，后续无需行动。'},
 {id:4,title:'Blocked with relative dates and dependency',note:'Validation 的振动测试原计划 tomorrow 开始，但所需的 5 台样机只有 3 台完成质量放行，另外 2 台等待定位销替换件。测试目前 Blocked，实验室窗口暂留到下周三。项目经理林岚负责协调补料，根因沿用已登记的来料尺寸异常。'},
 {id:5,title:'Low-risk issue still open',note:'试装时发现一台样机底部标签边缘轻微翘起，不影响识别、装配或功能，也没有继续扩大的迹象。现场已拍照记录，计划在下批样机上观察是否复现；目前还没有复验结果。负责人为质量工程师刘洋，9 月 24 日前反馈。'},
 {id:6,title:'Containment completed, cause unconfirmed',note:'来料抽检发现 4 件支架表面有划痕，仓库已隔离同批 120 件，产线改用上一批合格库存，当前装配未停线。供应商认为可能与周转箱摩擦有关，但尚未提供分析证据。供应商质量工程师赵磊负责调查，计划 9 月 25 日给出结论。'},
 {id:7,title:'Two updates to existing issue',note:'更新 ATL-003：9 月 18 日第一次复验后，包装 Issue 从 Ready for Validation 退回 In Progress，因为配件盒仍有移位。今天第二次更新：新版固定槽已安装，但新的运输复验尚未完成，孙悦继续负责，预计下周三取得报告。请更新原 Issue，不要新建问题。'},
 {id:8,title:'Conflicting counts and closure status',note:'试装记录写着“所有 10 台上盖闭合正常”，但同一段又写“其中 2 台因上盖干涉无法锁紧”。记录开头标为 Closed，末尾却要求李伟明天继续测量并在 9 月 24 日前提交修正方案。现场没有提供复检结果或关闭批准记录。'}
] as const;
export const existingPackagingIssue={id:'existing-packaging-issue',trackerId:'ATL-003',issue:{zh:'包装配件盒移位',en:'Accessory box movement during transport validation'},status:'in_progress' as const};
