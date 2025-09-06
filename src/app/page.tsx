// src/app/page.tsx
import HeaderSection from "@/app/home/HeaderSection";
import ImpactSection from "@/app/home/ImpactSection";
import WhySection from "@/app/home/WhySection";
import AvisSection from "@/app/home/AvisSection";
import ServicesSection from "@/app/home/ServicesSections";
import FAQSection from "@/app/home/FAQSection";

import SectionSeam from "@/components/SectionSeam";

export default function HomePage() {
  return (
    <>
      <HeaderSection />
      <ImpactSection />
      <WhySection />
            <SectionSeam from="#edfbe2" to="#ffffff" height={84} />
      <AvisSection />
            <SectionSeam from="#ffffff" to="#edfbe2" height={84} />
      <ServicesSection />
      <FAQSection />
    </>
  );
}
