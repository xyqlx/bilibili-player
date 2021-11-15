const playwright = require('playwright');
const commandLineArgs = require('command-line-args')
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'process';
const config = require('./config.json');
import {open_live, play_videos, search_videos} from './bilibili_page.js'


const optionDefinitions = [
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
const options = commandLineArgs(optionDefinitions);
(async () => {
    const browserType = playwright.firefox;
    const launchConfig: {headless: boolean, proxy?: string} = {
        headless: true
    };
    if (config.proxy) {
        launchConfig.proxy = config.proxy;
    }
    const browser = await browserType.launch(launchConfig);
    const context = await browser.newContext();
    const page = await context.newPage();
    if (options.search && options.search.length > 0) { //
        await search_videos(page, options.search);
    } else if (options.live) {
        const liveId = options.live.match(/(?=https:\/\/live\.bilibili\.com\/)?\d+/)[0];
        await open_live(page, liveId);
    } else if (options.playlist?.length ?? 0 > 0) {
        const videoList = options.playlist
            .filter((x:string) => x)
            .map((x: string) => x!.match(/[AaBb][Vv]\w+/))
            .filter((x:RegExpMatchArray) => x && x.length > 0)
            .map((x: RegExpMatchArray) =>x[0])
        await play_videos(page, videoList);
    }else{
        // 进入命令模式
        output.write('enter command mode.\n');
        const rl = createInterface({input, output});
        rl.on('line', async (input: string) =>{
            const splits = input.split(' ');
            const command = splits[0];
            const args = splits.splice(0, 1);
            if(command.startsWith('p')){
                await play_videos(page, args)
            }else if(command.startsWith('s')){
                await search_videos(page, args);
            }else if(command.startsWith('l')){
                await open_live(page, args[0]);
            }else if(command.startsWith('q')){
                if(splits[0] === "quit"){
                    rl.close();
                }
            }
        });
    }
    await browser.close();
})();
