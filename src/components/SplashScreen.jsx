import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function SplashScreen({ onFinish }) {
  const [hide, setHide] = useState(false);
  const audioRef = useRef(null);

  /* =========================
     INTRO SOUND
  ========================= */
  useEffect(() => {
    const revealSound = new Audio("/sounds/intro.wav");
    revealSound.volume = 0.4; // Slightly compressed for mixing clarity
    audioRef.current = revealSound;

    const unlockAudio = () => {
      audioRef.current?.play().catch(console.error);
    };

    document.addEventListener("click", unlockAudio, { once: true });
    return () => {
      document.removeEventListener("click", unlockAudio);
    };
  }, []);

  /* =========================
     SPLASH TIMER
  ========================= */
  useEffect(() => {
    const timer = setTimeout(() => {
      setHide(true);
      setTimeout(() => {
        if (onFinish) onFinish();
      }, 1000); // Clean 1s execution offset
    }, 3500); // Adjusted slightly for dramatic stabilization

    return () => {
      clearTimeout(timer);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [onFinish]);

  return (
    <AnimatePresence>
      {!hide && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          style={{
            position: "fixed",
            inset: 0,
            background: "radial-gradient(circle at center, #090f1c 0%, #03060d 100%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 999999,
            overflow: "hidden",
            willChange: "opacity",
          }}
        >
          {/* 🌌 CYBER MESH BACKGROUND GRID */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: `
                linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)
              `,
              backgroundSize: "40px 40px",
              backgroundPosition: "center",
              maskImage: "radial-gradient(circle, black 30%, transparent 80%)",
              WebkitMaskImage: "radial-gradient(circle, black 30%, transparent 80%)",
              opacity: 0.6,
            }}
          />

          {/* ⚡ CENTRAL NEXUS GLOW CORE */}
          <motion.div
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{
              opacity: [0, 0.4, 0.25],
              scale: [0.7, 1.3, 1.5],
            }}
            transition={{ duration: 3.5, ease: "easeOut" }}
            style={{
              position: "absolute",
              width: "500px",
              height: "500px",
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(0, 198, 255, 0.2) 0%, rgba(0,0,0,0) 70%)",
              filter: "blur(50px)",
              pointerEvents: "none",
              willChange: "transform, opacity",
            }}
          />

          {/* MAIN CONTENT WRAPPER */}
<div
  style={{
    transform: "translateY(-10vh)", // Adjusted slightly for the larger logo
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    zIndex: 10,
  }}
>
  {/* 💎 THE RE-MASTERED LOGO */}
  <motion.img
    src="/logo2.png"
    alt="SK Nexus"
    initial={{ 
      scale: 0.7, 
      opacity: 0, 
      rotate: -2 // Tiny rotation for a more dynamic "entrance"
    }}
    animate={{ 
      scale: 1, 
      opacity: 1,
      rotate: 0 
    }}
    transition={{
      duration: 2,
      ease: [0.19, 1, 0.22, 1], // Classic high-end "slow-down" easing
    }}
    style={{
      width: "520px", // 🚀 Large size is back!
      maxWidth: "85vw",
      marginBottom: "10px",
      filter: "drop-shadow(0 0 50px rgba(0, 198, 255, 0.3))",
      
      /* 🛡️ THE ANTI-SHAKE FIXES */
      willChange: "transform, opacity",
      backfaceVisibility: "hidden",
      WebkitFontSmoothing: "antialiased",
      transformPerspective: 1000
    }}
  />

  {/* 🔥 SK NEXUS TITAN HEADLINE */}
  <motion.h1
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{
      delay: 0.8, // Wait for logo to settle
      duration: 1.2,
      ease: "easeOut",
    }}
    style={{
      margin: 0,
      color: "#ffffff",
      fontSize: "62px", // 🚀 Bold and clear
      fontWeight: "900",
      fontFamily: "system-ui, -apple-system, sans-serif",
      textTransform: "uppercase",
      textAlign: "center",
      letterSpacing: "14px", // Wide tracking for that "Nexus" feel
      textShadow: "0 0 30px rgba(0, 198, 255, 0.4)",
    }}
  >
    SK NEXUS
  </motion.h1>

  {/* 🚀 SUBTITLE */}
  <motion.p
    initial={{ opacity: 0 }}
    animate={{ opacity: 0.6 }}
    transition={{ delay: 1.8, duration: 1 }}
    style={{
      margin: 0,
      marginTop: "10px",
      color: "#8da2fb",
      fontSize: "12px",
      fontWeight: "500",
      letterSpacing: "8px",
      textTransform: "uppercase",
      fontFamily: "monospace"
    }}
  >
    Unified Business Ecosystem
  </motion.p>
</div>

          {/* ✈️ PREMIUM HORIZONTAL LIGHT SWEEP */}
          <motion.div
            initial={{ x: "-100%", skewX: -30 }}
            animate={{ x: "200%" }}
            transition={{
              duration: 2.2,
              delay: 0.6,
              ease: [0.25, 1, 0.5, 1],
            }}
            style={{
              position: "absolute",
              top: 0,
              width: "450px",
              height: "100%",
              background: "linear-gradient(90deg, transparent, rgba(0, 198, 255, 0.15), transparent)",
              zIndex: 12,
              pointerEvents: "none",
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}