import { ArrowRight, Building2, LogIn, Mail, ShieldCheck, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { AuthHeader, AuthLayout } from "../components/AuthLayout";
import { Button } from "../components/Button";
import { FormField } from "../components/FormField";
import { PasswordInput } from "../components/PasswordInput";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { useToast } from "../contexts/ToastContext";
import { getAuthErrorMessage } from "../services/authErrors";

const demoAccounts = [
  { role: "super-admin", email: "super@ain.test", icon: ShieldCheck },
  { role: "tenant-admin", email: "admin@techcorp.test", icon: Building2 },
  { role: "end-user", email: "employee@techcorp.test", icon: UserRound },
  { role: "student", email: "student@ain.test", icon: UserRound }
];

export function LoginPage() {
  const { user, login } = useAuth();
  const { language, t } = useLanguage();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({ email: "", password: "", remember: true });
  const [touched, setTouched] = useState({});
  const [loading, setLoading] = useState(false);
  const [demoOpen, setDemoOpen] = useState(true);
  const errors = {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) ? "" : t.validation.email,
    password: form.password.length >= 8 ? "" : t.validation.password
  };
  const isValid = !errors.email && !errors.password;

  useEffect(() => {
    const selected = demoAccounts.find((account) => account.role === searchParams.get("role"));
    if (selected) setForm({ email: selected.email, password: "12345678", remember: true });
  }, [searchParams]);

  if (user) return <Navigate to={getSafeDestination(location.state?.from, user)} replace />;

  const submit = async (event) => {
    event.preventDefault();
    setTouched({ email: true, password: true });
    if (!isValid) return;
    setLoading(true);
    try {
      const nextUser = await login(form);
      showToast(t.auth.loginSuccess);
      navigate(getSafeDestination(location.state?.from, nextUser), { replace: true });
    } catch (error) {
      showToast(getAuthErrorMessage(error, t), "danger");
    } finally {
      setLoading(false);
    }
  };

  const chooseDemo = (account) => {
    setForm({ email: account.email, password: "12345678", remember: true });
    setTouched({});
  };

  const roleLabel = (role) => ({
    "super-admin": t.auth.superAdmin,
    "tenant-admin": t.auth.companyAdmin,
    "end-user": t.auth.endUser,
    student: language === "ar" ? "طالب" : "Student"
  })[role];

  return (
    <AuthLayout>
      <div className="auth-panel-card">
        <AuthHeader icon={<LogIn size={23} />} title={t.auth.signIn} subtitle={t.auth.signInSubtitle} />
        <form className="auth-form" onSubmit={submit} noValidate>
          <FormField label={t.common.email} error={touched.email ? errors.email : ""}>
            <div className="auth-input-wrap">
              <Mail size={18} aria-hidden="true" />
              <input
                type="email"
                autoComplete="email"
                value={form.email}
                onBlur={() => setTouched((current) => ({ ...current, email: true }))}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                placeholder="name@company.com"
                aria-invalid={Boolean(touched.email && errors.email)}
              />
            </div>
          </FormField>
          <FormField label={t.common.password} error={touched.password ? errors.password : ""}>
            <PasswordInput
              value={form.password}
              onBlur={() => setTouched((current) => ({ ...current, password: true }))}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              placeholder="••••••••"
              aria-invalid={Boolean(touched.password && errors.password)}
            />
          </FormField>

          <div className="auth-form-row">
            <label className="auth-check">
              <input type="checkbox" checked={form.remember} onChange={(event) => setForm((current) => ({ ...current, remember: event.target.checked }))} />
              <span>{t.auth.remember}</span>
            </label>
            <Link to="/forgot-password">{t.auth.forgot}</Link>
          </div>

          <Button className="auth-submit" type="submit" disabled={loading || !isValid} aria-busy={loading}>
            {loading ? t.auth.signingIn : t.auth.signIn}
            <ArrowRight className={language === "ar" ? "icon-flip" : ""} size={18} />
          </Button>

          <div className="auth-switch"><span>{t.auth.noAccount}</span><Link to="/create-account">{t.auth.createAccount}</Link></div>
        </form>

        <div className="demo-access">
          <button type="button" className="demo-access-toggle" onClick={() => setDemoOpen((current) => !current)} aria-expanded={demoOpen}>
            <span><ShieldCheck size={17} /> {t.auth.testAccounts}</span>
            <small>{demoOpen ? "−" : "+"}</small>
          </button>
          {demoOpen && (
            <div className="demo-access-content">
              <p>{t.auth.testHint}</p>
              <div className="demo-account-grid">
                {demoAccounts.map((account) => {
                  const Icon = account.icon;
                  return (
                    <button type="button" key={account.role} onClick={() => chooseDemo(account)} className={form.email === account.email ? "selected" : ""}>
                      <Icon size={18} />
                      <span><strong>{roleLabel(account.role)}</strong><small dir="ltr">{account.email}</small></span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </AuthLayout>
  );
}

export function getRoleHome(role) {
  if (role === "super-admin") return "/super-admin/dashboard";
  return "/workspaces?auto=1";
}

function getSafeDestination(requestedPath, user) {
  if (requestedPath?.startsWith("/invite/")) return requestedPath;
  if (user.role === "end-user" && user.tenantId === null) return "/no-workspace";
  const rolePrefix = `/${user.role}`;
  return requestedPath?.startsWith(rolePrefix) ? requestedPath : getRoleHome(user.role);
}
