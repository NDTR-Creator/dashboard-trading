// ============================================
// ADMIN.JS · Logique de l'interface admin
// Projet : site-trading-5ed7d
// Admin autorisé : ronan.francois8@gmail.com
// ============================================

import {
  auth,
  db,
  ADMIN_EMAIL,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  doc,
  deleteDoc,
  updateDoc,
  Timestamp,
  where
} from "./firebase-config.js";

// ============================================
// ÉLÉMENTS DU DOM
// ============================================

const loginScreen = document.getElementById('login-screen');
const adminScreen = document.getElementById('admin-screen');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const btnLogin = document.getElementById('btn-login');
const btnLogout = document.getElementById('btn-logout');
const userEmailDisplay = document.getElementById('user-email');

// Formulaires
const formDaily = document.getElementById('form-brief-daily');
const formWeekly = document.getElementById('form-brief-weekly');
const btnSaveDailyDraft = document.getElementById('btn-save-daily-draft');
const btnSaveWeeklyDraft = document.getElementById('btn-save-weekly-draft');

// Feedback
const dailyFeedback = document.getElementById('daily-feedback');
const weeklyFeedback = document.getElementById('weekly-feedback');

// Dates affichées
const dailyDateDisplay = document.getElementById('daily-date-display');
const weeklyDateDisplay = document.getElementById('weekly-date-display');

// Historique
const historyList = document.getElementById('history-list');

// État interne
let currentUser = null;
let currentDailyDraftId = null;
let currentWeeklyDraftId = null;
let currentFilter = 'all';
let briefToDelete = null;

// ============================================
// GESTION DE L'AUTHENTIFICATION
// ============================================

// Vérifier l'état de connexion au chargement
onAuthStateChanged(auth, (user) => {
  if (user && user.email === ADMIN_EMAIL) {
    currentUser = user;
    showAdminInterface();
    userEmailDisplay.textContent = user.email;
    initializeAdmin();
  } else {
    currentUser = null;
    showLoginScreen();
  }
});

// Gestion de la connexion
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  // Vérification que c'est bien l'email autorisé
  if (email !== ADMIN_EMAIL) {
    showLoginError("Cet email n'est pas autorisé à accéder à l'administration.");
    return;
  }

  btnLogin.disabled = true;
  btnLogin.textContent = 'Connexion en cours...';
  loginError.textContent = '';

  try {
    await signInWithEmailAndPassword(auth, email, password);
    // La redirection se fait automatiquement via onAuthStateChanged
  } catch (error) {
    btnLogin.disabled = false;
    btnLogin.textContent = 'Se connecter';

    let errorMessage = 'Erreur de connexion.';
    if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
      errorMessage = 'Mot de passe incorrect.';
    } else if (error.code === 'auth/user-not-found') {
      errorMessage = 'Aucun compte trouvé avec cet email.';
    } else if (error.code === 'auth/too-many-requests') {
      errorMessage = 'Trop de tentatives échouées. Attendez quelques minutes.';
    } else if (error.code === 'auth/network-request-failed') {
      errorMessage = 'Problème réseau. Vérifiez votre connexion internet.';
    }

    showLoginError(errorMessage);
    console.error('Erreur Firebase Auth:', error);
  }
});

// Gestion de la déconnexion
btnLogout.addEventListener('click', async () => {
  try {
    await signOut(auth);
    currentDailyDraftId = null;
    currentWeeklyDraftId = null;
  } catch (error) {
    console.error('Erreur déconnexion:', error);
  }
});

function showLoginError(message) {
  loginError.textContent = message;
  loginError.style.display = 'block';
}

function showLoginScreen() {
  loginScreen.style.display = 'flex';
  adminScreen.style.display = 'none';
}

function showAdminInterface() {
  loginScreen.style.display = 'none';
  adminScreen.style.display = 'block';
}

// ============================================
// INITIALISATION DE L'ADMIN
// ============================================

