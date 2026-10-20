// ↓↓↓↓ ここを先ほどのGASのURLに書き換えてください ↓↓↓↓
const RANKING_API_URL = "https://script.google.com/macros/s/AKfycbzu69peCqyV7zz6AQENETxus9V4fRTuEDWWpukSsIV-Am5FHQyZXeUH4haOcqOfDn8y/exec";
// ↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑

let allQuestions = [];
let currentQuizList = [];
let currentIndex = 0;

// コースモード用変数
let isCourseMode = false;
let questionStartTime = 0;
let totalBaseScore = 0; 
let crit101Count = 0;
const SCORE_JUSTICE = 10000; 
const SCORE_CRITICAL = 10100; 
let isSubmitting = false; // ランキング重複送信防止ロック

// アプリ起動時にデータ読み込み
fetch('questions.json')
  .then(res => res.json())
  .then(data => {
    allQuestions = data;
  });

// アプリ起動時に保存されたニックネームを復元
document.addEventListener('DOMContentLoaded', () => {
  const savedName = localStorage.getItem('toeic_nickname');
  if (savedName) document.getElementById('home-nickname').value = savedName;
});

// ニックネームが入力されたら自動保存
document.getElementById('home-nickname').addEventListener('input', (e) => {
  localStorage.setItem('toeic_nickname', e.target.value);
});

function startSingleQuestion() {
  const num = parseInt(document.getElementById('single-q-num').value);
  const target = allQuestions.filter(q => q.id === num);
  if (target.length === 0) return alert('該当する問題番号がありません。');
  startQuiz(target);
}

function startChapter() {
  const chap = parseInt(document.getElementById('chapter-select').value);
  const target = allQuestions.filter(q => q.chapter === chap);
  if (target.length === 0) return alert('該当する章データがありません。');
  startQuiz(target);
}

function startRange() {
  const start = parseInt(document.getElementById('range-start').value);
  const end = parseInt(document.getElementById('range-end').value);
  const target = allQuestions.filter(q => q.id >= start && q.id <= end);
  if (target.length === 0) return alert('指定された範囲に問題がありません。');
  startQuiz(target);
}

// コースモードの開始 (引数で範囲を受け取る)
function startCourseMode(startId, endId) {
  const target = allQuestions.filter(q => q.id >= startId && q.id <= endId);
  if (target.length === 0) return alert('問題データがありません。');
  
  isCourseMode = true;
  totalBaseScore = 0;
  crit101Count = 0;
  startQuiz(target);
}

function startQuiz(list) {
  currentQuizList = list;
  currentIndex = 0;
  document.getElementById('mode-selection').classList.add('hidden');
  document.getElementById('course-result-screen').classList.add('hidden');
  document.getElementById('quiz-screen').classList.remove('hidden');
  renderQuestion();
}

function renderQuestion() {
  const q = currentQuizList[currentIndex];
  document.getElementById('quiz-progress').innerText = `問題 ${currentIndex + 1} / ${currentQuizList.length}`;
  document.getElementById('q-id').innerText = q.id;
  document.getElementById('q-text').innerText = q.question;

  const container = document.getElementById('options-container');
  container.innerHTML = '';
  document.getElementById('explanation-container').classList.add('hidden');

  for (const [key, value] of Object.entries(q.options)) {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.innerText = `(${key}) ${value}`;
    btn.onclick = () => selectAnswer(key);
    container.appendChild(btn);
  }
  
  questionStartTime = Date.now();
}

