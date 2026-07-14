export interface Dish {
  name: string;
  desc: string;
  tag?: '荤' | '素' | '汤';
}

export interface DayMenu {
  day: string;
  dishes: Dish[];
}

export const weeklyMenu: DayMenu[] = [
  {
    day: '周一',
    dishes: [
      { name: '蒜苗炒肉丝', desc: '里脊肉切丝滑炒，配蒜苗段，下饭快手菜', tag: '荤' },
      { name: '茨菇烧肉', desc: '宝应茨菇去皮，与五花肉同烧，软糯鲜甜', tag: '荤' },
      { name: '清炒藕片', desc: '宝应莲藕切薄片，大火快炒，脆嫩爽口', tag: '素' },
      { name: '紫菜蛋花汤', desc: '紫菜撕碎，蛋花淋入，几分钟搞定', tag: '汤' },
    ],
  },
  {
    day: '周二',
    dishes: [
      { name: '红烧长鱼段', desc: '淮安长鱼（鳝鱼）切段红烧，肉质细嫩，地方名菜', tag: '荤' },
      { name: '韭菜炒鸡蛋', desc: '韭菜切段，鸡蛋炒散，家常经典搭配', tag: '荤' },
      { name: '凉拌黄瓜', desc: '黄瓜拍碎，加蒜泥、醋、香油拌匀，清爽解腻', tag: '素' },
      { name: '萝卜排骨汤', desc: '白萝卜切块，排骨炖至软烂，汤鲜肉嫩', tag: '汤' },
    ],
  },
  {
    day: '周三',
    dishes: [
      { name: '菱角烧肉', desc: '新鲜菱角与五花肉同烧，菱角粉甜，肉香浓郁', tag: '荤' },
      { name: '番茄炒蛋', desc: '国民家常菜，番茄炒出汁，蛋块嫩滑', tag: '荤' },
      { name: '回锅肉', desc: '五花肉煮熟切片，配蒜苗豆瓣酱回锅炒，肥而不腻', tag: '荤' },
      { name: '冬瓜蛋汤', desc: '冬瓜切片煮汤，淋蛋花，清淡利水', tag: '汤' },
    ],
  },
  {
    day: '周四',
    dishes: [
      { name: '油爆河虾', desc: '新鲜河虾大火快炒，壳脆肉嫩，淮安水乡家常菜', tag: '荤' },
      { name: '蒸鸡蛋羹', desc: '鸡蛋加温水打匀蒸制，嫩滑如豆腐', tag: '荤' },
      { name: '清炒豆芽', desc: '绿豆芽大火快炒，脆嫩爽口', tag: '素' },
      { name: '丝瓜蛋汤', desc: '丝瓜切片煮汤，淋蛋花，清淡鲜美', tag: '汤' },
    ],
  },
  {
    day: '周五',
    dishes: [
      { name: '红烧带鱼', desc: '带鱼段煎至两面金黄，加酱油红烧，咸鲜可口', tag: '荤' },
      { name: '大煮干丝', desc: '淮安经典，豆腐干切细丝，配高汤煮制，鲜美无比', tag: '素' },
      { name: '凉拌木耳', desc: '黑木耳焯水，加蒜泥、醋、辣椒油拌匀', tag: '素' },
      { name: '平桥豆腐羹', desc: '淮安名菜，嫩豆腐切小丁，配虾仁勾薄芡，鲜滑暖胃', tag: '汤' },
    ],
  },
];
