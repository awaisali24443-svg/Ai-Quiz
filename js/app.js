import { GoogleGenAI } from "@google/genai";

const API_KEY = process.env.API_KEY;
let ai;
if (API_KEY) {
    ai = new GoogleGenAI({ apiKey: API_KEY });
}

const USER_PROGRESS_KEY = 'aiQuizNexusProgress';
const TOTAL_LEVELS = 20;
const QUIZ_TIMER_SECONDS = 15;

// --- Progression Helpers ---
function getProgress() {
    try {
        const progress = localStorage.getItem(USER_PROGRESS_KEY);
        return progress ? JSON.parse(progress) : {};
    } catch (e) {
        console.error("Failed to parse progress from localStorage", e);
        return {};
    }
}

function saveProgress(progress) {
    try {
        localStorage.setItem(USER_PROGRESS_KEY, JSON.stringify(progress));
    } catch (e) {
        console.error("Failed to save progress to localStorage", e);
    }
}


// --- App Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    initNav();
    route();
});

function initNav() {
    const navToggle = document.querySelector('.nav-toggle');
    const mobileNav = document.querySelector('.mobile-nav');
    if (navToggle && mobileNav) {
        navToggle.addEventListener('click', () => {
            const isExpanded = navToggle.getAttribute('aria-expanded') === 'true';
            navToggle.setAttribute('aria-expanded', !isExpanded);
            mobileNav.classList.toggle('is-active');
            document.body.classList.toggle('nav-open');
        });
    }

    // Set active link in bottom nav
    const currentPage = window.location.pathname.split("/").pop();
    const navLinks = document.querySelectorAll('.bottom-nav-link');
    navLinks.forEach(link => {
        link.classList.remove('active'); // Reset all first
        const linkPage = link.getAttribute('href').split("/").pop();
        if (linkPage === currentPage || (currentPage === '' && linkPage === 'index.html')) {
            link.classList.add('active');
        }
    });
}

function route() {
    const page = window.location.pathname.split("/").pop() || 'index.html';

    const selectedTopic = localStorage.getItem('selectedTopic');
    if (selectedTopic) {
        document.body.dataset.theme = selectedTopic;
    }

    document.dispatchEvent(new CustomEvent('themeApplied'));

    switch (page) {
        case '':
        case 'index.html':
            initHomePage();
            break;
        case 'levels.html':
            initLevelsPage();
            break;
        case 'quiz.html':
            initQuizPage();
            break;
        case 'results.html':
            initResultsPage();
            break;
    }
}


// --- Page Initializers ---
async function initHomePage() {
    try {
        const response = await fetch('data/topics.json');
        if (!response.ok) throw new Error('Failed to load topics.');
        const { topics } = await response.json();
        
        const container = document.getElementById('topics-container');
        if (!container) return;

        container.innerHTML = '';
        topics.forEach(topic => {
            const card = document.createElement('div');
            card.className = 'topic-card';
            card.dataset.id = topic.id;
            card.setAttribute('role', 'listitem');
            card.setAttribute('tabindex', '0');
            // Set background image from JSON
            if (topic.image) {
                card.style.backgroundImage = `url('${topic.image}')`;
            }
            card.innerHTML = `<h4>${topic.title}</h4><p>${topic.description}</p>`;
            card.addEventListener('click', () => selectTopic(topic.id));
            card.addEventListener('keydown', (e) => { if(e.key === 'Enter' || e.key === ' ') selectTopic(topic.id); });
            container.appendChild(card);
        });
    } catch (error) {
        console.error('Error initializing home page:', error);
        const container = document.getElementById('topics-container');
        if (container) container.innerHTML = `<p class="error-message">Error loading topics. Please try again later.</p>`;
    }
}