function initializeAdmin() {
  updateDateDisplays();
  initTabs();
  initFormHandlers();
  initDraftHandlers();
  initHistoryHandlers();
  initModalHandlers();
  loadHistory();

  // Mise à jour des dates toutes les minutes
  setInterval(updateDateDisplays, 60000);
}

// ============================================
// MISE À JOUR DES DATES AFFICHÉES
// ============================================

function updateDateDisplays() {
  const now = new Date();

  // Date du jour pour le brief journalier
  const dailyDate = now.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Paris'
  });

  if (dailyDateDisplay) {
    dailyDateDisplay.textContent = dailyDate.charAt(0).toUpperCase() + dailyDate.slice(1);
  }

  // Semaine courante pour le brief hebdomadaire
  const { monday, sunday } = getCurrentWeekRange();
  const weeklyDate = `Semaine du ${formatShortDate(monday)} au ${formatShortDate(sunday)}`;

  if (weeklyDateDisplay) {
    weeklyDateDisplay.textContent = weeklyDate;
  }
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
// GESTION DES ONGLETS
// ============================================

function initTabs() {
  const tabButtons = document.querySelectorAll('.admin-tab-button');
  const tabContents = document.querySelectorAll('.admin-tab-content');

  tabButtons.forEach(button => {
    button.addEventListener('click', function() {
      const targetTab = this.getAttribute('data-admin-tab');

      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(content => {
        content.classList.remove('active');
        content.style.display = 'none';
      });

      this.classList.add('active');
      const targetContent = document.getElementById('admin-tab-' + targetTab);
      if (targetContent) {
        targetContent.classList.add('active');
        targetContent.style.display = 'block';
      }

      // Recharger l'historique si on arrive sur cet onglet
      if (targetTab === 'history') {
        loadHistory();
      }

      // Charger les brouillons si on arrive sur un onglet brief
      if (targetTab === 'daily') {
        loadDraft('daily');
      }
      if (targetTab === 'weekly') {
        loadDraft('weekly');
      }
    });
  });

  // Filtres de l'historique
  const filterButtons = document.querySelectorAll('.filter-button');
  filterButtons.forEach(button => {
    button.addEventListener('click', function() {
      filterButtons.forEach(btn => btn.classList.remove('active'));
      this.classList.add('active');
      currentFilter = this.getAttribute('data-filter');
      loadHistory();
    });
  });
}

// ============================================
// GESTION DES FORMULAIRES DE BRIEFS
// ============================================

function initFormHandlers() {
  // Publication brief journalier
  formDaily.addEventListener('submit', async (e) => {
    e.preventDefault();
    await publishBrief('daily');
  });

  // Publication brief hebdomadaire
  formWeekly.addEventListener('submit', async (e) => {
    e.preventDefault();
    await publishBrief('weekly');
  });
}

async function publishBrief(type) {
  const form = type === 'daily' ? formDaily : formWeekly;
  const feedback = type === 'daily' ? dailyFeedback : weeklyFeedback;
  const submitBtn = form.querySelector('button[type="submit"]');

  submitBtn.disabled = true;
  submitBtn.textContent = 'Publication en cours...';
  feedback.className = 'form-feedback';
  feedback.textContent = '';

  try {
    const data = collectFormData(form, type);
    data.type = type;
    data.publishedAt = Timestamp.now();
    data.publishedBy = currentUser.email;

    if (type === 'weekly') {
      const { monday, sunday } = getCurrentWeekRange();
      data.weekStart = Timestamp.fromDate(monday);
      data.weekEnd = Timestamp.fromDate(sunday);
    }

    // Publication dans Firestore
    await addDoc(collection(db, 'briefs'), data);

    // Supprimer le brouillon associé si existant
    const draftId = type === 'daily' ? currentDailyDraftId : currentWeeklyDraftId;
    if (draftId) {
      try {
        await deleteDoc(doc(db, 'drafts', draftId));
      } catch (err) {
        console.warn('Impossible de supprimer le brouillon:', err);
      }
      if (type === 'daily') currentDailyDraftId = null;
      else currentWeeklyDraftId = null;
    }

    showFeedback(feedback, 'success', `Brief ${type === 'daily' ? 'journalier' : 'hebdomadaire'} publié avec succès ! Il est maintenant visible sur le dashboard.`);
    form.reset();

  } catch (error) {
    console.error('Erreur publication:', error);
    showFeedback(feedback, 'error', `Erreur lors de la publication: ${error.message}`);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = type === 'daily' ? 'Publier le brief' : 'Publier le brief hebdo';
  }
}

