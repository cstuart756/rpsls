// js/app.js
// Defer-loaded; minimal dependencies; accessible single-page quiz logic

(function () {
  'use strict';

  /* ---------------------------
     Sample quiz data (can be replaced/imported)
     Each question:
       id, category, question, image {html string or null, alt}, choices: [{id, text}], answer (id), explanation
  ----------------------------*/
  const QUIZ_DATA = [
    {
      id: 'q1',
      category: 'sports',
      question: 'Which country won the FIFA World Cup in 2018?',
      image: { html: null, alt: '' },
      choices: [
        { id: 'a', text: 'Brazil' },
        { id: 'b', text: 'France' },
        { id: 'c', text: 'Germany' },
        { id: 'd', text: 'Argentina' }
      ],
      answer: 'b',
      explanation: 'France defeated Croatia 4–2 in the final to win the 2018 FIFA World Cup.'
    },
    {
      id: 'q2',
      category: 'movies',
      question: 'Who directed the movie "Inception" (2010)?',
      image: { html: null, alt: '' },
      choices: [
        { id: 'a', text: 'Christopher Nolan' },
        { id: 'b', text: 'Steven Spielberg' },
        { id: 'c', text: 'James Cameron' },
        { id: 'd', text: 'Quentin Tarantino' }
      ],
      answer: 'a',
      explanation: '"Inception" was written and directed by Christopher Nolan.'
    },
    {
      id: 'q3',
      category: 'literature',
      question: 'Which author wrote "Pride and Prejudice"?',
      image: { html: null, alt: '' },
      choices: [
        { id: 'a', text: 'Charlotte Brontë' },
        { id: 'b', text: 'Jane Austen' },
        { id: 'c', text: 'Mary Shelley' },
        { id: 'd', text: 'Emily Brontë' }
      ],
      answer: 'b',
      explanation: 'Jane Austen wrote "Pride and Prejudice", first published in 1813.'
    },
    {
      id: 'q4',
      category: 'personality',
      question: 'You prefer to recharge by spending time alone rather than in a crowd. True or false?',
      image: { html: null, alt: '' },
      choices: [
        { id: 'a', text: 'True' },
        { id: 'b', text: 'False' }
      ],
      answer: 'a',
      explanation: 'This is a classic introvert/extravert indicator — no right or wrong for a personality quiz.'
    },
    {
      id: 'q5',
      category: 'sports',
      question: 'In tennis, what is the term for zero points?',
      image: { html: null, alt: '' },
      choices: [
        { id: 'a', text: 'Love' },
        { id: 'b', text: 'Nil' },
        { id: 'c', text: 'Zero' },
        { id: 'd', text: 'Duck' }
      ],
      answer: 'a',
      explanation: 'In tennis scoring, zero points is called "love".'
    },
    {
      id: 'q6',
      category: 'movies',
      question: 'Which movie features the quote: "May the Force be with you"?',
      image: { html: null, alt: '' },
      choices: [
        { id: 'a', text: 'Star Wars' },
        { id: 'b', text: 'Star Trek' },
        { id: 'c', text: 'The Matrix' },
        { id: 'd', text: 'Blade Runner' }
      ],
      answer: 'a',
      explanation: 'This famous line is from the Star Wars franchise.'
    }
  ];

  /* ---------------------------
     DOM elements
  ----------------------------*/
  const el = {
    usernameForm: document.getElementById('username-form'),
    usernameInput: document.getElementById('username-input'),
    saveUsernameBtn: document.getElementById('save-username'),
    greeting: document.getElementById('greeting'),
    startBtn: document.getElementById('start-btn'),
    categorySelect: document.getElementById('category-select'),
    timedSwitch: document.getElementById('timed-switch'),
    intro: document.getElementById('intro'),

    quizArea: document.getElementById('quiz-area'),
    questionText: document.getElementById('question-text'),
    questionImage: document.getElementById('question-image'),
    choices: document.getElementById('choices'),
    submitBtn: document.getElementById('submit-btn'),
    skipBtn: document.getElementById('skip-btn'),
    feedback: document.getElementById('feedback'),
    qIndex: document.getElementById('q-index'),
    qTotal: document.getElementById('q-total'),
    scoreEl: document.getElementById('score'),
    timerEl: document.getElementById('timer'),

    resultsArea: document.getElementById('results-area'),
    finalSummary: document.getElementById('final-summary'),
    finalCorrect: document.getElementById('final-correct'),
    finalIncorrect: document.getElementById('final-incorrect'),
    finalScore: document.getElementById('final-score'),
    retryBtn: document.getElementById('retry-btn'),
    viewLeaderboardBtn: document.getElementById('view-leaderboard'),
    certificate: document.getElementById('certificate'),

    bestScore: document.getElementById('best-score'),
    savedUsername: document.getElementById('saved-username'),
    leaderboardList: document.getElementById('leaderboard-list'),
  };

  /* ---------------------------
     App state
  ----------------------------*/
  let state = {
    username: localStorage.getItem('quiz_username') || 'Guest',
    bestScore: Number(localStorage.getItem('quiz_best_score')) || 0,
    leaderboard: JSON.parse(localStorage.getItem('quiz_leaderboard') || '[]'),
    questions: [],
    currentIndex: 0,
    score: 0,
    correctCount: 0,
    incorrectCount: 0,
    selectedChoice: null,
    timed: false,
    timer: null,
    timeLeft: 30,
  };

  /* ---------------------------
     Utility helpers
  ----------------------------*/
  function qs(selector, parent = document) { return parent.querySelector(selector); }
  function qsa(selector, parent = document) { return Array.from(parent.querySelectorAll(selector)); }

  function shuffle(array) {
    // Fisher-Yates
    const arr = array.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function saveToStorage() {
    localStorage.setItem('quiz_username', state.username);
    localStorage.setItem('quiz_best_score', String(state.bestScore));
    localStorage.setItem('quiz_leaderboard', JSON.stringify(state.leaderboard.slice(0, 20)));
  }

  function formatUsername(name) {
    return (name || 'Guest').trim().slice(0, 24);
  }

  /* ---------------------------
     UI renderers
  ----------------------------*/
  function updateGreeting() {
    el.greeting.textContent = `Hello, ${state.username}! Ready to test yourself?`;
    el.savedUsername.textContent = state.username;
    el.bestScore.textContent = state.bestScore > 0 ? state.bestScore : '—';
    renderLeaderboard();
  }

  function renderLeaderboard() {
    // show top 10
    el.leaderboardList.innerHTML = '';
    const list = state.leaderboard.slice(0, 10);
    if (list.length === 0) {
      el.leaderboardList.innerHTML = '<li>No scores yet.</li>';
      return;
    }
    list.forEach(entry => {
      const li = document.createElement('li');
      li.textContent = `${entry.username} — ${entry.score}`;
      el.leaderboardList.appendChild(li);
    });
  }

  function showElement(elm) { elm.classList.remove('hidden'); elm.removeAttribute('hidden'); }
  function hideElement(elm) { elm.classList.add('hidden'); elm.setAttribute('hidden', ''); }

  function renderQuestion() {
    const q = state.questions[state.currentIndex];
    if (!q) return;
    el.qIndex.textContent = String(state.currentIndex + 1);
    el.qTotal.textContent = String(state.questions.length);
    el.questionText.textContent = q.question;

    // Image handling: q.image.html can be an <img> or inline svg string. Provide alt via aria-label for decorative
    el.questionImage.innerHTML = '';
    if (q.image && q.image.html) {
      // If image provided as HTML string
      el.questionImage.innerHTML = q.image.html;
      const img = el.questionImage.querySelector('img, svg');
      if (img && q.image.alt) img.setAttribute('alt', q.image.alt);
      el.questionImage.removeAttribute('aria-hidden');
    } else {
      el.questionImage.setAttribute('aria-hidden', 'true');
    }

    // Render choices
    el.choices.innerHTML = '';
    q.choices.forEach((choice, idx) => {
      const id = `choice-${q.id}-${choice.id}`;
      const label = document.createElement('label');
      label.className = 'choice';
      label.tabIndex = 0;
      label.setAttribute('role', 'radio');
      label.setAttribute('aria-checked', 'false');
      label.dataset.choiceId = choice.id;

      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'quiz-choice';
      radio.value = choice.id;
      radio.id = id;
      radio.tabIndex = -1; // keep label as the focus target

      const span = document.createElement('span');
      span.textContent = choice.text;

      label.appendChild(radio);
      label.appendChild(span);

      // Click and keyboard interactions
      label.addEventListener('click', () => selectChoice(label, radio));
      label.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          radio.checked = true;
          selectChoice(label, radio);
        } else if (ev.key === 'ArrowDown' || ev.key === 'ArrowRight') {
          ev.preventDefault();
          focusNextChoice(idx);
        } else if (ev.key === 'ArrowUp' || ev.key === 'ArrowLeft') {
          ev.preventDefault();
          focusPrevChoice(idx);
        }
      });

      el.choices.appendChild(label);
    });

    // Reset selection
    state.selectedChoice = null;
    el.submitBtn.disabled = true;
    el.feedback.textContent = '';
    el.feedback.className = 'feedback';
    // Manage focus
    const firstChoice = el.choices.querySelector('.choice');
    if (firstChoice) firstChoice.focus();

    // Timer
    if (state.timed) {
      startTimer();
    } else {
      stopTimer();
    }
  }

  function selectChoice(labelEl, radioEl) {
    // Clear previous
    qsa('.choice', el.choices).forEach(ch => {
      ch.setAttribute('aria-checked', 'false');
      ch.classList.remove('selected');
      const r = ch.querySelector('input[type="radio"]');
      if (r) r.checked = false;
    });
    labelEl.setAttribute('aria-checked', 'true');
    labelEl.classList.add('selected');
    radioEl.checked = true;
    state.selectedChoice = radioEl.value;
    el.submitBtn.disabled = false;
    el.submitBtn.focus(); // bring action into reach
  }

  function focusNextChoice(currentIdx) {
    const choices = qsa('.choice', el.choices);
    const next = choices[(currentIdx + 1) % choices.length];
    if (next) next.focus();
  }
  function focusPrevChoice(currentIdx) {
    const choices = qsa('.choice', el.choices);
    const prev = choices[(currentIdx - 1 + choices.length) % choices.length];
    if (prev) prev.focus();
  }

  /* ---------------------------
     Timer functions (optional)
  ----------------------------*/
  function startTimer() {
    stopTimer();
    state.timeLeft = 30;
    el.timerEl.hidden = false;
    el.timerEl.textContent = String(state.timeLeft);
    state.timer = setInterval(() => {
      state.timeLeft -= 1;
      el.timerEl.textContent = String(state.timeLeft);
      if (state.timeLeft <= 0) {
        clearInterval(state.timer);
        state.timer = null;
        handleTimeout();
      }
    }, 1000);
  }
  function stopTimer() {
    if (state.timer) {
      clearInterval(state.timer);
      state.timer = null;
    }
    el.timerEl.hidden = true;
  }

  /* ---------------------------
     Answer handling
  ----------------------------*/
  function handleSubmit() {
    const q = state.questions[state.currentIndex];
    const selected = state.selectedChoice;
    if (!q) return;
    if (!selected) return;
    // Stop timer for this question
    stopTimer();

    const isCorrect = selected === q.answer;
    if (isCorrect) {
      state.score += 10;
      state.correctCount += 1;
      el.feedback.className = 'feedback success';
      el.feedback.innerHTML = renderFeedback(true, q.explanation);
    } else {
      state.incorrectCount += 1;
      el.feedback.className = 'feedback error';
      el.feedback.innerHTML = renderFeedback(false, q.explanation);
    }
    el.scoreEl.textContent = String(state.score);

    // Disable submit until next
    el.submitBtn.disabled = true;

    // After short delay, advance
    setTimeout(() => {
      state.currentIndex += 1;
      if (state.currentIndex >= state.questions.length) {
        showResults();
      } else {
        renderQuestion();
      }
    }, 1400);
  }

  function handleSkip() {
    stopTimer();
    state.incorrectCount += 1; // count skip as incorrect for scoring; change if desired
    el.feedback.className = 'feedback error';
    el.feedback.textContent = 'Question skipped.';
    el.submitBtn.disabled = true;
    setTimeout(() => {
      state.currentIndex += 1;
      if (state.currentIndex >= state.questions.length) {
        showResults();
      } else {
        renderQuestion();
      }
    }, 800);
  }

  function handleTimeout() {
    el.feedback.className = 'feedback error';
    el.feedback.textContent = 'Time up for this question.';
    state.incorrectCount += 1;
    el.submitBtn.disabled = true;
    setTimeout(() => {
      state.currentIndex += 1;
      if (state.currentIndex >= state.questions.length) {
        showResults();
      } else {
        renderQuestion();
      }
    }, 900);
  }

  function renderFeedback(correct, explanation) {
    const wrapper = document.createElement('div');
    const svgTemplate = correct ? document.getElementById('correct-svg') : document.getElementById('incorrect-svg');
    // Clone SVG to display
    const svgClone = svgTemplate.cloneNode(true);
    svgClone.style.display = 'block';
    svgClone.removeAttribute('id');
    svgClone.setAttribute('width', '84');
    svgClone.setAttribute('height', '84');
    svgClone.setAttribute('aria-hidden', 'true');

    const text = document.createElement('div');
    text.innerHTML = `<p>${correct ? '<strong>Correct</strong>' : '<strong>Incorrect</strong>'}</p><p>${escapeHtml(explanation)}</p>`;
    wrapper.appendChild(svgClone);
    wrapper.appendChild(text);
    return wrapper.innerHTML;
  }

  /* ---------------------------
     Results and leaderboard
  ----------------------------*/
  function showResults() {
    hideElement(el.quizArea);
    showElement(el.resultsArea);

    el.finalCorrect.textContent = String(state.correctCount);
    el.finalIncorrect.textContent = String(state.incorrectCount);
    el.finalScore.textContent = String(state.score);

    el.finalSummary.textContent = `${state.username}, you finished the quiz!`;

    // Save score to leaderboard and best score
    const entry = { username: state.username, score: state.score, date: new Date().toISOString() };
    state.leaderboard.unshift(entry);
    state.leaderboard.sort((a, b) => b.score - a.score);
    state.leaderboard = state.leaderboard.slice(0, 50);
    if (state.score > state.bestScore) {
      state.bestScore = state.score;
      el.bestScore.textContent = String(state.bestScore);
    }
    saveToStorage();
    renderLeaderboard();

    // Simple certificate (data URL generation could be implemented)
    const certHtml = `<p>Certificate: ${escapeHtml(state.username)} scored ${state.score} points.</p>`;
    el.certificate.innerHTML = certHtml;
    el.certificate.removeAttribute('aria-hidden');
  }

  /* ---------------------------
     Quiz lifecycle
  ----------------------------*/
  function startQuiz() {
    // pick category
    const cat = el.categorySelect.value;
    let questionsPool = QUIZ_DATA.slice();
    if (cat !== 'any') {
      questionsPool = questionsPool.filter(q => q.category === cat);
    }
    if (questionsPool.length === 0) {
      alert('No questions available for this category.');
      return;
    }

    // Shuffle and limit to e.g. 6 questions
    state.questions = shuffle(questionsPool).slice(0, 6);
    state.currentIndex = 0;
    state.score = 0;
    state.correctCount = 0;
    state.incorrectCount = 0;
    state.selectedChoice = null;
    state.timed = el.timedSwitch.checked;
    el.scoreEl.textContent = '0';
    el.qTotal.textContent = String(state.questions.length);

    // UI
    hideElement(el.intro);
    hideElement(el.resultsArea);
    showElement(el.quizArea);
    renderQuestion();
  }

  /* ---------------------------
     Event bindings
  ----------------------------*/
  function bindEvents() {
    // Username save
    el.usernameForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const v = formatUsername(el.usernameInput.value || state.username);
      state.username = v || 'Guest';
      updateGreeting();
      saveToStorage();
      // Announce to screen reader
      el.greeting.setAttribute('aria-live', 'polite');
    });

    el.startBtn.addEventListener('click', () => {
      startQuiz();
    });

    // submit and skip
    el.submitBtn.addEventListener('click', () => {
      handleSubmit();
    });
    el.skipBtn.addEventListener('click', () => {
      handleSkip();
    });

    // keyboard Enter on Start when focused
    el.startBtn.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') {
        ev.preventDefault();
        startQuiz();
      }
    });

    // Retry
    el.retryBtn.addEventListener('click', () => {
      // return to intro
      hideElement(el.resultsArea);
      showElement(el.intro);
    });

    // View leaderboard
    el.viewLeaderboardBtn.addEventListener('click', () => {
      // show sidebar or scroll
      window.scrollTo({ top: 0, behavior: 'smooth' });
      // Optionally highlight leaderboard
      const lb = el.leaderboardList;
      lb.scrollIntoView({ behavior: 'smooth' });
    });

    // Accessibility — respond to change events on radio inputs if any (delegation)
    el.choices.addEventListener('change', (ev) => {
      // update selection when radio change occurs
      const r = el.choices.querySelector('input[type="radio"]:checked');
      if (r) {
        state.selectedChoice = r.value;
        el.submitBtn.disabled = false;
      }
    });
  }

  /* ---------------------------
     Small helpers
  ----------------------------*/
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;');
  }

  /* ---------------------------
     Init
  ----------------------------*/
  function init() {
    // Populate initial UI
    el.usernameInput.value = state.username === 'Guest' ? '' : state.username;
    updateGreeting();
    bindEvents();

    // Show intro by default
    showElement(el.intro);
    hideElement(el.quizArea);
    hideElement(el.resultsArea);
  }

  // Start
  init();

  // Expose for debugging (optional)
  window.QUIZ = {
    state,
    startQuiz,
    renderQuestion,
    renderLeaderboard,
  };

})();
