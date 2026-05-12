# 微信小程序分享代码

当前 React 网页版已经有分享按钮和统一分享文案。迁移到微信小程序或 Taro 后，需要在页面里增加下面的分享能力。

## 原生微信小程序页面

```js
Page({
  onLoad() {
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline'],
    });
  },

  onShareAppMessage() {
    return {
      title: '我在用 AquaGuide 管理鱼缸和查询观赏鱼图鉴',
      path: '/pages/aquarium/index',
      imageUrl: '/assets/share-cover.png',
    };
  },

  onShareTimeline() {
    return {
      title: 'AquaGuide 水族助手：观赏鱼图鉴、鱼缸风险和混养建议',
      query: '',
      imageUrl: '/assets/share-cover.png',
    };
  },
});
```

## Taro React 页面

```tsx
import Taro, { useShareAppMessage, useShareTimeline } from '@tarojs/taro';
import { useEffect } from 'react';

export default function AquariumPage() {
  useEffect(() => {
    Taro.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline'],
    });
  }, []);

  useShareAppMessage(() => ({
    title: '我在用 AquaGuide 管理鱼缸和查询观赏鱼图鉴',
    path: '/pages/aquarium/index',
    imageUrl: '/assets/share-cover.png',
  }));

  useShareTimeline(() => ({
    title: 'AquaGuide 水族助手：观赏鱼图鉴、鱼缸风险和混养建议',
    query: '',
    imageUrl: '/assets/share-cover.png',
  }));

  return null;
}
```