async function initLevelsPage() {
    const topicId = localStorage.getItem('selectedTopic');
    if (!topicId) {
        window.location.href = 'index.html';
        return;
    }

    try {
        const response = await fetch('data/questions.json');
        if (!response.ok) throw new Error('Failed to load levels.');
        const allData = await response.json();
        const topicData = allData[topicId];
        
        if (!topicData) throw new Error(`Topic data for "${topicId}" not found.`);

        const headerContainer = document.getElementById('level-page-header');
        const levelsContainer = document.getElementById('levels-container');
        if (!headerContainer || !levelsContainer) return;

        headerContainer.innerHTML = `<h2>${topicData.title}</h2><p>Select your difficulty level.</p>`;

        const progress = getProgress();
        const highestUnlockedLevel = progress[topicId] || 1;
        
        levelsContainer.innerHTML = '';
        for (let i = 1; i <= TOTAL_LEVELS; i++) {
            const levelInfo = topicData.levels.find(l => l.level == i);
            const isLocked = i > highestUnlockedLevel;
            
            const levelCard = document.createElement('div');
            levelCard.className = 'level-card';
            levelCard.dataset.level = i;
            levelCard.setAttribute('role', 'listitem');

            if (isLocked) {
                levelCard.classList.add('locked');
                levelCard.setAttribute('aria-disabled', 'true');
                levelCard.innerHTML = `<h3>Level ${i}</h3><p>${levelInfo ? levelInfo.title : 'Challenge'}</p>`;
            } else {
                levelCard.setAttribute('tabindex', '0');
                levelCard.innerHTML = `<h3>Level ${i}</h3><p>${levelInfo ? levelInfo.title : 'Challenge'}</p>`;
                levelCard.addEventListener('click', () => selectLevel(i));
                levelCard.addEventListener('keydown', (e) => { if(e.key === 'Enter' || e.key === ' ') selectLevel(i); });
            }
            levelsContainer.appendChild(levelCard);
        }
    } catch (error) {
        console.error('Error initializing levels page:', error);
        const levelsContainer = document.getElementById('levels-container');
        if (levelsContainer) levelsContainer.innerHTML = `<p class="error-message">Error loading levels. Please try again later.</p>`;
    }
}

