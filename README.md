# Loon Plugins

个人使用的 Loon 插件、脚本与配置资源。

## 打卡定位

单中心点、200 米圆形均匀随机；每次开启只随机一次，本轮坐标保持不变；30 分钟有效，每 5 分钟检查并自动恢复真实定位。

### 安装

在 Loon 中进入 **配置 → 插件 → 右上角 `+` → 添加订阅**，粘贴下面的链接：

```text
https://raw.githubusercontent.com/wenjinliuu/loon-plugins/main/ios-location/ios-location-random.lnplugin
```

随后启用插件，并确保：

- Loon 的 Script 和 MITM 已开启；
- Loon CA 证书已经安装并完全信任；
- `MitM over HTTP/2` 与 `QUIC 回退保护`已开启。

### 控制地址

- 开启：`http://example.com/__stash_location/start`
- 恢复真实定位：`http://example.com/__stash_location/real`
- 查看状态：`http://example.com/__loon_location/status`

原 Stash 快捷指令地址可继续使用；当前运行哪个代理软件，就由哪个软件接管请求。

### 从本地版迁移

确认插件版运行正常后，删除此前手动建立的定位脚本规则和本地 `ios_location_control.js`，避免同一请求被重复处理。证书和 Loon 全局开关无需重复设置。

### iOS 26 及以上

首次启用或更换坐标后，如脚本通知正常但地图位置没有变化，通常是 `locationd` 缓存。按以下顺序操作：

1. 开启飞行模式并关闭定位服务；
2. 重启 iPhone；
3. 关闭飞行模式，先连接 Loon；
4. 再开启定位服务并打开地图验证。

## 上游与许可

定位响应修改使用 [mekos2772/ios-location-spoofer](https://github.com/mekos2772/ios-location-spoofer) 的核心脚本，遵循其 AGPL-3.0 许可。自定义控制脚本负责随机坐标、状态计时和自动恢复。
