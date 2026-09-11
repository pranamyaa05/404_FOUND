/**
 * "How It Works" section — 5-step visual explainer.
 * Team: frontend / integration
 */
const STEPS = [
  {
    step: "01",
    title: "Choose a Style",
    desc: "Pick from Kurta, Blouse-Saree, Ghagra, or Daily Wear.",
  },
  {
    step: "02",
    title: "Upload Your Design",
    desc: "Share a reference image — we'll clean it up automatically.",
  },
  {
    step: "03",
    title: "Enter Measurements",
    desc: "Provide height, chest, waist, hip and other proportions.",
  },
  {
    step: "04",
    title: "See the 3D Preview",
    desc: "A 3D body mesh wears your dress, adjusted to your exact size.",
  },
  {
    step: "05",
    title: "Get the Pattern",
    desc: "Download tailor-ready 2D die-line cutouts — print and stitch.",
  },
];

export default function HowItWorks() {
  return (
    <section className="py-20 px-4 bg-white">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-4xl font-bold text-center mb-14">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          {STEPS.map((s) => (
            <div key={s.step} className="text-center">
              <div className="w-14 h-14 rounded-full bg-primary/10 text-primary font-bold text-xl flex items-center justify-center mx-auto mb-4">
                {s.step}
              </div>
              <h3 className="font-semibold text-lg mb-2">{s.title}</h3>
              <p className="text-gray-500 text-sm">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
