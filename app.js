// ↓↓↓↓ ここを先ほどのGASのURLに書き換えてください ↓↓↓↓
const RANKING_API_URL = "https://script.google.com/macros/s/AKfycbzu69peCqyV7zz6AQENETxus9V4fRTuEDWWpukSsIV-Am5FHQyZXeUH4haOcqOfDn8y/exec";
// ↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑

let allQuestions = [];
let currentQuizList = [];
let currentIndex = 0;

// コースモード用変数
let isCourseMode = false;
let questionStartTime = 0;
let totalBaseScore = 0; // 内部計算用 (1問最大10100)
let crit101Count = 0;
const SCORE_JUSTICE = 10000; // 通常正解
const SCORE_CRITICAL = 10100; // 10秒以内正解

// アプリ起動時にデータ読み込み
fetch('questions.json')
  .then(res => res.json())
  .then(data => {
    allQuestions = data;
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

// コースモードの開始
function startCourseMode() {
  const target = allQuestions.filter(q => q.id >= 120 && q.id <= 140);
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
  
  // 出題時刻を記録
  questionStartTime = Date.now();
}

function selectAnswer(selectedKey) {
  const timeTaken = (Date.now() - questionStartTime) / 1000; // 秒換算
  const q = currentQuizList[currentIndex];
  const isCorrect = (selectedKey === q.answer);

  const buttons = document.querySelectorAll('.option-btn');
  buttons.forEach(btn => btn.disabled = true);

  const badge = document.getElementById('result-badge');
  
  // スコア計算 (コースモード時のみ)
  if (isCourseMode) {
    if (isCorrect) {
      if (timeTaken <= 10.0) {
        totalBaseScore += SCORE_CRITICAL;
        crit101Count++;
        badge.innerText = "正解！ (101% CRITICAL)";
        badge.style.background = "#d39e00"; // 金色
      } else {
        totalBaseScore += SCORE_JUSTICE;
        badge.innerText = "正解！ (100% JUSTICE)";
        badge.style.background = "#28a745"; // 緑
      }
    } else {
      badge.innerText = "不正解 (MISS)";
      badge.style.background = "#dc3545";
    }
  } else {
    badge.innerText = isCorrect ? "正解！" : "不正解";
    badge.style.background = isCorrect ? "#28a745" : "#dc3545";
  }

  // 解説表示処理
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

  // CHUNITHM仕様のパーセンテージ計算 (最大101.00%)
  const maxNormalScore = currentQuizList.length * SCORE_JUSTICE;
  const finalPercentage = (totalBaseScore / maxNormalScore) * 100;
  
  document.getElementById('final-score').innerText = finalPercentage.toFixed(2);
  document.getElementById('crit-count').innerText = crit101Count;

  // オンライン判定
  if (navigator.onLine) {
    document.getElementById('online-ranking-section').classList.remove('hidden');
    document.getElementById('offline-message').classList.add('hidden');
    loadRanking();
  } else {
    document.getElementById('online-ranking-section').classList.add('hidden');
    document.getElementById('offline-message').classList.remove('hidden');
  }
}

// ランキング送信
async function submitScore() {
  const nickname = document.getElementById('nickname-input').value.trim() || "名無し";
  const finalPercentage = parseFloat(document.getElementById('final-score').innerText);

  document.getElementById('nickname-input').disabled = true;

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
    alert("ランキングの送信に失敗しました。");
  }
}

// ランキング取得
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
  document.getElementById('nickname-input').disabled = false;
  document.getElementById('nickname-input').value = "";
}

function exitQuiz() {
  isCourseMode = false;
  document.getElementById('quiz-screen').classList.add('hidden');
  document.getElementById('mode-selection').classList.remove('hidden');
}