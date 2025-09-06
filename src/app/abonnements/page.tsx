import HeaderSection from "./components/HeaderSection";
import PlansSection from "./components/PlanSection";
import AvantagesSection from "./components/AvantagesSection";


export default function AbonnementsPage() {
  return (
    // -> on force un wrapper blanc sur toute la hauteur viewport
    <main className="bg-[#edfbe2] min-h-screen">
      <HeaderSection />
      <PlansSection />
            <div aria-hidden className="px-4">
               <div className="max-w-7xl mx-auto my-10 h-px bg-gradient-to-r from-transparent via-[#54b435]/30 to-transparent" />
            </div>
      <AvantagesSection />
    </main>
  );
}