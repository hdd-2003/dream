# 梦境星河 - 视觉风格指南与设计规范

## 1. 品牌定位

**产品名称**：梦境星河 (Dream Galaxy)
**核心概念**：将用户的梦境转化为闪烁的星辰，构建个人专属的梦境宇宙
**设计理念**：深邃、梦幻、温暖、诗意、现代简约

---

## 2. 色彩系统

### 主色调 (Primary Colors)
- **深空靛蓝** (Deep Indigo): `#0f172a` - 背景基调
- **星云紫** (Nebula Purple): `#6366f1` - 主品牌色，强调元素
- **星河蓝** (Galaxy Blue): `#3b82f6` - 次要强调

### 辅助色 (Accent Colors)
- **美梦金** (Sweet Gold): `#f59e0b` - 温馨、美好
- **奇幻青** (Fantasy Cyan): `#06b6d4` - 幻想、冒险
- **记忆粉** (Memory Pink): `#ec4899` - 怀旧、温柔
- **觉醒紫** (Awakening Purple): `#8b5cf6` - 勇气、成长

### 中性色 (Neutral Colors)
- `#f8fafc` - 主要文字
- `#e2e8f0` - 次要文字
- `#94a3b8` - 辅助文字
- `#334155` - 深色分割线/背景
- `#1e293b` - 卡片背景

### 渐变定义 (Gradients)
```css
/* 主渐变 */
from-indigo-500 via-purple-500 to-cyan-500

/* 美梦 */
from-amber-400 to-orange-500

/* 噩梦/觉醒 */
from-purple-500 to-indigo-700

/* 奇幻 */
from-cyan-300 via-blue-500 to-purple-600

/* 回忆 */
from-pink-400 to-rose-600
```

---

## 3. 排版系统

### 字体层次 (Font Hierarchy)
```css
/* 标题一级 - 梦境标题 */
text-4xl / md:text-5xl / lg:text-6xl
font-light
tracking-widest
font-serif

/* 标题二级 - 页面标题 */
text-2xl / md:text-3xl
font-light
font-serif

/* 标题三级 - 卡片标题 */
text-xl
font-medium

/* 正文 */
text-base / md:text-lg
font-light
leading-relaxed

/* 辅助文字 */
text-sm
text-slate-400
```

### 字体选择
- **主字体**：Inter / system-ui 无衬线 - 现代清晰
- **强调字体**：Georgia / serif - 增添诗意和优雅
- **字重**：light (300)、regular (400)、medium (500)

---

## 4. 间距系统 (Spacing)

基于 4px 的倍数网格：
- xs: 4px
- sm: 8px
- md: 16px
- lg: 24px
- xl: 32px
- 2xl: 48px
- 3xl: 64px

---

## 5. 组件设计规范

### 按钮 (Buttons)
- **主要按钮**: 圆角 2xl，渐变背景，光晕阴影
- **次要按钮**: 圆角 2xl，半透明白色背景，边框
- **尺寸**: 高度 48-56px，最小宽度 120px
- **悬停**: 缩放 1.02-1.05，阴影增强
- **点击**: 缩放 0.98

### 卡片 (Cards)
- **圆角**: 2xl-3xl
- **背景**: 白色 5%-10% 透明度，毛玻璃
- **边框**: 白色 10%-15% 透明度
- **阴影**: 柔和内阴影 + 外层光晕

### 输入框 (Inputs)
- **圆角**: xl
- **背景**: 深色半透明
- **边框**: 聚焦时显示对应主题色
- **内边距**: 16px

---

## 6. 动效规范

### 过渡动画
- **基础**: duration-300, ease-out
- **入场**: duration-500-800, cubic-bezier(0.22, 1, 0.36, 1)
- **弹性**: cubic-bezier(0.68, -0.55, 0.265, 1.55)

### 微交互
- **悬停**: 200-300ms 过渡
- **点击**: 100-150ms 快速反馈
- **加载**: 呼吸效果，缓慢脉冲

### 页面过渡
- **入场**: 从下方滑入 + 淡入
- **退场**: 向上滑出 + 淡出
- **模态**: 缩放 + 淡入

---

## 7. 响应式断点

```css
sm: 640px   (移动端)
md: 768px   (平板)
lg: 1024px  (笔记本)
xl: 1280px  (桌面)
```

---

## 8. 图标系统

使用 lucide-react 图标库，保持统一风格：
- 尺寸: 16px, 20px, 24px
- 颜色: 随主题色变化
- 线条: 保持一致的 stroke-width

---

## 9. 粒子场设计规范

- **粒子数量**: 根据屏幕大小动态计算 (约 150-200 个)
- **颜色**: 主色调 + 辅助色，柔和半透明
- **运动**: 缓慢的轨道运动，响应鼠标
- **交互**: 鼠标悬停时粒子轻微聚拢

---

## 10. 可访问性 (A11y)

- 对比度: 文字与背景至少 4.5:1
- 焦点状态: 清晰的 outline
- 语义化标签: 使用正确的 HTML 语义
- 键盘导航: 所有交互可通过键盘访问
