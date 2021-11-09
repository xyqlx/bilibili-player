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
    
} else {
    const videoList = options.playlist.map(x => x.match(/[AaBb][Vv]\w+/)[0]).filter(x => x);
    for await(const videoId of videoList) { // 这里应该监听事件/request/文字变化更稳一些可惜xyq不知道怎么做
        await page.goto(`https://www.bilibili.com/video/${videoId}`);
        await page.waitForSelector('span.tit', {timeout: 10000});
        const titleSpan = await page.$('span.tit');
        const title = await titleSpan.innerText();
        console.log(`正在播放：${title}`);
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
