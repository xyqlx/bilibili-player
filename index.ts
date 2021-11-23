const playwright = require('playwright');
const commandLineArgs = require('command-line-args')
import * as readline from 'readline';
import { stdin as input, stdout as output, stdout } from 'process';
import { open_live, play_videos, search_videos, show_up_videos } from './bilibili_page.js'
const fs = require('fs');

let config: {proxy?: {}} = {};
try {
    const rawdata = fs.readFileSync('config.json');
    config = JSON.parse(rawdata);
}
catch { }

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
        name: 'debug',
        alias: 'd',
        type: Boolean,
    }, {
        name: 'live',
        alias: 'l',
        type: String
    }
]
const options = commandLineArgs(optionDefinitions);
function matchCommand(pattern: string): (text: string)=>boolean {
    return function (command: string): boolean {
        const index = pattern.indexOf(command);
        return index === 0;
    }
}
(async () => {
    const browserType = playwright.firefox;
    let launchConfig: {
        headless: boolean,
        proxy?: {}
    } = {
        headless: !options.debug,
    };
    if (config.proxy) {
        launchConfig.proxy = config.proxy;
    }
    const browser = await browserType.launch(launchConfig);
    const context = await browser.newContext();
    const page = await context.newPage();
    let searchList: { id: string, title: string }[] = [];
    if (options.search && options.search.length > 0) { //
        searchList = await search_videos(page, options.search);
        searchList.forEach((video, index) => {
            process.stdout.write(`${index} ${video.title}\n`);
        })
    } else if (options.live) {
        const liveId = options.live.match(/(?=https:\/\/live\.bilibili\.com\/)?\d+/)[0];
        await open_live(page, liveId);
    } else if (options.playlist?.length ?? 0 > 0) {
        const videoList = options.playlist.filter((x: string) => x).map((x: string) => x!.match(/[AaBb][Vv]\w+/)).filter((x: RegExpMatchArray) => x && x.length > 0).map((x: RegExpMatchArray) => x[0])
        await play_videos(page, videoList);
    } else { // 进入命令模式
        output.write('COMMAND MODE\n');
        const rl = readline.createInterface({ input, output });
        while (true) {
            const inputText: string = await new Promise(resolve => {
                rl.question('', resolve)
            })
            const splits = inputText.split(' ');
            const command = splits[0];
            splits.splice(0, 1);
            // play
            if (matchCommand('play')(command)) {
                if (splits.length == 0) {
                    await play_videos(page, searchList.map(x => x.id));
                } else if (splits[0].match(/^\d{1,2}$/)) {
                    await play_videos(page, [searchList[parseInt(splits[0])].id]);
                } else {
                    await play_videos(page, splits)
                }
            }
            // search
            else if (matchCommand('search')(command)) {
                searchList = await search_videos(page, splits);
                searchList.forEach((video, index) => {
                    process.stdout.write(`${video.id} ${index} ${video.title}\n`);
                })
            }
            // live
            else if (matchCommand('live')(command)) {
                await open_live(page, splits[0]);
            }
            // help
            else if (matchCommand('help')(command)) {
                process.stdout.write('see https://github.com/xyqlx/bilibili-player\nplay [bvId] | search [keywords] | live [liveId] | most [uid] | new [uid] | help | quit\n');
            }
            // quit
            else if (matchCommand('quit')(command)) {
                process.stdout.write('quit...\n');
                rl.close();
                break;
            }
            // most
            else if (matchCommand('most')(command)) {
                searchList = await show_up_videos(page, splits[0], false);
                searchList.forEach((video, index) => {
                    process.stdout.write(`${video.id} ${index} ${video.title}\n`);
                })
                break;
            }
            // new
            else if (matchCommand('new')(command)) {
                searchList = await show_up_videos(page, splits[0], true);
                searchList.forEach((video, index) => {
                    process.stdout.write(`${video.id} ${index} ${video.title}\n`);
                })
            }
            else {
                process.stdout.write('unrecognized command.\n')
            }
        }
    }
    await browser.close();
})();
