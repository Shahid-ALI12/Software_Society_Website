export const kinds = ['events', 'notices', 'posts', 'cabinet', 'gallery', 'alumni', 'featured'];
export const fields = {
 events: { title: 'Title', date: 'Date (YYYY-MM-DD)', location: 'Location', description: 'Description', image: 'Photo URL', alt: 'Photo description' },
 notices: { title: 'Title', category: 'Category', description: 'Notice text' },
 posts: { title: 'Title', author: 'Author', description: 'Summary', body: 'Article', image: 'Photo URL', alt: 'Photo description' },
 cabinet: { title: 'Full name', role: 'Position', session: 'Session (2026-2027)', group: 'Group (core, exec or general)', image: 'Photo URL', alt: 'Photo description' },
 gallery: { title: 'Caption', image: 'Photo URL', alt: 'Photo description' },
 alumni: { title: 'Full name', batch: 'Batch', role: 'Role and company', linkedin: 'LinkedIn URL', image: 'Photo URL', alt: 'Photo description' },
 // Featured people shown on the landing-page leadership strip (HOD, Director, Patron, Dean, etc.).
 // `group` controls which tab the person appears under; `displayOrder` sorts within a tab.
 featured: { title: 'Full name', role: 'Position / title', group: 'Tab (e.g. hod, director, patron, dean)', displayOrder: 'Display order (number, lower shows first)', image: 'Photo URL', alt: 'Photo description' }
};
export const settingFields = {hero:'Homepage banner',hod:'HOD portrait',campus:'Campus photo',lab:'Lab photo',society:'Society photo'};
// Editable text fields stored alongside the photo settings so the HOD block on the
// homepage is data-driven instead of being hardcoded into index.html.
export const settingTextFields = {hodName:'HOD name',hodTitle:'HOD title',hodMessage:'HOD welcome message'};
// Featured-people tabs rendered on the landing page. Order here controls on-page order.
// The values are the labels shown in the UI; the keys are stored in the `group` field.
export const featuredGroups = {hod:'HOD & Department',director:'Director & Faculty',patron:'Patrons',dean:'Dean Office'};
