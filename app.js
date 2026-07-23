const STORAGE_KEY = 'flashcard-app-state-v1';

const state = loadState();
const searchQuery = { value: '' };
let flipped = false;

const elements = {
  deckList: document.querySelector('#deckList'),
  deckForm: document.querySelector('#deckForm'),
  deckNameInput: document.querySelector('#deckNameInput'),
  cardForm: document.querySelector('#cardForm'),
  frontInput: document.querySelector('#frontInput'),
  backInput: document.querySelector('#backInput'),
  cardList: document.querySelector('#cardList'),
  searchInput: document.querySelector('#searchInput'),
  flashcardButton: document.querySelector('#flashcardButton'),
  flashcardInner: document.querySelector('#flashcardInner'),
  cardFrontText: document.querySelector('#cardFrontText'),
  cardBackText: document.querySelector('#cardBackText'),
  cardCounter: document.querySelector('#cardCounter'),
  studyStatus: document.querySelector('#studyStatus'),
  createDeckBtn: document.querySelector('#createDeckBtn'),
  prevBtn: document.querySelector('#prevBtn'),
  nextBtn: document.querySelector('#nextBtn'),
  shuffleBtn: document.querySelector('#shuffleBtn'),
  editorModal: document.querySelector('#editorModal'),
  modalTitle: document.querySelector('#modalTitle'),
  editorForm: document.querySelector('#editorForm'),
  modalNameInput: document.querySelector('#modalNameInput'),
  modalFrontInput: document.querySelector('#modalFrontInput'),
  modalBackInput: document.querySelector('#modalBackInput'),
  modalCardFields: document.querySelector('#modalCardFields'),
  closeModalBtn: document.querySelector('#closeModalBtn'),
  cancelModalBtn: document.querySelector('#cancelModalBtn')
};

const app = {
  modalMode: null,
  modalTargetId: null
};

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function getDefaultState() {
  const deckId = createId('deck');
  const cardAId = createId('card');
  const cardBId = createId('card');

  return {
    decks: [
      {
        id: deckId,
        name: 'Spanish Basics',
        createdAt: Date.now()
      }
    ],
    cardsByDeckId: {
      [deckId]: [
        {
          id: cardAId,
          front: 'Hola',
          back: 'Hello',
          updatedAt: Date.now()
        },
        {
          id: cardBId,
          front: 'Gracias',
          back: 'Thank you',
          updatedAt: Date.now() + 1
        }
      ]
    },
    activeDeckId: deckId,
    ui: {
      isModalOpen: false,
      activeCardIndex: 0
    }
  };
}

function loadState() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return getDefaultState();
    }

    const parsed = JSON.parse(stored);
    if (!parsed || typeof parsed !== 'object') {
      return getDefaultState();
    }

    return {
      ...getDefaultState(),
      ...parsed,
      decks: Array.isArray(parsed.decks) ? parsed.decks : getDefaultState().decks,
      cardsByDeckId: parsed.cardsByDeckId && typeof parsed.cardsByDeckId === 'object' ? parsed.cardsByDeckId : getDefaultState().cardsByDeckId,
      activeDeckId: parsed.activeDeckId || null,
      ui: {
        isModalOpen: false,
        activeCardIndex: Number.isFinite(parsed.ui?.activeCardIndex) ? parsed.ui.activeCardIndex : 0
      }
    };
  } catch (error) {
    console.warn('Failed to load LocalStorage state. Reverting to defaults.', error);
    return getDefaultState();
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn('Failed to save LocalStorage state.', error);
  }
}

function getActiveDeck() {
  return state.decks.find((deck) => deck.id === state.activeDeckId) || null;
}

function getFilteredCards() {
  const activeDeckId = state.activeDeckId;
  const cards = state.cardsByDeckId[activeDeckId] || [];
  const term = searchQuery.value.trim().toLowerCase();

  if (!term) {
    return cards;
  }

  return cards.filter((card) => `${card.front} ${card.back}`.toLowerCase().includes(term));
}

