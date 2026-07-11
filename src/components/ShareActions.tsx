import { MessageCircle, Share2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { appShareConfig, getAbsoluteShareUrl } from '../lib/shareConfig';

const isWeChatBrowser = () => {
  if (typeof navigator === 'undefined') return false;
  return /MicroMessenger/i.test(navigator.userAgent);
};

const copyShareLink = async () => {
  const url = getAbsoluteShareUrl();
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(url);
    return true;
  }
  return false;
};

const shareWithNativeSheet = async (title: string) => {
  const url = getAbsoluteShareUrl();
  if (navigator.share) {
    await navigator.share({
      title,
      text: appShareConfig.description,
      url,
    });
    return true;
  }
  return false;
};

export function ShareActions() {
  const [feedback, setFeedback] = useState('');
  const feedbackTimerRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (feedbackTimerRef.current !== null) window.clearTimeout(feedbackTimerRef.current);
  }, []);

  if (!isWeChatBrowser()) {
    return null;
  }

  const showFeedback = (message: string) => {
    setFeedback(message);
    if (feedbackTimerRef.current !== null) window.clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = window.setTimeout(() => setFeedback(''), 3200);
  };

  const handleShareToFriend = async () => {
    try {
      if (await shareWithNativeSheet(appShareConfig.friendTitle)) return;
      await copyShareLink();
      showFeedback(isWeChatBrowser()
        ? '已复制链接。微信内请点击右上角「···」，选择「转发给朋友」。'
        : '已复制分享链接，可以粘贴给朋友。');
    } catch {
      showFeedback('分享暂时不可用，请稍后再试。');
    }
  };

  const handleShareToTimeline = async () => {
    try {
      await copyShareLink();
      showFeedback(isWeChatBrowser()
        ? '已复制链接。微信内请点击右上角「···」，选择「分享到朋友圈」。'
        : '已复制分享链接。朋友圈分享需要在微信内打开后从右上角菜单操作。');
    } catch {
      showFeedback('分享暂时不可用，请稍后再试。');
    }
  };

  return (
    <div className="border-t border-border/70 bg-white/90 px-3 py-2 backdrop-blur-md">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={handleShareToFriend}
          className="flex h-9 items-center justify-center rounded-full border border-sky-100 bg-sky-50 text-[11px] font-black text-sky-700 transition-colors hover:bg-sky-100"
        >
          <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
          转发给朋友
        </button>
        <button
          type="button"
          onClick={handleShareToTimeline}
          className="flex h-9 items-center justify-center rounded-full border border-emerald-100 bg-emerald-50 text-[11px] font-black text-emerald-700 transition-colors hover:bg-emerald-100"
        >
          <Share2 className="mr-1.5 h-3.5 w-3.5" />
          分享到朋友圈
        </button>
      </div>
      {feedback && (
        <div role="status" className="mt-2 rounded-lg bg-ink/5 px-3 py-2 text-center text-[11px] font-bold text-ink/70">
          {feedback}
        </div>
      )}
    </div>
  );
}
