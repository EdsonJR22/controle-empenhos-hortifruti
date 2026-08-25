import type { Metadata } from "next";
import Image from "next/image";
import { sanitizeReturnPath } from "../../lib/auth-core";

export const metadata: Metadata = {
  title: "Entrar",
  robots: { index: false, follow: false },
};

const errorMessages: Record<string, string> = {
  invalid: "Usuário ou senha inválidos.",
  request: "Não foi possível processar o login. Tente novamente.",
  configuration:
    "O acesso ainda não foi configurado no servidor. Defina os segredos de autenticação.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const errorKey = Array.isArray(params.error) ? params.error[0] : params.error;
  const requestedPath = Array.isArray(params.next) ? params.next[0] : params.next;
  const returnPath = sanitizeReturnPath(requestedPath);
  const error = errorKey ? errorMessages[errorKey] : "";

  return (
    <div className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <div className="login-brand">
          <span className="login-brand-mark" aria-hidden="true">
            <Image src="/simbolo-intendencia.svg" alt="" width={34} height={18} priority />
          </span>
          <span>
            <strong>HortiControl</strong>
            <small>Gestão de empenhos</small>
          </span>
        </div>

        <div className="login-heading">
          <span className="eyebrow">Acesso restrito</span>
          <h1 id="login-title">Entrar no sistema</h1>
          <p>Informe seu usuário e senha para visualizar e operar os empenhos.</p>
        </div>

        {error && (
          <div className="login-error" role="alert">
            {error}
          </div>
        )}

        <form className="login-form" action="/api/auth/login" method="post">
          <input type="hidden" name="next" value={returnPath} />
          <label className="field">
            <span>Usuário</span>
            <input
              type="text"
              name="username"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              maxLength={128}
              required
              autoFocus
            />
          </label>
          <label className="field">
            <span>Senha</span>
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              maxLength={512}
              required
            />
          </label>
          <button className="button button-primary login-submit" type="submit">
            Acessar sistema
          </button>
        </form>

        <p className="login-security-note">
          Sua sessão permanece ativa por até 12 horas neste navegador.
        </p>
      </section>
    </div>
  );
}