function clampIndex(value, max) {
  if (max <= 0) {
    return 0;
  }

  return Math.min(Math.max(value, 0), max - 1);
}

function focusElement(element) {
  if (element && typeof element.focus === 'function') {
    element.focus();
  }
}

function setActiveDeck(deckId) {
  state.activeDeckId = deckId;
  state.ui.activeCardIndex = 0;
  saveState();
  render();
}

function setModal(mode, targetId = null) {
  state.ui.isModalOpen = true;
  app.modalMode = mode;
  app.modalTargetId = targetId;

  if (mode === 'deck') {
    const deck = state.decks.find((item) => item.id === targetId);
    elements.modalTitle.textContent = 'Edit deck';
    elements.modalNameInput.value = deck?.name || '';
    elements.modalCardFields.classList.add('hidden');
    elements.modalNameInput.parentElement.classList.remove('hidden');
  }

  if (mode === 'card') {
    const card = (state.cardsByDeckId[state.activeDeckId] || []).find((item) => item.id === targetId);
    elements.modalTitle.textContent = 'Edit card';
    elements.modalNameInput.value = '';
    elements.modalCardFields.classList.remove('hidden');
    elements.modalFrontInput.value = card?.front || '';
    elements.modalBackInput.value = card?.back || '';
  }

  elements.editorModal.classList.remove('hidden');
  elements.editorModal.setAttribute('aria-hidden', 'false');
  focusElement(elements.modalNameInput);
}

function closeModal() {
  state.ui.isModalOpen = false;
  app.modalMode = null;
  app.modalTargetId = null;
  elements.editorForm.reset();
  elements.editorModal.classList.add('hidden');
  elements.editorModal.setAttribute('aria-hidden', 'true');
}

function createDeck(name) {
  const trimmed = name.trim();
  if (!trimmed) {
    return;
  }

  const deck = {
    id: createId('deck'),
    name: trimmed,
    createdAt: Date.now()
  };

  state.decks.push(deck);
  state.cardsByDeckId[deck.id] = [];
  state.activeDeckId = deck.id;
  state.ui.activeCardIndex = 0;
  saveState();
  render();
  elements.deckForm.reset();
  focusElement(elements.deckNameInput);
}

function deleteDeck(deckId) {
  const list = state.decks.filter((deck) => deck.id !== deckId);
  if (!list.length) {
    state.decks = [];
    state.cardsByDeckId = {};
    state.activeDeckId = null;
    state.ui.activeCardIndex = 0;
    saveState();
    render();
    return;
  }

  state.decks = list;
  delete state.cardsByDeckId[deckId];

  if (state.activeDeckId === deckId) {
    state.activeDeckId = state.decks[0].id;
  }

  state.ui.activeCardIndex = 0;
  saveState();
  render();
}

function addCard(front, back) {
  const activeDeckId = state.activeDeckId;
  if (!activeDeckId) {
    return;
  }

  const card = {
    id: createId('card'),
    front: front.trim(),
    back: back.trim(),
    updatedAt: Date.now()
  };

  state.cardsByDeckId[activeDeckId] = state.cardsByDeckId[activeDeckId] || [];
  state.cardsByDeckId[activeDeckId].push(card);
  state.ui.activeCardIndex = 0;
  saveState();
  render();
  elements.cardForm.reset();
  focusElement(elements.frontInput);
}

function updateCard(cardId, front, back) {
  const activeDeckId = state.activeDeckId;
  const cards = state.cardsByDeckId[activeDeckId] || [];
  const card = cards.find((item) => item.id === cardId);

  if (!card) {
    return;
  }

  card.front = front.trim();
  card.back = back.trim();
  card.updatedAt = Date.now();
  saveState();
  render();
}

function deleteCard(cardId) {
  const activeDeckId = state.activeDeckId;
  const cards = state.cardsByDeckId[activeDeckId] || [];
  state.cardsByDeckId[activeDeckId] = cards.filter((card) => card.id !== cardId);
  state.ui.activeCardIndex = 0;
  saveState();
  render();
}

