import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AlertTriangle, AtSign, CheckCircle2, Eye, EyeOff, Leaf, Loader2, Lock, Mail, User } from "lucide-react";
import AeroWindow from "@/components/layout/AeroWindow";
import { useAuth } from "@/hooks/useAuth";
import { signIn, signUp } from "@/services/authService";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Supabase's default minimum password length
const MIN_PASSWORD_LENGTH = 6;
// 3-20 letters, numbers or underscores
const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,20}$/;

type FieldErrors = {
    fullName?: string;
    username?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
};

function SignInPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const [mode, setMode] = useState<"signin" | "signup">("signin");
    const [notice, setNotice] = useState<string | null>(null);
    const destination = (location.state as { from?: string } | null)?.from ?? "/explore";
    const [fullName, setFullName] = useState("");
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState<FieldErrors>({});
    const [formError, setFormError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Already signed in when arriving here. While a submit is in flight the handler navigates
    // itself, so the page change keeps its transition.
    useEffect(() => {
        if (user && !submitting) navigate(destination, { replace: true, viewTransition: true });
    }, [user, submitting, destination, navigate]);

    const validate = (): FieldErrors => {
        const next: FieldErrors = {};
        if (mode === "signup") {
            if (fullName.trim().length < 2) next.fullName = "Enter your display name.";
            if (!USERNAME_PATTERN.test(username.trim())) {
                next.username = "Use 3-20 letters, numbers or underscores.";
            }
        }
        if (!EMAIL_PATTERN.test(email.trim())) next.email = "Enter a valid email address.";
        if (password.length === 0) next.password = "Enter your password.";
        else if (mode === "signup" && password.length < MIN_PASSWORD_LENGTH) {
            next.password = `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
        }
        if (mode === "signup" && confirmPassword !== password) {
            next.confirmPassword = "Passwords don't match.";
        }
        return next;
    };

    const onSubmit = async (e: FormEvent) => {
        e.preventDefault();
        const found = validate();
        setErrors(found);
        setFormError(null);
        setNotice(null);
        if (Object.keys(found).length > 0) return;

        setSubmitting(true);
        try {
            if (mode === "signup") {
                const result = await signUp(email.trim(), password, {
                    fullName: fullName.trim(),
                    username: username.trim(),
                });
                if (result.signedIn) navigate(destination, { replace: true, viewTransition: true });
                else setNotice("Check your email to confirm your account, then sign in.");
            } else {
                await signIn(email.trim(), password);
                navigate(destination, { replace: true, viewTransition: true });
            }
        } catch (err) {
            setFormError(err instanceof Error ? err.message : "Couldn't sign you in. Try again.");
        } finally {
            setSubmitting(false);
        }
    };

    const signingUp = mode === "signup";

    return (
        <main className="aero-bg relative flex h-full items-center justify-center px-4 py-6 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-[calc(var(--bottom-nav-h)+env(safe-area-inset-bottom)+1.5rem)] md:pb-6">
            <span aria-hidden className="aero-bubble -right-10 top-20 size-40" />
            <span aria-hidden className="aero-bubble left-4 top-1/3 size-16" />
            <span aria-hidden className="aero-bubble bottom-24 right-6 size-24" />
            <span aria-hidden className="aero-bubble -left-8 bottom-10 size-32" />

            <AeroWindow title={signingUp ? "Create your EcoQuest account" : "Sign in to EcoQuest"} Icon={Leaf} as="h1" className="max-h-full w-full max-w-sm" bodyClassName="min-h-0 overflow-y-auto p-6">
                <div className="flex flex-col items-center text-center">
                    <span className="aero-gel flex size-16 items-center justify-center rounded-full">
                        <Leaf className="size-8" aria-hidden="true" />
                    </span>
                    <p className="mt-3 text-sm text-[#17334A]/80">Sign in to track your greener trips.</p>
                </div>

                <form onSubmit={onSubmit} noValidate className="mt-6 flex flex-col gap-4">
                    {notice && (
                        <div
                            role="status"
                            className="flex items-start gap-2 rounded-2xl border border-white/80 bg-white/70 px-3 py-2.5 text-sm font-medium"
                        >
                            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#208A5D]" aria-hidden="true" />
                            {notice}
                        </div>
                    )}
                    {formError && (
                        <div
                            role="alert"
                            className="flex items-start gap-2 rounded-2xl border border-white/80 bg-white/70 px-3 py-2.5 text-sm font-medium"
                        >
                            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[#c93a30]" aria-hidden="true" />
                            {formError}
                        </div>
                    )}

                    {signingUp && (
                        <>
                            <Field label="Display name" error={errors.fullName} htmlFor="signin-fullname">
                                <User className="size-5 shrink-0 text-[#17334A]/60" aria-hidden="true" />
                                <input
                                    id="signin-fullname"
                                    type="text"
                                    autoComplete="name"
                                    autoFocus
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    aria-invalid={!!errors.fullName}
                                    aria-describedby={errors.fullName ? "signin-fullname-error" : undefined}
                                    placeholder="Alex Green"
                                    className="min-w-0 flex-1 bg-transparent text-base text-[#17334A] outline-none placeholder:text-[#17334A]/45"
                                />
                            </Field>

                            <Field label="Username" error={errors.username} htmlFor="signin-username">
                                <AtSign className="size-5 shrink-0 text-[#17334A]/60" aria-hidden="true" />
                                <input
                                    id="signin-username"
                                    type="text"
                                    autoComplete="username"
                                    autoCapitalize="none"
                                    spellCheck={false}
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    aria-invalid={!!errors.username}
                                    aria-describedby={errors.username ? "signin-username-error" : undefined}
                                    placeholder="greenrunner"
                                    className="min-w-0 flex-1 bg-transparent text-base text-[#17334A] outline-none placeholder:text-[#17334A]/45"
                                />
                            </Field>
                        </>
                    )}

                    <Field label="Email" error={errors.email} htmlFor="signin-email">
                        <Mail className="size-5 shrink-0 text-[#17334A]/60" aria-hidden="true" />
                        <input
                            id="signin-email"
                            type="email"
                            inputMode="email"
                            autoComplete="email"
                            autoFocus={!signingUp}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            aria-invalid={!!errors.email}
                            aria-describedby={errors.email ? "signin-email-error" : undefined}
                            placeholder="you@example.com"
                            className="min-w-0 flex-1 bg-transparent text-base text-[#17334A] outline-none placeholder:text-[#17334A]/45"
                        />
                    </Field>

                    <Field label="Password" error={errors.password} htmlFor="signin-password">
                        <Lock className="size-5 shrink-0 text-[#17334A]/60" aria-hidden="true" />
                        <input
                            id="signin-password"
                            type={showPassword ? "text" : "password"}
                            autoComplete={signingUp ? "new-password" : "current-password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            aria-invalid={!!errors.password}
                            aria-describedby={errors.password ? "signin-password-error" : undefined}
                            placeholder="Your password"
                            className="min-w-0 flex-1 bg-transparent text-base text-[#17334A] outline-none placeholder:text-[#17334A]/45"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword((v) => !v)}
                            aria-label={showPassword ? "Hide password" : "Show password"}
                            aria-pressed={showPassword}
                            className="flex size-9 shrink-0 items-center justify-center rounded-full text-[#17334A]/70 hover:bg-white/60"
                        >
                            {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                        </button>
                    </Field>

                    {signingUp && (
                        <Field label="Confirm password" error={errors.confirmPassword} htmlFor="signin-confirm">
                            <Lock className="size-5 shrink-0 text-[#17334A]/60" aria-hidden="true" />
                            <input
                                id="signin-confirm"
                                type={showPassword ? "text" : "password"}
                                autoComplete="new-password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                aria-invalid={!!errors.confirmPassword}
                                aria-describedby={errors.confirmPassword ? "signin-confirm-error" : undefined}
                                placeholder="Re-enter your password"
                                className="min-w-0 flex-1 bg-transparent text-base text-[#17334A] outline-none placeholder:text-[#17334A]/45"
                            />
                        </Field>
                    )}

                    <button
                        type="submit"
                        disabled={submitting}
                        className="aero-gel mt-1 flex h-12 w-full items-center justify-center gap-2 rounded-full text-base font-semibold disabled:opacity-70"
                    >
                        {submitting && <Loader2 className="size-5 animate-spin" aria-hidden="true" />}
                        {submitting ? (signingUp ? "Creating account…" : "Signing in…") : signingUp ? "Create account" : "Sign in"}
                    </button>
                </form>

                <div className="mt-5 flex flex-col items-center gap-2 text-sm">
                    <button
                        type="button"
                        onClick={() => {
                            setMode(signingUp ? "signin" : "signup");
                            setErrors({});
                            setFormError(null);
                            setNotice(null);
                        }}
                        className="font-semibold text-[#17334A] hover:underline"
                    >
                        {signingUp ? "Have an account? Sign in" : "New here? Create an account"}
                    </button>
                    <Link to="/explore" viewTransition className="font-semibold text-[#208A5D] hover:underline">
                        Continue as guest
                    </Link>
                </div>
            </AeroWindow>
        </main>
    );
}

function Field({
    label,
    error,
    htmlFor,
    children,
}: {
    label: string;
    error?: string;
    htmlFor: string;
    children: React.ReactNode;
}) {
    return (
        <div>
            <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-semibold">
                {label}
            </label>
            <div
                className={`aero-input flex h-12 items-center gap-2 rounded-full px-4 ${
                    error ? "!border-[#c93a30]" : ""
                }`}
            >
                {children}
            </div>
            {error && (
                <p id={`${htmlFor}-error`} className="mt-1.5 px-2 text-xs font-medium text-[#c93a30]">
                    {error}
                </p>
            )}
        </div>
    );
}

export default SignInPage;
