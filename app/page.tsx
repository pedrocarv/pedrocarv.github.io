import { ArrowDown, ArrowUpRight } from 'lucide-react';
import { Header, Footer, scholarUrl } from '@/components/site/chrome';
import { publications, PublicationRow } from '@/components/site/publication';
export default function Home() {
  return <>
    <Header/>
    <main id="main">
      <section className="hero" aria-labelledby="hero-title">
        <figure className="hero-image"><img src="/images/magnetosphere.webp" width="1200" height="1122" alt="Illustration of solar wind meeting Earth's magnetosphere, with blue magnetic field lines surrounding Earth." fetchPriority="high" /><figcaption>Earth’s magnetosphere · NASA / GSFC</figcaption></figure>
        <div className="hero-content"><p className="eyebrow"><span className="status-dot" /> Computational space physics</p><h1 id="hero-title">Modeling Earth’s<br /><em>magnetosphere.</em></h1><p className="hero-description">I’m Pedro Silva, a Ph.D. candidate studying how particles, fields, and plasma shape Earth’s space environment.</p><p className="hero-affiliation">Electrical &amp; Computer Engineering<br />University of Illinois Urbana–Champaign</p><a className="button-light" href="#research">Explore my research <ArrowDown size={18} /></a></div>
        <div className="hero-foot"><span>HEIDI · BATS-R-US · SWMF</span><span>Champaign, Illinois</span></div>
      </section>
      <section id="research" className="section research-section">
        <div className="section-heading"><p className="eyebrow">01 / Research</p><h2>Small particles.<br /><em>System-wide effects.</em></h2></div>
        <div className="research-intro"><p>How do heavy ions influence the way Earth’s magnetosphere responds to a geomagnetic storm?</p><p>I develop physics-based computational models to investigate ring current decay, plasmaspheric refilling, and the connections between them.</p><a className="text-link" href="/publications/">Explore publications <ArrowUpRight size={18} /></a></div>
        <div className="research-areas">
          <article><div className="research-symbol" aria-hidden="true">O<sup>+</sup> <span>N<sup>+</sup></span></div><p className="eyebrow">01 / Plasma composition</p><h3>Heavy ions &amp; the ring current</h3><p>Investigating how heavy ion populations shape ring current decay and plasmaspheric refilling during geomagnetic storms.</p></article>
          <article><div className="research-symbol research-symbol-code" aria-hidden="true">HEIDI<span> ↔ MHD</span></div><p className="eyebrow">02 / Coupled modeling</p><h3>Connecting scales of space physics</h3><p>Developing the Hot Electron–Ion Drift Integrator and its coupling to BATS-R-US within the Space Weather Modeling Framework.</p></article>
          <article><div className="research-symbol research-symbol-code" aria-hidden="true">HPC<span> + AI</span></div><p className="eyebrow">03 / Computational methods</p><h3>Physical fidelity, at scale</h3><p>Combining high-performance computing with an interest in graph neural networks and diffusion-based surrogates for space weather modeling.</p></article>
        </div>
      </section>
      <div className="tinted-surface"><section className="section selected-section" aria-labelledby="selected-title"><div className="section-topline"><div><p className="eyebrow">02 / Selected work</p><h2 id="selected-title">Research in focus.</h2></div><a className="text-link" href="/publications/">All publications <ArrowUpRight size={18}/></a></div>{publications.filter(p=>p.title.includes('Variability of Earth')||p.title.includes('influence of ring current')).map(p=><PublicationRow key={p.id} item={p}/>)}</section></div>
      <section id="about" className="section about-section" aria-labelledby="about-title"><figure className="about-photo"><img src="/images/pedro-silva.png" width="458" height="442" loading="lazy" alt="Pedro Silva presenting his research at AGU 2024"/><figcaption>Sharing research at AGU 2024.</figcaption></figure><div className="about-copy"><p className="eyebrow">03 / About me</p><h2 id="about-title">Pedro Silva<span className="accent-dot">.</span></h2><p>I’m a Ph.D. candidate in Electrical and Computer Engineering at the University of Illinois Urbana–Champaign, advised by Prof. Raluca Ilie.</p><p>My work sits at the intersection of space physics, high-performance computing, and machine learning. I’m interested in building models that bring together physical fidelity and computational scalability.</p><p>I also teach electromagnetics, using interactive visualization to help students connect field theory with physical intuition.</p><div className="about-links"><a className="text-link" href={scholarUrl}>Google Scholar <ArrowUpRight size={17}/></a><a className="text-link" href="https://github.com/pedrocarv">GitHub <ArrowUpRight size={17}/></a><a className="text-link" href="/teaching/">Teaching <ArrowUpRight size={17}/></a></div></div></section>
    </main>
    <Footer/>
  </>;
}
