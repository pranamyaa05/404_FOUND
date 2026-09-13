"use client";
import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import '@/app/landing.css';

export default function Hero() {
  const stageRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!stageRef.current) return;
    
    const stage = stageRef.current;
    const fabrics = Array.from(stage.querySelectorAll('.fabric')) as HTMLElement[];
    const cards = Array.from(stage.querySelectorAll('.atelier-card')) as HTMLElement[];
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    let mx = -1000, my = -1000;
    
    const handleMove = (e: PointerEvent) => {
        const r = stage.getBoundingClientRect();
        mx = e.clientX - r.left;
        my = e.clientY - r.top;
    };
    const handleLeave = () => {
        mx = -1000; my = -1000;
    };
    
    stage.addEventListener('pointermove', handleMove as EventListener);
    stage.addEventListener('pointerleave', handleLeave);

    const STIFFNESS = 0.005; 
    const DAMPING = 0.95;    
    const PUSH_STR = 0.35;    

    const data = fabrics.map((el) => ({
      el, 
      side: Number(el.dataset.side), 
      depth: Number(el.dataset.depth), 
      baseRot: Number(el.dataset.base), 
      angle: Number(el.dataset.base),   
      velocity: 0,               
      prevVelocity: 0,
      y3D: 0,          
      vy3D: 0,
      bend: 0,
      bendVelocity: 0
    }));

    let t = 0, last = performance.now();
    let animationFrameId: number;

    function frame(now: number){
      const dt = Math.min(40, now-last)/1000; 
      last = now; 
      t += dt;

      cards.forEach((c, i) => {
        const sway = reduce ? 0 : Math.sin(t * 0.7 + i * 1.8) * 1.8;
        const side = i ? -1 : 1;
        c.style.transform = `translateY(${sway.toFixed(1)}px) rotate(${(sway * side).toFixed(2)}deg)`;
      });

      data.forEach(d => {
        if (!reduce) {
          const rect = d.el.getBoundingClientRect();
          const stageRect = stage.getBoundingClientRect();
          const centerX = (rect.left + rect.right) / 2 - stageRect.left;
          const centerY = (rect.top + rect.bottom) / 2 - stageRect.top;
          
          const dx = centerX - mx;
          const dy = centerY - my;
          const dist = Math.sqrt(dx*dx + dy*dy);
          
          if (dist < 220) {
             const force = (220 - dist) / 220;
             const pushDir = d.side; 
             const hitY = Math.max(0, Math.min(1, (my - rect.top) / rect.height));
             
             d.velocity += pushDir * force * PUSH_STR * (1 - hitY) * d.depth;
             d.bendVelocity += pushDir * force * (PUSH_STR * 1.5) * hitY * d.depth;
             d.vy3D += pushDir * force * 0.4 * d.depth;
          }

          d.prevVelocity = d.velocity;
          const forceAngle = (d.baseRot - d.angle) * STIFFNESS;
          d.velocity += forceAngle;
          d.velocity *= DAMPING; 
          d.angle += d.velocity;
          
          const topAccel = d.velocity - d.prevVelocity;
          d.bendVelocity += -topAccel * 0.8; 
          
          d.bendVelocity += (0 - d.bend) * (STIFFNESS * 1.5);
          d.bendVelocity *= (DAMPING * 0.98);
          d.bend += d.bendVelocity;

          const force3D = (0 - d.y3D) * (STIFFNESS * 2);
          d.vy3D += force3D;
          d.vy3D *= 0.94; 
          d.y3D += d.vy3D;
        }

        d.el.style.transform = `
            perspective(1000px) 
            rotateZ(${d.angle.toFixed(2)}deg) 
            rotateY(${d.y3D.toFixed(2)}deg) 
            skewX(${d.bend.toFixed(2)}deg)
        `;
      });

      animationFrameId = requestAnimationFrame(frame);
    }
    
    animationFrameId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(animationFrameId);
      stage.removeEventListener('pointermove', handleMove as EventListener);
      stage.removeEventListener('pointerleave', handleLeave);
    };
  }, []);

  return (
    <main className="stage" id="stage" ref={stageRef} style={{ background: 'radial-gradient(circle at 50% 38%,#fbf5e9 0,#eee2cd 48%,#d8c5a5 100%)' }}>
      <div className="atelier" aria-hidden="true">
        <div className="wall"></div><div className="floor"></div><div className="window-light"></div><div className="rug"></div>
        <div className="shelf left"></div><div className="shelf right"></div>
        <div className="frames"><i className="frame"></i><i className="frame"></i><i className="frame"></i></div>
        <div className="plant"><i></i><i></i><i></i><div className="pot"></div></div>
        <div className="form"><div className="neck"></div><div className="body"></div><div className="pole"></div><div className="foot"></div></div>
      </div>

      <section className="hero">
        <div className="hero-inner">
          <p className="eyebrow">StitchSmart</p>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <div className="craft-detail spool-detail" aria-hidden="true" style={{ top: '-10px', left: '-55px' }}>
              <span className="spool"><span className="thread"></span></span>
            </div>
            <div className="craft-detail scissors-detail" aria-hidden="true" style={{ top: 'auto', bottom: '-15px', right: '-75px' }}>
              <span className="scissors"><i className="blade"></i><i className="blade2"></i></span>
            </div>
            <h1>Your Fit <em>Reimagined</em></h1>
          </div>
          <p className="sub">Try. Design. Tailor.</p>
          
          <div className="cta-wrap" style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <Link href="/studio" className="cta" style={{ minWidth: 'auto', padding: '15px 30px', fontSize: '22px' }}>
              Start Designing <span>→</span>
            </Link>
            
            <Link href="/suggest" className="cta" style={{ minWidth: 'auto', padding: '15px 30px', fontSize: '22px' }}>
              Ask BOB 
            </Link>
            
            <Link href="/styles" className="cta" style={{ minWidth: 'auto', padding: '15px 30px', fontSize: '22px' }}>
              Explore Styles
            </Link>
          </div>
          <p style={{ marginTop: '30px', fontSize: '14px', color: '#746858' }}>
            BOB is always here — click the avatar at the bottom-right to chat.
          </p>
        </div>
      </section>

      <div className="fabric-stage" aria-hidden="true">
        <div className="left">
          <div className="fabric floral" data-side="-1" data-depth=".55" data-base="-3"></div>
          <div className="fabric denim" data-side="-1" data-depth="1.05" data-base="-7"></div>
          <div className="fabric pattern" data-side="-1" data-depth=".65" data-base="-1.5"></div>
          <div className="fabric sage" data-side="-1" data-depth=".78" data-base="-4"></div>
        </div>
        <div className="right">
          <div className="fabric rust" data-side="1" data-depth="1.0" data-base="5"></div>
          <div className="fabric linen" data-side="1" data-depth=".72" data-base="3"></div>
          <div className="fabric pattern" data-side="1" data-depth=".6" data-base="1.5"></div>
          <div className="fabric bluefloral" data-side="1" data-depth=".82" data-base="5"></div>
        </div>
      </div>

      <aside className="atelier-card left">
        <span className="string"></span><div className="hole"></div>
        <svg className="atelier-icon" viewBox="0 0 48 48" fill="none" stroke="#302820" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="24" cy="8.5" r="4.8"/><path d="M17 18c1.9-2.4 4.1-3.5 7-3.5s5.1 1.1 7 3.5l3.2 6.2-4.2 2.2-2.4-4.3v14.2h-4.1V26.1h-3v10.2h-4.1V24.1l-2.4 4.3-4.2-2.2L17 18Z"/>
        </svg>
        <h3>For You</h3><p>See how a design fits your body and skin tone.</p><div className="rule"></div>
      </aside>

      <aside className="atelier-card right">
        <span className="string"></span><div className="hole"></div>
        <svg className="atelier-icon" viewBox="0 0 48 48" fill="none" stroke="#302820" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M8 35h31M11 34V19h14c4.2 0 7 2.4 7 6v9M25 19v-6h9l3 6v15M13 25h7M33 13v-3M36 10h2"/>
          <circle cx="29" cy="24" r="1.7" fill="#302820"/><path d="M9 36h31"/>
        </svg>
        <h3>For Tailors</h3><p>Instant 2D die-lines and production-ready patterns.</p><div className="rule"></div>
      </aside>
    </main>
  );
}