function collectFormData(form, type) {
  const formData = new FormData(form);
  const data = {};

  for (const [key, value] of formData.entries()) {
    data[key] = value.trim();
  }

  return data;
}

function showFeedback(element, type, message) {
  element.className = `form-feedback ${type}`;
  element.textContent = message;

  // Auto-hide après 10 secondes pour les messages de succès
  if (type === 'success') {
    setTimeout(() => {
      element.textContent = '';
      element.className = 'form-feedback';
    }, 10000);
  }
}

// ============================================
// GESTION DES BROUILLONS
// ============================================

function initDraftHandlers() {
  btnSaveDailyDraft.addEventListener('click', () => saveDraft('daily'));
  btnSaveWeeklyDraft.addEventListener('click', () => saveDraft('weekly'));
}

async function saveDraft(type) {
  const form = type === 'daily' ? formDaily : formWeekly;
  const feedback = type === 'daily' ? dailyFeedback : weeklyFeedback;
  const draftBtn = form.querySelector(type === 'daily' ? '#btn-save-daily-draft' : '#btn-save-weekly-draft');

  draftBtn.disabled = true;
  draftBtn.textContent = 'Sauvegarde...';

  try {
    const data = collectFormData(form, type);
    data.type = type;
    data.savedAt = Timestamp.now();
    data.savedBy = currentUser.email;

    const currentDraftId = type === 'daily' ? currentDailyDraftId : currentWeeklyDraftId;

    if (currentDraftId) {
      // Mettre à jour le brouillon existant
      await updateDoc(doc(db, 'drafts', currentDraftId), data);
      showFeedback(feedback, 'success', 'Brouillon mis à jour avec succès.');
    } else {
      // Créer un nouveau brouillon
      const docRef = await addDoc(collection(db, 'drafts'), data);
      if (type === 'daily') currentDailyDraftId = docRef.id;
      else currentWeeklyDraftId = docRef.id;
      showFeedback(feedback, 'success', 'Brouillon sauvegardé avec succès. Il n\'est pas visible sur le dashboard public.');
    }

  } catch (error) {
    console.error('Erreur sauvegarde brouillon:', error);
    showFeedback(feedback, 'error', `Erreur lors de la sauvegarde: ${error.message}`);
  } finally {
    draftBtn.disabled = false;
    draftBtn.textContent = 'Sauvegarder brouillon';
  }
}

async function loadDraft(type) {
  const form = type === 'daily' ? formDaily : formWeekly;

  try {
    const draftsQuery = query(
      collection(db, 'drafts'),
      where('type', '==', type),
      orderBy('savedAt', 'desc'),
      limit(1)
    );

    const snapshot = await getDocs(draftsQuery);

    if (!snapshot.empty) {
      const draftDoc = snapshot.docs[0];
      const draft = draftDoc.data();

      if (type === 'daily') currentDailyDraftId = draftDoc.id;
      else currentWeeklyDraftId = draftDoc.id;

      // Remplir le formulaire avec le brouillon
      Object.keys(draft).forEach(key => {
        const input = form.querySelector(`[name="${key}"]`);
        if (input) {
          input.value = draft[key];
        }
      });
    }
  } catch (error) {
    console.warn('Pas de brouillon trouvé ou erreur de chargement:', error);
  }
}

// ============================================
// HISTORIQUE DES BRIEFS
// ============================================

function initHistoryHandlers() {
  // Les handlers sont ajoutés dynamiquement lors du chargement
}

