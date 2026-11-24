// YOLO-World 60 fine-grained daily desktop classes and their Chinese translations
export interface WorldClassDef {
  en: string;
  cn: string;
  icon: string;
}

export const WORLD_CLASSES: string[] = [
  'cell phone', 'laptop', 'tablet', 'mouse', 'keyboard', 'headphones', 'earphones', 'smart watch', 'watch', 'remote control', 'camera', 'cable', 'charger', 'power bank', 'usb drive',
  'pen', 'pencil', 'marker', 'scissors', 'stapler', 'ruler', 'calculator', 'book', 'notebook', 'paper', 'badge', 'card', 'sticky note', 'envelope', 'box',
  'water bottle', 'bottle', 'cup', 'mug', 'glasses', 'sunglasses', 'keys', 'wallet', 'backpack', 'handbag', 'umbrella', 'tissue box', 'tissue', 'mirror', 'comb', 'nail clipper', 'medicine bottle', 'mask',
  'chair', 'desk', 'lamp', 'clock', 'trash can', 'potted plant',
  'apple', 'banana', 'orange', 'bread', 'snack', 'beverage can'
];

export const WORLD_CN_MAP: Record<string, string> = {
  // 电子数码
  'cell phone': '📱 手机',
  'laptop': '💻 笔记本电脑',
  'tablet': '📱 平板电脑',
  'mouse': '🖱️ 鼠标',
  'keyboard': '⌨️ 键盘',
  'headphones': '🎧 头戴式耳机',
  'earphones': '🎵 耳机',
  'smart watch': '⌚ 智能手表',
  'watch': '⌚ 手表',
  'remote control': '📺 遥控器',
  'camera': '📷 相机',
  'cable': '🔌 数据线',
  'charger': '🔌 充电头',
  'power bank': '🔋 充电宝',
  'usb drive': '💾 U盘',

  // 办公文具
  'pen': '🖊️ 圆珠笔/钢笔',
  'pencil': '✏️ 铅笔',
  'marker': '🖍️ 记号笔',
  'scissors': '✂️ 剪刀',
  'stapler': '📎 订书机',
  'ruler': '📏 尺子',
  'calculator': '🔢 计算器',
  'book': '📖 书籍',
  'notebook': '📓 笔记本',
  'paper': '📄 文件纸张',
  'badge': '🪪 工牌/证件卡',
  'card': '💳 银行卡/卡片',
  'sticky note': '📑 便签纸',
  'envelope': '✉️ 信封',
  'box': '📦 盒子/包装箱',

  // 生活随身
  'water bottle': '🧴 保温杯/水瓶',
  'bottle': '🍼 瓶子',
  'cup': '☕ 水杯',
  'mug': '☕ 马克杯',
  'glasses': '👓 眼镜',
  'sunglasses': '🕶️ 太阳镜/墨镜',
  'keys': '🔑 钥匙',
  'wallet': '👛 钱包',
  'backpack': '🎒 双肩包',
  'handbag': '👜 手提包',
  'umbrella': '☂️ 雨伞',
  'tissue box': '📦 纸巾盒',
  'tissue': '🧻 抽纸/纸巾',
  'mirror': '🪞 镜子',
  'comb': '🪮 梳子',
  'nail clipper': '✂️ 指甲刀',
  'medicine bottle': '💊 药瓶/药盒',
  'mask': '😷 口罩',

  // 桌面环境
  'chair': '🪑 椅子',
  'desk': '🖥️ 办公桌',
  'lamp': '💡 台灯',
  'clock': '⏰ 时钟',
  'trash can': '🗑️ 垃圾桶',
  'potted plant': '🪴 绿植盆栽',

  // 饮食果品
  'apple': '🍎 苹果',
  'banana': '🍌 香蕉',
  'orange': '🍊 橙子',
  'bread': '🍞 面包',
  'snack': '🍿 零食',
  'beverage can': '🥫 易拉罐饮料',
};
