// main.js

async function updateLiveStatuses() {
    try {
        // 백엔드 / Vercel API Endpoint 호출
        const response = await fetch('/api/live');
        if (!response.ok) return;

        const data = await response.json();

        if (data.success && data.status) {
            const { chzzk, twitch, youtube } = data.status;

            // HTML 카드 ID에 맞추어 상태 토글
            toggleLiveBadge('card-chzzk', chzzk);
            toggleLiveBadge('card-twitch', twitch);
            toggleLiveBadge('card-youtube', youtube);
        }
    } catch (error) {
        console.error("라이브 상태 업데이트 실패:", error);
    }
}

function toggleLiveBadge(cardId, isLive) {
    const card = document.getElementById(cardId);
    if (!card) return;

    const badge = card.querySelector('.live-status');
    if (badge) {
        badge.style.display = isLive ? 'inline-flex' : 'none';
    }
}

// 페이지 로드 시 실행
document.addEventListener('DOMContentLoaded', updateLiveStatuses);

// 링크 카드 클릭 추적 (Google Analytics 이벤트 전송)
document.addEventListener('DOMContentLoaded', () => {
    const linkCards = document.querySelectorAll('.link-card');
    
    linkCards.forEach(card => {
        card.addEventListener('click', (e) => {
            const title = card.querySelector('.link-title')?.textContent || 'Unknown';
            const url = card.getAttribute('href');

            if (typeof gtag === 'function') {
                gtag('event', 'click_link_card', {
                    'link_title': title,
                    'link_url': url
                });
            }
        });
    });
});