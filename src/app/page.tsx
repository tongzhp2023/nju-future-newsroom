"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";

const heroImages = ["/hero-1.jpg", "/hero-2.jpg"];

export default function Home() {
  const [currentImage, setCurrentImage] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % heroImages.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      {/* Background Images with Crossfade */}
      {heroImages.map((src, index) => (
        <div
          key={src}
          className="absolute inset-0 transition-opacity duration-1000 ease-in-out"
          style={{ opacity: currentImage === index ? 1 : 0 }}
        >
          <Image
            src={src}
            alt="南京大学未来编辑部"
            fill
            className="object-cover"
            priority={index === 0}
          />
        </div>
      ))}

      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Content */}
      <div className="relative z-10 text-center max-w-2xl px-6">
        <h1 className="text-5xl font-bold text-white mb-4 drop-shadow-lg">
          南京大学未来编辑部
        </h1>
        <h2 className="text-xl text-white mb-3 drop-shadow-md">
          智慧课程平台
        </h2>
        <p className="text-white/90 mb-10 text-lg drop-shadow-md">
          新闻传播学院 · 采编审稿 · AI 辅助写作 · 报道数据库
        </p>

        <div className="flex gap-4 justify-center">
          <Link
            href="/login"
            className="px-8 py-3 bg-white text-gray-900 font-medium rounded-lg hover:bg-gray-100 transition shadow-lg"
          >
            登录
          </Link>
          <Link
            href="/register"
            className="px-8 py-3 border-2 border-white text-white font-medium rounded-lg hover:bg-white/10 transition"
          >
            注册
          </Link>
        </div>
      </div>

      {/* Image Indicators */}
      <div className="absolute bottom-20 z-10 flex gap-2">
        {heroImages.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentImage(index)}
            className={`w-2 h-2 rounded-full transition-all ${
              currentImage === index
                ? "bg-white w-6"
                : "bg-white/50"
            }`}
          />
        ))}
      </div>

      {/* Footer */}
      <footer className="absolute bottom-6 z-10 text-sm text-white/80 drop-shadow-sm">
        南京大学新闻传播学院未来编辑部 © 2026
      </footer>
    </div>
  );
}
