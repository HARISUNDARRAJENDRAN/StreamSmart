const mongoose = require('mongoose');

// Content categories with realistic videos
const contentByCategory = {
  // Skill-Based Genres
  'Coding and Programming': [
    { title: 'JavaScript Fundamentals for Beginners', duration: 2400, tags: ['javascript', 'programming', 'web-development'], difficulty: 'beginner' },
    { title: 'React Complete Course 2024', duration: 14400, tags: ['react', 'frontend', 'javascript'], difficulty: 'intermediate' },
    { title: 'Python for Data Analysis', duration: 3600, tags: ['python', 'data', 'programming'], difficulty: 'intermediate' },
    { title: 'Advanced Node.js Backend Development', duration: 5400, tags: ['nodejs', 'backend', 'javascript'], difficulty: 'advanced' },
    { title: 'TypeScript Best Practices', duration: 1800, tags: ['typescript', 'javascript', 'programming'], difficulty: 'intermediate' },
    { title: 'Full Stack Web Development Bootcamp', duration: 21600, tags: ['fullstack', 'web', 'development'], difficulty: 'beginner' },
    { title: 'Docker and Kubernetes for Developers', duration: 4800, tags: ['docker', 'kubernetes', 'devops'], difficulty: 'advanced' },
    { title: 'REST API Design Patterns', duration: 2700, tags: ['api', 'backend', 'design-patterns'], difficulty: 'intermediate' },
    { title: 'Git and GitHub Mastery', duration: 1500, tags: ['git', 'github', 'version-control'], difficulty: 'beginner' },
    { title: 'Database Design and SQL Optimization', duration: 3300, tags: ['database', 'sql', 'optimization'], difficulty: 'intermediate' }
  ],
  
  'Data Science and AI/ML': [
    { title: 'Introduction to Machine Learning', duration: 4200, tags: ['machine-learning', 'ai', 'data-science'], difficulty: 'beginner' },
    { title: 'Deep Learning with TensorFlow', duration: 7200, tags: ['deep-learning', 'tensorflow', 'neural-networks'], difficulty: 'advanced' },
    { title: 'Data Visualization with Python', duration: 2700, tags: ['visualization', 'python', 'matplotlib'], difficulty: 'intermediate' },
    { title: 'Natural Language Processing Fundamentals', duration: 5400, tags: ['nlp', 'ai', 'text-analysis'], difficulty: 'intermediate' },
    { title: 'Statistical Analysis for Data Scientists', duration: 3600, tags: ['statistics', 'data-analysis', 'math'], difficulty: 'intermediate' },
    { title: 'Computer Vision with OpenCV', duration: 4800, tags: ['computer-vision', 'opencv', 'image-processing'], difficulty: 'advanced' },
    { title: 'Time Series Analysis and Forecasting', duration: 3300, tags: ['time-series', 'forecasting', 'analysis'], difficulty: 'intermediate' },
    { title: 'Big Data Analytics with Apache Spark', duration: 6000, tags: ['big-data', 'spark', 'analytics'], difficulty: 'advanced' },
    { title: 'A/B Testing for Data-Driven Decisions', duration: 2400, tags: ['ab-testing', 'statistics', 'experimentation'], difficulty: 'intermediate' },
    { title: 'MLOps: Machine Learning in Production', duration: 4500, tags: ['mlops', 'production', 'deployment'], difficulty: 'advanced' }
  ],
  
  'Design(UI/UX , graphic, product)': [
    { title: 'UI/UX Design Fundamentals', duration: 3600, tags: ['ui-design', 'ux-design', 'user-experience'], difficulty: 'beginner' },
    { title: 'Advanced Figma Techniques', duration: 2700, tags: ['figma', 'design-tools', 'prototyping'], difficulty: 'intermediate' },
    { title: 'User Research and Testing Methods', duration: 3300, tags: ['user-research', 'testing', 'validation'], difficulty: 'intermediate' },
    { title: 'Design Systems and Component Libraries', duration: 4200, tags: ['design-systems', 'components', 'consistency'], difficulty: 'advanced' },
    { title: 'Adobe Creative Suite Mastery', duration: 5400, tags: ['adobe', 'photoshop', 'illustrator'], difficulty: 'intermediate' },
    { title: 'Mobile App Design Best Practices', duration: 2400, tags: ['mobile-design', 'app-design', 'responsive'], difficulty: 'intermediate' },
    { title: 'Color Theory and Typography', duration: 1800, tags: ['color-theory', 'typography', 'visual-design'], difficulty: 'beginner' },
    { title: 'Product Design Strategy', duration: 3900, tags: ['product-design', 'strategy', 'user-centered'], difficulty: 'advanced' },
    { title: 'Accessibility in Design', duration: 2100, tags: ['accessibility', 'inclusive-design', 'a11y'], difficulty: 'intermediate' },
    { title: 'Brand Identity and Logo Design', duration: 3000, tags: ['branding', 'logo-design', 'identity'], difficulty: 'intermediate' }
  ],
  
  'Digital Marketing': [
    { title: 'Digital Marketing Strategy 2024', duration: 4200, tags: ['digital-marketing', 'strategy', 'online-marketing'], difficulty: 'beginner' },
    { title: 'Google Ads Mastery Course', duration: 5400, tags: ['google-ads', 'ppc', 'advertising'], difficulty: 'intermediate' },
    { title: 'Social Media Marketing Fundamentals', duration: 3000, tags: ['social-media', 'marketing', 'content'], difficulty: 'beginner' },
    { title: 'SEO and Content Marketing', duration: 3600, tags: ['seo', 'content-marketing', 'organic-growth'], difficulty: 'intermediate' },
    { title: 'Email Marketing Automation', duration: 2700, tags: ['email-marketing', 'automation', 'nurturing'], difficulty: 'intermediate' },
    { title: 'Conversion Rate Optimization', duration: 3300, tags: ['cro', 'optimization', 'conversion'], difficulty: 'advanced' },
    { title: 'Influencer Marketing Strategies', duration: 2400, tags: ['influencer-marketing', 'partnerships', 'social'], difficulty: 'intermediate' },
    { title: 'Marketing Analytics and Data Analysis', duration: 4500, tags: ['analytics', 'data-driven', 'metrics'], difficulty: 'intermediate' },
    { title: 'Facebook and Instagram Advertising', duration: 3900, tags: ['facebook-ads', 'instagram', 'social-advertising'], difficulty: 'intermediate' },
    { title: 'Content Creation for Digital Platforms', duration: 2100, tags: ['content-creation', 'storytelling', 'engagement'], difficulty: 'beginner' }
  ],
  
  'Productivity & Time Management': [
    { title: 'Getting Things Done (GTD) System', duration: 2400, tags: ['gtd', 'productivity', 'organization'], difficulty: 'beginner' },
    { title: 'Time Blocking and Calendar Management', duration: 1800, tags: ['time-blocking', 'calendar', 'scheduling'], difficulty: 'beginner' },
    { title: 'Deep Work and Focus Strategies', duration: 3000, tags: ['deep-work', 'focus', 'concentration'], difficulty: 'intermediate' },
    { title: 'Digital Tools for Productivity', duration: 2700, tags: ['productivity-tools', 'apps', 'automation'], difficulty: 'intermediate' },
    { title: 'Habit Formation and Breaking Bad Habits', duration: 3300, tags: ['habits', 'behavior-change', 'self-improvement'], difficulty: 'intermediate' },
    { title: 'Stress Management and Work-Life Balance', duration: 2100, tags: ['stress-management', 'work-life-balance', 'wellness'], difficulty: 'beginner' },
    { title: 'Goal Setting and Achievement Strategies', duration: 2400, tags: ['goal-setting', 'achievement', 'planning'], difficulty: 'beginner' },
    { title: 'Energy Management and Peak Performance', duration: 2700, tags: ['energy-management', 'performance', 'optimization'], difficulty: 'intermediate' },
    { title: 'Delegation and Team Productivity', duration: 3000, tags: ['delegation', 'team-productivity', 'management'], difficulty: 'intermediate' },
    { title: 'Building Systems for Long-term Success', duration: 4200, tags: ['systems', 'long-term', 'success'], difficulty: 'advanced' }
  ],
  
  'Financial Literacy & Investing': [
    { title: 'Personal Finance Fundamentals', duration: 3600, tags: ['personal-finance', 'budgeting', 'money-management'], difficulty: 'beginner' },
    { title: 'Stock Market Investing for Beginners', duration: 4200, tags: ['stock-market', 'investing', 'equities'], difficulty: 'beginner' },
    { title: 'Cryptocurrency and Blockchain Basics', duration: 3300, tags: ['cryptocurrency', 'blockchain', 'digital-assets'], difficulty: 'intermediate' },
    { title: 'Real Estate Investment Strategies', duration: 4500, tags: ['real-estate', 'property-investment', 'passive-income'], difficulty: 'intermediate' },
    { title: 'Retirement Planning and 401k Optimization', duration: 2700, tags: ['retirement-planning', '401k', 'long-term-investing'], difficulty: 'intermediate' },
    { title: 'Tax Strategies and Optimization', duration: 3000, tags: ['tax-planning', 'tax-optimization', 'deductions'], difficulty: 'intermediate' },
    { title: 'Building Multiple Income Streams', duration: 3900, tags: ['multiple-income', 'passive-income', 'wealth-building'], difficulty: 'intermediate' },
    { title: 'Financial Independence and FIRE Movement', duration: 4800, tags: ['financial-independence', 'fire', 'early-retirement'], difficulty: 'advanced' },
    { title: 'Insurance and Risk Management', duration: 2400, tags: ['insurance', 'risk-management', 'protection'], difficulty: 'beginner' },
    { title: 'Advanced Portfolio Management', duration: 5400, tags: ['portfolio-management', 'asset-allocation', 'diversification'], difficulty: 'advanced' }
  ],
  
  'Soft Skills (Communication, Leadership)': [
    { title: 'Effective Communication Skills', duration: 3000, tags: ['communication', 'interpersonal', 'soft-skills'], difficulty: 'beginner' },
    { title: 'Leadership Fundamentals', duration: 3600, tags: ['leadership', 'management', 'team-building'], difficulty: 'intermediate' },
    { title: 'Emotional Intelligence Mastery', duration: 2700, tags: ['emotional-intelligence', 'eq', 'self-awareness'], difficulty: 'intermediate' },
    { title: 'Conflict Resolution and Negotiation', duration: 3300, tags: ['conflict-resolution', 'negotiation', 'problem-solving'], difficulty: 'intermediate' },
    { title: 'Active Listening and Empathy', duration: 2100, tags: ['active-listening', 'empathy', 'understanding'], difficulty: 'beginner' },
    { title: 'Building Confidence and Self-Esteem', duration: 2400, tags: ['confidence', 'self-esteem', 'personal-development'], difficulty: 'beginner' },
    { title: 'Team Collaboration and Dynamics', duration: 3000, tags: ['teamwork', 'collaboration', 'group-dynamics'], difficulty: 'intermediate' },
    { title: 'Giving and Receiving Feedback', duration: 1800, tags: ['feedback', 'constructive-criticism', 'growth'], difficulty: 'intermediate' },
    { title: 'Cross-Cultural Communication', duration: 2700, tags: ['cross-cultural', 'diversity', 'global-communication'], difficulty: 'intermediate' },
    { title: 'Persuasion and Influence Techniques', duration: 3300, tags: ['persuasion', 'influence', 'psychology'], difficulty: 'advanced' }
  ],
  
  'Entrepreneurship & Startups': [
    { title: 'Startup Fundamentals and Business Planning', duration: 4800, tags: ['startup', 'business-plan', 'entrepreneurship'], difficulty: 'beginner' },
    { title: 'Lean Startup Methodology', duration: 3600, tags: ['lean-startup', 'mvp', 'iteration'], difficulty: 'intermediate' },
    { title: 'Fundraising and Venture Capital', duration: 4200, tags: ['fundraising', 'venture-capital', 'investment'], difficulty: 'advanced' },
    { title: 'Market Research and Validation', duration: 3000, tags: ['market-research', 'validation', 'customer-discovery'], difficulty: 'intermediate' },
    { title: 'Product Development and Innovation', duration: 4500, tags: ['product-development', 'innovation', 'design-thinking'], difficulty: 'intermediate' },
    { title: 'Sales and Customer Acquisition', duration: 3900, tags: ['sales', 'customer-acquisition', 'growth'], difficulty: 'intermediate' },
    { title: 'Building and Managing Remote Teams', duration: 3300, tags: ['remote-teams', 'team-management', 'culture'], difficulty: 'intermediate' },
    { title: 'Legal Basics for Entrepreneurs', duration: 2700, tags: ['legal', 'compliance', 'business-law'], difficulty: 'intermediate' },
    { title: 'Scaling Your Business', duration: 4200, tags: ['scaling', 'growth', 'operations'], difficulty: 'advanced' },
    { title: 'Building Company Culture', duration: 2400, tags: ['company-culture', 'values', 'team-building'], difficulty: 'intermediate' }
  ],
  
  'Writing & Content Creation': [
    { title: 'Copywriting Fundamentals', duration: 3300, tags: ['copywriting', 'persuasive-writing', 'marketing'], difficulty: 'beginner' },
    { title: 'Content Strategy and Planning', duration: 2700, tags: ['content-strategy', 'planning', 'editorial'], difficulty: 'intermediate' },
    { title: 'Blog Writing and SEO Optimization', duration: 3000, tags: ['blog-writing', 'seo', 'content-marketing'], difficulty: 'intermediate' },
    { title: 'Storytelling for Business', duration: 2400, tags: ['storytelling', 'narrative', 'engagement'], difficulty: 'intermediate' },
    { title: 'Technical Writing and Documentation', duration: 3600, tags: ['technical-writing', 'documentation', 'clarity'], difficulty: 'intermediate' },
    { title: 'Email Newsletter Creation', duration: 1800, tags: ['email-newsletter', 'subscribers', 'engagement'], difficulty: 'beginner' },
    { title: 'Video Script Writing', duration: 2700, tags: ['video-scripts', 'screenplay', 'visual-storytelling'], difficulty: 'intermediate' },
    { title: 'Social Media Content Creation', duration: 2100, tags: ['social-media-content', 'engagement', 'viral'], difficulty: 'beginner' },
    { title: 'Grant Writing and Proposals', duration: 3900, tags: ['grant-writing', 'proposals', 'funding'], difficulty: 'advanced' },
    { title: 'Creative Writing Techniques', duration: 4200, tags: ['creative-writing', 'fiction', 'creativity'], difficulty: 'intermediate' }
  ],
  
  'Public Speaking': [
    { title: 'Overcoming Fear of Public Speaking', duration: 2100, tags: ['fear', 'anxiety', 'confidence'], difficulty: 'beginner' },
    { title: 'Presentation Design and Structure', duration: 2700, tags: ['presentation-design', 'structure', 'slides'], difficulty: 'intermediate' },
    { title: 'Voice Training and Vocal Techniques', duration: 2400, tags: ['voice-training', 'vocal-techniques', 'delivery'], difficulty: 'intermediate' },
    { title: 'Body Language and Stage Presence', duration: 3000, tags: ['body-language', 'stage-presence', 'nonverbal'], difficulty: 'intermediate' },
    { title: 'Storytelling in Presentations', duration: 3300, tags: ['storytelling', 'narrative', 'engagement'], difficulty: 'intermediate' },
    { title: 'Handling Q&A Sessions', duration: 1800, tags: ['qa-sessions', 'questions', 'interaction'], difficulty: 'intermediate' },
    { title: 'Virtual Presentation Skills', duration: 2700, tags: ['virtual-presentations', 'online-speaking', 'technology'], difficulty: 'intermediate' },
    { title: 'Persuasive Speaking Techniques', duration: 3600, tags: ['persuasive-speaking', 'influence', 'persuasion'], difficulty: 'advanced' },
    { title: 'Impromptu Speaking and Thinking on Your Feet', duration: 2400, tags: ['impromptu-speaking', 'quick-thinking', 'spontaneity'], difficulty: 'intermediate' },
    { title: 'TEDx Talk Preparation', duration: 4200, tags: ['tedx', 'ted-talks', 'preparation'], difficulty: 'advanced' }
  ],

  // Academic Genres
  'Mathematics': [
    { title: 'Algebra Fundamentals', duration: 2700, tags: ['algebra', 'equations', 'mathematics'], difficulty: 'beginner' },
    { title: 'Calculus Made Simple', duration: 4200, tags: ['calculus', 'derivatives', 'integrals'], difficulty: 'intermediate' },
    { title: 'Statistics and Probability', duration: 3600, tags: ['statistics', 'probability', 'data-analysis'], difficulty: 'intermediate' },
    { title: 'Linear Algebra for Engineers', duration: 5400, tags: ['linear-algebra', 'matrices', 'vectors'], difficulty: 'advanced' },
    { title: 'Geometry and Trigonometry', duration: 3000, tags: ['geometry', 'trigonometry', 'shapes'], difficulty: 'intermediate' },
    { title: 'Discrete Mathematics', duration: 4500, tags: ['discrete-math', 'logic', 'algorithms'], difficulty: 'advanced' },
    { title: 'Mathematical Problem Solving', duration: 2400, tags: ['problem-solving', 'techniques', 'strategies'], difficulty: 'intermediate' },
    { title: 'Number Theory Basics', duration: 3300, tags: ['number-theory', 'primes', 'modular-arithmetic'], difficulty: 'advanced' }
  ],

  'Physics': [
    { title: 'Classical Mechanics Fundamentals', duration: 4800, tags: ['mechanics', 'motion', 'forces'], difficulty: 'intermediate' },
    { title: 'Electricity and Magnetism', duration: 5400, tags: ['electricity', 'magnetism', 'fields'], difficulty: 'intermediate' },
    { title: 'Quantum Physics Introduction', duration: 6000, tags: ['quantum', 'physics', 'particles'], difficulty: 'advanced' },
    { title: 'Thermodynamics and Heat', duration: 3600, tags: ['thermodynamics', 'heat', 'energy'], difficulty: 'intermediate' },
    { title: 'Waves and Optics', duration: 4200, tags: ['waves', 'optics', 'light'], difficulty: 'intermediate' },
    { title: 'Relativity Theory Explained', duration: 4500, tags: ['relativity', 'einstein', 'spacetime'], difficulty: 'advanced' },
    { title: 'Astrophysics and Cosmology', duration: 5100, tags: ['astrophysics', 'cosmology', 'universe'], difficulty: 'advanced' },
    { title: 'Physics Problem Solving', duration: 2700, tags: ['problem-solving', 'physics', 'techniques'], difficulty: 'intermediate' }
  ],

  'Biology': [
    { title: 'Cell Biology Fundamentals', duration: 3600, tags: ['cell-biology', 'organelles', 'cellular-processes'], difficulty: 'beginner' },
    { title: 'Genetics and Heredity', duration: 4200, tags: ['genetics', 'dna', 'heredity'], difficulty: 'intermediate' },
    { title: 'Human Anatomy and Physiology', duration: 6300, tags: ['anatomy', 'physiology', 'human-body'], difficulty: 'intermediate' },
    { title: 'Evolution and Natural Selection', duration: 3900, tags: ['evolution', 'natural-selection', 'darwin'], difficulty: 'intermediate' },
    { title: 'Ecology and Environmental Science', duration: 4500, tags: ['ecology', 'environment', 'ecosystems'], difficulty: 'intermediate' },
    { title: 'Molecular Biology', duration: 5400, tags: ['molecular-biology', 'proteins', 'dna'], difficulty: 'advanced' },
    { title: 'Microbiology and Immunology', duration: 4800, tags: ['microbiology', 'bacteria', 'immune-system'], difficulty: 'advanced' },
    { title: 'Plant Biology and Botany', duration: 3300, tags: ['plant-biology', 'botany', 'photosynthesis'], difficulty: 'intermediate' }
  ],

  'Chemistry': [
    { title: 'General Chemistry Principles', duration: 4500, tags: ['general-chemistry', 'atoms', 'molecules'], difficulty: 'beginner' },
    { title: 'Organic Chemistry Fundamentals', duration: 5700, tags: ['organic-chemistry', 'carbon', 'reactions'], difficulty: 'intermediate' },
    { title: 'Physical Chemistry', duration: 5400, tags: ['physical-chemistry', 'thermodynamics', 'kinetics'], difficulty: 'advanced' },
    { title: 'Inorganic Chemistry', duration: 4200, tags: ['inorganic-chemistry', 'metals', 'minerals'], difficulty: 'intermediate' },
    { title: 'Chemical Bonding and Structure', duration: 3600, tags: ['chemical-bonding', 'molecular-structure'], difficulty: 'intermediate' },
    { title: 'Analytical Chemistry', duration: 4800, tags: ['analytical-chemistry', 'analysis', 'instruments'], difficulty: 'advanced' },
    { title: 'Biochemistry Essentials', duration: 5100, tags: ['biochemistry', 'biological-chemistry'], difficulty: 'advanced' },
    { title: 'Environmental Chemistry', duration: 3900, tags: ['environmental-chemistry', 'pollution', 'green-chemistry'], difficulty: 'intermediate' }
  ],

  'History & Civics': [
    { title: 'World History Overview', duration: 5400, tags: ['world-history', 'civilizations', 'timeline'], difficulty: 'beginner' },
    { title: 'Modern European History', duration: 4800, tags: ['european-history', 'modern', 'wars'], difficulty: 'intermediate' },
    { title: 'American History and Constitution', duration: 4500, tags: ['american-history', 'constitution', 'democracy'], difficulty: 'intermediate' },
    { title: 'Ancient Civilizations', duration: 4200, tags: ['ancient-history', 'egypt', 'rome'], difficulty: 'beginner' },
    { title: 'Government and Political Systems', duration: 3600, tags: ['government', 'politics', 'systems'], difficulty: 'intermediate' },
    { title: 'Human Rights and Justice', duration: 3000, tags: ['human-rights', 'justice', 'law'], difficulty: 'intermediate' },
    { title: 'Economic History', duration: 3900, tags: ['economic-history', 'trade', 'capitalism'], difficulty: 'intermediate' },
    { title: 'Social Movements and Change', duration: 3300, tags: ['social-movements', 'civil-rights', 'change'], difficulty: 'intermediate' }
  ],

  'Economics': [
    { title: 'Microeconomics Principles', duration: 4200, tags: ['microeconomics', 'supply-demand', 'markets'], difficulty: 'intermediate' },
    { title: 'Macroeconomics Fundamentals', duration: 4500, tags: ['macroeconomics', 'gdp', 'inflation'], difficulty: 'intermediate' },
    { title: 'International Economics', duration: 3900, tags: ['international-economics', 'trade', 'globalization'], difficulty: 'advanced' },
    { title: 'Economic Development', duration: 3600, tags: ['economic-development', 'growth', 'developing-countries'], difficulty: 'intermediate' },
    { title: 'Behavioral Economics', duration: 3300, tags: ['behavioral-economics', 'psychology', 'decision-making'], difficulty: 'advanced' },
    { title: 'Economic Policy and Government', duration: 4200, tags: ['economic-policy', 'government', 'regulation'], difficulty: 'advanced' },
    { title: 'Financial Economics', duration: 4800, tags: ['financial-economics', 'banking', 'markets'], difficulty: 'advanced' },
    { title: 'Environmental Economics', duration: 3000, tags: ['environmental-economics', 'sustainability', 'resources'], difficulty: 'intermediate' }
  ],

  'Geography': [
    { title: 'Physical Geography', duration: 3900, tags: ['physical-geography', 'landforms', 'climate'], difficulty: 'beginner' },
    { title: 'Human Geography', duration: 3600, tags: ['human-geography', 'population', 'culture'], difficulty: 'intermediate' },
    { title: 'World Regions and Countries', duration: 4500, tags: ['world-regions', 'countries', 'continents'], difficulty: 'beginner' },
    { title: 'Urban Geography and Planning', duration: 3300, tags: ['urban-geography', 'cities', 'planning'], difficulty: 'intermediate' },
    { title: 'Environmental Geography', duration: 4200, tags: ['environmental-geography', 'ecosystems', 'conservation'], difficulty: 'intermediate' },
    { title: 'Economic Geography', duration: 3600, tags: ['economic-geography', 'trade', 'resources'], difficulty: 'intermediate' },
    { title: 'GIS and Mapping Technology', duration: 4800, tags: ['gis', 'mapping', 'technology'], difficulty: 'advanced' },
    { title: 'Climate and Weather Patterns', duration: 3000, tags: ['climate', 'weather', 'patterns'], difficulty: 'intermediate' }
  ],

  'Language Learning': [
    { title: 'English Grammar Fundamentals', duration: 3000, tags: ['english', 'grammar', 'language'], difficulty: 'beginner' },
    { title: 'Spanish for Beginners', duration: 4200, tags: ['spanish', 'language-learning', 'conversation'], difficulty: 'beginner' },
    { title: 'French Pronunciation and Accent', duration: 2700, tags: ['french', 'pronunciation', 'accent'], difficulty: 'intermediate' },
    { title: 'German Language Basics', duration: 3600, tags: ['german', 'language', 'basics'], difficulty: 'beginner' },
    { title: 'Mandarin Chinese Characters', duration: 4500, tags: ['mandarin', 'chinese', 'characters'], difficulty: 'intermediate' },
    { title: 'Language Learning Strategies', duration: 2400, tags: ['language-learning', 'strategies', 'tips'], difficulty: 'beginner' },
    { title: 'Business English Communication', duration: 3300, tags: ['business-english', 'professional', 'communication'], difficulty: 'intermediate' },
    { title: 'IELTS and TOEFL Preparation', duration: 5400, tags: ['ielts', 'toefl', 'test-preparation'], difficulty: 'advanced' }
  ],

  // Career & Professional Development
  'Resume Building & Job Hunting': [
    { title: 'Creating a Winning Resume', duration: 2400, tags: ['resume', 'cv', 'job-application'], difficulty: 'beginner' },
    { title: 'LinkedIn Profile Optimization', duration: 1800, tags: ['linkedin', 'profile', 'networking'], difficulty: 'beginner' },
    { title: 'Job Search Strategies 2024', duration: 3000, tags: ['job-search', 'strategies', 'career'], difficulty: 'intermediate' },
    { title: 'Cover Letter Writing Mastery', duration: 1500, tags: ['cover-letter', 'writing', 'application'], difficulty: 'beginner' },
    { title: 'Salary Negotiation Tactics', duration: 2700, tags: ['salary', 'negotiation', 'career-growth'], difficulty: 'intermediate' },
    { title: 'Career Change Roadmap', duration: 3600, tags: ['career-change', 'transition', 'roadmap'], difficulty: 'intermediate' },
    { title: 'Networking for Professionals', duration: 2100, tags: ['networking', 'professional', 'connections'], difficulty: 'intermediate' },
    { title: 'Personal Branding for Career Success', duration: 2700, tags: ['personal-branding', 'career', 'success'], difficulty: 'intermediate' }
  ],

  'Interview Preparation': [
    { title: 'Common Interview Questions', duration: 2100, tags: ['interview', 'questions', 'preparation'], difficulty: 'beginner' },
    { title: 'Technical Interview Strategies', duration: 3300, tags: ['technical-interview', 'coding', 'algorithms'], difficulty: 'intermediate' },
    { title: 'Behavioral Interview Mastery', duration: 2700, tags: ['behavioral-interview', 'star-method', 'stories'], difficulty: 'intermediate' },
    { title: 'Virtual Interview Best Practices', duration: 1800, tags: ['virtual-interview', 'online', 'video-call'], difficulty: 'beginner' },
    { title: 'Group Interview Techniques', duration: 2400, tags: ['group-interview', 'teamwork', 'collaboration'], difficulty: 'intermediate' },
    { title: 'Executive Interview Preparation', duration: 3600, tags: ['executive-interview', 'leadership', 'c-level'], difficulty: 'advanced' },
    { title: 'Interview Follow-up Strategies', duration: 1200, tags: ['interview-followup', 'thank-you', 'follow-through'], difficulty: 'beginner' },
    { title: 'Handling Interview Rejection', duration: 1800, tags: ['rejection', 'feedback', 'improvement'], difficulty: 'intermediate' }
  ],

  'Freelancing & Remote Work': [
    { title: 'Starting Your Freelance Career', duration: 3600, tags: ['freelancing', 'independent', 'career'], difficulty: 'beginner' },
    { title: 'Remote Work Productivity', duration: 2400, tags: ['remote-work', 'productivity', 'home-office'], difficulty: 'intermediate' },
    { title: 'Finding High-Paying Clients', duration: 3000, tags: ['clients', 'pricing', 'freelance-business'], difficulty: 'intermediate' },
    { title: 'Freelance Contract and Legal Basics', duration: 2700, tags: ['contracts', 'legal', 'freelance-law'], difficulty: 'intermediate' },
    { title: 'Building a Remote Team', duration: 3300, tags: ['remote-team', 'management', 'virtual-collaboration'], difficulty: 'advanced' },
    { title: 'Freelance Portfolio Creation', duration: 2100, tags: ['portfolio', 'showcase', 'client-attraction'], difficulty: 'beginner' },
    { title: 'Time Management for Freelancers', duration: 2400, tags: ['time-management', 'productivity', 'work-life-balance'], difficulty: 'intermediate' },
    { title: 'Scaling Your Freelance Business', duration: 4200, tags: ['scaling', 'business-growth', 'passive-income'], difficulty: 'advanced' }
  ],

  'Certifications': [
    { title: 'AWS Cloud Practitioner Prep', duration: 7200, tags: ['aws', 'cloud', 'certification'], difficulty: 'intermediate' },
    { title: 'Microsoft Azure Fundamentals', duration: 6000, tags: ['azure', 'microsoft', 'cloud'], difficulty: 'intermediate' },
    { title: 'Google Cloud Platform Basics', duration: 5400, tags: ['gcp', 'google-cloud', 'certification'], difficulty: 'intermediate' },
    { title: 'PMP Project Management', duration: 9000, tags: ['pmp', 'project-management', 'pmbok'], difficulty: 'advanced' },
    { title: 'Scrum Master Certification', duration: 4800, tags: ['scrum', 'agile', 'project-management'], difficulty: 'intermediate' },
    { title: 'CompTIA Security+ Prep', duration: 8400, tags: ['comptia', 'security', 'cybersecurity'], difficulty: 'intermediate' },
    { title: 'Certified Ethical Hacker (CEH)', duration: 10800, tags: ['ethical-hacker', 'cybersecurity', 'penetration-testing'], difficulty: 'advanced' },
    { title: 'Six Sigma Green Belt', duration: 6600, tags: ['six-sigma', 'quality', 'process-improvement'], difficulty: 'advanced' }
  ]
};

