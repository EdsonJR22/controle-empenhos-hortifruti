"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { initials } from "../lib/format";
import { Icon } from "./icon";

export function AppShell({
  children,
  displayName,
}: {
  children: React.ReactNode;
  displayName: string;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const inCommitment = pathname.startsWith("/empenhos/");
  const inArchived = pathname.startsWith("/arquivadas");

  return (
    <div className="app-shell">
      <button
        className="mobile-menu-button"
        type="button"
        aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
        aria-expanded={mobileOpen}
        onClick={() => setMobileOpen((value) => !value)}
      >
        <Icon name={mobileOpen ? "x" : "menu"} />
      </button>
      <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
        <Link className="brand" href="/" onClick={() => setMobileOpen(false)}>
          <span className="brand-mark"><Icon name="leaf" /></span>
          <span>
            <strong>HortiControl</strong>
            <small>Gestão de empenhos</small>
          </span>
        </Link>

        <nav className="main-nav" aria-label="Navegação principal">
          <p className="nav-label">Menu</p>
          <Link
            className={pathname === "/" ? "nav-link active" : "nav-link"}
            href="/"
            onClick={() => setMobileOpen(false)}
          >
            <Icon name="dashboard" />
            Visão geral
          </Link>
          <Link
            className={inCommitment ? "nav-link active" : "nav-link"}
            href="/#empenhos"
            onClick={() => setMobileOpen(false)}
          >
            <Icon name="file" />
            Empenhos
          </Link>
          <Link
            className={inArchived ? "nav-link active" : "nav-link"}
            href="/arquivadas"
            onClick={() => setMobileOpen(false)}
          >
            <Icon name="archive" />
            NEs arquivadas
          </Link>
        </nav>

        <div className="sidebar-status">
          <span className="status-dot" />
          <div>
            <strong>Dados sincronizados</strong>
            <small>Banco compartilhado</small>
          </div>
        </div>

        <div className="profile-card">
          <span className="avatar">{initials(displayName)}</span>
          <span>
            <strong>{displayName}</strong>
            <small>Acesso operacional</small>
          </span>
        </div>
      </aside>
      {mobileOpen && (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Fechar menu"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <main className="app-main">{children}</main>
    </div>
  );
}
