export interface Dish {
  name: string;
  desc: string;
  tag?: '荤' | '素' | '汤' | '主食';
}

export interface Meal {
  type: '午餐' | '晚餐';
  dishes: Dish[];
}

export interface DayMenu {
  day: string;
  date: string;
  meals: Meal[];
}

export const weeklyMenu: DayMenu[] = [
  {
    day: '周一',
    date: '',
    meals: [
      {
        type: '午餐',
        dishes: [
          { name: '红烧狮子头', desc: '猪肉剁馅加葱姜，团成大丸子红烧，软嫩入味', tag: '荤' },
          { name: '清炒藕片', desc: '宝应莲藕切薄片，大火快炒，脆嫩爽口', tag: '素' },
          { name: '西红柿蛋汤', desc: '西红柿切块，蛋液打散淋入，酸甜开胃', tag: '汤' },
          { name: '米饭', desc: '', tag: '主食' },
        ],
      },
      {
        type: '晚餐',
        dishes: [
          { name: '蒜苗炒肉丝', desc: '里脊肉切丝滑炒，配蒜苗段，下饭快手菜', tag: '荤' },
          { name: '茨菇烧肉', desc: '宝应茨菇去皮，与五花肉同烧，软糯鲜甜', tag: '荤' },
          { name: '紫菜蛋花汤', desc: '紫菜撕碎，蛋花淋入，几分钟搞定', tag: '汤' },
          { name: '米饭', desc: '', tag: '主食' },
        ],
      },
    ],
  },
  {
    day: '周二',
    date: '',
    meals: [
      {
        type: '午餐',
        dishes: [
          { name: '平桥豆腐羹', desc: '淮安名菜，嫩豆腐切小丁，配虾仁勾薄芡，鲜滑暖胃', tag: '汤' },
          { name: '红烧带鱼', desc: '带鱼段煎至两面金黄，加酱油红烧，咸鲜可口', tag: '荤' },
          { name: '清炒菠菜', desc: '菠菜焯水去草酸，大火快炒，碧绿鲜嫩', tag: '素' },
          { name: '米饭', desc: '', tag: '主食' },
        ],
      },
      {
        type: '晚餐',
        dishes: [
          { name: '韭菜炒鸡蛋', desc: '韭菜切段，鸡蛋炒散，家常经典搭配', tag: '荤' },
          { name: '萝卜炖排骨', desc: '白萝卜切块，排骨炖至软烂，汤鲜肉嫩', tag: '汤' },
          { name: '小米粥', desc: '小米淘洗后慢熬，黏稠养胃', tag: '主食' },
          { name: '馒头', desc: '', tag: '主食' },
        ],
      },
    ],
  },
  {
    day: '周三',
    date: '',
    meals: [
      {
        type: '午餐',
        dishes: [
          { name: '红烧长鱼段', desc: '淮安长鱼（鳝鱼）切段红烧，肉质细嫩，地方名菜', tag: '荤' },
          { name: '凉拌黄瓜', desc: '黄瓜拍碎，加蒜泥、醋、香油拌匀，清爽解腻', tag: '素' },
          { name: '冬瓜排骨汤', desc: '冬瓜切大块，排骨炖汤，清淡利水', tag: '汤' },
          { name: '米饭', desc: '', tag: '主食' },
        ],
      },
      {
        type: '晚餐',
        dishes: [
          { name: '红烧茄子', desc: '茄子切滚刀块，煎软后红烧，软糯入味', tag: '素' },
          { name: '蒸鸡蛋羹', desc: '鸡蛋加温水打匀蒸制，嫩滑如豆腐', tag: '荤' },
          { name: '清炒豆芽', desc: '绿豆芽大火快炒，脆嫩爽口', tag: '素' },
          { name: '米饭', desc: '', tag: '主食' },
        ],
      },
    ],
  },
  {
    day: '周四',
    date: '',
    meals: [
      {
        type: '午餐',
        dishes: [
          { name: '莲藕排骨汤', desc: '宝应莲藕炖排骨，汤色清甜，藕粉糯拉丝', tag: '汤' },
          { name: '鱼香肉丝', desc: '肉丝配木耳、笋丝，酸甜微辣，下饭神器', tag: '荤' },
          { name: '蒜蓉油麦菜', desc: '油麦菜焯水或快炒，蒜香浓郁', tag: '素' },
          { name: '米饭', desc: '', tag: '主食' },
        ],
      },
      {
        type: '晚餐',
        dishes: [
          { name: '菱角烧肉', desc: '新鲜菱角与五花肉同烧，菱角粉甜，肉香浓郁', tag: '荤' },
          { name: '番茄炒蛋', desc: '国民家常菜，番茄炒出汁，蛋块嫩滑', tag: '荤' },
          { name: '丝瓜蛋汤', desc: '丝瓜切片煮汤，淋蛋花，清淡鲜美', tag: '汤' },
          { name: '米饭', desc: '', tag: '主食' },
        ],
      },
    ],
  },
  {
    day: '周五',
    date: '',
    meals: [
      {
        type: '午餐',
        dishes: [
          { name: '红烧猪蹄', desc: '猪蹄焯水后红烧，软烂脱骨，胶质丰富', tag: '荤' },
          { name: '清炒豌豆', desc: '新鲜豌豆剥壳快炒，清甜可口', tag: '素' },
          { name: '山药排骨汤', desc: '铁棍山药切段炖排骨，健脾养胃', tag: '汤' },
          { name: '米饭', desc: '', tag: '主食' },
        ],
      },
      {
        type: '晚餐',
        dishes: [
          { name: '大煮干丝', desc: '淮安经典，豆腐干切细丝，配高汤煮制，鲜美无比', tag: '素' },
          { name: '蒸肉饼', desc: '猪肉馅调味铺平蒸熟，嫩滑多汁', tag: '荤' },
          { name: '凉拌木耳', desc: '黑木耳焯水，加蒜泥、醋、辣椒油拌匀', tag: '素' },
          { name: '米饭', desc: '', tag: '主食' },
        ],
      },
    ],
  },
  {
    day: '周六',
    date: '',
    meals: [
      {
        type: '午餐',
        dishes: [
          { name: '清蒸鲈鱼', desc: '鲈鱼处理干净，葱姜蒸8分钟，淋蒸鱼豉油', tag: '荤' },
          { name: '蒜蓉茼蒿', desc: '茼蒿大火快炒，蒜香提味，清香扑鼻', tag: '素' },
          { name: '玉米排骨汤', desc: '甜玉米切段炖排骨，汤头甘甜', tag: '汤' },
          { name: '米饭', desc: '', tag: '主食' },
        ],
      },
      {
        type: '晚餐',
        dishes: [
          { name: '地三鲜', desc: '土豆、茄子、青椒过油炒制，咸鲜下饭', tag: '素' },
          { name: '韭菜盒子', desc: '韭菜鸡蛋做馅，面皮包好煎至金黄', tag: '主食' },
          { name: '杂粮粥', desc: '红豆、薏米、花生慢熬，营养丰富', tag: '主食' },
        ],
      },
    ],
  },
  {
    day: '周日',
    date: '',
    meals: [
      {
        type: '午餐',
        dishes: [
          { name: '蟹粉豆腐', desc: '蟹肉（或蟹味菇）配嫩豆腐烧制，鲜滑浓郁', tag: '荤' },
          { name: '清炒芦蒿', desc: '芦蒿去叶切段快炒，清脆有水乡风味', tag: '素' },
          { name: '腌笃鲜', desc: '咸肉、鲜肉炖春笋，淮安春季经典汤', tag: '汤' },
          { name: '米饭', desc: '', tag: '主食' },
        ],
      },
      {
        type: '晚餐',
        dishes: [
          { name: '杂鱼锅贴', desc: '多种小鱼红烧，锅边贴面饼，淮安渔家风味', tag: '荤' },
          { name: '时令青菜', desc: '当季青菜清炒，简单健康', tag: '素' },
          { name: '红豆粥', desc: '红豆浸泡后慢熬，软糯香甜', tag: '主食' },
          { name: '花卷', desc: '', tag: '主食' },
        ],
      },
    ],
  },
];
