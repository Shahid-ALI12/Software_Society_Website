export const kinds = ['events', 'notices', 'posts', 'cabinet', 'gallery', 'alumni', 'featured'];
export const fields = {
 events: { title: 'Title', date: 'Date (YYYY-MM-DD)', location: 'Location', description: 'Description', image: 'Photo URL', alt: 'Photo description' },
 notices: { title: 'Title', category: 'Category', description: 'Notice text' },
 posts: { title: 'Title', author: 'Author', description: 'Summary', body: 'Article', image: 'Photo URL', alt: 'Photo description' },
 // displayOrder lets the admin choose who appears first on the homepage
 // Core Executive Body strip and the Cabinet tab. Lower number = earlier.
 // placement controls WHERE the member shows: homepage, cabinet, or both.
 // row controls WHICH row on the cabinet page (1=top/president, 2=next, etc.).
 //   Members with the same row number appear in the same horizontal row,
 //   sorted by displayOrder. Row size = number of members in that row.
 // bio is a longer biography shown in a modal when the user clicks the photo.
 cabinet: { title: 'Full name', role: 'Position', session: 'Session (2026-2027)', group: 'Group (core, exec or general)', displayOrder: 'Display order (number, lower shows first)', placement: 'Show on (homepage, cabinet, both)', row: 'Row number on cabinet page (1=top)', bio: 'Biography (shown when photo is clicked)', image: 'Photo URL', alt: 'Photo description' },
 gallery: { title: 'Caption', image: 'Photo URL', alt: 'Photo description' },
 alumni: { title: 'Full name', batch: 'Batch', role: 'Role and company', linkedin: 'LinkedIn URL', image: 'Photo URL', alt: 'Photo description' },
 // Featured people shown on the landing-page leadership strip (HOD, Director, Patron, Dean, etc.).
 // `group` controls which tab the person appears under; `displayOrder` sorts within a tab.
 featured: { title: 'Full name', role: 'Position / title', group: 'Tab (e.g. hod, director, patron, dean)', displayOrder: 'Display order (number, lower shows first)', image: 'Photo URL', alt: 'Photo description' }
};
export const settingFields = {hero:'Homepage banner',hod:'HOD portrait',convenier:'Convenier portrait',campus:'Campus photo',lab:'Lab photo',society:'Society photo'};
// Editable text fields stored alongside the photo settings so the HOD and
// Convenier blocks on the homepage are data-driven instead of being hardcoded
// into index.html. Each person gets a name, title, message AND a longer
// biography shown in a modal when their photo is clicked.
export const settingTextFields = {hodName:'HOD name',hodTitle:'HOD title',hodMessage:'HOD welcome message',hodBio:'HOD biography (shown when photo is clicked)',hodLink:'HOD faculty page URL (shown as "For More Details" link)',convenierName:'Convenier name',convenierTitle:'Convenier title',convenierMessage:'Convenier message',convenierBio:'Convenier biography (shown when photo is clicked)',convenierLink:'Convenier faculty page URL (shown as "For More Details" link)'};
// Featured-people tabs rendered on the landing page. Order here controls on-page order.
// The values are the labels shown in the UI; the keys are stored in the `group` field.
export const featuredGroups = {hod:'HOD & Department',director:'Director & Faculty',patron:'Patrons',dean:'Dean Office'};
