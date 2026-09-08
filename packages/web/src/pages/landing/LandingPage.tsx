/**
 * LandingPage - 官网首页
 *
 * 首页仅渲染 Hero（section#demo），由其提供游戏展示、切换与进入游戏链接。
 * 不挂载导航、宣传板块或页脚；沿用当前主题和语言。
 */

import { Hero } from "./Hero";

export default function LandingPage() {
  return (
    <div className="h-screen overflow-y-auto bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white transition-colors">
      <main>
        <Hero />
      </main>
    </div>
  );
}
