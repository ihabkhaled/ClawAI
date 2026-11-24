#!/usr/bin/env node
// Live & Videos QA (ADR-221 batch 6, 2026-11-25): finds channels that are LIVE right now on each platform through their public listing APIs, so the
// sweep can test live server pull on every platform. Prints a JSON array of {platform, url}.
//   node --env-file=.env scripts/qa/live-discover-channels.mjs  (LIVE_TWITCH_CLIENT_ID for Twitch)
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36';
const out = [];
const add = (platform, url) => url && out.push({ platform, url });
async function json(url, init = {}) {
  const res = await fetch(url, {
    ...init,
    headers: { 'user-agent': UA, accept: 'application/json', ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}
const tries = {
  async twitch() {
    const body = JSON.stringify({
      query: 'query{streams(first:3){edges{node{broadcaster{login}}}}}',
    });
    const data = await json('https://gql.twitch.tv/gql', {
      method: 'POST',
      body,
      headers: {
        'client-id': process.env.LIVE_TWITCH_CLIENT_ID ?? '',
        'content-type': 'application/json',
      },
    });
    for (const edge of data.data.streams.edges.slice(0, 2))
      add('TWITCH', `https://www.twitch.tv/${edge.node.broadcaster.login}`);
  },
  async kick() {
    const data = await json('https://kick.com/stream/livestreams/en?page=1&limit=3&sort=desc');
    for (const item of (data.data ?? []).slice(0, 2))
      add('KICK', `https://kick.com/${item.channel.slug}`);
  },
  async dailymotion() {
    const data = await json(
      'https://api.dailymotion.com/videos?flags=live_onair&limit=3&fields=id',
    );
    for (const item of data.list.slice(0, 2))
      add('DAILYMOTION', `https://www.dailymotion.com/video/${item.id}`);
  },
  async bilibili() {
    const data = await json(
      'https://api.live.bilibili.com/room/v1/area/getRoomList?parent_area_id=0&page=1&page_size=3&sort_type=online',
    );
    for (const item of data.data.slice(0, 2))
      add('BILIBILI', `https://live.bilibili.com/${item.roomid}`);
  },
  async chzzk() {
    const data = await json('https://api.chzzk.naver.com/service/v1/lives?size=3&sortType=POPULAR');
    for (const item of data.content.data.slice(0, 2))
      add('CHZZK', `https://chzzk.naver.com/live/${item.channel.channelId}`);
  },
  async soop() {
    const data = await json(
      'https://live.sooplive.co.kr/api/main_broad_list_api.php?selectType=action&orderType=view_cnt&pageNo=1&lang=ko_KR',
    );
    for (const item of data.broad.slice(0, 2))
      add('SOOP', `https://play.sooplive.co.kr/${item.user_id}`);
  },
  async picarto() {
    const data = await json('https://api.picarto.tv/api/v1/online?adult=false&gaming=true');
    for (const item of data.slice(0, 2)) add('PICARTO', `https://picarto.tv/${item.name}`);
  },
  async dlive() {
    const body = JSON.stringify({
      query: 'query{livestreams(input:{first:3,order:TRENDING}){list{creator{username}}}}',
    });
    const data = await json('https://graphigo.prd.dlive.tv/', {
      method: 'POST',
      body,
      headers: { 'content-type': 'application/json' },
    });
    for (const item of data.data.livestreams.list.slice(0, 2))
      add('DLIVE', `https://dlive.tv/${item.creator.username}`);
  },
  async showroom() {
    const data = await json('https://www.showroom-live.com/api/live/onlives');
    const lives = data.onlives.flatMap((genre) => genre.lives).filter((live) => live.room_url_key);
    for (const live of lives.slice(0, 2))
      add('SHOWROOM', `https://www.showroom-live.com/r/${live.room_url_key}`);
  },
  async huya() {
    const data = await json(
      'https://www.huya.com/cache.php?m=LiveList&do=getLiveListByPage&tagAll=0&page=1',
    );
    for (const item of data.data.datas.slice(0, 2))
      add('HUYA', `https://www.huya.com/${item.profileRoom}`);
  },
  async douyu() {
    const data = await json('https://www.douyu.com/japi/weblist/apinc/allpage/6/1');
    for (const item of data.data.rl.slice(0, 2)) add('DOUYU', `https://www.douyu.com/${item.rid}`);
  },
  async rumble() {
    const html = await (
      await fetch('https://rumble.com/live-videos', { headers: { 'user-agent': UA } })
    ).text();
    const links = [...html.matchAll(/href="(\/v[a-z0-9]+-[^"]+\.html)/gu)].map((m) => m[1]);
    for (const link of [...new Set(links)].slice(0, 2)) add('RUMBLE', `https://rumble.com${link}`);
  },
  async twitcasting() {
    const html = await (
      await fetch('https://twitcasting.tv/', { headers: { 'user-agent': UA } })
    ).text();
    const users = [...html.matchAll(/href="\/([A-Za-z0-9_:]{3,30})"\s/gu)].map((m) => m[1]);
    for (const user of [...new Set(users)].slice(0, 2))
      add('TWITCASTING', `https://twitcasting.tv/${user}`);
  },
  async nimo() {
    const data = await json('https://www.nimo.tv/api/lives?pageNum=1&pageSize=3');
    for (const item of (data.data?.result?.liveRoomViewList ?? []).slice(0, 2))
      add('NIMO', `https://www.nimo.tv/${item.alise}`);
  },
};
for (const [name, run] of Object.entries(tries)) {
  try {
    await run();
  } catch (error) {
    console.error(`discover ${name}: ${String(error).slice(0, 120)}`);
  }
}
console.log(JSON.stringify(out));
