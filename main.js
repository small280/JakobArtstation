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