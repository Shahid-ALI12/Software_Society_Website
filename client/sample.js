        // State storage
        const defaultBlogs = [
            { id: 1, title: 'Navigating Open Source: GSOC 2026 Guide', author: 'Hamza Malik', date: 'Oct 10, 2026', snippet: 'How NTU SE students can prepare for international open-source mentorship programs.', content: 'Open source contribution is one of the most effective ways to build real-world software experience. In this comprehensive guide, we cover version control, selecting beginner-friendly issues, writing unit tests, and communicating with core maintainers.' },
            { id: 2, title: 'AI & Software Architecture Trends', author: 'Ayesha Tariq', date: 'Sep 28, 2026', snippet: 'Exploring LLM integration in modern microservices and web application pipelines.', content: 'As artificial intelligence models become lighter and faster, incorporating them into traditional microservices is becoming standard. Learn about edge AI deployment, REST API integration, and prompt engineering protocols.' },
            { id: 3, title: 'Building Scalable Web Apps with React & Tailwind', author: 'Zain Ul Abideen', date: 'Sep 15, 2026', snippet: 'Best practices for state management and clean UI component design.', content: 'Modern front-end applications demand clean architecture, optimal rendering loops, and responsive component libraries. In this write-up, we review Tailwind utility classes and React state design patterns.' }
        ];

        const defaultEvents = [
            { id: 1, title: 'NTU Annual Hackathon 2026', type: 'upcoming', date: 'Nov 15, 2026', location: 'Main Auditorium', image: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=600&q=80', desc: '24-hour coding marathon bringing together student developers to solve real-world industry challenges.' },
            { id: 2, title: 'Cloud Native & DevOps Workshop', type: 'upcoming', date: 'Nov 02, 2026', location: 'Lab 03, CS Block', image: 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=600&q=80', desc: 'Hands-on session on Docker containers, Kubernetes orchestration, and GitHub Actions CI/CD.' },
            { id: 3, title: 'CodeSprint 2025 Speed Programming', type: 'past', date: 'May 12, 2025', location: 'CS Computer Center', image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=600&q=80', desc: 'Inter-departmental algorithmic programming competition with over 120 participating teams.' }
        ];

        const cabinetData = {
            '2025-2026': {
                core: [
                    { name: 'Dr. M. Asif', role: 'Patron In Chief', img: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80' },
                    { name: 'Usman Ghani', role: 'President', img: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=300&q=80' },
                    { name: 'Fatima Zahra', role: 'Vice President', img: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80' },
                    { name: 'Bilal Ahmad', role: 'General Secretary', img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80' }
                ],
                exec: [
                    { name: 'Hassan Raza', role: 'Media Lead', img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80' },
                    { name: 'Sana Malik', role: 'Event Coordinator', img: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=300&q=80' },
                    { name: 'Ali Hamza', role: 'Technical Lead', img: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=300&q=80' },
                    { name: 'Zoha Nisar', role: 'Graphics Lead', img: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80' }
                ],
                general: ['Hamza', 'Danish', 'Umer', 'Tariq', 'Kashif', 'Laiba', 'Maheen', 'Zohaib', 'Eman', 'Saad', 'Ahsan', 'Waqas']
            },
            '2024-2025': {
                core: [
                    { name: 'Dr. M. Asif', role: 'Patron In Chief', img: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80' },
                    { name: 'Shahid Iqbal', role: 'Ex-President', img: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=300&q=80' },
                    { name: 'Maryam Khan', role: 'Ex-VP', img: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&q=80' },
                    { name: 'Zaid Arshad', role: 'Ex-Secretary', img: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=300&q=80' }
                ],
                exec: [
                    { name: 'Noman Ali', role: 'Ex-Technical Lead', img: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=300&q=80' },
                    { name: 'Iqra Parvez', role: 'Ex-Media Lead', img: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80' }
                ],
                general: ['Rehan', 'Faisal', 'Sobia', 'Asad', 'Haris', 'Babar']
            }
        };

        // Local Storage state initializations
        let notices = [
            { id: 1, title: 'Registration Open for NTU Hackathon 2026', category: 'General', date: '2026-10-12', details: 'All SE students from 1st to 8th semester can register their teams before Nov 1st.' },
            { id: 2, title: 'Lab 02 Maintenance Schedule', category: 'General', date: '2026-10-10', details: 'CS Computer Lab 02 will remain closed on Friday for hardware upgrades.' }
        ];

        let alumniList = [
            { id: 1, name: 'Shahmir Khan', batch: '2019-2023', role: 'Full Stack Engineer @ Arbisoft', linkedin: '#' },
            { id: 2, name: 'Zoya Fatima', batch: '2018-2022', role: 'DevOps Specialist @ Systems Ltd', linkedin: '#' }
        ];



export const sampleContent = {
 events: defaultEvents.map(e=>({id:String(e.id),data:{title:e.title,date:e.date,location:e.location,image:e.image,alt:e.title,description:e.desc}})),
 posts: defaultBlogs.map(b=>({id:String(b.id),data:{title:b.title,author:b.author,description:b.snippet,body:b.content}})),
 notices: notices.map(n=>({id:String(n.id),data:{title:n.title,category:n.category,description:n.details}})),
 cabinet: Object.entries(cabinetData).flatMap(([session,data])=>['core','exec'].flatMap(group=>data[group].map((m,i)=>({id:session+group+i,data:{title:m.name,role:m.role,session,group,image:m.img,alt:m.name}})))),
 alumni: alumniList.map(a=>({id:String(a.id),data:{title:a.name,batch:a.batch,role:a.role,linkedin:'',image:'',alt:''}})),
 gallery: defaultEvents.map(e=>({id:String(e.id),data:{title:e.title,image:e.image,alt:e.title}}))
};