async function initQuizPage() {
    // 1. Retrieve the current topic and level from the browser's local storage.
    // This state is set when the user makes a selection on the previous pages.
    const topicId = localStorage.getItem('selectedTopic');
    const level = localStorage.getItem('selectedLevel');

    // If we don't know the topic or level, we can't show a quiz. Redirect to home.
    if (!topicId || !level) {
        window.location.href = 'index.html';
        return;
    }
    
    try {
        // 2. Asynchronously fetch the entire question database.
        // For a larger app, this could be a specific API endpoint per topic/level.
        const response = await fetch('data/questions.json');
        if (!response.ok) throw new Error('Failed to load questions.');
        const allData = await response.json();

        // 3. Find the specific questions for the selected topic and level from the loaded data.
        const levelData = allData[topicId]?.levels.find(l => l.level == level);
        
        // Handle cases where a level might exist in the structure but has no questions yet.
        if (!levelData || !levelData.questions || levelData.questions.length === 0) {
            document.querySelector('.quiz-container').innerHTML = `
                <h2>Coming Soon!</h2>
                <p>Questions for this level are being prepared. Please check back later.</p>
                <a href="levels.html" class="btn btn-primary">Back to Levels</a>`;
            return;
        }
        
        // 4. Initialize the state for the current quiz attempt.
        const questions = levelData.questions;
        let currentQuestionIndex = 0;
        let score = 0;
        let userAnswers = [];
        let timerInterval;
        let timeLeft = QUIZ_TIMER_SECONDS;

        // Get references to all the DOM elements we'll need to interact with.
        const questionText = document.getElementById('question-text');
        const optionsContainer = document.getElementById('options-container');
        const nextButton = document.getElementById('next-button');
        const progressText = document.getElementById('progress-text');
        const progressBarInner = document.getElementById('progress-bar-inner');
        const timerText = document.getElementById('quiz-timer');
        const hintButton = document.getElementById('hint-button');
        const hintContainer = document.getElementById('hint-container');

        function startTimer() {
            timeLeft = QUIZ_TIMER_SECONDS;
            timerText.textContent = timeLeft;
            clearInterval(timerInterval);
            timerInterval = setInterval(() => {
                timeLeft--;
                timerText.textContent = timeLeft;
                if (timeLeft <= 0) {
                    clearInterval(timerInterval);
                    handleAnswer(null); // Timeout is treated as an incorrect answer.
                }
            }, 1000);
        }

        function loadQuestion() {
            const currentQuestion = questions[currentQuestionIndex];
            questionText.textContent = currentQuestion.question;
            optionsContainer.innerHTML = '';
            nextButton.disabled = true;

            // Reset hint display for the new question.
            hintContainer.hidden = true;
            hintContainer.textContent = '';
            hintButton.disabled = false;

            // Dynamically create and display the answer options.
            currentQuestion.options.forEach((option, index) => {
                const button = document.createElement('button');
                button.className = 'option-btn';
                button.innerHTML = `<span class="option-prefix">${String.fromCharCode(65 + index)}</span> <span class="option-text">${option}</span>`;
                button.addEventListener('click', () => handleAnswer(button));
                optionsContainer.appendChild(button);
            });
            
            // Update the progress display.
            progressText.textContent = `Question ${currentQuestionIndex + 1}/${questions.length}`;
            progressBarInner.style.width = `${((currentQuestionIndex) / questions.length) * 100}%`;
            startTimer();
        }
        
        function handleAnswer(selectedButton) {
            clearInterval(timerInterval);
            document.querySelectorAll('.option-btn').forEach(btn => btn.disabled = true);
            hintButton.disabled = true;
            nextButton.disabled = false;
            nextButton.focus();

            const answer = selectedButton ? selectedButton.querySelector('.option-text').textContent : "No Answer";
            const currentQuestion = questions[currentQuestionIndex];
            const isCorrect = answer === currentQuestion.answer;

            if (isCorrect) {
                score++;
                if (selectedButton) selectedButton.classList.add('correct');
            } else if (selectedButton) {
                selectedButton.classList.add('incorrect');
            }
            
            // Always highlight the correct answer after a selection is made.
            Array.from(optionsContainer.children).forEach(button => {
                if (button.querySelector('.option-text').textContent === currentQuestion.answer) {
                    button.classList.add('correct');
                }
            });

            // Store the result for the summary page.
            userAnswers.push({
                question: currentQuestion.question,
                selectedAnswer: answer,
                correctAnswer: currentQuestion.answer,
                isCorrect: isCorrect
            });
        }
        
        function showHint() {
            const currentQuestion = questions[currentQuestionIndex];
            if (currentQuestion.hint) {
                hintContainer.textContent = currentQuestion.hint;
                hintContainer.hidden = false;
                hintButton.disabled = true; // Hint can only be used once per question.
            } else {
                hintContainer.textContent = "No hint available for this question.";
                hintContainer.hidden = false;
                hintButton.disabled = true;
            }
        }

        nextButton.addEventListener('click', () => {
            currentQuestionIndex++;
            progressBarInner.style.width = `${((currentQuestionIndex) / questions.length) * 100}%`;
            
            if (currentQuestionIndex < questions.length) {
                loadQuestion();
            } else {
                // Quiz is over, save results and navigate to the results page.
                localStorage.setItem('quizScore', score);
                localStorage.setItem('totalQuestions', questions.length);
                localStorage.setItem('quizResults', JSON.stringify(userAnswers));
                window.location.href = 'results.html';
            }
        });

        hintButton.addEventListener('click', showHint);

        // 5. Load the very first question to start the quiz as soon as the page is ready.
        loadQuestion();

    } catch (error) {
        console.error('Error initializing quiz page:', error);
        document.querySelector('.quiz-container').innerHTML = `<p class="error-message">Error loading quiz. Please try again later.</p>`;
    }
}

