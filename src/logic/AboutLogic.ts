import { useCms } from '../cms/CmsContext';
import { c } from '../theme';
import D from '../cms/defaults.generated.json';
import { siteView } from '../cms/siteSettings';

export function useAboutLogic() {

    const cms = useCms();
    const site = siteView(cms<unknown>('site.settings', D['site.settings']));
    const siteX = { ...site, telIndia: site.phoneIndia.replace(/[^+0-9]/g, ''), telQatar: site.phoneQatar.replace(/[^+0-9]/g, '') };
    const t = cms('about.text', D['about.text']);
    const ROT = ['-2.5', '2', '-1.5', '2.5'];
    const VICON = ["M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7zM9 12l2 2 4-4", "M12 3v18M5 7h14M5 7l-3 7a3 3 0 006 0zM19 7l-3 7a3 3 0 006 0z", "M9 8a3.5 3.5 0 100-.01M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6M15 9h7v6h-7z", "M4 14v-2a8 8 0 0116 0v2M3 14h4v6H3zM17 14h4v6h-4z"];
    const TICON = ["M8 7l-5 5 5 5M16 7l5 5-5 5", "M12 3l2.5 5.5L20 11l-5.5 2.5L12 19l-2.5-5.5L4 11l5.5-2.5z", "M11 4a7 7 0 100 14 7 7 0 000-14zM20 20l-4-4", "M4 14v-2a8 8 0 0116 0v2M3 14h4v6H3zM17 14h4v6h-4z"];
    const values = cms('about.values', D['about.values']).map((x, i) => ({ ...x, rot: ROT[i % ROT.length], icon: VICON[i % VICON.length], col: i % 2 === 0 ? '#1F74C9' : '#6D4AD8', tint: i % 2 === 0 ? '#E8F1FC' : '#F0EBFD' }));
    const journey = cms('about.journey', D['about.journey']).map((x, i) => ({ ...x, col: i % 2 === 0 ? '#1F74C9' : '#6D4AD8', tint: i % 2 === 0 ? '#E8F1FC' : '#F0EBFD' }));
    const teams = cms('about.teams', D['about.teams']).map((x, i) => ({ ...x, icon: TICON[i % TICON.length], col: i % 2 === 0 ? '#1F74C9' : '#6D4AD8', grad: i % 2 === 0 ? 'linear-gradient(140deg, #1F74C9, #6D4AD8)' : 'linear-gradient(140deg, #6D4AD8, #1F74C9)' }));
    return { c, site: siteX, t, values, journey, teams };
  
}
