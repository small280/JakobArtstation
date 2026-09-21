// main.js

// ==========================================
// 1. API 및 분석 관련
// ==========================================
async function updateLiveStatuses() {
    if (window.location.protocol === 'file:') {
        console.warn("로컬 파일(file://) 환경입니다. 라이브 상태 확인 API는 서버 환경(http/https)에서 작동합니다.");
        return;
    }

    try {
        const response = await fetch('/api/live');
        if (!response.ok) return;

        const data = await response.json();

        if (data && data.success && data.status) {
            const { chzzk, twitch, youtube } = data.status;

            toggleLiveBadge('card-chzzk', chzzk);
            toggleLiveBadge('card-twitch', twitch);
            toggleLiveBadge('card-youtube', youtube);
        }
    } catch (error) {
        console.warn("라이브 상태 API 호출 실패:", error);
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

// ==========================================
// 2. Weather Effects System (snow | rain | none)
// ==========================================
let currentAnimationId = null;
let targetMode = localStorage.getItem('weather') || 'snow'; // (snow | rain | none)
let resetWeatherParticles = null; // 버튼 클릭 시 날씨 입자를 화면 전체에 재배치하는 외부 참조 함수

function initWeatherSystem() {
    const canvas = document.getElementById('snow-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    window.addEventListener('resize', () => {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    });

    // ------------------------------------------
    // 눈 / 비 입자 생성 함수
    // ------------------------------------------
    function createSnowflake(startFromTop = false) {
        return {
            x: Math.random() * width,
            y: startFromTop ? -(Math.random() * 50 + 10) : Math.random() * height,
            size: Math.random() * 3.5 + 3,
            speedY: Math.random() * 1.2 + 0.8,
            speedX: Math.random() * 0.4 - 0.2,
            opacity: Math.random() * 0.5 + 0.4,
            rotation: Math.random() * Math.PI * 2,
            spin: (Math.random() - 0.5) * 0.02
        };
    }

    function createRainDrop(startFromTop = false) {
        return {
            x: Math.random() * (width + 100),
            y: startFromTop ? -(Math.random() * 80 + 20) : Math.random() * height,
            length: Math.random() * 20 + 12,
            speedY: Math.random() * 10 + 12,
            speedX: -1.5,
            opacity: Math.random() * 0.4 + 0.2
        };
    }

    // 초기 입자 배열 (시작 시 화면 전체에 배치)
    let snowParticles = targetMode === 'snow' 
        ? Array.from({ length: 40 }, () => createSnowflake(false)) 
        : [];

    let rainDrops = targetMode === 'rain' 
        ? Array.from({ length: 80 }, () => createRainDrop(false)) 
        : [];

    const ripples = [];

    // 토글 버튼 클릭 시 호출하여 자연스러운 시차를 두고 화면 전체에 균일하게 떨어지도록 생성
    resetWeatherParticles = function(mode) {
        if (mode === 'snow') {
            snowParticles = Array.from({ length: 40 }, () => {
                const flake = createSnowflake(false);
                // y 위치 범위를 화면 위쪽(-height ~ height)까지 넓게 분산시켜
                // 자연스러운 시차를 두고 순차적으로 떨어지게 만듭니다.
                flake.y = (Math.random() * height * 2) - height;
                return flake;
            });
        } else if (mode === 'rain') {
            rainDrops = Array.from({ length: 80 }, () => {
                const drop = createRainDrop(false);
                drop.y = (Math.random() * height * 2) - height;
                return drop;
            });
        }
    };

    // 6각 눈 결정 그림 함수
    function drawSnowflake(x, y, size, color, rotation) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rotation);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.2;
        ctx.lineCap = 'round';

        for (let i = 0; i < 6; i++) {
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(0, -size);
            ctx.moveTo(0, -size * 0.5);
            ctx.lineTo(size * 0.3, -size * 0.7);
            ctx.moveTo(0, -size * 0.5);
            ctx.lineTo(-size * 0.3, -size * 0.7);
            ctx.stroke();
            ctx.rotate(Math.PI / 3);
        }
        ctx.restore();
    }

    // ------------------------------------------
    // 메인 프레임 루프 (render)
    // ------------------------------------------
    function render() {
        ctx.clearRect(0, 0, width, height);
        const isLightMode = document.body.classList.contains('light-mode');

        const snowBaseColor = isLightMode ? `90, 110, 140` : `255, 255, 255`;
        const rainBaseColor = isLightMode ? `70, 100, 150` : `180, 210, 255`;

        // 1. 눈 모드일 때 내려가서 사라진 입자 상단 보충
        if (targetMode === 'snow' && snowParticles.length < 40) {
            snowParticles.push(createSnowflake(true));
        }

        // 2. 비 모드일 때 내려가서 사라진 입자 상단 보충
        if (targetMode === 'rain' && rainDrops.length < 80) {
            rainDrops.push(createRainDrop(true));
        }

        // ------------------------------------------
        // [눈 입자 렌더링 & 이동]
        // ------------------------------------------
        for (let i = snowParticles.length - 1; i >= 0; i--) {
            const p = snowParticles[i];

            if (targetMode !== 'snow') {
                p.opacity -= 0.015; // 디졸브
            }

            if (p.opacity <= 0) {
                snowParticles.splice(i, 1);
                continue;
            }

            const alpha = isLightMode ? p.opacity * 0.7 : p.opacity;
            drawSnowflake(p.x, p.y, p.size, `rgba(${snowBaseColor}, ${alpha})`, p.rotation);

            p.y += p.speedY;
            p.x += p.speedX;
            p.rotation += p.spin;

            if (p.y > height + 10) {
                if (targetMode === 'snow') {
                    p.y = -10;
                    p.x = Math.random() * width;
                } else {
                    snowParticles.splice(i, 1);
                }
            }
        }

        // ------------------------------------------
        // [빗줄기 & 파문 렌더링 & 이동]
        // ------------------------------------------
        for (let i = rainDrops.length - 1; i >= 0; i--) {
            const d = rainDrops[i];

            if (targetMode !== 'rain') {
                d.opacity -= 0.02; // 디졸브
            }

            if (d.opacity <= 0) {
                rainDrops.splice(i, 1);
                continue;
            }

            ctx.beginPath();
            ctx.moveTo(d.x, d.y);
            ctx.lineTo(d.x + d.speedX, d.y + d.length);
            ctx.strokeStyle = `rgba(${rainBaseColor}, ${d.opacity})`;
            ctx.lineWidth = 1.2;
            ctx.lineCap = 'round';
            ctx.stroke();

            d.y += d.speedY;
            d.x += d.speedX;

            if (d.y > height) {
                if (targetMode === 'rain' && Math.random() > 0.4) {
                    ripples.push({
                        x: d.x,
                        y: height - Math.random() * 10,
                        radius: 1,
                        maxRadius: Math.random() * 8 + 4,
                        opacity: d.opacity
                    });
                }

                if (targetMode === 'rain') {
                    d.y = -d.length;
                    d.x = Math.random() * (width + 100);
                } else {
                    rainDrops.splice(i, 1);
                }
            }
        }

        // [바닥 파문 그려주기]
        for (let i = ripples.length - 1; i >= 0; i--) {
            const r = ripples[i];

            if (targetMode !== 'rain') {
                r.opacity -= 0.03;
            }

            ctx.beginPath();
            ctx.ellipse(r.x, r.y, r.radius, r.radius * 0.4, 0, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(${rainBaseColor}, ${r.opacity})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();

            r.radius += 0.4;
            r.opacity -= 0.02;

            if (r.opacity <= 0 || r.radius >= r.maxRadius) {
                ripples.splice(i, 1);
            }
        }

        currentAnimationId = requestAnimationFrame(render);
    }

    if (currentAnimationId) cancelAnimationFrame(currentAnimationId);
    render();
}

// ------------------------------------------
// 3. 날씨 토글 버튼 이벤트
// ------------------------------------------
function setupWeatherToggle() {
    const weatherBtn = document.getElementById('weather-toggle');
    if (!weatherBtn) return;

    updateWeatherIcon(weatherBtn, targetMode);

    weatherBtn.addEventListener('click', () => {
        // 순환: 눈(snow) -> 비(rain) -> 맑음(none) -> 눈(snow)
        if (targetMode === 'snow') {
            targetMode = 'rain';
        } else if (targetMode === 'rain') {
            targetMode = 'none';
        } else {
            targetMode = 'snow';
        }

        localStorage.setItem('weather', targetMode);
        updateWeatherIcon(weatherBtn, targetMode);

        // [수정] 전환된 날씨 입자를 화면 전체에 즉시 채워 불연속 현상 방지
        if (typeof resetWeatherParticles === 'function') {
            resetWeatherParticles(targetMode);
        }
    });
}

function updateWeatherIcon(btn, mode) {
    if (mode === 'snow') {
        btn.innerHTML = `<i class="fa-solid fa-snowflake"></i>`;
        btn.setAttribute('title', 'Snow');
    } else if (mode === 'rain') {
        btn.innerHTML = `<i class="fa-solid fa-cloud-showers-heavy"></i>`;
        btn.setAttribute('title', 'Rain');
    } else {
        // 맑음(none) 모드일 때 SVG 해 모양 아이콘 적용
        btn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="4"></circle>
          <path d="M12 2v2"></path>
          <path d="M12 20v2"></path>
          <path d="m4.93 4.93 1.41 1.41"></path>
          <path d="m17.66 17.66 1.41 1.41"></path>
          <path d="M2 12h2"></path>
          <path d="M20 12h2"></path>
          <path d="m6.34 17.66-1.41 1.41"></path>
          <path d="m19.07 4.93-1.41 1.41"></path>
        </svg>
        `;
        btn.setAttribute('title', 'Sunny');
    }
}

// ==========================================
// 4. 페이지 이벤트 초기화
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    updateLiveStatuses();
    initWeatherSystem();
    setupWeatherToggle();

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