# Seer2 Pet Animator

![Project Banner](src/assets/pet-animator-banner.png)

用于约瑟传说的精灵动画的custom element。
关于该组件的实际演示: [预览网页](https://seer2-pet-render.netlify.app)

## 快速开始

``` html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <script src="https://cdn.jsdelivr.net/npm/seer2-pet-animator/dist/pet-render.umd.js"></script>
  </head>
  <body>
    <pet-render url="http://seer2.61.com/res/pet/fight/100.swf"></pet-render>
  </body>
  <script type="module">
    document.querySelector('pet-render').addEventListener('animationComplete', (event) => {
      console.log('播放完毕:', event.detail);
    });
    document.querySelector('pet-render').addEventListener('hit', (event) => {
      console.log('受击:', event.detail);
    });
  </script>
</html>
```

您也可以把他作为npm包进行引入。

```bash
pnpm add seer2-pet-animator
```

```vue
<script setup>
import 'seer2-pet-animator'
</script>

<template>
    <pet-render url="http://seer2.61.com/res/pet/fight/100.swf"></pet-render>
</template>
```

## API

### 组件标签

`<pet-render>`

#### 属性（Properties）

| 属性名     | 类型      | 默认值     | 描述                                                                 |
|------------|-----------|------------|----------------------------------------------------------------------|
| `url`      | String    | ""         | SWF动画文件的URL地址 (必需)                                          |
| `reverse`  | Boolean   | false      | 是否反转动画播放方向                                                 |
| `scale`    | String    | "noscale"  | 缩放模式，可选值同Flash的StageScaleMode（如 "noScale", "showAll" 等）|

### 方法（Methods）

#### `play()`

开始播放当前状态的动画

#### `pause()`

暂停当前动画播放

#### `setState(state: ActionState)`

设置精灵的动画状态

**参数**:

- `state`: 使用预定义的`ActionState`枚举值

#### `getState(): ActionState`

获取当前动画状态

#### `getAvailableStates(): Array<ActionState>`

获取该SWF支持的可用状态列表

### 事件（Events）

#### `animationComplete`

动画播放完成时触发

**事件对象属性**:

```typescript
{
  state: ActionState,  // 当前状态
  duration: number     // 动画持续时间（秒）
}
```

#### `hit`

当动画播放到受击关键帧时触发

事件对象属性:

```typescript
{
  state: ActionState  // 当前状态
}
```

#### 状态枚举（ActionState）

```typescript
enum ActionState {
  IDLE = "待机",
  ATK_PHY = "物理攻击",
  ATK_BUF = "属性攻击",
  ATK_SPE = "特殊攻击",
  UNDER_ATK = "被打",
  UNDER_ULTRA = "被暴击",
  WIN = "胜利",
  DEAD = "失败",
  MISS = "闪避",
  ATK_POW = "必杀",
  ABOUT_TO_DIE = "濒死",
  PRESENT = "个性出场",
  INTERCOURSE = "合体攻击",
  CHANGE_STATUS = "变身效果",
  BLANK = "空"
}
```

### 环境要求

- Node.js 22+
- pnpm 10+

### 安装依赖

```bash
pnpm install
```

### 开发模式

```bash
pnpm run dev
```

### 生产构建

```bash
pnpm run build
```

## 维护者

[@yuuinih](https://github.com/yuuinih)
