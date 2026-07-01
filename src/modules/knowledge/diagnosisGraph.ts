import type { DiagnosisNode, DiagnosisResultNode } from './knowledge.types';

export const DIAGNOSIS_GRAPHS: Record<string, { nodes: DiagnosisNode[]; results: DiagnosisResultNode[] }> = {
  breathing: {
    nodes: [
      {
        id: 'start',
        question: '鱼是否集中在水面或过滤出水口附近？',
        options: [
          { id: 'yes', label: '是', nextNodeId: 'water_change' },
          { id: 'no', label: '否', resultId: 'observe' },
        ],
      },
      {
        id: 'water_change',
        question: '最近 24 小时是否换水、加药或停电？',
        options: [
          { id: 'yes', label: '是', resultId: 'oxygen_and_stability' },
          { id: 'no', label: '否', resultId: 'check_water' },
        ],
      },
    ],
    results: [
      { id: 'oxygen_and_stability', title: '优先增氧并稳定水质', summary: '浮头常和溶氧不足或水质波动有关。', severity: 'urgent', actions: ['立即增氧', '暂停喂食', '少量换水并观察'] },
      { id: 'check_water', title: '检查氨氮和亚硝酸盐', summary: '没有明显诱因时，先确认水质指标。', severity: 'caution', actions: ['测试水质', '检查过滤', '减少投喂'] },
      { id: 'observe', title: '继续观察呼吸和活动', summary: '暂未进入高风险路径。', severity: 'info', actions: ['记录状态', '观察 24 小时'] },
    ],
  },
  refusing_food: {
    nodes: [
      {
        id: 'start',
        question: '是否为新入缸 7 天内的生物？',
        options: [
          { id: 'yes', label: '是', resultId: 'new_fish_stress' },
          { id: 'no', label: '否', nextNodeId: 'symptoms' },
        ],
      },
      {
        id: 'symptoms',
        question: '是否伴随趴缸、缩鳍或体表异常？',
        options: [
          { id: 'yes', label: '是', resultId: 'health_check' },
          { id: 'no', label: '否', resultId: 'feeding_adjust' },
        ],
      },
    ],
    results: [
      { id: 'new_fish_stress', title: '先降低应激', summary: '新鱼拒食常见于适应期。', severity: 'info', actions: ['关灯静养', '少量投喂', '避免频繁打扰'] },
      { id: 'health_check', title: '排查健康问题', summary: '拒食伴随异常表现时需要先看健康状态。', severity: 'caution', actions: ['观察体表', '隔离异常个体', '检查水质'] },
      { id: 'feeding_adjust', title: '调整食物和投喂量', summary: '无其他异常时可先调整食物类型。', severity: 'info', actions: ['换小颗粒或冷冻饵', '减少投喂量'] },
    ],
  },
  cloudy_water: {
    nodes: [
      {
        id: 'start',
        question: '鱼缸是否开缸 30 天以内？',
        options: [
          { id: 'yes', label: '是', resultId: 'new_tank_bloom' },
          { id: 'no', label: '否', nextNodeId: 'smell' },
        ],
      },
      {
        id: 'smell',
        question: '水体是否有明显异味？',
        options: [
          { id: 'yes', label: '是', resultId: 'organic_overload' },
          { id: 'no', label: '否', resultId: 'mechanical_filter' },
        ],
      },
    ],
    results: [
      { id: 'new_tank_bloom', title: '新缸菌群波动', summary: '新缸白浊多和菌群建立有关。', severity: 'info', actions: ['暂停大量换水', '保持过滤运行', '减少投喂'] },
      { id: 'organic_overload', title: '有机物负荷偏高', summary: '异味通常提示残饵或腐败物过多。', severity: 'caution', actions: ['清理残饵', '检查死角', '少量换水'] },
      { id: 'mechanical_filter', title: '检查过滤和悬浮物', summary: '无异味时先看物理过滤和底床扰动。', severity: 'info', actions: ['检查滤棉', '避免翻动底砂'] },
    ],
  },
};

export const validateDiagnosisGraph = () => {
  const errors: string[] = [];
  Object.entries(DIAGNOSIS_GRAPHS).forEach(([graphId, graph]) => {
    const nodeIds = new Set(graph.nodes.map(node => node.id));
    const resultIds = new Set(graph.results.map(result => result.id));
    graph.nodes.forEach(node => {
      node.options.forEach(option => {
        if (option.nextNodeId && !nodeIds.has(option.nextNodeId)) {
          errors.push(`${graphId}:${node.id}:${option.id} missing node ${option.nextNodeId}`);
        }
        if (option.resultId && !resultIds.has(option.resultId)) {
          errors.push(`${graphId}:${node.id}:${option.id} missing result ${option.resultId}`);
        }
      });
    });
  });
  return errors;
};
