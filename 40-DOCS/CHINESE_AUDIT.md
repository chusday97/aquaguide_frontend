# Hardcoded Chinese Audit Report

This file lists all remaining hardcoded Chinese strings in core page components (excluding comments).

## Aquarium.tsx (Total lines: 7375)

Found **971** lines with Chinese characters:

| Line | Code snippet |
|---|---|
| L108 | `{ value: '无', label: '裸缸', labelEn: 'Bare Bottom', hint: '方便清洁', hintEn: 'Easy to clean' },` |
| L109 | `{ value: '河沙', label: '河沙', labelEn: 'River Sand', hint: '自然浅色', hintEn: 'Natural light color' },` |
| L110 | `{ value: '溪流砂', label: '溪流砂', labelEn: 'Creek Sand', hint: '原生溪流', hintEn: 'Natural river style' },` |
| L111 | `{ value: '化妆砂', label: '化妆砂', labelEn: 'Cosmetic Sand', hint: '明亮前景', hintEn: 'Bright foreground' },` |
| L112 | `{ value: '水草泥', label: '水草泥', labelEn: 'Aquarium Soil', hint: '草缸首选', hintEn: 'Best for planted tanks' },` |
| L113 | `{ value: '黑金沙', label: '黑金沙', labelEn: 'Black Quartz Sand', hint: '显色强烈', hintEn: 'Strong color contrast' },` |
| L114 | `{ value: '陶粒', label: '陶粒', labelEn: 'Ceramic Gravel', hint: '透气颗粒', hintEn: 'Porous clay pebbles' },` |
| L115 | `{ value: '碎石', label: '碎石', labelEn: 'Gravel', hint: '粗颗粒', hintEn: 'Coarse texture' },` |
| L116 | `{ value: '鹅卵石', label: '鹅卵石', labelEn: 'Pebbles', hint: '溪流大石', hintEn: 'Stream river stones' },` |
| L117 | `{ value: '珊瑚砂', label: '珊瑚砂', labelEn: 'Coral Sand', hint: '海水/硬水', hintEn: 'Marine / hard water' },` |
| L133 | `'鱼只异常',` |
| L134 | `'鱼浮头 / 呼吸急促',` |
| L135 | `'拒食',` |
| L136 | `'躲藏不动',` |
| L137 | `'追咬打架',` |
| L138 | `'新鱼入缸',` |
| L139 | `'死亡处理',` |
| L140 | `'死亡 / 异常死亡',` |
| L144 | `{ key: 'length', label: '长' },` |
| L145 | `{ key: 'width', label: '宽' },` |
| L146 | `{ key: 'height', label: '高' },` |
| L151 | `if (/尺寸\|容量\|水量\|长\|宽\|高/.test(text)) return 'size';` |
| L152 | `if (/过滤\|设备\|加热/.test(text)) return 'equipment';` |
| L153 | `if (/灯/.test(text)) return 'lighting';` |
| L154 | `if (/水草\|植物/.test(text)) return 'plants';` |
| L155 | `if (/底砂\|底床\|硬景/.test(text)) return 'substrate';` |
| L164 | `difficulty: '新手' \| '进阶';` |
| L236 | `name: '新手阴性草缸',` |
| L237 | `tagline: '低光、低 CO2 依赖，先把稳定养成习惯。',` |
| L238 | `bestFor: '30-60cm 新手缸、办公室桌面缸',` |
| L239 | `difficulty: '新手',` |
| L245 | `baseEquipment: ['瀑布过滤或小桶滤', '普通灯/入门水草灯', '可选加热棒'],` |
| L246 | `baseSubstrate: '水草泥',` |
| L247 | `basePlants: ['小水榕', '铁皇冠', '黑木蕨', '三角莫斯'],` |
| L248 | `baseHardscape: ['沉木 (流木)', '杜鹃根'],` |
| L250 | `{ name: '红绿灯', role: 'schooling', minQuantity: 8, recommendedQuantity: 10 },` |
| L251 | `{ name: '咖啡鼠', role: 'bottom', minQuantity: 3, recommendedQuantity: 4 },` |
| L252 | `{ name: '斑马螺', role: 'snail', minQuantity: 1, recommendedQuantity: 1 },` |
| L254 | `visualLabel: '低维护绿意',` |
| L256 | `benefitTags: ['适合第一缸', '维护压力低', '桌面缸友好'],` |
| L257 | `tankSize: '30L 起步，60cm 缸更稳定',` |
| L259 | `substrate: '水草泥',` |
| L260 | `plants: ['小水榕', '铁皇冠', '黑木蕨', '三角莫斯'],` |
| L261 | `hardscape: ['沉木 (流木)', '杜鹃根'],` |
| L262 | `equipment: ['瀑布过滤或小桶滤', '普通灯/入门水草灯', '可选加热棒'],` |
| L263 | `equipmentSettings: { filter: '瀑布过滤', heater: true, oxygen: false, light: '水草灯' },` |
| L264 | `livestock: ['红绿灯 8-12 条', '咖啡鼠 3-5 条', '斑马螺 1-2 只'],` |
| L267 | `maxLivestock: '小型群游鱼 8-12 条；底层鼠鱼 3-5 条；螺 1-2 只',` |
| L268 | `suitableTypes: ['小型灯科鱼', '温和底栖鱼', '少量工具螺'],` |
| L269 | `avoidTypes: ['大型鱼', '高排泄鱼', '强领地鱼'],` |
| L271 | `stockedSpecies: [{ name: '红绿灯', quantity: 10 }, { name: '咖啡鼠', quantity: 4 }, { name: '斑马螺', quantity: 1 }],` |
| L272 | `maintenance: ['每周换水 20%-30%', '每周擦缸壁和修剪老叶', '每天开灯 6-7 小时，爆藻时先减光'],` |
| L273 | `caution: '水榕、铁皇冠和黑木蕨不要把根茎埋进泥里，绑在沉木或石头上更稳。',` |
| L277 | `name: '灯鱼草缸',` |
| L278 | `tagline: '用群游灯鱼做视觉中心，水草负责层次和安全感。',` |
| L279 | `bestFor: '45-90cm 中小型观赏草缸',` |
| L280 | `difficulty: '新手',` |
| L286 | `baseEquipment: ['水草灯', '桶滤或强瀑布过滤', '可选 CO2', '加热棒'],` |
| L287 | `baseSubstrate: '水草泥',` |
| L288 | `basePlants: ['迷你矮珍珠', '牛毛毡', '宫廷草', '红宫廷'],` |
| L289 | `baseHardscape: ['青龙石', 'ADA风格化妆砂'],` |
| L291 | `{ name: '宝莲灯', role: 'schooling', minQuantity: 10, recommendedQuantity: 16 },` |
| L292 | `{ name: '红鼻剪刀', role: 'schooling', minQuantity: 8, recommendedQuantity: 10 },` |
| L293 | `{ name: '咖啡鼠', role: 'bottom', minQuantity: 3, recommendedQuantity: 4 },` |
| L294 | `{ name: '黑壳虾', role: 'shrimp', minQuantity: 4, recommendedQuantity: 6 },` |
| L296 | `visualLabel: '群游草景',` |
| L298 | `benefitTags: ['群游鱼效果好', '观赏性强', '草缸入门'],` |
| L299 | `tankSize: '45L 起步，建议 60cm 以上',` |
| L301 | `substrate: '水草泥',` |
| L302 | `plants: ['迷你矮珍珠', '牛毛毡', '宫廷草', '红宫廷'],` |
| L303 | `hardscape: ['青龙石', 'ADA风格化妆砂'],` |
| L304 | `equipment: ['水草灯', '桶滤或强瀑布过滤', '可选 CO2', '加热棒'],` |
| L305 | `equipmentSettings: { filter: '桶滤', heater: true, oxygen: false, light: '水草灯' },` |
| L306 | `livestock: ['宝莲灯 12-20 条', '红鼻剪刀/红绿灯 10-15 条', '咖啡鼠 4-6 条', '黑壳虾少量'],` |
| L309 | `maxLivestock: '小型群游鱼 18-28 条；底层鼠鱼 4-6 条；工具虾 5-10 只',` |
| L310 | `suitableTypes: ['小型群游灯鱼', '温和鼠鱼', '少量工具虾'],` |
| L311 | `avoidTypes: ['大型鱼', '强攻击鱼', '偏硬水鱼'],` |
| L313 | `stockedSpecies: [{ name: '宝莲灯', quantity: 16 }, { name: '红鼻剪刀', quantity: 10 }, { name: '咖啡鼠', quantity: 4 }, { name: '黑壳虾', quantity: 6 }],` |
| L314 | `maintenance: ['每周换水 30%', '每 2 周修剪一次茎类草', '开灯 7 小时起步，CO2 不稳定时减少红草比例'],` |
| L315 | `caution: '前景草和红草对灯光、肥力和 CO2 更敏感，新手可先减少迷你矮珍珠面积。',` |
| L319 | `name: '虾缸',` |
| L320 | `tagline: '给米虾留足躲避和啃食面，重点控制稳定水质。',` |
| L321 | `bestFor: '30-45cm 小缸、繁殖观察缸',` |
| L322 | `difficulty: '新手',` |
| L328 | `baseEquipment: ['海绵过滤', '普通灯', '加热棒视室温决定'],` |
| L329 | `baseSubstrate: '水草泥',` |
| L330 | `basePlants: ['三角莫斯', '青丝绒莫斯', '小水榕', '辣椒榕'],` |
| L331 | `baseHardscape: ['沉木 (流木)', '火山石板'],` |
| L333 | `{ name: '极火虾', role: 'shrimp', minQuantity: 10, recommendedQuantity: 15 },` |
| L334 | `{ name: '斑马螺', role: 'snail', minQuantity: 1, recommendedQuantity: 1 },` |
| L336 | `visualLabel: '虾类观察',` |
| L338 | `benefitTags: ['虾类友好', '适合观察', '小缸稳定'],` |
| L339 | `tankSize: '20L 起步，30L 以上更稳',` |
| L341 | `substrate: '水草泥',` |
| L342 | `plants: ['三角莫斯', '青丝绒莫斯', '小水榕', '辣椒榕'],` |
| L343 | `hardscape: ['沉木 (流木)', '火山石板'],` |
| L344 | `equipment: ['海绵过滤', '普通灯', '加热棒视室温决定'],` |
| L345 | `equipmentSettings: { filter: '海绵过滤', heater: false, oxygen: true, light: '普通灯' },` |
| L346 | `livestock: ['极火虾 10-20 只', '黄金米虾/蓝丝绒米虾单色群', '斑马螺 1 只'],` |
| L349 | `maxLivestock: '米虾 10-20 只；螺 1 只；不建议加鱼',` |
| L350 | `suitableTypes: ['米虾', '单只工具螺', '莫斯/阴性草'],` |
| L351 | `avoidTypes: ['会捕食虾的鱼', '大型鱼', '需要频繁下药的组合'],` |
| L353 | `stockedSpecies: [{ name: '极火虾', quantity: 15 }, { name: '斑马螺', quantity: 1 }],` |
| L354 | `maintenance: ['每周小换水 10%-20%', '补水和换水温差控制在 1-2°C 内', '避免铜药和强力除藻剂'],` |
| L355 | `caution: '不同颜色米虾混养后代容易返祖，想保色建议单色单缸。',` |
| L359 | `name: '南美黑水缸',` |
| L360 | `tagline: '弱酸软水、沉木落叶和暗色环境，突出南美鱼的状态。',` |
| L361 | `bestFor: '60cm 以上观赏缸、短鲷/神仙主题缸',` |
| L362 | `difficulty: '进阶',` |
| L368 | `baseEquipment: ['桶滤', '弱光灯', '加热棒', '可加黑水素/榄仁叶'],` |
| L369 | `baseSubstrate: '河沙',` |
| L370 | `basePlants: ['大叶皇冠', '细叶皇冠', '黑木蕨'],` |
| L371 | `baseHardscape: ['沉木 (流木)', '杜鹃根'],` |
| L373 | `{ name: '宝莲灯', role: 'schooling', minQuantity: 12, recommendedQuantity: 20 },` |
| L374 | `{ name: '阿卡西短鲷', role: 'centerpiece', minQuantity: 2, recommendedQuantity: 2 },` |
| L375 | `{ name: '神仙鱼', role: 'centerpiece', minQuantity: 0, recommendedQuantity: 2 },` |
| L376 | `{ name: '咖啡鼠', role: 'bottom', minQuantity: 4, recommendedQuantity: 4 },` |
| L378 | `visualLabel: '暗色原生',` |
| L380 | `benefitTags: ['氛围感强', '南美主题', '状态展示'],` |
| L381 | `tankSize: '60L 起步，神仙鱼建议高缸',` |
| L383 | `substrate: '河沙',` |
| L384 | `plants: ['大叶皇冠', '细叶皇冠', '黑木蕨'],` |
| L385 | `hardscape: ['沉木 (流木)', '杜鹃根'],` |
| L386 | `equipment: ['桶滤', '弱光灯', '加热棒', '可加黑水素/榄仁叶'],` |
| L387 | `equipmentSettings: { filter: '桶滤', heater: true, oxygen: false, light: '普通灯' },` |
| L388 | `livestock: ['宝莲灯 15-30 条', '阿卡西短鲷 1 对', '神仙鱼 2-4 条', '咖啡鼠 4-6 条'],` |
| L390 | `recommendedLiters: '60L 起步，神仙鱼建议更高水体',` |
| L391 | `maxLivestock: '灯鱼 15-25 条；短鲷 1 对；神仙鱼 2 条；鼠鱼 4-6 条',` |
| L392 | `suitableTypes: ['弱酸南美灯鱼', '短鲷', '少量神仙鱼', '温和底栖鱼'],` |
| L393 | `avoidTypes: ['偏硬水卵胎生鱼', '大型捕食鱼', '高流速溪流鱼'],` |
| L395 | `stockedSpecies: [{ name: '宝莲灯', quantity: 20 }, { name: '阿卡西短鲷', quantity: 2 }, { name: '神仙鱼', quantity: 2 }, { name: '咖啡鼠', quantity: 4 }],` |
| L396 | `maintenance: ['每周换水 20%', '定期补充落叶或黑水材料', '保持水流柔和，避免频繁大幅调 pH'],` |
| L397 | `caution: '黑水缸追求稳定弱酸，不建议同时混入偏硬水或高流速需求的鱼。',` |
| L401 | `name: '青龙石岩组缸',` |
| L402 | `tagline: '石组构图强，视觉干净，但更考验控藻和硬度管理。',` |
| L403 | `bestFor: '45-90cm 岩组草缸、极简风格缸',` |
| L404 | `difficulty: '进阶',` |
| L410 | `baseEquipment: ['强水草灯', '桶滤', 'CO2 强烈建议', '加热棒'],` |
| L411 | `baseSubstrate: '水草泥',` |
| L412 | `basePlants: ['迷你矮珍珠', '牛毛毡', '南美叉柱花'],` |
| L413 | `baseHardscape: ['青龙石', '青龙石景观组', 'ADA风格化妆砂'],` |
| L415 | `{ name: '红莲灯', role: 'schooling', minQuantity: 10, recommendedQuantity: 16 },` |
| L416 | `{ name: '红绿灯', role: 'schooling', minQuantity: 8, recommendedQuantity: 15 },` |
| L417 | `{ name: '黑壳虾', role: 'shrimp', minQuantity: 4, recommendedQuantity: 8 },` |
| L418 | `{ name: '斑马螺', role: 'snail', minQuantity: 1, recommendedQuantity: 1 },` |
| L420 | `visualLabel: '极简石组',` |
| L422 | `benefitTags: ['视觉层次强', '极简风格', '进阶造景'],` |
| L423 | `tankSize: '45L 起步，60cm 以上更容易做纵深',` |
| L425 | `substrate: '水草泥',` |
| L426 | `plants: ['迷你矮珍珠', '牛毛毡', '南美叉柱花'],` |
| L427 | `hardscape: ['青龙石', '青龙石景观组', 'ADA风格化妆砂'],` |
| L428 | `equipment: ['强水草灯', '桶滤', 'CO2 强烈建议', '加热棒'],` |
| L429 | `equipmentSettings: { filter: '桶滤', heater: true, oxygen: false, light: '水草灯' },` |
| L430 | `livestock: ['红莲灯 12-20 条', '红绿灯 15-25 条', '黑壳虾少量', '斑马螺 1-2 只'],` |
| L433 | `maxLivestock: '小型灯鱼 20-30 条；工具虾 5-10 只；螺 1-2 只',` |
| L434 | `suitableTypes: ['小型群游灯鱼', '少量工具虾', '工具螺'],` |
| L435 | `avoidTypes: ['大型鱼', '强翻砂鱼', '偏软水敏感且不耐硬度波动的组合'],` |
| L437 | `stockedSpecies: [{ name: '红莲灯', quantity: 16 }, { name: '红绿灯', quantity: 15 }, { name: '黑壳虾', quantity: 8 }, { name: '斑马螺', quantity: 1 }],` |
| L438 | `maintenance: ['每周换水 30%-40%', '前 4 周重点控光和勤换水', '前景草爬满后定期薄剪'],` |
| L439 | `caution: '青龙石可能提高硬度，搭配偏软水灯鱼时要观察 GH/KH 和鱼只状态。',` |
| L607 | `name: typeof aquarium.name === 'string' && aquarium.name ? aquarium.name : `我的鱼缸 ${index + 1}`,` |
| L619 | `substrate: aquarium.substrate \|\| '无',` |
| L623 | `filter: aquarium.equipment?.filter \|\| '瀑布过滤',` |
| L626 | `light: aquarium.equipment?.light \|\| '普通灯',` |
| L630 | `const createDefaultAquarium = (name = '我的鱼缸'): Aquarium => ({` |
| L638 | `substrate: '无',` |
| L641 | `equipment: { filter: '瀑布过滤', heater: true, oxygen: false, light: '普通灯' },` |
| L712 | `if (primaryTool) return `${primaryTool} · ${fish.housingMode \|\| '适合继续观察'}`;` |
| L713 | `if (fish.difficulty === 'Easy') return '适合新手观察和入门搭配';` |
| L715 | `return '可以先看详情，再决定是否加入鱼缸';` |
| L722 | `suitable: '适合稳定淡水缸、草缸或工具生物搭配。',` |
| L723 | `unsuitable: '不适合频繁下药、强攻击鱼或水质大幅波动的缸。',` |
| L728 | `suitable: '适合新手、稳定水体和循序少量添加。',` |
| L729 | `unsuitable: '不适合刚开缸大量加入或与体型差异过大的鱼混养。',` |
| L733 | `suitable: '适合已有稳定参数和一定养护经验后尝试。',` |
| L734 | `unsuitable: fish.housingMode === '建议单养' ? '不适合随意混养，建议先单独规划缸位。' : '不适合水质不稳定或没有观察周期时直接加入。',` |
| L742 | `if (/螺\|snail\|Neritina\|Pomacea\|Clithon\|Anentome/i.test(`${fish.name} ${fish.scientificName}`)) return 1.5;` |
| L755 | `if (lifeType === 'plant') return '水草';` |
| L757 | `return /砂\|泥\|底床\|substrate\|soil\|sand/i.test(`${fish.name} ${fish.scientificName}`) ? '底砂' : '造景';` |
| L759 | `if (lifeType === 'invertebrate') return '虾螺';` |
| L760 | `return '鱼类';` |
| L764 | `if (!substrate \|\| substrate === '无') return null;` |
| L768 | `\|\| (substrate.includes('化妆砂') ? hardscapeSpecies.find(item => item.name.includes('化妆砂')) : undefined)` |
| L769 | `\|\| (substrate.includes('水草泥') ? hardscapeSpecies.find(item => item.name.includes('水草泥')) : undefined)` |
| L770 | `\|\| (/砂\|河沙\|黑金沙\|珊瑚砂/.test(substrate) ? hardscapeSpecies.find(item => item.name.includes('溪流砂') \|\| item.name.includes('化妆砂')) : undefined)` |
| L817 | `'无': 'none',` |
| L818 | `'瀑布过滤': 'filterCascade',` |
| L819 | `'桶滤': 'filterCanister',` |
| L820 | `'上滤': 'filterTop',` |
| L821 | `'海绵过滤': 'filterSponge',` |
| L824 | `'无': 'none',` |
| L825 | `'普通灯': 'lightNormal',` |
| L826 | `'水草灯': 'lightPlanted',` |
| L827 | `'海水灯': 'lightMarine',` |
| L843 | `const [smartPreference, setSmartPreference] = useState('新手友好 低维护');` |
| L867 | `const [diagnosisIssueType, setDiagnosisIssueType] = useState('巡检');` |
| L885 | `const [tankArchiveCategory, setTankArchiveCategory] = useState('全部');` |
| L887 | `const [draftTankArchiveCategory, setDraftTankArchiveCategory] = useState('全部');` |
| L1081 | `const newAq = createDefaultAquarium(`我的鱼缸 ${aquariums.length + 1}`);` |
| L1085 | `showToast(i18n.language === 'en' ? `Created new aquarium "${newAq.name}"` : `已新建“${newAq.name}”`);` |
| L1098 | `showToast(i18n.language === 'en' ? 'Care plan task marked completed' : '养护计划已完成');` |
| L1100 | `showToast(error instanceof Error ? error.message : (i18n.language === 'en' ? 'Failed to update care plan.' : '养护计划没有更新成功。'), 'error');` |
| L1108 | `rescheduleCareReminder(reminder.id, scheduled.toISOString(), `${days} 天后提醒`);` |
| L1110 | `showToast(i18n.language === 'en' ? `Rescheduled to remind in ${days} days` : `已改为 ${days} 天后提醒`);` |
| L1112 | `showToast(error instanceof Error ? error.message : (i18n.language === 'en' ? 'Failed to reschedule care plan.' : '养护计划没有改期成功。'), 'error');` |
| L1121 | `showToast(i18n.language === 'en' ? 'Care plan task deleted' : '养护计划已删除');` |
| L1123 | `showToast(error instanceof Error ? error.message : (i18n.language === 'en' ? 'Failed to delete care plan.' : '养护计划没有删除成功。'), 'error');` |
| L1149 | `showToast(i18n.language === 'en' ? 'Cannot open settings, please select an aquarium first.' : '暂时无法打开设置，请先选择一个鱼缸。', 'error');` |
| L1185 | `setLocalDataMessage(i18n.language === 'en' ? 'Local data generated, copy to save.' : '已生成本地数据，可复制保存。');` |
| L1191 | `setLocalDataMessage(i18n.language === 'en' ? 'Import successful, reloading...' : '导入成功，正在重新加载。');` |
| L1194 | `setLocalDataMessage(error instanceof Error ? error.message : (i18n.language === 'en' ? 'Import failed, please check JSON format.' : '导入失败，请检查 JSON 格式。'));` |
| L1199 | `const confirmed = window.confirm(i18n.language === 'en' ? 'Are you sure you want to clear local data? Tank, stocking, diagnosis, and logs cannot be recovered.' : '确认清除本地数据吗？清除后鱼缸、种草、诊断和记录都不会恢复。');` |
| L1202 | `setLocalDataMessage(i18n.language === 'en' ? 'Local data cleared, restoring default aquarium...' : '已清除本地数据，正在恢复默认鱼缸。');` |
| L1221 | `showToast(i18n.language === 'en' ? 'No corresponding species found for this memorial' : '没有找到这条生命纪念对应的物种', 'error');` |
| L1231 | `showToast(i18n.language === 'en' ? `Pre-selected "${fish.name}", compatibility will be checked before adding` : `已预选“${fish.name}”，加入前会再次检查混养风险`);` |
| L1264 | `group: '容量风险' \| '水质参数冲突' \| '混养风险' \| '信息不足';` |
| L1295 | `group: isEn ? '混养风险' : '混养风险', // Keep internal key matching if needed, or map display` |
| L1297 | `title: isEn ? 'Aggressive & Peaceful Species Mixed' : '攻击性和温和生物同缸',` |
| L1300 | `: `${aggressiveNames \|\| '攻击性生物'} 与温和小型生物同缸，发生撕咬、追逐或吞食的风险较高。`,` |
| L1301 | `nextStep: isEn ? 'Prioritize removing aggressive species or setup a separate theme tank.' : '优先移除攻击性生物，或单独规划主题缸。',` |
| L1306 | `group: isEn ? '混养风险' : '混养风险',` |
| L1308 | `title: isEn ? 'Extremely Large Size Difference' : '体型差异过大',` |
| L1311 | `: '当前同时存在大型和小型生物，小型鱼虾可能被追逐、抢食或吞食。',` |
| L1312 | `nextStep: isEn ? 'Reduce large fish or build a separate tank for small species.' : '减少大型鱼，或为小型生物单独开缸。',` |
| L1345 | `group: isEn ? '水质参数冲突' : '水质参数冲突',` |
| L1347 | `title: isEn ? 'pH Requirement Conflict' : 'pH 要求冲突',` |
| L1350 | `: `${low.fish.name}：${low.fish.phLevel}；${high.fish.name}：${high.fish.phLevel}。两者重叠区间为空，因此不建议同缸。`,` |
| L1351 | `nextStep: isEn ? 'Remove the species with the most extreme pH demand to ensure overlapping ranges.' : '移除偏酸或偏碱需求差异最大的对象，保持同缸生物 pH 区间有交集。',` |
| L1356 | `const waterTypes = new Set(curFishes.map(f => f.category === '海水鱼' ? 'Saltwater' : 'Freshwater'));` |
| L1359 | `group: isEn ? '水质参数冲突' : '水质参数冲突',` |
| L1361 | `title: isEn ? 'Water Type Conflict' : '水体类型冲突',` |
| L1362 | `detail: isEn ? 'Both saltwater and freshwater species are present; water conditions cannot satisfy both.' : '当前同时存在海水与淡水生物，水体类型无法同时满足。',` |
| L1363 | `nextStep: isEn ? 'Separate saltwater and freshwater species into different tanks.' : '把海水生物和淡水生物分缸管理。',` |
| L1388 | `group: '容量风险',` |
| L1390 | `title: '空间需求偏紧',` |
| L1391 | `detail: `鱼缸有效水体约 ${tankLiters}L，小于当前动物最低建议缸容 ${Math.round(minRequiredLiters)}L。`,` |
| L1392 | `nextStep: '优先减少空间需求最高的生物，或升级缸体。',` |
| L1397 | `group: '容量风险',` |
| L1399 | `title: '动物负载超过当前水体',` |
| L1400 | `detail: `当前约 ${totalQuantity} 只/条动物，估算动物负载需要约 ${Math.round(bioLoadLiters)}L，当前有效水体 ${tankLiters}L。主要负载来源：${loadSources \|\| '当前动物记录'}。`,` |
| L1401 | `nextStep: '先减少数量最多或负载最高的动物，再加强过滤和换水。',` |
| L1405 | `group: '容量风险',` |
| L1407 | `title: '动物负载接近上限',` |
| L1408 | `detail: `当前约 ${totalQuantity} 只/条动物，估算动物负载需要约 ${Math.round(bioLoadLiters)}L，鱼缸有效水体约 ${tankLiters}L。`,` |
| L1409 | `nextStep: '暂缓继续加生物，观察氨氮、亚硝酸盐和溶氧。',` |
| L1454 | `name: fish?.name \|\| '生物',` |
| L1483 | `setTankActionMessage(i18n.language === 'en' ? 'Please select an aquarium first.' : '请先选择当前鱼缸。');` |
| L1504 | `setTankActionMessage(i18n.language === 'en' ? 'Current stocking mix is not recommended, please adjust.' : '当前组合不建议加入，请先返回调整。');` |
| L1517 | `setTankActionMessage(i18n.language === 'en' ? 'Please fill in aquarium details before evaluating.' : '请先补充鱼缸信息，再评估是否可以加入。');` |
| L1525 | `throw new Error(i18n.language === 'en' ? 'Please select an aquarium first.' : '请先选择当前鱼缸。');` |
| L1538 | `throw new Error(i18n.language === 'en' ? 'No species to add to the active aquarium.' : '没有可加入当前鱼缸的生物。');` |
| L1550 | `? (i18n.language === 'en' ? 'Please complete aquarium details before adding.' : '请先补充鱼缸信息后再添加。')` |
| L1552 | `? (i18n.language === 'en' ? 'Stocking mix is not recommended for this aquarium.' : '当前组合不建议加入鱼缸。')` |
| L1553 | `: (i18n.language === 'en' ? 'Please acknowledge compatibility warning first.' : '请先确认混养提醒后再添加。'));` |
| L1561 | `const message = i18n.language === 'en' ? `Added ${normalizedItems.length} species to active aquarium${addedNames ? `: ${addedNames}` : ''}.` : `已加入 ${normalizedItems.length} 种生物到当前鱼缸${addedNames ? `：${addedNames}` : ''}。`;` |
| L1635 | `setTankActionMessage(hasTodayRecord ? (i18n.language === 'en' ? 'Recalled today\'s water change record' : '已撤回今日换水记录') : (i18n.language === 'en' ? `Logged water change: ${format(new Date(), 'yyyy-MM-dd HH:mm')}` : `已记录换水：${format(new Date(), 'yyyy-MM-dd HH:mm')}`));` |
| L1657 | `else showToast(i18n.language === 'en' ? 'This care task has been updated, please view latest tasks.' : '这条养护计划已经更新，请查看最新任务。', 'error');` |
| L1672 | `setTankActionMessage(i18n.language === 'en' ? 'Active aquarium size is smaller than the minimum setup requirement.' : '当前鱼缸低于该方案最低要求，无法直接应用。');` |
| L1728 | `setTankActionMessage(i18n.language === 'en' ? `Applied "${template.name}" setup layout: ${adaptedPlan.summary}` : `已应用「${template.name}」的适配方案：${adaptedPlan.summary}`);` |
| L1781 | `setTankCopilotGoal(prev => prev \|\| (activeAquarium.fishes.length > 0 ? (i18n.language === 'en' ? 'Plan safe additions based on active tank' : '基于当前鱼缸规划下一步安全搭配') : (i18n.language === 'en' ? 'Beginner small freshwater tank' : '新手小型淡水缸')));` |
| L1788 | `setTankCopilotError('先写一句目标，例如“新手小型淡水缸”。');` |
| L1809 | `setTankCopilotError('AI 建缸助手暂时不可用，请稍后重试。');` |
| L1838 | `setTankCopilotError('当前本地规则没有可执行候选，请换一个目标或先完善鱼缸信息。');` |
| L1853 | `setTankCopilotError('当前没有能进入模拟添加的安全候选，请重新描述目标。');` |
| L1867 | `setTankCopilotError('可以重新描述目标，生成更具体的建缸方案。');` |
| L1895 | `showToast('当前没有可确认的模拟方案。', 'error');` |
| L1900 | `showToast('候选物种资料不存在，无法加入鱼缸。', 'error');` |
| L1913 | `? '请先补充鱼缸信息，再确认模拟添加。'` |
| L1915 | `? '规则复核后仍不建议加入该物种。'` |
| L1916 | `: '当前模拟无法写入鱼缸，请重新评估。';` |
| L1922 | `setTankActionMessage(i18n.language === 'en' ? `Added ${species.name} x${smartAddQuantity}, recommend to observe for 3-7 days.` : `已加入 ${species.name} x${smartAddQuantity}，建议观察 3-7 天。`);` |
| L1923 | `showToast(i18n.language === 'en' ? `Added ${species.name} x${smartAddQuantity}` : `已加入 ${species.name} x${smartAddQuantity}`, 'success');` |
| L1930 | `巡检: <Activity className="h-4 w-4" />,` |
| L1931 | `换水: <Droplets className="h-4 w-4" />,` |
| L1932 | `水质异常: <Droplets className="h-4 w-4" />,` |
| L1933 | `鱼只异常: <AlertTriangle className="h-4 w-4" />,` |
| L1934 | `新鱼入缸: <Plus className="h-4 w-4" />,` |
| L1935 | `喂食问题: <Heart className="h-4 w-4" />,` |
| L1936 | `'怀孕/鱼苗': <Sparkles className="h-4 w-4" />,` |
| L1937 | `死亡处理: <Skull className="h-4 w-4" />,` |
| L1938 | `设备异常: <Settings className="h-4 w-4" />,` |
| L1975 | `volume: `约 ${targetAquarium ? getTankVolumeLiters(targetAquarium) : 0}L`,` |
| L1995 | `verdict: '请先选择一个鱼缸，再进行诊断。',` |
| L1996 | `risk: '信息不足',` |
| L1998 | `currentAction: '先选择鱼缸',` |
| L2001 | `actions: ['先选择或创建一个鱼缸'],` |
| L2002 | `avoid: ['不要在没有鱼缸数据时判断'],` |
| L2004 | `missing: ['鱼缸数据'],` |
| L2011 | `const hasShrimp = currentLivestock.some(({ fish }) => /虾\|shrimp\|neocaridina\|caridina/i.test(`${fish.name} ${fish.scientificName}`));` |
| L2013 | `const problemType: DiagnosisProblemType = isDiagnosisProblemType(diagnosisIssueType) ? diagnosisIssueType : '巡检';` |
| L2020 | `missing: string[] = ['活体生物记录', '水质数据'],` |
| L2023 | `risk: '信息不足',` |
| L2027 | `{ label: '问题类型', value: problemType },` |
| L2028 | `{ label: '当前鱼缸', value: targetAquarium.name },` |
| L2029 | `{ label: '活体数量', value: `${currentLivestock.reduce((sum, item) => sum + (item.aqFish.quantity \|\| 1), 0)} 只/条` },` |
| L2031 | `reasons: ['当前数据不足，不能生成鱼只状态判断'],` |
| L2037 | ``当前鱼缸：${targetAquarium.name}`,` |
| L2038 | ``当前活体：${livestockNames.join('、') \|\| '暂无活体生物'}`,` |
| L2039 | ``水体：${diagnosisTankSummary.water} · ${diagnosisTankSummary.volume} · ${diagnosisTankSummary.temperature}`,` |
| L2044 | `'鱼浮头 / 呼吸急促',` |
| L2045 | `'拒食',` |
| L2046 | `'躲藏不动',` |
| L2047 | `'追咬打架',` |
| L2048 | `'死亡 / 异常死亡',` |
| L2049 | `'鱼只异常',` |
| L2050 | `'新鱼入缸',` |
| L2051 | `'喂食问题',` |
| L2052 | `'怀孕/鱼苗',` |
| L2053 | `'死亡处理',` |
| L2055 | `if (currentLivestock.length === 0 && (problemType === '巡检' \|\| livestockProblemTypes.includes(problemType))) {` |
| L2057 | `'当前鱼缸暂无活体生物，无法诊断鱼只状态。',` |
| L2058 | `'先添加生物，或仅查看水质/设备排查建议',` |
| L2059 | `['先确认鱼缸过滤、温度和水体是否稳定', '如果只是水浑或设备异常，请选择对应问题类型', '添加活体后再进行鱼只状态诊断'],` |
| L2060 | `['不要在没有活体记录时判断鱼病', '不要套用其他鱼种的固定建议'],` |
| L2061 | `['过滤是否正常出水', '水体是否浑浊或有异味', '温度是否稳定'],` |
| L2062 | `['活体生物记录'],` |
| L2065 | `if (problemType === '虾类死亡' && !hasShrimp) {` |
| L2067 | `'当前鱼缸没有虾类记录，无法生成虾类死亡诊断。',` |
| L2068 | `'先确认是否已把虾类添加到当前鱼缸',` |
| L2069 | `['检查当前鱼缸活体列表是否选对', '如果实际有虾，请先添加到鱼缸记录', '如果只是水质异常，请切换到水质诊断'],` |
| L2070 | `['不要套用虾类蜕壳或铜药风险判断到没有虾的鱼缸'],` |
| L2071 | `['当前真实活体是否完整记录', '水体是否有异味或浑浊'],` |
| L2074 | `if (problemType === '水草黄叶 / 烂叶' && !hasPlants) {` |
| L2076 | `'当前鱼缸没有水草配置记录，无法判断水草黄叶或烂叶。',` |
| L2077 | `'先补充水草配置，或切换到水质/设备排查',` |
| L2078 | `['确认当前鱼缸是否已经记录水草', '检查灯光时长和过滤是否稳定', '如果实际有水草，请先添加到设备配置'],` |
| L2079 | `['不要把水草黄叶原因套用到无水草鱼缸'],` |
| L2080 | `['灯光是否正常', '水体是否浑浊', '底床是否近期翻动'],` |
| L2081 | `['水草配置记录'],` |
| L2121 | ``当前鱼缸：${targetAquarium.name}`,` |
| L2122 | ``当前真实活体：${livestockNames.join('、') \|\| '暂无活体生物'}`,` |
| L2149 | `setDiagnosisIssueType('巡检');` |
| L2165 | `const safeType: DiagnosisProblemType = isDiagnosisProblemType(typeId) ? typeId : '巡检';` |
| L2189 | `const safeType: DiagnosisProblemType = isDiagnosisProblemType(typeId) ? typeId : '巡检';` |
| L2218 | `const problemType: DiagnosisProblemType = isDiagnosisProblemType(diagnosisIssueType) ? diagnosisIssueType : '巡检';` |
| L2222 | `if (problemType === '巡检') {` |
| L2264 | `if (diagnosisIssueType !== '巡检' \|\| !diagnosisAquarium) return;` |
| L2284 | `problemType: '巡检',` |
| L2288 | `sourceContext: { source: 'home', title: '每日鱼缸检查' },` |
| L2315 | `const normalAnswers = new Set(['正常', '清澈', '没有泡沫或油膜', '没有异味', '正常游动和进食']);` |
| L2320 | `if (!hasAbnormalAnswer && (!userDescription \|\| userDescription === '跳过')) return;` |
| L2325 | `userDescription: userDescription && userDescription !== '跳过' ? userDescription : undefined,` |
| L2345 | `const problemType: DiagnosisProblemType = isDiagnosisProblemType(diagnosisIssueType) ? diagnosisIssueType : '巡检';` |
| L2366 | `const problemType: DiagnosisProblemType = isDiagnosisProblemType(diagnosisIssueType) ? diagnosisIssueType : '巡检';` |
| L2375 | `const existingDailyRecord = problemType === '巡检'` |
| L2401 | `followUpNotes: careDiagnosisContext ? [`来自百科：${careDiagnosisContext.title}`] : [],` |
| L2405 | `setDiagnosisSaveMessage(problemType === '巡检'` |
| L2406 | `? existingDailyRecord ? '已更新今天的检查记录。' : '已保存今天的检查记录。'` |
| L2407 | `: '已保存到诊断记录，下次诊断会参考最近记录。');` |
| L2408 | `showToast(problemType === '巡检'` |
| L2409 | `? existingDailyRecord ? '已更新今天的检查记录' : '已保存今天的检查记录'` |
| L2410 | `: '已保存本次诊断');` |
| L2411 | `if (problemType === '巡检') {` |
| L2427 | `: /换水\|安全换水/.test(`${context.title}${context.summary}${context.category}`)` |
| L2428 | `? '换水'` |
| L2429 | `: /鱼苗\|怀孕\|繁殖/.test(`${context.title}${context.summary}${context.category}`)` |
| L2430 | `? '怀孕/鱼苗'` |
| L2431 | `: '巡检';` |
| L2571 | `case 'Easy': return '极易';` |
| L2572 | `case 'Medium': return '中等';` |
| L2573 | `case 'Hard': return '困难';` |
| L2594 | `dateLabel: format(new Date(reminder.scheduledFor), 'MM月dd日'),` |
| L2595 | `detail: reminder.label \|\| '复查养护状态',` |
| L2614 | `experience: smartPreference.includes('新手') ? 'beginner' : 'intermediate',` |
| L2615 | `maintenance: smartPreference.includes('低维护') ? 'low' : 'balanced',` |
| L2651 | `label: '完善鱼缸信息',` |
| L2652 | `description: '打开鱼缸设置，并定位到最可能缺失的尺寸、水质或设备区域。',` |
| L2658 | `label: '重新描述目标',` |
| L2659 | `description: '本地规则暂时没有可执行候选。换一个更具体的目标，或先完善鱼缸信息。',` |
| L2663 | `label: '查看候选生物',` |
| L2664 | `description: `打开 ${tankCopilotAllowedCandidates.length} 个本地规则允许的候选，不写入真实鱼缸。`,` |
| L2670 | `label: '重新描述目标',` |
| L2671 | `description: '当前没有可以模拟添加的安全候选。请换一个目标，或先完善鱼缸信息。',` |
| L2675 | `label: '进入模拟添加',` |
| L2676 | `description: `先模拟 ${tankCopilotPrimaryCandidate.name} 的负载和兼容变化，确认后再进入真实添加。`,` |
| L2680 | `label: '重新描述目标',` |
| L2681 | `description: '当前没有明确可执行动作，重新描述目标会生成新的方案。',` |
| L2685 | `? (isTankCopilotLoading ? '生成中...' : '生成建缸方案')` |
| L2687 | `? (isTankCopilotLoading ? '重新生成中...' : '带着补充信息重新生成')` |
| L2756 | `: `当前约 ${volumeLiters}L / ${tankLengthCm \|\| '未设置'}cm，低于 ${template.name} 的最低要求 ${template.minVolumeLiters}L / ${template.minLengthCm}cm。`);` |
| L2759 | `riskItems.push(isEn ? 'Current livestock bioload is high; not recommended to add full stocking list.' : '当前已有动物负载偏高，应用方案时不建议继续加入完整生物组合。');` |
| L2762 | `riskItems.push(isEn ? 'Insufficient remaining space; only environment settings recommended, no new species added.' : '当前鱼缸剩余承载空间不足，方案只建议应用环境配置，暂不新增生物。');` |
| L2768 | `status === 'caution' && school ? (isEn ? `Adjusted for your ${volumeLiters}L tank: recommend ${school.name} ${school.quantity} pcs.` : `已根据你的 ${volumeLiters}L 鱼缸调整：建议 ${school.name} ${school.quantity} 条。`) : '',` |
| L2769 | `omittedSecondSchool ? (isEn ? 'Do not add a second schooling fish group to avoid overstocking multiple schools.' : '不建议同时加入第二种群游鱼，避免满配多个鱼群。') : '',` |
| L2770 | `existingAnimalLoad > 0 ? (isEn ? 'Reserved space for existing livestock in the tank.' : '已预留当前已有生物的承载空间。') : '',` |
| L2773 | `? (isEn ? 'Suitable for active tank' : '适合当前鱼缸')` |
| L2775 | `? (isEn ? 'Available, scaled list' : '可用，已缩减生物')` |
| L2776 | `: (isEn ? 'Unsuitable for active tank' : '不适合当前鱼缸');` |
| L2778 | `? (isEn ? 'Apply to active tank' : '应用到当前鱼缸')` |
| L2780 | `? (isEn ? 'Apply adjusted safe setup' : '应用调整后的安全方案')` |
| L2781 | `: (isEn ? 'Tank size too small' : '当前鱼缸偏小');` |
| L2792 | `? (isEn ? 'Current tank size is below requirements. Larger tank or smaller plan recommended.' : '当前鱼缸低于最低要求，建议更换更大鱼缸或选择更小方案。')` |
| L2793 | `: autoFixes.join(' ') \|\| (isEn ? `Tank suitable, safe stocking combination generated for ${volumeLiters}L.` : `当前鱼缸可承接该方案，按 ${volumeLiters}L 水体生成安全组合。`),` |
| L2797 | `: (isEn ? 'Environment setup only, no new species added' : '仅应用环境配置，暂不新增生物'),` |
| L2808 | `const heatText = template.equipmentSettings.heater ? (isEn ? 'Stable Heated' : '稳定加热') : (isEn ? 'Room Temp' : '室温可养');` |
| L2809 | `return `${template.waterType === 'Saltwater' ? (isEn ? 'Marine' : '海水') : (isEn ? 'Freshwater' : '淡水')} · ${template.temperatureRange[0]}-${template.temperatureRange[1]}°C · ${heatText}`;` |
| L2812 | `const plantNames = template.plants.map(getSpeciesDisplayName).slice(0, 2).join(isEn ? ', ' : '、') \|\| (isEn ? 'Few plants' : '少量水草');` |
| L2813 | `const hardscapeNames = template.hardscape.map(getSpeciesDisplayName).slice(0, 2).join(isEn ? ', ' : '、') \|\| (isEn ? 'Natural scape' : '自然造景');` |
| L2817 | `template.livestock.slice(0, 3).join(' · ') \|\| (isEn ? 'Select species by plan' : '按方案选择生物')` |
| L2822 | `if (name === '瀑布过滤') return 'HOB Filter';` |
| L2823 | `if (name === '桶滤') return 'Canister Filter';` |
| L2824 | `if (name === '上滤') return 'Top Filter';` |
| L2825 | `if (name === '海绵过滤') return 'Sponge Filter';` |
| L2826 | `if (name === '普通灯') return 'Standard Light';` |
| L2827 | `if (name === '水草灯') return 'Planted Light';` |
| L2828 | `if (name === '海水灯') return 'Marine Light';` |
| L2834 | `template.equipmentSettings.heater ? (isEn ? 'Heater' : '加热棒') : null,` |
| L2835 | `template.equipmentSettings.oxygen ? (isEn ? 'Aeration' : '氧气/气泡石') : null,` |
| L2868 | `if (Number.isNaN(date.getTime())) return '今天';` |
| L2870 | `return dateValue === todayAddFishDate ? `今天 · ${formatted}` : formatted;` |
| L2892 | `? '当前为空缸，建议先选择新手友好、适合建立生态的起步生物。'` |
| L2893 | `: '根据当前鱼缸状态，优先推荐新手友好、适合后续搭配的生物。';` |
| L2896 | `if (fish.difficulty === 'Easy') tags.push('新手友好');` |
| L2897 | `if (fish.size === 'Small') tags.push('小型温和');` |
| L2898 | `if (fish.housingMode === '适合混养') tags.push('后续好搭配');` |
| L2907 | `if (fish.size === 'Small' && fish.housingMode === '适合混养') return '适合作为起步搭配生物，建议先少量加入观察状态。';` |
| L2908 | `if (getLifeType(fish) === 'invertebrate') return '适合作为清洁或观察生物，但仍需要稳定水质。';` |
| L2909 | `return '建议先少量加入，观察 3-7 天后再决定是否补充数量。';` |
| L2912 | `const singleOnlyFishes = currentFishesDetails.filter(fish => fish.housingMode === '建议单养' \|\| getLifeType(fish) === 'reptile');` |
| L2929 | `? substrateOptions.filter(option => option.value !== '珊瑚砂')` |
| L2936 | `substrate: keepFreshwaterOnly && settingsForm.substrate === '珊瑚砂' ? '无' : settingsForm.substrate,` |
| L2954 | `const currentSubstrate = settingsForm.substrate \|\| '无';` |
| L2972 | `const selectedScapeCount = (currentSubstrate !== '无' ? 1 : 0) + selectedHardscapeCount;` |
| L2994 | `currentSubstrate !== '无',` |
| L3010 | `title: isEn ? 'Dimensions' : '尺寸',` |
| L3012 | `? `${settingsForm.dimensions?.length \|\| '--'}x${settingsForm.dimensions?.width \|\| '--'}x${settingsForm.dimensions?.height \|\| '--'}cm · ${isEn ? `~${Math.round(settingsEstimatedWaterLiters)}L` : `约 ${settingsEstimatedWaterLiters}L`}`` |
| L3013 | `: (isEn ? 'Incomplete dimensions' : '长宽高未完整填写'),` |
| L3018 | `title: isEn ? 'Parameters' : '参数',` |
| L3019 | `summary: `${settingsForm.waterType === 'Saltwater' ? (isEn ? 'Marine' : '海水') : (isEn ? 'Freshwater' : '淡水')} · ${settingsForm.targetTemperature \|\| '--'}°C`,` |
| L3024 | `title: isEn ? 'Substrate' : '底砂',` |
| L3025 | `summary: currentSubstrate !== '无' \|\| selectedHardscapeNames.length > 0` |
| L3026 | `? [currentSubstrate !== '无' ? (isEn ? (substrateOptions.find(opt => opt.value === currentSubstrate)?.labelEn \|\| currentSubstrate) : currentSubstrate) : null, ...selectedHardscapeNames].filter(Boolean).join(isEn ? ', ' : '、')` |
| L3027 | `: (isEn ? 'No substrate or hardscape selected' : '未选择底砂或造景'),` |
| L3028 | `configured: currentSubstrate !== '无' \|\| selectedHardscapeCount > 0,` |
| L3032 | `title: isEn ? 'Plants' : '水草',` |
| L3033 | `summary: selectedPlantNames.length > 0 ? selectedPlantNames.join(isEn ? ', ' : '、') : (isEn ? 'No plants selected' : '未选择水草'),` |
| L3038 | `title: isEn ? 'Lighting' : '灯光',` |
| L3039 | `summary: settingsForm.equipment?.light && settingsForm.equipment.light !== '无'` |
| L3041 | `: (isEn ? 'No lighting selected' : '未选择灯光'),` |
| L3042 | `configured: Boolean(settingsForm.equipment?.light && settingsForm.equipment.light !== '无'),` |
| L3046 | `title: isEn ? 'Equipment' : '设备',` |
| L3048 | `settingsForm.equipment?.filter && settingsForm.equipment.filter !== '无'` |
| L3051 | `settingsForm.equipment?.heater ? (isEn ? 'Heater' : '加热棒') : null,` |
| L3052 | `settingsForm.equipment?.oxygen ? (isEn ? 'Aeration' : '氧气/气泡石') : null,` |
| L3053 | `].filter(Boolean).join(isEn ? ', ' : '、') \|\| (isEn ? 'No filter or auxiliary equipment selected' : '未选择过滤或辅助设备'),` |
| L3055 | `(settingsForm.equipment?.filter && settingsForm.equipment.filter !== '无')` |
| L3064 | `<ConfigSection title="尺寸" subtitle="用于估算容量和后续养护建议。">` |
| L3089 | `<div className="text-[10px] font-black text-ink/45">理论容量</div>` |
| L3093 | `<div className="text-[10px] font-black text-ink/45">估算实际水量</div>` |
| L3103 | `<ConfigSection title="参数" subtitle="新手优先保持稳定，不要频繁大幅调整。">` |
| L3106 | `{ value: 'Freshwater', label: '淡水', description: '常见观赏鱼' },` |
| L3107 | `{ value: 'Saltwater', label: '海水', description: '海水生物' },` |
| L3108 | `{ value: 'Brackish', label: '汽水', description: '暂未支持', disabled: true },` |
| L3121 | `<Label className="text-[11px] font-bold text-ink/55">目标温度 (°C)</Label>` |
| L3136 | `title="底砂 / 造景"` |
| L3137 | `subtitle="底砂单选，硬景可多选。"` |
| L3138 | `actionText={isScapeListExpanded ? '收起' : '查看全部'}` |
| L3151 | `description={option.type === 'substrate' ? `底砂 · ${option.hint}` : `硬景 · ${option.hint}`}` |
| L3158 | `option.value === '无' ? 'border-dashed border-ink/30 bg-white' :` |
| L3159 | `option.value === '水草泥' \|\| option.value === '黑金沙' ? 'border-stone-700 bg-stone-800' :` |
| L3160 | `option.value === '溪流砂' \|\| option.value === '碎石' \|\| option.value === '鹅卵石' ? 'border-stone-400 bg-stone-300' :` |
| L3161 | `option.value === '珊瑚砂' \|\| option.value === '化妆砂' ? 'border-amber-100 bg-amber-50' :` |
| L3162 | `option.value === '陶粒' ? 'border-orange-600 bg-orange-500' :` |
| L3189 | `title="水草"` |
| L3190 | `subtitle="选择当前鱼缸里的水草种类。"` |
| L3191 | `actionText={isPlantListExpanded ? '收起' : '查看全部'}` |
| L3224 | `<ConfigSection title="灯光" subtitle="选择草缸和观赏所需灯光。">` |
| L3226 | `{['无', '普通灯', '水草灯', '海水灯'].map(option => (` |
| L3230 | `selected={(settingsForm.equipment?.light \|\| '普通灯') === option}` |
| L3243 | `<ConfigSection title="设备" subtitle="过滤单选，加热与氧气按需开启。">` |
| L3246 | `{['无', '瀑布过滤', '桶滤', '上滤', '海绵过滤'].map(option => (` |
| L3250 | `selected={(settingsForm.equipment?.filter \|\| '瀑布过滤') === option}` |
| L3260 | `{ key: 'heater', label: '加热棒', description: '低温或热带鱼建议开启' },` |
| L3261 | `{ key: 'oxygen', label: '氧气 / 气泡石', description: '高密度或虾缸可开启' },` |
| L3287 | `? `缸内有${singleOnlyFishes.slice(0, 2).map(fish => fish.name).join('、')}这类更适合单养的生物，以下只作为同水体低风险参考。`` |
| L3289 | `? `当前鱼缸约 ${tankVolumeLiters}L，负载偏高，以下仅展示较低风险候选，添加前建议先减密度或升级鱼缸。`` |
| L3291 | `? `已根据缸内${recommendationNames}${currentFishesDetails.length > 2 ? '等生物' : ''}的水温、pH、体型、性格和鱼缸容量筛选。`` |
| L3292 | `: '当前为空缸，优先推荐新手友好、后续好混养的起步生物。';` |
| L3294 | `? `${singleOnlyFishes.slice(0, 2).map(fish => fish.name).join('、')}更适合单独饲养，当前不建议继续新增混养生物。`` |
| L3296 | `? `当前鱼缸约 ${tankVolumeLiters}L，生物负载已经偏高，先不要继续加鱼会更安全。`` |
| L3297 | `: '当前鱼缸的水质区间或体型性格组合比较敏感，暂时没有足够安全的新增候选。';` |
| L3352 | `if (activeAquarium.waterType === 'Saltwater') return fish.category === '海水鱼';` |
| L3353 | `return fish.category !== '海水鱼' && getLifeType(fish) !== 'coral';` |
| L3357 | `\|\| ['青龙石', '沉木', '杜鹃根', 'ADA风格化妆砂', '火山石板', '水草泥', '溪流砂'].some(name => fish.name.includes(name))` |
| L3378 | `const archiveCategories = ['全部', '鱼类', '虾螺', '水草', '底砂', '造景'];` |
| L3379 | `const primaryArchiveCategories = ['全部', '鱼类', '虾螺', '水草'];` |
| L3411 | `? `数量 ${item.quantity}`` |
| L3413 | `? '已配置水草'` |
| L3415 | `? (isEn ? 'Current Substrate' : '当前底砂')` |
| L3416 | `: (isEn ? 'Configured Hardscape' : '已配置造景'),` |
| L3418 | `if (activeAquarium.substrate && activeAquarium.substrate !== '无' && !tankConfiguredContentItems.some(item => item.category === '底砂' \|\| item.category === 'Substrate')) {` |
| L3424 | `category: isEn ? 'Substrate' : '底砂',` |
| L3428 | `description: substrateMeta ? (isEn ? `Current Substrate · ${substrateMeta.hintEn}` : `当前底砂 · ${substrateMeta.hint}`) : (isEn ? 'Current substrate setup' : '当前底砂配置'),` |
| L3434 | `: `过滤：${activeAquarium.equipment.filter}`),` |
| L3437 | `: `灯光：${activeAquarium.equipment.light}`),` |
| L3439 | `? (isEn ? 'Heater: On' : '加热棒：已开启')` |
| L3440 | `: (isEn ? 'Heater: Off' : '加热棒：未开启')),` |
| L3442 | `? (isEn ? 'Aeration: On' : '氧气：已开启')` |
| L3443 | `: (isEn ? 'Aeration: Off' : '氧气：未开启')),` |
| L3449 | `name: isEn ? 'Equipment Setup' : '设备配置',` |
| L3450 | `category: isEn ? 'Equipment' : '设备',` |
| L3460 | `if (Number.isNaN(date.getTime())) return isEn ? 'Unknown time' : '时间未知';` |
| L3468 | `const hasEnvironmentContent = tankConfiguredContentItems.some(item => ['水草', '底砂', '造景', '设备'].includes(item.category));` |
| L3470 | `全部: '当前还没有配置鱼缸内容，可以先完善配置或套用搭建方案。',` |
| L3471 | `鱼类: '暂无鱼类。',` |
| L3472 | `虾螺: '暂无虾螺蟹。',` |
| L3473 | `水草: '暂无水草配置。',` |
| L3474 | `底砂: '暂无底砂配置。',` |
| L3475 | `造景: '暂无造景配置。',` |
| L3519 | `: '暂无';` |
| L3543 | `? `${activeAquarium.dimensions?.length}x${activeAquarium.dimensions?.width}x${activeAquarium.dimensions?.height}cm · ${activeAquarium.waterType === 'Saltwater' ? '海水' : '淡水'} · ${activeAquarium.targetTemperature}℃`` |
| L3544 | `: '先确认尺寸、水体、温度和设备。';` |
| L3547 | `const tankHealthStatus = healthScore < 60 \|\| conflicts.length > 0 ? '风险' : healthScore < 80 \|\| isChangeOverdue \|\| daysUntilChange <= 1 ? '提醒' : '正常';` |
| L3548 | `const waterTaskStatus: TodayTaskStatus = waterChangedToday ? '已完成' : isChangeOverdue ? '建议处理' : daysUntilChange <= 1 ? '待处理' : '观察';` |
| L3549 | `const feedingTaskStatus: TodayTaskStatus = !hasStockedAnimals ? '观察' : fedToday ? '已完成' : '观察';` |
| L3551 | `const equipmentTaskStatus: TodayTaskStatus = heaterNeedsAttention ? '建议处理' : '已完成';` |
| L3552 | `const observeTaskStatus: TodayTaskStatus = conflicts.length > 0 ? '建议处理' : '观察';` |
| L3554 | `const activeDiagnosisProblemType: DiagnosisProblemType = isDiagnosisProblemType(diagnosisIssueType) ? diagnosisIssueType : '巡检';` |
| L3558 | `const isDailyCheckQuiz = diagnosisMode === 'quiz' && activeDiagnosisProblemType === '巡检';` |
| L3574 | `.filter(status => status === '待处理' \|\| status === '建议处理').length;` |
| L3577 | `'近期水质数据',` |
| L3578 | `...(!latestWaterChangeDate ? ['上次换水记录'] : []),` |
| L3579 | `...(!activeAquarium.targetTemperature ? ['当前水温'] : []),` |
| L3595 | `title: '继续处理今天发现的异常',` |
| L3597 | `reason: unresolvedPatrol.resultSummary \|\| '今天的巡检仍有需要继续观察或处理的异常。',` |
| L3598 | `evidence: '来自今天保存的每日鱼缸检查',` |
| L3599 | `primaryLabel: '继续处理异常',` |
| L3607 | `title: '先处理缸内混养风险',` |
| L3611 | `primaryLabel: '查看混养风险',` |
| L3620 | `reason: '这项养护计划已经逾期，今天先完成并记录结果。',` |
| L3621 | `evidence: `计划日期：${format(new Date(overdueCareReminder.scheduledFor), 'yyyy/MM/dd')}`,` |
| L3622 | `primaryLabel: '查看操作指引',` |
| L3630 | `title: '记录本次换水',` |
| L3632 | `reason: `换水计划已逾期 ${waterChangeOverdueDays} 天。`,` |
| L3633 | `evidence: latestWaterChangeDate ? `上次换水：${latestWaterChangeDate}` : '还没有可用的上次换水记录',` |
| L3634 | `primaryLabel: '记录本次换水',` |
| L3643 | `reason: '这项养护计划今天到期。',` |
| L3644 | `evidence: `计划日期：${format(new Date(todayCareReminder.scheduledFor), 'yyyy/MM/dd')}`,` |
| L3645 | `primaryLabel: '查看操作指引',` |
| L3653 | `title: '记录本次换水',` |
| L3655 | `reason: '换水计划今天需要处理。',` |
| L3656 | `evidence: latestWaterChangeDate ? `上次换水：${latestWaterChangeDate}` : '还没有可用的上次换水记录',` |
| L3657 | `primaryLabel: '记录本次换水',` |
| L3664 | `title: '完成今天的鱼缸检查',` |
| L3666 | `reason: '今天还没有记录鱼群、水面和气味是否正常。',` |
| L3667 | `evidence: '当前鱼缸今天没有巡检记录',` |
| L3668 | `primaryLabel: '开始今日检查',` |
| L3675 | `title: '今天没有必须处理',` |
| L3677 | `reason: '今日检查已完成，当前没有到期计划或阻断级风险。',` |
| L3678 | `evidence: '基于今天的巡检、养护计划和混养规则记录',` |
| L3690 | `label: dailyActionLevel === 'urgent' ? '优先处理' : dailyActionLevel === 'needs_attention' ? '今天完成' : dailyActionTask.actionType === 'routine' ? '已完成' : '今日待办',` |
| L3691 | `sourceLabel: dailyActionTask.actionType === 'care_plan' \|\| dailyActionTask.actionType === 'water_change' ? '基于养护记录' : dailyActionTask.actionType === 'urgent_recovery' \|\| dailyActionTask.actionType === 'daily_check' ? '基于巡检记录' : '基于鱼缸规则',` |
| L3702 | `conflicts.length > 0 ? `当前记录了 ${conflicts.length} 条混养提醒。` : '当前没有阻断级混养记录。',` |
| L3703 | `dailyAdviceMissingData.length > 0 ? `尚缺：${dailyAdviceMissingData.join('、')}。` : '关键维护信息已有记录。',` |
| L3707 | `? `室外约 ${Math.round(localWeather.temperatureC)}°C，`` |
| L3710 | `? `已记录今日喂食，继续观察抢食和残饵。`` |
| L3712 | `? '以藻类和残饵为主，少量补充即可，避免过量坏水。'` |
| L3713 | `: '按鱼只状态少量投喂，2-3 分钟内吃完即可，不必机械固定每天同量。';` |
| L3728 | `title: '完善鱼缸配置',` |
| L3729 | `status: '建议处理' as ActionCenterStatus,` |
| L3730 | `description: '补齐尺寸、温度和设备。',` |
| L3731 | `actionText: '去设置',` |
| L3738 | `title: hasAppliedBuildPlan ? '查看当前方案' : '选择搭建方案',` |
| L3739 | `status: hasAppliedBuildPlan ? '已完成' as ActionCenterStatus : '观察' as ActionCenterStatus,` |
| L3740 | `description: hasAppliedBuildPlan ? '可更换或调整方案。' : '先确定底床、设备和生物上限。',` |
| L3741 | `actionText: hasAppliedBuildPlan ? '查看方案' : '选方案',` |
| L3748 | `? '当前只保留一个最该做的动作。'` |
| L3750 | `? '先选一个安全搭建方向。'` |
| L3751 | `: '先把基础配置补齐。'` |
| L3753 | `? `今天有 ${todayTaskCount} 项建议处理。`` |
| L3754 | `: '今天暂无紧急任务，可以正常观察。';` |
| L3756 | `? '今日未检查'` |
| L3758 | `? '建议重新检查'` |
| L3759 | `: '今日已检查';` |
| L3763 | `label: '每日鱼缸检查',` |
| L3767 | `tone: dailyCheckStatus === '建议重新检查' ? 'warning' as const : todayDailyCheckRecord ? 'normal' as const : 'info' as const,` |
| L3772 | `label: waterChangedToday ? '撤回换水记录' : '记录本次换水',` |
| L3773 | `description: waterChangedToday ? '今日已记录' : '更新换水周期',` |
| L3776 | `tone: waterChangedToday ? 'normal' as const : waterTaskStatus === '建议处理' \|\| waterTaskStatus === '待处理' ? 'warning' as const : 'info' as const,` |
| L3781 | `label: fedToday ? '撤回喂食记录' : '记录本次喂食',` |
| L3782 | `description: hasStockedAnimals ? (fedToday ? '今日已记录' : '少量投喂') : '添加生物后使用',` |
| L3786 | `showToast('鱼缸内还没有生物，添加后才能记录喂食', 'error');` |
| L3800 | `note: '喂食记录',` |
| L3806 | `setTankActionMessage(next ? `已记录喂食：${format(new Date(), 'HH:mm')}` : '已撤回今日喂食记录');` |
| L3815 | `label: '添加生物',` |
| L3816 | `description: tankHealthStatus === '风险' ? '先处理风险后添加' : '从图鉴加入鱼缸',` |
| L3819 | `tone: tankHealthStatus === '风险' ? 'muted' as const : 'normal' as const,` |
| L3823 | `label: 'AI 建缸助手',` |
| L3824 | `description: '说目标，补条件，看方案',` |
| L3831 | `label: '查看养护记录',` |
| L3832 | `description: '养护历史',` |
| L3838 | `const hasPriorityRisk = hasStockedAnimals && (healthScore < 85 \|\| conflicts.length > 0 \|\| observeTaskStatus === '建议处理');` |
| L3850 | `level: healthScore < 60 ? '紧急' : '建议观察',` |
| L3851 | `title: '观察鱼的呼吸状态',` |
| L3852 | `reason: '如果鱼浮头、急促呼吸或趴缸，可能需要处理。',` |
| L3853 | `actionText: priorityTaskStatus.observeBreathing \|\| '开始观察',` |
| L3859 | `level: '配置提醒',` |
| L3860 | `title: '查看混养风险',` |
| L3861 | `reason: `当前鱼缸内已有 ${totalStockedQuantity} 只/条生物，建议检查体型、性情或空间冲突。`,` |
| L3862 | `actionText: priorityTaskStatus.viewMixingRisk \|\| '查看混养风险',` |
| L3866 | `markPriorityTask('viewMixingRisk', '已查看');` |
| L3871 | `level: '可选排查',` |
| L3872 | `title: '检查水体状态',` |
| L3873 | `reason: '如果水发白、发绿、有异味，再进入水质诊断。',` |
| L3874 | `actionText: priorityTaskStatus.checkWater \|\| '开始水质自查',` |
| L3877 | `handleOpenDiagnosisWithType('水质异常');` |
| L3902 | `aquariumName: diagnosisAquarium?.name \|\| '当前鱼缸',` |
| L3904 | `primaryActionLabel: diagnosisIssueType === '巡检' && dailyCheckArticles[0]` |
| L3905 | `? '查看补救步骤'` |
| L3906 | `: diagnosisIssueType === '巡检'` |
| L3907 | `? todayDailyCheckRecord ? '更新今天记录' : '保存今天记录'` |
| L3908 | `: '保存本次诊断',` |
| L3909 | `primaryActionType: diagnosisIssueType === '巡检' && dailyCheckArticles[0] ? 'dialog' : 'mutation',` |
| L3914 | `title: dailyCheckInterpretation.source === 'model' ? 'AI 补充解读' : '本地补充解读',` |
| L3922 | `if (diagnosisIssueType === '巡检' && dailyCheckArticles[0] && structuredDiagnosis) {` |
| L4072 | `title="切换鱼缸"` |
| L4080 | `{activeAquarium?.name \|\| '我的鱼缸'}` |
| L4083 | `{aquariums.length} 个鱼缸` |
| L4093 | `<div className="text-[11px] font-black text-ink">切换鱼缸</div>` |
| L4094 | `<div className="mt-0.5 text-[9px] font-bold text-ink/42">选择当前正在管理的鱼缸</div>` |
| L4122 | `{aq.fishes.length > 0 ? `${aq.fishes.length} 种内容` : '暂无生物'}` |
| L4128 | `当前` |
| L4133 | `aria-label={`删除${aq.name}`}` |
| L4140 | `title="删除鱼缸"` |
| L4157 | `新建鱼缸` |
| L4167 | `title="查看水族册种草"` |
| L4170 | `<span className="hidden min-[380px]:inline">水族册</span>` |
| L4177 | `aria-label="数据保存提醒"` |
| L4179 | `title="数据保存提醒"` |
| L4186 | `aria-label="语言设置"` |
| L4188 | `title="语言设置"` |
| L4229 | `<div className="text-[13px] font-black text-ink">今日种草</div>` |
| L4230 | `<div className="text-[10px] font-bold text-ink/45">每天随机 10 个物种，完整模式点卡片进入。</div>` |
| L4233 | `今日 {discoveryRemainingToday}/10` |
| L4266 | `discoveryFish.difficulty === 'Easy' ? '新手友好' : getDifficultyLabel(discoveryFish.difficulty),` |
| L4268 | `needsHeaterForSpecies(discoveryFish) ? '需加热' : discoveryFish.housingMode,` |
| L4284 | `换一条` |
| L4296 | `setDiscoveryMessage(`${discoveryFish.name} 已在种草图鉴中。`);` |
| L4302 | `{wishlistFishIds.has(discoveryFish.id) ? '已种草' : '感兴趣'}` |
| L4311 | `{isDiscoveryDailyLimitReached ? '今天的 10 款已经看完啦' : '暂时没有新的推荐'}` |
| L4314 | `{isDiscoveryDailyLimitReached ? '明天再来看看新的灵感。' : '稍后再来看看，也许会遇到新的心动物种。'}` |
| L4326 | `<SectionHeader title="常用操作" subtitle="快速记录日常养护。" />` |
| L4334 | `<SectionHeader title="下一步行动" subtitle={tankActionMessage \|\| nextStepMessage} />` |
| L4361 | `正在加载鱼缸画面...` |
| L4375 | `) : <span className="text-xs font-black text-emerald-900/55">鱼缸画面将在空闲时加载</span>}` |
| L4378 | `加载 3D 鱼缸` |
| L4387 | `{activeAquarium.waterType === 'Saltwater' ? '海水' : '淡水'} \| {activeAquarium.targetTemperature \|\| '25'}°C` |
| L4390 | `{activeAquarium.dimensions?.length \|\| 60}x{activeAquarium.dimensions?.width \|\| 40}x{activeAquarium.dimensions?.height \|\| 40}cm · 约{tankVolumeLiters}L` |
| L4397 | `<span className="text-[9px] font-bold text-ink/50 uppercase tracking-wider px-1 text-center mb-1">切换镜头</span>` |
| L4422 | `aria-label="添加生物"` |
| L4423 | `title="添加生物"` |
| L4430 | `aria-label="全屏预览"` |
| L4431 | `title="全屏预览"` |
| L4438 | `aria-label="鱼缸设置"` |
| L4439 | `title="鱼缸设置"` |
| L4456 | `<span className="font-bold text-xs">风险警告</span>` |
| L4474 | `缸内物种` |
| L4478 | `? `${stockedSpeciesCount} 种 · 共 ${totalStockedQuantity} 只/条`` |
| L4480 | `? '暂无鱼虾螺，已配置环境内容'` |
| L4481 | `: '当前还没有配置鱼缸内容'}` |
| L4495 | `已配置 {activeConfiguredSettingCount} 项` |
| L4507 | `aria-label="回到鱼缸画面"` |
| L4516 | `缸内物种` |
| L4521 | `<div className="text-[11px] font-bold text-ink/45">配置项</div>` |
| L4523 | `{activeConfiguredSettingCount} 项` |
| L4536 | `<div className="text-sm font-black text-ink">当前还没有配置鱼缸内容</div>` |
| L4538 | `可以先完善配置、添加生物，或套用搭建方案快速起步。` |
| L4542 | `添加生物` |
| L4548 | `{!hasStockedAnimals && hasEnvironmentContent && tankArchiveCategory === '全部' && (` |
| L4550 | `<div className="text-[12px] font-black text-sky-800">暂无鱼虾螺，已配置环境内容</div>` |
| L4552 | `你已配置水草、底砂、造景或设备，可以继续添加适合的生物。` |
| L4735 | `<DialogTitle>鱼缸全屏预览</DialogTitle>` |
| L4736 | `<DialogDescription>放大查看当前鱼缸 3D 画面。</DialogDescription>` |
| L4743 | `正在加载鱼缸画面...` |
| L4758 | `{activeAquarium.waterType === 'Saltwater' ? '海水' : '淡水'} · {activeAquarium.targetTemperature \|\| '25'}°C · 约{tankVolumeLiters}L` |
| L4774 | `<span className="min-w-0"><span className="block truncate text-[11px] font-black">{fishInfo.name}</span><span className="text-[9px] font-bold opacity-55">{quantity} 只/条</span></span>` |
| L4778 | `{activeAquarium.fishes.length === 0 && <div className="px-3 py-2 text-[11px] font-bold text-ink/45">还没有缸内物种。</div>}` |
| L4783 | `<div className="mt-1 text-[12px] font-bold text-ink/48">沉浸式鱼缸视图</div>` |
| L4786 | ``${activeAquarium.waterType === 'Saltwater' ? '海水' : '淡水'} · ${activeAquarium.targetTemperature \|\| '25'}°C`,` |
| L4787 | ``${activeAquarium.dimensions?.length \|\| 60}x${activeAquarium.dimensions?.width \|\| 40}x${activeAquarium.dimensions?.height \|\| 40}cm · 约${tankVolumeLiters}L`,` |
| L4788 | ``${activeAquarium.fishes.length} 条记录 · ${totalStockedQuantity} 只/条活体`,` |
| L4795 | `<div className="mt-5 text-[13px] font-black text-ink">镜头切换</div>` |
| L4816 | `<span className="block text-[10px] font-bold opacity-55">{quantity} 只/条</span>` |
| L4823 | `还没有活体生物。` |
| L4837 | `{diagnosisIssueType === '巡检' ? t('aquarium.dailyCheck') : t('aquarium.smartDiagnosis')}` |
| L4840 | `{diagnosisIssueType === '巡检'` |
| L4936 | `<div className="text-[13px] font-black text-ink">选择问题类型</div>` |
| L4937 | `<p className="mt-0.5 text-[11px] font-medium text-ink/50">点击后进入逐题测试，每次只回答一道题。</p>` |
| L4954 | `<span className="rounded-full bg-white px-2 py-1 text-[10px] font-black text-ink/45">预计 {count} 题</span>` |
| L4968 | `<div className="text-[13px] font-black text-ink">一次完成今天检查</div>` |
| L4969 | `<p className="mt-0.5 text-[11px] font-medium text-ink/50">按实际观察选择，补充描述可以留空。</p>` |
| L5001 | `value={answer === '跳过' ? '' : answer}` |
| L5003 | `placeholder="可选：补充一句你看到的异常"` |
| L5043 | `<div className="text-[11px] font-black text-ink/45">第 {diagnosisQuestionIndex + 1} / {activeDiagnosisQuestions.length} 题</div>` |
| L5053 | `没有也没关系，系统会先根据观察到的现象给出初步判断。` |
| L5075 | `value={currentDiagnosisAnswer === '跳过' ? '' : currentDiagnosisAnswer}` |
| L5077 | `placeholder="可选：补充一句症状描述"` |
| L5083 | `<div><span className="font-black text-ink/65">pH：</span>水偏酸还是偏碱，很多鱼能适应一定范围，不需要每天测。</div>` |
| L5084 | `<div><span className="font-black text-ink/65">氨氮：</span>鱼便、残饵腐烂后产生的有毒废物，新缸或喂多时容易升高。</div>` |
| L5085 | `<div><span className="font-black text-ink/65">亚硝酸盐：</span>过滤系统不稳定时容易出现的有害指标，可能导致鱼浮头、趴缸。</div>` |
| L5106 | `{diagnosisIssueType === '巡检' && isDiagnosing && (` |
| L5108 | `AI 正在整理你的补充描述；本地风险和处理步骤已先生成。` |
| L5127 | `<div className="text-[12px] font-black text-ink">建议动作</div>` |
| L5136 | `<div className="text-[12px] font-black text-ink">补充记录</div>` |
| L5177 | `<Button onClick={() => handleStartDiagnosisQuiz(selectedDiagnosisRecord?.problemType \|\| '巡检')} className="h-10 rounded-full bg-emerald-700 text-sm font-bold text-white hover:bg-emerald-800">{t('aquarium.diagnoseAgainThisProblem')}</Button>` |
| L5208 | `<div className="text-[13px] font-black text-red-800">暂时不要做</div>` |
| L5218 | `<Button onClick={() => setSelectedDailyCheckArticle(null)} className="h-10 w-full rounded-full bg-emerald-700 text-sm font-black text-white">返回检查结果</Button>` |
| L5226 | `<DialogTitle className="font-serif text-xl font-bold italic text-ink">全部提醒</DialogTitle>` |
| L5228 | `不是所有提醒都需要立即处理，先完成最明确的一项。` |
| L5239 | `const isDone = task.actionText.startsWith('已');` |
| L5282 | `关闭` |
| L5291 | `<DialogTitle className="font-serif text-xl font-bold italic text-ink">观察鱼的状态</DialogTitle>` |
| L5293 | `2 分钟内你看到以下情况了吗？` |
| L5297 | `{['鱼浮在水面', '呼吸明显急促', '趴缸或躲藏', '拒食或抢食异常', '没有明显异常'].map(item => {` |
| L5322 | `markPriorityTask('observeBreathing', '已观察');` |
| L5330 | `note: '未发现明显呼吸异常',` |
| L5335 | `setTankActionMessage(`已记录观察：${format(new Date(), 'HH:mm')} 未发现明显呼吸异常`);` |
| L5339 | `没有异常，记录观察` |
| L5344 | `markPriorityTask('observeBreathing', '已发现异常');` |
| L5352 | `note: observationChecks.length > 0 ? observationChecks.join('、') : '发现异常',` |
| L5357 | `setTankActionMessage('已记录呼吸异常，建议继续完成鱼只异常诊断。');` |
| L5359 | `handleOpenDiagnosisWithType('鱼只异常');` |
| L5362 | `发现异常，去诊断` |
| L5381 | `<DialogTitle className="text-xl font-black text-ink">添加生物到鱼缸</DialogTitle>` |
| L5383 | `先选择生物，再填写数量和入缸日期。` |
| L5395 | `<div className="text-lg font-black text-emerald-800">已添加到当前鱼缸</div>` |
| L5397 | `已加入 {addFishSuccess.aquariumName}，你可以回到鱼缸查看，也可以继续添加其他生物。` |
| L5410 | `<div className="mt-0.5 text-[11px] font-bold text-ink/48">入缸日期：{formatAddFishDateLabel(item.entryDate)}</div>` |
| L5418 | `查看我的鱼缸` |
| L5421 | `继续添加` |
| L5435 | `<div className="text-[11px] font-black text-ink/45">第 2 步：混养复核</div>` |
| L5441 | `? '当前组合命中阻断风险，不能直接加入这个鱼缸。'` |
| L5443 | `? '鱼缸关键信息不足，请先补全后再判断。'` |
| L5444 | `: '存在需要注意的条件，确认理解风险后才能加入。'}` |
| L5448 | `{addFishCompatibilityReview.evaluations.length} 种生物` |
| L5466 | `<div className="text-[11px] font-black text-ink">最关键的依据</div>` |
| L5482 | `<div className="text-[13px] font-black text-ink">第 1 步：选择生物</div>` |
| L5488 | `placeholder="搜索鱼、虾、螺或学名"` |
| L5501 | `<div className="text-[12px] font-black text-ink/55">{fishSearchTerm.trim() ? '搜索结果' : '智能推荐'}</div>` |
| L5502 | `{!fishSearchTerm.trim() && <span className="text-[10px] font-bold text-ink/35">基于当前鱼缸</span>}` |
| L5528 | `{isSelected ? '已选择' : '选择'}` |
| L5544 | `<div className="rounded-[14px] bg-bg px-3 py-5 text-center text-xs font-medium text-ink/50">没有找到相关生物</div>` |
| L5557 | `<div className="text-[13px] font-black text-ink">第 2 步：确认已选生物</div>` |
| L5560 | `已选择 {selectedAddSpeciesCount} 种` |
| L5565 | `{selectedAddSpeciesCount > 0 ? '确认每种生物的数量和入缸日期后再添加。' : '还没有选择生物，请先从上方搜索或推荐中选择。'}` |
| L5585 | `<div className="mt-1 text-[10px] font-bold text-emerald-700">建议先少量加入，观察 3-7 天。</div>` |
| L5594 | `aria-label={`移除 ${item.fish.name}`}` |
| L5602 | `<Label className="text-[10px] font-black text-ink/48">数量</Label>` |
| L5609 | `aria-label={`减少 ${item.fish.name} 数量`}` |
| L5618 | `aria-label={`增加 ${item.fish.name} 数量`}` |
| L5625 | `<Label className="text-[10px] font-black text-ink/48">入缸日期</Label>` |
| L5648 | `aria-label="上个月"` |
| L5652 | `<div className="text-sm font-black text-ink">{format(datePickerMonth, 'yyyy年 M月')}</div>` |
| L5658 | `aria-label="下个月"` |
| L5664 | `{['日', '一', '二', '三', '四', '五', '六'].map(day => <span key={day}>{day}</span>)}` |
| L5707 | `将添加：{selectedAddFishDetails[0].fish.name} x {selectedAddFishDetails[0].quantity}` |
| L5711 | `将添加：{selectedAddSpeciesCount} 种生物，共 {selectedAddTotalQuantity} 只/条` |
| L5716 | `{selectedAddFishDetails.length > 4 && <span>还有 {selectedAddFishDetails.length - 4} 种...</span>}` |
| L5721 | `默认入缸日期为今天，可分别修改。` |
| L5727 | `还没有选择生物，请先从上方搜索或推荐中选择。` |
| L5748 | `{addFishCompatibilityReview ? '返回调整' : '取消'}` |
| L5751 | `{selectedAddSpeciesCount === 0 && <div className="text-center text-[10px] font-bold text-ink/38">从上方搜索或推荐中选择要加入鱼缸的生物</div>}` |
| L5762 | `? '请先选择生物'` |
| L5765 | `? '返回调整组合'` |
| L5767 | `? '先补充鱼缸信息'` |
| L5768 | `: '确认风险后加入'` |
| L5769 | `: '确认添加到鱼缸'}` |
| L5782 | `AI 建缸助手` |
| L5785 | `告诉我想养什么，我帮你补齐条件并整理安全方案。` |
| L5792 | `{ step: 1, title: '说目标', note: '输入方向' },` |
| L5793 | `{ step: 2, title: '补信息', note: '最多 3 问' },` |
| L5794 | `{ step: 3, title: '看方案', note: '执行下一步' },` |
| L5810 | `<div className="mt-0.5 text-[10px] font-bold opacity-75">{isDone ? '已完成' : item.note}</div>` |
| L5819 | `<div className="text-sm font-black text-ink">你想建什么样的缸？</div>` |
| L5821 | `当前参考：{activeAquarium.name} · {activeAquarium.waterType === 'Saltwater' ? '海水' : '淡水'} · {activeAquarium.targetTemperature \|\| 25}°C` |
| L5825 | `最多 3 步到方案` |
| L5835 | `placeholder="例如：新手小型淡水缸、低维护草缸、虾缸"` |
| L5840 | `{['新手小型淡水缸', '低维护草缸', '虾缸', '观赏鱼群游缸'].map(goal => (` |
| L5867 | `<div className="text-sm font-black text-accent">目标理解</div>` |
| L5873 | `{tankCopilotResult.source === 'model' ? '模型回复' : '本地模板'}` |
| L5879 | `: 'AI 暂不可用，系统规则仍可使用。'}` |
| L5884 | `<div className="text-xs font-black text-amber-700">第 2 步：补充关键信息</div>` |
| L5886 | `{tankCopilotMissingQuestions.length} 项` |
| L5904 | `placeholder="不知道也可以写“不确定”"` |
| L5911 | `补完后重新生成，方案会更贴近你的鱼缸；不会直接修改真实鱼缸。` |
| L5919 | `<div className="text-sm font-black text-ink">推荐方向</div>` |
| L5929 | `<div className="text-sm font-black text-ink">候选生物</div>` |
| L5931 | `本地规则允许` |
| L5956 | `<div className="text-sm font-black text-amber-800">暂无可执行候选</div>` |
| L5958 | `模型或模板给出的候选没有通过本地规则候选池校验。请重新描述目标，或先完善鱼缸信息。` |
| L5965 | `已隐藏 {tankCopilotHiddenCandidateCount} 个未通过本地规则候选池校验的候选。` |
| L5971 | `<div className="text-sm font-black text-ink">下一步动作</div>` |
| L5973 | `<div className="text-xs font-black text-emerald-700">建议先做</div>` |
| L5981 | `<summary className="cursor-pointer">查看不建议方向</summary>` |
| L5994 | `<div className="text-sm font-black text-ink">还没有生成方案</div>` |
| L5996 | `输入一个目标后，系统会先用本地规则筛掉不安全方向，再让 AI 组织成可执行方案。` |
| L6002 | `系统结论由规则生成，AI 负责理解目标、解释方案和生成行动建议。` |
| L6012 | `title={tankCopilotNeedsAnswers && !tankCopilotHasAnswer ? '先补充至少一项信息' : undefined}` |
| L6031 | `缸内生物智能推荐` |
| L6034 | `系统规则先筛安全边界，AI 只做解释和排序辅助。` |
| L6041 | `{ id: 'existing_livestock' as RecommendationMode, title: '已有生物推荐', desc: '基于当前缸内生物补充' },` |
| L6042 | `{ id: 'empty_tank' as RecommendationMode, title: '空缸搭配', desc: '生成完整组合方案' },` |
| L6063 | `<div className="text-sm font-black text-ink">当前鱼缸画像</div>` |
| L6065 | `<span className="rounded-full bg-white px-2.5 py-1 text-accent">负载 {smartRecommendation.profile.load.loadRate}%</span>` |
| L6066 | `<span className="rounded-full bg-white px-2.5 py-1 text-ink/58">剩余 {smartRecommendation.profile.load.remainingCapacity} 负载</span>` |
| L6067 | `<span className="rounded-full bg-white px-2.5 py-1 text-ink/58">已有 {smartRecommendation.profile.livestock.length} 种活体</span>` |
| L6068 | `<span className="rounded-full bg-white px-2.5 py-1 text-ink/58">可补水层 {smartRecommendation.profile.availableNiches.length \|\| 0} 个</span>` |
| L6077 | `<Label className="text-[12px] font-black text-ink">偏好关键词</Label>` |
| L6079 | `{['新手友好', '低维护', '群游', '清洁工具', '草缸友好'].map(keyword => (` |
| L6096 | `placeholder="例如：想要低维护、颜色明显、适合新手"` |
| L6102 | `推荐前建议先补充：{smartRecommendation.infoRequests.join('、')}。` |
| L6108 | `<div className="text-sm font-black text-ink">空缸组合方案</div>` |
| L6122 | `<div className="mt-3 text-[11px] font-bold text-ink/50">预计负载 {plan.estimatedLoadRate}% · 维护 {plan.maintenanceLevel}</div>` |
| L6132 | `加入模拟鱼缸` |
| L6143 | `{ title: '可以直接加入', items: visibleSmartDirect, tone: 'text-emerald-700 bg-emerald-50 border-emerald-100' },` |
| L6144 | `{ title: '调整后可以加入', items: visibleSmartAdjustable, tone: 'text-amber-700 bg-amber-50 border-amber-100' },` |
| L6145 | `{ title: '不建议加入', items: visibleSmartBlocked, tone: 'text-rose-700 bg-rose-50 border-rose-100' },` |
| L6150 | `<span className="text-[11px] font-black text-ink/38">{group.items.length} 个</span>` |
| L6154 | `暂无候选。` |
| L6175 | `{candidate.status === 'direct' ? '可加入' : candidate.status === 'adjustable' ? '需调整' : '不建议'}` |
| L6178 | `<span className="mt-1 block text-[11px] font-bold text-ink/52">建议 x{candidate.recommendedQuantity} · 适配 {candidate.fitScore}</span>` |
| L6206 | `<div className="text-sm font-black text-ink">模拟添加：{smartSimulation.candidate.name}</div>` |
| L6217 | `<div className="text-[10px] font-black text-ink/38">添加前负载</div>` |
| L6221 | `<div className="text-[10px] font-black text-ink/38">添加后负载</div>` |
| L6225 | `<div className="text-[10px] font-black text-ink/38">设备支持</div>` |
| L6226 | `<div className="text-sm font-black text-ink">{smartSimulation.equipmentStillFits ? '仍满足' : '需确认'}</div>` |
| L6242 | `取消模拟` |
| L6245 | `确认加入当前鱼缸` |
| L6250 | `关闭` |
| L6266 | `<DialogTitle className="text-xl font-black text-ink">换水记录</DialogTitle>` |
| L6268 | `记录换水日期，系统会据此更新下次提醒。` |
| L6276 | `<div className="text-[10px] font-black text-ink/42">最近换水</div>` |
| L6277 | `<div className="mt-1 text-[12px] font-black text-ink">{latestWaterChangeDate ? format(new Date(latestWaterChangeDate), 'yyyy/MM/dd') : '暂无记录'}</div>` |
| L6280 | `<div className="text-[10px] font-black text-ink/42">下次建议</div>` |
| L6284 | `<div className="text-[10px] font-black text-ink/42">周期</div>` |
| L6285 | `<div className="mt-1 text-[12px] font-black text-ink">约 {shortestCycle} 天</div>` |
| L6288 | `<div className="text-[10px] font-black opacity-60">今日状态</div>` |
| L6289 | `<div className="mt-1 text-[12px] font-black">{waterChangedToday ? '今天已记录' : '今天未记录'}</div>` |
| L6305 | `<div className="text-sm font-black text-ink">{format(calendarMonth, 'yyyy年 MM月')}</div>` |
| L6307 | `回到今天` |
| L6315 | `点击日期先选中，再用底部按钮记录或取消该日换水。` |
| L6318 | `{['日', '一', '二', '三', '四', '五', '六'].map(d => (` |
| L6359 | `{selectedWaterDateHasRecord ? '关闭' : '取消'}` |
| L6367 | `? `已取消 ${format(new Date(selectedWaterChangeDate), 'yyyy/MM/dd')} 的换水记录。`` |
| L6368 | `: `已记录换水，下次建议约 ${shortestCycle} 天后。`` |
| L6372 | `{selectedWaterDateHasRecord ? '取消这天记录' : '记录这天换水'}` |
| L6384 | `鱼缸搭建方案` |
| L6387 | `方案会先根据当前鱼缸水量、长度、已有生物和设备生成安全适配版，再允许应用。` |
| L6394 | `{['新手', '草缸', '虾缸', '低维护', '进阶'].map(filter => (` |
| L6403 | `<div className="text-[13px] font-black text-ink">先选择方案名称</div>` |
| L6404 | `<p className="mt-0.5 text-[11px] font-medium text-ink/45">选中方案后，下方会展示这个鱼缸的图片、尺寸、环境、造景和生物组合。</p>` |
| L6424 | `当前 {plan.currentVolumeLiters}L / {plan.currentLengthCm \|\| '未设长度'}cm · 要求 {template.minVolumeLiters}L+ / {template.minLengthCm}cm+` |
| L6434 | `{isSelected && <span className="rounded-full bg-emerald-700 px-2 py-0.5 text-[10px] font-black text-white">已选</span>}` |
| L6465 | `<TagPill tone={selectedBuildTemplate.difficulty === '新手' ? 'normal' : 'warning'}>{selectedBuildTemplate.difficulty}</TagPill>` |
| L6471 | `{ label: '适配状态', value: selectedAdaptedBuildPlan.statusLabel },` |
| L6472 | `{ label: '当前鱼缸', value: `${selectedAdaptedBuildPlan.currentVolumeLiters}L · ${selectedAdaptedBuildPlan.currentLengthCm \|\| '长度未设置'}cm` },` |
| L6473 | `{ label: '环境参数', value: getTemplateEnvironmentSummary(selectedBuildTemplate) },` |
| L6474 | `{ label: '适配生物', value: selectedAdaptedBuildPlan.livestockSummary },` |
| L6486 | `<h3 className="text-[14px] font-black text-ink">A. 当前鱼缸适配结果</h3>` |
| L6491 | `{ title: '最低要求', value: `${selectedBuildTemplate.minVolumeLiters}L+ · ${selectedBuildTemplate.minLengthCm}cm+` },` |
| L6492 | `{ title: '推荐水量', value: `${selectedBuildTemplate.recommendedVolumeLiters}L` },` |
| L6493 | `{ title: '自动修正', value: selectedAdaptedBuildPlan.autoFixes.join(' ') \|\| '当前无需额外缩减。' },` |
| L6494 | `{ title: '应用前风险', value: selectedAdaptedBuildPlan.riskItems.join(' ') \|\| '适配方案未发现高风险。' },` |
| L6506 | `<h3 className="text-[14px] font-black text-ink">B. 综合方案摘要</h3>` |
| L6507 | `<p className="mt-0.5 text-[11px] font-medium text-ink/50">这里展示会真正应用到当前鱼缸的适配结果。</p>` |
| L6511 | `{ title: '基础配置', value: selectedAdaptedBuildPlan.coreConfigSummary },` |
| L6512 | `{ title: '水体环境', value: getTemplateEnvironmentSummary(selectedBuildTemplate) },` |
| L6513 | `{ title: '造景结构', value: getTemplateLayoutSummary(selectedBuildTemplate) },` |
| L6514 | `{ title: '推荐生物', value: selectedAdaptedBuildPlan.livestockSummary },` |
| L6527 | `C. 配置明细` |
| L6528 | `<span className="ml-2 text-[11px] font-bold text-ink/45">点击展开</span>` |
| L6530 | `<p className="mt-1 text-[11px] font-medium text-ink/50">需要确认或微调时，再看具体底砂、水草、硬景、设备和维护提醒。</p>` |
| L6533 | `{ title: '底砂', items: [selectedBuildTemplate.baseSubstrate] },` |
| L6534 | `{ title: '水草', items: selectedBuildTemplate.basePlants },` |
| L6535 | `{ title: '硬景', items: selectedBuildTemplate.baseHardscape },` |
| L6536 | `{ title: '设备', items: selectedBuildTemplate.baseEquipment },` |
| L6537 | `{ title: '生物推荐', items: selectedAdaptedBuildPlan.appliedSpecies.length > 0 ? selectedAdaptedBuildPlan.appliedSpecies.map(item => `${item.name} ${item.quantity}`) : ['当前适配方案暂不新增生物'] },` |
| L6538 | `{ title: '维护提醒', items: selectedBuildTemplate.maintenance },` |
| L6554 | `<span className="font-black">主要提醒：</span>{selectedBuildTemplate.caution}` |
| L6561 | `<Button variant="outline" onClick={() => setIsBuildPlanOpen(false)} className="h-10 rounded-full text-sm font-bold">暂不应用</Button>` |
| L6583 | `<DialogTitle className="text-xl font-black text-ink">鱼缸设置</DialogTitle>` |
| L6585 | `调整尺寸、水质、设备与环境配置` |
| L6589 | `settingsForm.waterType === 'Saltwater' ? '海水' : '淡水',` |
| L6591 | `settingsEstimatedWaterLiters > 0 ? `约 ${settingsEstimatedWaterLiters}L` : '水量未设置',` |
| L6592 | ``已配置 ${configuredSettingCount} 项`,` |
| L6620 | `{item.configured ? '已配置' : '待配置'}` |
| L6626 | `修改` |
| L6770 | `option.value === '无' ? 'border-dashed border-ink/30 bg-white' :` |
| L6771 | `option.value === '水草泥' \|\| option.value === '黑金沙' ? 'border-stone-700 bg-stone-800' :` |
| L6772 | `option.value === '溪流砂' \|\| option.value === '碎石' \|\| option.value === '鹅卵石' ? 'border-stone-400 bg-stone-300' :` |
| L6773 | `option.value === '珊瑚砂' \|\| option.value === '化妆砂' ? 'border-amber-100 bg-amber-50' :` |
| L6774 | `option.value === '陶粒' ? 'border-orange-600 bg-orange-500' :` |
| L6796 | `查看全部 {hiddenScapeCount + visibleScapeOptions.length} 个底砂/硬景` |
| L6806 | `<div className="text-[13px] font-black text-ink">水草种类</div>` |
| L6807 | `<div className="mt-0.5 text-[10px] font-medium text-ink/42">已选和常用水草</div>` |
| L6809 | `<span className="rounded-full bg-white px-2 py-1 text-[10px] font-bold text-ink/42">已选 {selectedPlantCount}</span>` |
| L6837 | `查看全部 {hiddenPlantCount + visiblePlantOptions.length} 种水草` |
| L6853 | `t(`aquarium.${filterOptionKeys[settingsForm.equipment?.filter \|\| '瀑布过滤'] \|\| 'filterCascade'}`),` |
| L6854 | `t(`aquarium.${lightOptionKeys[settingsForm.equipment?.light \|\| '普通灯'] \|\| 'lightNormal'}`),` |
| L6873 | `{['无', '瀑布过滤', '桶滤', '上滤', '海绵过滤'].map(option => (` |
| L6877 | `selected={(settingsForm.equipment?.filter \|\| '瀑布过滤') === option}` |
| L6894 | `{['无', '普通灯', '水草灯', '海水灯'].map(option => (` |
| L6898 | `selected={(settingsForm.equipment?.light \|\| '普通灯') === option}` |
| L6947 | `{ label: '水体', value: settingsForm.waterType === 'Saltwater' ? '海水' : '淡水' },` |
| L6948 | `{ label: '温度', value: `${settingsForm.targetTemperature \|\| 25}°C` },` |
| L6949 | `{ label: '水量', value: settingsEstimatedWaterLiters > 0 ? `约 ${settingsEstimatedWaterLiters}L` : '未设置' },` |
| L6950 | `{ label: '底砂', value: currentSubstrate },` |
| L6951 | `{ label: '过滤', value: settingsForm.equipment?.filter \|\| '瀑布过滤' },` |
| L6952 | `{ label: '灯光', value: settingsForm.equipment?.light \|\| '普通灯' },` |
| L6954 | `note={`${(settingsForm.plants \|\| []).length} 种水草，${(settingsForm.hardscape \|\| []).length} 个硬景配置会一起保存。`}` |
| L6960 | `<Button variant="outline" onClick={() => setIsSettingsOpen(false)} className="h-10 min-w-[112px] rounded-full text-sm font-bold">取消</Button>` |
| L6965 | `}} className="h-10 min-w-[128px] rounded-full bg-accent text-sm font-bold text-white hover:bg-accent/90">保存设置</Button>` |
| L6976 | `换水与囤水提示` |
| L6993 | `囤水 → 除氯 → 对温 → 少量换水` |
| L6997 | `<h4 className="text-sm font-bold text-blue-800 mb-1 flex items-center gap-1"><Info className="w-4 h-4 text-blue-600" /> 囤水小贴士</h4>` |
| L6998 | `<p className="text-xs text-blue-900/80 leading-relaxed font-medium">换水前建议提前 24 小时囤水，除氯并调到接近缸内水温后再换。冬季或温差较大时，优先保证新水温度稳定。</p>` |
| L7001 | `<h4 className="text-sm font-bold text-ink mb-1 flex items-center gap-1"><Info className="w-4 h-4 text-accent" /> 新鱼入缸换水方法</h4>` |
| L7002 | `<p className="text-xs text-ink/80 leading-relaxed font-medium">新鱼入缸前需严格过温过水。建议入缸后前三天不喂食、不换水，保持水质稳定，减少应激。第四天可进行第一次少量换水（约10%）。</p>` |
| L7005 | `<h4 className="text-sm font-bold text-ink mb-1 flex items-center gap-1"><Info className="w-4 h-4 text-accent" /> 周期换水方法</h4>` |
| L7006 | `<p className="text-xs text-ink/80 leading-relaxed font-medium">根据过滤系统能力和生物密度，建议每周或每两周换水 20%-30%。切忌一次性全缸换水，以免破坏硝化系统。</p>` |
| L7009 | `<h4 className="text-sm font-bold text-ink mb-1 flex items-center gap-1"><Info className="w-4 h-4 text-accent" /> 温度控制</h4>` |
| L7010 | `<p className="text-xs text-ink/80 leading-relaxed font-medium">换水时，新水温度应与缸内水温尽量保持一致，温差不应超过 1-2°C。冬季换水建议提前加热新水。</p>` |
| L7014 | `<Button className="rounded-sm bg-ink text-white font-bold w-full" onClick={() => setIsGuideOpen(false)}>我知道了</Button>` |
| L7039 | `selectedDiscoveryFish.difficulty === 'Easy' ? '新手友好' : getDifficultyLabel(selectedDiscoveryFish.difficulty),` |
| L7041 | `needsHeaterForSpecies(selectedDiscoveryFish) ? '需加热' : selectedDiscoveryFish.housingMode,` |
| L7043 | `<TagPill key={tag} tone={tag === '需加热' ? 'warning' : 'normal'}>{tag}</TagPill>` |
| L7053 | `['水温', selectedDiscoveryFish.waterTemperature],` |
| L7055 | `['最小缸体', selectedDiscoveryFish.tankSize],` |
| L7056 | `['性情', selectedDiscoveryFish.temperament === 'Peaceful' ? '温和' : selectedDiscoveryFish.temperament === 'Aggressive' ? '凶猛' : '领地意识强'],` |
| L7066 | `<div className="text-xs font-black text-emerald-800">适合谁</div>` |
| L7072 | `<div className="text-xs font-black text-amber-800">加入前注意</div>` |
| L7085 | `{wishlistFishIds.has(selectedDiscoveryFish.id) ? '已种草' : '加入种草'}` |
| L7100 | `添加到鱼缸` |
| L7131 | `setTankActionMessage(selectedAddFishItems.some(item => item.fishId === fish.id) ? `已撤回 ${fish.name} 的混养计算选择。` : `已选择 ${fish.name} 参与混养计算。`);` |
| L7187 | `<span className="text-ink/60 uppercase tracking-wider text-[10px] font-bold">水温</span>` |
| L7191 | `<span className="text-ink/60 uppercase tracking-wider text-[10px] font-bold">酸碱度 (pH)</span>` |
| L7195 | `<span className="text-ink/60 uppercase tracking-wider text-[10px] font-bold">换水周期</span>` |
| L7196 | `<span className="text-ink font-bold">约 {selectedAqFish.fish.waterChangeCycle} 天</span>` |
| L7199 | `<span className="text-ink/60 uppercase tracking-wider text-[10px] font-bold">鱼缸尺寸</span>` |
| L7203 | `<span className="text-ink/60 uppercase tracking-wider text-[10px] font-bold">性情</span>` |
| L7204 | `<span className="text-ink font-bold">{selectedAqFish.fish.temperament === 'Peaceful' ? '温和' : selectedAqFish.fish.temperament === 'Aggressive' ? '凶猛' : '领地意识强'}</span>` |
| L7207 | `<span className="text-ink/60 uppercase tracking-wider text-[10px] font-bold">体型</span>` |
| L7208 | `<span className="text-ink font-bold">{selectedAqFish.fish.size === 'Small' ? '小型' : selectedAqFish.fish.size === 'Medium' ? '中型' : '大型'}</span>` |
| L7214 | `<h4 className="text-[11px] uppercase tracking-[1px] text-amber-800 font-bold">饮食习惯</h4>` |
| L7216 | `{selectedAqFish.fish.feedingProfile?.feedingType \|\| '杂食性'}` |
| L7221 | `<div className="text-[10px] uppercase tracking-wider text-ink/55 font-bold mb-1">推荐食物</div>` |
| L7226 | `<div className="text-[10px] uppercase tracking-wider text-ink/55 font-bold mb-1">喂食频率</div>` |
| L7227 | `<p className="font-medium leading-relaxed">{selectedAqFish.fish.feedingProfile?.feedingFrequency \|\| '每天1-2次'}</p>` |
| L7230 | `<div className="text-[10px] uppercase tracking-wider text-ink/55 font-bold mb-1">投喂量</div>` |
| L7231 | `<p className="font-medium leading-relaxed">{selectedAqFish.fish.feedingProfile?.portionRule \|\| '2-3分钟内吃完，残饵及时清理'}</p>` |
| L7235 | `<div className="text-[10px] uppercase tracking-wider text-ink/55 font-bold mb-1">禁忌</div>` |
| L7236 | `<p className="font-medium leading-relaxed">{selectedAqFish.fish.feedingProfile?.avoidFoods \|\| '过量投喂；变质饲料；长期残饵'}</p>` |
| L7240 | `<div className="text-[10px] uppercase tracking-wider text-ink/55 font-bold mb-1">特殊提醒</div>` |
| L7248 | `<h4 className="text-[11px] uppercase tracking-[1px] text-ink/60 font-bold">入缸管理</h4>` |
| L7251 | `<Label className="text-[10px] text-ink/60 font-bold mb-1 block">入缸日期</Label>` |
| L7261 | `<Label className="text-[10px] text-ink/60 font-bold mb-1 block">数量 (条/只)</Label>` |
| L7272 | `<span>已入缸时间:</span>` |
| L7273 | `<span className="font-serif text-lg">{differenceInDays(new Date(), new Date(selectedAqFish.aqFish.entryDate))} 天</span>` |
| L7284 | `<Trash2 className="w-4 h-4 mr-2" /> 移出鱼缸` |
| L7293 | `关闭` |
| L7307 | `<DialogTitle className="text-xl font-bold font-serif">鱼缸风险提示</DialogTitle>` |
| L7311 | `? '基础搭建方案已记录，当前提示会优先区分是推荐配置本身，还是后续加入的生物数量或组合带来的风险。'` |
| L7312 | `: '当前提示按容量、水质参数和混养组合分组展示。'}` |
| L7320 | `基础搭建方案：{(activeAquarium as Aquarium & { buildTemplateMeta?: { name: string } }).buildTemplateMeta?.name}` |
| L7323 | `基础配置本身不等于风险；如果出现容量或混养提示，通常来自当前动物数量、后续加入生物或组合超出建议范围。` |
| L7342 | `下一步：{item.nextStep}` |
| L7352 | `title="选择鱼缸内容分类"` |
| L7353 | `subtitle="切换查看鱼类、虾螺、水草、底砂和造景。"` |
| L7356 | `title: '缸内内容',` |
| L7364 | `setDraftTankArchiveCategory('全部');` |
| L7365 | `setTankArchiveCategory('全部');` |

