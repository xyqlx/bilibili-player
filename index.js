const playwright = require('playwright');
const commandLineArgs = require('command-line-args')
const config = require('./config.json');

optionDefinitions = [
    {
        name: 'playlist',
        type: String,
        multiple: true,
        defaultOption: true
    }, {
        name: 'search',
        alias: 's',
        type: String,
        multiple: true
    }, {
        name: 'live',
        alias: 'l',
        type: String
    }
]
const options = commandLineArgs(optionDefinitions)

function extract_time(text) {
    const match = text.match(/((?<hour>\d+):)?(?<minute>\d+):(?<second>\d+)/);
    if (match) {
        const groups = match.groups;
        return parseInt(groups.hour ?? '0') * 3600 + parseInt(groups.minute) * 60 + parseInt(groups.second);
    }
    return 0;
};
(async () => {
    const browserType = playwright.firefox;
    const launchConfig = {
        headless: true
    };
    if (config.proxy) { 
        launchConfig.proxy = config.proxy;
    }
    const browser = await browserType.launch(launchConfig);
    const context = await browser.newContext();
    const page = await context.newPage();
    if (options.search && options.search.length > 0) { //
        await page.goto(`https://search.bilibili.com/all?keyword=${
            options.search.join('%20')
        }`);
        await page.waitForSelector('.video-item > a', {timeout: 10000});
        const collections = await page.$$('.video-item > a');
        for await(const item of collections) {
            const href = await item.getAttribute('href');
            const id = href.match(/[AaBb][Vv]\w+/)[0];
            const title = await item.getAttribute('title');
            process.stdout.write(`${title}\n${id}\n`)
        }
    


} else if (options.live) {
    // 这个页面好奇怪，总是加载不出来
    // 甚至在页面上用querySelector都搜索不出来，太神必了
    // iframe的话……不会用
    // 不过直播这块应该有不少其它代码可以参考……
    const liveId = options.live.match(/(?=https:\/\/live\.bilibili\.com\/)?\d+/)[0];
    await page.goto(`https://live.bilibili.com/${liveId}`, {waitUntil: 'load', timeout: 0});
    process.stdout.write(`直播间加载中\n`);
    let title = '';
    let currentTime = 0;
    await page.waitForTimeout(5000);
    const iframes = await page.$$('iframe');
    if(iframes.length !== 0){
        console.log(iframes.length);
        for(const iframe of iframes){
            let url = await iframe.getAttribute('src');
            // 怎么还有奇奇怪怪的url
            if(url.startsWith('//')){
                url = `https:${url}`;
            }
            if(url.match(/live/)){
                process.stdout.write(`重定向至${url}\n`)
                page.goto(url, {waitUntil: 'load', timeout: 0});
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
                    await page.dispatchEvent('#live-player', 'mousemove', options = {
                        timeout: 0
                    });
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
                currentTimeText = await page.innerText('.tip-wrap .text', {timeout: 10000});
                currentTime = extract_time(currentTimeText);
            } catch (error) { // 加载中
            }
            if (currentTime > 0) {
                await page.waitForTimeout(1000);
                process.stdout.write(`${currentTimeText}\r`);
            }
        }
    }
} else {
    const videoList = options.playlist.map(x => x.match(/[AaBb][Vv]\w+/)[0]).filter(x => x);
    for await(const videoId of videoList) { // 这里应该监听事件/request/文字变化更稳一些可惜xyq不知道怎么做
        await page.goto(`https://www.bilibili.com/video/${videoId}`);
        await page.waitForSelector('span.tit', {timeout: 10000});
        const titleSpan = await page.$('span.tit');
        const title = await titleSpan.innerText();
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
    }
}await browser.close();})();
