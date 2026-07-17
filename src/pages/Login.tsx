import { FormEvent, useState } from 'react';
import posthog from 'posthog-js';
import { useNavigate } from 'react-router-dom';
import { Droplets, Loader2, Lock, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authService } from '../services/auth/auth.service';
import { useToast } from '../components/common/ToastProvider';

type LoginErrors = {
  email?: string;
  password?: string;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validateLoginForm = (email: string, password: string): LoginErrors => {
  const errors: LoginErrors = {};
  if (!email.trim()) {
    errors.email = '请输入邮箱';
  } else if (!emailPattern.test(email.trim())) {
    errors.email = '请输入有效的邮箱地址';
  }

  if (!password) {
    errors.password = '请输入密码';
  }

  return errors;
};

export default function Login() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<LoginErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validateLoginForm(email, password);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);
    const result = await authService.signInWithEmailPassword(email.trim(), password);
    setIsSubmitting(false);

    if (result.ok) {
      try {
        posthog.identify(result.userId || 'unknown');
        posthog.capture('user_signed_in', { method: 'email' });
      } catch (e) {}
      showToast('登录成功', 'success');
      navigate('/aquarium', { replace: true });
      return;
    }

    if (!('reason' in result)) return;

    try {
      posthog.capture('sign_in_failed', { reason: result.reason });
    } catch (e) {}

    if (result.reason === 'invalid_credentials') {
      setPassword('');
      setErrors({ password: '邮箱或密码错误' });
      return;
    }

    if (result.reason === 'missing_config') {
      showToast('登录服务未配置，请先设置 Supabase 环境变量', 'error');
      return;
    }

    showToast('网络错误，请稍后重试', 'error');
  };

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#dfe8e5] px-4 py-8 text-ink">
      <main className="w-full max-w-[460px] overflow-hidden rounded-[30px] border border-white/80 bg-white p-5 shadow-[0_24px_70px_rgba(27,77,62,0.14)]">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-accent text-white shadow-sm">
            <Droplets className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-[22px] font-black leading-tight">登录 AquaGuide</h1>
            <p className="mt-1 text-[12px] font-bold text-ink/48">同步你的鱼缸、收藏和养护记录。</p>
          </div>
        </div>

        <form className="grid gap-4" onSubmit={handleSubmit} noValidate>
          <div className="grid gap-1.5">
            <Label htmlFor="login-email" className="text-[12px] font-black text-ink/68">
              邮箱
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/32" />
              <Input
                id="login-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  if (errors.email) setErrors(prev => ({ ...prev, email: undefined }));
                }}
                disabled={isSubmitting}
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? 'login-email-error' : undefined}
                placeholder="you@example.com"
                className="h-12 rounded-[18px] border-border bg-bg pl-10 text-[15px] font-bold text-ink placeholder:text-ink/30"
              />
            </div>
            {errors.email && (
              <p id="login-email-error" className="px-1 text-[12px] font-bold text-red-600">{errors.email}</p>
            )}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="login-password" className="text-[12px] font-black text-ink/68">
              密码
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/32" />
              <Input
                id="login-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  if (errors.password) setErrors(prev => ({ ...prev, password: undefined }));
                }}
                disabled={isSubmitting}
                aria-invalid={Boolean(errors.password)}
                aria-describedby={errors.password ? 'login-password-error' : undefined}
                placeholder="输入密码"
                className="h-12 rounded-[18px] border-border bg-bg pl-10 text-[15px] font-bold text-ink placeholder:text-ink/30"
              />
            </div>
            {errors.password && (
              <p id="login-password-error" className="px-1 text-[12px] font-bold text-red-600">{errors.password}</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 h-12 w-full rounded-full bg-accent text-[15px] font-black text-white hover:bg-accent/90 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                登录中...
              </>
            ) : '登录'}
          </Button>
        </form>

        <p className="mt-5 rounded-[18px] bg-emerald-50 px-3 py-2 text-[11px] font-bold leading-relaxed text-emerald-800">
          当前版本仍支持未登录本地使用；登录后再逐步开启云端同步。
        </p>
      </main>
    </div>
  );
}