---

## Identify.tsx (Total lines: 603)

Found **17** lines with Chinese characters:

| Line | Code snippet |
|---|---|
| L37 | `if (!dimensions) return isEn ? 'Not filled' : '未填写';` |
| L39 | `return Number.isFinite(liters) && liters > 0 ? (isEn ? `~${Math.round(liters)}L` : `约 ${Math.round(liters)}L`) : (isEn ? 'Not filled' : '未填写');` |
| L46 | `waterType: aquarium?.waterType \|\| (isEn ? 'No aquarium selected' : '未选择鱼缸'),` |
| L47 | `temperature: aquarium?.targetTemperature ? `${aquarium.targetTemperature}°C` : (isEn ? 'Not filled' : '未填写'),` |
| L52 | `}).join(isEn ? ', ' : '、') \|\| (isEn ? 'Empty or no aquarium selected' : '空缸或未选择鱼缸'),` |
| L53 | `recentWaterChange: aquarium?.lastWaterChangeDate \|\| (isEn ? 'No record' : '未记录'),` |
| L54 | `recentFeeding: isEn ? 'No record' : '未记录',` |
| L58 | `}) ? (isEn ? 'New stocking in last 7 days' : '近 7 天有新生物入缸') : (isEn ? 'No stocking in last 7 days' : '未发现近 7 天新增记录'),` |
| L61 | `? [aquarium.equipment.filter && isEn ? `Filter:${aquarium.equipment.filter}` : `过滤:${aquarium.equipment.filter}`, aquarium.equipment.oxygen ? (isEn ? 'Aeration:Yes' : '增氧:有') : (isEn ? 'Aeration:No record' : '增氧:未记录'), aquarium.equipment.heater ? (isEn ? 'Heater:Yes' : '加热:有') : (isEn ? 'Heater:No record' : '加热:未记录')].filter(Boolean).join('；')` |
| L282 | `: i18n.language === 'en' ? 'Health assessment only supports fish currently; you can still view species info.' : '状态判断第一版仅支持鱼类；你仍可查看该物种资料。', 'error');` |
| L378 | `water_fit: { zh: '水体', en: 'Water type', values: { match: { zh: '匹配', en: 'Matched', status: 'compatible' }, mismatch: { zh: '不匹配', en: 'Mismatch', status: 'caution' }, unknown: { zh: '未填写', en: 'Unknown', status: 'insufficient_data' } } },` |
| L379 | `temperature_fit: { zh: '温度', en: 'Temperature', values: { within: { zh: '在范围内', en: 'In range', status: 'compatible' }, outside: { zh: '超出范围', en: 'Out of range', status: 'caution' }, unknown: { zh: '未填写', en: 'Unknown', status: 'insufficient_data' } } },` |
| L380 | `space_fit: { zh: '空间', en: 'Tank space', values: { sufficient: { zh: '空间足够', en: 'Sufficient', status: 'compatible' }, insufficient: { zh: '空间不足', en: 'Insufficient', status: 'caution' }, unknown: { zh: '未填写', en: 'Unknown', status: 'insufficient_data' } } },` |
| L381 | `filter_status: { zh: '过滤', en: 'Filter', values: { present: { zh: '已配置', en: 'Present', status: 'compatible' }, missing: { zh: '未配置', en: 'Missing', status: 'caution' }, unknown: { zh: '未填写', en: 'Unknown', status: 'insufficient_data' } } },` |
| L382 | `oxygen_status: { zh: '增氧', en: 'Aeration', values: { present: { zh: '已配置', en: 'Present', status: 'compatible' }, missing: { zh: '未配置', en: 'Missing', status: 'caution' }, unknown: { zh: '未填写', en: 'Unknown', status: 'insufficient_data' } } },` |
| L409 | `? { label: i18n.language === 'en' ? 'Follow emergency steps' : isEn ? 'Execute Emergency Steps' : '执行应急步骤', actionType: 'section' }` |
| L585 | `<div className="grid gap-3 md:grid-cols-3">{diagnosis.hypotheses.map(hypothesis => <article key={hypothesis.code} className="rounded-[18px] border border-border bg-white p-4"><span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-black ${hypothesis.likelihood === 'more_likely' ? 'bg-red-50 text-red-700' : hypothesis.likelihood === 'possible' ? 'bg-amber-50 text-amber-700' : 'bg-sky-50 text-sky-700'}`}>{t(`identify.likelihood.${hypothesis.likelihood}`)}</span><h3 className="mt-2 text-sm font-black">{hypothesis.label}</h3><p className="mt-2 text-[11px] font-bold leading-5 text-ink/55">{hypothesis.supportingEvidence[0] \|\| t('identify.needMoreEvidence')}</p><details className="mt-3 rounded-[12px] border border-border bg-bg p-3"><summary className="cursor-pointer text-[10px] font-black text-emerald-800">{i18n.language === 'en' ? 'View evidence and actions' : isEn ? 'View Evidence and Actions' : '展开证据与建议'}</summary><div className="mt-3 grid gap-3 text-[10px] leading-5 text-ink/60"><div><strong className="text-ink">{t('identify.supportingEvidence')}</strong>{hypothesis.supportingEvidence.map(item => <p key={item}>{item}</p>)}</div>{hypothesis.contradictingEvidence.length > 0 && <div><strong className="text-ink">{i18n.language === 'en' ? 'Contradicting evidence' : isEn ? 'Contradicting evidence' : '不一致的事实'}</strong>{hypothesis.contradictingEvidence.map(item => <p key={item}>{item}</p>)}</div>}<div><strong className="text-ink">{t('identify.missingEvidence')}</strong>{hypothesis.missingEvidence.length > 0 ? hypothesis.missingEvidence.map(item => <p key={item}>{item}</p>) : <p>{i18n.language === 'en' ? 'No key evidence is currently missing.' : isEn ? 'No key evidence is currently missing.' : '当前没有缺失的关键项。'}</p>}</div><div><strong className="text-ink">{i18n.language === 'en' ? 'Recommended actions' : isEn ? 'Recommended actions' : '建议动作'}</strong>{hypothesis.recommendedActions.map(item => <p key={item}>{item}</p>)}</div><div><strong className="text-ink">{t('identify.avoidActions')}</strong>{hypothesis.avoidActions.map(item => <p key={item}>{item}</p>)}</div></div></details></article>)}</div>` |

---

## Collection.tsx (Total lines: 419)

Found **39** lines with Chinese characters:

| Line | Code snippet |
|---|---|
| L66 | `{ id: 'wishlist' as CollectionModule, label: isEn ? 'Species Wishlist' : '种草图鉴', shortLabel: isEn ? 'Wishlist' : '种草', icon: Heart },` |
| L67 | `{ id: 'care' as CollectionModule, label: isEn ? 'Care Collection' : '养护收藏', shortLabel: isEn ? 'Care' : '养护', icon: BookOpenCheck },` |
| L68 | `{ id: 'memorial' as CollectionModule, label: isEn ? 'Life Memorial' : '生命纪念', shortLabel: isEn ? 'Memorial' : '纪念', icon: Skull },` |
| L69 | `{ id: 'achievements' as CollectionModule, label: isEn ? 'Achievements & Badges' : '成就勋章', shortLabel: isEn ? 'Badges' : '勋章', icon: Medal },` |
| L92 | `if (newlyUnlocked) showToast(isEn ? `Unlocked Badge: ${newlyUnlocked.title}` : `解锁勋章：${newlyUnlocked.title}`);` |
| L127 | `showToast(isEn ? 'Failed to remove, check storage permissions' : '移除失败，请检查浏览器存储权限', 'error');` |
| L131 | `showToast(isEn ? 'Removed from species wishlist' : '已从种草图鉴移除');` |
| L138 | `showToast(isEn ? 'Failed to remove, check storage permissions' : '移除失败，请检查浏览器存储权限', 'error');` |
| L142 | `showToast(isEn ? 'Removed from care collection' : '已从养护收藏移除');` |
| L152 | `const text = `${topic.title}｜AquaGuide 养护百科`;` |
| L156 | `showToast(i18n.language === 'en' ? (navigator.share ? 'Share panel opened' : 'Share content copied to clipboard') : (navigator.share ? '已打开分享' : '已复制分享内容'));` |
| L159 | `showToast(i18n.language === 'en' ? 'Share failed, please try again later' : '分享失败，请稍后重试', 'error');` |
| L183 | `<BookHeart className="h-3.5 w-3.5" /> {i18n.language === 'en' ? 'My Aquaria' : '自然水族册'}` |
| L187 | `{i18n.language === 'en' ? 'Back to Collection' : '返回水族册首页'}` |
| L194 | `<div className="mt-5 inline-flex rounded-full bg-white/75 px-3 py-1.5 text-[11px] font-black text-ink/55 shadow-sm">{i18n.language === 'en' ? `Total ${snapshot.counts[activeTab]} item(s)` : `共 ${snapshot.counts[activeTab]} 项`}</div>` |
| L208 | `<span className="mt-1 block truncate text-[10px] font-bold text-ink/42">{fish.category} · {fish.difficulty === 'Easy' ? (i18n.language === 'en' ? 'Beginner' : '新手适宜') : fish.difficulty === 'Medium' ? (i18n.language === 'en' ? 'Intermediate' : '进阶') : (i18n.language === 'en' ? 'Expert' : '高难度')}</span>` |
| L214 | `<HeartOff className="mr-1.5 h-3.5 w-3.5" />{i18n.language === 'en' ? 'Remove Saved' : '移除种草'}` |
| L219 | `) : renderEmpty(Heart, i18n.language === 'en' ? 'No Saved Species Yet' : '还没有种草生物', i18n.language === 'en' ? 'Add species you like to your favorites in the Encyclopedia, and they will show up here.' : '在图鉴中收藏想进一步了解的生物，它会出现在这里。', { label: i18n.language === 'en' ? 'Browse Encyclopedia' : '浏览图鉴', route: '/encyclopedia' }))}` |
| L236 | `<HeartOff className="mr-1.5 h-3.5 w-3.5" />{i18n.language === 'en' ? 'Remove Saved' : '移除收藏'}` |
| L241 | `) : renderEmpty(BookOpenCheck, i18n.language === 'en' ? 'No Saved Care Guides' : '还没有养护收藏', i18n.language === 'en' ? 'Save frequently used care guidelines from the Care Guide page, and they will appear here.' : '把常用的处理步骤收藏起来，出现问题时可以更快找到。', { label: i18n.language === 'en' ? 'Search Care Guide' : '查养护百科', route: '/care' }))}` |
| L259 | `<span className="block truncate text-[14px] font-black text-ink">{fish?.name \|\| (i18n.language === 'en' ? 'Unrecognized Species' : '未匹配生物')}</span>` |
| L261 | `<span className="mt-1 block truncate text-[10px] font-medium text-ink/38">{record.reason \|\| (i18n.language === 'en' ? 'No reflection reason provided' : '尚未填写复盘原因')}</span>` |
| L268 | `) : renderEmpty(Skull, i18n.language === 'en' ? 'No Memorials Logged' : '还没有生命纪念', i18n.language === 'en' ? 'When you log a livestock death or removal from its details page, its timeline and reflection info will be preserved here.' : '在物种详情中记录离缸或死亡后，这里会保留时间与复盘信息。', { label: i18n.language === 'en' ? 'Back to Aquarium' : '返回我的鱼缸', route: '/aquarium' }))}` |
| L276 | `<h2 className="text-[15px] font-black text-ink">{i18n.language === 'en' ? 'Badges unlock automatically' : '勋章会自动解锁，无需领取'}</h2>` |
| L277 | `<p className="mt-1 text-[12px] font-medium leading-relaxed text-ink/58">{i18n.language === 'en' ? 'Calculated based on your active tank setups, logs, saves, and memorials. Badges update automatically.' : '系统根据已有鱼缸、巡检、换水、收藏和复盘记录计算。完成记录后，这里会自动更新。'}</p>` |
| L294 | `<span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${status === 'unlocked' ? 'border-amber-300 bg-amber-100 text-amber-900' : status === 'in_progress' ? 'border-emerald-200 bg-white text-emerald-800' : 'border-slate-200 bg-slate-100 text-slate-600'}`}>{status === 'unlocked' ? (i18n.language === 'en' ? 'Unlocked' : '已解锁') : status === 'in_progress' ? (i18n.language === 'en' ? 'In Progress' : '进行中') : (i18n.language === 'en' ? 'Not Started' : '未开始')}</span>` |
| L297 | `<p className="mt-1 text-[11px] font-bold leading-[18px] text-ink/48">{achievement.unlocked ? (i18n.language === 'en' ? `Completed: ${achievement.description}` : `已完成：${achievement.description}`) : (i18n.language === 'en' ? `Target: ${achievement.description}` : `目标：${achievement.description}`)}</p>` |
| L299 | `<div className="flex items-center justify-between gap-3 text-[11px] font-black text-ink/58"><span>{i18n.language === 'en' ? 'Current' : '当前'} {achievement.current}</span><span>{i18n.language === 'en' ? 'Target' : '目标'} {achievement.target}</span></div>` |
| L301 | `<p className="mt-2 text-[11px] font-black text-ink/62">{achievement.unlocked ? (i18n.language === 'en' ? 'Goal Completed' : '目标已完成') : (i18n.language === 'en' ? `${remaining} remaining` : `还差 ${remaining}`)}</p>` |
| L305 | `{i18n.language === 'en' ? 'Next step: ' : '下一步：'}{achievement.nextAction.label}` |
| L319 | `加载更多` |
| L377 | `<DialogTitle className="text-[22px] font-black">{fish?.name \|\| '生命纪念'}</DialogTitle>` |
| L381 | `<div className="text-[11px] font-black text-ink/40">复盘记录</div>` |
| L382 | `<p className="mt-2 text-[14px] font-bold leading-6 text-ink/68">{selectedMemorial.reason \|\| '这条记录还没有填写原因。后续新增生命纪念时，可以补充观察到的情况，帮助回顾养护过程。'}</p>` |
| L390 | `再次加入` |
| L402 | `<DialogHeader><DialogTitle>移除这条种草？</DialogTitle><DialogDescription>“{pendingFishRemoval?.name}”会从水族册移除，之后仍可在图鉴重新收藏。</DialogDescription></DialogHeader>` |
| L403 | `<DialogFooter className="grid grid-cols-2 gap-2"><Button variant="outline" onClick={() => setPendingFishRemoval(null)}>取消</Button><Button variant="destructive" onClick={removeFishFavorite}>确认移除</Button></DialogFooter>` |
| L409 | `<DialogHeader><DialogTitle>移除这篇收藏？</DialogTitle><DialogDescription>“{pendingCareRemoval?.title}”会从水族册移除，之后仍可重新收藏。</DialogDescription></DialogHeader>` |
| L410 | `<DialogFooter className="grid grid-cols-2 gap-2"><Button variant="outline" onClick={() => setPendingCareRemoval(null)}>取消</Button><Button variant="destructive" onClick={removeCareFavorite}>确认移除</Button></DialogFooter>` |

