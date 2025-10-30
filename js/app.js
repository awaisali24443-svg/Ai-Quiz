import { GoogleGenAI } from "@google/genai";

const API_KEY = process.env.API_KEY;
let ai;
if (API_KEY) {
    ai = new GoogleGenAI({ apiKey: API_KEY });
}


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
}

function route() {
    const page = window.location.pathname.split("/").pop() || 'index.html';

    // Apply theme based on stored topic
    const selectedTopic = localStorage.getItem('selectedTopic');
    if (selectedTopic) {
        document.body.dataset.theme = selectedTopic;
    }

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
            card.innerHTML = `
                <h4>${topic.title}</h4>
                <p>${topic.description}</p>
            `;
            card.addEventListener('click', () => selectTopic(topic.id));
            card.addEventListener('keydown', (e) => {
                if(e.key === 'Enter' || e.key === ' ') selectTopic(topic.id);
            });
            container.appendChild(card);
        });
    } catch (error) {
        console.error('Error initializing home page:', error);
        const container = document.getElementById('topics-container');
        if (container) container.innerHTML = `<p class="error-message">Error loading topics. Please try again later.</p>`;
    }
}

function selectTopic(topicId) {
    localStorage.setItem('selectedTopic', topicId);
    window.location.href = 'levels.html';
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

        headerContainer.innerHTML = `
            <h2>${topicData.title}</h2>
            <p>Select your difficulty level.</p>
        `;

        levelsContainer.innerHTML = '';
        topicData.levels.forEach(level => {
            const levelCard = document.createElement('div');
            levelCard.className = 'level-card';
            levelCard.dataset.level = level.level;
            levelCard.setAttribute('role', 'listitem');
            levelCard.setAttribute('tabindex', '0');
            levelCard.innerHTML = `
                <h3>Level ${level.level}</h3>
                <p>${level.title}</p>
            `;
            levelCard.addEventListener('click', () => selectLevel(level.level));
            levelCard.addEventListener('keydown', (e) => {
                if(e.key === 'Enter' || e.key === ' ') selectLevel(level.level);
            });
            levelsContainer.appendChild(levelCard);
        });
    } catch (error) {
        console.error('Error initializing levels page:', error);
        const levelsContainer = document.getElementById('levels-container');
        if (levelsContainer) levelsContainer.innerHTML = `<p class="error-message">Error loading levels. Please try again later.</p>`;
    }
}

function selectLevel(level) {
    localStorage.setItem('selectedLevel', level);
    window.location.href = 'quiz.html';
}

async function initQuizPage() {
    const topicId = localStorage.getItem('selectedTopic');
    const level = localStorage.getItem('selectedLevel');
    if (!topicId || !level) {
        window.location.href = 'index.html';
        return;
    }
    
    try {
        const response = await fetch('data/questions.json');
        if (!response.ok) throw new Error('Failed to load questions.');
        const allData = await response.json();
        const levelData = allData[topicId].levels.find(l => l.level == level);
        
        if (!levelData || !levelData.questions) throw new Error(`Questions for topic "${topicId}" level ${level} not found.`);
        
        const questions = levelData.questions;

        let currentQuestionIndex = 0;
        let score = 0;
        let userAnswers = [];

        const questionText = document.getElementById('question-text');
        const optionsContainer = document.getElementById('options-container');
        const nextButton = document.getElementById('next-button');
        const progressText = document.getElementById('progress-text');
        const progressBarInner = document.getElementById('progress-bar-inner');
        
        function loadQuestion() {
            const currentQuestion = questions[currentQuestionIndex];
            questionText.textContent = currentQuestion.question;
            optionsContainer.innerHTML = '';
            nextButton.disabled = true;

            currentQuestion.options.forEach((option, index) => {
                const button = document.createElement('button');
                button.className = 'option-btn';
                button.innerHTML = `<span class="option-prefix">${String.fromCharCode(65 + index)}</span> <span class="option-text">${option}</span>`;
                button.addEventListener('click', () => {
                    document.querySelectorAll('.option-btn').forEach(btn => btn.classList.remove('selected'));
                    button.classList.add('selected');
                    nextButton.disabled = false;
                });
                optionsContainer.appendChild(button);
            });
            
            progressText.textContent = `Question ${currentQuestionIndex + 1}/${questions.length}`;
            progressBarInner.style.width = `${((currentQuestionIndex + 1) / questions.length) * 100}%`;
        }

        nextButton.addEventListener('click', () => {
            const selectedButton = document.querySelector('.option-btn.selected');
            if (!selectedButton) return;

            const answer = selectedButton.querySelector('.option-text').textContent;
            const currentQuestion = questions[currentQuestionIndex];
            const isCorrect = answer === currentQuestion.answer;

            if (isCorrect) {
                score++;
            }
            
            userAnswers.push({
                question: currentQuestion.question,
                selectedAnswer: answer,
                correctAnswer: currentQuestion.answer,
                isCorrect: isCorrect
            });

            Array.from(optionsContainer.children).forEach(button => {
                const optionText = button.querySelector('.option-text').textContent;
                button.disabled = true; // Disable all buttons after selection
                if (optionText === currentQuestion.answer) {
                    button.classList.add('correct');
                } else if (button.classList.contains('selected')) {
                    button.classList.add('incorrect');
                }
            });
            
            setTimeout(() => {
                currentQuestionIndex++;
                if (currentQuestionIndex < questions.length) {
                    loadQuestion();
                } else {
                    localStorage.setItem('quizScore', score);
                    localStorage.setItem('totalQuestions', questions.length);
                    localStorage.setItem('quizResults', JSON.stringify(userAnswers));
                    window.location.href = 'results.html';
                }
            }, 1200); // Increased delay to see result
        });

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

    if (score === null || totalQuestions === null || !results) {
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

    document.getElementById('play-again-button').addEventListener('click', () => {
        // Go back to level selection for the same topic
        window.location.href = 'levels.html';
    });
    
    const aiFeedbackButton = document.getElementById('ai-feedback-button');
    const incorrectAnswers = results.filter(r => !r.isCorrect);

    if (incorrectAnswers.length === 0) {
        aiFeedbackButton.textContent = 'Perfect Score! No mistakes to review.';
        aiFeedbackButton.disabled = true;
    } else {
        aiFeedbackButton.addEventListener('click', () => getAIFeedback(incorrectAnswers));
    }
}

async function getAIFeedback(incorrectAnswers) {
    if (!ai) {
        alert("API key is not set up. Cannot get AI feedback.");
        return;
    }

    const feedbackContainer = document.getElementById('ai-feedback-container');
    const feedbackContent = document.getElementById('ai-feedback-content');
    const feedbackButton = document.getElementById('ai-feedback-button');
    
    feedbackContainer.hidden = false;
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

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });
        
        // A simple markdown to HTML converter
        let html = response.text;
        html = html.replace(/(\*\*|__)(.*?)\1/g, '<strong>$2</strong>'); // Bold
        html = html.replace(/(\*|_)(.*?)\1/g, '<em>$2</em>'); // Italic
        html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>'); // Code blocks
        html = html.replace(/`(.*?)`/g, '<code>$1</code>'); // Inline code
        html = html.replace(/\n/g, '<br>'); // Newlines

        feedbackContent.innerHTML = html;

    } catch (error) {
        console.error('Gemini API error:', error);
        feedbackContent.textContent = 'Sorry, there was an error getting feedback from the AI. Please check your API key and try again.';
    }
}