function initResultsPage() {
    const score = localStorage.getItem('quizScore');
    const totalQuestions = localStorage.getItem('totalQuestions');
    const results = JSON.parse(localStorage.getItem('quizResults'));
    const topicId = localStorage.getItem('selectedTopic');
    const level = parseInt(localStorage.getItem('selectedLevel'), 10);


    if (score === null || totalQuestions === null || !results || !topicId || !level) {
        window.location.href = 'index.html';
        return;
    }

    document.getElementById('final-score').textContent = `${score}/${totalQuestions}`;
    const summaryContainer = document.getElementById('results-summary');
    summaryContainer.innerHTML = '<h3>Your Answers:</h3>';

    results.forEach(result => {
        const item = document.createElement('div');
        item.className = `summary-item ${result.isCorrect ? 'correct' : 'incorrect'}`;
        item.innerHTML = `
            <p><strong>Q:</strong> ${result.question}</p>
            <p class="user-answer ${result.isCorrect ? 'correct' : 'incorrect'}">Your answer: ${result.selectedAnswer}</p>
            ${!result.isCorrect ? `<p class="correct-answer">Correct answer: ${result.correctAnswer}</p>` : ''}
        `;
        summaryContainer.appendChild(item);
    });

    const isPassed = (score / totalQuestions) >= 0.6;
    if (isPassed && level < TOTAL_LEVELS) {
        const progress = getProgress();
        const currentTopicProgress = progress[topicId] || 1;
        if ((level + 1) > currentTopicProgress) {
            progress[topicId] = level + 1;
            saveProgress(progress);
        }
    }
    document.getElementById('result-message').textContent = isPassed ? "Congratulations!" : "Keep Practicing!";


    document.getElementById('retry-button').addEventListener('click', () => {
        retryLevel();
    });
    
    const nextLevelButton = document.getElementById('next-level-button');
    if (isPassed && level < TOTAL_LEVELS) {
        nextLevelButton.addEventListener('click', () => {
            selectLevel(level + 1);
        });
    } else {
        if (level >= TOTAL_LEVELS && isPassed) {
            nextLevelButton.textContent = "All Levels Done!";
        } else {
             nextLevelButton.textContent = "Try Again to Pass";
        }
        nextLevelButton.disabled = true;
    }

    const aiFeedbackButton = document.getElementById('ai-feedback-button');
    const incorrectAnswers = results.filter(r => !r.isCorrect);

    if (incorrectAnswers.length === 0) {
        aiFeedbackButton.textContent = 'Perfect Score! No mistakes to review.';
        aiFeedbackButton.disabled = true;
    } else {
        aiFeedbackButton.addEventListener('click', () => getAIFeedback(incorrectAnswers));
    }
}

// --- Navigation Helpers ---
function selectTopic(topicId) {
    localStorage.setItem('selectedTopic', topicId);
    window.location.href = 'levels.html';
}

function selectLevel(level) {
    localStorage.setItem('selectedLevel', level);
    window.location.href = 'quiz.html';
}

function retryLevel() {
    const levelToRetry = localStorage.getItem('selectedLevel');
    if (levelToRetry) {
        selectLevel(levelToRetry);
    } else {
        console.error("Could not determine level to retry. Navigating home.");
        window.location.href = 'index.html';
    }
}

// --- Gemini AI Feedback ---
async function getAIFeedback(incorrectAnswers) {
    if (!ai) {
        alert("API key is not set up. Cannot get AI feedback.");
        return;
    }

    const feedbackWrapper = document.getElementById('ai-feedback-content-wrapper');
    const feedbackContent = document.getElementById('ai-feedback-content');
    const feedbackButton = document.getElementById('ai-feedback-button');
    
    feedbackWrapper.hidden = false;
    feedbackContent.textContent = 'Gemini is thinking...';
    feedbackButton.disabled = true;
    
    try {
        const prompt = `
            I'm studying and took a quiz. I got the following questions wrong. 
            Can you please explain the concepts behind each question and why the correct answer is right? 
            Keep the explanations concise, easy to understand for a beginner, and format the response nicely. Use markdown. For each question, provide a section with a heading.

            Here are my mistakes:
            ${incorrectAnswers.map(item => `
            - Question: "${item.question}"
            - My incorrect answer: "${item.selectedAnswer}"
            - Correct answer: "${item.correctAnswer}"
            `).join('')}
        `;

        const response = await ai.models.generateContent({ model: "gem-2.5-flash", contents: prompt });
        
        let html = response.text;
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
        html = html.replace(/`(.*?)`/g, '<code>$1</code>');
        html = html.replace(/(\r\n|\r|\n)/g, '<br>');

        feedbackContent.innerHTML = html;

    } catch (error) {
        console.error('Gemini API error:', error);
        feedbackContent.textContent = 'Sorry, there was an error getting feedback from the AI. Please check your API key and try again.';
    }
}