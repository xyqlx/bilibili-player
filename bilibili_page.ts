import { Page } from 'playwright';
/**
 * 解析视频时长为秒数
 * @param text 需要解析的时间，例如3:06
 * @returns 秒数
 */
export function extract_time(text: string): number {
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
 * @param page playwright页面
 * @param keywords 搜索关键词
 */
export async function search_videos(page: Page, keywords: string[]): Promise<{ id: string, title: string }[]> { // TODO 返回值完全可以写成视频的信息
    await page.goto(`https://search.bilibili.com/all?keyword=${keywords.join('%20')
        }`);
    await page.waitForSelector('.video-item > a', { timeout: 10000 });
    const collections = await page.$$('.video-item > a');
    const result: { id: string, title: string }[] = [];
    for await (const item of collections) {
        const href = await item.getAttribute('href');
        if (href) {
            const match = href.match(/[AaBb][Vv]\w+/);
            if (match) {
                const id = match[0];
                const title = await item.getAttribute('title') ?? '';
                result.push({ id: id, title: title });
            }
        }
    }
    return result;
};
/**
 * 进入直播间
 * @param page playwright页面
 * @param liveId 直播间id
 */
export async function open_live(page: Page, liveId: string): Promise<void> {
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
            if (url) {
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
                title = await page.innerText('div.live-title div.text', { timeout: 10000 });
                if (title !== '') {
                    process.stdout.write(`进入直播间：${title}\n`);
                    await page.waitForSelector('#live-player', { timeout: 10000 });
                    await page.dispatchEvent('#live-player', 'mousemove', undefined, { timeout: 0 });
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
                let currentTimeText = await page.innerText('.tip-wrap .text', { timeout: 10000 });
                currentTime = extract_time(currentTimeText);
                if (currentTime > 0) {
                    await page.waitForTimeout(1000);
                    process.stdout.write(`${currentTimeText}\r`);
                }
            } catch (error) { // 加载中
            }
        }

    }
};
/**
 * 播放视频
 * @param page playwright页面
 * @param videoList 视频Id列表
 */
export async function play_videos(page: Page, videoList: string[]): Promise<void> {
    for await (const videoId of videoList) { // 这里应该监听事件/request/文字变化更稳一些可惜xyq不知道怎么做
        await page.goto(`https://www.bilibili.com/video/${videoId}`);
        const title = (await page.title()).replace(/\s*_哔哩哔哩_bilibili/, '');
        if (title.match(/出错啦/)) {
            process.stdout.write(`出错啦\n`);
            return;
        }
        process.stdout.write(`正在播放：${title} ${videoId}\n`);
        // 关闭可能的静音（很多时候都会失效）
        try {
            const volume = await page.innerText('div.bilibili-player-video-volume-num', { timeout: 5000 });
            console.log(`音量: ${volume}`);
            if (volume === '0') {
                const volumeButtons = await page.$$('button.bilibili-player-iconfont bilibili-player-iconfont-volume-min');
                if(volumeButtons.length === 0) {
                    process.stdout.write('未找到音量按钮，自动退出\n');
                    continue;
                }else{
                    await volumeButtons[0].click();
                    const newVolume = await page.innerText('div.bilibili-player-video-volume-num', { timeout: 5000 });
                    console.log(`音量: ${newVolume}`);
                }
            }
        }
        catch (err) { }
        // 显示UP信息
        const upUrlCollection = await page.$$('.up-card>a');
        const upUrls = await Promise.all(upUrlCollection.map(async x => await x.getAttribute('href')));
        let upIds = upUrls.filter(x => x).map(x => (x!.match(/\d+/) ?? ['0'])[0]);
        const upNameCollection = await page.$$('.up-card>.avatar-name__container>a');
        let upNames = await Promise.all(upNameCollection.map(async x => await x.innerText()));
        let upinfo = upIds.map((v, i) => `${upNames[i]}(${v})`).join(', ');
        // 试着从元信息里找UP信息
        if (upinfo === '') {
            for (const meta of await page.$$('meta')) {
                const metaName = await meta.getAttribute('name');
                if (metaName === 'author') {
                    upNames = [await meta.getAttribute('content') ?? ''];
                    for (const a of await page.$$('a')) {
                        if (upNames[0] === await a.innerText()) {
                            const match = (await a.getAttribute('href'))?.match(/\d+/);
                            if (match) {
                                upIds = [match[0]];
                                break;
                            }
                        }
                    }
                    break;
                }
            }
            upinfo = upIds.map((v, i) => `${upNames[i]}(${v})`).join(', ');
        }
        process.stdout.write(`UP主：${upinfo}\n`);
        // 输出时间
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
                process.stdout.write(`当前part播放结束，将播放下一part或概率自动连播\r\n`);
                break;
            }
            // console.log(`${currentTimeText}/${fullTimeText}`);
            process.stdout.write(`${currentTimeText}/${fullTimeText}\r`);
            await page.waitForTimeout(1000);
        }
    }
};
/**
 * 获得UP空间的视频列表
 * @param page playwright.Page对象
 * @param upId up的UID号
 * @param latest 是否选择最近/热门视频
 * @returns 视频的id和标题列表
 */
export async function show_up_videos(page: Page, upId: string, latest: boolean): Promise<{ id: string, title: string }[]> {
    await page.goto(`https://space.bilibili.com/${upId}/video`);
    if (latest) {
        const collections = await page.$$('.cube-list > li > a.title');
        const result: { id: string, title: string }[] = [];
        for await (const item of collections) {
            const href = await item.getAttribute('href');
            if (href) {
                const match = href.match(/[AaBb][Vv]\w+/);
                if (match) {
                    const id = match[0];
                    const title = await item.getAttribute('title') ?? '';
                    result.push({ id: id, title: title });
                }
            }
        }
        return result;
    } else {
        await page.click('ul.be-tab-inner>li:nth-child(2)>input');
        // await page.waitForSelector('ul.be-tab-inner>li:nth-child(2).is-active');
        const response = await page.waitForResponse(p => p.url().includes('search') && p.status() === 200);
        const videos = JSON.parse(await response.text())['data']['list']['vlist'];
        return videos.map((x: any) => ({ id: x['bvid'], title: x['title'] }));
    }
}
