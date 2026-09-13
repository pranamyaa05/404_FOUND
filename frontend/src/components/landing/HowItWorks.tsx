import Link from "next/link";

/**
 * "How It Works" — 5 illustrated steps, each as a large card
 * with a hand-drawn SVG icon, a bold title, and a description.
 */

const STEPS = [
  {
    step: "01",
    color: { pillBg: "bg-[#E4E9E2]", pillText: "text-[#56644C]", cardBg: "bg-[#F4F6F3]", iconText: "text-[#849676]" },
    title: "Choose a Style",
    desc: "Browse our curated collection of Indian ethnic silhouettes — from flowing kurtas to grand ghagras.",
    icon: (
      <svg viewBox="0 0 100 120" fill="none" className="w-16 h-20">
        <path d="M38 10Q50 2 62 10L69 21Q74 27 68 33L60 27V44Q76 58 78 84Q80 100 86 108Q88 112 80 112H20Q12 112 14 108Q20 100 22 84Q24 58 40 44V27L32 33Q26 27 31 21Z"
          stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" fill="none"/>
        <path d="M40 46Q50 51 60 46" fill="none" stroke="currentColor" strokeWidth="1.5"/>
        <circle cx="50" cy="11" r="4" fill="currentColor" opacity="0.3"/>
      </svg>
    ),
  },
  {
    step: "02",
    color: { pillBg: "bg-[#E4E9E2]", pillText: "text-[#56644C]", cardBg: "bg-[#F4F6F3]", iconText: "text-[#849676]" },
    title: "Upload Your Design",
    desc: "Share a reference photo or sketch. Our AI enhances and cleans it up automatically.",
    icon: (
      <svg viewBox="0 0 80 80" fill="none" className="w-16 h-16">
        <rect x="8" y="8" width="64" height="64" rx="6" stroke="currentColor" strokeWidth="2.5" fill="none"/>
        <path d="M8 52L28 36L44 48L56 38L72 52" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" fill="none"/>
        <circle cx="30" cy="28" r="6" stroke="currentColor" strokeWidth="2" fill="none"/>
        <path d="M52 16V28M46 22H58" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    step: "03",
    color: { pillBg: "bg-[#E4E9E2]", pillText: "text-[#56644C]", cardBg: "bg-[#F4F6F3]", iconText: "text-[#849676]" },
    title: "Enter Measurements",
    desc: "Provide your height, chest, waist, and hip. We handle the ease and fit calculations.",
    icon: (
      <svg viewBox="0 0 80 80" fill="none" className="w-16 h-16">
        <path d="M16 10V70" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M16 10H28M16 26H24M16 42H28M16 58H24M16 70H28" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <path d="M40 20L60 20L60 60L40 60Z" stroke="currentColor" strokeWidth="2" strokeDasharray="4 3" fill="none"/>
        <path d="M44 36H56M44 44H52" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
      </svg>
    ),
  },
  {
    step: "04",
    color: { pillBg: "bg-[#E4E9E2]", pillText: "text-[#56644C]", cardBg: "bg-[#F4F6F3]", iconText: "text-[#849676]" },
    title: "See the 3D Preview",
    desc: "A 3D body mesh wears your dress in real-time, adjusted to your exact proportions.",
    icon: (
      <svg viewBox="0 0 80 80" fill="none" className="w-16 h-16">
        <ellipse cx="40" cy="20" rx="10" ry="12" stroke="currentColor" strokeWidth="2.5" fill="none"/>
        <path d="M30 30Q22 36 20 52Q18 64 16 70H64Q62 64 60 52Q58 36 50 30" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" fill="none"/>
        <path d="M34 48Q40 52 46 48" stroke="currentColor" strokeWidth="1.5" fill="none"/>
        <circle cx="60" cy="16" r="8" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 2" fill="none" opacity="0.4"/>
        <path d="M58 14L60 16L63 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.4"/>
      </svg>
    ),
  },
  {
    step: "05",
    color: { pillBg: "bg-[#E4E9E2]", pillText: "text-[#56644C]", cardBg: "bg-[#F4F6F3]", iconText: "text-[#849676]" },
    title: "Get the Pattern",
    desc: "Download tailor-ready 2D die-line cutouts with seam allowances. Print, cut, stitch.",
    icon: (
      <svg viewBox="0 0 80 80" fill="none" className="w-16 h-16">
        <path d="M20 8H52L64 22V72H20Z" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" fill="none"/>
        <path d="M52 8V22H64" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
        <path d="M30 36H54M30 44H54M30 52H46" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.4"/>
        <path d="M30 62L36 56L42 62L48 56" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="0"/>
      </svg>
    ),
  },
];


const ShirtButton = ({ className, size = 60, opacity = 0.5 }: { className?: string; size?: number; opacity?: number }) => (
  <svg 
    viewBox="0 0 60 60" 
    width={size} 
    height={size} 
    className={`absolute pointer-events-none z-0 ${className || ''}`} 
    style={{ opacity }}
  >
    <circle cx="30" cy="30" r="28" fill="rgba(255, 255, 255, 0.6)" stroke="rgba(41, 35, 29, 0.15)" strokeWidth="2" />
    <circle cx="30" cy="30" r="20" fill="none" stroke="rgba(41, 35, 29, 0.1)" strokeWidth="1.5" />
    <circle cx="30" cy="30" r="26" fill="none" stroke="rgba(255, 255, 255, 0.8)" strokeWidth="2" />
    <circle cx="24" cy="24" r="3.5" fill="rgba(41, 35, 29, 0.25)" />
    <circle cx="36" cy="24" r="3.5" fill="rgba(41, 35, 29, 0.25)" />
    <circle cx="24" cy="36" r="3.5" fill="rgba(41, 35, 29, 0.25)" />
    <circle cx="36" cy="36" r="3.5" fill="rgba(41, 35, 29, 0.25)" />
    <path d="M24 24 L36 36 M36 24 L24 36" stroke="rgba(169, 78, 56, 0.4)" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export default function HowItWorks() {

  return (
    <section className="relative py-32 px-4 bg-surface-paper overflow-hidden">
      
      {/* Background Stitch Pattern */}
      <div 
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          opacity: 0.4,
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg stroke='%23a94e38' stroke-width='1.5' fill='none' opacity='0.15'%3E%3Cpath d='M0 40h80M40 0v80' stroke-dasharray='4 8' /%3E%3Cpath d='M16 16l8 8m0-8l-8 8M56 56l8 8m0-8l-8 8' stroke-linecap='round' /%3E%3C/g%3E%3C/svg%3E")`
        }}
      />

      
      <ShirtButton size={120} opacity={0.6} className="top-[5%] left-[-2%] rotate-12" />
      <ShirtButton size={80} opacity={0.4} className="top-[25%] right-[5%] -rotate-12" />
      <ShirtButton size={140} opacity={0.3} className="top-[45%] left-[8%] rotate-45" />
      <ShirtButton size={90} opacity={0.5} className="bottom-[30%] right-[3%] rotate-[60deg]" />
      <ShirtButton size={70} opacity={0.7} className="bottom-[5%] left-[12%] -rotate-45" />

      <div className="max-w-6xl mx-auto relative z-10">

        
        {/* Header */}
        <div className="text-center mb-28">
          <p className="text-primary font-semibold tracking-widest uppercase text-sm mb-4">The Process</p>
          <h2 className="text-5xl md:text-6xl font-serif text-surface-dark mb-6">
            From sketch to <span className="italic">seam</span>
          </h2>
          <p className="text-surface-dark/60 max-w-xl mx-auto text-lg">
            Five simple steps between you and a perfectly tailored garment. We handle the math, you do the designing.
          </p>
        </div>

        {/* Vertical Timeline */}
        <div className="relative space-y-24">
          {/* Central Stitch Line */}
          <div className="hidden md:block absolute left-1/2 -translate-x-1/2 top-4 bottom-4 w-px border-l-2 border-dashed border-primary/20" />

          {STEPS.map((s, i) => {
            const isEven = i % 2 === 0;
            return (
              <div key={s.step} className={`relative flex flex-col md:flex-row items-center gap-12 group ${isEven ? "md:flex-row" : "md:flex-row-reverse"}`}>
                
                {/* Content Side */}
                <div className={`flex-1 flex w-full ${isEven ? 'justify-center md:justify-end md:pr-16' : 'justify-center md:justify-start md:pl-16'}`}>
                  <div className={`max-w-md text-center ${isEven ? 'md:text-right' : 'md:text-left'}`}>
                    <div className={`inline-block px-4 py-1.5 mb-6 rounded-full text-xs font-bold tracking-widest uppercase ${s.color.pillBg} ${s.color.pillText}`}>
                      Step {s.step}
                    </div>
                    <h3 className="text-4xl font-serif text-surface-dark mb-4 leading-tight">{s.title}</h3>
                    <p className="text-surface-dark/60 text-lg leading-relaxed">
                      {s.desc}
                    </p>
                  </div>
                </div>

                {/* Center Node */}
                <div className={`hidden md:flex relative shrink-0 z-10 w-16 h-16 items-center justify-center rounded-full bg-surface-paper shadow-lg border border-surface-dark/5 group-hover:scale-110 transition-transform duration-300 ${s.color.iconText}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${s.color.pillBg}`}>
                    <span className={`w-2.5 h-2.5 rounded-full ${s.color.pillBg} `} />
                  </div>
                </div>

                {/* Icon Side */}
                <div className={`flex-1 flex w-full ${isEven ? 'justify-center md:justify-start md:pl-16' : 'justify-center md:justify-end md:pr-16'}`}>
                  <div className={`w-56 h-56 md:w-64 md:h-64 rounded-3xl shadow-[0_8px_30px_rgba(41,35,29,0.08)] flex items-center justify-center border border-surface-dark/5 ${s.color.cardBg} transition-all duration-500 group-hover:scale-105 group-hover:-rotate-3 group-hover:shadow-[0_20px_40px_rgba(41,35,29,0.12)] ${s.color.iconText}`}>
                    <div className="transform scale-125">
                      {s.icon}
                    </div>
                  </div>
                </div>

              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div className="text-center mt-32 relative z-20">
          <Link href="/studio" className="cta text-xl px-10 py-5 inline-flex items-center gap-2">
            Enter the Studio <span>→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
