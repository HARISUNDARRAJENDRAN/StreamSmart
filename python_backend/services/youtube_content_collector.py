#!/usr/bin/env python3
"""
YouTube Content Collector using Web Scraping
Collects educational videos for each genre without API limitations
"""

import asyncio
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import re
import time
from dataclasses import dataclass
from enum import Enum

# YouTube scraping library - install with: pip install youtube-search-python
try:
    from youtubesearchpython import VideosSearch, ChannelsSearch
except ImportError:
    print("Please install youtube-search-python: pip install youtube-search-python")
    VideosSearch = None
    ChannelsSearch = None

logger = logging.getLogger(__name__)

class GenreCategory(Enum):
    # 🎯 Skill-Based Genres
    CODING_PROGRAMMING = "coding-programming"
    DATA_SCIENCE_AI = "data-science-ai"
    DESIGN = "design"
    DIGITAL_MARKETING = "digital-marketing"
    PRODUCTIVITY = "productivity"
    FINANCIAL_LITERACY = "financial-literacy"
    SOFT_SKILLS = "soft-skills"
    ENTREPRENEURSHIP = "entrepreneurship"
    WRITING_CONTENT = "writing-content"
    PUBLIC_SPEAKING = "public-speaking"
    
    # 📚 Academic Genres
    MATHEMATICS = "mathematics"
    PHYSICS = "physics"
    BIOLOGY = "biology"
    CHEMISTRY = "chemistry"
    HISTORY_CIVICS = "history-civics"
    LANGUAGE_LEARNING = "language-learning"
    
    # 💼 Career & Professional Development
    RESUME_JOB_HUNTING = "resume-job-hunting"
    INTERVIEW_PREPARATION = "interview-preparation"
    FREELANCING_REMOTE = "freelancing-remote"
    CERTIFICATIONS = "certifications"
    
    # 🧠 Tech News & Trends
    TECH_NEWS = "tech-news"
    AI_INNOVATION = "ai-innovation"
    STARTUPS = "startups"
    CYBERSECURITY = "cybersecurity"
    
    # 🧩 Mind-expanding & Curiosity Genres
    TRIVIA_FACTS = "trivia-facts"
    SCIENCE_EXPERIMENTS = "science-experiments"
    PSYCHOLOGY = "psychology"
    PHILOSOPHY = "philosophy"
    
    # 🛠️ DIY & Hands-on Learning
    ROBOTICS_IOT = "robotics-iot"
    ELECTRONICS_ARDUINO = "electronics-arduino"
    DIY_PROJECTS = "diy-projects"
    
    # 🌱 Lifestyle Learning
    HEALTH_FITNESS = "health-fitness"
    MENTAL_WELLNESS = "mental-wellness"
    SUSTAINABLE_LIVING = "sustainableliving"

@dataclass
class VideoData:
    video_id: str
    title: str
    description: str
    duration: str
    channel_name: str
    channel_id: str
    view_count: int
    upload_date: str
    thumbnail_url: str
    youtube_url: str
    tags: List[str]
    quality_score: float
    educational_indicators: Dict[str, Any]