---

## Encyclopedia.tsx (Total lines: 2637)

Found **159** lines with Chinese characters:

| Line | Code snippet |
|---|---|
| L77 | `{ id: 'Easy', label: '新手适宜' },` |
| L78 | `{ id: 'Medium', label: '进阶挑战' },` |
| L79 | `{ id: 'Hard', label: '骨灰级玩家' }` |
| L83 | `{ id: 'Coldwater', label: '冷水', hint: '低温/不用加热' },` |
| L84 | `{ id: 'Tropical', label: '热带', hint: '多数需加热' },` |
| L85 | `{ id: 'BroadRange', label: '广温', hint: '适应范围较宽' },` |
| L89 | `{ id: 'Small', label: '小型', hint: '小缸/群游' },` |
| L90 | `{ id: 'Medium', label: '中型', hint: '中等缸位' },` |
| L91 | `{ id: 'Large', label: '大型', hint: '大缸/慎混' },` |
| L95 | `{ id: 'Peaceful', label: '温和', hint: '性格稳定' },` |
| L96 | `{ id: 'Territorial', label: '领地', hint: '注意躲避' },` |
| L97 | `{ id: 'Aggressive', label: '凶猛', hint: '高风险' },` |
| L100 | `const housingModes: Array<NonNullable<Fish['housingMode']>> = ['适合混养', '谨慎混养', '建议单养'];` |
| L103 | `{ id: 'freshwaterFish', label: '淡水鱼', hint: '草缸/冷水/热带鱼' },` |
| L104 | `{ id: 'saltwaterFish', label: '海水鱼', hint: '海缸观赏鱼' },` |
| L105 | `{ id: 'invertebrate', label: '虾螺蟹', hint: '工具生物' },` |
| L106 | `{ id: 'reptile', label: '龟 / 两栖', hint: '单养优先' },` |
| L107 | `{ id: 'coral', label: '珊瑚 / 海葵', hint: '海水无脊椎' },` |
| L108 | `{ id: 'plant', label: '水草', hint: '前景/中景/浮草' },` |
| L193 | `: (temperament === 'Peaceful' ? '温和' : temperament === 'Aggressive' ? '凶猛' : '领地意识强')` |
| L197 | `size === 'Small' ? '小型' : size === 'Medium' ? '中型' : '大型'` |
| L229 | `return '匹配';` |
| L231 | `return '需调整';` |
| L233 | `return '风险';` |
| L235 | `return '信息不足';` |
| L241 | `if (fish.name.includes('红莲灯') \|\| fish.name.includes('灯')) return '建议成群饲养，状态更稳定。';` |
| L242 | `if (fish.housingMode === '谨慎混养') return '加入前建议先做混养计算。';` |
| L243 | `if (fish.housingMode === '建议单养') return '更适合作为单独规划的主题生物。';` |
| L244 | `if (tools.includes('除藻') && getLifeType(fish) === 'invertebrate') return '避免含铜药剂，保持水质稳定。';` |
| L245 | `if (fish.difficulty === 'Hard') return '对水质和环境稳定性要求较高。';` |
| L255 | `if (!functionTag \|\| functionTag === '全部') return true;` |
| L256 | `if (functionTag === '适合当前鱼缸') {` |
| L260 | `if (functionTag === '清洁工具') {` |
| L261 | `return tags.functionTags.includes('清洁工具') \|\| tags.functionTags.includes('工具生物') \|\| tags.functionTags.includes('除藻') \|\| tags.functionTags.includes('清残饵');` |
| L278 | `if (normalized === '草') {` |
| L280 | `\|\| category.includes('水草')` |
| L282 | `\|\| name.includes('草')` |
| L283 | `\|\| originalName.includes('草')` |
| L284 | `\|\| aliases.some(alias => alias.includes('草'));` |
| L314 | `const isPlant = getLifeType(fish) === 'plant' \|\| category.includes('水草') \|\| category === 'plant';` |
| L316 | `if (normalized === '草') {` |
| L317 | `if (isPlant && (name.includes('草') \|\| originalName.includes('草'))) return 0;` |
| L319 | `if (name.includes('草') \|\| originalName.includes('草')) return 2;` |
| L320 | `if (aliases.some(alias => alias.includes('草'))) return 3;` |
| L333 | `!environment \|\| environment === '全部' \|\| getSpeciesFilterTags(fish).environmentTags.includes(environment)` |
| L350 | `if (filters.functionTag === '适合当前鱼缸') {` |
| L366 | `fish.difficulty === 'Easy' ? '新手' : '有一定经验的玩家',` |
| L367 | `fish.size === 'Small' ? '小型缸或草缸' : fish.size === 'Medium' ? '中型鱼缸' : '大缸',` |
| L371 | `fish.housingMode === '建议单养' ? '混养缸' : null,` |
| L372 | `fish.temperament !== 'Peaceful' ? '长鳍慢游鱼' : null,` |
| L373 | `getFishTemperatureTheme(fish.waterTemperature).needsHeater ? '无加热设备的低温缸' : null,` |
| L377 | `unsuitable: unsuitable.length > 0 ? unsuitable.join(' / ') : '大型攻击性混养',` |
| L382 | `{ label: '谨慎混养', text: '可以尝试混养，但需要确认同缸生物的性情、体型和躲避空间。' },` |
| L383 | `{ label: '需加热', text: '长期维持稳定水温更合适，建议使用加热棒和温度计。' },` |
| L384 | `{ label: '新手友好', text: '饲养难度较低、容错较高，但仍需要稳定换水和少量投喂。' },` |
| L399 | `const functionFilterOptions = ['全部', '新手好养', '清洁工具', '除藻', '清残饵', '观赏鱼', '工具生物', '适合草缸', '小缸适合'];` |
| L400 | `const environmentFilterOptions = ['全部', '淡水', '海水', '草缸', '小缸', '需加热', '不需加热'];` |
| L401 | `const difficultyFilterOptions = ['全部', '简单', '中等', '困难'];` |
| L402 | `const housingFilterOptions = ['全部', '适合混养', '谨慎混养', '建议单养'];` |
| L403 | `const primaryFunctionFilterOptions = ['新手好养', '清洁工具', '适合当前鱼缸'];` |
| L404 | `const defaultRecentFilterOptions = ['适合草缸', '小缸适合', '淡水'];` |
| L458 | `'全部': 'all',` |
| L459 | `'淡水': 'freshwater',` |
| L460 | `'海水': 'saltwater',` |
| L461 | `'草缸': 'plantedTank',` |
| L462 | `'小缸': 'nanoTank',` |
| L463 | `'需加热': 'needHeater',` |
| L464 | `'不需加热': 'noHeater',` |
| L465 | `'简单': 'easy',` |
| L466 | `'中等': 'medium',` |
| L467 | `'困难': 'hard',` |
| L468 | `'适合混养': 'compatible',` |
| L469 | `'谨慎混养': 'cautionMix',` |
| L470 | `'建议单养': 'singleSpecimen',` |
| L471 | `'新手好养': 'beginnerFriendly',` |
| L472 | `'清洁工具': 'cleaningCrew',` |
| L473 | `'适合当前鱼缸': 'suitableForCurrentTank',` |
| L474 | `'除藻': 'algaeEating',` |
| L475 | `'清残饵': 'leftoverEating',` |
| L476 | `'观赏鱼': 'ornamentalFish',` |
| L477 | `'工具生物': 'utilityCreature',` |
| L478 | `'适合草缸': 'suitableForPlanted',` |
| L479 | `'小缸适合': 'suitableForNano',` |
| L607 | `if (!savedAsExpected) throw new Error('收藏状态未能保存');` |
| L653 | `shortReason: miniCompatibilityResult?.summary \|\| '继续选择生物后生成判断。',` |
| L783 | `if (!label \|\| label === '全部') return;` |
| L813 | `.filter(label => label !== '全部' && (functionFilterOptions.includes(label) \|\| environmentFilterOptions.includes(label)))` |
| L818 | `activeFilters.keyword.trim() && `搜索：“${activeFilters.keyword.trim()}”`,` |
| L822 | `const isSuitableCurrentTankFilter = activeFilters.functionTag === '适合当前鱼缸';` |
| L868 | `if (hint === '通常不加热') displayHint = t('encyclopedia.hintColdwater');` |
| L869 | `else if (hint === '适应范围宽') displayHint = t('encyclopedia.hintBroad');` |
| L870 | `else if (hint === '建议稳定加热') displayHint = t('encyclopedia.hintTropical');` |
| L871 | `else if (hint === '海水缸专用') displayHint = t('encyclopedia.hintMarine');` |
| L878 | `disabled: label !== '全部' && count === 0,` |
| L904 | `if (label.startsWith('搜索：“')) {` |
| L954 | `const isSaltwaterSpecies = fish.category.includes('海水') \|\| getCareTaxonomyPath(fish).waterType.includes('海水');` |
| L961 | `label: '温度',` |
| L962 | `current: currentTemperature ? `${currentTemperature}℃` : '未设置',` |
| L970 | `? '先在鱼缸设置中补充目标温度。'` |
| L972 | `? '当前温度在需求范围内。'` |
| L973 | `: `建议调整到 ${fish.waterTemperature} 并保持稳定。`,` |
| L977 | `current: '未记录',` |
| L978 | `requirement: phRange ? fish.phLevel : '资料不足',` |
| L980 | `advice: phRange ? '当前鱼缸暂无 pH 数据，建议测试后再判断。' : '该物种缺少明确 pH 范围，可先按稳定水质管理。',` |
| L983 | `label: '缸体大小',` |
| L984 | `current: tankLiters ? `约 ${tankLiters}L` : '未设置',` |
| L987 | `advice: !tankLiters \|\| !minLiters ? '先完善鱼缸尺寸，才能判断空间是否足够。' : tankLiters >= minLiters ? '空间基本满足最低建议。' : '当前水体偏小，建议先升级缸体或减少饲养密度。',` |
| L990 | `label: '性情 / 混养',` |
| L991 | `current: aquarium?.fishes.length ? `已有 ${aquarium.fishes.length} 种生物` : '暂无生物',` |
| L992 | `requirement: fish.housingMode \|\| '需观察',` |
| L993 | `status: fish.housingMode === '建议单养' ? 'danger' : fish.housingMode === '谨慎混养' ? 'warning' : 'ok',` |
| L994 | `advice: fish.housingReason \|\| '建议加入混养计算后再确认组合风险。',` |
| L997 | `label: '养护难度',` |
| L998 | `current: '新手参考',` |
| L1001 | `advice: fish.difficulty === 'Easy' ? '适合作为入门选择。' : fish.difficulty === 'Medium' ? '需要稳定水质和观察。' : '不建议新手直接尝试。',` |
| L1004 | `label: '设备需求',` |
| L1005 | `current: aquarium?.equipment?.heater ? '已配置加热棒' : '加热棒未确认',` |
| L1006 | `requirement: needsHeater ? '建议加热棒' : '无特殊加热需求',` |
| L1008 | `advice: needsHeater ? '建议使用加热棒和温度计维持稳定水温。' : '按常规过滤、换水和观察即可。',` |
| L1014 | `label: '水体类型',` |
| L1015 | `current: aquarium?.waterType === 'Saltwater' ? '海水' : '淡水',` |
| L1016 | `requirement: isSaltwaterSpecies ? '海水' : '淡水',` |
| L1018 | `advice: '当前鱼缸水体类型与该物种需求不一致，不建议直接加入。',` |
| L1027 | `? '适合当前鱼缸，可以少量加入并观察 3-7 天。'` |
| L1029 | `? '当前鱼缸有部分条件需要确认或调整，建议先看风险原因。'` |
| L1031 | `? '不建议直接加入当前鱼缸，可能存在水体、空间或混养风险。'` |
| L1032 | `: '需要先完善鱼缸设置，才能判断适配度。';` |
| L1214 | `(label === '全部' \|\| prev.functionTag === label)` |
| L1227 | `environment: label === '全部' \|\| prev.environment === label ? null : label,` |
| L1256 | `setActiveFilters(prev => ({ ...prev, keyword: '', functionTag: '适合当前鱼缸' }));` |
| L1648 | `aria-label={`选择${group.groupName}的具体变种收藏`}` |
| L1649 | `title="选择具体变种收藏"` |
| L1657 | `aria-label={`查看${group.groupName}品类`}` |
| L1668 | `{group.variantCount} 个变种` |
| L1831 | `{Array.from(new Set([...(theme.needsHeater ? ['需稳定加热'] : []), ...compactTags])).slice(0, 3).map(tag => (` |
| L1833 | `tag === '建议单养'` |
| L1835 | `: tag === '谨慎混养'` |
| L1839 | `{tag === '需稳定加热' ? t('encyclopedia.heaterTag') : (filterLabelKeys[tag] ? t('encyclopedia.' + filterLabelKeys[tag]) : tag)}` |
| L2199 | `setDetailFeedback(`已记录 ${fish.name} 为逝去的生物。`);` |
| L2235 | `const displayTag = tag === '主题生物' ? '观赏鱼' : tag === '单独饲养' ? '建议单养' : tag;` |
| L2289 | `.filter(item => ['温度', '缸体大小', '性情 / 混养'].includes(item.label))` |
| L2294 | `{item.label === '缸体大小' ? t('encyclopedia.spaceLabel') : (item.label === '温度' ? t('encyclopedia.tempLabelBasic') : t('encyclopedia.temperamentMixing'))}` |
| L2298 | `需求：{item.requirement}` |
| L2299 | `<span className={getFitCurrentClass(item.status)}>（当前：{item.current}）</span>` |
| L2380 | `<div className="mt-1 text-[12px] font-black text-ink">{getTemperamentLabel(selectedFish.temperament, isEn)} · {selectedFish.housingMode \|\| (isEn ? 'Observe' : '需观察')}</div>` |
| L2383 | `{selectedFish.housingReason \|\| (isEn ? 'Recommended to run compatibility check first.' : '建议加入混养计算后再确认。')}` |
| L2407 | `<p className="mt-1 text-[11px] font-bold text-ink/48">{selectedFish.feedingProfile?.feedingFrequency \|\| '少量投喂，避免残饵。'}</p>` |
| L2554 | `setDraftFunctionTag(label === '全部' ? null : label);` |
| L2556 | `options: functionFilterOptions.map(label => makeFilterOption(label, { functionTag: label === '全部' ? null : label })),` |
| L2563 | `setDraftEnvironment(label === '全部' ? null : label);` |
| L2567 | `{ environment: label === '全部' ? null : label },` |
| L2568 | `label === '淡水冷水' ? '通常不加热'` |
| L2569 | `: label === '淡水广温' ? '适应范围宽'` |
| L2570 | `: label === '淡水热带' ? '建议稳定加热'` |
| L2571 | `: label === '海水' ? '海水缸专用'` |
| L2580 | `setDraftFunctionTag(label === '全部' ? null : label);` |
| L2582 | `options: difficultyFilterOptions.map(label => makeFilterOption(label, { functionTag: label === '全部' ? null : label })),` |
| L2589 | `setDraftFunctionTag(label === '全部' ? null : label);` |
| L2591 | `options: housingFilterOptions.map(label => makeFilterOption(label, { functionTag: label === '全部' ? null : label })),` |

