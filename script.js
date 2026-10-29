/* ============================================
   DASHBOARD TRADING - SCRIPT PRINCIPAL
   Gestion date, heure et interactivité
   ============================================ */

// Mise à jour de la date et de l'heure en temps réel
function updateDateTime() {
  const now = new Date();

  // Options de formatage date
  const dateOptions = {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Paris'
  };

  // Options de formatage heure
  const timeOptions = {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'Europe/Paris'
  };

  const dateString = now.toLocaleDateString('fr-FR', dateOptions);
  const timeString = now.toLocaleTimeString('fr-FR', timeOptions);

  const dateElement = document.getElementById('current-date');
  const timeElement = document.getElementById('current-time');

  if (dateElement) {
    dateElement.textContent = dateString.charAt(0).toUpperCase() + dateString.slice(1);
  }

  if (timeElement) {
    timeElement.textContent = timeString + ' CEST';
  }
}

// Mise à jour des dates des briefs
function updateBriefDates() {
  const now = new Date();

  const dailyOptions = {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Paris'
  };

  const dailyDate = now.toLocaleDateString('fr-FR', dailyOptions);

  // Calcul du lundi et dimanche de la semaine en cours
  const dayOfWeek = now.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const weeklyOptions = {
    day: 'numeric',
    month: 'short',
    timeZone: 'Europe/Paris'
  };

  const weeklyDate = 'Semaine du ' +
    monday.toLocaleDateString('fr-FR', weeklyOptions) +
    ' au ' +
    sunday.toLocaleDateString('fr-FR', weeklyOptions);

  const dailyDateElement = document.getElementById('brief-daily-date');
  const weeklyDateElement = document.getElementById('brief-weekly-date');

  if (dailyDateElement) {
    dailyDateElement.textContent = dailyDate;
  }

  if (weeklyDateElement) {
    weeklyDateElement.textContent = weeklyDate;
  }
}

// ============================================
// ACTUALITÉS RSS via Cloudflare Worker (proxy perso)
// Worker : https://rss-proxy.crecyronan08.workers.dev
// ============================================

const RSS_PROXY = 'https://rss-proxy.crecyronan08.workers.dev/?url=';

// Mots-clés pour filtrage (appliqués à TOUS les flux)
const GOLD_KEYWORDS = ['xauusd', 'gold', 'or', 'fed'];
const DOLLAR_KEYWORDS = ['dollar', 'dxy', 'fed', 'us'];