class YouTubeContentCollector:
    def __init__(self):
        self.rate_limit_delay = 1  # Seconds between requests
        self.batch_size = 20  # Videos per request
        self.max_retries = 3
        
        # Enhanced filtering criteria
        self.min_view_count = 10000  # Minimum 10K views
        self.min_duration_seconds = 300  # Minimum 5 minutes (exclude shorts)
        self.max_duration_seconds = 14400  # Maximum 4 hours (reasonable limit)
        self.videos_per_genre_target = 2000  # Target 2000 videos per genre
        
        # Educational channel whitelist (high-quality educational channels)
        self.educational_channels = {
    'coding-programming': [
        'freeCodeCamp.org', 'Traversy Media', 'The Net Ninja',
        'Programming with Mosh', 'Academind', 'Dev Ed', 'Corey Schafer',
        'Tech With Tim', 'Fireship', 'CS Dojo', 'Codebasics',
        'Sentdex', 'Amigoscode', 'Clever Programmer', 'Kunal Kushwaha',
        'Fireship', 'Joma Tech', 'CodeWithHarry' # Added more
    ],
    'data-science-ai': [
        'StatQuest with Josh Starmer', 'Ken Jee', 'Krish Naik',
        'Data School', 'Simplilearn', 'codebasics', 'freeCodeCamp.org',
        'Sebastian Raschka', 'sentdex', 'deeplearning.ai', 'Two Minute Papers',
        'Henry AI Labs', 'Lex Fridman', 'Applied AI Course', 'Google AI' # Added more
    ],
    'design': [
        'CharliMarieTV', 'Flux', 'AJ&Smart', 'DesignCourse',
        'The Futur', 'Jesse Showalter', 'Canva', 'Envato Tuts+',
        'Satori Graphics', 'Will Paterson', 'Malewicz', 'Figma' # Added more
    ],
    'digital-marketing': [
        'Neil Patel', 'HubSpot', 'Simplilearn', 'Adam Erhart',
        'Marketing Examples', 'Think with Google', 'Backlinko',
        'Social Media Examiner', 'SEMrush', 'Ahrefs', 'GaryVee' # Added more
    ],
    'productivity': [
        'Ali Abdaal', 'Matt D\'Avella', 'Thomas Frank', 'Nathaniel Drew',
        'Better Ideas', 'Keep Productive', 'Productivity Guy',
        'Carl Pullein', 'Mike Vardy', 'Cal Newport' # Added more
    ],
    'financial-literacy': [
        'Graham Stephan', 'Nate O\'Brien', 'The Plain Bagel',
        'CA Rachana Phadke Ranade', 'Pranjal Kamra', 'The Financial Diet',
        'WhiteBoard Finance', 'Zerodha Varsity', 'Ankur Warikoo',
        'C.A. Karamjeet Singh', 'Dave Ramsey' # Added more
    ],
    'soft-skills': [
        'Charisma on Command', 'Vanessa Van Edwards', 'TED',
        'Communication Coach Alex Lyon', 'Improvement Pill',
        'Brendon Burchard', 'Patrick Bet-David', 'Jordan Peterson' # Added more
    ],
    'entrepreneurship': [
        'Y Combinator', 'GaryVee', 'Startup Grind', 'Slidebean',
        'Valuetainment', 'How to Start a Startup', 'Foundr',
        'My First Million', 'Biz Insider', 'Evan Carmichael' # Added more
    ],
    'writing-content': [
        'Reedsy', 'ShaelinWrites', 'Jenna Moreci', 'The Write Practice',
        'Now Novel', 'The Creative Penn', 'Scribendi',
        'Ellen Brock', 'National Novel Writing Month (NaNoWriMo)' # Added more
    ],
    'public-speaking': [
        'TEDx Talks', 'SpeakWell', 'Dananjaya Hettiarachchi',
        'Charisma Matrix', 'Art of Public Speaking',
        'Toastmasters International', 'Patricia Fripp', 'Brenda Meller' # Added more
    ],
    'mathematics': [
        '3Blue1Brown', 'Numberphile', 'PatrickJMT', 'Mathologer',
        'Khan Academy', 'Eddie Woo', 'Mathantics', 'Blackpenredpen',
        'MIT OpenCourseWare' # Added more
    ],
    'physics': [
        'MinutePhysics', 'Physics Girl', 'Veritasium', 'DrPhysicsA',
        'Khan Academy', 'Looking Glass Universe', 'Eugene Khutoryansky',
        'Prof. Walter Lewin. Lectures on Physics' # Added more
    ],
    'biology': [
        'Amoeba Sisters', 'CrashCourse', 'Nucleus Medical Media',
        'Bozeman Science', 'Khan Academy', 'Journey to the Microcosmos',
        'The Infographics Show (for some biological topics)' # Added more
    ],
    'chemistry': [
        'Tyler DeWitt', 'Periodic Videos', 'CrashCourse', 'Chemistry Help',
        'LearnChemE', 'Khan Academy', 'NurdRage',
        'Professor Dave Explains' # Added more
    ],
    'history-civics': [
        'CrashCourse', 'History Matters', 'Kings and Generals',
        'OverSimplified', 'BazBattles', 'Extra Credits (History)',
        'The Great Courses', 'Dan Carlin\'s Hardcore History (audio, but popular)',
        'Epic History TV', 'Kurzgesagt – In a Nutshell (some historical context)' # Added more
    ],
    'language-learning': [
        'Learn English with Bob the Canadian', 'Speak English With Mr Duncan',
        'Linguamarina', 'BBC Learning English', 'Easy Languages',
        'PolyglotPablo', 'KoreanClass101', 'Learn French with Alexa',
        'SpanishDict', 'German with Anja' # Added more
    ],
    'resume-job-hunting': [
        'Self Made Millennial', 'Linda Raynier', 'CareerVidz',
        'Indeed', 'Big Interview', 'J.T. O\'Donnell (Work It Daily)',
        'The Corporate Coder' # Added more
    ],
    'interview-preparation': [
        'TechLead', 'Clément Mihailescu', 'Ex-Google TechLead',
        'AlgoExpert', 'Gaurav Sen', 'Success with Rohan', 'Hired In Tech',
        'System Design Interview' # Added more
    ],
    'freelancing-remote': [
        'Fiverr', 'Hustle Hub', 'The Futur', 'Roberto Blake', 'Chris Do',
        'Upwork', 'Payoneer Official', 'Dylan J. Scott' # Added more
    ],
    'certifications': [
        'Simplilearn', 'Great Learning', 'Coursera', 'edX',
        'Google Career Certificates', 'AWS Training and Certification',
        'Microsoft Learn', 'IBM Skills Network' # Added more
    ],
    'tech-news': [
        'Marques Brownlee', 'Linus Tech Tips', 'CNET', 'TechLinked',
        'The Verge', 'ColdFusion', 'Mrwhosetheboss', 'Unbox Therapy',
        'Arun Maini (Mrwhosetheboss)' # Added more
    ],
    'ai-innovation': [
        'Two Minute Papers', 'AI Explained', 'Yannic Kilcher',
        'DeepMind', 'OpenAI', 'Henry AI Labs', 'Lex Fridman',
        'The AI Epiphany', 'Andrew Ng' # Added more
    ],
    'startups': [
        'Y Combinator', 'TechCrunch', 'a16z', 'StartUp Podcast',
        'This Week in Startups', 'GaryVee', 'Build Your SaaS',
        'Founders Grind' # Added more
    ],
    'cybersecurity': [
        'NetworkChuck', 'The Cyber Mentor', 'Darknet Diaries',
        'HackerSploit', 'Null Byte', 'John Hammond', 'LiveOverflow',
        'Seytonic' # Added more
    ],
    'trivia-facts': [
        'Wendover Productions', 'RealLifeLore', 'Half as Interesting',
        'Today I Found Out', 'Kurzgesagt – In a Nutshell',
        'Vsauce', 'SciShow', 'What If' # Added more
    ],
    'science-experiments': [
        'Mark Rober', 'The Action Lab', 'Steve Spangler Science',
        'Physics Girl', 'Sick Science!', 'Veritasium', 'Crazy Russian Hacker',
        'Grant Thompson - The King of Random' # Added more
    ],
    'psychology': [
        'Psych2Go', 'Kati Morton', 'Therapy in a Nutshell', 'The School of Life',
        'Better Ideas', 'SciShow Psych', 'Jordan B Peterson',
        'Dr. Tracey Marks' # Added more
    ],
    'philosophy': [
        'Wireless Philosophy', 'The School of Life', 'Philosophy Tube',
        'CrashCourse Philosophy', 'Einzelgänger', 'Academy of Ideas',
        'Exurb1a' # Added more
    ],
    'robotics-iot': [
        'ElectroBOOM', 'GreatScott!', 'Jeremy Fielding', 'Paul McWhorter',
        'DroneBot Workshop', 'Boston Dynamics', 'Adam Savage’s Tested',
        'All About Circuits' # Added more
    ],
    'electronics-arduino': [
        'Andreas Spiess', 'GreatScott!', 'EEVblog', 'Paul McWhorter',
        'Open Source Hardware Group', 'SparkFun Electronics', 'Adafruit Industries',
        'Make:' # Added more
    ],
    'diy-projects': [
        'DIY Perks', 'I Like To Make Stuff', 'Make:', 'Hacksmith Industries',
        'Peter Sripol', 'Evan and Katelyn', 'Laura Kampf',
        'April Wilkerson' # Added more
    ],
    'health-fitness': [
        'Jeff Nippard', 'Athlean-X', 'FitnessBlender', 'Doctor Mike',
        'Jeremy Ethier', 'Chris Heria', 'Pamela Reif',
        'Stronger By Science' # Added more
    ],
    'mental-wellness': [
        'Psych2Go', 'Kati Morton', 'Therapy in a Nutshell', 'The School of Life',
        'Better Ideas', 'Dr. Tracey Marks', 'HealthyGamerGG',
        'Mel Robbins' # Added more
    ],
    'sustainable-living': [
        'Sustainable Human', 'The Minimalists', 'Going Zero Waste',
        'Exploring Alternatives', 'Our Changing Climate', 'Shelob The Great (for specific DIYs)',
        'Fairyland Cottage', 'Rob Greenfield' # Added more
    ]
}
        
                # Search query templates for each genre
        self.genre_queries = {
            GenreCategory.CODING_PROGRAMMING: [
                "programming tutorial complete course",
                "coding bootcamp full course",
                "web development full stack course",
                "software engineering complete tutorial",
                "python programming full course",
                "javascript complete tutorial",
                "java programming full course",
                "c++ programming complete guide",
                "c programming full tutorial",
                "c# programming complete course",
                "ruby programming full course",
                "react js complete course",
                "node js full tutorial",
                "angular complete course",
                "vue js full course",
                "django complete tutorial",
                "flask programming course",
                "spring boot full course",
                "data structures algorithms course",
                "object oriented programming tutorial",
                "php programming",
                "sql programming",
                "mongodb programming",
                "react programming",
                "nodejs programming",
                "express programming",
                "django programming",
                "flutter programming",
                "kotlin programming",
                "swift programming",
                "rust programming",
                "go programming",
                "typescript programming",
                "vuejs programming",
                "angular programming",
                "react native programming",
                "algorithms and data structures",
                "object oriented programming concepts",
                "functional programming tutorial",
                "clean code practices",
                "software design patterns",
                "debugging techniques",
                "testing in programming",
                "version control systems",
                "unix programming",
                "powershell scripting",
                "bash scripting",
                "shell scripting",
                "command line interface",
                "terminal commands",
                "linux commands",
                "windows commands",
                "windows powershell"
            ],
            GenreCategory.DATA_SCIENCE_AI: [
                "data science tutorial",
                "data analysis tutorial",
                "data visualization course",
                "statistical analysis for data science",
                "exploratory data analysis (EDA)",
                "data cleaning and preprocessing",
                "data engineering tutorial",
                "big data analytics",
                "data warehousing concepts",
                "business intelligence (BI) dashboard design",
                "data storytelling",
                "data ethics and privacy",
                "SQL for data analysis",
                "NoSQL databases for data science",
                "data visualization for data science",
                "data mining techniques",
                "data modeling for data science",
                "data integration for data science",
                "data governance for data science",
                "data security for data science",
                "machine learning course",
                "machine learning for beginners",
                "supervised learning algorithms",
                "unsupervised learning algorithms",
                "reinforcement learning explained",
                "machine learning model deployment",
                "MLOps best practices",
                "feature engineering techniques",
                "model evaluation metrics",
                "bias and fairness in AI",
                "interpretable AI (XAI)",
                "time series analysis machine learning",
                "causal inference in machine learning",
                "deep learning tutorial",
                "neural networks explained",
                "convolutional neural networks (CNN)",
                "recurrent neural networks (RNN)",
                "generative adversarial networks (GAN)",
                "transformers deep learning",
                "deep learning frameworks (TensorFlow, PyTorch)",
                "computer vision tutorial",
                "image recognition deep learning",
                "object detection tutorial",
                "semantic segmentation deep learning",
                "deep learning for computer vision",
                "deep learning for natural language processing",
                "deep learning for speech recognition",
                "deep learning for robotics",
                "deep learning for autonomous vehicles",
                "deep learning for healthcare",
                "natural language processing (NLP) tutorial",
                "large language models (LLMs) explained",
                "LLM fine-tuning techniques",
                "prompt engineering guide",
                "generative AI applications",
                "natural language understanding (NLU)",
                "natural language generation (NLG)",
                "text classification NLP",
                "sentiment analysis tutorial",
                "named entity recognition (NER)",
                "machine translation deep learning",
                "chatbot development AI",
                "retrieval-augmented generation (RAG)",
                "python data analysis (Pandas, NumPy)",
                "R programming for data science",
                "scikit-learn tutorial",
                "TensorFlow Keras tutorial",
                "PyTorch tutorial",
                "Apache Spark data processing",
                "Databricks platform tutorial",
                "Snowflake data warehouse",
                "Power BI data visualization",
                "Tableau data visualization",
                "Jupyter Notebook best practices",
                "Google Colab tutorial",
                "AWS data services",
                "Azure data services",
                "Google Cloud data services",
                "data engineering tools",
                "data engineering best practices",
                "reinforcement learning applications",
                "graph neural networks (GNN)",
                "quantum machine learning",
                "federated learning explained",
                "edge AI deployment",
                "ethical AI development",
                "AI governance and policy",
                "AI ethics and bias",
                "AI explainability and interpretability",
                "AI in healthcare",
                "AI in finance",
                "AI in marketing",
                "AI in education",
                "data science for business strategy",
                "data science in finance (quant finance)",
                "data science for healthcare innovation",
                "data science in marketing analytics",
                "AI in robotics",
                "AI in autonomous vehicles",
                "data science for cybersecurity",
                "AI for climate change research",
                "data science in urban planning",
                "AI in gaming",
                "data science for social good projects",
                "AI in education technology",
                "AI in agriculture",
                "AI in transportation",
                "AI in energy",
                "AI in environment",
                "AI in law",
                "AI in social sciences"
            ],
            GenreCategory.DESIGN: [
                "design principles guide",
                "elements of design explained",
                "color theory for designers",
                "typography fundamentals",
                "composition in design",
                "design thinking process",
                "visual hierarchy design",
                "branding and identity design",
                "design history overview",
                "creative design techniques",
                "UI UX design tutorial",
                "user experience (UX) research methods",
                "user interface (UI) design best practices",
                "usability testing guide",
                "wireframing and prototyping tools",
                "responsive web design principles",
                "mobile app UI design",
                "design system creation",
                "interaction design principles",
                "accessibility in UI UX",
                "information architecture design",
                "graphic design for beginners",
                "logo design tutorial",
                "poster design techniques",
                "brochure design guide",
                "social media graphics design",
                "illustration techniques digital",
                "print design fundamentals",
                "photo editing tutorial",
                "vector graphics design",
                "raster graphics basics",
                "web design tutorial",
                "frontend web design basics",
                "html css web design",
                "website layout design",
                "e-commerce website design",
                "portfolio website design",
                "web typography best practices",
                "website responsiveness guide",
                "product design process",
                "industrial design principles",
                "3D modeling for product design",
                "CAD software tutorial",
                "design for manufacturing (DFM)",
                "ergonomics in design",
                "user-centered design (UCD)",
                "motion graphics tutorial",
                "2D animation principles",
                "3D animation basics",
                "explainer video animation",
                "kinetic typography",
                "visual effects (VFX) design",
                "Figma design tutorial",
                "Adobe XD tutorial",
                "Sketch design guide",
                "Photoshop graphic design",
                "Illustrator vector art",
                "InDesign desktop publishing",
                "After Effects motion design",
                "Blender 3D modeling",
                "Canva design tips",
                "architecture design principles",
                "interior design basics",
                "space planning and layout",
                "sustainable design practices",
                "architectural visualization",
                "fashion design fundamentals",
                "textile design patterns",
                "garment construction basics",
                "fashion illustration techniques",
                "sustainable fashion design",
                "design portfolio creation",
                "freelance design tips",
                "design career path",
                "creative block solutions",
                "design trends future"
            ],
            GenreCategory.DIGITAL_MARKETING: [
                "digital marketing tutorial",
                "digital marketing course for beginners",
                "digital marketing strategy guide",
                "online marketing fundamentals",
                "internet marketing basics",
                "marketing funnel explained",
                "customer journey mapping",
                "digital marketing KPIs",
                "integrated digital marketing",
                "marketing automation platforms",
                "SEO tutorial for beginners",
                "on-page SEO techniques",
                "off-page SEO strategies",
                "technical SEO audit",
                "keyword research tools",
                "link building guide",
                "local SEO marketing",
                "content SEO optimization",
                "Google Analytics for SEO",
                "SEO ranking factors",
                "SEM advertising tutorial",
                "Google Ads campaign setup",
                "PPC advertising strategies",
                "Bing Ads tutorial",
                "display advertising networks",
                "remarketing and retargeting ads",
                "ad copywriting best practices",
                "A/B testing for ads",
                "Google Ads bidding strategies",
                "paid search optimization",
                "social media marketing strategy",
                "Facebook marketing guide",
                "Instagram marketing tips",
                "LinkedIn marketing for business",
                "Twitter marketing strategy",
                "TikTok marketing trends",
                "YouTube marketing tutorial",
                "social media content creation",
                "influencer marketing campaigns",
                "social media advertising basics",
                "community management social media",
                "content marketing strategy",
                "blogging for business",
                "content creation ideas",
                "video marketing production",
                "podcast marketing guide",
                "webinar marketing tips",
                "e-book creation and promotion",
                "content repurposing strategies",
                "storytelling in marketing",
                "content distribution channels",
                "email marketing automation",
                "email list building strategies",
                "email newsletter design",
                "drip campaign tutorial",
                "email deliverability tips",
                "segmentation email marketing",
                "email marketing analytics",
                "cold email outreach best practices",
                "Google Analytics 4 tutorial (GA4)",
                "digital marketing analytics dashboard",
                "marketing data analysis",
                "conversion rate optimization (CRO)",
                "web analytics for marketers",
                "marketing attribution models",
                "affiliate marketing for beginners",
                "affiliate program selection",
                "affiliate marketing strategies",
                "e-commerce digital marketing",
                "online store promotion",
                "product listing optimization (PLO)",
                "Shopify marketing tips",
                "Amazon FBA marketing",
                "mobile marketing strategies",
                "app store optimization (ASO)",
                "voice search optimization",
                "online reputation management (ORM)",
                "public relations digital age",
                "growth hacking techniques",
                "digital marketing certifications",
                "digital marketing tools overview",
                "freelance digital marketing career",
                "how to become a digital marketer"
                        ],
            GenreCategory.PRODUCTIVITY: [
                "productivity tips",
                "productivity hacks",
                "time management techniques",
                "goal setting strategies",
                "task prioritization methods",
                "focus and concentration improvement",
                "overcoming procrastination",
                "daily routine optimization",
                "morning routines for productivity",
                "evening routines for productivity",
                "personal productivity systems",
                "mindfulness for productivity",
                "energy management for productivity",
                "digital detox for focus",
                "Getting Things Done (GTD) methodology",
                "Pomodoro Technique explanation",
                "Eisenhower Matrix tutorial",
                "Agile for personal productivity",
                "Scrum for small teams productivity",
                "Kanban board productivity",
                "habit stacking guide",
                "SMART goals framework",
                "batching tasks for efficiency",
                "productivity tools",
                "project management software review",
                "task management apps",
                "note-taking apps for productivity",
                "calendar management tools",
                "time tracking software",
                "focus apps for work",
                "collaboration tools for teams",
                "AI tools for productivity",
                "automation tools for work",
                "workplace productivity tips",
                "remote work productivity",
                "meeting effectiveness strategies",
                "email management best practices",
                "effective delegation skills",
                "workflow optimization for professionals",
                "desk organization for productivity",
                "reducing distractions at work",
                "professional development for productivity",
                "burnout prevention strategies",
                "work-life balance tips",
                "leadership productivity skills",
                "effective learning strategies",
                "speed reading techniques",
                "memory improvement for productivity",
                "skill acquisition methods",
                "online course productivity tips",
                "productivity for beginners",
                "productivity for students",
                "productivity for remote workers",
                "productivity for entrepreneurs",
                "productivity for busy parents",
                "productivity for creatives",
                "productivity for sales professionals"
            ],
            GenreCategory.FINANCIAL_LITERACY: [
                "financial literacy tutorial",
                "financial literacy course",
                "financial literacy for beginners",
                "personal finance basics",
                "money management tips",
                "budgeting strategies for individuals",
                "understanding income and expenses",
                "net worth calculation",
                "financial goals setting",
                "compound interest explained",
                "time value of money concepts",
                "inflation impact on savings",
                "financial planning roadmap",
                "how to save money effectively",
                "emergency fund guide",
                "different types of savings accounts",
                "investing for beginners",
                "stock market investing basics",
                "mutual funds explained",
                "exchange traded funds (ETFs) investing",
                "real estate investing for financial literacy",
                "retirement planning strategies",
                "long-term investment planning",
                "diversification of investments",
                "risk assessment investing",
                "financial advisors vs robo-advisors",
                "understanding investment returns",
                "demat account basics",
                "SIP investing strategy India",
                "debt management strategies",
                "how to pay off debt fast",
                "credit score improvement tips",
                "understanding credit reports",
                "types of credit cards",
                "loans and interest rates explained",
                "mortgage basics for homebuyers",
                "student loan management",
                "debt consolidation options",
                "avoiding high-interest debt",
                "understanding income tax basics",
                "tax planning for individuals",
                "tax-saving investments India",
                "GST basics for small business India",
                "life insurance explained",
                "health insurance guide",
                "car insurance essentials",
                "homeowners insurance basics",
                "disability insurance importance",
                "understanding insurance premiums and deductibles",
                "financial planning for marriage",
                "financial planning for starting a family",
                "financial planning for buying a home",
                "financial planning for education expenses",
                "retirement planning checklist",
                "estate planning basics",
                "succession planning financial",
                "financial literacy for young adults",
                "financial literacy for seniors",
                "financial resilience during economic downturns",
                "financial literacy for business owners",
                "small business finance management",
                "startup funding basics",
                "understanding business financial statements",
                "cash flow management for businesses",
                "financial forecasting for startups",
                "raising capital for small business",
                "consumer rights financial services",
                "understanding financial scams",
                "identity theft prevention",
                "online banking security tips",
                "choosing a bank account",
                "digital payment safety",
                "understanding global economy basics",
                "impact of interest rate changes",
                "financial regulations overview",
                "behavioral finance insights",
                "financial literacy for professionals",
                "financial literacy for marketing professionals",
                "financial literacy for management",
                "financial literacy for sales",
                "financial literacy for non-finance roles"
            ],
                       GenreCategory.SOFT_SKILLS: [
                "soft skills tutorial",
                "soft skills course",
                "soft skills for beginners",
                "soft skills for professionals",
                "soft skills for business",
                "soft skills for marketing",
                "communication skills improvement",
                "effective communication at work",
                "active listening techniques",
                "verbal communication tips",
                "non-verbal communication guide",
                "interpersonal skills development",
                "teamwork and collaboration skills",
                "conflict resolution strategies",
                "negotiation skills training",
                "emotional intelligence development",
                "empathy in communication",
                "adaptability skills for career",
                "problem-solving techniques",
                "critical thinking skills",
                "creativity and innovation skills",
                "leadership skills development",
                "decision making skills",
                "stress management techniques",
                "time management soft skills",
                "work ethic development",
                "professionalism in the workplace",
                "building strong relationships",
                "feedback skills giving and receiving",
                "cross-cultural communication",
                "personal branding for professionals"
            ],
            GenreCategory.ENTREPRENEURSHIP: [
                "how to start a business",
                "entrepreneurship for beginners",
                "startup business plan guide",
                "startup funding options",
                "venture capital explained",
                "angel investing basics",
                "bootstrapping a startup",
                "lean startup methodology",
                "market research for startups",
                "identifying business opportunities",
                "startup legal requirements",
                "business model canvas tutorial",
                "product-market fit strategy",
                "minimum viable product (MVP) development",
                "sales strategies for startups",
                "marketing for small business",
                "customer acquisition strategies",
                "scaling a business",
                "entrepreneurial mindset development",
                "leadership in entrepreneurship",
                "networking for entrepreneurs",
                "pitching to investors",
                "exit strategies for entrepreneurs",
                "e-commerce entrepreneurship",
                "social entrepreneurship ideas",
                "franchising business model",
                "small business management",
                "innovation in entrepreneurship",
                "risk management for startups",
                "building a startup team"
            ],
            GenreCategory.WRITING_CONTENT: [
                "content writing tutorial",
                "creative writing techniques",
                "copywriting for marketing",
                "blog writing guide",
                "SEO content writing",
                "grammar and punctuation rules",
                "storytelling in writing",
                "technical writing basics",
                "academic writing skills",
                "business writing best practices",
                "editing and proofreading tips",
                "content strategy development",
                "content creation ideas",
                "scriptwriting for video",
                "social media content creation",
                "email copywriting",
                "headline writing techniques",
                "call to action (CTA) writing",
                "web content optimization",
                "fiction writing prompts",
                "non-fiction writing guide",
                "journalism writing fundamentals",
                "content repurposing strategies",
                "plagiarism avoidance in writing",
                "how to write a book",
                "screenwriting essentials",
                "report writing skills",
                "press release writing"
            ],
            GenreCategory.PUBLIC_SPEAKING: [
                "public speaking tips",
                "public speaking course",
                "public speaking for beginners",
                "how to overcome public speaking anxiety",
                "presentation skills training",
                "effective presentation delivery",
                "body language for public speaking",
                "vocal projection techniques",
                "storytelling in public speaking",
                "structuring a speech",
                "audience engagement strategies",
                "persuasive speaking techniques",
                "impromptu speaking tips",
                "using visual aids effectively",
                "handling Q&A sessions",
                "speech writing guide",
                "TED Talk presentation analysis",
                "confidence building public speaking",
                "virtual presentation best practices",
                "keynote speaking tips",
                "mastering your voice for speaking",
                "delivering powerful speeches",
                "public speaking for sales professionals",
                "public speaking for leaders"
            ],
            GenreCategory.MATHEMATICS: [
                "mathematics lecture university",
                "calculus tutorial explained",
                "linear algebra course",
                "statistics for beginners",
                "math problem solving strategies",
                "algebra basics explained",
                "geometry theorems and proofs",
                "trigonometry fundamentals",
                "pre-calculus review",
                "differential equations course",
                "discrete mathematics tutorial",
                "probability theory concepts",
                "abstract algebra introduction",
                "real analysis fundamentals",
                "complex analysis course",
                "numerical methods in mathematics",
                "mathematical modeling techniques",
                "applied mathematics examples",
                "set theory explained",
                "logic and proofs mathematics",
                "cryptography mathematics",
                "financial mathematics concepts",
                "data science math prerequisites",
                "mathematics Olympiad problems",
                "Vedic mathematics techniques",
                "JEE Main Advanced Mathematics",
                "NEET Mathematics preparation"
            ],
            GenreCategory.PHYSICS: [
                "physics lecture university",
                "physics concepts explained",
                "quantum physics tutorial",
                "physics for engineering",
                "physics JEE NEET",
                "classical mechanics course",
                "electromagnetism principles",
                "thermodynamics physics explained",
                "optics and waves physics",
                "modern physics introduction",
                "astrophysics for beginners",
                "particle physics basics",
                "condensed matter physics",
                "statistical mechanics course",
                "fluid dynamics tutorial",
                "solid state physics",
                "nuclear physics concepts",
                "relativity theory simplified",
                "experimental physics techniques",
                "computational physics methods",
                "physics problem solving strategies",
                "physics numericals explained",
                "physics practical experiments",
                "JEE Main Advanced Physics",
                "NEET Physics preparation",
                "board exam physics revision"
            ],
            GenreCategory.CHEMISTRY: [
                "chemistry lecture university",
                "organic chemistry tutorial",
                "chemical reactions explained",
                "chemistry lab experiments",
                "chemistry JEE NEET",
                "inorganic chemistry basics",
                "physical chemistry concepts",
                "analytical chemistry methods",
                "biochemistry introduction",
                "general chemistry course",
                "periodic table explained",
                "chemical bonding types",
                "stoichiometry calculations",
                "acids and bases chemistry",
                "thermodynamics in chemistry",
                "electrochemistry principles",
                "quantum chemistry fundamentals",
                "polymer chemistry basics",
                "environmental chemistry topics",
                "industrial chemistry processes",
                "medicinal chemistry overview",
                "food chemistry science",
                "nanochemistry applications",
                "chemistry nomenclature rules",
                "titration lab procedure",
                "JEE Main Advanced Chemistry",
                "NEET Chemistry preparation",
                "board exam chemistry revision"
            ],
            GenreCategory.BIOLOGY: [
                "biology lecture university",
                "cell biology explained",
                "genetics tutorial",
                "anatomy and physiology",
                "biology JEE NEET",
                "molecular biology concepts",
                "ecology and environment biology",
                "evolutionary biology principles",
                "microbiology for beginners",
                "botany plant science",
                "zoology animal science",
                "human biology systems",
                "biotechnology applications",
                "neuroscience introduction",
                "immunology basics",
                "virology explained",
                "bioinformatics methods",
                "genomic sequencing explained",
                "heredity and variation biology",
                "biological classification systems",
                "photosynthesis and respiration",
                "DNA replication and protein synthesis",
                "ecology population dynamics",
                "disease biology mechanisms",
                "biological research techniques",
                "JEE Main Advanced Biology",
                "NEET Biology preparation",
                "board exam biology revision"
            ],
            GenreCategory.HISTORY_CIVICS: [
                "history lecture university",
                "civics lecture university",
                "history of the world",
                "history of the United States",
                "history of the United Kingdom",
                "ancient civilizations history",
                "medieval history explained",
                "renaissance period history",
                "enlightenment era history",
                "world war 1 history",
                "world war 2 history",
                "cold war history explained",
                "modern history overview",
                "Indian history independence movement",
                "Mughal empire history India",
                "ancient Indian history",
                "democracy principles civics",
                "government structure civics",
                "citizen rights and responsibilities",
                "constitutional law basics",
                "political systems comparative",
                "human rights history",
                "social justice movements history",
                "economic history global",
                "cultural history studies",
                "archaeology discoveries history",
                "historical research methods",
                "current affairs and civics",
                "global governance and civics",
                "impact of technology on history"
            ],
            GenreCategory.LANGUAGE_LEARNING: [
                "language learning tutorial",
                "language learning course",
                "language learning for beginners",
                "language learning for professionals",
                "language learning for business",
                "learn Spanish fast",
                "French language lessons",
                "German grammar explained",
                "Japanese conversational phrases",
                "Mandarin Chinese for travel",
                "English pronunciation practice",
                "ESL grammar rules",
                "spoken English fluency",
                "Hindi speaking course",
                "Tamil language learning for beginners",
                "Kannada phrases for daily use",
                "Telugu learning basics",
                "Malayalam spoken course",
                "Bengali language lessons",
                "Arabic calligraphy learning",
                "Russian alphabet pronunciation",
                "Korean language basics",
                "sign language for beginners",
                "language immersion techniques",
                "vocabulary building strategies",
                "grammar rules explained",
                "effective listening skills language",
                "writing in a new language",
                "language learning apps review",
                "bilingualism benefits",
                "polyglot learning strategies"
            ],
            GenreCategory.RESUME_JOB_HUNTING: [
                "resume writing tutorial",
                "resume writing course",
                "resume writing for beginners",
                "resume writing for professionals",
                "resume writing for business",
            ],
            GenreCategory.AI_INNOVATION: [
                "AI innovation latest trends",
                "future of artificial intelligence",
                "AI ethics and societal impact",
                "generative AI applications",
                "AI in healthcare breakthroughs",
                "AI in education technology",
                "AI for climate change solutions",
                "robotics and AI integration",
                "AI research and development",
                "machine learning innovation",
                "deep learning advancements",
                "natural language processing innovation",
                "computer vision future",
                "AI in autonomous vehicles",
                "AI in finance innovation",
                "AI startup landscape",
                "AI policy and regulation",
                "human-AI collaboration",
                "explainable AI (XAI) innovation",
                "responsible AI development",
                "AI for social good projects",
                "quantum computing and AI",
                "edge AI applications",
                "AI innovation challenges",
                "AI investment trends",
                "AI in smart cities",
                "AI in art and creativity",
                "AI in entertainment industry",
                "AI in manufacturing innovation",
                "AI in supply chain management",
            ],
            GenreCategory.STARTUPS: [
               "how to start a startup",
               "startup funding guide",
               "startup business plan",
               "startup marketing strategies",
               "startup pitch deck examples",
               "lean startup methodology",
               "startup incubators and accelerators",
               "finding a co-founder for startup",
               "startup legal considerations",
               "building a minimum viable product (MVP)",
               "customer acquisition for startups",
               "startup growth hacking",
               "bootstrapping a business",
               "venture capital explained for startups",
               "angel investment for startups",
               "startup valuation methods",
               "startup sales strategies",
               "startup product development",
               "startup team building",
               "managing startup finances",
               "pivot strategy for startups",
               "startup challenges and solutions",
               "successful startup stories",
               "tech startup trends",
               "fintech startups to watch",
               "edtech startup ideas",
               "saas startup guide",
               "social impact startups",
               "exiting a startup",
               "startup ecosystem India",
            ],
            GenreCategory.CYBERSECURITY: [
               "cybersecurity for beginners",
               "cybersecurity threats explained",
               "data breach prevention",
               "network security fundamentals",
               "internet security tips",
               "ethical hacking tutorial",
               "malware protection guide",
               "phishing scam awareness",
               "ransomware prevention",
               "cyber security best practices",
               "digital privacy protection",
               "cloud security architecture",
               "endpoint security solutions",
               "identity and access management (IAM)",
               "security information and event management (SIEM)",
               "penetration testing methods",
               "vulnerability assessment explained",
               "cybersecurity career path",
               "cyber law and regulations",
               "cryptography basics for cybersecurity",
               "secure coding practices",
               "mobile device security",
               "IoT security challenges",
               "social engineering attacks",
               "password security tips",
               "two-factor authentication setup",
               "VPN usage and benefits",
               "cybersecurity incident response",
               "SCADA system security",
               "zero trust security model",
            ],
GenreCategory.TRIVIA_FACTS: [
    "random fun facts",
    "amazing science facts",
    "history trivia questions",
    "world geography facts",
    "animal kingdom facts",
    "human body amazing facts",
    "space and astronomy facts",
    "famous historical events trivia",
    "movie trivia questions",
    "music trivia facts",
    "sports trivia questions",
    "technology interesting facts",
    "curious facts about daily life",
    "unexpected historical facts",
    "weird science facts",
    "mythology facts and legends",
    "cultural trivia around the world",
    "language facts and origins",
    "food and drink facts",
    "world records astonishing facts",
    "ancient mysteries explained",
    "nature facts and phenomena",
    "famous inventions facts",
    "psychology fun facts",
    "did you know facts",
    "true crime trivia",
    "pop culture trivia",
    "art history facts",
    "architecture famous facts",
    "geological facts about earth",
],
GenreCategory.SCIENCE_EXPERIMENTS: [
    "science experiments for kids",
    "easy home science experiments",
    "chemistry experiments at home",
    "physics experiments explained",
    "biology lab experiments",
    "simple science projects",
    "STEM experiments for schools",
    "fun science activities",
    "kitchen science experiments",
    "electricity experiments safe",
    "light and sound experiments",
    "magnetism experiments for students",
    "plant science experiments",
    "animal science projects",
    "forces and motion experiments",
    "density experiments water",
    "chemical reactions experiments",
    "pH testing experiments",
    "crystal growing experiment",
    "volcano experiment baking soda",
    "DIY science fair projects",
    "scientific method in experiments",
    "materials science experiments",
    "environmental science experiments",
    "atmospheric science experiments",
    "astronomy observation projects",
    "forensic science experiments",
    "microscope experiments for beginners",
    "robotics simple experiments",
    "coding related science experiments",
],
GenreCategory.PSYCHOLOGY: [
    "psychology for beginners",
    "introduction to psychology",
    "cognitive psychology concepts",
    "developmental psychology stages",
    "social psychology experiments",
    "abnormal psychology disorders",
    "personality psychology theories",
    "clinical psychology career",
    "counseling psychology basics",
    "neuroscience and psychology",
    "behavioral psychology principles",
    "human motivation theories",
    "emotions and psychology",
    "stress and coping mechanisms",
    "memory and learning psychology",
    "perception psychology explained",
    "child psychology development",
    "adolescent psychology challenges",
    "adult development psychology",
    "organizational psychology workplace",
    "forensic psychology careers",
    "sports psychology mental training",
    "positive psychology concepts",
    "mindfulness and psychology",
    "sleep psychology science",
    "addiction psychology understanding",
    "trauma and resilience psychology",
    "group dynamics psychology",
    "psychological research methods",
    "ethics in psychology practice",
],
GenreCategory.PHILOSOPHY: [
    "introduction to philosophy",
    "history of Western philosophy",
    "ancient Greek philosophy",
    "Socrates Plato Aristotle philosophy",
    "ethics philosophy moral dilemmas",
    "epistemology theory of knowledge",
    "metaphysics reality questions",
    "logic philosophy reasoning",
    "political philosophy theories",
    "philosophy of mind consciousness",
    "existentialism explained",
    "stoicism philosophy daily life",
    "Eastern philosophy traditions",
    "Indian philosophy schools",
    "Chinese philosophy teachings",
    "Buddhist philosophy principles",
    "philosophy of science",
    "philosophy of religion",
    "aesthetics philosophy of art",
    "philosophy of language",
    "free will and determinism philosophy",
    "meaning of life philosophy",
    "critical thinking philosophy",
    "arguments and fallacies philosophy",
    "applied ethics case studies",
    "virtue ethics explained",
    "deontology philosophy example",
    "consequentialism theory",
    "postmodernism philosophy basics",
    "contemporary philosophy trends",
],
GenreCategory.ROBOTICS_IOT: [
    "robotics for beginners",
    "internet of things (IoT) explained",
    "how robots work basics",
    "robot programming tutorial",
    "robotics engineering career",
    "industrial robotics applications",
    "humanoid robots development",
    "ROS robot operating system tutorial",
    "IoT device development",
    "smart home IoT systems",
    "industrial IoT (IIoT) solutions",
    "IoT security challenges",
    "IoT data analytics",
    "embedded systems for IoT",
    "robot sensors and actuators",
    "robot vision systems",
    "machine learning in robotics",
    "AI and robotics integration",
    "drone technology basics",
    "robot locomotion types",
    "wearable IoT devices",
    "smart city IoT applications",
    "robot ethics and regulations",
    "automaton and robotics",
    "IoT connectivity options (e.g., LoRa, 5G)",
    "edge computing in IoT",
    "robot grippers and manipulators",
    "autonomous robots navigation",
    "IoT platform comparison",
    "robot simulation software",
],
GenreCategory.ELECTRONICS_ARDUINO: [
    "electronics for beginners",
    "Arduino tutorial projects",
    "basic electronics components",
    "circuit design fundamentals",
    "Ohm's Law explained",
    "resistors capacitors inductors explained",
    "LED circuits tutorial",
    "transistor amplifier basics",
    "digital electronics introduction",
    "analog electronics concepts",
    "breadboard circuits for beginners",
    "soldering techniques electronics",
    "multimeter usage guide",
    "Arduino programming basics",
    "Arduino sensors tutorial",
    "Arduino simple projects",
    "ESP32 projects IoT",
    "Raspberry Pi electronics projects",
    "microcontroller programming",
    "PCB design tutorial",
    "power supply design electronics",
    "op-amp circuits explained",
    "logic gates electronics",
    "robotics electronics basics",
    "DIY electronics kits",
    "electronics repair tips",
    "Internet of Things with Arduino",
    "home automation electronics",
    "embedded C programming for microcontrollers",
    "electronic circuit simulation software",
],
GenreCategory.DIY_PROJECTS: [
    "DIY home improvement projects",
    "easy DIY crafts for beginners",
    "woodworking DIY projects",
    "DIY furniture plans",
    "DIY home decor ideas",
    "DIY garden projects",
    "DIY electronics projects",
    "DIY gifts ideas",
    "DIY repair guides",
    "DIY art projects",
    "DIY fashion projects",
    "DIY beauty products recipes",
    "DIY car maintenance tips",
    "DIY painting techniques",
    "DIY plumbing repairs",
    "DIY electrical repairs safe",
    "DIY organizing ideas",
    "DIY storage solutions",
    "DIY festive decorations",
    "upcycling DIY projects",
    "DIY cleaning solutions",
    "DIY pet projects",
    "DIY wedding decorations",
    "DIY photography backdrops",
    "DIY smart home projects",
    "DIY solar panel installation",
    "DIY composting bins",
    "DIY concrete projects",
    "DIY outdoor living space",
    "DIY workbench build",
],
GenreCategory.HEALTH_FITNESS: [
    "health and fitness tips",
    "beginner workout routine",
    "strength training for women",
    "cardio exercises at home",
    "healthy eating habits",
    "meal prep ideas for fitness",
    "weight loss tips healthy",
    "muscle gain workout plan",
    "yoga for flexibility",
    "Pilates for core strength",
    "mindful eating guide",
    "nutrition basics explained",
    "hydration benefits health",
    "sleep hygiene improvement",
    "stress reduction techniques health",
    "posture correction exercises",
    "flexibility training guide",
    "endurance training tips",
    "sports nutrition basics",
    "injury prevention exercises",
    "bodyweight workout routine",
    "HIIT workout benefits",
    "meditation for physical health",
    "gut health and diet",
    "immunity boosting foods",
    "managing chronic conditions healthy lifestyle",
    "fitness motivation tips",
    "running training plan",
    "swimming for fitness",
    "cycling for health benefits",
],
GenreCategory.MENTAL_WELLNESS: [
    "mental wellness tips",
    "stress management techniques",
    "anxiety relief strategies",
    "coping with depression",
    "mindfulness meditation guide",
    "building resilience mental health",
    "improving emotional intelligence",
    "self-care practices for wellness",
    "overcoming negative thoughts",
    "cognitive behavioral therapy (CBT) basics",
    "dialectical behavior therapy (DBT) skills",
    "building healthy habits mental health",
    "setting boundaries for mental wellness",
    "digital well-being tips",
    "sleep improvement for mental health",
    "grief and loss coping",
    "anger management strategies",
    "improving self-esteem",
    "finding purpose and meaning",
    "gratitude practice benefits",
    "journaling for mental clarity",
    "therapy options explained",
    "supporting someone with mental illness",
    "burnout recovery strategies",
    "work-life balance mental health",
    "social connections for wellness",
    "positive psychology applications",
    "trauma informed care explained",
    "understanding mental health stigma",
    "addiction recovery support",
],
GenreCategory.SUSTAINABLE_LIVING: [
    "sustainable living for beginners",
    "eco-friendly lifestyle tips",
    "reducing carbon footprint home",
    "zero waste living guide",
    "sustainable fashion brands",
    "renewable energy for homes",
    "composting at home",
    "recycling best practices",
    "upcycling ideas sustainable",
    "sustainable food choices",
    "plant-based diet sustainability",
    "organic gardening tips",
    "water conservation methods",
    "energy saving tips home",
    "eco-friendly cleaning products DIY",
    "sustainable transportation options",
    "green building concepts",
    "reduce reuse recycle explained",
    "ethical consumerism guide",
    "plastic reduction strategies",
    "sustainable travel tips",
    "biodiversity conservation importance",
    "climate change solutions individual actions",
    "local sourcing benefits sustainability",
    "minimizing food waste",
    "sustainable packaging solutions",
    "eco-friendly transportation",
    "community sustainability projects",
    "renewable resources explained",
    "sustainable home design",
]   
        }

    def extract_video_id(self, url: str) -> Optional[str]:
        """Extract YouTube video ID from URL"""
        if not url:
            return None
            
        patterns = [
            r'(?:youtube\.com/watch\?v=|youtu\.be/|youtube\.com/embed/)([^&\n?#]+)',
            r'youtube\.com/watch\?.*v=([^&\n?#]+)'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                return match.group(1)
        return None

    def parse_duration(self, duration_str: str) -> int:
        """Convert duration string to seconds"""
        if not duration_str:
            return 0
            
        try:
            # Handle different duration formats
            time_parts = duration_str.split(':')
            if len(time_parts) == 2:  # MM:SS
                return int(time_parts[0]) * 60 + int(time_parts[1])
            elif len(time_parts) == 3:  # HH:MM:SS
                return int(time_parts[0]) * 3600 + int(time_parts[1]) * 60 + int(time_parts[2])
        except:
            pass
        return 0

    def calculate_quality_score(self, video: Dict[str, Any]) -> float:
        """Calculate educational quality score for a video with enhanced filtering"""
        score = 0.0
        
        # View count factor (normalized) - Enhanced scoring for higher view counts
        view_count_text = video.get('viewCount', {})
        if isinstance(view_count_text, dict):
            view_count_text = view_count_text.get('text', '0')
        
        try:
            views = self._parse_view_count(str(view_count_text))
            
            # Minimum view count requirement (10K+)
            if views < self.min_view_count:
                return 0.0  # Reject videos with less than 10K views
            
            # Enhanced view count scoring
            if views > 10000000:  # 10M+ views
                score += 0.4
            elif views > 5000000:  # 5M+ views
                score += 0.35
            elif views > 1000000:  # 1M+ views
                score += 0.3
            elif views > 500000:   # 500K+ views
                score += 0.25
            elif views > 100000:   # 100K+ views
                score += 0.2
            elif views > 50000:    # 50K+ views
                score += 0.15
            else:  # 10K-50K views
                score += 0.1
        except:
            return 0.0  # Reject if view count can't be parsed
        
        # Duration factor - Enhanced for long-form content only
        duration = self.parse_duration(video.get('duration', ''))
        
        # Reject short-form content (less than 5 minutes)
        if duration < self.min_duration_seconds:
            return 0.0
        
        # Reject extremely long content (more than 4 hours)
        if duration > self.max_duration_seconds:
            return 0.0
        
        # Enhanced duration scoring for educational content
        if 1800 <= duration <= 7200:  # 30 minutes to 2 hours (optimal for learning)
            score += 0.3
        elif 900 <= duration <= 1800:  # 15-30 minutes (good for tutorials)
            score += 0.25
        elif 600 <= duration <= 900:   # 10-15 minutes (good for concepts)
            score += 0.2
        elif 300 <= duration <= 600:   # 5-10 minutes (acceptable)
            score += 0.15
        
        # Channel reputation
        channel_info = video.get('channel', {})
        channel_name = channel_info.get('name', '') if isinstance(channel_info, dict) else str(channel_info)
        channel_name = channel_name.lower()
        
        for category, channels in self.educational_channels.items():
            if any(edu_channel.lower() in channel_name for edu_channel in channels):
                score += 0.3
                break
        
        # Title indicators
        title = video.get('title', '').lower()
        educational_keywords = [
            'tutorial', 'course', 'lecture', 'explained', 'guide', 'learn',
            'how to', 'step by step', 'complete', 'beginner', 'advanced',
            'masterclass', 'bootcamp', 'crash course'
        ]
        
        keyword_matches = sum(1 for keyword in educational_keywords if keyword in title)
        score += min(keyword_matches * 0.05, 0.2)  # Max 0.2 from keywords
        
        return min(score, 1.0)  # Cap at 1.0

    def _meets_enhanced_criteria(self, video_data: VideoData, quality_threshold: float) -> bool:
        """Check if video meets enhanced filtering criteria for long-form educational content"""
        
        # Quality score threshold
        if video_data.quality_score < quality_threshold:
            return False
        
        # Minimum view count (10K+)
        if video_data.view_count < self.min_view_count:
            return False
        
        # Duration check for long-form content
        duration_seconds = self.parse_duration(video_data.duration)
        if duration_seconds < self.min_duration_seconds or duration_seconds > self.max_duration_seconds:
            return False
        
        # Exclude obvious short-form indicators in title
        title_lower = video_data.title.lower()
        short_form_indicators = [
            '#shorts', 'short', 'quick tip', 'in 60 seconds', 'in 1 minute',
            'tiktok', 'reel', 'viral', 'meme', 'funny moment'
        ]
        
        if any(indicator in title_lower for indicator in short_form_indicators):
            return False
        
        # Prefer educational content indicators
        educational_indicators = [
            'tutorial', 'course', 'lecture', 'explained', 'guide', 'learn',
            'complete', 'full', 'comprehensive', 'step by step', 'masterclass',
            'bootcamp', 'crash course', 'deep dive', 'fundamentals', 'basics'
        ]
        
        # Bonus points for educational indicators (not required but preferred)
        has_educational_indicator = any(indicator in title_lower for indicator in educational_indicators)
        
        return True  # Passed all criteria

    def extract_educational_indicators(self, video: Dict[str, Any]) -> Dict[str, Any]:
        """Extract educational indicators from video metadata"""
        title = video.get('title', '').lower()
        
        # Handle description snippet
        desc_snippet = video.get('descriptionSnippet', [])
        description = ''
        if desc_snippet and isinstance(desc_snippet, list) and len(desc_snippet) > 0:
            description = desc_snippet[0].get('text', '') if isinstance(desc_snippet[0], dict) else str(desc_snippet[0])
        description = description.lower()
        
        indicators = {
            'has_transcript': False,
            'educational_keywords': [],
            'difficulty_level': 'unknown',
            'course_type': 'standalone',
            'estimated_learning_time': self.parse_duration(video.get('duration', ''))
        }
        
        # Extract educational keywords
        educational_terms = [
            'tutorial', 'course', 'lecture', 'explained', 'guide', 'learn',
            'beginner', 'intermediate', 'advanced', 'masterclass', 'bootcamp'
        ]
        
        indicators['educational_keywords'] = [
            term for term in educational_terms 
            if term in title or term in description
        ]
        
        # Determine difficulty level
        if any(term in title for term in ['beginner', 'basics', 'introduction', 'getting started']):
            indicators['difficulty_level'] = 'beginner'
        elif any(term in title for term in ['advanced', 'expert', 'masterclass', 'deep dive']):
            indicators['difficulty_level'] = 'advanced'
        elif any(term in title for term in ['intermediate', 'next level']):
            indicators['difficulty_level'] = 'intermediate'
        
        # Determine course type
        if any(term in title for term in ['series', 'part', 'episode', 'lesson']):
            indicators['course_type'] = 'series'
        elif any(term in title for term in ['complete', 'full course', 'crash course']):
            indicators['course_type'] = 'complete_course'
        
        return indicators

    def get_videos(self, query: str, total_limit: int = 100) -> List[Dict[str, Any]]:
        """Synchronous method to get videos using the provided pattern"""
        if not VideosSearch:
            logger.error("youtube-search-python not installed")
            return []
            
        all_videos = []
        videos_per_request = 20  # YouTube typically returns ~20 results per page
        
        try:
            videosSearch = VideosSearch(query, limit=videos_per_request)
            
            while len(all_videos) < total_limit:
                try:
                    results = videosSearch.result()['result']
                    all_videos.extend(results)
                    
                    logger.info(f"Fetched {len(all_videos)} videos so far for query: {query}")
                    
                    # Check if we have enough videos or if there are no more results
                    if len(results) == 0 or len(all_videos) >= total_limit:
                        break
                        
                    # Get next page of results
                    videosSearch.next()
                    
                    # Rate limiting
                    time.sleep(self.rate_limit_delay)
                    
                except Exception as e:
                    logger.error(f"Error occurred while fetching: {e}")
                    break
                    
        except Exception as e:
            logger.error(f"Error initializing search: {e}")
            return []
    
        return all_videos[:total_limit]  # Return exactly the requested number

    async def search_videos_for_genre(
        self, 
        genre: GenreCategory, 
        limit: int = 2000,
        quality_threshold: float = 0.4
    ) -> List[VideoData]:
        """Search and collect videos for a specific genre"""
        
        if genre not in self.genre_queries:
            logger.warning(f"No search queries defined for genre: {genre}")
            return []
    
        all_videos = []
        queries = self.genre_queries[genre]
        
        # Diversify search with multiple queries - Enhanced for 2000 videos
        videos_per_query = max(limit // len(queries), 100)  # Increased from 20 to 100
        
        for query in queries:
            try:
                logger.info(f"Searching for genre {genre.value} with query: {query}")
                
                # Use the synchronous get_videos method
                raw_videos = self.get_videos(query, videos_per_query)
                
                # Parse and filter videos with enhanced criteria
                for video_raw in raw_videos:
                    video_data = self._parse_video_data(video_raw)
                    if video_data and self._meets_enhanced_criteria(video_data, quality_threshold):
                        all_videos.append(video_data)
                
                if len(all_videos) >= limit:
                    break
            
            except Exception as e:
                logger.error(f"Error searching for genre {genre} with query '{query}': {e}")
                continue
        
        # Remove duplicates and sort by quality
        unique_videos = self._remove_duplicates(all_videos)
        sorted_videos = sorted(unique_videos, key=lambda x: x.quality_score, reverse=True)
        
        logger.info(f"Collected {len(sorted_videos)} quality videos for genre {genre}")
        return sorted_videos[:limit]


    def _parse_video_data(self, video_raw: Dict[str, Any]) -> Optional[VideoData]:
        """Parse raw video data into VideoData object"""
        try:
            video_id = self.extract_video_id(video_raw.get('link', ''))
            if not video_id:
                return None
            
            # Extract view count
            view_count_text = video_raw.get('viewCount', {})
            if isinstance(view_count_text, dict):
                view_count_text = view_count_text.get('text', '0')
            view_count = self._parse_view_count(str(view_count_text))
            
            # Calculate quality score
            quality_score = self.calculate_quality_score(video_raw)
            
            # Extract educational indicators
            educational_indicators = self.extract_educational_indicators(video_raw)
            
            # Handle channel info
            channel_info = video_raw.get('channel', {})
            if isinstance(channel_info, dict):
                channel_name = channel_info.get('name', '')
                channel_id = channel_info.get('id', '')
            else:
                channel_name = str(channel_info)
                channel_id = ''
            
            # Handle thumbnails
            thumbnails = video_raw.get('thumbnails', [])
            thumbnail_url = ''
            if thumbnails and isinstance(thumbnails, list) and len(thumbnails) > 0:
                thumbnail_url = thumbnails[0].get('url', '') if isinstance(thumbnails[0], dict) else ''
            
            # Handle description
            desc_snippet = video_raw.get('descriptionSnippet', [])
            description = ''
            if desc_snippet and isinstance(desc_snippet, list) and len(desc_snippet) > 0:
                description = desc_snippet[0].get('text', '') if isinstance(desc_snippet[0], dict) else str(desc_snippet[0])
            
            return VideoData(
                video_id=video_id,
                title=video_raw.get('title', ''),
                description=description,
                duration=video_raw.get('duration', ''),
                channel_name=channel_name,
                channel_id=channel_id,
                view_count=view_count,
                upload_date=video_raw.get('publishedTime', ''),
                thumbnail_url=thumbnail_url,
                youtube_url=video_raw.get('link', ''),
                tags=[],  # Would need additional scraping
                quality_score=quality_score,
                educational_indicators=educational_indicators
            )
            
        except Exception as e:
            logger.error(f"Error parsing video data: {e}")
            return None
    
    def _parse_view_count(self, view_count_text: str) -> int:
        """Parse view count text to integer"""
        if not view_count_text:
            return 0
        
        # Remove non-numeric characters except for K, M, B
        cleaned = re.sub(r'[^\d.KMB]', '', str(view_count_text).upper())
        
        try:
            if 'B' in cleaned:
                return int(float(cleaned.replace('B', '')) * 1_000_000_000)
            elif 'M' in cleaned:
                return int(float(cleaned.replace('M', '')) * 1_000_000)
            elif 'K' in cleaned:
                return int(float(cleaned.replace('K', '')) * 1_000)
            else:
                return int(float(cleaned)) if cleaned else 0
        except:
            return 0
        
    def _remove_duplicates(self, videos: List[VideoData]) -> List[VideoData]:
        """Remove duplicate videos based on video_id"""
        seen_ids = set()
        unique_videos = []
        
        for video in videos:
            if video.video_id not in seen_ids:
                seen_ids.add(video.video_id)
                unique_videos.append(video)
        
        return unique_videos

    async def collect_content_for_all_genres(
        self, 
        videos_per_genre: int = 2000,
        quality_threshold: float = 0.4
    ) -> Dict[GenreCategory, List[VideoData]]:
        """Collect content for all genres"""
        
        genre_content = {}
        
        for genre in GenreCategory:
            logger.info(f"Collecting content for genre: {genre.value}")
            
            try:
                videos = await self.search_videos_for_genre(
                    genre, 
                    limit=videos_per_genre,
                    quality_threshold=quality_threshold
                )
                
                genre_content[genre] = videos
                logger.info(f"Successfully collected {len(videos)} videos for {genre.value}")
                
                # Rate limiting between genres
                await asyncio.sleep(2)
                    
            except Exception as e:
                logger.error(f"Failed to collect content for genre {genre.value}: {e}")
                genre_content[genre] = []
        
        return genre_content

# Initialize collector instance
youtube_collector = YouTubeContentCollector()

# Sync and async helper functions
def get_videos_sync(query: str, total_limit: int = 100) -> List[Dict[str, Any]]:
    """Synchronous wrapper for getting videos"""
    return youtube_collector.get_videos(query, total_limit)

async def get_genre_videos(genre: GenreCategory, limit: int = 2000) -> List[VideoData]:
    """Get videos for a specific genre"""
    return await youtube_collector.search_videos_for_genre(genre, limit)

async def collect_all_content(videos_per_genre: int = 2000) -> Dict[str, List[Dict]]:
    """Collect content for all genres and return as serializable dict"""
    content = await youtube_collector.collect_content_for_all_genres(videos_per_genre)
    
    # Convert to serializable format
    serializable_content = {}
    for genre, videos in content.items():
        serializable_content[genre.value] = [
            {
                'video_id': v.video_id,
                'title': v.title,
                'description': v.description,
                'duration': v.duration,
                'channel_name': v.channel_name,
                'view_count': v.view_count,
                'thumbnail_url': v.thumbnail_url,
                'youtube_url': v.youtube_url,
                'quality_score': v.quality_score,
                'upload_date': v.upload_date,
                'educational_indicators': v.educational_indicators
            }
            for v in videos
        ]
    
    return serializable_content

if __name__ == "__main__":
    # Test the collector
    print("Testing YouTube Content Collector...")
    
    # Test with a simple query
    videos = get_videos_sync('physics lecture JEE NEET', 10)
    print(f"Found {len(videos)} videos")
    
    for i, video in enumerate(videos[:3], 1):
        print(f"{i}. Title: {video['title']}")
        print(f"   Link: {video['link']}")
        print('---') 