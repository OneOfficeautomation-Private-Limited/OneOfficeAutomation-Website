import { useSite } from '../cms/CmsContext';
import SmartLink from './SmartLink';

/** The thin bar at the very top of every page, controlled from Site settings in the admin. */
export default function AnnouncementBar() {
  const site = useSite();
  if (!site.announcementOn || !site.announcementText.trim()) return null;
  return (
    <div role="region" aria-label="Announcement" style={{ background: 'linear-gradient(90deg, #1F74C9, #6D4AD8)', color: '#FFFFFF', fontSize: 14.5 }}>
      <div style={{ maxWidth: 1320, margin: '0 auto', padding: '9px 28px', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: '4px 14px', textAlign: 'center' }}>
        <span>{site.announcementText}</span>
        {site.announcementLabel && site.announcementUrl && (
          <SmartLink href={site.announcementUrl} style={{ color: '#FFFFFF', fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 3 }}>
            {site.announcementLabel} →
          </SmartLink>
        )}
      </div>
    </div>
  );
}
