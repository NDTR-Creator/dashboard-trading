// ============================================
// BRIEFS.JS · Récupération et affichage des briefs
// sur le dashboard public (index.html)
// Lecture publique depuis Firebase Firestore
// ============================================

import {
  db,
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  where,
  Timestamp
} from "./firebase-config.js";

// ============================================
// RÉCUPÉRATION DU DERNIER BRIEF JOURNALIER
// ============================================

async function loadLatestDailyBrief() {
  const container = document.querySelector('.brief-section.brief-daily .brief-content');
  if (!container) return;

  try {
    const briefsQuery = query(
      collection(db, 'briefs'),
      where('type', '==', 'daily'),
      orderBy('publishedAt', 'desc'),
      limit(1)
    );

    const snapshot = await getDocs(briefsQuery);

    if (snapshot.empty) {
      return; // Garder le placeholder par défaut
    }

    const brief = snapshot.docs[0].data();
    renderDailyBrief(container, brief);

  } catch (error) {
    console.error('Erreur chargement brief journalier:', error);
  }
}

function renderDailyBrief(container, brief) {
  const publishedDate = brief.publishedAt?.toDate() || new Date();
  const dateStr = publishedDate.toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Paris'
  });

  const now = new Date();
  const diffHours = Math.floor((now - publishedDate) / (1000 * 60 * 60));
  const isOld = diffHours > 24;

  let html = `
    <article class="brief-published">

      ${brief.title ? `<h2 class="brief-main-title">${escapeHtml(brief.title)}</h2>` : ''}

      <div class="brief-publication-info">
        <span class="brief-published-at">📅 Publié le ${dateStr}</span>
        ${isOld ? '<span class="brief-outdated-badge">⚠️ Brief de plus de 24h</span>' : '<span class="brief-fresh-badge">● En direct</span>'}
      </div>

      ${renderSnapshotTable(brief)}

      ${brief.bloc1 ? renderBriefSection('Macro & Chiffres', brief.bloc1, '1️⃣') : ''}
      ${brief.bloc2 ? renderBriefSection('Publications éco · Passé · Présent · Futur', brief.bloc2, '2️⃣') : ''}
      ${brief.bloc3 ? renderBriefSection('Analyse technique XAU/USD · Hier · Aujourd\'hui · Demain', brief.bloc3, '3️⃣') : ''}

      ${renderLegacyBriefSections(brief)}

    </article>
  `;

  container.innerHTML = html;
}

function renderSnapshotTable(brief) {
  if (!brief.gold_price && !brief.dxy && !brief.us10y && !brief.fed_proba) {
    return '';
  }

  return `
    <div class="brief-snapshot-grid">
      ${brief.gold_price ? `
        <div class="brief-snapshot-card">
          <div class="snapshot-label">Or (USD)</div>
          <div class="snapshot-value">${escapeHtml(brief.gold_price)}</div>
        </div>
      ` : ''}
      ${brief.dxy ? `
        <div class="brief-snapshot-card">
          <div class="snapshot-label">DXY</div>
          <div class="snapshot-value">${escapeHtml(brief.dxy)}</div>
        </div>
      ` : ''}
      ${brief.us10y ? `
        <div class="brief-snapshot-card">
          <div class="snapshot-label">10 ans US</div>
          <div class="snapshot-value">${escapeHtml(brief.us10y)}%</div>
        </div>
      ` : ''}
      ${brief.fed_proba ? `
        <div class="brief-snapshot-card">
          <div class="snapshot-label">Prob. Fed</div>
          <div class="snapshot-value">${escapeHtml(brief.fed_proba)}%</div>
        </div>
      ` : ''}
    </div>
  `;
}

// ============================================
// RÉCUPÉRATION DU BRIEF HEBDOMADAIRE COURANT
// ============================================

async function loadCurrentWeeklyBrief() {
  const container = document.querySelector('.brief-section.brief-weekly .brief-content');
  if (!container) return;

  try {
    // Calculer la semaine courante (lundi au dimanche)
    const { monday, sunday } = getCurrentWeekRange();

    // Chercher un brief hebdo publié cette semaine
    const briefsQuery = query(
      collection(db, 'briefs'),
      where('type', '==', 'weekly'),
      orderBy('publishedAt', 'desc'),
      limit(5)
    );

    const snapshot = await getDocs(briefsQuery);

    if (snapshot.empty) {
      return;
    }

    // Trouver le brief le plus récent qui concerne la semaine courante
    // Ou à défaut, afficher le dernier avec un badge "semaine passée"
    let currentWeekBrief = null;
    let lastBrief = null;

    snapshot.forEach(docSnap => {
      const brief = docSnap.data();
      const publishedDate = brief.publishedAt?.toDate();

      if (!lastBrief) {
        lastBrief = brief;
      }

      if (publishedDate && publishedDate >= monday && publishedDate <= sunday) {
        if (!currentWeekBrief) {
          currentWeekBrief = brief;
        }
      }
    });

    const briefToShow = currentWeekBrief || lastBrief;
    const isCurrentWeek = !!currentWeekBrief;

    renderWeeklyBrief(container, briefToShow, isCurrentWeek, monday, sunday);

  } catch (error) {
    console.error('Erreur chargement brief hebdo:', error);
  }
}

