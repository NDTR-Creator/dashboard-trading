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
// (Section actualités supprimée - remplacée par widgets TradingView Timeline)
// ============================================

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

  // Mise à jour toutes les secondes
  setInterval(updateDateTime, 1000);

  // Mise à jour des dates des briefs toutes les minutes
  setInterval(updateBriefDates, 60000);

  console.log('Dashboard XAU/USD chargé · v2.1 widgets TradingView Timeline');
});