function selectAnswer(selectedKey) {
  const timeTaken = (Date.now() - questionStartTime) / 1000; 
  const q = currentQuizList[currentIndex];
  const isCorrect = (selectedKey === q.answer);

  const buttons = document.querySelectorAll('.option-btn');
  buttons.forEach(btn => btn.disabled = true);

  const badge = document.getElementById('result-badge');
  
  if (isCourseMode) {
    if (isCorrect) {
      if (timeTaken <= 10.0) {
        totalBaseScore += SCORE_CRITICAL;
        crit101Count++;
        badge.innerText = "正解！ (101% CRITICAL)";
        badge.style.background = "#d39e00"; 
      } else {
        totalBaseScore += SCORE_JUSTICE;
        badge.innerText = "正解！ (100% JUSTICE)";
        badge.style.background = "#28a745"; 
      }
    } else {
      badge.innerText = "不正解 (MISS)";
      badge.style.background = "#dc3545";
    }
  } else {
    badge.innerText = isCorrect ? "正解！" : "不正解";
    badge.style.background = isCorrect ? "#28a745" : "#dc3545";
  }

  document.getElementById('correct-answer').innerText = `(${q.answer}) ${q.options[q.answer]}`;
  document.getElementById('q-translation').innerText = q.translation;
  document.getElementById('q-explanation').innerText = q.explanation;

  const vocabList = document.getElementById('vocab-list');
  vocabList.innerHTML = '';
  if (q.vocabulary && q.vocabulary.length > 0) {
    q.vocabulary.forEach(v => {
      const li = document.createElement('li');
      li.innerText = `${v.word} : ${v.meaning}`;
      vocabList.appendChild(li);
    });
    document.getElementById('vocab-box').classList.remove('hidden');
  } else {
    document.getElementById('vocab-box').classList.add('hidden');
  }

  if (q.goldRule) {
    document.getElementById('gold-rule-title').innerText = `金のルール ${q.goldRule.number}: ${q.goldRule.title}`;
    document.getElementById('gold-rule-content').innerText = q.goldRule.content;
    document.getElementById('gold-rule-box').classList.remove('hidden');
  } else {
    document.getElementById('gold-rule-box').classList.add('hidden');
  }

  document.getElementById('explanation-container').classList.remove('hidden');
}

function nextQuestion() {
  currentIndex++;
  if (currentIndex < currentQuizList.length) {
    renderQuestion();
  } else {
    if (isCourseMode) {
      showCourseResult();
    } else {
      alert('指定した問題をすべて解答しました！');
      exitQuiz();
    }
  }
}

function showCourseResult() {
  document.getElementById('quiz-screen').classList.add('hidden');
  document.getElementById('course-result-screen').classList.remove('hidden');

  const maxNormalScore = currentQuizList.length * SCORE_JUSTICE;
  const finalPercentage = (totalBaseScore / maxNormalScore) * 100;
  
  document.getElementById('final-score').innerText = finalPercentage.toFixed(2);
  document.getElementById('crit-count').innerText = crit101Count;

  if (navigator.onLine) {
    document.getElementById('online-ranking-section').classList.remove('hidden');
    document.getElementById('offline-message').classList.add('hidden');
    
    // リザルト画面表示と同時に自動送信
    submitScore(finalPercentage);
  } else {
    document.getElementById('online-ranking-section').classList.add('hidden');
    document.getElementById('offline-message').classList.remove('hidden');
  }
}

// ランキング自動送信（重複送信防止機能付き）
async function submitScore(finalPercentage) {
  if (isSubmitting) return; // すでに送信中なら何もしない
  isSubmitting = true;

  const nicknameInput = document.getElementById('home-nickname').value.trim();
  const nickname = nicknameInput || "名無し";

  document.getElementById('ranking-list').innerHTML = '<li>ランキングを更新中...</li>';

  try {
    const response = await fetch(RANKING_API_URL, {
      method: 'POST',
      body: JSON.stringify({
        nickname: nickname,
        score: finalPercentage,
        criticals: crit101Count
      })
    });
    const rankingData = await response.json();
    renderRanking(rankingData);
  } catch (error) {
    console.error("ランキングの送信に失敗しました。", error);
    document.getElementById('ranking-list').innerHTML = '<li>ランキングの取得に失敗しました</li>';
    loadRanking(); // 送信に失敗してもランキングの読み込みだけは試みる
  } finally {
    isSubmitting = false; // 送信ロックを解除
  }
}

async function loadRanking() {
  try {
    const response = await fetch(RANKING_API_URL);
    const rankingData = await response.json();
    renderRanking(rankingData);
  } catch (error) {
    console.error("ランキング取得エラー", error);
  }
}

function renderRanking(data) {
  const list = document.getElementById('ranking-list');
  list.innerHTML = '';
  data.forEach((row, index) => {
    const li = document.createElement('li');
    li.className = 'ranking-item';
    li.innerHTML = `
      <span class="rank-name">${index + 1}. ${row.nickname}</span>
      <span class="rank-score">${row.score.toFixed(2)}% <span style="font-size:0.8em; color:#666;">(Crit:${row.criticals})</span></span>
    `;
    list.appendChild(li);
  });
}

function exitCourseResult() {
  isCourseMode = false;
  document.getElementById('course-result-screen').classList.add('hidden');
  document.getElementById('mode-selection').classList.remove('hidden');
}

function exitQuiz() {
  isCourseMode = false;
  document.getElementById('quiz-screen').classList.add('hidden');
  document.getElementById('mode-selection').classList.remove('hidden');
}