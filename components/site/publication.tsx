import { ArrowUpRight } from 'lucide-react';
import publications from '@/lib/publications.json';
export { publications };
export type Publication = (typeof publications)[number];
export function AuthorNames({names}: {names:string}) {
  return <>{names.split(/(Pedro Silva|Pedro Oliveira|P\. Silva|P Silva)/g).map((part,i)=>/^(Pedro Silva|Pedro Oliveira|P\. Silva|P Silva)$/.test(part)?<strong key={i}>{part}</strong>:part)}</>;
}
export function PublicationRow({item}: {item:Publication}) {
 return <article className="publication-row" id={item.id}><div className="publication-meta"><span>{item.year}</span><span>{item.category==='journal'?'Journal article':'Conference contribution'}</span></div><div><h3><a href={`/publication/${item.id}/`}>{item.title}</a></h3><p className="authors"><AuthorNames names={item.authors}/></p><p className="venue">{item.venue}</p><a className="publication-link" href={item.url}>{item.linkLabel||'Find on Google Scholar'} <ArrowUpRight size={15}/></a></div></article>;
}