async function loadHistory() {
  historyList.innerHTML = '<div class="history-loading">Chargement de l\'historique...</div>';

  try {
    let briefsQuery;

    if (currentFilter === 'all') {
      briefsQuery = query(
        collection(db, 'briefs'),
        orderBy('publishedAt', 'desc'),
        limit(50)
      );
    } else {
      briefsQuery = query(
        collection(db, 'briefs'),
        where('type', '==', currentFilter),
        orderBy('publishedAt', 'desc'),
        limit(50)
      );
    }

    const snapshot = await getDocs(briefsQuery);

    if (snapshot.empty) {
      historyList.innerHTML = '<div class="history-empty">Aucun brief publié pour le moment.</div>';
      return;
    }

    const briefs = [];
    snapshot.forEach(docSnap => {
      briefs.push({ id: docSnap.id, ...docSnap.data() });
    });

    renderHistory(briefs);

  } catch (error) {
    console.error('Erreur chargement historique:', error);
    historyList.innerHTML = `<div class="history-error">Erreur de chargement: ${error.message}</div>`;
  }
}

function renderHistory(briefs) {
  const html = briefs.map(brief => {
    const date = brief.publishedAt?.toDate() || new Date();
    const dateStr = date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Paris'
    });

    const typeLabel = brief.type === 'daily' ? 'Journalier' : 'Hebdomadaire';
    const typeClass = brief.type === 'daily' ? 'type-daily' : 'type-weekly';

    return `
      <div class="history-item" data-id="${brief.id}">
        <div class="history-item-header">
          <div class="history-item-title">${escapeHtml(brief.title || 'Sans titre')}</div>
          <span class="history-item-type ${typeClass}">${typeLabel}</span>
        </div>
        <div class="history-item-meta">
          <span class="history-item-date">📅 ${dateStr}</span>
          <div class="history-item-actions">
            <button class="btn-ghost btn-small" data-action="view" data-id="${brief.id}">Voir</button>
            <button class="btn-danger btn-small" data-action="delete" data-id="${brief.id}">Supprimer</button>
          </div>
        </div>
        <div class="history-item-preview">
          ${escapeHtml((brief.snapshot || brief.recap || '').substring(0, 150))}${(brief.snapshot || brief.recap || '').length > 150 ? '...' : ''}
        </div>
      </div>
    `;
  }).join('');

  historyList.innerHTML = html;

  // Attacher les handlers aux boutons
  historyList.querySelectorAll('button[data-action]').forEach(btn => {
    btn.addEventListener('click', function() {
      const action = this.getAttribute('data-action');
      const id = this.getAttribute('data-id');

      if (action === 'delete') {
        confirmDelete(id);
      } else if (action === 'view') {
        viewBrief(id, briefs);
      }
    });
  });
}

function viewBrief(briefId, briefs) {
  const brief = briefs.find(b => b.id === briefId);
  if (!brief) return;

  // Ouvrir le dashboard public dans un nouvel onglet
  window.open('index.html', '_blank');
}

// ============================================
// MODAL DE CONFIRMATION SUPPRESSION
// ============================================

function initModalHandlers() {
  const modal = document.getElementById('confirm-modal');
  const btnCancel = document.getElementById('btn-cancel-delete');
  const btnConfirm = document.getElementById('btn-confirm-delete');

  btnCancel.addEventListener('click', () => {
    modal.style.display = 'none';
    briefToDelete = null;
  });

  btnConfirm.addEventListener('click', async () => {
    if (!briefToDelete) return;

    try {
      await deleteDoc(doc(db, 'briefs', briefToDelete));
      modal.style.display = 'none';
      briefToDelete = null;
      loadHistory();
    } catch (error) {
      console.error('Erreur suppression:', error);
      alert('Erreur lors de la suppression: ' + error.message);
    }
  });

  // Fermer le modal en cliquant à l'extérieur
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.style.display = 'none';
      briefToDelete = null;
    }
  });
}

function confirmDelete(briefId) {
  briefToDelete = briefId;
  document.getElementById('confirm-modal').style.display = 'flex';
}

// ============================================
// UTILITAIRES
// ============================================

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

console.log('Admin.js chargé · Interface d\'administration prête');
