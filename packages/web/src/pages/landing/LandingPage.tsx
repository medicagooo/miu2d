/**
 * LandingPage - 官网首页
 *
 * 特点:
 * - 大气现代的设计风格
 * - 首页不渲染顶部导航，游戏选择由 Hero 提供；沿用当前主题和语言
 * - 使用 framer-motion 动画
 */

import { CrossPlatformSection } from "./CrossPlatformSection";
import { CTA } from "./CTA";

import { Features } from "./Features";
import { Footer } from "./Footer";
import { Hero } from "./Hero";
import { Highlights } from "./Highlights";
import { MobileShowcase } from "./MobileShowcase";
import { TechStack } from "./TechStack";

export default function LandingPage() {
  return (
    <div className="h-screen overflow-y-auto bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white transition-colors">
      <main>
        <Hero />

        <MobileShowcase />
        <Features />
        <CrossPlatformSection />
        <Highlights />
        <TechStack />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
