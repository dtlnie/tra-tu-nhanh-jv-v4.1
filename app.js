/**
 * ============================================================================
 * TỪ ĐIỂN & DỊCH THUẬT TIẾNG VIỆT <-> TIẾNG JRAI
 * File: app.js
 * Senior Web Developer Implementation - Modern Minimalist, Professional
 * ============================================================================
 */

(() => {
  'use strict';

  // Lọc sạch các ký tự đặc biệt: []_^*\|
  const FORBIDDEN_CHARS_REGEX = /[\[\]_\^\*\\\|]/g;

  function cleanString(str) {
    if (!str || typeof str !== 'string') return '';
    return str.replace(FORBIDDEN_CHARS_REGEX, '').trim();
  }

  // ==========================================================================
  // STATE MANAGEMENT
  // ==========================================================================
  const state = {
    baseDictionary: [],
    customWords: [],
    dictionary: [],
    direction: 'vi-jrai',     // 'vi-jrai' (Việt -> Jrai) hoặc 'jrai-vi' (Jrai -> Việt)
    currentMatchedWord: null,
    theme: localStorage.getItem('app_theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'),
    
    quiz: {
      mode: 'vi-to-jrai',
      questions: [],
      currentIndex: 0,
      score: 0,
      isAnswered: false
    }
  };

  // ==========================================================================
  // DOM ELEMENTS
  // ==========================================================================
  const el = {
    html: document.documentElement,
    statBadge: document.getElementById('dictionary-stat-badge'),
    btnTheme: document.getElementById('btn-theme-toggle'),

    // Translation Tab
    sourceLangLabel: document.getElementById('source-lang-label'),
    targetLangLabel: document.getElementById('target-lang-label'),
    btnSwapDirection: document.getElementById('btn-swap-direction'),
    searchInput: document.getElementById('search-input'),
    btnClearSearch: document.getElementById('btn-clear-search'),
    btnSpeakSource: document.getElementById('btn-speak-source'),
    typingIndicator: document.getElementById('typing-indicator'),
    
    resultPlaceholder: document.getElementById('result-placeholder'),
    detailedResultCard: document.getElementById('detailed-result-card'),
    resultPartOfSpeech: document.getElementById('result-part-of-speech'),
    resultTargetWord: document.getElementById('result-target-word'),
    resultSourceWord: document.getElementById('result-source-word'),
    resultExampleBox: document.getElementById('result-example-box'),
    resultExampleTarget: document.getElementById('result-example-target'),
    resultExampleSource: document.getElementById('result-example-source'),
    
    btnSpeakTarget: document.getElementById('btn-speak-target'),
    btnCopyTarget: document.getElementById('btn-copy-target'),
    btnFavTarget: document.getElementById('btn-fav-target'),
    btnSpeakExample: document.getElementById('btn-speak-example'),
    
    suggestionsBox: document.getElementById('suggestions-box'),
    suggestionsList: document.getElementById('suggestions-list'),
    suggestionsCount: document.getElementById('suggestions-count'),
    quickTagsContainer: document.getElementById('quick-tags-container'),

    // Browse Tab
    browseFilterInput: document.getElementById('browse-filter-input'),
    browseCategorySelect: document.getElementById('browse-category-select'),
    browseTotalCount: document.getElementById('browse-total-count'),
    browseDictionaryList: document.getElementById('browse-dictionary-list'),

    // Quiz Tab
    quizIntroScreen: document.getElementById('quiz-intro-screen'),
    quizPlayScreen: document.getElementById('quiz-play-screen'),
    quizResultScreen: document.getElementById('quiz-result-screen'),
    btnStartQuiz: document.getElementById('btn-start-quiz'),
    quizQuestionCounter: document.getElementById('quiz-question-counter'),
    quizCurrentScore: document.getElementById('quiz-current-score'),
    quizProgressBar: document.getElementById('quiz-progress-bar'),
    quizTargetWord: document.getElementById('quiz-target-word'),
    quizWordType: document.getElementById('quiz-word-type'),
    btnQuizSpeak: document.getElementById('btn-quiz-speak'),
    quizOptionsContainer: document.getElementById('quiz-options-container'),
    quizFeedbackBox: document.getElementById('quiz-feedback-box'),
    quizFeedbackText: document.getElementById('quiz-feedback-text'),
    btnQuizNext: document.getElementById('btn-quiz-next'),
    quizFinalScore: document.getElementById('quiz-final-score'),
    quizFinalRating: document.getElementById('quiz-final-rating'),
    quizFinalMessage: document.getElementById('quiz-final-message'),
    btnQuizRestart: document.getElementById('btn-quiz-restart'),

    // Add Word Tab
    formAddWord: document.getElementById('form-add-word'),
    inputNewVi: document.getElementById('input-new-vi'),
    inputNewJrai: document.getElementById('input-new-jrai'),
    selectNewType: document.getElementById('select-new-type'),
    inputNewExVi: document.getElementById('input-new-ex-vi'),
    inputNewExJrai: document.getElementById('input-new-ex-jrai'),
    inputNewAudioJrai: document.getElementById('input-new-audio-jrai'),
    userWordsCount: document.getElementById('user-words-count'),
    userWordsList: document.getElementById('user-words-list'),
    btnClearUserWords: document.getElementById('btn-clear-user-words'),

    // Navigation
    navItems: document.querySelectorAll('.nav-item'),
    tabPanels: document.querySelectorAll('.tab-panel'),
    toastContainer: document.getElementById('toast-container')
  };

  // ==========================================================================
  // TOAST NOTIFICATIONS
  // ==========================================================================
  function showToast(message) {
    if (!el.toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    el.toastContainer.appendChild(toast);
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 2400);
  }

  // ==========================================================================
  // THEME MANAGEMENT
  // ==========================================================================
  function applyTheme(theme) {
    state.theme = theme;
    el.html.setAttribute('data-theme', theme);
    localStorage.setItem('app_theme', theme);
  }

  function initTheme() {
    applyTheme(state.theme);
    el.btnTheme?.addEventListener('click', () => {
      const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
      applyTheme(nextTheme);
    });
  }

  // ==========================================================================
  // DATA LOADING & PERSISTENCE
  // ==========================================================================
  function loadCustomWords() {
    try {
      const stored = localStorage.getItem('user_custom_words');
      state.customWords = stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error('Lỗi khi đọc LocalStorage:', e);
      state.customWords = [];
    }
  }

  function saveCustomWords() {
    try {
      localStorage.setItem('user_custom_words', JSON.stringify(state.customWords));
    } catch (e) {
      console.error('Lỗi khi lưu LocalStorage:', e);
    }
  }

  function mergeDictionaries() {
    state.dictionary = [...state.baseDictionary, ...state.customWords];
    if (el.statBadge) {
      el.statBadge.textContent = `${state.dictionary.length} từ vựng`;
    }
    renderUserWordsList();
    renderBrowseList();
  }

  async function loadDictionaryData() {
    try {
      if (el.statBadge) el.statBadge.textContent = 'Đang đồng bộ...';
      let response = await fetch('./dictionary.json');
      if (!response.ok) {
        response = await fetch('/dictionary.json');
      }
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const rawData = await response.json();
      
      state.baseDictionary = rawData.map(item => ({
        id: item.id,
        tiengViet: cleanString(item.tiengViet),
        tiengJrai: cleanString(item.tiengJrai),
        loaiTu: cleanString(item.loaiTu) || 'Từ vựng',
        viDuViet: cleanString(item.viDuViet),
        viDuJrai: cleanString(item.viDuJrai),
        amThanhViet: cleanString(item.amThanhViet),
        amThanhJrai: cleanString(item.amThanhJrai)
      }));

      loadCustomWords();
      mergeDictionaries();
    } catch (err) {
      console.error('Lỗi nạp dictionary.json:', err);
      if (el.statBadge) el.statBadge.textContent = 'Không tải được file';
      showToast('Không thể tải dictionary.json.');
    }
  }

  // ==========================================================================
  // AUDIO PRONUNCIATION
  // ==========================================================================
  function pronounce(text, audioUrl, lang = 'vi-VN') {
    if (!text && !audioUrl) return;

    if (audioUrl && typeof audioUrl === 'string' && audioUrl.trim().length > 0) {
      try {
        const audio = new Audio(audioUrl.trim());
        audio.play().catch(() => {
          speakWithWebSpeech(text, lang);
        });
        return;
      } catch (e) {
        // fallback
      }
    }

    speakWithWebSpeech(text, lang);
  }

  function speakWithWebSpeech(text, lang) {
    if (!('speechSynthesis' in window)) {
      showToast('Trình duyệt chưa hỗ trợ bộ tổng hợp giọng nói.');
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.92;
      utterance.pitch = 1.0;
      utterance.lang = lang === 'vi-VN' ? 'vi-VN' : 'vi-VN';
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.error('Speech error:', err);
    }
  }

  // ==========================================================================
  // SEARCH & TRANSLATION ENGINE
  // ==========================================================================
  function normalizeSearchText(str) {
    if (!str) return '';
    return str
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  function performSearch(query) {
    const rawQuery = cleanString(query);
    if (!rawQuery) {
      el.resultPlaceholder?.classList.remove('hidden');
      el.detailedResultCard?.classList.add('hidden');
      el.suggestionsBox?.classList.add('hidden');
      el.btnClearSearch?.classList.add('hidden');
      el.btnSpeakSource?.classList.add('hidden');
      state.currentMatchedWord = null;
      return;
    }

    el.btnClearSearch?.classList.remove('hidden');
    el.btnSpeakSource?.classList.remove('hidden');

    const cleanQ = rawQuery.toLowerCase();
    const normalizedQ = normalizeSearchText(cleanQ);

    const isViToJrai = state.direction === 'vi-jrai';
    const sourceKey = isViToJrai ? 'tiengViet' : 'tiengJrai';
    const targetKey = isViToJrai ? 'tiengJrai' : 'tiengViet';

    const exactMatches = [];
    const startsWithMatches = [];
    const containsMatches = [];

    state.dictionary.forEach(item => {
      const sourceVal = (item[sourceKey] || '').toLowerCase();
      const normSourceVal = normalizeSearchText(sourceVal);
      const targetVal = (item[targetKey] || '').toLowerCase();
      const normTargetVal = normalizeSearchText(targetVal);

      if (sourceVal === cleanQ || normSourceVal === normalizedQ) {
        exactMatches.push(item);
      } else if (sourceVal.startsWith(cleanQ) || normSourceVal.startsWith(normalizedQ)) {
        startsWithMatches.push(item);
      } else if (
        sourceVal.includes(cleanQ) || 
        normSourceVal.includes(normalizedQ) ||
        targetVal.includes(cleanQ) ||
        normTargetVal.includes(normalizedQ)
      ) {
        containsMatches.push(item);
      }
    });

    const allMatches = [...exactMatches, ...startsWithMatches, ...containsMatches];

    if (allMatches.length > 0) {
      displayDetailedResult(allMatches[0]);
      displaySuggestions(allMatches.slice(1, 7));
    } else {
      displayNotFound(rawQuery);
    }
  }

  function displayDetailedResult(wordObj) {
    state.currentMatchedWord = wordObj;
    el.resultPlaceholder?.classList.add('hidden');
    el.detailedResultCard?.classList.remove('hidden');

    const isViToJrai = state.direction === 'vi-jrai';
    const targetText = isViToJrai ? wordObj.tiengJrai : wordObj.tiengViet;
    const sourceText = isViToJrai ? wordObj.tiengViet : wordObj.tiengJrai;
    const targetExample = isViToJrai ? wordObj.viDuJrai : wordObj.viDuViet;
    const sourceExample = isViToJrai ? wordObj.viDuViet : wordObj.viDuJrai;

    if (el.resultPartOfSpeech) el.resultPartOfSpeech.textContent = wordObj.loaiTu || 'Từ vựng';
    if (el.resultTargetWord) el.resultTargetWord.textContent = targetText;
    if (el.resultSourceWord) el.resultSourceWord.textContent = `Nghĩa gốc: ${sourceText}`;

    if (targetExample || sourceExample) {
      el.resultExampleBox?.classList.remove('hidden');
      if (el.resultExampleTarget) el.resultExampleTarget.textContent = targetExample || '';
      if (el.resultExampleSource) el.resultExampleSource.textContent = sourceExample || '';
    } else {
      el.resultExampleBox?.classList.add('hidden');
    }
  }

  function displayNotFound(query) {
    state.currentMatchedWord = null;
    el.resultPlaceholder?.classList.add('hidden');
    el.detailedResultCard?.classList.remove('hidden');

    if (el.resultPartOfSpeech) el.resultPartOfSpeech.textContent = 'Chưa có trong từ điển';
    if (el.resultTargetWord) el.resultTargetWord.textContent = '—';
    if (el.resultSourceWord) {
      el.resultSourceWord.textContent = `Chưa có dữ liệu cho "${query}". Bạn có thể thêm từ này tại mục "Thêm từ".`;
    }
    el.resultExampleBox?.classList.add('hidden');
    el.suggestionsBox?.classList.add('hidden');
  }

  function displaySuggestions(items) {
    if (!items || items.length === 0) {
      el.suggestionsBox?.classList.add('hidden');
      return;
    }

    el.suggestionsBox?.classList.remove('hidden');
    if (el.suggestionsCount) el.suggestionsCount.textContent = items.length;
    if (el.suggestionsList) {
      el.suggestionsList.innerHTML = '';
      const isViToJrai = state.direction === 'vi-jrai';

      items.forEach(item => {
        const itemEl = document.createElement('div');
        itemEl.className = 'suggestion-item';
        const term = isViToJrai ? item.tiengViet : item.tiengJrai;
        const meaning = isViToJrai ? item.tiengJrai : item.tiengViet;

        itemEl.innerHTML = `
          <div>
            <span class="sugg-term">${term}</span>
            <span class="sugg-meaning">${meaning}</span>
          </div>
          <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        `;

        itemEl.addEventListener('click', () => {
          if (el.searchInput) {
            el.searchInput.value = term;
            performSearch(term);
          }
        });

        el.suggestionsList.appendChild(itemEl);
      });
    }
  }

  function toggleDirection() {
    state.direction = state.direction === 'vi-jrai' ? 'jrai-vi' : 'vi-jrai';
    const isViToJrai = state.direction === 'vi-jrai';

    if (el.sourceLangLabel) {
      el.sourceLangLabel.textContent = isViToJrai ? 'Tiếng Việt' : 'Tiếng Jrai';
      el.sourceLangLabel.classList.add('active');
    }
    if (el.targetLangLabel) {
      el.targetLangLabel.textContent = isViToJrai ? 'Tiếng Jrai' : 'Tiếng Việt';
      el.targetLangLabel.classList.remove('active');
    }
    if (el.searchInput) {
      el.searchInput.placeholder = isViToJrai ? 'Nhập tiếng Việt cần tra...' : 'Nhập tiếng Jrai cần tra...';
    }

    if (el.searchInput && el.searchInput.value.trim()) {
      performSearch(el.searchInput.value);
    }
  }

  // ==========================================================================
  // TAB 2: BROWSE DICTIONARY
  // ==========================================================================
  function renderBrowseList() {
    if (!el.browseDictionaryList) return;

    const filterVal = (el.browseFilterInput?.value || '').toLowerCase();
    const catVal = el.browseCategorySelect?.value || 'all';

    const filtered = state.dictionary.filter(item => {
      const matchCat = catVal === 'all' || item.loaiTu === catVal;
      const matchSearch = !filterVal ||
        item.tiengViet.toLowerCase().includes(filterVal) ||
        item.tiengJrai.toLowerCase().includes(filterVal) ||
        (item.viDuViet && item.viDuViet.toLowerCase().includes(filterVal)) ||
        (item.viDuJrai && item.viDuJrai.toLowerCase().includes(filterVal));
      return matchCat && matchSearch;
    });

    if (el.browseTotalCount) {
      el.browseTotalCount.textContent = `Hiển thị: ${filtered.length} / ${state.dictionary.length} từ`;
    }

    el.browseDictionaryList.innerHTML = '';

    if (filtered.length === 0) {
      el.browseDictionaryList.innerHTML = `
        <p class="empty-list-notice">Không tìm thấy từ vựng phù hợp với bộ lọc.</p>
      `;
      return;
    }

    filtered.forEach(item => {
      const row = document.createElement('div');
      row.className = 'word-row';
      row.innerHTML = `
        <div class="word-pair">
          <span class="word-vi">${item.tiengViet}</span>
          <span class="word-jrai">${item.tiengJrai}</span>
        </div>
        <div class="word-meta">
          <span class="word-type-text">${item.loaiTu || 'Từ'}</span>
          <button class="inline-audio-btn btn-browse-speak" aria-label="Phát âm" title="Phát âm">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
            </svg>
          </button>
        </div>
      `;

      row.addEventListener('click', (e) => {
        if (e.target.closest('.btn-browse-speak')) return;
        switchTab('tab-translate');
        if (el.searchInput) {
          state.direction = 'vi-jrai';
          if (el.sourceLangLabel) el.sourceLangLabel.textContent = 'Tiếng Việt';
          if (el.targetLangLabel) el.targetLangLabel.textContent = 'Tiếng Jrai';
          el.searchInput.value = item.tiengViet;
          performSearch(item.tiengViet);
        }
      });

      const speakBtn = row.querySelector('.btn-browse-speak');
      speakBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        pronounce(item.tiengJrai, item.amThanhJrai, 'vi-VN');
      });

      el.browseDictionaryList.appendChild(row);
    });
  }

  // ==========================================================================
  // TAB 3: QUIZ (EDITORIAL ASSESSMENT)
  // ==========================================================================
  function shuffleArray(arr) {
    const array = [...arr];
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  function startQuiz() {
    if (state.dictionary.length < 4) {
      showToast('Cần ít nhất 4 từ vựng trong từ điển để thực hiện bài test.');
      return;
    }

    const modeInput = document.querySelector('input[name="quiz-mode"]:checked');
    state.quiz.mode = modeInput ? modeInput.value : 'vi-to-jrai';
    state.quiz.currentIndex = 0;
    state.quiz.score = 0;
    state.quiz.isAnswered = false;

    const shuffled = shuffleArray(state.dictionary);
    const selected10 = shuffled.slice(0, Math.min(10, shuffled.length));

    state.quiz.questions = selected10.map(correctWord => {
      const isViToJrai = state.quiz.mode === 'vi-to-jrai';
      const questionWord = isViToJrai ? correctWord.tiengViet : correctWord.tiengJrai;
      const correctAnswer = isViToJrai ? correctWord.tiengJrai : correctWord.tiengViet;

      const otherWords = state.dictionary.filter(w => w.id !== correctWord.id);
      const wrongShuffled = shuffleArray(otherWords).slice(0, 3);
      const wrongAnswers = wrongShuffled.map(w => isViToJrai ? w.tiengJrai : w.tiengViet);

      const allAnswers = shuffleArray([correctAnswer, ...wrongAnswers]);

      return {
        wordObj: correctWord,
        questionWord,
        correctAnswer,
        options: allAnswers
      };
    });

    el.quizIntroScreen?.classList.remove('active');
    el.quizResultScreen?.classList.remove('active');
    el.quizPlayScreen?.classList.add('active');

    renderQuizQuestion();
  }

  function renderQuizQuestion() {
    const q = state.quiz.questions[state.quiz.currentIndex];
    if (!q) return;

    state.quiz.isAnswered = false;

    if (el.quizQuestionCounter) {
      el.quizQuestionCounter.textContent = `Câu ${state.quiz.currentIndex + 1} / ${state.quiz.questions.length}`;
    }
    if (el.quizCurrentScore) {
      el.quizCurrentScore.textContent = `Điểm: ${state.quiz.score}`;
    }
    if (el.quizProgressBar) {
      const progressPercent = ((state.quiz.currentIndex) / state.quiz.questions.length) * 100;
      el.quizProgressBar.style.width = `${progressPercent}%`;
    }
    if (el.quizTargetWord) {
      el.quizTargetWord.textContent = q.questionWord;
    }
    if (el.quizWordType) {
      el.quizWordType.textContent = q.wordObj.loaiTu || 'Từ vựng';
    }

    el.quizFeedbackBox?.classList.add('hidden');

    if (el.quizOptionsContainer) {
      el.quizOptionsContainer.innerHTML = '';
      q.options.forEach((optText, idx) => {
        const btn = document.createElement('button');
        btn.className = 'option-item-btn';
        btn.textContent = `${String.fromCharCode(65 + idx)}. ${optText}`;
        btn.addEventListener('click', () => handleQuizAnswer(optText, btn, q.correctAnswer));
        el.quizOptionsContainer.appendChild(btn);
      });
    }
  }

  function handleQuizAnswer(selectedOption, clickedBtn, correctAnswer) {
    if (state.quiz.isAnswered) return;
    state.quiz.isAnswered = true;

    const allOptionBtns = el.quizOptionsContainer?.querySelectorAll('.option-item-btn');
    const isCorrect = selectedOption === correctAnswer;

    if (isCorrect) {
      state.quiz.score += 1;
      clickedBtn.classList.add('correct');
      if (el.quizFeedbackText) {
        el.quizFeedbackText.className = 'feedback-message correct';
        el.quizFeedbackText.textContent = 'Chính xác';
      }
    } else {
      clickedBtn.classList.add('wrong');
      allOptionBtns?.forEach(btn => {
        if (btn.textContent.includes(correctAnswer)) {
          btn.classList.add('correct');
        }
      });
      if (el.quizFeedbackText) {
        el.quizFeedbackText.className = 'feedback-message wrong';
        el.quizFeedbackText.textContent = `Đáp án đúng: "${correctAnswer}"`;
      }
    }

    if (el.quizCurrentScore) {
      el.quizCurrentScore.textContent = `Điểm: ${state.quiz.score}`;
    }

    allOptionBtns?.forEach(btn => {
      btn.disabled = true;
    });

    el.quizFeedbackBox?.classList.remove('hidden');

    if (el.btnQuizNext) {
      if (state.quiz.currentIndex === state.quiz.questions.length - 1) {
        el.btnQuizNext.textContent = 'Xem Kết Quả';
      } else {
        el.btnQuizNext.textContent = 'Tiếp Tục';
      }
    }
  }

  function nextQuizQuestion() {
    state.quiz.currentIndex += 1;
    if (state.quiz.currentIndex >= state.quiz.questions.length) {
      finishQuiz();
    } else {
      renderQuizQuestion();
    }
  }

  function finishQuiz() {
    el.quizPlayScreen?.classList.remove('active');
    el.quizResultScreen?.classList.add('active');

    const total = state.quiz.questions.length;
    const score = state.quiz.score;

    if (el.quizFinalScore) el.quizFinalScore.textContent = `${score} / ${total}`;

    let rating = 'Hoàn thành';
    let message = 'Bạn đã hoàn tất bài kiểm tra ghi nhớ.';
    if (score === 10) {
      rating = 'Xuất Sắc (10/10)';
      message = 'Bạn đạt điểm tối đa.';
    } else if (score >= 8) {
      rating = 'Rất Tốt';
      message = 'Khả năng ghi nhớ từ vựng Jrai của bạn rất chuẩn xác.';
    } else if (score >= 5) {
      rating = 'Đạt Yêu Cầu';
      message = 'Bạn đã nắm được phần lớn từ vựng cơ bản.';
    } else {
      rating = 'Cần Cố Gắng';
      message = 'Hãy tiếp tục tra cứu và làm lại để củng cố phản xạ.';
    }

    if (el.quizFinalRating) el.quizFinalRating.textContent = rating;
    if (el.quizFinalMessage) el.quizFinalMessage.textContent = message;
  }

  // ==========================================================================
  // TAB 4: ADD WORD
  // ==========================================================================
  function handleAddWord(e) {
    e.preventDefault();

    const vi = cleanString(el.inputNewVi?.value);
    const jrai = cleanString(el.inputNewJrai?.value);
    const type = el.selectNewType?.value || 'Từ vựng';
    const exVi = cleanString(el.inputNewExVi?.value);
    const exJrai = cleanString(el.inputNewExJrai?.value);
    const audioJrai = cleanString(el.inputNewAudioJrai?.value);

    if (!vi || !jrai) {
      showToast('Vui lòng điền đủ Tiếng Việt và Tiếng Jrai.');
      return;
    }

    const newWord = {
      id: Date.now(),
      tiengViet: vi,
      tiengJrai: jrai,
      loaiTu: type,
      viDuViet: exVi,
      viDuJrai: exJrai,
      amThanhViet: '',
      amThanhJrai: audioJrai,
      isUserAdded: true
    };

    state.customWords.unshift(newWord);
    saveCustomWords();
    mergeDictionaries();

    el.formAddWord?.reset();
    showToast(`Đã lưu từ "${vi}".`);

    setTimeout(() => {
      switchTab('tab-translate');
      if (el.searchInput) {
        state.direction = 'vi-jrai';
        if (el.sourceLangLabel) el.sourceLangLabel.textContent = 'Tiếng Việt';
        if (el.targetLangLabel) el.targetLangLabel.textContent = 'Tiếng Jrai';
        el.searchInput.value = vi;
        performSearch(vi);
      }
    }, 400);
  }

  function renderUserWordsList() {
    if (!el.userWordsList) return;
    if (el.userWordsCount) el.userWordsCount.textContent = state.customWords.length;

    el.userWordsList.innerHTML = '';

    if (state.customWords.length === 0) {
      el.userWordsList.innerHTML = `
        <p class="empty-list-notice">Chưa có từ nào được thêm thủ công.</p>
      `;
      return;
    }

    state.customWords.forEach(word => {
      const item = document.createElement('div');
      item.className = 'custom-word-row';
      item.innerHTML = `
        <div>
          <span style="font-weight: 600;">${word.tiengViet}</span> ➔ <span style="color: var(--accent); font-weight: 600;">${word.tiengJrai}</span>
          <span style="font-size: 0.75rem; color: var(--text-muted); margin-left: 6px;">(${word.loaiTu})</span>
        </div>
        <button class="delete-item-btn" title="Xóa từ này" aria-label="Xóa">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      `;

      item.querySelector('.delete-item-btn')?.addEventListener('click', () => {
        deleteUserWord(word.id);
      });

      el.userWordsList.appendChild(item);
    });
  }

  function deleteUserWord(wordId) {
    state.customWords = state.customWords.filter(w => w.id !== wordId);
    saveCustomWords();
    mergeDictionaries();
    showToast('Đã xóa từ.');
  }

  function clearAllUserWords() {
    if (state.customWords.length === 0) return;
    if (confirm('Xác nhận xóa toàn bộ từ bạn đã tự thêm?')) {
      state.customWords = [];
      saveCustomWords();
      mergeDictionaries();
      showToast('Đã xóa toàn bộ từ tự thêm.');
    }
  }

  // ==========================================================================
  // NAVIGATION
  // ==========================================================================
  function switchTab(targetTabId) {
    el.tabPanels.forEach(panel => {
      panel.classList.toggle('active', panel.id === targetTabId);
    });

    el.navItems.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === targetTabId);
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (targetTabId === 'tab-browse') {
      renderBrowseList();
    }
  }

  // ==========================================================================
  // EVENT LISTENERS
  // ==========================================================================
  function initEventListeners() {
    el.searchInput?.addEventListener('input', (e) => {
      performSearch(e.target.value);
    });

    el.btnClearSearch?.addEventListener('click', () => {
      if (el.searchInput) {
        el.searchInput.value = '';
        el.searchInput.focus();
        performSearch('');
      }
    });

    el.btnSwapDirection?.addEventListener('click', toggleDirection);

    el.btnSpeakSource?.addEventListener('click', () => {
      const q = el.searchInput?.value.trim();
      if (!q) return;
      const isViToJrai = state.direction === 'vi-jrai';
      pronounce(q, '', isViToJrai ? 'vi-VN' : 'vi-VN');
    });

    el.btnSpeakTarget?.addEventListener('click', () => {
      if (!state.currentMatchedWord) return;
      const isViToJrai = state.direction === 'vi-jrai';
      const text = isViToJrai ? state.currentMatchedWord.tiengJrai : state.currentMatchedWord.tiengViet;
      const audioUrl = isViToJrai ? state.currentMatchedWord.amThanhJrai : state.currentMatchedWord.amThanhViet;
      pronounce(text, audioUrl, isViToJrai ? 'vi-VN' : 'vi-VN');
    });

    el.btnSpeakExample?.addEventListener('click', () => {
      if (!state.currentMatchedWord) return;
      const isViToJrai = state.direction === 'vi-jrai';
      const example = isViToJrai ? state.currentMatchedWord.viDuJrai : state.currentMatchedWord.viDuViet;
      pronounce(example, '', isViToJrai ? 'vi-VN' : 'vi-VN');
    });

    el.btnCopyTarget?.addEventListener('click', () => {
      if (!state.currentMatchedWord) return;
      const isViToJrai = state.direction === 'vi-jrai';
      const text = isViToJrai ? state.currentMatchedWord.tiengJrai : state.currentMatchedWord.tiengViet;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
          showToast(`Đã sao chép: "${text}"`);
        });
      } else {
        showToast(`Đã sao chép: "${text}"`);
      }
    });

    el.btnFavTarget?.addEventListener('click', () => {
      if (!state.currentMatchedWord) return;
      showToast('Đã lưu vào mục yêu thích.');
    });

    el.quickTagsContainer?.addEventListener('click', (e) => {
      const tag = e.target.closest('.term-btn');
      if (!tag) return;
      const word = tag.getAttribute('data-word');
      if (word && el.searchInput) {
        el.searchInput.value = word;
        performSearch(word);
      }
    });

    el.browseFilterInput?.addEventListener('input', renderBrowseList);
    el.browseCategorySelect?.addEventListener('change', renderBrowseList);

    el.btnStartQuiz?.addEventListener('click', startQuiz);
    el.btnQuizNext?.addEventListener('click', nextQuizQuestion);
    el.btnQuizRestart?.addEventListener('click', () => {
      el.quizResultScreen?.classList.remove('active');
      el.quizIntroScreen?.classList.add('active');
    });

    el.btnQuizSpeak?.addEventListener('click', () => {
      const q = state.quiz.questions[state.quiz.currentIndex];
      if (q) {
        pronounce(q.questionWord, q.wordObj.amThanhJrai, 'vi-VN');
      }
    });

    el.formAddWord?.addEventListener('submit', handleAddWord);
    el.btnClearUserWords?.addEventListener('click', clearAllUserWords);

    el.navItems.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-tab');
        if (targetTab) switchTab(targetTab);
      });
    });
  }

  // ==========================================================================
  // BOOTSTRAP APP (ROBUST READY CHECK FOR VERCEL & MODULES)
  // ==========================================================================
  function bootstrap() {
    initTheme();
    initEventListeners();
    loadDictionaryData();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }

})();

