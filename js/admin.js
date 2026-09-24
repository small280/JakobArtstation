// ==========================================
// Admin Dashboard Script (admin.js)
// ==========================================

const SUPABASE_URL = 'https://mojcgizzrwsatgsvboib.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_vXeVkey0aLcuVxeLws219A_YPEz_Ze6';

let supabaseClient = null;
try {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} catch (e) {
    console.error('Supabase 초기화 오류:', e);
}

// 플랫폼 이름별 아이콘 파일 매핑
const iconMap = {
    'X (Realism)': 'x.svg',
    'X (Casual)': 'x.svg',
    'Instagram': 'instagram.svg',
    'Pixiv': 'pixiv.svg',
    'Cara': 'cara.svg',
    'Bluesky': 'bluesky.svg',
    'ArtStation': 'artstation.svg',
    'Threads': 'threads.svg',
    'Reddit': 'reddit.svg',
    'YouTube': 'youtube.svg',
    'Chzzk': 'chzzk.svg',
    'Twitch': 'twitch.svg',
    'VGen': 'vgen.svg',
    'Pixiv Request': 'pixiv.svg',
    'Crepe': 'crepe.svg',
    'ARTMUG': 'artmug.svg',
    'KakaoTalk': 'kakaotalk.svg',
    'Discord': 'discord.svg'
};

async function loadAdminData() {
    // 1. 초기 렌더링 시에도 Today 높은순(내림차순) 정렬이 반영되도록 처리
    const initialList = Object.keys(iconMap).map(name => ({
        platform_name: name,
        today_views: 0,
        total_views: 0
    })).sort((a, b) => b.today_views - a.today_views);

    renderPlatforms(initialList);

    if (!supabaseClient) return;

    const { data: platforms, error } = await supabaseClient
        .from('platform_views')
        .select('*');

    if (error) {
        console.error('데이터를 불러오지 못했습니다:', error);
        return;
    }

    if (!platforms || platforms.length === 0) {
        console.warn('Supabase에 데이터가 없습니다.');
        return;
    }

    // 2. 'site_visit'(사이트 방문자 데이터)와 우측 SNS 플랫폼 데이터를 분리
    const siteVisitData = platforms.find(p => p.id === 'site_visit') || { today_views: 0, total_views: 0 };
    const snsPlatforms = platforms.filter(p => p.id !== 'site_visit');

    // 3. 좌측 카드에 사이트 방문자 수 독립 반영
    document.getElementById('total-today-views').textContent = (siteVisitData.today_views || 0).toLocaleString();
    document.getElementById('total-all-views').textContent = (siteVisitData.total_views || 0).toLocaleString();

    // 4. 데이터를 받아온 직후 기본적으로 'Today 높은순'으로 정렬
    snsPlatforms.sort((a, b) => {
        const todayA = a.today_views !== undefined ? a.today_views : (a.today || 0);
        const todayB = b.today_views !== undefined ? b.today_views : (b.today || 0);
        return todayB - todayA;
    });

    // 5. 우측 상세 리스트에 정렬된 SNS 플랫폼 렌더링
    renderPlatforms(snsPlatforms);

    // 6. 국가별 방문자 통계 데이터 불러오기
    loadCountryStats();
}

