let posts = [];
let sentimentCounts = {
    positive: 0,
    neutral: 0,
    negative: 0
};
let chart;
let postsPerPage = 5;
let currentPage = 1;

const gemini = 'AIzaSyBB_CEbN1Y1g4qaDxJXRI8_uZfHsMfkJds';

window.onload = function() {
    initChart();
};

// Analyse
async function analyzePost() {
    const input = document.getElementById('input');
    const text = input.value.trim();
    
    if (!text) {
        alert('Please enter some text to analyze');
        return;
    }

    try {
        input.disabled = true;
        const sentiment = await analyzeSentimentWithGemini(text);
        addPost(text, sentiment);
        input.value = '';
    } catch (error) {
        console.error('Error analyzing sentiment:', error);
        alert('Error analyzing sentiment. Please try again.');
    } finally {
        input.disabled = false;
        input.focus();
    }
}

// Enter keydown
document.getElementById('input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        analyzePost();
    }
});

// Prompt to gemini
async function analyzeSentimentWithGemini(text) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${gemini}`;
    
    const prompt = `Analyze the sentiment of this text and respond with exactly one word (positive, neutral, or negative): "${text}"`;
    
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            contents: [{
                parts: [{
                    text: prompt
                }]
            }]
        })
    });

    if (!response.ok) {
        throw new Error('API request failed');
    }

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
        throw new Error('Invalid API response');
    }

    const sentiment = data.candidates[0].content.parts[0].text.toLowerCase().trim();
    
    if (!['positive', 'neutral', 'negative'].includes(sentiment)) {
        throw new Error('Invalid sentiment response');
    }

    return sentiment;
}

// Add to recent
function addPost(text, sentiment) {
    const post = {
        text,
        sentiment,
        timestamp: new Date().toLocaleTimeString()
    };

    posts.unshift(post);
    sentimentCounts[sentiment]++;
    
    updateMetrics();
    renderPosts();
    updateChart();
}

function renderPosts() {
    const postsContainer = document.getElementById('postsContainer');
    postsContainer.innerHTML = '';

    const startIndex = (currentPage - 1) * postsPerPage;
    const endIndex = startIndex + postsPerPage;
    const paginatedPosts = posts.slice(startIndex, endIndex);

    paginatedPosts.forEach(post => {
        const postElement = document.createElement('div');
        postElement.className = 'post';
        postElement.innerHTML = `
            <div class="post-header">
                <span>${post.timestamp}</span>
                <span class="sentiment ${post.sentiment}">${post.sentiment}</span>
            </div>
            <div class="post-content">${escapeHtml(post.text)}</div>
        `;
        postsContainer.appendChild(postElement);
    });

    updatePaginationButtons();
}

// Pagination
function updatePaginationButtons() {
    const totalPages = Math.ceil(posts.length / postsPerPage);
    document.getElementById('pageIndicator').textContent = `Page ${currentPage} of ${totalPages}`;
    document.getElementById('prevPage').disabled = currentPage === 1;
    document.getElementById('nextPage').disabled = currentPage >= totalPages;
}

function changePage(direction) {
    currentPage += direction;
    renderPosts();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Charts.js chart
function initChart() {
    const ctx = document.getElementById('sentimentChart').getContext('2d');
    chart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Positive', 'Neutral', 'Negative'],
            datasets: [{
                data: [0, 0, 0],
                backgroundColor: ['#137333', '#FFA726', '#c5221f']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

function updateChart() {
    chart.data.datasets[0].data = [
        sentimentCounts.positive,
        sentimentCounts.neutral,
        sentimentCounts.negative
    ];
    chart.update();
}

// Overview metrics
function updateMetrics() {
    const total = posts.length;
    const positive = posts.filter(p => p.sentiment === 'positive').length;
    const negative = posts.filter(p => p.sentiment === 'negative').length;
    const neutral = posts.filter(p => p.sentiment === 'neutral').length;
    
    document.getElementById('totalPosts').textContent = total;
    document.getElementById('positivePercentage').textContent = 
        total ? Math.round((positive / total) * 100) + '%' : '0%';
    document.getElementById('negativePercentage').textContent = 
        total ? Math.round((negative / total) * 100) + '%' : '0%';
    document.getElementById('neutralPercentage').textContent = 
        total ? Math.round((neutral / total) * 100) + '%' : '0%';
}

