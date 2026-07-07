"use client";

import { useEffect, useRef } from "react";

export default function MatrixRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas to full screen
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Characters (Katakana + Latin + Numerals)
    const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*アァカサタナハマヤャラワガザダバパイィキシチニヒミリヰギジヂビピウゥクスツヌフムユュルグズブヅプエェケセテネヘメレゲゼデベペオォコソトノホモヨョロゴゾドボポヴッン";
    const characters = charset.split("");

    const fontSize = 16;
    let columns = Math.floor(canvas.width / fontSize);
    let drops: number[] = [];

    // Initial drops positions
    const initDrops = () => {
      columns = Math.floor(canvas.width / fontSize);
      drops = [];
      for (let x = 0; x < columns; x++) {
        drops[x] = Math.random() * -100; // start randomly above screen
      }
    };
    initDrops();

    const draw = () => {
      // Dark slate background with opacity to create trail effect
      ctx.fillStyle = "rgba(2, 6, 23, 0.1)"; 
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Cyan / Blue text color for cyberpunk feel
      ctx.fillStyle = "rgba(14, 165, 233, 0.8)"; // Tailwind cyan-500
      ctx.font = fontSize + "px monospace";

      for (let i = 0; i < drops.length; i++) {
        const text = characters[Math.floor(Math.random() * characters.length)];
        
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);

        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }

        drops[i]++;
      }
    };

    const interval = setInterval(draw, 33);

    return () => {
      clearInterval(interval);
      window.removeEventListener("resize", resizeCanvas);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: "block",
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: 0,
        opacity: 0.5,
        pointerEvents: "none"
      }}
    />
  );
}
