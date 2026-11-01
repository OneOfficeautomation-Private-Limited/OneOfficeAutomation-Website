/** A web address part from text: “Faster month-end close!” → “faster-month-end-close”. */
export const slugify = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70);

/** A customer story's address: its own “Page address” if set, otherwise made from its headline. */
export const storySlug = (s: { slug?: string; title?: string }) => slugify(s.slug || s.title || '') || 'story';
