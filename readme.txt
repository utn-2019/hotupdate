此更新方案适用于单包 或 大厅子游戏模式的子包


1.  更新时包内需要包含一份包体资源的配置表（project.manifest）
    为了保持其纯净性，我将此表单独放置于包内（传统做法是将此表挂在某个脚本上，构建时会当作游戏资源打包）
    ios: 直接添加project.manifest文件到xcode项目的Resources文件夹中
    android： 在app/build.gradle的variant.mergeAssets.doLast配置中添加一个拷贝项，发包时会自动拷贝到assets文件夹内
      或者在app/下建assets文件夹，将此表放在文件夹内，并在 app/build.gradle的sourceSets.main配置中添加 assets.srcDirs "assets"

2.  修改main.js文件夹，设置资源搜索路径，保证在任何情况下，游戏会优先加载最新资源

3.  自己编写逻辑 生成每个子包的资源列表，并实现更新逻辑（可参考package/main.js   pack_generator.js）

4.  处理项目资源 jsb-link/res，发包时需要注意，删除多余资源，仅保留需要的资源


===========20190701更新===================
1. 默认关闭了所有subgame包含hall资源的功能（见pack_generator中208行）
2. 更改了资源目录，所有资源 放在了 remote-assets中，而remote-assets-sub中放所包含的subgame资源