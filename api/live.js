// api/live.js

export default async function handler(req, res) {
    // 캐시 설정 (API 호출 제한 방지를 위해 1분간 결과 캐싱)
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');

    const status = {
        chzzk: false,
        twitch: false,
        youtube: false
    };

    try {
        // 1. 치지직 (Chzzk) 라이브 확인
        if (process.env.CHZZK_CHANNEL_ID) {
            const chzzkRes = await fetch(
                `https://api.chzzk.naver.com/service/v1/channels/${process.env.CHZZK_CHANNEL_ID}`,
                { headers: { 'User-Agent': 'Mozilla/5.0' } }
            );
            if (chzzkRes.ok) {
                const chzzkData = await chzzkRes.json();
                const content = chzzkData?.content;
                status.chzzk = content?.openLive === true || content?.status === 'OPEN';
            }
        }

        // 2. 트위치 (Twitch) 라이브 확인
        if (process.env.TWITCH_CLIENT_ID && process.env.TWITCH_CLIENT_SECRET && process.env.TWITCH_BROADCASTER_ID) {
            // OAuth 토큰 발급
            const tokenRes = await fetch(
                `https://id.twitch.tv/oauth2/token?client_id=${process.env.TWITCH_CLIENT_ID}&client_secret=${process.env.TWITCH_CLIENT_SECRET}&grant_type=client_credentials`,
                { method: 'POST' }
            );
            const tokenData = await tokenRes.json();

            if (tokenData.access_token) {
                const twitchRes = await fetch(
                    `https://api.twitch.tv/helix/streams?user_id=${process.env.TWITCH_BROADCASTER_ID}`,
                    {
                        headers: {
                            'Client-ID': process.env.TWITCH_CLIENT_ID,
                            'Authorization': `Bearer ${tokenData.access_token}`
                        }
                    }
                );
                if (twitchRes.ok) {
                    const twitchData = await twitchRes.json();
                    status.twitch = (twitchData?.data?.length ?? 0) > 0;
                }
            }
        }

        // 3. 유튜브 (YouTube) 라이브 확인
        if (process.env.YOUTUBE_API_KEY && process.env.YOUTUBE_CHANNEL_ID) {
            const ytRes = await fetch(
                `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${process.env.YOUTUBE_CHANNEL_ID}&type=video&eventType=live&key=${process.env.YOUTUBE_API_KEY}`
            );
            if (ytRes.ok) {
                const ytData = await ytRes.json();
                status.youtube = (ytData?.items?.length ?? 0) > 0;
            }
        }

        return res.status(200).json({ success: true, status });
    } catch (error) {
        console.error("Live Check Error:", error);
        return res.status(500).json({ success: false, status, error: error.message });
    }
}