let allQuestions = [];
let currentQuizList = [];
let currentIndex = 0;

// アプリ起動時にデータ読み込み
fetch('questions.json')
  .then(res => res.json())
  .then(data => {
    allQuestions = data;
  });

// モード1: 1問選択
function startSingleQuestion() {
  const num = parseInt(document.getElementById('single-q-num').value);
  const target = allQuestions.filter(q => q.id === num);
  if (target.length === 0) return alert('該当する問題番号がありません。');
  startQuiz(target);
}

// モード2: 章まとめて
function startChapter() {
  const chap = parseInt(document.getElementById('chapter-select').value);
  const target = allQuestions.filter(q => q.chapter === chap);
  if (target.length === 0) return alert('該当する章データがありません。');
  startQuiz(target);
}

// モード3: 範囲指定
function startRange() {
  const start = parseInt(document.getElementById('range-start').value);
  const end = parseInt(document.getElementById('range-end').value);
  const target = allQuestions.filter(q => q.id >= start && q.id <= end);
  if (target.length === 0) return alert('指定された範囲に問題がありません。');
  startQuiz(target);
}

// クイズ開始の初期化
function startQuiz(list) {
  currentQuizList = list;
  currentIndex = 0;
  document.getElementById('mode-selection').classList.add('hidden');
  document.getElementById('quiz-screen').classList.remove('hidden');
  renderQuestion();
}

// 問題・選択肢の描画
function renderQuestion() {
  const q = currentQuizList[currentIndex];
  document.getElementById('quiz-progress').innerText = `問題 ${currentIndex + 1} / ${currentQuizList.length}`;
  document.getElementById('q-id').innerText = q.id;
  document.getElementById('q-text').innerText = q.question;

  // 選択肢ボタンの動的生成
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
}

// 回答選択・解説表示
function selectAnswer(selectedKey) {
  const q = currentQuizList[currentIndex];
  const isCorrect = (selectedKey === q.answer);

  // 選択肢ボタンの無効化
  const buttons = document.querySelectorAll('.option-btn');
  buttons.forEach(btn => btn.disabled = true);

  // 結果バッジ設定
  const badge = document.getElementById('result-badge');
  badge.innerText = isCorrect ? "正解！" : "不正解";
  badge.className = isCorrect ? "badge correct" : "badge incorrect";

  // 解説文などの設定
  document.getElementById('correct-answer').innerText = `(${q.answer}) ${q.options[q.answer]}`;
  document.getElementById('q-translation').innerText = q.translation;
  document.getElementById('q-explanation').innerText = q.explanation;

  // 語彙リストの設定
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

  // 金のルール設定
  if (q.goldRule) {
    document.getElementById('gold-rule-title').innerText = `金のルール ${q.goldRule.number}: ${q.goldRule.title}`;
    document.getElementById('gold-rule-content').innerText = q.goldRule.content;
    document.getElementById('gold-rule-box').classList.remove('hidden');
  } else {
    document.getElementById('gold-rule-box').classList.add('hidden');
  }

  document.getElementById('explanation-container').classList.remove('hidden');
}

// 次の問題へ
function nextQuestion() {
  currentIndex++;
  if (currentIndex < currentQuizList.length) {
    renderQuestion();
  } else {
    alert('指定した問題をすべて解答しました！');
    exitQuiz();
  }
}

function exitQuiz() {
  document.getElementById('quiz-screen').classList.add('hidden');
  document.getElementById('mode-selection').classList.remove('hidden');
}