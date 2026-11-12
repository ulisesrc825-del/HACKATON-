import { useEffect, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { ArrowLeft, ArrowRight, BadgeCheck, CheckCircle2, Eye, EyeOff, IdCard, Info, Lock, Mail, ShieldCheck } from 'lucide-react';
import { api, errorMessage } from '../services/api';
import type { AuthConfig } from '../services/api';
import type { UserProfile, UserRole } from '../types/warehouse';

const roles: Record<UserRole, string> = { student: 'Alumno', teacher: 'Docente', technician: 'Técnico', admin: 'Administrador' };
type Step = 'login' | 'recovery' | 'reset' | 'identity' | 'verify' | 'activate';
const university = 'Universidad Politécnica de Texcoco';
const institutionalSite = 'https://uptexcoco.edomex.gob.mx';
const regulations = institutionalSite + '/sites/uptexcoco.edomex.gob.mx/files/files/transparencia/reglamento%20lab_uptex.pdf';
const privacy = institutionalSite + '/aviso_privacidad';
const fieldClass = 'h-12 w-full rounded-xl border border-slate-200 bg-[#eef0fb] px-3 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-[#007A33]';
const primaryClass = 'flex w-full items-center justify-center gap-2 rounded-xl bg-[#007A33] px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#00682b] disabled:opacity-60 cursor-pointer';
const linkClass = 'text-[#007A33] font-semibold hover:underline cursor-pointer';

interface Props {
  onLogin: (user: UserProfile) => void;
  initialConfig?: AuthConfig;
  initialError: string;
  preview?: boolean;
}

function Field({ id, label, icon, aside, children, action }: {
  id: string; label: string; icon: ReactNode; aside?: ReactNode; children: ReactNode; action?: ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 mb-1.5">
        <label htmlFor={id} className="text-sm font-semibold">{label}</label>
        {aside && <div className="text-xs text-slate-600">{aside}</div>}
      </div>
      <div className="relative [&>input]:pl-10 [&>input]:pr-10">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#007A33]">{icon}</span>
        {children}
        {action}
      </div>
    </div>
  );
}

interface Recaptcha {
  render: (element: HTMLElement, options: {
    sitekey: string; callback: (token: string) => void;
    'expired-callback': () => void; 'error-callback': () => void;
  }) => number;
}

type RecaptchaWindow = Window & { grecaptcha?: Recaptcha; onUPTexCaptchaReady?: () => void };
let captchaScript: Promise<Recaptcha> | undefined;

function loadCaptcha() {
  const browser = window as RecaptchaWindow;
  if (browser.grecaptcha?.render) return Promise.resolve(browser.grecaptcha);
  if (!captchaScript) {
    captchaScript = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      browser.onUPTexCaptchaReady = () => {
        delete browser.onUPTexCaptchaReady;
        if (browser.grecaptcha?.render) resolve(browser.grecaptcha);
        else reject(new Error('reCAPTCHA no está disponible.'));
      };
      script.src = 'https://www.google.com/recaptcha/api.js?onload=onUPTexCaptchaReady&render=explicit&hl=es';
      script.async = true;
      script.onerror = () => {
        delete browser.onUPTexCaptchaReady;
        script.remove();
        captchaScript = undefined;
        reject(new Error('No se pudo cargar reCAPTCHA. Recarga la página.'));
      };
      document.head.append(script);
    });
  }
  return captchaScript;
}

function Captcha({ siteKey, onChange }: { siteKey: string; onChange: (token: string) => void }) {
  const holder = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const container = holder.current;
    if (!container) return;
    let mounted = true;
    const widget = document.createElement('div');
    container.append(widget);
    loadCaptcha().then(captcha => {
      if (!mounted) return;
      captcha.render(widget, {
        sitekey: siteKey, callback: onChange,
        'expired-callback': () => onChange(''),
        'error-callback': () => { onChange(''); setError('No se pudo verificar reCAPTCHA.'); },
      });
    }).catch(cause => { if (mounted) setError(errorMessage(cause)); });
    return () => {
      mounted = false;
      widget.remove();
    };
  }, [siteKey, onChange]);
  return <div className="mx-auto w-fit max-w-full overflow-x-auto"><div ref={holder} />{error && <p role="alert">{error}</p>}</div>;
}

