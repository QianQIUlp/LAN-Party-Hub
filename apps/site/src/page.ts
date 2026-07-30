import { links, siteCopy, type Locale } from "./content.js";

const routeByLocale: Record<Locale, string> = {
  en: "/",
  zh: "/zh/"
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function externalLink(href: string, label: string, className: string): string {
  return `<a class="${className}" href="${href}" target="_blank" rel="noreferrer">${escapeHtml(label)}<span aria-hidden="true">↗</span></a>`;
}

export function renderMeta(locale: Locale, siteUrl: string, notFound = false): string {
  const content = siteCopy[locale];
  const canonical = `${siteUrl}${notFound ? "/404.html" : routeByLocale[locale]}`;
  const englishUrl = `${siteUrl}/`;
  const chineseUrl = `${siteUrl}/zh/`;
  const title = notFound ? `${content.notFound.title} — LAN Party Hub` : content.meta.title;
  const description = notFound ? content.notFound.body : content.meta.description;

  return [
    `<meta name="theme-color" content="#19d3c5" />`,
    `<meta name="color-scheme" content="dark" />`,
    `<meta name="description" content="${escapeHtml(description)}" />`,
    `<meta name="robots" content="${notFound ? "noindex, follow" : "index, follow"}" />`,
    `<link rel="canonical" href="${canonical}" />`,
    `<link rel="alternate" hreflang="en" href="${englishUrl}" />`,
    `<link rel="alternate" hreflang="zh-CN" href="${chineseUrl}" />`,
    `<link rel="alternate" hreflang="x-default" href="${englishUrl}" />`,
    `<link rel="manifest" href="/site.webmanifest" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="LAN Party Hub" />`,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    `<meta property="og:url" content="${canonical}" />`,
    `<meta property="og:locale" content="${locale === "zh" ? "zh_CN" : "en_US"}" />`,
    `<meta property="og:locale:alternate" content="${locale === "zh" ? "en_US" : "zh_CN"}" />`,
    `<meta property="og:image" content="${siteUrl}/og.png" />`,
    `<meta property="og:image:width" content="1729" />`,
    `<meta property="og:image:height" content="910" />`,
    `<meta property="og:image:alt" content="LAN Party Hub — one shared screen and phone controllers" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
    `<meta name="twitter:image" content="${siteUrl}/og.png" />`,
    `<title>${escapeHtml(title)}</title>`
  ].join("\n    ");
}

function renderPartyDiagram(locale: Locale): string {
  const demo = siteCopy[locale].demo;

  return `
    <figure class="party-diagram" aria-label="${escapeHtml(demo.aria)}">
      <div class="party-diagram__bar">
        <div class="window-lights" aria-hidden="true"><span></span><span></span><span></span></div>
        <span>${escapeHtml(demo.title)}</span>
        <strong><i aria-hidden="true"></i>${escapeHtml(demo.status)}</strong>
      </div>
      <div class="party-diagram__room">
        <div class="host-screen">
          <div class="host-screen__header">
            <div><span>${escapeHtml(demo.roomLabel)}</span><strong>${escapeHtml(demo.roomCode)}</strong></div>
            <div class="qr-mark" aria-hidden="true"></div>
          </div>
          <div class="host-screen__copy">
            <span>${escapeHtml(demo.connected)}</span>
            <h2>${escapeHtml(demo.screenTitle)}</h2>
            <p>${escapeHtml(demo.screenHint)}</p>
          </div>
          <div class="player-row">
            <div><i aria-hidden="true">M</i><span>${escapeHtml(demo.playerOne)}</span><strong>${escapeHtml(demo.ready)}</strong></div>
            <div><i aria-hidden="true">L</i><span>${escapeHtml(demo.playerTwo)}</span><strong>${escapeHtml(demo.ready)}</strong></div>
          </div>
        </div>
        <div class="signal signal--left" aria-hidden="true"><span></span><i></i></div>
        <div class="signal signal--right" aria-hidden="true"><span></span><i></i></div>
        <div class="phone phone--left">
          <span>${escapeHtml(demo.phoneLabel)}</span>
          <div class="phone__action phone__action--tap">${escapeHtml(demo.phoneActionOne)}</div>
          <small>${escapeHtml(demo.playerOne)}</small>
        </div>
        <div class="phone phone--right">
          <span>${escapeHtml(demo.phoneLabel)}</span>
          <div class="phone__action phone__action--draw" aria-hidden="true"><i></i><b></b></div>
          <small>${escapeHtml(demo.phoneActionTwo)} · ${escapeHtml(demo.playerTwo)}</small>
        </div>
      </div>
      <figcaption><span aria-hidden="true">●</span>${escapeHtml(demo.caption)}</figcaption>
    </figure>`;
}

export function renderPage(locale: Locale): string {
  const content = siteCopy[locale];
  const homeHref = routeByLocale[locale];
  const languageHref = locale === "zh" ? "/" : "/zh/";
  const languageCode = locale === "zh" ? "en" : "zh-CN";

  const facts = content.facts
    .map(
      (fact) => `<div class="fact">
        <span>${escapeHtml(fact.label)}</span>
        <strong>${escapeHtml(fact.value)}</strong>
        <small>${escapeHtml(fact.detail)}</small>
      </div>`
    )
    .join("");

  const steps = content.workflow.steps
    .map(
      (step, index) => `<li class="step">
        <div class="step__number" aria-hidden="true">${String(index + 1).padStart(2, "0")}</div>
        <div class="step__line" aria-hidden="true"><span></span></div>
        <div class="step__copy">
          <span>${escapeHtml(step.label)}</span>
          <h3>${escapeHtml(step.title)}</h3>
          <p>${escapeHtml(step.body)}</p>
          <small>${escapeHtml(step.note)}</small>
        </div>
      </li>`
    )
    .join("");

  const games = content.games.items
    .map(
      (game, index) => `<article class="game-card game-card--${game.tone}">
        <div class="game-card__top">
          <span class="game-card__index">${String(index + 1).padStart(2, "0")}</span>
          <span class="game-card__glyph" aria-hidden="true">${game.glyph}</span>
          <code>${game.id}</code>
        </div>
        <h3>${escapeHtml(game.name)}</h3>
        <p>${escapeHtml(game.description)}</p>
        <dl>
          <div><dt>${escapeHtml(content.games.playersLabel)}</dt><dd>${escapeHtml(game.players)}</dd></div>
          <div><dt>${escapeHtml(content.games.durationLabel)}</dt><dd>${escapeHtml(game.duration)}</dd></div>
        </dl>
      </article>`
    )
    .join("");

  const architectureNodes = content.architecture.nodes
    .map(
      (node, index) => `<article class="architecture-node">
        <span>${escapeHtml(node.kind)}</span>
        <div class="architecture-node__number" aria-hidden="true">0${index + 1}</div>
        <h3>${escapeHtml(node.title)}</h3>
        <p>${escapeHtml(node.body)}</p>
        ${index < content.architecture.nodes.length - 1 ? '<i aria-hidden="true">→</i>' : ""}
      </article>`
    )
    .join("");

  const boundaries = content.boundary.items
    .map(
      (item) => `<article><span aria-hidden="true">×</span><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.body)}</p></article>`
    )
    .join("");

  return `
    <a class="skip-link" href="#main">${escapeHtml(content.skipLink)}</a>
    <header class="site-header">
      <div class="header-inner page-shell">
        <a class="wordmark" href="${homeHref}" aria-label="${escapeHtml(content.homeLabel)}">
          <span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
          <span>LAN Party Hub</span>
        </a>
        <nav class="primary-nav" aria-label="${escapeHtml(content.navigation.aria)}">
          <a href="#workflow">${escapeHtml(content.navigation.workflow)}</a>
          <a href="#games">${escapeHtml(content.navigation.games)}</a>
          <a href="#architecture">${escapeHtml(content.navigation.architecture)}</a>
          <a href="#source">${escapeHtml(content.navigation.source)}</a>
        </nav>
        <a class="language-link" href="${languageHref}" lang="${languageCode}" hreflang="${languageCode}">${escapeHtml(content.languageLabel)}</a>
      </div>
    </header>

    <main id="main">
      <section class="hero page-shell" aria-labelledby="hero-title">
        <div class="hero__copy">
          <p class="eyebrow"><span aria-hidden="true"></span>${escapeHtml(content.hero.eyebrow)}</p>
          <h1 id="hero-title"><span>${escapeHtml(content.hero.titleLead)}</span><strong>${escapeHtml(content.hero.titleEmphasis)}</strong></h1>
          <p class="hero__body">${escapeHtml(content.hero.body)}</p>
          <div class="hero__actions">
            ${externalLink(links.releases, content.hero.downloadAction, "button button--primary")}
            ${externalLink(links.repository, content.hero.sourceAction, "button button--secondary")}
          </div>
          <p class="release-note"><span aria-hidden="true">i</span>${escapeHtml(content.hero.releaseNote)}</p>
        </div>
        ${renderPartyDiagram(locale)}
      </section>

      <section class="fact-strip" aria-label="${escapeHtml(content.factsLabel)}">
        <div class="fact-strip__inner page-shell">${facts}</div>
      </section>

      <section class="section workflow page-shell" id="workflow">
        <div class="section-heading section-heading--split">
          <div><p class="eyebrow">${escapeHtml(content.workflow.eyebrow)}</p><h2>${escapeHtml(content.workflow.title)}</h2></div>
          <p>${escapeHtml(content.workflow.intro)}</p>
        </div>
        <ol class="steps">${steps}</ol>
      </section>

      <section class="section games-section" id="games">
        <div class="page-shell">
          <div class="section-heading section-heading--split section-heading--games">
            <div><p class="eyebrow eyebrow--light">${escapeHtml(content.games.eyebrow)}</p><h2>${escapeHtml(content.games.title)}</h2></div>
            <div class="section-heading__aside"><p>${escapeHtml(content.games.intro)}</p><span>${escapeHtml(content.games.count)}</span></div>
          </div>
          <div class="game-grid">${games}</div>
        </div>
      </section>

      <section class="section architecture page-shell" id="architecture">
        <div class="section-heading section-heading--split">
          <div><p class="eyebrow">${escapeHtml(content.architecture.eyebrow)}</p><h2>${escapeHtml(content.architecture.title)}</h2></div>
          <p>${escapeHtml(content.architecture.intro)}</p>
        </div>
        <div class="architecture-map">${architectureNodes}</div>
        <div class="architecture-note">
          <span aria-hidden="true">i</span>
          <p>${escapeHtml(content.architecture.note)}</p>
          ${externalLink(links.architecture, content.architecture.docsAction, "text-link")}
        </div>
      </section>

      <section class="section boundary-section">
        <div class="page-shell boundary-layout">
          <div class="boundary-heading">
            <p class="eyebrow eyebrow--warm">${escapeHtml(content.boundary.eyebrow)}</p>
            <h2>${escapeHtml(content.boundary.title)}</h2>
            <p>${escapeHtml(content.boundary.intro)}</p>
          </div>
          <div class="boundary-grid">${boundaries}</div>
        </div>
      </section>

      <section class="section source-section page-shell" id="source">
        <div class="source-card">
          <div class="source-card__mark" aria-hidden="true"><span class="brand-mark brand-mark--large"><i></i><i></i><i></i><i></i></span></div>
          <div class="source-card__copy">
            <p class="eyebrow">${escapeHtml(content.source.eyebrow)}</p>
            <h2>${escapeHtml(content.source.title)}</h2>
            <p>${escapeHtml(content.source.body)}</p>
            <div class="source-card__actions">
              ${externalLink(links.repository, content.source.repositoryAction, "button button--primary")}
              ${externalLink(links.releases, content.source.releaseAction, "button button--outlined")}
            </div>
          </div>
          <dl class="source-meta">
            <div><dt>${escapeHtml(content.source.statusLabel)}</dt><dd><i aria-hidden="true"></i>${escapeHtml(content.source.statusValue)}</dd></div>
            <div><dt>${escapeHtml(content.source.platformLabel)}</dt><dd>${escapeHtml(content.source.platformValue)}</dd></div>
            <div><dt>${escapeHtml(content.source.licenseLabel)}</dt><dd>${escapeHtml(content.source.licenseValue)}</dd></div>
          </dl>
        </div>
      </section>
    </main>

    <footer class="site-footer">
      <div class="footer-inner page-shell">
        <div class="footer-brand">
          <a class="wordmark" href="${homeHref}"><span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i><i></i></span><span>LAN Party Hub</span></a>
          <p>${escapeHtml(content.footer.tagline)}</p>
        </div>
        <p class="footer-status"><span aria-hidden="true"></span>${escapeHtml(content.footer.status)}</p>
        <div class="footer-links">
          <a href="${links.repository}" target="_blank" rel="noreferrer">${escapeHtml(content.footer.repository)}</a>
          <a href="${links.documentation}" target="_blank" rel="noreferrer">${escapeHtml(content.footer.documentation)}</a>
          <a href="${links.notices}" target="_blank" rel="noreferrer">${escapeHtml(content.footer.notices)}</a>
          <a href="${links.license}" target="_blank" rel="noreferrer">${escapeHtml(content.footer.license)}</a>
        </div>
      </div>
    </footer>`;
}

export function renderNotFound(): string {
  const content = siteCopy.en.notFound;

  return `<main class="not-found">
    <div class="not-found__card">
      <a class="wordmark" href="/" aria-label="LAN Party Hub home"><span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i><i></i></span><span>LAN Party Hub</span></a>
      <p class="eyebrow">${escapeHtml(content.eyebrow)}</p>
      <h1>${escapeHtml(content.title)}</h1>
      <p>${escapeHtml(content.body)}</p>
      <div class="hero__actions">
        <a class="button button--primary" href="/">${escapeHtml(content.homeAction)}<span aria-hidden="true">→</span></a>
        <a class="button button--secondary" href="/zh/">${escapeHtml(content.chineseAction)}</a>
      </div>
    </div>
  </main>`;
}