function flipCard() {
  flipped = !flipped;
  elements.flashcardButton.classList.toggle('is-flipped', flipped);
  elements.flashcardButton.setAttribute('aria-pressed', String(flipped));
}

function moveCard(direction) {
  const cards = getFilteredCards();
  if (!cards.length) {
    return;
  }

  const nextIndex = direction === 'next'
    ? state.ui.activeCardIndex + 1
    : state.ui.activeCardIndex - 1;

  state.ui.activeCardIndex = clampIndex(nextIndex, cards.length);
  flipped = false;
  elements.flashcardButton.classList.remove('is-flipped');
  elements.flashcardButton.setAttribute('aria-pressed', 'false');
  renderStudyCard();
}

function shuffleCards() {
  const activeDeckId = state.activeDeckId;
  const cards = state.cardsByDeckId[activeDeckId] || [];

  for (let index = cards.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [cards[index], cards[randomIndex]] = [cards[randomIndex], cards[index]];
  }

  state.ui.activeCardIndex = 0;
  flipped = false;
  saveState();
  render();
}

function renderDeckList() {
  if (!state.decks.length) {
    elements.deckList.innerHTML = '<p>No decks yet.</p>';
    return;
  }

  elements.deckList.innerHTML = state.decks
    .map((deck) => {
      const active = deck.id === state.activeDeckId ? 'active' : '';
      return `
        <div class="deck-item ${active}">
          <button type="button" class="deck-select" data-action="select-deck" data-deck-id="${deck.id}">${deck.name}</button>
          <div class="deck-actions">
            <button type="button" class="card-action-btn" data-action="edit-deck" data-deck-id="${deck.id}">Edit</button>
            <button type="button" class="card-action-btn" data-action="delete-deck" data-deck-id="${deck.id}">Delete</button>
          </div>
        </div>
      `;
    })
    .join('');
}

function renderCardList() {
  const cards = getFilteredCards();

  if (!state.activeDeckId) {
    elements.cardList.innerHTML = '<p>Create a deck to add your first cards.</p>';
    return;
  }

  if (!cards.length) {
    elements.cardList.innerHTML = '<p>No cards match your search.</p>';
    return;
  }

  elements.cardList.innerHTML = cards
    .map((card) => {
      return `
        <div class="card-item">
          <p><strong>${card.front}</strong> — ${card.back}</p>
          <div class="card-actions">
            <button type="button" class="card-action-btn" data-action="edit-card" data-card-id="${card.id}">Edit</button>
            <button type="button" class="card-action-btn" data-action="delete-card" data-card-id="${card.id}">Delete</button>
          </div>
        </div>
      `;
    })
    .join('');
}

function renderStudyCard() {
  const cards = getFilteredCards();
  const activeDeck = getActiveDeck();

  if (!activeDeck) {
    elements.cardFrontText.textContent = 'No deck selected';
    elements.cardBackText.textContent = 'Create a new deck to begin.';
    elements.cardCounter.textContent = '0 / 0';
    elements.studyStatus.textContent = 'Select or create a deck to begin.';
    elements.flashcardButton.classList.remove('is-flipped');
    elements.flashcardButton.setAttribute('aria-pressed', 'false');
    return;
  }

  if (!cards.length) {
    elements.cardFrontText.textContent = 'No matching cards';
    elements.cardBackText.textContent = 'Try a different keyword or add a card to this deck.';
    elements.cardCounter.textContent = '0 / 0';
    elements.studyStatus.textContent = 'No cards match the current search.';
    elements.flashcardButton.classList.remove('is-flipped');
    elements.flashcardButton.setAttribute('aria-pressed', 'false');
    return;
  }

  const safeIndex = clampIndex(state.ui.activeCardIndex, cards.length);
  state.ui.activeCardIndex = safeIndex;
  const card = cards[safeIndex];

  elements.cardFrontText.textContent = card.front;
  elements.cardBackText.textContent = card.back;
  elements.cardCounter.textContent = `${safeIndex + 1} / ${cards.length}`;
  elements.studyStatus.textContent = `Studying ${activeDeck.name}.`;
  elements.flashcardButton.classList.toggle('is-flipped', flipped);
  elements.flashcardButton.setAttribute('aria-pressed', String(flipped));
}

