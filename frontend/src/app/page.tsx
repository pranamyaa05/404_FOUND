import Hero from "@/components/landing/Hero";
import HowItWorks from "@/components/landing/HowItWorks";

/**
 * Landing page — shown when user visits "/"
 * Links to /studio for the main app workflow
 */
export default function HomePage() {
  return (
    <main>
      <Hero />
      <HowItWorks />
    </main>
  );
}
