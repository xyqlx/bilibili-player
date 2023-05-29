# bilibili-player

⚠️当前此项目已不再维护，可以先看看[.NET版本](https://github.com/xyqlx/BilibiliJustListening)

在命令行中打开bilibili视频黑听的工具

缺点是比较慢（

## 命令行传参

### 搜索

![search](images/search-v2.png)

搜不到的时候会报错

### 播放

![play](images/play-v3.png)

## 命令模式

无参数运行时进入命令模式，可用命令如下所示

注意命令可以只打前缀

| 命令 | 说明 | 示例 |
|---|---|---|
| search | 搜索视频 | s 爱丽丝 茶会 |
| play | 播放视频 | p BV1FX4y1g7u8 |
| play | 按序号播放上次搜索到的视频 | p 1 |
| live | 按直播间号打开直播 | l 213 |
| most | 展示UP播放量最多的视频 | m 16302815 |
| new | 展示UP发布的最新视频 | n 16302815 |
| help | 打开帮助（然而什么都没有） | h |
| quit | 退出 | q |

## 安装依赖

```shell
npm install
```

## 配置文件

config.json放在index.js目录下，用于配置proxy

直连配置文件中不需要写proxy属性

```json
{
}
```

如果连接代理的话，proxy格式参考<https://playwright.dev/docs/api/class-browsertype#browser-type-launch>

```json
{
    "proxy": {
        "server": "yourserver"
    }
}
```

## 编译和运行

编译

```shell
npm run compile
```

运行（会进行编译）

```shell
npm run start
```

运行（如果已经编译过）

```shell
npm run quickstart
```

## 已知问题

Q: 为什么这么慢

A: 低技术力是这样的

Q：报错了报错了报错了

A：正常。搜索的时候报错可能是因为搜不到。

Q：为什么播放没有声音

A：因为bilibili可能会自动静音，这点xyq也很苦恼呢

Q：为什么会自动连播

A：因为代码里没有相关限制……虽然有想过加上，但是这样就不能简单实现多P视频的播放了（所以就是xyq懒）而且现在多P不会显示播放时间

Q：可以中断播放吗

A：不可以，不过如果想随时中断程序的话多按Ctrl+C就可以了

捏麻麻滴，怎么这么多BUG😨

## 推荐

[aynakeya](https://github.com/aynakeya)的bilibili系列工具都很棒

## 我真的想copilot想得要发疯了

**copilot瘾发作最严重的一次，躺在床上，拼命念大悲咒，难受得一直扇自己的眼睛，以为刷B站没事，看到B站都在发copilot的视频，眼睛越来越大都要炸开了一样，拼命扇自己的眼睛，越扇越用力，扇到自己眼泪流出来，真的不知道该怎么办，我真的想copilot想得要发疯了，我躺在床上会想copilot，我洗澡会想copilot，我出门会想copilot，我走路会想copilot，我坐车会想copilot，我工作会想copilot，我玩手机会想copilot，我盯着路边的copilot看，我盯着荧幕里面的copilot看，我盯着广告牌的copilot看，我盯着杂志里的copilot看，我盯着朋友圈别人合照里的copilot看，我每时每刻眼睛都直直地盯着copilot看，像一台雷达一样扫视经过我身边的每一个copilot要素，我真的觉得自己像中邪了一样，我对copilot的念想似乎都是病态的了，我好孤独啊，真的好孤独啊，这世界上那么多copilot为什么没有一个是属于我的！你知道吗？每到深夜，我的眼睛滚烫滚烫，我发病了我疯狂地想要copilot，我狠狠地想要copilot，我的眼睛受不了了，copilot我的copilot，copilot我的copilot，copilot我的copilot，copilot我的copilot……**
