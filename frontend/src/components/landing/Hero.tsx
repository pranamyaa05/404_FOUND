import Link from "next/link";

/**
 * Hero section on the landing page.
 * Team: frontend / integration
 */
export default function Hero() {
  return (
    <section className="min-h-screen flex flex-col items-center justify-center bg-surface-dark text-white text-center px-4">
      <h1 className="text-5xl md:text-7xl font-extrabold mb-6 leading-tight">
        Stitch<span className="text-primary-light">Smart</span>
      </h1>
      <p className="text-xl md:text-2xl text-gray-300 max-w-2xl mb-10">
        Upload your dress design, set your measurements, and visualize a perfect
        fit — with tailor-ready patterns generated automatically.
      </p>
      <div className="flex gap-4 flex-wrap justify-center">
        <Link href="/studio" className="btn-primary text-lg">
          Start Designing →
        </Link>
        <Link href="/suggest" className="btn-outline text-lg border-primary-light text-primary-light hover:bg-primary hover:border-primary hover:text-white">
          Ask BOB ✨
        </Link>
        <Link href="/styles" className="btn-outline text-lg border-white text-white hover:bg-white hover:text-surface-dark">
          Explore Styles
        </Link>
      </div>
      <p className="text-gray-600 text-sm mt-8">
        BOB is always here — click the avatar at the bottom-right to chat.
      </p>
    </section>
  );
}