// Match un mot-clé dans le contenu
// Pour les mots courts (≤ 3 lettres) : word boundary pour éviter les faux positifs
// Pour les autres : includes classique
function matchKeyword(content, keyword) {
  const k = keyword.toLowerCase();
  if (k.length <= 3) {
    const regex = new RegExp(`\\b${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    return regex.test(content);
  }
  return content.includes(k);
}

// ============================================
// TRADUCTION AUTO des titres (via Google Translate + cache localStorage)
// ============================================

const TRANSLATION_CACHE_KEY = 'news-translations-cache-v1';

function getTranslationCache() {
  try {
    return JSON.parse(localStorage.getItem(TRANSLATION_CACHE_KEY) || '{}');
  } catch (e) { return {}; }
}

function saveTranslationCache(cache) {
  try {
    const entries = Object.entries(cache);
    // Limiter à 500 entrées, garder les plus récentes
    const trimmed = entries.length > 500 ? Object.fromEntries(entries.slice(-500)) : cache;
    localStorage.setItem(TRANSLATION_CACHE_KEY, JSON.stringify(trimmed));
  } catch (e) {}
}

// Détection grossière : titre déjà en français ?
function isLikelyFrench(text) {
  const frenchHints = /\b(le|la|les|des|du|une|dans|avec|pour|sur|est|sont|cette|cet|son|sa|ses|notre|votre|leur|l'or|l'euro)\b/i;
  return frenchHints.test(text);
}

// Traduit un titre EN → FR via MyMemory API (CORS activé, pas de clé, gratuit)
async function translateTitle(text) {
  if (!text || text.length < 3) return text;
  if (isLikelyFrench(text)) return text;

  const cache = getTranslationCache();
  if (cache[text]) return cache[text];

  try {
    // MyMemory API : CORS activé nativement, 10k chars/jour gratuits
    // Ajout d'un email bidon augmente la limite à 50k chars/jour
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|fr&de=ronan.francois8@gmail.com`;
    const response = await fetch(url);
    if (!response.ok) return text;

    const data = await response.json();
    const translated = data?.responseData?.translatedText?.trim();

    // Vérification que la traduction est valide (différente de l'original, pas une erreur)
    if (translated && translated.length > 0 && translated.toLowerCase() !== text.toLowerCase() && !translated.includes('MYMEMORY WARNING')) {
      cache[text] = translated;
      saveTranslationCache(cache);
      return translated;
    }
    return text;
  } catch (err) {
    console.warn('Erreur traduction:', err.message);
    return text;
  }
}

// Sources RSS testées fiables (Investing/Kitco bloquent via Cloudflare, exclus)
const NEWS_FEEDS = {
  gold: {
    thematic: [
      'https://www.mining.com/feed/',
      'https://feeds.newsfilecorp.com/industry/precious-metals',
      'https://feeds.newsfilecorp.com/industry/mining-metals',
      'https://goldbroker.com/news.rss'
    ],
    general: [
      'https://www.fxstreet.com/rss/news',
      'https://www.forexlive.com/feed'
    ]
  },
  dollar: {
    thematic: [
      'https://www.forexlive.com/feed'
    ],
    general: [
      'https://www.fxstreet.com/rss/news'
    ]
  }
};

// Fetch via le Worker Cloudflare (sans traduction serveur - trop fragile)
async function fetchViaProxy(url) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(RSS_PROXY + encodeURIComponent(url), {
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error('HTTP ' + response.status);
    }

    const text = await response.text();
    if (!text || text.length < 100) {
      throw new Error('Réponse vide ou trop courte');
    }

    return text;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

// Parse le XML RSS en liste d'articles
function parseRssXml(xmlText) {
  const parser = new DOMParser();
  const xml = parser.parseFromString(xmlText, 'application/xml');

  if (xml.querySelector('parsererror')) {
    return [];
  }

  const items = xml.querySelectorAll('item');
  return Array.from(items).map(item => ({
    title: item.querySelector('title')?.textContent?.trim() || '',
    link: item.querySelector('link')?.textContent?.trim() || '',
    description: item.querySelector('description')?.textContent?.trim() || '',
    pubDate: item.querySelector('pubDate')?.textContent?.trim() || ''
  }));
}

// Récupère les articles d'un ensemble de flux
// Filtrage mots-clés appliqué à TOUS les flux (thematic + general)
async function fetchFilteredNews(feeds, keywords, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = '<div class="news-loading">Chargement des articles en cours...</div>';

  try {
    let allArticles = [];

    const allFeedUrls = [...(feeds.thematic || []), ...(feeds.general || [])];

    for (const feedUrl of allFeedUrls) {
      try {
        const xmlText = await fetchViaProxy(feedUrl);
        const items = parseRssXml(xmlText);
        const filtered = items.filter(article => {
          const content = (article.title || '').toLowerCase();
          return keywords.some(k => matchKeyword(content, k));
        });
        allArticles = allArticles.concat(filtered);
      } catch (err) {
        console.warn('Flux indisponible: ' + feedUrl, err.message);
      }
    }

    // Déduplication par titre
    const seenTitles = new Set();
    const uniqueArticles = allArticles.filter(article => {
      if (!article.title || seenTitles.has(article.title)) return false;
      seenTitles.add(article.title);
      return true;
    });

    // Tri par date descendante
    uniqueArticles.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

    // Garder les 20 plus récents
    const topArticles = uniqueArticles.slice(0, 20);

    if (topArticles.length === 0) {
      container.innerHTML = '<div class="news-error">Aucun article disponible pour le moment. Clique sur ↻ pour réessayer.</div>';
      return;
    }

    // Traduction côté client via MyMemory (avec cache localStorage)
    const translatedArticles = await Promise.all(topArticles.map(async article => {
      const cleanOriginal = (article.title || '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
      const translated = await translateTitle(cleanOriginal);
      return { ...article, cleanTitle: translated };
    }));

    const html = translatedArticles.map(article => {
      const cleanTitle = article.cleanTitle;
      const date = new Date(article.pubDate);
      const now = new Date();
      const diffMinutes = Math.floor((now - date) / 60000);

      let dateStr;
      if (isNaN(diffMinutes) || diffMinutes < 0) {
        dateStr = 'Récent';
      } else if (diffMinutes < 60) {
        dateStr = `Il y a ${diffMinutes} min`;
      } else if (diffMinutes < 1440) {
        dateStr = `Il y a ${Math.floor(diffMinutes / 60)}h`;
      } else {
        dateStr = date.toLocaleString('fr-FR', {
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Europe/Paris'
        });
      }

      // Détection de la source depuis l'URL
      let source = 'News';
      try {
        const host = new URL(article.link).hostname.replace('www.', '');
        if (host.includes('fxstreet')) source = 'FXStreet';
        else if (host.includes('forexlive')) source = 'ForexLive';
        else if (host.includes('mining')) source = 'Mining.com';
        else if (host.includes('newsfilecorp')) source = 'NewsFile';
        else if (host.includes('goldbroker')) source = 'GoldBroker';
        else if (host.includes('investing')) source = 'Investing';
        else if (host.includes('kitco')) source = 'Kitco';
        else source = host.split('.')[0].charAt(0).toUpperCase() + host.split('.')[0].slice(1);
      } catch (e) {}

      return `
        <a href="${article.link}" class="news-item" target="_blank" rel="noopener">
          <div class="news-item-title">${cleanTitle}</div>
          <div class="news-item-meta">
            <span class="news-item-source">${source}</span>
            <span class="news-item-date">${dateStr}</span>
          </div>
          <span class="news-item-arrow">→</span>
        </a>
      `;
    }).join('');

    container.innerHTML = html;

  } catch (error) {
    console.error('Erreur chargement actualités', error);
    container.innerHTML = '<div class="news-error">Impossible de charger les articles. Clique sur ↻ pour réessayer.</div>';
  }
}

// Initialisation des actualités
function initNews() {
  fetchFilteredNews(NEWS_FEEDS.gold, GOLD_KEYWORDS, 'gold-news-list');
  fetchFilteredNews(NEWS_FEEDS.dollar, DOLLAR_KEYWORDS, 'dollar-news-list');

  const refreshGold = document.getElementById('refresh-gold-news');
  const refreshDollar = document.getElementById('refresh-dollar-news');

  if (refreshGold) {
    refreshGold.addEventListener('click', () => {
      fetchFilteredNews(NEWS_FEEDS.gold, GOLD_KEYWORDS, 'gold-news-list');
    });
  }

  if (refreshDollar) {
    refreshDollar.addEventListener('click', () => {
      fetchFilteredNews(NEWS_FEEDS.dollar, DOLLAR_KEYWORDS, 'dollar-news-list');
    });
  }

  // Rafraîchissement automatique toutes les 30 minutes
  setInterval(() => {
    fetchFilteredNews(NEWS_FEEDS.gold, GOLD_KEYWORDS, 'gold-news-list');
    fetchFilteredNews(NEWS_FEEDS.dollar, DOLLAR_KEYWORDS, 'dollar-news-list');
  }, 30 * 60 * 1000);
}

// Gestion des onglets du calendrier
function initCalendarTabs() {
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');

  tabButtons.forEach(button => {
    button.addEventListener('click', function() {
      const targetTab = this.getAttribute('data-tab');

      // Désactiver tous les onglets
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(content => {
        content.classList.remove('active');
        content.style.display = 'none';
      });

      // Activer l'onglet cliqué
      this.classList.add('active');
      const targetContent = document.getElementById('tab-' + targetTab);
      if (targetContent) {
        targetContent.classList.add('active');
        targetContent.style.display = 'block';
      }
    });
  });
}

// Gestion des onglets charts XAU/USD vs DXY
function initChartTabs() {
  const chartTabButtons = document.querySelectorAll('.chart-tab-button');
  const chartTabContents = document.querySelectorAll('.chart-tab-content');

  chartTabButtons.forEach(button => {
    button.addEventListener('click', function() {
      const targetChart = this.getAttribute('data-chart');

      // Désactiver tous les onglets charts
      chartTabButtons.forEach(btn => btn.classList.remove('active'));
      chartTabContents.forEach(content => {
        content.classList.remove('active');
        content.style.display = 'none';
      });

      // Activer l'onglet cliqué
      this.classList.add('active');
      const targetContent = document.getElementById('chart-tab-' + targetChart);
      if (targetContent) {
        targetContent.classList.add('active');
        targetContent.style.display = 'block';
      }
    });
  });
}

// Initialisation au chargement
document.addEventListener('DOMContentLoaded', function() {
  updateDateTime();
  updateBriefDates();
  initCalendarTabs();
  initChartTabs();
  initNews();

  // Mise à jour toutes les secondes
  setInterval(updateDateTime, 1000);

  // Mise à jour des dates des briefs toutes les minutes
  setInterval(updateBriefDates, 60000);

  console.log('Dashboard XAU/USD chargé · v2.2 RSS via Cloudflare Worker');
});