// User personas for realistic behavior
const userPersonas = [
  {
    type: 'Developer',
    preferences: ['Coding and Programming', 'Data Science and AI/ML', 'Productivity & Time Management'],
    engagementLevel: 'high',
    avgSessionTime: 3600,
    completionRate: 0.75,
    experienceLevel: 'intermediate'
  },
  {
    type: 'Designer',
    preferences: ['Design(UI/UX , graphic, product)', 'Writing & Content Creation', 'Soft Skills (Communication, Leadership)'],
    engagementLevel: 'high',
    avgSessionTime: 2400,
    completionRate: 0.80,
    experienceLevel: 'intermediate'
  },
  {
    type: 'Marketer',
    preferences: ['Digital Marketing', 'Writing & Content Creation', 'Entrepreneurship & Startups'],
    engagementLevel: 'medium',
    avgSessionTime: 2700,
    completionRate: 0.65,
    experienceLevel: 'intermediate'
  },
  {
    type: 'Entrepreneur',
    preferences: ['Entrepreneurship & Startups', 'Financial Literacy & Investing', 'Soft Skills (Communication, Leadership)'],
    engagementLevel: 'high',
    avgSessionTime: 4200,
    completionRate: 0.70,
    experienceLevel: 'advanced'
  },
  {
    type: 'Student',
    preferences: ['Coding and Programming', 'Data Science and AI/ML', 'Productivity & Time Management'],
    engagementLevel: 'medium',
    avgSessionTime: 1800,
    completionRate: 0.60,
    experienceLevel: 'beginner'
  },
  {
    type: 'Professional',
    preferences: ['Soft Skills (Communication, Leadership)', 'Productivity & Time Management', 'Financial Literacy & Investing'],
    engagementLevel: 'medium',
    avgSessionTime: 2400,
    completionRate: 0.55,
    experienceLevel: 'intermediate'
  },
  {
    type: 'Data Scientist',
    preferences: ['Data Science and AI/ML', 'Coding and Programming', 'Public Speaking'],
    engagementLevel: 'high',
    avgSessionTime: 4800,
    completionRate: 0.85,
    experienceLevel: 'advanced'
  },
  {
    type: 'Content Creator',
    preferences: ['Writing & Content Creation', 'Digital Marketing', 'Public Speaking'],
    engagementLevel: 'high',
    avgSessionTime: 3000,
    completionRate: 0.70,
    experienceLevel: 'intermediate'
  }
];

