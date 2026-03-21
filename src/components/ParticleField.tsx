import React, { useEffect, useRef, useState, useCallback } from 'react';

interface Particle {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  size: number;
  baseSize: number;
  color: string;
  alpha: number;
  baseAlpha: number;
  speed: number;
  angle: number;
  radius: number;
  phase: number;
  twinkleSpeed: number;
  twinklePhase: number;
}

const PARTICLE_COLORS = [
  'rgba(255, 255, 255, ',
  'rgba(196, 181, 253, ',
  'rgba(165, 180, 252, ',
  'rgba(252, 231, 243, ',
  'rgba(254, 243, 199, ',
  'rgba(186, 230, 253, ',
  'rgba(129, 140, 248, ',
  'rgba(244, 114, 182, ',
  'rgba(192, 132, 252, ',
];

export const ParticleField: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const animationFrameRef = useRef<number | null>(null);
  const mouseRef = useRef({ x: -1000, y: -1000 });

  const initParticles = useCallback(() => {
    const particles: Particle[] = [];
    const particleCount = Math.min(300, Math.floor((windowSize.width * windowSize.height) / 6000));
    
    for (let i = 0; i < particleCount; i++) {
      const centerX = windowSize.width / 2;
      const centerY = windowSize.height / 2;
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * Math.max(windowSize.width, windowSize.height) * 0.85;
      
      particles.push({
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
        baseX: centerX + Math.cos(angle) * radius,
        baseY: centerY + Math.sin(angle) * radius,
        size: Math.random() * 3.5 + 0.8,
        baseSize: Math.random() * 3.5 + 0.8,
        color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
        alpha: Math.random() * 0.7 + 0.15,
        baseAlpha: Math.random() * 0.7 + 0.15,
        speed: Math.random() * 0.0015 + 0.0005,
        angle: angle,
        radius: radius,
        phase: Math.random() * Math.PI * 2,
        twinkleSpeed: Math.random() * 0.03 + 0.01,
        twinklePhase: Math.random() * Math.PI * 2,
      });
    }
    particlesRef.current = particles;
  }, [windowSize]);

  useEffect(() => {
    initParticles();

    let resizeTimeout: number | null = null;
    const handleResize = () => {
      if (resizeTimeout) clearTimeout(resizeTimeout);
      resizeTimeout = window.setTimeout(() => {
        setWindowSize({ width: window.innerWidth, height: window.innerHeight });
      }, 150);
    };
    
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      if (resizeTimeout) clearTimeout(resizeTimeout);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [initParticles]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const timeRef = { value: 0 };

    const animate = () => {
      ctx.clearRect(0, 0, windowSize.width, windowSize.height);
      timeRef.value += 0.006;

      particlesRef.current.forEach((particle) => {
        particle.angle += particle.speed;
        const centerX = windowSize.width / 2;
        const centerY = windowSize.height / 2;
        
        const orbitX = Math.cos(particle.angle) * particle.radius;
        const orbitY = Math.sin(particle.angle) * particle.radius;
        const waveX = Math.sin(timeRef.value * 0.3 + particle.phase) * 40;
        const waveY = Math.cos(timeRef.value * 0.2 + particle.phase) * 25;
        
        particle.x = centerX + orbitX + waveX;
        particle.y = centerY + orbitY + waveY;

        const dxToMouse = particle.x - mouseRef.current.x;
        const dyToMouse = particle.y - mouseRef.current.y;
        const distanceToMouse = Math.sqrt(dxToMouse * dxToMouse + dyToMouse * dyToMouse);
        
        let offsetX = 0;
        let offsetY = 0;
        
        if (distanceToMouse < 250) {
          const force = (250 - distanceToMouse) / 250;
          const angleToMouse = Math.atan2(dyToMouse, dxToMouse);
          offsetX = Math.cos(angleToMouse) * force * 70;
          offsetY = Math.sin(angleToMouse) * force * 70;
        }

        const twinkle = Math.sin(timeRef.value * particle.twinkleSpeed * 10 + particle.twinklePhase);
        const breathe = Math.sin(timeRef.value * 1.2 + particle.phase) * 0.25 + 1;
        const finalSize = particle.baseSize * breathe * (0.7 + twinkle * 0.5);
        const alphaBreathe = Math.sin(timeRef.value * 0.8 + particle.phase) * 0.15 + 1;
        const finalAlpha = particle.baseAlpha * alphaBreathe * (0.6 + twinkle * 0.5);

        const finalX = particle.x + offsetX;
        const finalY = particle.y + offsetY;

        const outerGlow = ctx.createRadialGradient(finalX, finalY, 0, finalX, finalY, finalSize * 12);
        outerGlow.addColorStop(0, particle.color + finalAlpha * 0.6 + ')');
        outerGlow.addColorStop(0.2, particle.color + finalAlpha * 0.25 + ')');
        outerGlow.addColorStop(1, 'transparent');

        ctx.fillStyle = outerGlow;
        ctx.beginPath();
        ctx.arc(finalX, finalY, finalSize * 12, 0, Math.PI * 2);
        ctx.fill();

        const innerGlow = ctx.createRadialGradient(finalX, finalY, 0, finalX, finalY, finalSize * 4);
        innerGlow.addColorStop(0, 'rgba(255, 255, 255, ' + (finalAlpha * 0.9) + ')');
        innerGlow.addColorStop(0.4, particle.color + finalAlpha * 0.7 + ')');
        innerGlow.addColorStop(1, 'transparent');

        ctx.fillStyle = innerGlow;
        ctx.beginPath();
        ctx.arc(finalX, finalY, finalSize * 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(255, 255, 255, ' + (finalAlpha * 0.95) + ')';
        ctx.beginPath();
        ctx.arc(finalX, finalY, finalSize, 0, Math.PI * 2);
        ctx.fill();
      });

      const connectionCount = Math.min(particlesRef.current.length, 120);
      for (let i = 0; i < connectionCount; i++) {
        const particle = particlesRef.current[i];
        for (let j = i + 1; j < connectionCount; j++) {
          const other = particlesRef.current[j];
          const dx = particle.x - other.x;
          const dy = particle.y - other.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 150) {
            const opacity = (150 - distance) / 150 * 0.06;
            ctx.beginPath();
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(other.x, other.y);
            const gradient = ctx.createLinearGradient(particle.x, particle.y, other.x, other.y);
            gradient.addColorStop(0, `rgba(165, 180, 252, ${opacity})`);
            gradient.addColorStop(0.5, `rgba(196, 181, 253, ${opacity * 1.2})`);
            gradient.addColorStop(1, `rgba(252, 231, 243, ${opacity})`);
            ctx.strokeStyle = gradient;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [windowSize]);

  return (
    <canvas
      ref={canvasRef}
      width={windowSize.width}
      height={windowSize.height}
      className="fixed top-0 left-0 w-full h-full pointer-events-none z-0"
    />
  );
};
