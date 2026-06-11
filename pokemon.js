let pokemonList = [];
let questionPatterns = []; 
let currentPattern = [];   

let currentStreak = 0;
let maxStreak = 0;
let currentTrainer = ""; 

let timerInterval = null;
const LIMIT_TIME = 30; 
let timeLeft = LIMIT_TIME;
let searchTimeout = null; // タイピング間引き用

// ひらがなをカタカナに変換する関数
function hiraToKata(str) {
    return str.replace(/[\u3041-\u3096]/g, ch => 
        String.fromCharCode(ch.charCodeAt(0) + 0x60)
    );
}

// ページ読み込み時にログイン状態をチェック
window.addEventListener('DOMContentLoaded', () => {
    const savedTrainer = localStorage.getItem('pokemon_trainer_name');
    if (savedTrainer) {
        loginSuccess(savedTrainer);
    }
});

// ログインボタン処理
document.getElementById('loginBtn').addEventListener('click', () => {
    const username = document.getElementById('usernameInput').value.trim();
    if (!username) {
        alert('名前を入力してください！');
        return;
    }
    localStorage.setItem('pokemon_trainer_name', username);
    loginSuccess(username);
});

function loginSuccess(username) {
    currentTrainer = username;
    document.getElementById('trainerName').textContent = username;
    
    const savedMaxScore = localStorage.getItem(`max_score_${username}`);
    maxStreak = savedMaxScore ? parseInt(savedMaxScore, 10) : 0;
    document.getElementById('maxStreak').textContent = maxStreak;

    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('quizPage').style.display = 'block';
    
    if (pokemonList.length > 0) {
        nextQuestion();
    }
}

// ログアウト処理
document.getElementById('logoutBtn').addEventListener('click', () => {
    clearInterval(timerInterval);
    localStorage.removeItem('pokemon_trainer_name');
    window.location.reload();
});

// JSON データを取得
fetch('pokemon_forms.json')
    .then(response => {
        if (!response.ok) throw new Error('JSONの読み込みに失敗しました');
        return response.json();
    })
    .then(data => {
        pokemonList = data;
        
        // ★【大改造】起動時に全件を datalist に追加していた超激重ループを完全に削除しました！
        // これにより、起動時の負荷がほぼゼロになり一瞬で開くようになります。

        // 出題パターンの作成
        const patternSet = new Set();
        pokemonList.forEach(pokemon => {
            const sortedTypeStr = [...pokemon.types].sort().join(',');
            patternSet.add(sortedTypeStr);
        });
        questionPatterns = Array.from(patternSet).map(str => str.split(','));

        document.getElementById('inputArea').style.display = 'block';
        
        if (currentTrainer) {
            nextQuestion();
        }
    })
    .catch(error => {
        console.error(error);
        document.getElementById('questionArea').textContent = 'データの読み込みに失敗しました。';
    });

// 入力欄に文字が打ち込まれたときの軽量版サジェスト処理
document.getElementById('answerInput').addEventListener('input', (e) => {
    const userInput = e.target.value.trim();
    const datalist = document.getElementById('pokemonOptions');
    
    if (!userInput) {
        datalist.innerHTML = '';
        return;
    }

    // タイピング中のイベント連発を間引く（デバウンス）
    clearTimeout(searchTimeout);

    searchTimeout = setTimeout(() => {
        datalist.innerHTML = ''; 

        const convertedInput = hiraToKata(userInput);

        // 部分一致するポケモンを検索
        const matchedPokemons = pokemonList.filter(pokemon => 
            pokemon.name.includes(convertedInput)
        );

        // メモリ上の仮想コンテナ（Fragment）を使って、再描画の回数を1回に抑える
        const fragment = document.createDocumentFragment();
        
        matchedPokemons.slice(0, 10).forEach(pokemon => {
            const option = document.createElement('option');
            option.value = pokemon.name;
            fragment.appendChild(option); 
        });
        
        datalist.appendChild(fragment); 
        
    }, 200); // 0.2秒間タイピングが止まったら検索を実行
});

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

    startTimer();
}

function startTimer() {
    clearInterval(timerInterval); 
    timeLeft = LIMIT_TIME;
    
    const timerBoard = document.getElementById('timerBoard');
    const timeLeftSpan = document.getElementById('timeLeft');
    
    timerBoard.className = 'timer-board'; 
    timeLeftSpan.textContent = timeLeft;

    timerInterval = setInterval(() => {
        timeLeft--;
        timeLeftSpan.textContent = timeLeft;

        if (timeLeft <= 5) {
            timerBoard.classList.add('timer-urgent');
        }

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            handleTimeUp();
        }
    }, 1000);
}

function checkAnswer() {
    clearInterval(timerInterval);

    const userInput = document.getElementById('answerInput').value.trim();
    const resultDiv = document.getElementById('result');

    if (!userInput) {
        resultDiv.innerHTML = '<p style="color: orange;">ポケモンの名前を入力してください！</p>';
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
                localStorage.setItem(`max_score_${currentTrainer}`, maxStreak);
            }
            resultDiv.innerHTML = `<p class="success">正解！！🎉 (${currentStreak}連勝中！)</p><p><strong>${userInput}</strong> は【${foundPokemon.types.join('・')}】タイプで、お題と完全に一致します！</p>`;
        } else {
            currentStreak = 0;
            resultDiv.innerHTML = `<p class="error">不正解...❌ (連勝が止まってしまいました)</p><p><strong>${userInput}</strong> のタイプは【${foundPokemon.types.join('・')}】なので、お題の条件と完全一致しません。</p>`;
        }
    }

    updateScoreAndShowHints();
}

function handleTimeUp() {
    const resultDiv = document.getElementById('result');
    currentStreak = 0; 
    resultDiv.innerHTML = `<p class="error">タイムアップ！⏳ (連勝が止まってしまいました)</p><p>30秒以内に回答できませんでした。</p>`;
    updateScoreAndShowHints();
}

function updateScoreAndShowHints() {
    document.getElementById('currentStreak').textContent = currentStreak;
    document.getElementById('maxStreak').textContent = maxStreak;

    const resultDiv = document.getElementById('result');
    const currentPatternStr = [...currentPattern].sort().join(',');
    const allCorrectAnswers = pokemonList
        .filter(p => [...p.types].sort().join(',') === currentPatternStr)
        .map(p => p.name);
    
    const hints = allCorrectAnswers.sort(() => 0.5 - Math.random()).slice(0, 5);
    const displayText = currentPattern.join('・');
    resultDiv.innerHTML += `<div class="hint">💡 <strong>【${displayText}】に完全一致するポケモンの例：</strong><br>${hints.join('、 ')} など</div>`;

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