import Link from "next/link";
import stylesData from "../../../../data/styles.json";

/**
 * Landing page preview of dress styles (shows first 3).
 * Links to /styles for the full list.
 */
export default function StylesSection() {
  const preview = stylesData.slice(0, 3);

  return (
    <section className="py-24 px-4 bg-surface">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-4">
          <p className="eyebrow-thread justify-center mb-3">The Library</p>
          <h2 className="text-4xl md:text-5xl font-medium text-surface-dark mb-4">
            Dress styles, catalogued
          </h2>
          <p className="text-surface-dark/60 max-w-md mx-auto">
            From classic kurtas to grand ghagras — explore what we support.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4 mt-14">
          {preview.map((style) => (
            <div key={style.id} className="card">
              <div className="text-3xl mb-3">{style.emoji}</div>
              <h3 className="font-serif text-xl italic text-primary-dark mb-1">
                {style.name}
              </h3>
              <p className="text-xs text-surface-dark/50 mb-3">{style.origin}</p>
              <p className="text-surface-dark/70 text-sm leading-relaxed mb-4">
                {style.description}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {style.fabrics.slice(0, 3).map((f) => (
                  <span key={f} className="swatch-tag">
                    {f}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link href="/styles" className="btn-primary">
            View All Styles →
          </Link>
        </div>
      </div>
    </section>
  );
}
