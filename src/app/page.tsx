'use client';

import { weeklyMenu, type Dish } from '@/lib/menu-data';

function TagBadge({ tag }: { tag: Dish['tag'] }) {
  if (!tag) return null;

  const styles: Record<string, string> = {
    '荤': 'bg-[#FDECEA] text-[#C0392B] border-[#F5C6CB]',
    '素': 'bg-[#E8F5E9] text-[#2E7D32] border-[#C8E6C9]',
    '汤': 'bg-[#FFF3E0] text-[#E65100] border-[#FFE0B2]',
  };

  return (
    <span
      className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${styles[tag] || ''}`}
    >
      {tag}
    </span>
  );
}

function DishItem({ dish }: { dish: Dish }) {
  return (
    <div className="group flex items-start gap-3 py-2.5 transition-all duration-200">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-serif text-base font-semibold text-[var(--menu-ink)]">
            {dish.name}
          </span>
          <TagBadge tag={dish.tag} />
        </div>
        {dish.desc && (
          <p className="mt-0.5 text-sm leading-relaxed text-[var(--menu-gray)]">
            {dish.desc}
          </p>
        )}
      </div>
    </div>
  );
}

function DayCard({
  day,
  dishes,
  index,
}: {
  day: string;
  dishes: Dish[];
  index: number;
}) {
  const dayEmojis = ['🏮', '🥢', '🍲', '🥬', '🐟'];

  return (
    <section className="mb-8 last:mb-0">
      {/* 日期标题 */}
      <div className="mb-4 flex items-center gap-3">
        <span className="text-2xl">{dayEmojis[index]}</span>
        <h3 className="font-serif text-xl font-bold text-[var(--menu-primary)]">
          {day}
        </h3>
        <span className="text-sm text-[var(--menu-gray)]">晚餐</span>
        <div className="h-px flex-1 bg-gradient-to-r from-[var(--menu-border)] to-transparent" />
      </div>

      {/* 菜品卡片 */}
      <div className="rounded-xl border border-[#C8E6C9] bg-[var(--menu-dinner)] p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
        <div className="mb-3 flex items-center gap-2">
          <span className="text-lg">🌙</span>
          <h4 className="font-serif text-sm font-semibold tracking-wide text-[var(--menu-green)]">
            晚餐四菜
          </h4>
        </div>
        <div className="divide-y divide-[var(--menu-border)]/50">
          {dishes.map((dish, i) => (
            <DishItem key={i} dish={dish} />
          ))}
        </div>
        <div className="mt-3 pt-3 border-t border-[var(--menu-border)]/50">
          <p className="text-sm text-[var(--menu-gray)]">🍚 米饭</p>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const handleDownloadPDF = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-[var(--menu-bg)]">
      {/* 顶部标题区域 */}
      <header className="relative overflow-hidden border-b border-[var(--menu-border)] bg-gradient-to-b from-[#FFF8F0] to-[var(--menu-bg)] print:border-b print:bg-white">
        <div className="mx-auto max-w-4xl px-6 py-12 text-center">
          {/* 装饰元素 */}
          <div className="mb-4 flex items-center justify-center gap-3">
            <span className="h-px w-12 bg-[var(--menu-border)]" />
            <span className="text-3xl">🍚</span>
            <span className="h-px w-12 bg-[var(--menu-border)]" />
          </div>

          <h1 className="font-serif text-3xl font-bold tracking-wide text-[var(--menu-primary)] sm:text-4xl">
            一周家常菜单
          </h1>
          <p className="mt-2 font-serif text-base text-[var(--menu-gray)] sm:text-lg">
            宝应 · 淮安
          </p>
          <p className="mt-4 text-sm leading-relaxed text-[var(--menu-gray)]/80">
            水乡人家的日常晚饭，食材易得，做法简单
            <br />
            周一至周五，每天四道菜，配米饭
          </p>

          {/* 图例 */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-xs text-[var(--menu-gray)]">
            <span className="flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#C0392B]" />
              荤菜
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#2E7D32]" />
              素菜
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#E65100]" />
              汤品
            </span>
          </div>

          {/* PDF下载按钮 - 打印时隐藏 */}
          <div className="mt-6 print:hidden">
            <button
              onClick={handleDownloadPDF}
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--menu-primary)]/20 bg-[var(--menu-primary)] px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-[var(--menu-primary)]/90"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              下载 PDF 菜单
            </button>
            <p className="mt-2 text-xs text-[var(--menu-gray)]/60">
              点击后在打印弹窗中选择「另存为 PDF」即可保存
            </p>
          </div>
        </div>
      </header>

      {/* 主体内容 */}
      <main className="mx-auto max-w-4xl px-6 py-10">
        {/* 温馨提示 */}
        <div className="mb-8 rounded-lg border border-[var(--menu-gold)]/30 bg-[#FFF8E1]/50 p-4">
          <p className="text-center text-sm leading-relaxed text-[var(--menu-gray)]">
            💡 <strong className="text-[var(--menu-primary)]">小贴士：</strong>
            菜单可根据时令蔬菜灵活调整，宝应藕、茨菇、菱角上市时多吃，长鱼（鳝鱼）以夏季最为肥美。
            晚餐两荤一素一汤，营养均衡。
          </p>
        </div>

        {/* 每日菜单 */}
        {weeklyMenu.map((dayMenu, index) => (
          <DayCard
            key={dayMenu.day}
            day={dayMenu.day}
            dishes={dayMenu.dishes}
            index={index}
          />
        ))}

        {/* 做法详解 */}
        <section className="mt-12">
          <div className="mb-6 flex items-center gap-3">
            <span className="text-2xl">📖</span>
            <h2 className="font-serif text-2xl font-bold text-[var(--menu-primary)]">
              做法详解
            </h2>
            <div className="h-px flex-1 bg-gradient-to-r from-[var(--menu-border)] to-transparent" />
          </div>

          <div className="space-y-6">
            {weeklyMenu.map((dayMenu) => (
              <div
                key={dayMenu.day}
                className="rounded-xl border border-[var(--menu-border)] bg-white/60 p-5"
              >
                <h3 className="mb-4 font-serif text-lg font-bold text-[var(--menu-primary)]">
                  {dayMenu.day} · 晚餐
                </h3>
                <div className="space-y-5">
                  {dayMenu.dishes.map((dish, dishIdx) => (
                    <div key={dishIdx}>
                      <div className="mb-2 flex items-center gap-2">
                        <span className="inline-block h-5 w-5 rounded-full bg-[var(--menu-primary)] text-center text-xs leading-5 text-white">
                          {dishIdx + 1}
                        </span>
                        <span className="font-serif text-base font-semibold text-[var(--menu-ink)]">
                          {dish.name}
                        </span>
                        {dish.tag && (
                          <span className="text-xs text-[var(--menu-gray)]">
                            ({dish.tag})
                          </span>
                        )}
                      </div>
                      {dish.steps && dish.steps.length > 0 ? (
                        <ol className="ml-7 space-y-1">
                          {dish.steps.map((step, stepIdx) => (
                            <li
                              key={stepIdx}
                              className="text-sm leading-relaxed text-[var(--menu-gray)]"
                            >
                              <span className="mr-1.5 font-medium text-[var(--menu-primary)]/70">
                                {stepIdx + 1}.
                              </span>
                              {step}
                            </li>
                          ))}
                        </ol>
                      ) : (
                        <p className="ml-7 text-sm text-[var(--menu-gray)]">
                          {dish.desc}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* 底部 */}
      <footer className="border-t border-[var(--menu-border)] bg-[#FFF8F0]/50">
        <div className="mx-auto max-w-4xl px-6 py-8 text-center">
          <p className="font-serif text-sm text-[var(--menu-gray)]">
            好好吃饭，好好生活
          </p>
          <p className="mt-1 text-xs text-[var(--menu-gray)]/60">
            宝应 · 淮安 家常菜单 — 愿每一餐都是家的味道
          </p>
        </div>
      </footer>
    </div>
  );
}
