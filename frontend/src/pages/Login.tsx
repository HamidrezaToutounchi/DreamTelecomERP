import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { Lock, Mail, ArrowRight, ShieldCheck, UserCheck } from 'lucide-react';
import { useAuthControllerLogin } from '@/api/generated';
import { useAuth, User } from '@/context/AuthContext';
import { DreamLogo, DreamBarsIllustration } from '@/components/common/DreamLogo';

const loginSchema = z.object({
  email: z.string().email('Geçerli bir e-posta adresi giriniz.'),
  password: z.string().min(6, 'Parola en az 6 karakter olmalıdır.'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const loginMutation = useAuthControllerLogin();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: 'manager@dreamtelecom.com',
      password: 'Dream123!',
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    try {
      const response = await loginMutation.mutateAsync({
        data: values,
      });

      if (response && response.accessToken && response.user) {
        login(response.accessToken, response.user as User);
        toast.success(`Hoş geldiniz, ${response.user.fullName}`);
        navigate({ to: '/dashboard' });
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Giriş yapılamadı. Bilgilerinizi kontrol ediniz.');
    }
  };

  const quickFill = (email: string) => {
    setValue('email', email);
    setValue('password', 'Dream123!');
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[#F6F8FB] dark:bg-[#0B1220]">
      <div className="w-full max-w-md bg-white dark:bg-[#111A2E] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-8 relative overflow-hidden">
        {/* Zarif 3'lü bar motifi SVG illüstrasyonu */}
        <div className="absolute -top-6 -right-6 pointer-events-none">
          <DreamBarsIllustration className="w-32 h-32 opacity-20" />
        </div>

        <div className="flex flex-col items-center text-center mb-8">
          <DreamLogo size="lg" />
          <h1 className="text-xl font-bold text-slate-900 dark:text-white mt-4">
            Sisteme Giriş Yapın
          </h1>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs">
            Satış & Dağıtım Yönetim Sistemi (SDYS) kurumsal CRM platformu
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Kurumsal E-posta
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                {...register('email')}
                placeholder="ornek@dreamtelecom.com"
                className="w-full h-11 pl-10 pr-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600 transition-all"
              />
            </div>
            {errors.email && (
              <p className="text-xs text-red-600 font-medium">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Parola
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                {...register('password')}
                placeholder="••••••••"
                className="w-full h-11 pl-10 pr-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600 transition-all"
              />
            </div>
            {errors.password && (
              <p className="text-xs text-red-600 font-medium">{errors.password.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting || loginMutation.isPending}
            className="w-full h-12 mt-2 bg-navy-700 hover:bg-navy-800 text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs disabled:opacity-50"
          >
            {isSubmitting || loginMutation.isPending ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Giriş Yap</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Hızlı Demo Giriş Butonları */}
        <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-center mb-3">
            Hızlı Test Rolleri
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => quickFill('manager@dreamtelecom.com')}
              className="flex items-center justify-center gap-1.5 p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:border-navy-600 transition-colors cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-navy-600 dark:text-navy-400" />
              Satış Müdürü
            </button>
            <button
              type="button"
              onClick={() => quickFill('can@dreamtelecom.com')}
              className="flex items-center justify-center gap-1.5 p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:border-teal-600 transition-colors cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              Satış Temsilcisi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
