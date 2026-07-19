export interface Scenario {
  id: string;
  name: string;
  goal: string;
  device: 'desktop' | 'mobile';
  initialPath: string;
  setup?: (page: any) => Promise<void>;
}

export const scenarios: Scenario[] = [
  {
    id: "create_freshwater_tank",
    name: "1. 创建淡水鱼缸并添加物种",
    goal: "创建一个名为 '新手淡水缸' 的淡水鱼缸，尺寸为 60x35x40 cm，并成功添加物种 '宝莲灯' 和 '熊猫鼠'。",
    device: "desktop",
    initialPath: "/aquarium?action=create",
  },
  {
    id: "create_saltwater_tank",
    name: "2. 创建海水鱼缸并添加物种",
    goal: "创建一个名为 '精美珊瑚海水缸' 的海水鱼缸，尺寸为 50x40x45 cm，并成功添加物种 '公子小丑' 和 '人字蝶'。",
    device: "desktop",
    initialPath: "/aquarium?action=create",
  },
  {
    id: "guppy_betta_compatibility",
    name: "3. 判断孔雀鱼和斗鱼是否适合混养",
    goal: "在图鉴混养计算器中同时选中 '孔雀鱼' 和 '半月斗鱼' (或斗鱼)，检查系统的混养兼容性结论（预计会产生性情或领地冲突警告）。",
    device: "desktop",
    initialPath: "/encyclopedia#compatibility",
  },
  {
    id: "common_name_search",
    name: "4. 使用物种俗名搜索",
    goal: "在图鉴搜索框中输入俗名 '极火虾'，并确认搜索结果中包含该物种，且卡片能正确展示并可被点击查看详情。",
    device: "desktop",
    initialPath: "/encyclopedia",
  },
  {
    id: "typo_search",
    name: "5. 使用错别字搜索",
    goal: "在图鉴搜索框中输入错别字 '红健鱼' 或 '空雀鱼'，确认系统能通过拼音或模糊匹配兜底显示 '红剑鱼' 或 '孔雀鱼'。",
    device: "desktop",
    initialPath: "/encyclopedia",
  },
  {
    id: "non_existent_search",
    name: "6. 搜索不存在的物种",
    goal: "在图鉴搜索框中输入不存在的物种 '不存在的异形恐龙鱼'，确认系统没有崩溃且显示优雅的空状态提示。",
    device: "desktop",
    initialPath: "/encyclopedia",
  },
  {
    id: "conflict_addition",
    name: "7. 添加与鱼缸类型冲突的物种",
    goal: "在一个淡水鱼缸（如已建立的 '新手淡水缸'）中尝试添加海水鱼 '公子小丑'，确认系统拦截并提示水体冲突警告。",
    device: "desktop",
    initialPath: "/aquarium?action=add-species",
  },
  {
    id: "ai_chat_failure",
    name: "8. AI解释接口失败",
    goal: "在点击 AI 建缸助手或 AI 养护解读时，模拟后端 `/api/ai/chat` 接口返回 503 或超时，确认前端能退回到本地规则并显示兜底提示，没有白屏。",
    device: "desktop",
    initialPath: "/aquarium?action=build-assistant",
    setup: async (page) => {
      // 拦截 AI chat 接口并模拟 503 失败
      await page.route('**/api/ai/chat', async (route) => {
        await route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ ok: false, error: "AI service temporarily unavailable" }),
        });
      });
      await page.route('**/api/v1/ai/chat', async (route) => {
        await route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ ok: false, error: "AI service temporarily unavailable" }),
        });
      });
    }
  },
  {
    id: "geolocation_failure",
    name: "9. 地理定位接口失败",
    goal: "模拟浏览器地理定位不可用（拒绝授权），确认网站相关定位逻辑（如查找本地水族馆或自查参数）不会抛出未捕获异常导致白屏。",
    device: "desktop",
    initialPath: "/aquarium",
    setup: async (page) => {
      // 拒绝地理定位权限，并重写 navigator.geolocation 接口抛出错误
      await page.context().clearPermissions();
      await page.addInitScript(() => {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition = (success, error) => {
            if (error) {
              error({
                code: 1,
                message: "User denied Geolocation",
                PERMISSION_DENIED: 1,
                POSITION_UNAVAILABLE: 2,
                TIMEOUT: 3,
              } as GeolocationPositionError);
            }
          };
        }
      });
    }
  },
  {
    id: "mobile_walkthrough",
    name: "10. 移动端完成完整首次使用流程",
    goal: "在移动端视口下，经历全新引导：跳过游客提示、新建默认淡水缸、成功添加物种并点击完成，查看移动端底部导航状态。",
    device: "mobile",
    initialPath: "/aquarium?action=create",
  },
  {
    id: "go_back_midway",
    name: "11. 用户中途返回上一步",
    goal: "在新建鱼缸或添加生物到第二步混养复核中时，点击返回或取消，验证应用能正确恢复到先前的状态，没有丢包或白屏。",
    device: "desktop",
    initialPath: "/aquarium?action=create",
  },
  {
    id: "refresh_page",
    name: "12. 用户刷新页面",
    goal: "在添加了若干待混养生物后，刷新页面，验证 localStorage 能够自动载入，保留用户之前选择的数据和所建的鱼缸。",
    device: "desktop",
    initialPath: "/aquarium",
  },
  {
    id: "report_warnings",
    name: "13. 查看混养报告中的底栖领地和密度容量警告",
    goal: "向一个 30L 的鱼缸中加入 '极火虾'、'熊猫鼠' 以及多条 '红草/水榕'，打开混养报告，查看底栖空间冲突与密度超负荷警告。",
    device: "desktop",
    initialPath: "/aquarium",
  },
  {
    id: "remove_species",
    name: "14. 在鱼缸中删除一个已添加的物种",
    goal: "进入鱼缸详情的物种列表，选择一种鱼类生物（如 '宝莲灯'），执行删除操作，确认鱼缸内生物数量减少，水质负荷降低。",
    device: "desktop",
    initialPath: "/aquarium",
  },
  {
    id: "favorite_care_guide",
    name: "15. 收藏某个养护攻略并在收藏夹中查看",
    goal: "打开养护百科，点击一篇文章（如 '水质变差怎么办'），执行收藏，并切换到水族册的养护收藏列表，验证能够正确显示收藏的文章。",
    device: "desktop",
    initialPath: "/care",
  }
];
