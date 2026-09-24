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

    // 눈 / 비 입자 생성 함수
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

    let snowParticles = targetMode === 'snow' 
        ? Array.from({ length: 80 }, () => createSnowflake(false)) 
        : [];

    let rainDrops = targetMode === 'rain' 
        ? Array.from({ length: 80 }, () => createRainDrop(false)) 
        : [];

    const ripples = [];

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

    function render() {
        ctx.clearRect(0, 0, width, height);

        const isLightMode = document.body.classList.contains('light-mode');
        const snowBaseColor = isLightMode ? `70, 130, 180` : `255, 255, 255`;
        const rainBaseColor = isLightMode ? `65, 105, 225` : `255, 255, 255`;

        if (targetMode === 'snow' && snowParticles.length < 40) {
            snowParticles.push(createSnowflake(true));
        }

        if (targetMode === 'rain' && rainDrops.length < 80) {
            rainDrops.push(createRainDrop(true));
        }

        for (let i = snowParticles.length - 1; i >= 0; i--) {
            const p = snowParticles[i];
            if (targetMode !== 'snow') p.opacity -= 0.015;
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

        for (let i = rainDrops.length - 1; i >= 0; i--) {
            const d = rainDrops[i];
            if (targetMode !== 'rain') d.opacity -= 0.02;
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

        for (let i = ripples.length - 1; i >= 0; i--) {
            const r = ripples[i];
            if (targetMode !== 'rain') r.opacity -= 0.03;

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

function toggleTheme() {
    const themeBtn = document.getElementById("theme-toggle");
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
// 4. 다국어 번역 및 토스트 시스템
// ==========================================
const translations = {
    ko: {
        bio: "Illustrator & Character Designer<br>라이브 스트리밍 및 외주 / 커미션 문의",
        sec_live: "Live Streaming",
        chzzk_desc: "치지직 생방송 채널",
        youtube_desc: "라이브 & 다시보기",
        twitch_desc: "트위치 생방송 채널",
        sec_comm: "Commissions & Contact",
        crepe_desc: "크레페 커미션 신청",
        artmug_desc: "아트머그 외주 & 커미션",
        kakao_desc: "카카오톡 개인문의",
        vgen_desc: "VGen 글로벌 커미션",
        pixiv_req_desc: "픽시브 리퀘스트",
        sec_community: "Community",
        discord_desc: "팬 커뮤니티 & 공지사항",
        sec_sns: "SNS & Gallery",
        twitter_realism_desc: "실사 & 반실사 일러스트",
        twitter_casual_desc: "캐주얼 & 서브컬쳐 일러스트",
        instagram_desc: "갤러리 & 피드",
        pixiv_desc: "픽시브 작품 모음",
        cara_desc: "아티스트 포트폴리오",
        bluesky_desc: "블루스카이 채널",
        artstation_desc: "포트폴리오 갤러리",
        threads_desc: "스레드 일상 & 작업",
        reddit_desc: "레딧 서브레딧",
        copy_toast: "이메일 주소가 복사되었습니다!",
        link_copy_toast: "링크 주소가 복사되었습니다!"
    },
    en: {
        bio: "Illustrator & Character Designer<br>Live Streamer / Inquiries for Business & Commission",
        sec_live: "Live Streaming",
        chzzk_desc: "Chzzk Live Stream Channel",
        youtube_desc: "Live & VODs",
        twitch_desc: "Twitch Live Stream Channel",
        sec_comm: "Commissions & Contact",
        crepe_desc: "crepe Commission",
        artmug_desc: "ARTMUG Commission & Business",
        kakao_desc: "KakaoTalk Private Inquiry",
        vgen_desc: "VGen Global Commission",
        pixiv_req_desc: "Pixiv Request",
        sec_community: "Community",
        discord_desc: "Fan Community & Announcements",
        sec_sns: "SNS & Gallery",
        twitter_realism_desc: "Realism & Semi-Realism Art",
        twitter_casual_desc: "Casual & Subculture Art",
        instagram_desc: "Gallery & Feed",
        pixiv_desc: "Pixiv Artworks",
        cara_desc: "Artist Portfolio",
        bluesky_desc: "Bluesky Channel",
        artstation_desc: "Portfolio Gallery",
        threads_desc: "Threads Daily & Works",
        reddit_desc: "Reddit Community",
        copy_toast: "Email address copied to clipboard!",
        link_copy_toast: "Link URL copied to clipboard!"
    },
    ja: {
        bio: "Illustrator & Character Designer<br>ライブ配信 / お仕事・有償依頼のご相談",
        sec_live: "Live Streaming",
        chzzk_desc: "Chzzk 配信チャンネル",
        youtube_desc: "ライブ & アーカイブ",
        twitch_desc: "Twitch 配信チャンネル",
        sec_comm: "Commissions & Contact",
        crepe_desc: "crepe 有償依頼",
        artmug_desc: "ARTMUG 有償依頼・お仕事",
        kakao_desc: "カカオトーク個人問い合わせ",
        vgen_desc: "VGen グローバルコミッション",
        pixiv_req_desc: "Pixiv リクエスト",
        sec_community: "Community",
        discord_desc: "ファンコミュニティ & お知らせ",
        sec_sns: "SNS & Gallery",
        twitter_realism_desc: "リアル & 半リアル イラスト",
        twitter_casual_desc: "カジュアル & サブカル イラスト",
        instagram_desc: "ギャラリー & 投稿",
        pixiv_desc: "Pixiv 作品集",
        cara_desc: "ポートフォリオ",
        bluesky_desc: "Bluesky チャンネル",
        artstation_desc: "ポートフォリオギャラリー",
        threads_desc: "Threads 日常 & 制作",
        reddit_desc: "Reddit コミュニティ",
        copy_toast: "メールアドレスをコピーしました！",
        link_copy_toast: "リンクアドレスをコピーしました！"
    },
    "zh-CN": {
        bio: "Illustrator & Character Designer<br>直播 / 约稿与商务合作请咨询",
        sec_live: "Live Streaming",
        chzzk_desc: "Chzzk 直播频道",
        youtube_desc: "直播与录播",
        twitch_desc: "Twitch 直播频道",
        sec_comm: "Commissions & Contact",
        crepe_desc: "crepe 约稿",
        artmug_desc: "ARTMUG 约稿与商务",
        kakao_desc: "KakaoTalk 个人咨询",
        vgen_desc: "VGen 全球约稿",
        pixiv_req_desc: "Pixiv Request 约稿",
        sec_community: "Community",
        discord_desc: "粉丝社区与公告",
        sec_sns: "SNS & Gallery",
        twitter_realism_desc: "写实 & 半写实插画",
        twitter_casual_desc: "日系 & 二次元插画",
        instagram_desc: "画廊与动态",
        pixiv_desc: "Pixiv 作品集",
        cara_desc: "艺术家作品集",
        bluesky_desc: "Bluesky 频道",
        artstation_desc: "作品集画廊",
        threads_desc: "Threads 日常与创作",
        reddit_desc: "Reddit 社区",
        copy_toast: "邮箱地址已复制到剪贴板！",
        link_copy_toast: "链接地址已复制到剪贴板！"
    },
    "zh-TW": {
        bio: "Illustrator & Character Designer<br>實況直播 / 商業委託與有償約稿請洽詢",
        sec_live: "Live Streaming",
        chzzk_desc: "Chzzk 直播頻道",
        youtube_desc: "直播與重播",
        twitch_desc: "Twitch 直播頻道",
        sec_comm: "Commissions & Contact",
        crepe_desc: "crepe 委託",
        artmug_desc: "ARTMUG 委託與商業合作",
        kakao_desc: "KakaoTalk 個人諮詢",
        vgen_desc: "VGen 全球委託",
        pixiv_req_desc: "Pixiv Request 委託",
        sec_community: "Community",
        discord_desc: "粉絲社群與公告",
        sec_sns: "SNS & Gallery",
        twitter_realism_desc: "寫實 & 半寫實插畫",
        twitter_casual_desc: "日系 & 二次元插畫",
        instagram_desc: "畫廊與日常",
        pixiv_desc: "Pixiv 作品集",
        cara_desc: "藝術家作品集",
        bluesky_desc: "Bluesky 頻道",
        artstation_desc: "作品集畫廊",
        threads_desc: "Threads 日常與創作",
        reddit_desc: "Reddit 社群",
        copy_toast: "信箱地址已複製到剪貼簿！",
        link_copy_toast: "連結地址已複製到剪貼簿！"
    }
};

let currentLang = 'ko';

function changeLanguage(lang) {
    currentLang = lang;
    const keys = translations[lang];
    if (!keys) return;

    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        if (keys[key]) {
            element.innerHTML = keys[key];
        }
    });

    localStorage.setItem('preferred_lang', lang);
}

function copyEmail(emailText) {
    navigator.clipboard.writeText(emailText).then(() => {
        const toastMsg = translations[currentLang]?.copy_toast || "복사되었습니다!";
        showToast(toastMsg);
    }).catch(err => {
        console.error('복사 실패:', err);
    });
}

function copyLink(event, url) {
    event.preventDefault();
    event.stopPropagation();

    navigator.clipboard.writeText(url).then(() => {
        const toastMsg = translations[currentLang]?.link_copy_toast || "링크 주소가 복사되었습니다!";
        showToast(toastMsg);
    }).catch(err => {
        console.error('Copy Link 실패:', err);
    });
}

function showToast(message) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    
    setTimeout(() => {
        toast.classList.remove("show");
    }, 2000);
}

// ==========================================
// 5. Supabase 방문 및 클릭 집계 (RPC 방식)
// ==========================================
// ==========================================
// 5. Supabase 방문 및 클릭 집계 (RPC 방식)
// ==========================================
async function trackSiteVisit() {
    const VISIT_KEY = 'site_visit_timestamp';
    const COOLDOWN_TIME = 30 * 60 * 1000; // 30분 중복 방지
    
    const lastVisitTime = localStorage.getItem(VISIT_KEY);
    const currentTime = new Date().getTime();

    if (!lastVisitTime || (currentTime - lastVisitTime > COOLDOWN_TIME)) {
        try {
            if (window.supabaseClient) {
                const referrerUrl = document.referrer || 'Direct';

                // 1. IP 기반 국가 정보 가져오기 (예시: ipapi.co 또는 ipinfo.io 활용)
                let countryCode = 'Unknown';
                try {
                    const ipRes = await fetch('https://ipapi.co/json/');
                    const ipData = await ipRes.json();
                    if (ipData && ipData.country_code) {
                        countryCode = ipData.country_code; // 예: 'KR', 'US', 'JP' 등
                    }
                } catch (e) {
                    console.warn("국가 정보 조회 실패:", e);
                }

                // 2. Supabase RPC 호출 시 country 정보도 함께 전달
                const { error } = await window.supabaseClient.rpc('increment_site_visit', {
                    visitor_referrer: referrerUrl,
                    visitor_country: countryCode // Supabase 함수 매개변수 이름에 맞춰 수정
                });

                if (!error) {
                    localStorage.setItem(VISIT_KEY, currentTime);
                } else {
                    console.error('방문 기록 저장 실패:', error);
                }
            }
        } catch (error) {
            console.error('방문 기록 통신 오류:', error);
        }
    }
}

// 플랫폼 클릭 처리 함수
async function handlePlatformClick(event, platformId, url) {
    const CLICK_KEY = `platform_click_${platformId}`;
    const COOLDOWN_TIME = 10 * 60 * 1000; // 동일 플랫폼 10분 중복 방지
    
    const lastClickTime = localStorage.getItem(CLICK_KEY);
    const currentTime = new Date().getTime();

    // 10분 이내 재클릭이면 카운트 요청은 생략 (링크 이동은 정상 수행)
    if (lastClickTime && (currentTime - lastClickTime < COOLDOWN_TIME)) {
        return; 
    }

    try {
        if (window.supabaseClient) {
            const { error } = await window.supabaseClient.rpc('increment_platform_view', { platform_id: platformId });
            if (!error) {
                localStorage.setItem(CLICK_KEY, currentTime);
            } else {
                console.error('플랫폼 클릭 수 증가 실패:', error);
            }
        }
    } catch (error) {
        console.error('플랫폼 클릭 통신 오류:', error);
    }
}

// ==========================================
// 6. 애니메이션 일시정지 제어
// ==========================================
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
        const canvas = document.getElementById('snow-canvas');
        if (canvas && typeof initWeatherSystem === 'function') {
            if (!currentAnimationId) {
                initWeatherSystem();
            }
        }
    }
};

// ==========================================
// 7. 통합 페이지 초기화 (DOMContentLoaded)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // 1. 테마 로드
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

    if (themeBtn) {
        themeBtn.onclick = toggleTheme;
    }

    // 2. 언어 선택 초기화
    const langSelect = document.getElementById('langSelect');
    if (langSelect) {
        langSelect.addEventListener('change', (e) => {
            changeLanguage(e.target.value);
        });

        const savedLang = localStorage.getItem('preferred_lang') || 'ko';
        langSelect.value = savedLang;
        changeLanguage(savedLang);
    }

    // 3. 기능 실행
    updateLiveStatuses();
    setupWeatherToggle();
    initWeatherSystem();
    trackSiteVisit();

    // 4. GA4 링크 클릭 이벤트 바인딩
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