function renderWeeklyBrief(container, brief, isCurrentWeek, monday, sunday) {
  const publishedDate = brief.publishedAt?.toDate() || new Date();
  const dateStr = publishedDate.toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Paris'
  });

  const weekRange = `Semaine du ${formatShortDate(monday)} au ${formatShortDate(sunday)}`;

  let html = `
    <article class="brief-published">

      ${brief.title ? `<h2 class="brief-main-title">${escapeHtml(brief.title)}</h2>` : ''}

      <div class="brief-publication-info">
        <span class="brief-week-range">📅 ${weekRange}</span>
        ${isCurrentWeek ?
          '<span class="brief-fresh-badge">● Semaine en cours</span>' :
          '<span class="brief-outdated-badge">⚠️ Brief de la semaine passée</span>'
        }
      </div>

      <div class="brief-published-subtitle">Publié le ${dateStr}</div>

      ${brief.bloc1 ? renderBriefSection('Macro & Tendances', brief.bloc1, '1️⃣') : ''}
      ${brief.bloc2 ? renderBriefSection('Géopolitique & Catalyseurs', brief.bloc2, '2️⃣') : ''}
      ${brief.bloc3 ? renderBriefSection('Pilotage XAU/USD semaine', brief.bloc3, '3️⃣') : ''}

      ${renderLegacyWeeklyBriefSections(brief)}

    </article>
  `;

  container.innerHTML = html;
}

// Rétrocompatibilité ancien format brief hebdo (6 rubriques)
function renderLegacyWeeklyBriefSections(brief) {
  if (brief.bloc1 || brief.bloc2 || brief.bloc3) {
    return '';
  }

  let html = '';
  if (brief.recap) html += renderBriefSection('Récap publications macro', brief.recap, '📊');
  if (brief.positioning) html += renderBriefSection('Positionnement institutionnel', brief.positioning, '💼');
  if (brief.structure) html += renderBriefSection('Structure Weekly et Daily', brief.structure, '📈');
  if (brief.catalysts) html += renderBriefSection('Catalyseurs semaine à venir', brief.catalysts, '🔥');
  if (brief.scenarios) html += renderBriefSection('Scénarios probabilisés semaine', brief.scenarios, '🎲');
  if (brief.zones) html += renderBriefSection('Zones techniques majeures', brief.zones, '📐');
  return html;
}

// ============================================
// UTILITAIRES
// ============================================

// Fonction de rétrocompatibilité pour les anciens briefs
function renderLegacyBriefSections(brief) {
  // Si le brief utilise déjà le nouveau format (bloc1/bloc2/bloc3), on n'affiche pas l'ancien
  if (brief.bloc1 || brief.bloc2 || brief.bloc3) {
    return '';
  }

  // Sinon on affiche l'ancien format pour les briefs publiés avant la refonte
  let html = '';
  if (brief.snapshot) html += renderBriefSection('Snapshot', brief.snapshot, '🎯');
  if (brief.fed) html += renderBriefSection('Volet Fed', brief.fed, '🏛️');
  if (brief.macro) html += renderBriefSection('Volet Macro', brief.macro, '📊');
  if (brief.geopolitics) html += renderBriefSection('Volet Géopolitique', brief.geopolitics, '🌍');
  if (brief.physical) html += renderBriefSection('Volet Demande physique', brief.physical, '🪙');
  if (brief.technical) html += renderBriefSection('Niveaux techniques', brief.technical, '📐');
  if (brief.scenarios) html += renderBriefSection('Scénarios probabilisés 48h', brief.scenarios, '🎲');
  if (brief.alerts) html += renderBriefSection('Alertes', brief.alerts, '⚠️');
  return html;
}

function renderBriefSection(title, content, icon) {
  return `
    <section class="brief-section-published">
      <h3 class="brief-section-title">
        <span class="brief-section-icon">${icon}</span>
        ${escapeHtml(title)}
      </h3>
      <div class="brief-section-content">${formatBriefContent(content)}</div>
    </section>
  `;
}

function formatBriefContent(content) {
  if (!content) return '';

  // Échapper le HTML
  let formatted = escapeHtml(content);

  // Préserver les sauts de ligne
  formatted = formatted.replace(/\n/g, '<br>');

  // Détecter les listes avec tirets et les transformer
  formatted = formatted.replace(/(<br>|^)[-•]\s(.+?)(?=<br>|$)/g, '$1<li>$2</li>');
  formatted = formatted.replace(/(<li>.*?<\/li>)+/gs, (match) => `<ul>${match.replace(/<br>/g, '')}</ul>`);

  return formatted;
}

function escapeHtml(text) {
  if (typeof text !== 'string') return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function getCurrentWeekRange() {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return { monday, sunday };
}

function formatShortDate(date) {
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    timeZone: 'Europe/Paris'
  });
}

// ============================================
// INITIALISATION
// ============================================

function initBriefs() {
  loadLatestDailyBrief();
  loadCurrentWeeklyBrief();

  // Rafraîchissement automatique toutes les 5 minutes
  setInterval(() => {
    loadLatestDailyBrief();
    loadCurrentWeeklyBrief();
  }, 5 * 60 * 1000);
}

// Démarrage
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initBriefs);
} else {
  initBriefs();
}

console.log('Briefs.js chargé · Récupération depuis Firebase active');
