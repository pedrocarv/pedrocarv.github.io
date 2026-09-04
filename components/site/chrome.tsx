import { ArrowUpRight } from 'lucide-react';
export const scholarUrl = 'https://scholar.google.com/citations?user=EUgeMMkAAAAJ&hl=en';
export function Header({active}: {active?: string}) {
  return <><a className="skip-link" href="#main">Skip to content</a><header className="site-header"><a className="wordmark" href="/" aria-label="Pedro Silva home">Pedro Silva<span>.</span></a><nav aria-label="Main navigation"><a href="/#research">Research</a>{['Publications','Talks','Teaching'].map(label=><a key={label} href={`/${label.toLowerCase()}/`} aria-current={active===label?'page':undefined}>{label}</a>)}<a className="nav-contact" href="#contact">Get in touch <ArrowUpRight size={16}/></a></nav></header></>;
}
export function Footer() {
  return <footer id="contact" className="footer"><div className="footer-inner"><div><p className="eyebrow">Contact</p><h2>Let’s talk <em>space physics.</em></h2><a className="email-link" href="mailto:pedroos2@illinois.edu">pedroos2@illinois.edu <ArrowUpRight size={22}/></a></div><div className="footer-links"><a href={scholarUrl}>Google Scholar <ArrowUpRight size={16}/></a><a href="https://github.com/pedrocarv">GitHub <ArrowUpRight size={16}/></a><span>University of Illinois<br/>Urbana–Champaign</span></div></div><div className="footer-bottom"><a className="wordmark" href="/">Pedro Silva<span>.</span></a><span>Computational space physics · Champaign, Illinois</span><a href="#main">Back to top ↑</a></div></footer>;
}
export function PageHeading({label,title,children}: {label:string,title:string,children:React.ReactNode}) {
 return <div className="page-heading"><p className="eyebrow">{label}</p><h1>{title}<span>.</span></h1><div className="page-description">{children}</div></div>;
}
