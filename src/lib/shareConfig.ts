export const appShareConfig = {
  title: 'AquaGuide 水族助手',
  friendTitle: '我在用 AquaGuide 管理鱼缸和查询观赏鱼图鉴',
  timelineTitle: 'AquaGuide 水族助手：观赏鱼图鉴、鱼缸风险和混养建议',
  description: '查询观赏鱼、水草、虾螺龟资料，记录鱼缸状态，并获得混养风险提醒。',
  path: '/aquarium',
  imageUrl: '/species-display/sp_0019_埃及神仙_display_white.png?v=share_20260512',
};

export const getAbsoluteShareUrl = (path = appShareConfig.path) => {
  if (typeof window === 'undefined') return path;
  return new URL(path, window.location.origin).toString();
};

