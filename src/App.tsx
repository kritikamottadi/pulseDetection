import Navbar from './components/Navbar';
import HeroSection from './components/HeroSection';
import AnalyzeSection from './components/AnalyzeSection';
import HowItWorksSection from './components/HowItWorksSection';
import Footer from './components/Footer';

export default function App() {
  const scrollToSection = (sectionId: string) => {
    const target = document.getElementById(sectionId);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0B1220] text-slate-100">
      <Navbar onNavigate={scrollToSection} />

      <main className="flex-1">
        <HeroSection onTryNow={() => scrollToSection('analyze')} />
        <AnalyzeSection />
        <HowItWorksSection />
      </main>

      <Footer />
    </div>
  );
}
