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
        if (isLive) {
            badge.classList.add('active'); // 방송 중: 초록색 불 & 깜빡임
        } else {
            badge.classList.remove('active'); // 방송 아님: 회색 꺼진 상태 유지
        }
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
            speedY: Math.random() * 10 + 20,
            speedX: -1.5,
            opacity: Math.random() * 0.4 + 0.2
        };
    }

    // 초기 입자 배열
    let snowParticles = targetMode === 'snow' 
        ? Array.from({ length: 80 }, () => createSnowflake(false)) 
        : [];

    let rainDrops = targetMode === 'rain' 
        ? Array.from({ length: 80 }, () => createRainDrop(false)) 
        : [];

    const ripples = [];

    // 토글 버튼 클릭 시 호출
    resetWeatherParticles = function(mode) {
        if (mode === 'snow') {
            snowParticles = Array.from({ length: 40 }, () => {
                const flake = createSnowflake(false);
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

        // [수정 포인트] 라이트 모드 판별을 'light-mode' 기준으로 통일
        const isLightMode = document.body.classList.contains('light-mode');

        // 다크 모드일 때는 흰색, 라이트 모드일 때는 잘 보이는 어두운 블루/회색조 컬러로 설정
        const snowBaseColor = isLightMode ? `70, 130, 180` : `255, 255, 255`;
        const rainBaseColor = isLightMode ? `65, 105, 225` : `255, 255, 255`;

        // 1. 눈 모드 상단 보충
        if (targetMode === 'snow' && snowParticles.length < 40) {
            snowParticles.push(createSnowflake(true));
        }

        // 2. 비 모드 상단 보충
        if (targetMode === 'rain' && rainDrops.length < 80) {
            rainDrops.push(createRainDrop(true));
        }

        // ------------------------------------------
        // [눈 입자 렌더링 & 이동]
        // ------------------------------------------
        for (let i = snowParticles.length - 1; i >= 0; i--) {
            const p = snowParticles[i];

            if (targetMode !== 'snow') {
                p.opacity -= 0.015;
            }

            if (p.opacity <= 0) {
                snowParticles.splice(i, 1);
                continue;
            }

            drawSnowflake(p.x, p.y, p.size, `rgba(${snowBaseColor}, ${p.opacity})`, p.rotation);

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
                d.opacity -= 0.02;
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

// ==========================================
// 3. 날씨 및 테마 관리
// ==========================================
function applyWeatherClass(mode) {
    document.body.classList.remove('weather-snow', 'weather-rain', 'weather-none');
    document.body.classList.add(`weather-${mode}`);
}

// 라이트/다크 모드 토글 함수
function toggleTheme() {
    const themeBtn = document.getElementById("theme-toggle");
    
    // light-mode 토글
    const isLight = document.body.classList.toggle('light-mode');
    
    if (isLight) {
        document.body.classList.add('light');
        document.body.classList.remove('dark');
        localStorage.setItem('theme', 'light');
    } else {
        document.body.classList.remove('light', 'light-mode');
        document.body.classList.add('dark');
        localStorage.setItem('theme', 'dark');
    }
    
    if (themeBtn) {
        if (isLight) {
            themeBtn.innerHTML = `
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
            </svg>`;
        } else {
            themeBtn.innerHTML = `<i class="fa-solid fa-moon"></i>`;
        }
    }

    applyWeatherClass(targetMode);
}

function setupWeatherToggle() {
    const weatherBtn = document.getElementById('weather-toggle');
    if (!weatherBtn) return;

    applyWeatherClass(targetMode);
    updateWeatherIcon(weatherBtn, targetMode);

    weatherBtn.addEventListener('click', () => {
        if (targetMode === 'snow') {
            targetMode = 'rain';
        } else if (targetMode === 'rain') {
            targetMode = 'none';
        } else {
            targetMode = 'snow';
        }

        localStorage.setItem('weather', targetMode);

        applyWeatherClass(targetMode);
        updateWeatherIcon(weatherBtn, targetMode);

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
        btn.setAttribute('title', 'Clear');
    }
}

// ==========================================
// 4. 페이지 이벤트 초기화
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // 1. 초기 테마 로드
    const savedTheme = localStorage.getItem('theme');
    const themeBtn = document.getElementById('theme-toggle');

    if (savedTheme === 'light') {
        document.body.classList.add('light-mode', 'light');
        document.body.classList.remove('dark');
        if (themeBtn) {
            themeBtn.innerHTML = `
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
            </svg>`;
        }
    } else {
        document.body.classList.add('dark');
        document.body.classList.remove('light-mode', 'light');
        if (themeBtn) {
            themeBtn.innerHTML = `<i class="fa-solid fa-moon"></i>`;
        }
    }

    // 2. 테마 토글 버튼 이벤트 바인딩
    if (themeBtn) {
        // 기존 리스너 중복 방지를 위해 기존 onclick 대신 안전하게 할당
        themeBtn.onclick = toggleTheme;
    }

    updateLiveStatuses();
    setupWeatherToggle();
    initWeatherSystem();
    // ... (이하 생략)

    const linkCards = document.querySelectorAll('.link-card');
    linkCards.forEach(card => {
        card.addEventListener('click', () => {
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

// // ==========================================
// // 5. 방문자 조회
// // ==========================================

// // 1. 페이지 방문 시 조회수 증가 및 가져오기
// async function trackPageView() {
//     try {
//         // 'mysite-portfolio'는 본인만의 고유한 이름(namespace)으로 변경하세요.
//         const response = await fetch('https://api.countapi.xyz/hit/mysite-portfolio/visits');
//         const data = await response.json();
//         console.log(`총 방문자 수: ${data.value}`);
//     } catch (err) {
//         console.log("방문자 집계 에러:", err);
//     }
// }

// // 2. SNS 링크 클릭 시 클릭 수 증가 및 가져오기
// async function trackLinkClick(title) {
//     try {
//         // 공백이나 특수문자가 들어가면 에러가 날 수 있으니 영문 키로 변환 (예: youtube, chzzk 등)
//         const key = title.toLowerCase().replace(/[^a-z0-9]/g, '_');
        
//         const response = await fetch(`https://api.countapi.xyz/hit/mysite-portfolio/click_${key}`);
//         const data = await response.json();
//         console.log(`${title} 클릭 수: ${data.value}`);
//     } catch (err) {
//         console.log("클릭 집계 에러:", err);
//     }
// }

// // 페이지 로드 시 실행
// document.addEventListener('DOMContentLoaded', () => {
//     trackPageView();

//     // 기존 링크 클릭 이벤트에 연결
//     const linkCards = document.querySelectorAll('.link-card');
//     linkCards.forEach(card => {
//         card.addEventListener('click', () => {
//             const title = card.querySelector('.link-title')?.textContent || 'Unknown';
//             trackLinkClick(title);
//         });
//     });
// });

// main_6.js 하단에 추가
let isAnimationPaused = false;

window.pauseWeatherAnimation = function() {
    isAnimationPaused = true;
    if (currentAnimationId) {
        cancelAnimationFrame(currentAnimationId);
        currentAnimationId = null;
    }
};

window.resumeWeatherAnimation = function() {
    if (isAnimationPaused) {
        isAnimationPaused = false;
        // 캔버스 루프 재시작을 위해 initWeatherSystem 내부의 렌더 함수 우회 실행
        const canvas = document.getElementById('snow-canvas');
        if (canvas && typeof initWeatherSystem === 'function') {
            // 이미 실행 중이 아니라면 다시 구동
            if (!currentAnimationId) {
                initWeatherSystem();
            }
        }
    }
};