function generateUsers(count = 120) {
  const users = [];
  const firstNames = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Avery', 'Quinn', 'Sage', 'River', 'Cameron', 'Drew', 'Harper', 'Hayden', 'Jamie', 'Kai', 'Logan', 'Max', 'Parker', 'Robin'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Lee', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Thompson', 'White'];
  const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'protonmail.com', 'icloud.com'];
  
  for (let i = 0; i < count; i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const persona = userPersonas[Math.floor(Math.random() * userPersonas.length)];
    const domain = domains[Math.floor(Math.random() * domains.length)];
    
    users.push({
      username: `${firstName.toLowerCase()}${lastName.toLowerCase()}${Math.floor(Math.random() * 100)}`,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@${domain}`,
      name: `${firstName} ${lastName}`,
      persona: persona.type,
      preferences: persona.preferences,
      engagementLevel: persona.engagementLevel,
      avgSessionTime: persona.avgSessionTime,
      completionRate: persona.completionRate,
      experienceLevel: persona.experienceLevel
    });
  }
  
  return users;
}

async function connectDB() {
  try {
    const connectionString = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/streamsmart';
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(connectionString, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    });
    console.log('✅ Connected to MongoDB successfully');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
}

async function seedComprehensiveData() {
  try {
    await connectDB();
    
    // Define schemas
    const UserSchema = new mongoose.Schema({
      username: String,
      email: String,
      name: String,
      persona: String,
      preferences: [String],
      engagementLevel: String,
      avgSessionTime: Number,
      completionRate: Number,
      experienceLevel: String,
      createdAt: { type: Date, default: Date.now }
    });
    
    const ContentSchema = new mongoose.Schema({
      title: String,
      category: String,
      duration: Number,
      type: String,
      tags: [String],
      difficulty: String,
      createdAt: { type: Date, default: Date.now }
    });
    
    const ViewingHistorySchema = new mongoose.Schema({
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Content' },
      itemType: { type: String, default: 'video' },
      title: String,
      category: String,
      viewStartTime: Date,
      viewEndTime: Date,
      totalViewDuration: Number,
      actualDuration: Number,
      completionPercentage: Number,
      pauseCount: { type: Number, default: 0 },
      seekCount: { type: Number, default: 0 },
      skipCount: { type: Number, default: 0 },
      replayCount: { type: Number, default: 0 },
      viewingContext: {
        source: { type: String, default: 'homepage' },
        device: String,
        sessionId: String
      },
      averagePlaybackSpeed: { type: Number, default: 1.0 },
      isActive: { type: Boolean, default: true }
    }, { timestamps: true });
    
    const User = mongoose.model('User', UserSchema);
    const Content = mongoose.model('Content', ContentSchema);
    const ViewingHistory = mongoose.model('UserViewingHistory', ViewingHistorySchema);
    
    // Clear existing data
    console.log('🧹 Clearing existing data...');
    await User.deleteMany({});
    await Content.deleteMany({});
    await ViewingHistory.deleteMany({});
    
    // Generate and insert users
    console.log('👥 Generating 120 users...');
    const userData = generateUsers(120);
    const users = await User.insertMany(userData);
    console.log(`✅ Created ${users.length} users`);
    
    // Generate and insert content
    console.log('📚 Generating content for all categories...');
    const allContent = [];
    
    Object.entries(contentByCategory).forEach(([category, videos]) => {
      videos.forEach(video => {
        allContent.push({
          ...video,
          category,
          type: 'video'
        });
      });
    });
    
    const contentDocs = await Content.insertMany(allContent);
    console.log(`✅ Created ${contentDocs.length} content items across ${Object.keys(contentByCategory).length} categories`);
    
    // Generate viewing history
    console.log('📊 Generating comprehensive viewing history...');
    const viewingHistoryEntries = [];
    
    for (const user of users) {
      // Each user gets 8-15 viewing sessions
      const numSessions = Math.floor(Math.random() * 8) + 8;
      
      // Get content matching user preferences
      const preferredContent = contentDocs.filter(content => 
        user.preferences.includes(content.category)
      );
      
      // Add some random content for discovery
      const randomContent = contentDocs.filter(content => 
        !user.preferences.includes(content.category)
      ).slice(0, Math.floor(contentDocs.length * 0.2));
      
      const availableContent = [...preferredContent, ...randomContent];
      
      for (let i = 0; i < numSessions; i++) {
        const selectedContent = availableContent[Math.floor(Math.random() * availableContent.length)];
        
        // Generate realistic viewing patterns
        const daysAgo = Math.floor(Math.random() * 60);
        const startTime = new Date();
        startTime.setDate(startTime.getDate() - daysAgo);
        startTime.setHours(Math.floor(Math.random() * 14) + 8);
        
        // Calculate watch time based on user patterns
        let baseWatchTime = user.avgSessionTime;
        
        if (selectedContent.difficulty === 'beginner' && user.experienceLevel === 'advanced') {
          baseWatchTime *= 0.7;
        } else if (selectedContent.difficulty === 'advanced' && user.experienceLevel === 'beginner') {
          baseWatchTime *= 0.4;
        }
        
        const maxWatchTime = Math.min(selectedContent.duration, baseWatchTime);
        const watchTime = Math.max(300, maxWatchTime * (0.5 + Math.random() * 0.5));
        
        const completionPercentage = Math.min(100, (watchTime / selectedContent.duration) * 100);
        const endTime = new Date(startTime.getTime() + watchTime * 1000);
        
        viewingHistoryEntries.push({
          userId: user._id,
          itemId: selectedContent._id,
          itemType: selectedContent.type,
          title: selectedContent.title,
          category: selectedContent.category,
          viewStartTime: startTime,
          viewEndTime: endTime,
          totalViewDuration: Math.floor(watchTime),
          actualDuration: selectedContent.duration,
          completionPercentage: Math.round(completionPercentage),
          pauseCount: Math.floor(Math.random() * 6),
          seekCount: Math.floor(Math.random() * 12),
          skipCount: Math.floor(Math.random() * 3),
          replayCount: Math.floor(Math.random() * 2),
          viewingContext: {
            source: ['homepage', 'search', 'recommendations', 'category'][Math.floor(Math.random() * 4)],
            device: ['desktop', 'mobile', 'tablet'][Math.floor(Math.random() * 3)],
            sessionId: new mongoose.Types.ObjectId().toString()
          },
          averagePlaybackSpeed: 1.0 + (Math.random() - 0.5) * 0.5,
          isActive: true
        });
      }
    }
    
    // Insert viewing history in batches
    console.log('💾 Inserting viewing history...');
    const batchSize = 100;
    for (let i = 0; i < viewingHistoryEntries.length; i += batchSize) {
      const batch = viewingHistoryEntries.slice(i, i + batchSize);
      await ViewingHistory.insertMany(batch);
      console.log(`   Inserted batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(viewingHistoryEntries.length/batchSize)}`);
    }
    
    console.log(`✅ Created ${viewingHistoryEntries.length} viewing history entries`);
    
    // Generate summary
    console.log('\n📈 Data Generation Summary:');
    console.log(`👥 Users: ${users.length}`);
    console.log(`📚 Content items: ${contentDocs.length}`);
    console.log(`👀 Viewing entries: ${viewingHistoryEntries.length}`);
    console.log(`📂 Categories: ${Object.keys(contentByCategory).length}`);
    
    // Category breakdown
    console.log('\n📊 Content by Category:');
    Object.entries(contentByCategory).forEach(([category, videos]) => {
      console.log(`  ${category}: ${videos.length} videos`);
    });
    
    // User persona breakdown
    console.log('\n👤 User Personas:');
    const personaCounts = {};
    users.forEach(user => {
      personaCounts[user.persona] = (personaCounts[user.persona] || 0) + 1;
    });
    Object.entries(personaCounts).forEach(([persona, count]) => {
      console.log(`  ${persona}: ${count} users`);
    });
    
    console.log('\n🎉 Comprehensive data generation completed!');
    console.log('🚀 Your recommendation engine now has rich, realistic data to work with!');
    
  } catch (error) {
    console.error('❌ Error generating data:', error.message);
    if (error.stack) console.error('Stack:', error.stack);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

// Check if running directly
if (require.main === module) {
  seedComprehensiveData();
}

module.exports = { seedComprehensiveData }; 