let pokemonList = [];
let questionPatterns = []; 
let currentPattern = [];   

let currentStreak = 0;
let maxStreak = 0;

let timerInterval = null;
const LIMIT_TIME = 30; // 制限時間（秒）
let timeLeft = LIMIT_TIME;

// JSON データを取得
fetch('pokemon_forms.json')
    .then(response => {
        if (!response.ok) throw new Error('JSONの読み込みに失敗しました');
        return response.json();
    })
    .then(data => {
        pokemonList = data;
        
        // サジェスト候補の生成
        const datalist = document.getElementById('pokemonOptions');
        pokemonList.forEach(pokemon => {
            const option = document.createElement('option');
            option.value = pokemon.name;
            datalist.appendChild(option);
        });

        // 出題パターンの作成
        const patternSet = new Set();
        pokemonList.forEach(pokemon => {
            const sortedTypeStr = [...pokemon.types].sort().join(',');
            patternSet.add(sortedTypeStr);
        });
        questionPatterns = Array.from(patternSet).map(str => str.split(','));

        document.getElementById('inputArea').style.display = 'block';
        nextQuestion();
    })
    .catch(error => {
        console.error(error);
        document.getElementById('questionArea').textContent = 'データの読み込みに失敗しました。';
    });

// 新しい問題を出題する関数
function nextQuestion() {
    document.getElementById('result').innerHTML = "";
    document.getElementById('answerInput').value = "";
    document.getElementById('nextBtn').style.display = 'none';
    document.getElementById('submitBtn').disabled = false;
    document.getElementById('answerInput').disabled = false;

    const randomIndex = Math.floor(Math.random() * questionPatterns.length);
    currentPattern = questionPatterns[randomIndex];

    const displayText = currentPattern.join('・');
    document.getElementById('questionArea').innerHTML = `お題：【<span style="color: #ff5722;">${displayText}</span>】タイプのポケモンを1匹答えてね！`;
    document.getElementById('answerInput').focus();

    // タイマーのリセットと開始
    startTimer();
}

// タイマーを開始・カウントダウンする関数
function startTimer() {
    clearInterval(timerInterval); // 古いタイマーを確実に止める
    timeLeft = LIMIT_TIME;
    
    const timerBoard = document.getElementById('timerBoard');
    const timeLeftSpan = document.getElementById('timeLeft');
    
    timerBoard.className = 'timer-board'; // スタイルを緑（通常）に戻す
    timeLeftSpan.textContent = timeLeft;

    // 1秒（1000ミリ秒）ごとに実行するループ処理
    timerInterval = setInterval(() => {
        timeLeft--;
        timeLeftSpan.textContent = timeLeft;

        // 残り5秒以下になったら赤くする
        if (timeLeft <= 5) {
            timerBoard.classList.add('timer-urgent');
        }

        // 0秒になったらタイムアップ処理
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            handleTimeUp();
        }
    }, 1000);
}

// 判定処理
function checkAnswer() {
    // ボタンが押されたら即座にタイマーを止める
    clearInterval(timerInterval);

    const userInput = document.getElementById('answerInput').value.trim();
    const resultDiv = document.getElementById('result');

    if (!userInput) {
        resultDiv.innerHTML = '<p style="color: orange;">ポケモンの名前を入力してください！</p>';
        // 名前が空欄で押しちゃった場合はタイマーを再開して救済
        startTimer();
        return;
    }

    const foundPokemon = pokemonList.find(p => p.name === userInput);

    if (!foundPokemon) {
        resultDiv.innerHTML = `<p class="error">「${userInput}」というポケモンは見つかりませんでした。</p>`;
        currentStreak = 0;
    } else {
        const currentPatternStr = [...currentPattern].sort().join(',');
        const foundPokemonTypeStr = [...foundPokemon.types].sort().join(',');
        
        const isCorrect = (currentPatternStr === foundPokemonTypeStr);

        if (isCorrect) {
            currentStreak++;
            if (currentStreak > maxStreak) {
                maxStreak = currentStreak;
            }
            resultDiv.innerHTML = `<p class="success">正解！！🎉 (${currentStreak}連勝中！)</p><p><strong>${userInput}</strong> は【${foundPokemon.types.join('・')}】タイプで、お題と完全に一致します！</p>`;
        } else {
            currentStreak = 0;
            resultDiv.innerHTML = `<p class="error">不正解...❌ (連勝が止まってしまいました)</p><p><strong>${userInput}</strong> のタイプは【${foundPokemon.types.join('・')}】なので、お題の条件と完全一致しません。</p>`;
        }
    }

    // スコア更新とヒント表示
    updateScoreAndShowHints();
}

// 時間切れ（タイムアップ）時の処理関数
function handleTimeUp() {
    const resultDiv = document.getElementById('result');
    
    currentStreak = 0; // 連勝リセット
    
    resultDiv.innerHTML = `<p class="error">タイムアップ！⏳ (連勝が止まってしまいました)</p><p>30秒以内に回答できませんでした。</p>`;
    
    // スコア更新とヒント表示
    updateScoreAndShowHints();
}

// スコアの書き換えと正解例の提示を1つにまとめた共通関数
function updateScoreAndShowHints() {
    // スコアボードの更新
    document.getElementById('currentStreak').textContent = currentStreak;
    document.getElementById('maxStreak').textContent = maxStreak;

    // 正解例の提示
    const resultDiv = document.getElementById('result');
    const currentPatternStr = [...currentPattern].sort().join(',');
    const allCorrectAnswers = pokemonList
        .filter(p => [...p.types].sort().join(',') === currentPatternStr)
        .map(p => p.name);
    
    const hints = allCorrectAnswers.sort(() => 0.5 - Math.random()).slice(0, 5);
    const displayText = currentPattern.join('・');
    resultDiv.innerHTML += `<div class="hint">💡 <strong>【${displayText}】に完全一致するポケモンの例：</strong><br>${hints.join('、 ')} など</div>`;

    // 入力欄をロックして「次へ」ボタンを出す
    document.getElementById('submitBtn').disabled = true;
    document.getElementById('answerInput').disabled = true;
    document.getElementById('nextBtn').style.display = 'inline-block';
}

// イベントリスナー
document.getElementById('submitBtn').addEventListener('click', checkAnswer);
document.getElementById('nextBtn').addEventListener('click', nextQuestion);
document.getElementById('answerInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !document.getElementById('submitBtn').disabled) {
        checkAnswer();
    }
});