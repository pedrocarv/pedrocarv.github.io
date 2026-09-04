import { ArrowUpRight } from 'lucide-react';
import { Header, Footer, PageHeading, scholarUrl } from '@/components/site/chrome';
import { publications, PublicationRow } from '@/components/site/publication';
export const metadata = {title:'Publications',description:'Journal articles and conference contributions by Pedro Silva in space physics and computational modeling.'};
export default function Publications() {
 return <><Header active="Publications"/><main id="main" className="inner-page"><PageHeading label="Research output" title="Publications"><p>Journal articles and conference contributions, from ionospheric outflow to ring current dynamics.</p><a className="text-link" href={scholarUrl}>Google Scholar profile <ArrowUpRight size={17}/></a></PageHeading><section aria-labelledby="journals-title" className="publication-group"><div className="group-heading"><h2 id="journals-title">Journal articles</h2><span>02</span></div>{publications.filter(p=>p.category==='journal').map(p=><PublicationRow key={p.id} item={p}/>)}</section><section aria-labelledby="conferences-title" className="publication-group"><div className="group-heading"><h2 id="conferences-title">Conference contributions</h2><span>08</span></div>{publications.filter(p=>p.category==='conference').map(p=><PublicationRow key={p.id} item={p}/>)}</section></main><Footer/></>;
}
