import playwright = require('playwright');
/**
 * 解析视频时长为秒数
 * @param {string} text 需要解析的时间，例如3:06
 * @returns 秒数
 */
export function extract_time(text : string) {
    const match = text.match(/((?<hour>\d+):)?(?<minute>\d+):(?<second>\d+)/);
    if (match) {
        const groups = match.groups;
        if (groups) {
            return parseInt(groups.hour ?? '0') * 3600 + parseInt(groups.minute) * 60 + parseInt(groups.second);
        }
    }
    return 0;
};
/**
 * 按关键词搜索视频
 * @param {playwright.Page} page playwright页面
 * @param {string[]} keywords 搜索关键词
 */
export async function search_videos(page : playwright.Page, keywords : string[]) { // TODO 返回值完全可以写成视频的信息
    await page.goto(`https://search.bilibili.com/all?keyword=${
        keywords.join('%20')
    }`);
    await page.waitForSelector('.video-item > a', {timeout: 10000});
    const collections = await page.$$('.video-item > a');
    const result: {id: string, title: string}[] = [];
    for await(const item of collections) {
        const href = await item.getAttribute('href');
        if (href) {
            const match = href.match(/[AaBb][Vv]\w+/);
            if (match) {
                const id = match[0];
                const title = await item.getAttribute('title') ?? '';
                result.push({id: id, title: title});
            }
        }
    }
    return result;
};/**
 * 进入直播间
 * @param {playwright.Page} page playwright页面
 * @param {string} liveId 直播间id
 */export async function open_live(page : playwright.Page, liveId : string) {
// 这个页面好奇怪，总是加载不出来
// 甚至在页面上用querySelector都搜索不出来，太神必了
// iframe的话……不会用
// 不过直播这块应该有不少其它代码可以参考……
await page.goto(`https://live.bilibili.com/${liveId}`, {
    waitUntil: 'load',
    timeout: 0
});
process.stdout.write(`直播间加载中\n`);
let title = '';
let currentTime = 0;
await page.waitForTimeout(5000);
const iframes = await page.$$('iframe');
if (iframes.length !== 0) {
    console.log(iframes.length);
    for (const iframe of iframes) {
        let url = await iframe.getAttribute('src');
        if(url){
            // 怎么还有奇奇怪怪的url
            if (url.startsWith('//')) {
                url = `https:${url}`;
            }
            if (url.match(/live/)) {
                process.stdout.write(`重定向至${url}\n`)
                page.goto(url, {
                    waitUntil: 'load',
                    timeout: 0
                });
            }
        }
    }
}
while (true) {
    if (title === '') {
        try {
            title = await page.innerText('div.live-title div.text', {timeout: 10000});
            if (title !== '') {
                process.stdout.write(`进入直播间：${title}\n`);
                await page.waitForSelector('#live-player', {timeout: 10000});
                await page.dispatchEvent('#live-player', 'mousemove', undefined, {timeout: 0});
                await page.hover('.volume');
                const volume = await page.innerText('.volume-control .number');
                process.stdout.write(`音量：${volume}\n`);
                if (volume === "0") {
                    process.stdout.write(`自动打开声音\n`);
                    await page.click('.volume');
                }
            }
        } catch (error) { // 加载中
        }
        try {
            let currentTimeText = await page.innerText('.tip-wrap .text', {timeout: 10000});
            currentTime = extract_time(currentTimeText);
            if (currentTime > 0) {
                await page.waitForTimeout(1000);
                process.stdout.write(`${currentTimeText}\r`);
            }
        } catch (error) { // 加载中
        }
    }

}};/**
 * 播放视频
 * @param {playwright.Page} page playwright页面
 * @param {string[]} videoList 视频Id列表
 */export async function play_videos(page : playwright.Page, videoList : string[]): Promise < void > {
for await(const videoId of videoList) { // 这里应该监听事件/request/文字变化更稳一些可惜xyq不知道怎么做
    await page.goto(`https://www.bilibili.com/video/${videoId}`);
    await page.waitForSelector('span.tit', {timeout: 10000});
    const titleSpan = await page.$('span.tit');
    const title = await titleSpan?.innerText();
    process.stdout.write(`正在播放：${title}\n`);
    let fullTime = 0;
    let fullTimeText = '';
    while (fullTime === 0) {
        await page.hover('.player');
        await page.waitForSelector('span.bilibili-player-video-time-total', {
            timeout: 10000,
            state: 'visible'
        });
        fullTimeText = await page.innerText('.bilibili-player-video-time-total');
        fullTime = extract_time(fullTimeText);
    }
    while (true) {
        await page.hover('.player');
        await page.waitForSelector('span.bilibili-player-video-time-now', {
            timeout: 10000,
            state: 'visible'
        });
        const currentTimeText = await page.innerText('span.bilibili-player-video-time-now');
        const currentTime = extract_time(currentTimeText);
        if (currentTime == fullTime) {
            break;
        }
        // console.log(`${currentTimeText}/${fullTimeText}`);
        process.stdout.write(`${currentTimeText}/${fullTimeText}\r`);
        await page.waitForTimeout(1000);
    }
}};
