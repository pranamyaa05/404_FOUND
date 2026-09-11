import stylesData from "../../../data/styles.json";

/**
 * /styles — Informational page listing all dress styles
 * Useful for design students and curious users.
 * Content is sourced from /data/styles.json
 */
export default function StylesPage() {
  return (
    <main className="max-w-5xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold mb-2">Dress Styles Guide</h1>
      <p className="text-gray-500 mb-10">
        Explore Indian dress styles, their fabric options, and occasions.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {stylesData.map((style) => (
          <div key={style.id} className="card hover:shadow-xl transition-shadow">
            <h2 className="text-xl font-semibold text-primary mb-1">
              {style.name}
            </h2>
            <p className="text-sm text-gray-500 mb-3">{style.origin}</p>
            <p className="text-gray-700 text-sm mb-4">{style.description}</p>

            <div className="mb-2">
              <span className="text-xs font-semibold uppercase text-gray-400">
                Fabrics
              </span>
              <div className="flex flex-wrap gap-1 mt-1">
                {style.fabrics.map((f) => (
                  <span
                    key={f}
                    className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full"
                  >
                    {f}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <span className="text-xs font-semibold uppercase text-gray-400">
                Best For
              </span>
              <p className="text-sm text-gray-600 mt-1">
                {style.occasions.join(", ")}
              </p>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
