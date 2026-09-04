import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import { Header, Footer } from '@/components/site/chrome';
import { publications, AuthorNames } from '@/components/site/publication';
export function generateStaticParams() { return publications.map(p=>({slug:p.id})); }
export const dynamicParams = false;
export async function generateMetadata({params}:{params:Promise<{slug:string}>}) {
 const {slug}=await params; const p=publications.find(p=>p.id===slug); return {title:p?.title||'Publication',description:p?`${p.authors}. ${p.venue}, ${p.year}.`:undefined};
}
export default async function Publication({params}:{params:Promise<{slug:string}>}) {
 const {slug}=await params;const p=publications.find(p=>p.id===slug);if(!p)notFound();
 return <><Header active="Publications"/><main id="main" className="inner-page article-page"><a className="back-link" href="/publications/"><ArrowLeft size={17}/> All publications</a><p className="eyebrow">{p.category==='journal'?'Journal article':'Conference contribution'} · {p.year}</p><h1>{p.title}</h1><p className="article-authors"><AuthorNames names={p.authors}/></p><p className="venue">{p.venue}</p><a className="button-dark" href={p.url}>{p.linkLabel||'Find on Google Scholar'} <ArrowUpRight size={18}/></a><div className="citation"><h2>Citation</h2><p>{p.citation}</p></div></main><Footer/></>;
}
