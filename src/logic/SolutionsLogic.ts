import { useState } from 'react';
import { useCms } from '../cms/CmsContext';
import { c } from '../theme';
import D from '../cms/defaults.generated.json';

export function useSolutionsLogic() {
  const [state, setFull] = useState({ sector: 0, slide: 0 });
  const setState = (p: Partial<typeof state>) => setFull((s) => ({ ...s, ...p }));

    const cms = useCms();
    const DATA = cms('solutions.sectors', D['solutions.sectors']).map(d => ({ ...d, first: d.uses.length > 0 ? d.uses[0].t : '', uses: d.uses.map((u, j, arr) => ({ n: String(j + 1), t: u.t, d: u.d, notLast: j < arr.length - 1 })) }));
    const S = state;
    const sectors = DATA.map((d, i) => {
      const a = (-90 + (i * 360) / DATA.length) * (Math.PI / 180);
      return { ...d, left: (50 + 38 * Math.cos(a)).toFixed(2) + '%', top: (50 + 38 * Math.sin(a)).toFixed(2) + '%', px: (260 + 198 * Math.cos(a)).toFixed(1), py: (260 + 198 * Math.sin(a)).toFixed(1), iconCol: i % 2 === 0 ? '#1F74C9' : '#6D4AD8', active: i === S.sector, inactive: i !== S.sector, pick: () => setState({ sector: i }) };
    });
    const N = 5;
    const dots = Array.from({ length: N }, (_, i) => ({ label: 'Go to slide ' + (i + 1), w: i === S.slide ? '34px' : '10px', bg: i === S.slide ? 'linear-gradient(90deg, #1F74C9, #6D4AD8)' : '#D3DAEE', pick: () => setState({ slide: i }) }));
    const show = { show0: S.slide === 0, show1: S.slide === 1, show2: S.slide === 2, show3: S.slide === 3, show4: S.slide === 4 };
    return { c, sectors, sel: sectors[S.sector], dots, ...show, prev: () => setState({ slide: (S.slide + N - 1) % N }), next: () => setState({ slide: (S.slide + 1) % N }) };
  
}