---

## CareEncyclopedia.tsx (Total lines: 2873)

Found **498** lines with Chinese characters:

| Line | Code snippet |
|---|---|
| L43 | `const categoryChips = ['全部', '鱼不舒服', '水变差', '新鱼入缸', '日常喂食', '换水维护', '怀孕 / 鱼苗', '死亡处理', '设备问题'];` |
| L93 | `type CareUrgencyTag = '科普了解' \| '入缸前准备' \| '观察为主' \| '阶段护理' \| '建议尽快处理' \| '需要立即处理' \| '谨慎操作';` |
| L98 | `'科普了解': 'Info',` |
| L99 | `'入缸前准备': 'Pre-Stocking',` |
| L100 | `'观察为主': 'Observation',` |
| L101 | `'阶段护理': 'Routine Care',` |
| L102 | `'建议尽快处理': 'ASAP',` |
| L103 | `'需要立即处理': 'Immediate',` |
| L104 | `'谨慎操作': 'Caution',` |
| L109 | `type CareActionLevel = '日常学习' \| '操作指南' \| '建议关注' \| '立即排查';` |
| L137 | `'水质异常': Waves,` |
| L138 | `'怀孕 / 鱼苗': Baby,` |
| L139 | `'新鱼入缸': Stethoscope,` |
| L140 | `'换水维护': Droplets,` |
| L141 | `'死亡处理': AlertTriangle,` |
| L142 | `'鱼只异常': Fish,` |
| L143 | `'日常喂食': Fish,` |
| L144 | `'设备问题': Settings,` |
| L145 | `'水草 / 藻类': Waves,` |
| L149 | `[/打氧\|气泵\|氧气\|增氧/, '打氧'],` |
| L150 | `[/停止喂食\|停喂\|暂停喂食/, '停喂'],` |
| L151 | `[/少量.*换水\|20\|30\|换水/, '少量换水'],` |
| L152 | `[/过滤\|出水\|滤/, '检查过滤器'],` |
| L153 | `[/水温\|温差\|加热/, '看水温'],` |
| L154 | `[/隔离\|隔离盒\|检疫/, '先隔离'],` |
| L155 | `[/捞出\|死鱼\|尸体/, '捞出死鱼'],` |
| L156 | `[/过水\|泡袋\|对温/, '慢过水'],` |
| L157 | `[/残饵\|清理\|吸便/, '清残饵'],` |
| L158 | `[/观察\|呼吸\|浮头/, '观察状态'],` |
| L159 | `[/不要\|避免\|别/, '当前阶段不建议'],` |
| L160 | `[/水面\|波纹/, '看水面'],` |
| L161 | `[/下药\|药/, '别乱下药'],` |
| L166 | `.replace(/^步骤[一二三四五六七八九十\d]+[：:、\s]*/g, '')` |
| L174 | `.replace(/^步骤[一二三四五六七八九十\d]+[：:、\s]*/g, '')` |
| L183 | `return text.slice(0, 6) \|\| '查看';` |
| L207 | `topic.id === 'guide_new_fish_acclimation' \|\| /新鱼\|入缸\|过水/.test(`${topic.title} ${topic.summary} ${topic.keywords.join(' ')}`)` |
| L221 | `{ title: '浮温', description: '袋子浮在鱼缸水面 15-30 分钟，让水温接近。' },` |
| L222 | `{ title: '少量混水', description: '每隔 5-10 分钟加入少量鱼缸水，重复 3-4 次。' },` |
| L223 | `{ title: '捞鱼入缸', description: '只把鱼捞入鱼缸，袋里的水倒掉，不要倒入主缸。' },` |
| L246 | `{ title: '不要倒袋水入缸', reason: '袋水可能带入污染物，也会造成水质波动。' },` |
| L247 | `{ title: '不要立刻入缸', reason: '温差和 pH 波动可能导致应激。' },` |
| L248 | `{ title: '入缸初期避免强光', reason: '保持安静，减少惊吓。' },` |
| L269 | `{ title: '为什么要浮温', description: '运输袋和鱼缸的水温可能不同。先浮温可以减少温差刺激。' },` |
| L270 | `{ title: '为什么要少量混水', description: '少量多次混水，可以让新鱼逐步适应 pH、硬度和气味变化。' },` |
| L271 | `{ title: '为什么不能倒袋水', description: '袋水里可能有排泄物、药物残留和运输污染物，不适合进入主缸。' },` |
| L272 | `{ title: '入缸后观察 3-7 天', description: '观察白点、烂鳍、拒食、夹鳍和异常躲藏。稳定后再考虑混养。' },` |
| L276 | `...topic.diagnoseWhen.map(item => ({ title: '后续观察', description: cleanCareSentence(item) })),` |
| L277 | `...(topic.nextStep ? [{ title: '下一步', description: cleanCareSentence(topic.nextStep) }] : []),` |
| L286 | `: '新鱼建议先隔离观察 3-7 天。确认无白点、烂鳍、拒食等异常后，再放入主缸。';` |
| L288 | `return cleanCareSentence(topic.nextStep \|\| topic.diagnoseWhen[0] \|\| (isEn ? 'After completion, continue to observe the fish condition, water temperature, and water changes.' : '完成后继续观察鱼只状态、水温和水体变化。'));` |
| L294 | `const cleaned = cleanCareSentence(action).replace(/^下一步建议\|^Next step recommended/i, isEn ? 'Recommend' : '建议');` |
| L295 | `return cleaned \|\| (isEn ? 'Keep observing first, prioritize treatment methods with less impact on water temperature and quality.' : '先保持观察，优先选择对水温和水质影响更小的处理方式。');` |
| L302 | `if (/脏水\|包装袋\|直接倒\|换水\|倒水\|温差\|pH\|水质\|自来水/.test(text)) return '这会让水温或水质短时间大幅波动，也可能把运输水里的污染物带入主缸。';` |
| L303 | `if (/下药\|药\|滤材\|过滤\|清洗/.test(text)) return '原因未确认前处理过重，可能伤到硝化系统或健康个体。';` |
| L304 | `if (/喂\|饲料\|残饵/.test(text)) return '过量食物会迅速污染水体，增加缺氧和氨氮风险。';` |
| L305 | `if (/强光\|惊吓\|捞\|移动\|追/.test(text)) return '频繁惊扰会增加应激，让恢复或适应过程变慢。';` |
| L306 | `if (/混养\|大鱼\|同一层\|其它鱼/.test(text)) return '体型、食性或空间压力会放大追咬、吞食和抢食风险。';` |
| L307 | `return topic.summary \|\| '这个操作容易让当前问题进一步扩大。';` |
| L319 | `if (/缺氧\|氨氮\|污染\|水质/.test(reason)) return '可能出现浮头、趴缸、拒食或水体迅速变差。';` |
| L320 | `if (/应激\|惊扰\|波动\|温差/.test(reason)) return '可能导致鱼只休克、躲藏、跳缸或抵抗力下降。';` |
| L321 | `if (/硝化\|滤材\|下药\|药/.test(reason)) return '可能造成硝化系统受损，后续水质更难稳定。';` |
| L322 | `if (/吞食\|追咬\|抢食\|混养/.test(reason)) return '可能造成受伤、被吃或长期躲避不进食。';` |
| L323 | `return '可能让问题变得更难判断，也更难恢复稳定。';` |
| L342 | `{ pattern: /浮头\|呼吸\|喘\|缺氧/, sign: '浮头或呼吸急促', possibleReason: '可能是缺氧、水质恶化或温差刺激。', action: '先增加供氧，检查过滤出水，并少量换入等温除氯水。' },` |
| L343 | `{ pattern: /拒食\|不吃\|趴缸\|不动/, sign: '拒食或趴缸', possibleReason: '可能是应激、水温波动或水质指标异常。', action: '暂停加餐，观察体表和呼吸，同时补测温度、pH、氨氮和亚硝酸盐。' },` |
| L344 | `{ pattern: /躲\|扎堆\|惊慌\|急游/, sign: '躲藏、扎堆或急游', possibleReason: '可能是环境变化太快、光照过强或被追逐。', action: '降低光照和打扰，增加遮蔽物，确认没有被其它生物追咬。' },` |
| L345 | `{ pattern: /死亡\|死鱼\|夭折\|暴毙/, sign: '死亡数量增加', possibleReason: '可能是急性水质问题、传染病或强烈应激。', action: '立刻移除死亡个体，暂停喂食，少量换水并加强供氧。' },` |
| L346 | `{ pattern: /白点\|烂尾\|红斑\|充血\|立鳞/, sign: '体表出现病灶', possibleReason: '可能是外寄、细菌感染或水质长期不稳。', action: '先隔离观察，记录症状变化，再决定是否药浴或一键诊断。' },` |
| L347 | `{ pattern: /卵黄囊\|鱼苗\|平游\|开口/, sign: '鱼苗状态异常', possibleReason: '可能是水流过强、开口食物不合适或温度不稳。', action: '保持弱水流和恒温，少量多次喂食，及时清理残饵。' },` |
| L351 | `if (/怀孕\|鱼苗/.test(topic.category + topic.title)) {` |
| L353 | `{ sign: '鱼苗扎堆或不平游', possibleReason: '可能是水温波动、水流过强或水质开始变差。', action: '保持弱水流，确认水温稳定，少量清理残饵。' },` |
| L354 | `{ sign: '死亡数量增加', possibleReason: '可能是喂食污染、缺氧或换水刺激。', action: '暂停喂食，少量换入等温水，并增加供氧。' },` |
| L357 | `if (/水质\|换水\|自来水\|油膜\|白浊/.test(topic.category + topic.title + topic.summary)) {` |
| L359 | `{ sign: '鱼浮头或水面聚集', possibleReason: '可能是溶氧不足或水质恶化。', action: '增加水面扰动和供氧，减少喂食并观察 1-2 小时。' },` |
| L360 | `{ sign: '水体异味或浑浊加重', possibleReason: '可能是有机物堆积或硝化系统不稳定。', action: '少量换水，清理残饵，不要大洗滤材。' },` |
| L364 | `{ sign: '状态突然变差', possibleReason: '可能是水质、温度、混养压力或近期操作变化造成。', action: '先暂停新增操作，记录变化时间，再补充水温和水质数据。' },` |
| L394 | `? [{ title: '入缸后观察', description: getProcedureObservation(topic) }]` |
| L396 | `...topic.observe.map(item => ({ title: '观察重点', description: cleanCareSentence(item) })),` |
| L397 | `...topic.diagnoseWhen.map(item => ({ title: '后续判断', description: cleanCareSentence(item) })),` |
| L398 | `...(topic.nextStep ? [{ title: '下一步', description: cleanCareSentence(topic.nextStep) }] : []),` |
| L412 | `: [{ title: '持续观察', description: topic.summary \|\| '处理后继续观察鱼只状态、水温和水体变化。' }],` |
| L417 | `{ name: 'new_fish', pattern: /新鱼\|入缸\|过水\|检疫\|隔离\|拒食\|适应/ },` |
| L418 | `{ name: 'water', pattern: /水质\|水浑\|白浊\|发白\|发绿\|异味\|油膜\|换水\|过滤\|氨氮\|亚硝酸盐/ },` |
| L419 | `{ name: 'breeding', pattern: /怀孕\|母鱼\|鱼苗\|繁殖\|产后\|开口\|平游\|卵黄囊/ },` |
| L420 | `{ name: 'death', pattern: /死亡\|死鱼\|暴毙\|隔离\|捞出\|水质检测/ },` |
| L421 | `{ name: 'symptom', pattern: /浮头\|呼吸\|拒食\|趴缸\|躲藏\|打架\|追咬\|白点\|烂尾\|红鳃/ },` |
| L422 | `{ name: 'equipment', pattern: /设备\|过滤\|滤材\|加热棒\|气泵\|灯光\|水流/ },` |
| L423 | `{ name: 'plant', pattern: /水草\|黄叶\|烂叶\|藻\|CO2\|光照\|草缸/ },` |
| L441 | `const hasBreedingSpecies = details.some(fish => /孔雀\|玛丽\|月光\|胎生\|鱼苗\|虾/.test(`${fish.name} ${fish.category} ${fish.description}`));` |
| L443 | `const hasEquipmentGap = Boolean(aquarium && (!aquarium.equipment?.filter \|\| aquarium.equipment.filter === '无'));` |
| L484 | `const vagueCareCardPatterns = [/^避开风险$/, /^注意观察$/, /^保持稳定$/, /^及时处理$/, /^查过滤$/, /^观察状态$/];` |
| L502 | `.replace(/^(不要\|别\|避免\|请\|先\|再\|立刻\|马上)/, '')` |
| L524 | `.filter(item => !doKeys.has(careCardKey(item.title)) \|\| /^不要\|避免\|别/.test(item.title))` |
| L544 | `source: '来自 AquaGuide',` |
| L555 | `['【AquaGuide 养护卡】', careCard.title],` |
| L556 | `['核心结论：', careCard.coreSummary],` |
| L558 | `? ['先做：', ...careCard.doActions.map((item, index) => `${index + 1}. ${formatCareCardAction(item)}`)]` |
| L561 | `? ['暂时避免：', ...careCard.avoidActions.map((item, index) => `${index + 1}. ${formatCareCardAction(item)}`)]` |
| L564 | `? ['异常提醒：', ...careCard.warningSigns.map(item => `${item.sign}：${item.action}`)]` |
| L606 | `guide_new_fish_acclimation: '如何安全给新鱼过水？',` |
| L607 | `guide_water_deteriorate: '水质变差怎么办？',` |
| L608 | `guide_pregnant_care: '母鱼怀孕后怎么护理？',` |
| L609 | `guide_fry_care: '鱼苗出生后怎么照料？',` |
| L610 | `guide_safe_water_change: '如何安全换水？',` |
| L611 | `guide_fish_death_action: '鱼死了以后怎么处理？',` |
| L626 | `if (/[\?？]$/.test(title) \|\| /怎么办\|如何\|怎么\|要不要\|能不能\|可以吗\|有危害吗\|需要注意/.test(title)) {` |
| L629 | `if (/入缸\|过水/.test(title)) return '如何安全给新鱼过水？';` |
| L630 | `if (/水质\|水浑\|发白\|发绿\|异味\|油膜/.test(title)) return `${title}怎么办？`;` |
| L631 | `if (/怀孕\|母鱼/.test(title)) return '母鱼怀孕后怎么护理？';` |
| L632 | `if (/鱼苗/.test(title)) return '鱼苗出生后怎么照料？';` |
| L633 | `if (/换水/.test(title)) return `如何${title.replace(/^怎么/, '')}？`;` |
| L634 | `if (/气泵\|打氧/.test(title)) return '鱼缸一定要气泵打氧吗？';` |
| L635 | `if (/死亡\|死鱼/.test(title)) return '鱼死了以后怎么处理？';` |
| L636 | `return `${title}怎么办？`;` |
| L640 | `科普了解: 'bg-slate-100 text-slate-700',` |
| L641 | `入缸前准备: 'bg-cyan-50 text-cyan-700',` |
| L642 | `观察为主: 'bg-emerald-50 text-emerald-700',` |
| L643 | `阶段护理: 'bg-violet-50 text-violet-700',` |
| L644 | `建议尽快处理: 'bg-orange-100 text-orange-700',` |
| L645 | `需要立即处理: 'bg-red-600 text-white',` |
| L646 | `谨慎操作: 'bg-yellow-100 text-yellow-800',` |
| L650 | `日常学习: 'bg-slate-100 text-slate-700',` |
| L651 | `操作指南: 'bg-emerald-50 text-emerald-700',` |
| L652 | `建议关注: 'bg-orange-100 text-orange-700',` |
| L653 | `立即排查: 'bg-red-600 text-white',` |
| L657 | `日常学习: '查看内容',` |
| L658 | `操作指南: '查看内容',` |
| L659 | `建议关注: '查看内容',` |
| L660 | `立即排查: '查看内容',` |
| L664 | `{ label: '水质问题', filter: '水质异常', icon: Droplets, hint: '水浑 / 异味 / 波动' },` |
| L665 | `{ label: '新鱼入缸', filter: '新鱼入缸', icon: Stethoscope, hint: '过水 / 检疫 / 放养' },` |
| L666 | `{ label: '鱼只异常', filter: '鱼只异常', icon: Fish, hint: '浮头 / 拒食 / 体表' },` |
| L667 | `{ label: '设备维护', filter: '设备维护', icon: Settings, hint: '过滤 / 打氧 / 灯光' },` |
| L668 | `{ label: '怀孕 / 鱼苗', filter: '鱼苗养护', icon: Baby, hint: '繁殖 / 开口 / 隔离' },` |
| L669 | `{ label: '日常养护', filter: '日常养护', icon: Waves, hint: '换水 / 喂食 / 清洁' },` |
| L672 | `const highFrequencyFilters = ['全部', '新手必看', '水质问题', '鱼类症状', '喂食管理', '设备维护'];` |
| L675 | `全部: '全部',` |
| L676 | `新手必看: '新手必看',` |
| L677 | `水质问题: '水质异常',` |
| L678 | `鱼类症状: '鱼只异常',` |
| L679 | `喂食管理: '喂食管理',` |
| L680 | `设备维护: '设备维护',` |
| L684 | `{ label: '新鱼入缸', subtitle: '过水 / 放养', filter: '新鱼入缸' },` |
| L685 | `{ label: '水质异常', subtitle: '浑水 / 异味', filter: '水质异常' },` |
| L686 | `{ label: '怀孕 / 鱼苗', subtitle: '产卵 / 孵化', filter: '鱼苗养护' },` |
| L687 | `{ label: '设备维护', subtitle: '清洗 / 保养', filter: '设备维护' },` |
| L688 | `{ label: '鱼只异常', subtitle: '浮头 / 拒食 / 死鱼', filter: '鱼只异常' },` |
| L696 | `tag === '怀孕 / 鱼苗' ? '繁殖护理' : tag` |
| L698 | `let actionLevel: CareActionLevel = '日常学习';` |
| L701 | `topicTags = ['日常养护'];` |
| L702 | `actionLevel = '操作指南';` |
| L704 | `topicTags = ['新鱼入缸'];` |
| L705 | `actionLevel = '操作指南';` |
| L707 | `topicTags = ['水质异常'];` |
| L708 | `actionLevel = '建议关注';` |
| L710 | `topicTags = ['鱼只异常'];` |
| L711 | `actionLevel = '立即排查';` |
| L713 | `topicTags = ['鱼苗养护'];` |
| L714 | `actionLevel = '操作指南';` |
| L715 | `} else if (/新缸.*白\|白蒙蒙\|白浊/.test(text)) {` |
| L716 | `topicTags = ['水质异常'];` |
| L717 | `actionLevel = '建议关注';` |
| L718 | `} else if (/过水\|入缸\|换水\|清洗\|操作\|步骤\|鱼苗\|怀孕\|繁殖/.test(text) \|\| guideMeta.guideType === 'procedure' \|\| guideMeta.guideType === 'careChecklist') {` |
| L719 | `actionLevel = '操作指南';` |
| L720 | `} else if (/死亡\|死鱼\|浮头\|急促\|氨中毒\|白点\|烂尾\|红鳃\|暴毙/.test(text)) {` |
| L721 | `actionLevel = '立即排查';` |
| L722 | `} else if (/水质\|水浑\|发白\|发绿\|异味\|油膜\|过滤\|设备\|硬度\|pH\|混养/.test(text) \|\| topic.urgency === '尽快处理') {` |
| L723 | `actionLevel = '建议关注';` |
| L726 | `if (topicTags.length === 0) topicTags = ['日常养护'];` |
| L760 | `const hasBreedingSpecies = livestockDetails.some(fish => /孔雀\|玛丽\|月光\|胎生\|鱼苗\|虾/.test(`${fish.name} ${fish.category} ${fish.description}`));` |
| L761 | `const hasFilter = Boolean(aquarium?.equipment?.filter && aquarium.equipment.filter !== '无');` |
| L764 | `addRecommendation(findCareTopic(topic => topic.id === 'guide_new_fish_acclimation'), '当前鱼缸最近新增了生物，优先确认过水和入缸观察。');` |
| L767 | `addRecommendation(findCareTopic(topic => /白蒙蒙\|白浊\|新缸刚放水/.test(getDisplayTitle(topic) + topic.summary)), '当前鱼缸像新缸状态，先看白浊和开缸稳定问题。');` |
| L770 | `addRecommendation(findCareTopic(topic => topic.id === 'guide_fry_care' \|\| topic.id === 'guide_pregnant_care'), '当前鱼缸有繁殖或鱼苗相关生物，建议提前看护理节奏。');` |
| L773 | `addRecommendation(findCareTopic(topic => /过滤\|滤棉\|过滤器/.test(getDisplayTitle(topic) + topic.summary + topic.keywords.join(' '))), '当前鱼缸设备信息不完整，建议先确认过滤和维护方式。');` |
| L776 | `addRecommendation(findCareTopic(topic => topic.id === 'guide_safe_water_change'), '当前暂无换水记录，建议建立稳定换水流程。');` |
| L779 | `addRecommendation(findCareTopic(topic => topic.id === 'guide_water_deteriorate'), aquarium ? '作为日常兜底，水质异常排查最常用。' : '还没有当前鱼缸数据，先推荐通用水质排查。');` |
| L780 | `addRecommendation(findCareTopic(topic => topic.id === 'guide_new_fish_acclimation'), '新鱼、新虾入缸前后都适合快速复查。');` |
| L781 | `addRecommendation(findCareTopic(topic => topic.id === 'guide_safe_water_change'), '基础养护高频内容，适合建立固定流程。');` |
| L782 | `addRecommendation(allGuides.find(topic => /喂食\|残饵/.test(getDisplayTitle(topic) + topic.keywords.join(' '))), '日常喂食和残饵管理会影响水质稳定。');` |
| L793 | `if (/新鱼\|入缸\|过水\|检疫/.test(text)) addTag('新鱼入缸');` |
| L794 | `if (/水质\|水浑\|白浊\|发白\|发绿\|异味\|油膜\|氨氮\|亚硝酸盐/.test(text)) addTag('水质异常');` |
| L795 | `if (/浮头\|呼吸\|拒食\|趴缸\|白点\|烂尾\|鱼只异常\|疾病\|生病/.test(text)) addTag('鱼只异常');` |
| L796 | `if (/怀孕\|母鱼\|繁殖/.test(text)) addTag('怀孕 / 鱼苗');` |
| L797 | `if (/鱼苗\|开口\|平游\|卵黄囊/.test(text)) addTag('鱼苗养护');` |
| L798 | `if (/过滤\|加热棒\|气泵\|灯\|设备/.test(text)) addTag('设备维护');` |
| L799 | `if (/混养\|追咬\|打架\|攻击/.test(text)) addTag('混养冲突');` |
| L800 | `if (/水草\|草缸\|造景\|CO2\|黄叶\|烂叶\|藻/.test(text)) addTag('草缸配置');` |
| L801 | `if (/换水\|清洁\|喂食\|残饵\|日常/.test(text)) addTag('日常养护');` |
| L802 | `if (topicTags.size === 0) addTag(topic.category \|\| '日常养护');` |
| L804 | `if (/过水\|新鱼入缸\|检疫/.test(text)) {` |
| L807 | `urgencyTag: '入缸前准备',` |
| L809 | `ctaLabel: '设置 3 天观察提醒',` |
| L810 | `secondaryCtaLabel: '标记已完成过水',` |
| L815 | `if (/怀孕\|母鱼\|鱼苗\|繁殖\|开口\|平游\|卵黄囊/.test(text)) {` |
| L818 | `urgencyTag: '阶段护理',` |
| L820 | `ctaLabel: '保存护理清单',` |
| L821 | `secondaryCtaLabel: '加入阶段提醒',` |
| L826 | `if (topic.id === 'guide_water_deteriorate' \|\| /水质变差/.test(text)) {` |
| L829 | `urgencyTag: '建议尽快处理',` |
| L831 | `ctaLabel: '开始问题自查',` |
| L836 | `if (/浮头\|呼吸急促\|急性\|死亡\|暴毙\|氨中毒\|烂尾\|白点\|红鳃/.test(text) \|\| topic.urgency === '高优先级') {` |
| L839 | `urgencyTag: '需要立即处理',` |
| L841 | `ctaLabel: '开始问题自查',` |
| L846 | `if (/水质变差\|水浑\|发白\|发绿\|异味\|过滤器不出水\|设备异常\|死鱼/.test(text) \|\| topic.urgency === '尽快处理') {` |
| L849 | `urgencyTag: '建议尽快处理',` |
| L851 | `ctaLabel: '开始问题自查',` |
| L856 | `if (/换水\|清洗过滤\|清洁\|喂食\|残饵/.test(text)) {` |
| L859 | `urgencyTag: /大换水\|下药\|滤材/.test(text) ? '谨慎操作' : '观察为主',` |
| L861 | `ctaLabel: /换水/.test(text) ? '标记已完成换水' : '标记已完成操作',` |
| L862 | `secondaryCtaLabel: '展开完整说明',` |
| L869 | `urgencyTag: /用药\|除藻\|硬度\|pH\|CO2/.test(text) ? '谨慎操作' : '科普了解',` |
| L871 | `ctaLabel: '收藏文章',` |
| L872 | `secondaryCtaLabel: '展开完整说明',` |
| L880 | `if (chip === '全部') return true;` |
| L881 | `if (chip === '急救') return homeMeta.actionLevel === '立即排查' \|\| /死\|浮头\|喘\|臭\|白点\|烂尾\|急\|异常/.test(haystack);` |
| L882 | `if (chip === '鱼不舒服' \|\| chip === '鱼类症状' \|\| chip === '鱼只异常') return /鱼只异常\|疾病排查\|病\|白点\|烂尾\|趴缸\|拒食\|浮头\|喘\|死鱼/.test(haystack);` |
| L883 | `if (chip === '水变差' \|\| chip === '水质问题' \|\| chip === '水质异常' \|\| chip === '水质检测') return /水质异常\|水质\|水浑\|白浊\|发绿\|异味\|油膜\|氨氮\|亚硝酸盐/.test(haystack);` |
| L884 | `if (chip === '新鱼入缸' \|\| chip === '入缸') return /入缸\|新鱼\|过水\|检疫/.test(haystack);` |
| L885 | `if (chip === '日常喂食' \|\| chip === '喂食' \|\| chip === '喂食管理') return /喂\|饲料\|吃\|残饵/.test(haystack);` |
| L886 | `if (chip === '换水维护' \|\| chip === '换水' \|\| chip === '日常养护') return /日常养护\|换水\|困水\|除氯\|喂食/.test(haystack);` |
| L887 | `if (chip === '怀孕 / 鱼苗' \|\| chip === '鱼苗' \|\| chip === '鱼苗养护' \|\| chip === '繁殖护理') return /鱼苗\|怀孕\|繁殖\|母鱼/.test(haystack);` |
| L888 | `if (chip === '死亡处理') return /死亡\|死鱼\|连续死/.test(haystack);` |
| L889 | `if (chip === '设备' \|\| chip === '设备问题' \|\| chip === '设备维护') return /设备维护\|设备\|过滤\|加热棒\|气泵\|灯/.test(haystack);` |
| L890 | `if (chip === '新手必看') return /新手\|新缸\|入缸\|过水\|换水\|开缸\|白浊/.test(haystack);` |
| L895 | `{ id: 'gasping', label: '浮头 / 呼吸急促', description: '排查缺氧、水质波动和短期应激' },` |
| L896 | `{ id: 'refusal', label: '拒食', description: '排查新鱼应激、喂食压力和水质问题' },` |
| L897 | `{ id: 'hiding', label: '躲藏不动', description: '排查追咬、温度波动和环境压力' },` |
| L898 | `{ id: 'aggression', label: '追咬打架', description: '排查领地、密度和躲避空间' },` |
| L899 | `{ id: 'death', label: '死亡 / 异常死亡', description: '排查急性水质问题和污染风险' },` |
| L900 | `{ id: 'cloudy', label: '水体浑浊 / 异味', description: '排查残饵、过滤和硝化波动' },` |
| L901 | `{ id: 'shrimpDeath', label: '虾类死亡', description: '排查换水刺激、用药和蜕壳压力' },` |
| L902 | `{ id: 'plantProblem', label: '水草黄叶 / 烂叶', description: '排查光照、肥力和适应期' },` |
| L912 | `question: '是否看到鱼浮头或呼吸急促？',` |
| L914 | `{ label: '没有', value: 'none' },` |
| L915 | `{ label: '偶尔', value: 'occasional' },` |
| L916 | `{ label: '经常', value: 'frequent' },` |
| L917 | `{ label: '不确定', value: 'unknown' },` |
| L922 | `question: '水体是否浑浊或有异味？',` |
| L924 | `{ label: '没有', value: 'none' },` |
| L925 | `{ label: '有一点', value: 'mild' },` |
| L926 | `{ label: '明显', value: 'obvious' },` |
| L927 | `{ label: '不确定', value: 'unknown' },` |
| L932 | `question: '最近 48 小时是否换水？',` |
| L934 | `{ label: '没有', value: 'none' },` |
| L935 | `{ label: '少量换水', value: 'small' },` |
| L936 | `{ label: '大量换水', value: 'large' },` |
| L937 | `{ label: '不确定', value: 'unknown' },` |
| L942 | `question: '最近是否新增生物？',` |
| L944 | `{ label: '没有', value: 'none' },` |
| L945 | `{ label: '有', value: 'yes' },` |
| L946 | `{ label: '不确定', value: 'unknown' },` |
| L951 | `question: '是否有拒食、躲藏或死亡？',` |
| L953 | `{ label: '没有', value: 'none' },` |
| L954 | `{ label: '有轻微异常', value: 'mild' },` |
| L955 | `{ label: '有明显异常', value: 'obvious' },` |
| L956 | `{ label: '不确定', value: 'unknown' },` |
| L980 | `if (/虾/.test(text)) return 'shrimpDeath';` |
| L981 | `if (/水草\|黄叶\|烂叶\|藻/.test(text)) return 'plantProblem';` |
| L982 | `if (/死亡\|死鱼\|暴毙/.test(text)) return 'death';` |
| L983 | `if (/水质\|浑\|发白\|发绿\|异味\|臭\|油膜/.test(text)) return 'cloudy';` |
| L984 | `if (/追咬\|打架\|攻击\|抢食/.test(text)) return 'aggression';` |
| L985 | `if (/躲\|趴缸\|不动/.test(text)) return 'hiding';` |
| L986 | `if (/拒食\|不吃/.test(text)) return 'refusal';` |
| L987 | `if (/浮头\|呼吸\|喘\|缺氧/.test(text)) return 'gasping';` |
| L1011 | `none: '没有',` |
| L1012 | `occasional: '偶尔',` |
| L1013 | `frequent: '经常',` |
| L1014 | `unknown: '不确定',` |
| L1015 | `mild: '有一点 / 轻微',` |
| L1016 | `obvious: '明显',` |
| L1017 | `small: '少量换水',` |
| L1018 | `large: '大量换水',` |
| L1019 | `yes: '有',` |
| L1041 | `const hasShrimp = livestock.some(({ fish }) => /虾\|shrimp\|neocaridina\|caridina/i.test(`${fish.name} ${fish.scientificName}`));` |
| L1042 | `const hasBetta = livestock.some(({ fish }) => /斗鱼\|betta/i.test(`${fish.name} ${fish.scientificName}`));` |
| L1043 | `const livestockText = livestock.map(({ aqFish, fish }) => `${fish.name} x${aqFish.quantity \|\| 1}`).join('、') \|\| '暂无活体生物';` |
| L1045 | `...(aquarium ? [`当前鱼缸：${aquarium.name}`, `当前水体：约 ${volumeLiters}L · ${aquarium.waterType === 'Saltwater' ? '海水' : '淡水'} · ${aquarium.targetTemperature \|\| 25}°C`] : ['未选择鱼缸']),` |
| L1046 | ``当前活体：${livestockText}`,` |
| L1055 | `riskLabel: '信息不足',` |
| L1056 | `conclusion: '请先选择一个鱼缸，再进行诊断。',` |
| L1057 | `causes: ['缺少鱼缸数据'],` |
| L1058 | `todayActions: ['先创建或选择当前鱼缸'],` |
| L1059 | `avoidActions: ['不要在没有鱼缸数据时判断鱼只状态'],` |
| L1060 | `observeItems: ['补充鱼缸容量、水温、过滤和活体记录'],` |
| L1068 | `riskLabel: '信息不足',` |
| L1069 | `conclusion: '当前鱼缸暂无活体生物，无法诊断鱼只状态。你可以先添加生物，或只查看水质/设备排查建议。',` |
| L1070 | `causes: ['当前鱼缸没有真实活体记录'],` |
| L1071 | `todayActions: ['先确认鱼缸过滤、温度和水体是否稳定', '如果只是水浑或设备异常，可以继续按水质方向排查'],` |
| L1072 | `avoidActions: ['不要套用不存在生物的疾病建议', '不要在没有活体记录时判断鱼病'],` |
| L1073 | `observeItems: ['过滤是否正常出水', '水体是否浑浊或有异味', '温度是否稳定'],` |
| L1081 | `riskLabel: '信息不足',` |
| L1082 | `conclusion: '当前鱼缸没有虾类记录，无法生成虾类死亡诊断。',` |
| L1083 | `causes: ['当前活体中没有虾类'],` |
| L1084 | `todayActions: ['先确认是否选错鱼缸', '如果实际有虾，请先把虾类添加到当前鱼缸记录'],` |
| L1085 | `avoidActions: ['不要套用虾类蜕壳或铜药风险判断到没有虾的鱼缸'],` |
| L1086 | `observeItems: ['当前真实活体是否完整记录', '水体是否有异味或浑浊'],` |
| L1093 | `const avoid: string[] = ['不要继续新增生物', '不要盲目下药'];` |
| L1094 | `const observe: string[] = ['是否持续浮头', '是否拒食', '是否躲藏', '水体是否变浑或有异味'];` |
| L1102 | `causes.push('疑似缺氧、水质刺激或过滤出水异常');` |
| L1103 | `actions.push('立即增加打氧或水面扰动', '检查过滤器是否正常出水', '暂停喂食 12-24 小时');` |
| L1106 | `causes.push('可能存在轻微缺氧或短期应激');` |
| L1107 | `actions.push('增加水面扰动或短时打氧', '检查过滤器是否正常出水');` |
| L1112 | `causes.push('可能存在水质恶化或有机物污染');` |
| L1113 | `actions.push('捞出明显残饵或腐败物', '少量换水 20%-30%');` |
| L1114 | `avoid.push('不要同时大量下药和清洗滤材');` |
| L1115 | `observe.push('是否出现异味加重或死亡个体');` |
| L1118 | `causes.push('可能是残饵、投喂或硝化波动造成的轻微水质变化');` |
| L1119 | `actions.push('减少本次投喂量', '清理可见残饵');` |
| L1124 | `causes.push('可能存在大比例换水后的水温或水质刺激');` |
| L1125 | `actions.push('保持水温稳定，先观察 2-4 小时');` |
| L1126 | `avoid.push('不要马上再次大比例换水');` |
| L1128 | `causes.push('近期少量换水通常不是主要风险，但仍需确认温差');` |
| L1133 | `causes.push('可能存在新生物入缸应激或混养压力');` |
| L1134 | `actions.push('减少打扰，弱光观察 24 小时');` |
| L1135 | `observe.push('新加入个体是否被追咬或拒食');` |
| L1140 | `causes.push('已经出现明显拒食、躲藏或死亡，需要提高处理优先级');` |
| L1141 | `actions.push('记录异常个体，必要时隔离观察');` |
| L1142 | `observe.push('是否出现死亡个体');` |
| L1145 | `causes.push('有轻微行为异常，需要继续观察是否扩大到多条生物');` |
| L1149 | `causes.push(hasBetta ? '当前鱼缸存在斗鱼，需额外关注领地压力' : '可能存在领地或空间竞争');` |
| L1150 | `actions.push('增加水草、沉木或石缝作为躲避区');` |
| L1151 | `avoid.push('不要频繁追捞所有生物');` |
| L1155 | `causes.push('当前鱼缸有虾类，虾对水质波动和药物更敏感');` |
| L1156 | `avoid.push('不要使用含铜药物或不明除藻剂');` |
| L1157 | `observe.push('是否出现连续死亡或蜕壳失败');` |
| L1163 | `causes.push('当前回答中不确定信息较多');` |
| L1164 | `actions.push('先观察 2-4 小时，并补充水质、换水和喂食信息');` |
| L1168 | `const riskLabel = resolvedRiskLevel === 'high' ? '高风险' : resolvedRiskLevel === 'medium' ? '中风险' : resolvedRiskLevel === 'unknown' ? '信息不足' : '低风险';` |
| L1170 | `? '初步判断：存在较明显风险，优先处理供氧、过滤和水质。'` |
| L1172 | `? '初步判断：可能存在轻微缺氧、水质波动或短期应激。'` |
| L1174 | `? '当前信息不足，建议先补充观察和水质信息。'` |
| L1175 | `: '初步判断：暂未发现明显高风险，先轻量观察。';` |
| L1181 | `causes: Array.from(new Set(causes.length > 0 ? causes : ['信息不足或轻微环境波动'])).slice(0, 5),` |
| L1182 | `todayActions: Array.from(new Set(actions.length > 0 ? actions : ['保持环境稳定', '观察 24 小时', '检查过滤和水温'])).slice(0, 5),` |
| L1194 | `{ value: '全部', label: t('care.categories.all') },` |
| L1195 | `{ value: '鱼不舒服', label: t('care.categories.sick_fish') },` |
| L1196 | `{ value: '水变差', label: t('care.categories.water_bad') },` |
| L1197 | `{ value: '新鱼入缸', label: t('care.categories.new_stock') },` |
| L1198 | `{ value: '日常喂食', label: t('care.categories.feeding') },` |
| L1199 | `{ value: '换水维护', label: t('care.categories.maintenance') },` |
| L1200 | `{ value: '怀孕 / 鱼苗', label: t('care.categories.breeding') },` |
| L1201 | `{ value: '死亡处理', label: t('care.categories.death') },` |
| L1202 | `{ value: '设备问题', label: t('care.categories.equipment') },` |
| L1206 | `{ label: t('care.categories.water_bad'), filter: '水质异常', icon: Droplets, hint: isEn ? 'Cloudy / Odor / Parameter' : '水浑 / 异味 / 波动' },` |
| L1207 | `{ label: t('care.categories.new_stock'), filter: '新鱼入缸', icon: Stethoscope, hint: isEn ? 'Acclimation / Quarantine / Stocking' : '过水 / 检疫 / 放养' },` |
| L1208 | `{ label: t('care.categories.sick_fish'), filter: '鱼只异常', icon: Fish, hint: isEn ? 'Gasping / Refusal / Disease' : '浮头 / 拒食 / 体表' },` |
| L1209 | `{ label: t('care.categories.equipment'), filter: '设备维护', icon: Settings, hint: isEn ? 'Filter / Aeration / Light' : '过滤 / 打氧 / 灯光' },` |
| L1210 | `{ label: t('care.categories.breeding'), filter: '鱼苗养护', icon: Baby, hint: isEn ? 'Spawning / First Feed / Divide' : '繁殖 / 开口 / 隔离' },` |
| L1211 | `{ label: t('care.categories.maintenance'), filter: '日常养护', icon: Waves, hint: isEn ? 'Water Change / Feed / Clean' : '换水 / 喂食 / 清洁' },` |
| L1215 | `{ label: t('care.categories.new_stock'), subtitle: isEn ? 'Acclimation / Stocking' : '过水 / 放养', filter: '新鱼入缸' },` |
| L1216 | `{ label: t('care.categories.water_bad'), subtitle: isEn ? 'Cloudy / Odor' : '浑水 / 异味', filter: '水质异常' },` |
| L1217 | `{ label: t('care.categories.breeding'), subtitle: isEn ? 'Spawning / Hatching' : '产卵 / 孵化', filter: '鱼苗养护' },` |
| L1218 | `{ label: t('care.categories.equipment'), subtitle: isEn ? 'Cleaning / Maintenance' : '清洗 / 保养', filter: '设备维护' },` |
| L1219 | `{ label: t('care.categories.sick_fish'), subtitle: isEn ? 'Gasping / Refusal / Death' : '浮头 / 拒食 / 死鱼', filter: '鱼只异常' },` |
| L1223 | `{ value: '全部', label: t('care.categories.all') },` |
| L1224 | `{ value: '新手必看', label: isEn ? 'Beginner Guides' : '新手必看' },` |
| L1225 | `{ value: '水质问题', label: t('care.categories.water_bad') },` |
| L1226 | `{ value: '鱼类症状', label: t('care.categories.sick_fish') },` |
| L1227 | `{ value: '喂食管理', label: t('care.categories.feeding') },` |
| L1228 | `{ value: '设备维护', label: t('care.categories.equipment') },` |
| L1233 | `case '科普了解': return t('care.urgency.info');` |
| L1234 | `case '入缸前准备': return t('care.urgency.pre_stock');` |
| L1235 | `case '观察为主': return t('care.urgency.observation');` |
| L1236 | `case '阶段护理': return t('care.urgency.stage');` |
| L1237 | `case '建议尽快处理': return t('care.urgency.soon');` |
| L1238 | `case '需要立即处理': return t('care.urgency.immediate');` |
| L1239 | `case '谨慎操作': return t('care.urgency.caution');` |
| L1246 | `case '日常学习': return t('care.actionLevel.learning');` |
| L1247 | `case '操作指南': return t('care.actionLevel.guide');` |
| L1248 | `case '建议关注': return t('care.actionLevel.watch');` |
| L1249 | `case '立即排查': return t('care.actionLevel.check');` |
| L1257 | `const [activeCategory, setActiveCategory] = useState('全部');` |
| L1258 | `const [highFrequencyFilter, setHighFrequencyFilter] = useState('全部');` |
| L1293 | `? `${aquariumVolumeLiters \|\| '未设'}L · ${activeAquarium.targetTemperature \|\| 25}°C · ${activeAquarium.waterType === 'Saltwater' ? '海水' : '淡水'} · 已有 ${(activeAquarium.fishes \|\| []).length} 种生物`` |
| L1294 | `: '还没有当前鱼缸数据，先显示通用养护推荐';` |
| L1303 | `setActiveCategory('全部');` |
| L1410 | `showToast(isAdding ? '已收录到水族册' : '已从水族册移除');` |
| L1487 | `? '我的收藏'` |
| L1488 | `: activeCategory === '全部'` |
| L1489 | `? '全部问题'` |
| L1493 | `? `搜索结果：“${searchTerm.trim()}” · 共 ${filteredTopics.length} 篇`` |
| L1495 | `? `我的收藏 · 共 ${filteredTopics.length} 篇`` |
| L1496 | `: activeCategory !== '全部'` |
| L1497 | `? `${activeCategory} · 共 ${filteredTopics.length} 篇`` |
| L1498 | `: '养护知识';` |
| L1500 | `? '已按标题、简介、分类和关键词筛选。'` |
| L1502 | `? '这里收纳你常用的养护文章。'` |
| L1503 | `: activeCategory !== '全部'` |
| L1504 | `? `当前分类：${activeCategory}`` |
| L1505 | `: '按问题浏览常用养护方法。';` |
| L1523 | `setCopyMessage(isEn ? 'Copied' : '已复制');` |
| L1526 | `setCopyMessage('复制失败，请手动长按复制');` |
| L1678 | `<div className="mb-2 text-[15px] font-black text-ink">{isEn ? 'What do I want to handle now?' : '我现在想处理什么？'}</div>` |
| L1706 | `<div className={`${!searchTerm.trim() && careViewMode === 'all' && activeCategory === '全部' ? 'hidden md:block' : ''} px-1 py-1 md:rounded-[18px] md:border md:border-white/80 md:bg-white md:px-4 md:py-3 md:shadow-sm`}>` |
| L1714 | `{(activeCategory !== '全部' \|\| searchTerm.trim() \|\| careViewMode === 'favorites') && (` |
| L1718 | `setActiveCategory('全部');` |
| L1725 | `{searchTerm.trim() ? (isEn ? 'Clear Search' : '清空搜索') : careViewMode === 'favorites' ? (isEn ? 'View All' : '查看全部') : (isEn ? 'Clear Filters' : '清除筛选')}` |
| L1744 | `? (isEn ? 'No saved care guides yet. Tap the heart icon in the top right of a guide to add it here.' : '还没有收藏的养护问题。看到常用问题时，点文章右上角爱心就会加入这里。')` |
| L1745 | `: (isEn ? 'No related guides found. Try searching for: cloudy water, gasping, acclimation, water change.' : '没有找到相关内容，可以试试：水浑、浮头、过水、换水、死鱼。')}` |
| L1756 | `{isEn ? 'Prev' : '上一页'}` |
| L1759 | `{isEn ? `Page ${currentCareResultPage + 1} / ${careResultPageCount}` : `第 ${currentCareResultPage + 1} / ${careResultPageCount} 页`}` |
| L1767 | `{isEn ? 'Next' : '下一页'}` |
| L1862 | `title={isEn ? "Select Issue Scenario" : "选择问题场景"}` |
| L1863 | `subtitle={isEn ? "Select a scenario; the list will update accordingly." : "选择一个问题场景，列表会按场景更新。"}` |
| L1866 | `title: isEn ? 'Scenario' : '问题场景',` |
| L1872 | `title: isEn ? 'View Mode' : '查看方式',` |
| L1873 | `selected: draftCareViewMode === 'favorites' ? (isEn ? 'My Saved' : '我的收藏') : (isEn ? 'All' : '全部'),` |
| L1874 | `onSelect: (label) => setDraftCareViewMode((label === '我的收藏' \|\| label === 'My Saved') ? 'favorites' : 'all'),` |
| L1875 | `options: [{ label: isEn ? 'All' : '全部' }, { label: isEn ? 'My Saved' : '我的收藏' }, { label: isEn ? 'Recent View' : '最近查看', hint: isEn ? 'Default' : '暂按推荐优先' }],` |
| L1880 | `setDraftCareCategory('全部');` |
| L1881 | `setActiveCategory('全部');` |
| L1906 | `<div className="text-[16px] font-black text-ink">{isEn ? 'Generate Care Card' : '生成养护卡'}</div>` |
| L1907 | `<div className="mt-0.5 text-[11px] font-bold text-ink/45">{isEn ? 'Extract key steps to generate a copyable mobile card.' : '提取关键步骤，生成可复制、可保存的移动端卡片。'}</div>` |
| L1925 | `{copyMessage === 'Copied' \|\| copyMessage === '已复制' ? (isEn ? 'Copied' : '已复制') : (isEn ? 'Copy Text' : '复制文字')}` |
| L1934 | `{isSavingShareCard ? (isEn ? 'Generating...' : '生成中...') : (isEn ? 'Save Image' : '保存图片')}` |
| L1959 | `{isEn ? 'View Large' : '查看大图'}` |
| L1987 | `<div className="text-[13px] font-black text-emerald-800">{isEn ? 'AquaGuide Care Card' : 'AquaGuide 养护卡'}</div>` |
| L1993 | `<p className="mt-2 text-[12px] font-medium leading-relaxed text-ink/56">{isEn ? 'A concise treatment card for the current situation.' : '一张给当前情况使用的简洁处理卡。'}</p>` |
| L2001 | `<CareCardSection title={isEn ? "Do First" : "先做"} tone="green">` |
| L2009 | `<CareCardSection title={isEn ? "Avoid for Now" : "暂时避免"} tone="orange">` |
| L2018 | `<div className="text-[12px] font-black text-amber-800">{isEn ? 'Warning Signs' : '异常提醒'}</div>` |
| L2030 | `<div className="text-[12px] font-black text-ink/62">{isEn ? 'Applicable Scenarios' : '适用场景'}</div>` |
| L2103 | `aria-label={favorite ? (isEn ? 'Unsave' : '取消收藏') : (isEn ? 'Save' : '收藏百科')}` |
| L2163 | `currentAction: result.todayActions[0] \|\| (isEn ? 'Keep conditions stable and continue observing.' : '保持环境稳定并继续观察。'),` |
| L2177 | `aquariumName: targetAquarium?.name \|\| (isEn ? 'Active Tank' : '当前鱼缸'),` |
| L2179 | `primaryActionLabel: isEn ? 'Back to Guide' : '返回操作指引',` |
| L2211 | `<div className="text-[16px] font-black text-ink">{isEn ? 'Problem Self-Check' : '问题自查'}</div>` |
| L2213 | `{isResultStep ? (isEn ? 'Results' : '自查结果') : (isEn ? `Complete All · Answered ${answeredCount}/${diagnosisQuestions.length}` : `一次填完 · 已回答 ${answeredCount}/${diagnosisQuestions.length}`)}` |
| L2222 | `{isEn ? 'Check Again' : '重新自查'}` |
| L2236 | `<div className="text-[12px] font-black text-ink">{isEn ? 'What do you mainly observe?' : '你主要看到了什么？'}</div>` |
| L2259 | `<div className="text-[12px] font-black text-ink">{isEn ? 'Which aquarium to check?' : '检查哪个鱼缸？'}</div>` |
| L2316 | `{isReady ? (isEn ? 'View Results' : '查看自查结果') : (isEn ? `${diagnosisQuestions.length - answeredCount} left` : `还差 ${diagnosisQuestions.length - answeredCount} 项`)}` |
| L2377 | `const isWaterChangeGuide = /换水/.test(`${getDisplayTitle(topic)} ${topic.title} ${topic.keywords.join(' ')}`);` |
| L2378 | `const isFilterGuide = /过滤\|滤材\|清洗/.test(`${getDisplayTitle(topic)} ${topic.title} ${topic.keywords.join(' ')}`);` |
| L2379 | `const isFryGuide = /鱼苗\|开口\|卵黄囊/.test(`${getDisplayTitle(topic)} ${topic.title} ${topic.keywords.join(' ')}`);` |
| L2388 | `? isOperationCompleted ? (isEn ? 'Completed Acclimation' : '已完成过水') : (isEn ? 'Mark Acclimation Done' : '标记已完成过水')` |
| L2390 | `? isOperationCompleted ? (isEn ? 'Water Change Logged' : '已记录本次换水') : (isEn ? 'Mark Water Change Done' : '标记已完成换水')` |
| L2391 | `: isOperationCompleted ? (isEn ? 'Marked Completed' : '已标记完成') : isFilterGuide ? (isEn ? 'Mark Cleaning Done' : '标记已完成清洗') : (isEn ? 'Mark Operation Done' : '标记已完成操作')` |
| L2393 | `? isChecklistSaved ? (isEn ? 'Care Checklist Saved' : '已保存护理清单') : (isEn ? 'Save Care Checklist' : '保存护理清单')` |
| L2395 | `? (isEn ? 'Start Self-Check' : '开始问题自查')` |
| L2397 | `? favorite ? (isEn ? 'Saved Guide' : '已收藏这篇指南') : (isEn ? 'Save Guide' : '收藏这篇指南')` |
| L2398 | `: (isEn ? 'Set Reminder' : '设置提醒');` |
| L2401 | `? '设置 3 天观察提醒'` |
| L2403 | `? '设置下次换水提醒'` |
| L2406 | `? isFryGuide ? '设置开口喂食提醒' : '设置阶段护理提醒'` |
| L2411 | `const hourMatch = label.match(/(\d+)\s*小时/);` |
| L2412 | `const dayMatch = label.match(/(\d+)\s*天后/);` |
| L2414 | `else if (/明天/.test(label)) scheduled.setDate(scheduled.getDate() + 1);` |
| L2429 | `setCtaFeedback(successMessage \|\| '提醒已设置');` |
| L2431 | `setCtaFeedback(error instanceof Error ? error.message : '提醒保存失败');` |
| L2439 | `title: '设置新鱼观察提醒',` |
| L2440 | `options: ['24 小时后检查状态', '3 天后确认是否稳定', '7 天后结束隔离观察'],` |
| L2442 | `successMessage: '新鱼观察提醒已设置',` |
| L2445 | `title: '设置下次换水提醒',` |
| L2446 | `options: ['3 天后提醒复查水质', '7 天后提醒小换水', '14 天后提醒例行换水'],` |
| L2448 | `successMessage: '下次换水提醒已设置',` |
| L2451 | `title: '设置阶段护理提醒',` |
| L2452 | `options: ['明天提醒复查状态', '3 天后提醒观察变化', '7 天后提醒进入下一阶段'],` |
| L2454 | `successMessage: '阶段护理提醒已设置',` |
| L2457 | `title: '设置开口喂食提醒',` |
| L2458 | `options: ['12 小时后观察卵黄囊', '24 小时后少量试喂', '3 天后复查鱼苗状态'],` |
| L2460 | `successMessage: '开口喂食提醒已设置',` |
| L2463 | `title: '设置养护提醒',` |
| L2464 | `options: ['明天提醒复查', '3 天后提醒观察', '7 天后提醒复盘'],` |
| L2466 | `successMessage: '养护提醒已设置',` |
| L2488 | `setCtaFeedback(label.includes('换水') ? '已记录本次换水' : '已标记完成');` |
| L2490 | `setCtaFeedback(error instanceof Error ? error.message : '操作记录保存失败');` |
| L2509 | `setCtaFeedback('护理清单已保存');` |
| L2511 | `setCtaFeedback(error instanceof Error ? error.message : '护理清单保存失败');` |
| L2535 | `setCtaFeedback('相关内容在下方');` |
| L2545 | `markOperationCompleted('已完成过水');` |
| L2548 | `markOperationCompleted(isWaterChangeGuide ? '已完成换水' : isFilterGuide ? '已完成清洗' : '已完成操作');` |
| L2564 | `setCtaFeedback(favorite ? '这篇指南已收录到水族册' : '已收录到水族册');` |
| L2575 | `<button type="button" onClick={onPreview} data-care-detail-hero className="block min-w-0" aria-label={`查看${topic.title}大图`}>` |
| L2596 | `aria-label={favorite ? (isEn ? 'Unsave' : '取消收藏') : (isEn ? 'Save' : '收藏百科')}` |
| L2605 | `适用场景：{careGuide.suitableFor}` |
| L2610 | `<div className="text-[12px] font-black text-ink">现在按顺序做</div>` |
| L2635 | `<div className="text-[15px] font-black text-ink">准备开始问题自查</div>` |
| L2637 | `系统会根据“{getDisplayTitle(topic)}”追问 2–4 个相关问题，再给出处理建议。` |
| L2645 | `<div className="text-[16px] font-black text-ink">{isEn ? 'Post-Operation Notes' : '操作后注意'}</div>` |
| L2646 | `<div className="mt-0.5 text-[11px] font-bold text-ink/45">{isEn ? 'After operation, monitor the tank and maintain stable conditions.' : '完成操作后，继续观察状态并保持环境平稳。'}</div>` |
| L2655 | `<div className="text-[12px] font-black text-yellow-800">{isEn ? 'Operation Reminders' : '操作提醒'}</div>` |
| L2668 | `<div className="text-[12px] font-black text-sky-800">入缸后观察</div>` |
| L2678 | `? (isEn ? 'Care Checklist' : '护理清单')` |
| L2679 | `: (isEn ? 'Full Description' : '完整说明')}` |
| L2683 | `? (isEn ? 'Care by phase, focusing on stability, observation, and minimal operations.' : '按阶段照料，重点是稳定、观察和少量操作。')` |
| L2684 | `: (isEn ? 'Understand the logic first, then decide whether to operate.' : '先理解原理，再决定是否需要操作。')}` |
| L2711 | `<div className="text-[12px] font-black text-yellow-800">操作提醒</div>` |
| L2731 | `<span className="text-[13px] font-black text-ink">详细说明与判断依据</span>` |
| L2733 | `{isDetailExpanded ? '收起' : '展开'}` |
| L2750 | `<div className="mb-2 text-[12px] font-black text-ink">{meta.guideType === 'procedure' \|\| meta.guideType === 'diagnosis' ? '下一步可以看' : '你可能还需要'}</div>` |
| L2761 | `<span className="mt-0.5 line-clamp-1 block text-[10px] font-medium text-ink/45">{item.summary \|\| '查看这个问题的处理方法。'}</span>` |
| L2795 | `{ctaFeedback.includes('水族册') && onOpenCollection && (` |
| L2801 | `去水族册查看` |
| L2815 | `<div className="mt-1 text-[11px] font-bold text-ink/45">选择一个提醒节点，确认后会保存到本地养护提醒。</div>` |
| L2817 | `<button type="button" onClick={() => setReminderSheet(null)} className="rounded-full bg-bg px-2 py-1 text-[11px] font-black text-ink/45">关闭</button>` |
| L2834 | `确认设置` |

---