export function LoginScreenUPTex({ onLogin, initialConfig, initialError, preview = false }: Props) {
  const [config, setConfig] = useState(initialConfig);
  const [step, setStep] = useState<Step>('login');
  const [identifier, setIdentifier] = useState('');
  const [matricula, setMatricula] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [remember, setRemember] = useState(true);
  const [visible, setVisible] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [challengeId, setChallengeId] = useState('');
  const [code, setCode] = useState<string[]>(Array(6).fill(''));
  const [token, setToken] = useState('');
  const [captchaVersion, setCaptchaVersion] = useState(0);
  const [error, setError] = useState(initialError);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const codeInputs = useRef<(HTMLInputElement | null)[]>([]);
  const longEnough = [...password].length >= 6;
  const hasSymbol = /[\p{N}\p{P}\p{S}]/u.test(password);
  const isSetup = step === 'reset' || step === 'activate';
  const showCaptcha = step === 'login' || step === 'recovery' || step === 'activate';

  useEffect(() => {
    if (!preview && !initialConfig) api.authConfig().then(setConfig).catch(() => {});
  }, [initialConfig, preview]);

  function go(next: Step) {
    setStep(next);
    setError('');
    setNotice('');
    setPassword('');
    setConfirmation('');
    setVisible(false);
    setToken('');
    setAccepted(false);
  }

  async function run(work: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await work();
    } catch (cause) {
      setError(errorMessage(cause));
      setToken('');
      setCaptchaVersion(version => version + 1);
    } finally {
      setBusy(false);
    }
  }

  async function sendCode(purpose: 'activation' | 'recovery') {
    const result = await api.sendCode({ email, purpose, matricula, captchaToken: token });
    setChallengeId(result.challengeId);
    setCode(Array(6).fill(''));
    go(purpose === 'activation' ? 'verify' : 'reset');
    setNotice(config?.mailMode === 'console' ? 'Consulta el código de demostración en la terminal de la API.'
      : 'Si los datos corresponden a una cuenta habilitada, recibirás un código válido por 5 minutos.');
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void run(async () => {
      if (step === 'login') return onLogin(await api.login({ identifier, password, remember, captchaToken: token }));
      if (step === 'recovery' || step === 'identity') return sendCode(step === 'recovery' ? 'recovery' : 'activation');
      if (step === 'verify') {
        await api.verifyCode(challengeId, code.join(''));
        return go('activate');
      }
      if (password !== confirmation) throw new Error('Las contraseñas deben coincidir.');
      onLogin(await api.setPassword({ challengeId, code: code.join(''), password, accepted, captchaToken: token }));
    });
  }

  function enterCode(index: number, value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 6);
    setCode(current => {
      const next = [...current];
      if (digits.length > 1) {
        const start = digits.length === 6 ? 0 : index;
        [...digits].forEach((digit, offset) => { if (start + offset < 6) next[start + offset] = digit; });
      } else next[index] = digits;
      return next;
    });
    if (digits) codeInputs.current[Math.min(5, digits.length === 6 ? 5 : index + digits.length)]?.focus();
  }

  const title = {
    login: 'Inventario UPTex', recovery: 'Recuperar Contraseña', reset: 'Nueva Contraseña',
    identity: 'Inventario UPTex', verify: 'Verifica tu Identidad', activate: 'Configura tu Acceso',
  }[step];
  const description = {
    login: 'Inicio de Sesión Institucional', recovery: 'Ingresa tu correo institucional para recibir un código de restablecimiento.',
    reset: 'Ingresa el código de 6 dígitos enviado a tu correo y define tu nueva clave de acceso.',
    identity: 'Activación de Cuenta Institucional', verify: 'Ingresa el código de 6 dígitos enviado a tu correo institucional.', activate: '',
  }[step];
  const submitLabel = {
    login: 'Iniciar Sesión', recovery: 'Enviar Código de Recuperación', reset: 'Actualizar Contraseña y Entrar',
    identity: 'Verificar Identidad', verify: 'Verificar Código', activate: 'Activar Cuenta y Entrar',
  }[step];
  const back = step === 'reset' ? 'recovery' : step === 'verify' ? 'identity' : step === 'activate' ? 'verify' : 'login';

  return (
    <div className="flex min-h-screen flex-col bg-[#f7f7fc] text-slate-900">
      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:py-16">
        <div className="w-full max-w-[540px]">
          <section className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-xl shadow-slate-900/5 sm:p-8">
            {step !== 'login' && (
              <button type="button" onClick={() => go(back)} disabled={busy} className={`mb-5 flex items-center gap-1.5 text-xs ${linkClass}`}>
                <ArrowLeft size={16} />
                {back === 'login' ? 'Volver al inicio de sesión' : step === 'reset' ? 'Cambiar correo' : 'Volver al paso anterior'}
              </button>
            )}
            <header className={`mb-7 ${step === 'reset' || step === 'verify' ? '' : 'text-center'}`}>
              {step === 'login' && <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#eef0fb] px-3 py-1.5 text-xs font-bold">
                <BadgeCheck size={19} className="text-[#007A33]" /> UPTex · Portal Oficial
              </span>}
              {step === 'identity' && <div className="mb-4 inline-flex rounded-xl border border-slate-200 bg-slate-100 px-5 py-2.5">
                <img src="/assets/uptex.png" width="80" height="54" alt={university} />
              </div>}
              {(step === 'reset' || step === 'recovery') && <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-red-800">{university}</p>}
              <h1 className={`font-extrabold tracking-tight ${step === 'login' ? 'text-4xl' : 'text-2xl sm:text-3xl'}`}>{title}</h1>
              {description && <p className="mt-1 text-sm text-slate-600">{description}</p>}
            </header>

            {error && <p role="alert" className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p>}
            {notice && <p role="status" className="mb-4 text-xs text-slate-600">{notice}</p>}

            {preview && <p className="mb-5 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              <strong>Vista previa.</strong> El acceso y el inventario requieren conectar la API con MariaDB.
            </p>}
            <form onSubmit={event => { if (preview) event.preventDefault(); else submit(event); }} className="space-y-5" aria-busy={busy}>
              <fieldset disabled={preview} className="space-y-5">
              {step === 'login' && <>
                <Field id="identifier" label="Matrícula o Correo Institucional" icon={<IdCard size={17} />}>
                  <input id="identifier" autoComplete="username" className={fieldClass} value={identifier} required maxLength={120}
                    onChange={event => setIdentifier(event.target.value)} placeholder="Ej. 232211045 o al232211045@uptex.edu.mx" />
                </Field>
                <p className="-mt-3 flex items-center gap-1.5 text-xs text-slate-600"><Info size={14} /> Usa tus credenciales institucionales activadas.</p>
              </>}
              {step === 'identity' && <Field id="matricula" label="Matrícula" icon={<IdCard size={17} />}>
                <input id="matricula" autoComplete="username" className={fieldClass} value={matricula} required maxLength={20}
                  onChange={event => setMatricula(event.target.value)} placeholder="Matrícula emitida por la universidad" />
              </Field>}
              {(step === 'identity' || step === 'recovery') && <Field id="email" label="Correo Institucional" icon={<Mail size={17} />} aside="Oficial UPTEX">
                <input id="email" type="email" autoComplete="email" className={fieldClass} value={email} required maxLength={120}
                  onChange={event => setEmail(event.target.value)} placeholder="usuario@uptex.edu.mx" />
              </Field>}
              {(step === 'reset' || step === 'verify') && <>
                <p className="inline-flex max-w-full items-center gap-2 rounded-full bg-lime-50 px-3 py-1.5 text-xs text-green-900 break-all">
                  <Mail size={15} className="shrink-0" /> Correo institucional · {email}
                </p>
                <fieldset>
                  <legend className="sr-only">Código de verificación</legend>
                  <div className="mb-2 flex justify-between gap-2 text-sm font-semibold">
                    <span>Código de Verificación</span>
                    <button type="button" disabled={busy} className={linkClass}
                      onClick={() => step === 'reset' && config?.captchaSiteKey ? go('recovery') : void run(() => sendCode(step === 'verify' ? 'activation' : 'recovery'))}>
                      Reenviar código
                    </button>
                  </div>
                  <div className="grid grid-cols-6 gap-2" onPaste={event => {
                    event.preventDefault();
                    enterCode(0, event.clipboardData.getData('text'));
                  }}>
                    {code.map((digit, index) => <input key={index} ref={element => { codeInputs.current[index] = element; }}
                      aria-label={`Dígito ${index + 1}`} inputMode="numeric" autoComplete={index === 0 ? 'one-time-code' : 'off'}
                      required pattern="[0-9]" value={digit} onFocus={event => event.target.select()}
                      onChange={event => enterCode(index, event.target.value)}
                      onKeyDown={event => { if (event.key === 'Backspace' && !digit) codeInputs.current[index - 1]?.focus(); }}
                      className={`${fieldClass} min-w-0 px-0 text-center font-mono font-bold`} />)}
                  </div>
                </fieldset>
              </>}
              {step === 'activate' && <p className="inline-flex items-center gap-2 rounded-full bg-lime-50 px-3 py-1.5 text-xs text-green-900">
                <BadgeCheck size={16} /> Matrícula {matricula} · Identidad verificada
              </p>}
              {(step === 'login' || isSetup) && <Field id="password"
                label={step === 'activate' ? 'Crea tu Contraseña o PIN' : step === 'reset' ? 'Nueva Contraseña o PIN' : 'Contraseña o PIN'}
                icon={<Lock size={17} />}
                aside={step === 'login'
                  ? <button type="button" disabled={busy} onClick={() => go('recovery')} className={linkClass}>¿Olvidaste tu contraseña?</button>
                  : 'Mínimo 6 caracteres'}
                action={<button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 cursor-pointer"
                  aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'} onClick={() => setVisible(value => !value)}>
                  {visible ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>}>
                <input id="password" type={visible ? 'text' : 'password'} autoComplete={isSetup ? 'new-password' : 'current-password'}
                  required minLength={isSetup ? 6 : undefined} className={fieldClass + (step === 'activate' ? ' bg-white' : '')} value={password}
                  onChange={event => setPassword(event.target.value)} placeholder={isSetup ? 'Introduce tu clave segura' : 'Introduce tu clave de acceso'} />
              </Field>}
              {isSetup && <>
                <div className="-mt-2 space-y-2 text-xs text-slate-600">
                  <div className="grid grid-cols-4 gap-2" aria-hidden="true">
                    {[Boolean(password), longEnough, longEnough && hasSymbol, longEnough && hasSymbol && password.length >= 12].map((filled, index) =>
                      <span key={index} className={`h-1.5 rounded-full ${filled ? 'bg-lime-400' : 'bg-slate-200'}`} />)}
                  </div>
                  <p className="flex flex-wrap gap-3"><span>{longEnough ? '✓' : '○'} 6+ caracteres</span><span>{hasSymbol ? '✓' : '○'} Al menos un número o símbolo</span></p>
                </div>
                <Field id="confirmation" label="Confirmar Contraseña" icon={<ShieldCheck size={17} />}>
                  <input id="confirmation" type="password" autoComplete="new-password" className={fieldClass + (step === 'activate' ? ' bg-white' : '')} required value={confirmation}
                    onChange={event => setConfirmation(event.target.value)} placeholder="Repite tu contraseña exactamente" />
                </Field>
              </>}
              {step === 'activate' && <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
                <input id="regulations" type="checkbox" className="mt-1 accent-[#007A33]" required checked={accepted} onChange={event => setAccepted(event.target.checked)} />
                <div>
                  <label htmlFor="regulations">He leído y acepto el Reglamento de Laboratorios y Talleres y el Aviso de Privacidad.</label>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-red-800">
                    <a href={regulations} target="_blank" rel="noreferrer" className="hover:underline">Consultar reglamento</a>
                    <a href={privacy} target="_blank" rel="noreferrer" className="hover:underline">Consultar aviso</a>
                  </div>
                </div>
              </div>}
              {step === 'login' && <label className="flex items-center gap-2 text-sm font-semibold">
                <input type="checkbox" className="accent-[#007A33]" checked={remember} onChange={event => setRemember(event.target.checked)} />
                Mantener sesión iniciada
              </label>}
              {showCaptcha && config?.captchaSiteKey && <Captcha key={`${step}-${captchaVersion}`} siteKey={config.captchaSiteKey} onChange={setToken} />}
              <button type="submit" disabled={busy || (showCaptcha && !!config?.captchaSiteKey && !token)
                || (isSetup && (!longEnough || !hasSymbol))} className={primaryClass}>
                {busy ? 'Procesando…' : submitLabel}{isSetup ? <CheckCircle2 size={17} /> : <ArrowRight size={17} />}
              </button>
              </fieldset>
            </form>

            {step === 'login' && <div className="mt-6 border-t border-slate-200 pt-5 text-center text-sm text-slate-600">
              ¿Aún no activas tu cuenta?{' '}<button type="button" disabled={busy || preview} onClick={() => go('identity')} className={linkClass}>Actívala aquí</button>
              {!!config?.demoUsers.length && <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="mb-2 text-xs font-semibold">Acceso rápido · Demostración local</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {config.demoUsers.map(user => <button key={user.id} type="button" disabled={busy}
                    className="rounded-lg border border-emerald-200 bg-white px-2 py-1.5 text-xs font-semibold text-[#007A33] hover:bg-emerald-50 cursor-pointer"
                    onClick={() => void run(async () => onLogin(await api.login({ demoRole: user.role, remember })))}>{roles[user.role]}</button>)}
                </div>
              </div>}
            </div>}
            {step === 'identity' && <div className="mt-6 border-t border-slate-200 pt-4 text-center text-xs text-slate-600">
              ¿Ya activaste tu cuenta?{' '}<button type="button" onClick={() => go('login')} className={linkClass}>Inicia sesión aquí</button>
            </div>}
            {window.location.protocol === 'https:' && <p className="mt-5 flex justify-center gap-1.5 text-xs text-slate-500"><Lock size={14} /> Conexión cifrada</p>}
          </section>
        </div>
      </main>
      <footer className="border-t border-slate-200 bg-[#eef0fb] px-5 py-5 text-xs text-slate-600 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-wrap justify-between gap-3">
          <span>© 2024 {university}. Dirección de Laboratorios y Talleres.</span>
          <nav aria-label="Información institucional" className="flex flex-wrap gap-4 font-semibold">
            <a href={institutionalSite} className="hover:underline">{university}</a>
            <a href={regulations} className="hover:underline">Reglamento de Laboratorios y Talleres</a>
            <a href={privacy} className="hover:underline">Aviso de Privacidad</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
