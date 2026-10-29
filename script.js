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
// RÉCUPÉRATION DES ACTUALITÉS INVESTING RSS
// ============================================

// Mots-clés pour filtrage précis
const GOLD_KEYWORDS = ['gold', 'or ', 'xau', 'bullion', 'métaux précieux', 'precious metals', 'lingot'];
const DOLLAR_KEYWORDS = ['dollar', 'dxy', 'usd', 'greenback', 'billet vert', 'fed', 'fomc', 'powell', 'treasury', 'treasuries'];

// Flux RSS Investing.com
const INVESTING_FEEDS = {
  gold: [
    'https://www.investing.com/rss/commodities_Metals.rss',
    'https://www.investing.com/rss/news_11.rss'
  ],
  dollar: [
    'https://www.investing.com/rss/forex_Majors.rss',
    'https://www.investing.com/rss/news_14.rss'
  ]
};

// Proxies CORS avec fallback automatique (si un tombe, on passe au suivant)
const RSS_PROXIES = [
  'https://api.allorigins.win/raw?url=',
  'https://corsproxy.io/?url=',
  'https://api.codetabs.com/v1/proxy?quest='
];

// Essaie chaque proxy jusqu'à obtenir une réponse valide
async function fetchViaProxy(url) {
  for (const proxy of RSS_PROXIES) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(proxy + encodeURIComponent(url), {
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const text = await response.text();
        if (text && text.length > 100) {
          return text;
        }
      }
    } catch (err) {
      console.warn(`Proxy ${proxy} indisponible:`, err.message);
    }
  }
  throw new Error('Tous les proxys CORS sont indisponibles');
}

// Parse le XML RSS brut en liste d'articles
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

// Fonction de récupération et filtrage des articles
async function fetchFilteredNews(feedUrls, keywords, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = '<div class="news-loading">Chargement des articles Investing en cours...</div>';

  try {
    let allArticles = [];

    for (const feedUrl of feedUrls) {
      try {
        const xmlText = await fetchViaProxy(feedUrl);
        const parsedItems = parseRssXml(xmlText);
        if (parsedItems.length > 0) {
          allArticles = allArticles.concat(parsedItems);
        }
      } catch (feedError) {
        console.warn('Erreur sur le flux ' + feedUrl, feedError);
      }
    }

    // Déduplication par titre
    const seenTitles = new Set();
    const uniqueArticles = allArticles.filter(article => {
      if (seenTitles.has(article.title)) return false;
      seenTitles.add(article.title);
      return true;
    });

    // Filtrage par mots-clés
    const filteredArticles = uniqueArticles.filter(article => {
      const content = (article.title + ' ' + (article.description || '')).toLowerCase();
      return keywords.some(keyword => content.includes(keyword.toLowerCase()));
    });

    // Tri par date descendante
    filteredArticles.sort((a, b) => {
      return new Date(b.pubDate) - new Date(a.pubDate);
    });

    // Affichage des 15 articles les plus récents
    const topArticles = filteredArticles.slice(0, 15);

    if (topArticles.length === 0) {
      container.innerHTML = '<div class="news-error">Aucun article Investing trouvé avec les mots-clés sélectionnés. Essayez de rafraîchir dans quelques minutes.</div>';
      return;
    }

    const html = topArticles.map(article => {
      const date = new Date(article.pubDate);
      const now = new Date();
      const diffMinutes = Math.floor((now - date) / 60000);

      let dateStr;
      if (diffMinutes < 60) {
        dateStr = `Il y a ${diffMinutes} min`;
      } else if (diffMinutes < 1440) {
        const hours = Math.floor(diffMinutes / 60);
        dateStr = `Il y a ${hours}h`;
      } else {
        dateStr = date.toLocaleString('fr-FR', {
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Europe/Paris'
        });
      }

      // Nettoyage du titre (suppression des entités HTML)
      const cleanTitle = article.title
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");

      return `
        <a href="${article.link}" class="news-item" target="_blank" rel="noopener">
          <div class="news-item-title">${cleanTitle}</div>
          <div class="news-item-meta">
            <span class="news-item-source">Investing.com</span>
            <span class="news-item-date">${dateStr}</span>
          </div>
          <span class="news-item-arrow">→</span>
        </a>
      `;
    }).join('');

    container.innerHTML = html;

  } catch (error) {
    console.error('Erreur chargement actualités', error);
    container.innerHTML = '<div class="news-error">Impossible de charger les articles Investing. Le service de proxy RSS est momentanément indisponible. Clique sur ↻ pour réessayer.</div>';
  }
}

// Initialisation des actualités
function initNews() {
  // Chargement initial
  fetchFilteredNews(INVESTING_FEEDS.gold, GOLD_KEYWORDS, 'gold-news-list');
  fetchFilteredNews(INVESTING_FEEDS.dollar, DOLLAR_KEYWORDS, 'dollar-news-list');

  // Boutons de rafraîchissement manuel
  const refreshGold = document.getElementById('refresh-gold-news');
  const refreshDollar = document.getElementById('refresh-dollar-news');

  if (refreshGold) {
    refreshGold.addEventListener('click', () => {
      fetchFilteredNews(INVESTING_FEEDS.gold, GOLD_KEYWORDS, 'gold-news-list');
    });
  }

  if (refreshDollar) {
    refreshDollar.addEventListener('click', () => {
      fetchFilteredNews(INVESTING_FEEDS.dollar, DOLLAR_KEYWORDS, 'dollar-news-list');
    });
  }

  // Rafraîchissement automatique toutes les 30 minutes
  setInterval(() => {
    fetchFilteredNews(INVESTING_FEEDS.gold, GOLD_KEYWORDS, 'gold-news-list');
    fetchFilteredNews(INVESTING_FEEDS.dollar, DOLLAR_KEYWORDS, 'dollar-news-list');
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

  console.log('Dashboard XAU/USD chargé · v2.0 esthétique vert/blanc futuriste');
});