function render() {
  renderDeckList();
  renderCardList();
  renderStudyCard();
  const activeDeck = getActiveDeck();
  elements.cardForm.querySelector('button').disabled = !activeDeck;
}

function handleDeckSubmit(event) {
  event.preventDefault();
  createDeck(elements.deckNameInput.value);
}

function handleCardSubmit(event) {
  event.preventDefault();
  const front = elements.frontInput.value;
  const back = elements.backInput.value;

  if (!front.trim() || !back.trim()) {
    return;
  }

  addCard(front, back);
}

function handleDocumentClick(event) {
  const actionTarget = event.target.closest('[data-action]');
  if (!actionTarget) {
    return;
  }

  const { action } = actionTarget.dataset;

  if (action === 'select-deck') {
    setActiveDeck(actionTarget.dataset.deckId);
    return;
  }

  if (action === 'delete-deck') {
    deleteDeck(actionTarget.dataset.deckId);
    return;
  }

  if (action === 'edit-deck') {
    setModal('deck', actionTarget.dataset.deckId);
    return;
  }

  if (action === 'edit-card') {
    setModal('card', actionTarget.dataset.cardId);
    return;
  }

  if (action === 'delete-card') {
    deleteCard(actionTarget.dataset.cardId);
  }
}

function handleEditorSubmit(event) {
  event.preventDefault();

  if (app.modalMode === 'deck') {
    const deck = state.decks.find((item) => item.id === app.modalTargetId);
    if (deck) {
      deck.name = elements.modalNameInput.value.trim();
      saveState();
      render();
    }
  }

  if (app.modalMode === 'card') {
    updateCard(app.modalTargetId, elements.modalFrontInput.value, elements.modalBackInput.value);
  }

  closeModal();
}

function handleKeydown(event) {
  if (event.key === 'ArrowRight') {
    moveCard('next');
  }

  if (event.key === 'ArrowLeft') {
    moveCard('previous');
  }

  if (event.key === ' ' || event.key === 'Enter') {
    if (document.activeElement === elements.flashcardButton) {
      event.preventDefault();
      flipCard();
    }
  }

  if (event.key === 'Escape' && state.ui.isModalOpen) {
    closeModal();
  }
}

function registerListeners() {
  elements.deckForm.addEventListener('submit', handleDeckSubmit);
  elements.cardForm.addEventListener('submit', handleCardSubmit);
  document.addEventListener('click', handleDocumentClick);
  elements.searchInput.addEventListener('input', (event) => {
    searchQuery.value = event.target.value;
    state.ui.activeCardIndex = 0;
    render();
  });
  elements.flashcardButton.addEventListener('click', flipCard);
  elements.prevBtn.addEventListener('click', () => moveCard('previous'));
  elements.nextBtn.addEventListener('click', () => moveCard('next'));
  elements.shuffleBtn.addEventListener('click', shuffleCards);
  elements.createDeckBtn.addEventListener('click', () => focusElement(elements.deckNameInput));
  elements.editorForm.addEventListener('submit', handleEditorSubmit);
  elements.closeModalBtn.addEventListener('click', closeModal);
  elements.cancelModalBtn.addEventListener('click', closeModal);
  document.addEventListener('keydown', handleKeydown);
}

function init() {
  if (!state.decks.length) {
    const fallback = getDefaultState();
    state.decks = fallback.decks;
    state.cardsByDeckId = fallback.cardsByDeckId;
    state.activeDeckId = fallback.activeDeckId;
  }

  if (!state.activeDeckId && state.decks.length) {
    state.activeDeckId = state.decks[0].id;
  }

  saveState();
  registerListeners();
  render();
}

init();
