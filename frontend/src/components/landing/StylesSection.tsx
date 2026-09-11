import Link from "next/link";
import stylesData from "../../../../data/styles.json";

/**
 * Landing page preview of dress styles (shows first 3).
 * Links to /styles for the full list.
 */
export default function StylesSection() {
  const preview = stylesData.slice(0, 3);

  return (
    <section className="py-20 px-4 bg-surface">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-4xl font-bold text-center mb-4">
          Dress Style Library
        </h2>
        <p className="text-center text-gray-500 mb-12">
          From classic kurtas to grand ghagras — explore what we support.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {preview.map((style) => (
            <div key={style.id} className="card">
              <h3 className="text-xl font-semibold text-primary mb-1">
                {style.name}
              </h3>
              <p className="text-sm text-gray-500 mb-2">{style.origin}</p>
              <p className="text-gray-700 text-sm">{style.description}</p>
            </div>
          ))}
        </div>

        <div className="text-center">
          <Link href="/styles" className="btn-primary">
            View All Styles →
          </Link>
        </div>
      </div>
    </section>
  );
}
