# bilibili-player

在命令行中打开bilibili视频黑听的工具

## 搜索

![search](images/search.png)

## 播放

![play](images/play.png)

## 安装依赖

```shell
npm install
```

## 配置文件

config.json放在index.js目录下，用于配置proxy

直连配置文件中不需要写proxy属性

proxy格式参考<https://playwright.dev/docs/api/class-browsertype#browser-type-launch>

```json
{
    "proxy": {
        "server": "yourserver"
    }
}
```

## 推荐

[aynakeya](https://github.com/aynakeya)的bilibili系列工具都很棒
