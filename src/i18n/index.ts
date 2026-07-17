import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { applyLocalization } from './localizeData';

export const supportedLocales = ['zh-CN', 'en'] as const;
export type SupportedLocale = (typeof supportedLocales)[number];

const STORAGE_KEY = 'aquaguide_locale';

const detectInitialLocale = (): SupportedLocale => {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'zh-CN' || stored === 'en') return stored;
  } catch {
    // Browser storage can be unavailable in private contexts.
  }
  return typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('en') ? 'en' : 'zh-CN';
};

const resources = {
  'zh-CN': {
    translation: {
      common: {
        settings: '设置',
        language: '语言',
        close: '关闭',
        chinese: '简体中文',
        english: 'English',
        languageHint: '切换后立即生效，并保存在当前浏览器。',
        localDataHint: '数据保存在当前浏览器，切换设备前请先同步或导出。',
        loading: '正在加载 AquaGuide...',
        loadingHint: '国内网络首次打开可能需要几秒',
        pageError: '页面加载异常',
        renderError: 'AquaGuide 暂时没有渲染出来',
        renderErrorHint: '页面遇到暂时性问题。可以重试一次，或先返回我的鱼缸继续使用其他功能。',
        retry: '重新尝试',
        backToAquarium: '返回我的鱼缸',
      },
      nav: {
        aquarium: '我的鱼缸',
        aquariumDescription: '管理设备与缸内状态',
        encyclopedia: '图鉴',
        encyclopediaDescription: '查找生物与混养计算',
        care: '养护百科',
        careDescription: '排查问题与养护步骤',
        collection: '我的水族册',
        collectionMobile: '水族册',
        collectionDescription: '种草、养护、纪念与勋章',
        browse: '浏览图鉴',
        browseDescription: '查找生物和分类',
        compatibility: '混养计算',
        compatibilityDescription: '选择生物看风险',
        wishlist: '种草图鉴',
        wishlistDescription: '想进一步了解的生物',
        careFavorites: '养护收藏',
        careFavoritesDescription: '收藏的处理步骤',
        memorial: '生命纪念',
        memorialDescription: '离缸记录与复盘',
        achievements: '成就勋章',
        achievementsDescription: '自动解锁与下一步',
        assistant: '水族养护助手',
        collapse: '收起侧边栏',
        expand: '展开侧边栏',
      },
      visualResult: {
        status: {
          compatible: '可以混养',
          caution: '需要谨慎',
          not_recommended: '不建议混养',
          insufficient_data: '资料不足',
          routine: '日常观察',
          watch: '建议关注',
          urgent: '需要立即处理',
        },
        relationshipTitle: '重点对象与影响关系',
        focus: '当前关注',
        doNow: '现在先做',
        noSubject: '暂无可视化对象',
        imageUnavailable: '图片加载失败',
        showAllSubjects: '查看全部 {{count}} 项',
        collapseSubjects: '收起其他对象',
        expandDetails: '展开具体判断依据 · {{count}} 项',
        collapseDetails: '收起具体判断依据',
        viewFull: '查看详细判断',
      },
    },
  },
  en: {
    translation: {
      common: {
        settings: 'Settings',
        language: 'Language',
        close: 'Close',
        chinese: '简体中文',
        english: 'English',
        languageHint: 'Changes apply immediately and are saved in this browser.',
        localDataHint: 'Your data is stored in this browser. Sync or export before switching devices.',
        loading: 'Loading AquaGuide...',
        loadingHint: 'The first load may take a few seconds.',
        pageError: 'Page loading error',
        renderError: 'AquaGuide could not render this page',
        renderErrorHint: 'A temporary problem occurred. Try again or return to My Aquarium.',
        retry: 'Try again',
        backToAquarium: 'Back to My Aquarium',
      },
      nav: {
        aquarium: 'My Aquarium',
        aquariumDescription: 'Manage livestock, equipment and tank status',
        encyclopedia: 'Species Guide',
        encyclopediaDescription: 'Explore species and check compatibility',
        care: 'Care Guide',
        careDescription: 'Troubleshoot issues and follow care steps',
        collection: 'My Collection',
        collectionMobile: 'Collection',
        collectionDescription: 'Wishlist, care, memorials and achievements',
        browse: 'Browse Species',
        browseDescription: 'Search species and categories',
        compatibility: 'Compatibility',
        compatibilityDescription: 'Select species to review risks',
        wishlist: 'Wishlist',
        wishlistDescription: 'Species you want to learn about',
        careFavorites: 'Saved Care',
        careFavoritesDescription: 'Saved guides and instructions',
        memorial: 'Memorials',
        memorialDescription: 'Records and reflections',
        achievements: 'Achievements',
        achievementsDescription: 'Automatic progress and next steps',
        assistant: 'Aquarium care assistant',
        collapse: 'Collapse sidebar',
        expand: 'Expand sidebar',
      },
      visualResult: {
        status: {
          compatible: 'Compatible',
          caution: 'Use caution',
          not_recommended: 'Not recommended',
          insufficient_data: 'More data needed',
          routine: 'Routine',
          watch: 'Watch closely',
          urgent: 'Act now',
        },
        relationshipTitle: 'Key subjects and relationships',
        focus: 'Current focus',
        doNow: 'Do this first',
        noSubject: 'No visual subject available',
        imageUnavailable: 'Image unavailable',
        showAllSubjects: 'Show all {{count}} items',
        collapseSubjects: 'Collapse other subjects',
        expandDetails: 'Expand evidence · {{count}} items',
        collapseDetails: 'Collapse evidence',
        viewFull: 'View detailed result',
      },
    },
  },
} as const;

const initialLocale = detectInitialLocale();

void i18n.use(initReactI18next).init({
  resources,
  lng: initialLocale,
  fallbackLng: 'zh-CN',
  interpolation: { escapeValue: false },
});

// Run initial localization of global datasets
applyLocalization(initialLocale);

export const setLocale = async (locale: SupportedLocale) => {
  await i18n.changeLanguage(locale);
  document.documentElement.lang = locale;
  applyLocalization(locale);
  try {
    window.localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // Language still changes for the current session when storage is unavailable.
  }
};

document.documentElement.lang = i18n.language === 'en' ? 'en' : 'zh-CN';

export default i18n;