async function loadCountryStats() {
    // visitor_ips 테이블에서 country와 referrer 컬럼을 함께 조회
    const { data, error } = await supabaseClient
        .from('visitor_ips')
        .select('country, referrer');

    if (error) {
        console.error('국가 및 유입 통계 불러오기 실패:', error);
        return;
    }

    const countryCounts = {};
    const referrerCounts = {};

    data.forEach(row => {
        // 1. 국가 집계
        const c = row.country ? row.country.toUpperCase() : 'UNKNOWN';
        countryCounts[c] = (countryCounts[c] || 0) + 1;

        // 2. 유입경로 집계
        // 유입경로 집계 시 t.co 처리 예시
        let ref = row.referrer ? row.referrer.trim() : '';

        if (!ref || ref === '') {
            ref = '직접 접속 (Direct)';
        } else if (ref.includes('t.co')) {
            ref = 'Twitter / X';
        } else if (ref.includes('instagram.com')) {
            ref = 'Instagram';
        } // 필요한 플랫폼들을 이런 식으로 매핑해 줄 수 있습니다.
        referrerCounts[ref] = (referrerCounts[ref] || 0) + 1;
    });

    // --- 국가별 통계 렌더링 ---
    const sortedCountries = Object.entries(countryCounts).sort((a, b) => b[1] - a[1]);
    const countryContainer = document.getElementById('countryListContainer');
    countryContainer.innerHTML = '';

    if (sortedCountries.length === 0) {
        countryContainer.innerHTML = '<div style="text-align: center; color: var(--text-sub); font-size: 0.85rem; padding: 15px;">기록된 국가 데이터가 없습니다.</div>';
    } else {
        sortedCountries.forEach(([country, count]) => {
            const item = document.createElement('div');
            item.className = 'country-item';
            item.innerHTML = `
                <div class="country-name">
                    <i class="fa-solid fa-globe"></i> ${country}
                </div>
                <div class="country-count">${count.toLocaleString()}명</div>
            `;
            countryContainer.appendChild(item);
        });
    }

    // --- [추가] 유입 경로 통계 렌더링 ---
    const sortedReferrers = Object.entries(referrerCounts).sort((a, b) => b[1] - a[1]);
    const referrerContainer = document.getElementById('referrerListContainer');
    if (referrerContainer) {
        referrerContainer.innerHTML = '';

        if (sortedReferrers.length === 0) {
            referrerContainer.innerHTML = '<div style="text-align: center; color: var(--text-sub); font-size: 0.85rem; padding: 15px;">기록된 유입경로 데이터가 없습니다.</div>';
        } else {
            sortedReferrers.forEach(([ref, count]) => {
                const item = document.createElement('div');
                item.className = 'country-item';
                
                let linkHtml = '';
                if (ref.startsWith('http://') || ref.startsWith('https://')) {
                    try {
                        const urlObj = new URL(ref);
                        const displayRef = urlObj.hostname + (urlObj.pathname !== '/' ? urlObj.pathname : '');
                        linkHtml = `<a href="${ref}" target="_blank" title="${ref}" style="color: var(--text-main); text-decoration: none; display: flex; align-items: center; gap: 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"><i class="fa-solid fa-link" style="font-size: 0.8rem; color: var(--text-sub);"></i> <span style="overflow: hidden; text-overflow: ellipsis;">${displayRef}</span></a>`;
                    } catch (e) {
                        linkHtml = `<span>${ref}</span>`;
                    }
                } else {
                    linkHtml = `<span>${ref}</span>`;
                }

                item.innerHTML = `
                    <div class="country-name" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 200px;">
                        ${linkHtml}
                    </div>
                    <div class="country-count">${count.toLocaleString()}회</div>
                `;
                referrerContainer.appendChild(item);
            });
        }
    }
}

function renderPlatforms(platforms) {
    const container = document.getElementById('snsListContainer');
    container.innerHTML = ''; 

    platforms.forEach(p => {
        const name = p.platform_name || p.name || 'Unknown';
        const today = p.today_views !== undefined ? p.today_views : (p.today || 0);
        const total = p.total_views !== undefined ? p.total_views : (p.total || 0);

        const iconFile = iconMap[name] || 'default.svg';

        const item = document.createElement('div');
        item.className = 'sns-item';
        item.setAttribute('data-name', name);
        item.setAttribute('data-today', today);
        item.setAttribute('data-total', total);

        item.innerHTML = `
            <div class="sns-info-left">
                <div class="sns-icon-box"><img src="img/icons/${iconFile}" alt="${name}"></div>
                <div class="sns-name">${name}</div>
            </div>
            <div class="sns-counts-right">
                <span class="count-num today">${today.toLocaleString()}</span>
                <span class="count-num">${total.toLocaleString()}</span>
            </div>
        `;
        container.appendChild(item);
    });
}

// 드롭다운 및 정렬 관련 제어 함수들
function toggleSortMenu() {
    const menu = document.getElementById('sortMenu');
    menu.classList.toggle('active');
}

window.addEventListener('click', function(e) {
    const wrapper = document.querySelector('.sort-dropdown-wrapper');
    if (wrapper && !wrapper.contains(e.target)) {
        const menu = document.getElementById('sortMenu');
        if (menu) menu.classList.remove('active');
    }
});

function setSort(criteria) {
    const container = document.getElementById('snsListContainer');
    if (!container) return;
    
    const itemsArray = Array.from(container.getElementsByClassName('sns-item'));
    const labelSpan = document.getElementById('currentSortLabel');
    
    const labels = {
        'today': 'Today 높은순',
        'total': 'Total 높은순',
        'name': '이름순'
    };
    if (labelSpan) labelSpan.textContent = labels[criteria];
    
    const menu = document.getElementById('sortMenu');
    if (menu) menu.classList.remove('active');

    itemsArray.sort((a, b) => {
        if (criteria === 'today') {
            return parseInt(b.dataset.today) - parseInt(a.dataset.today);
        } else if (criteria === 'total') {
            return parseInt(b.dataset.total) - parseInt(a.dataset.total);
        } else if (criteria === 'name') {
            return a.dataset.name.localeCompare(b.dataset.name);
        } else {
            return 0; 
        }
    });

    itemsArray.forEach(item => container.appendChild(item));
}

// 페이지 로드 시 데이터 불러오기 실행
window.addEventListener('DOMContentLoaded', loadAdminData);