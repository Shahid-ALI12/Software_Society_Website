export const kinds = ['events', 'notices', 'posts', 'cabinet', 'gallery', 'alumni'];
export const fields = {
 events: { title: 'Title', date: 'Date (YYYY-MM-DD)', location: 'Location', description: 'Description', image: 'Photo URL', alt: 'Photo description' },
 notices: { title: 'Title', category: 'Category', description: 'Notice text' },
 posts: { title: 'Title', author: 'Author', description: 'Summary', body: 'Article', image: 'Photo URL', alt: 'Photo description' },
 cabinet: { title: 'Full name', role: 'Position', session: 'Session (2026-2027)', group: 'Group (core, exec or general)', image: 'Photo URL', alt: 'Photo description' },
 gallery: { title: 'Caption', image: 'Photo URL', alt: 'Photo description' },
 alumni: { title: 'Full name', batch: 'Batch', role: 'Role and company', linkedin: 'LinkedIn URL', image: 'Photo URL', alt: 'Photo description' }
};
export const settingFields = {hero:'Homepage banner',hod:'HOD portrait',campus:'Campus photo',lab:'Lab photo',society:'Society photo'};
