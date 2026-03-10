import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Calendar,
  MessageSquare,
  Sparkles,
  Settings,
  LogOut,
  Plus,
  Download,
  Send,
  Image as ImageIcon,
  CheckCircle2,
  Clock,
  MoreHorizontal,
  ThumbsUp,
  MessageCircle,
  Share2,
  Linkedin,
  AlertCircle,
  Info,
  X,
  Users,
  BarChart3,
  UserPlus,
  PenSquare,
  Trash2,
  Edit2,
  RefreshCw,
  Search,
  Video,
  ArrowLeft,
  ArrowRight,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Menu,
  Brain,
  Copy,
  Type
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { generateLinkedInPost, generateCommentReply, analyzeBrainDump, analyzeUserStyle } from "./lib/openai";
import { hookTemplates, type HookTemplate } from "./lib/hooks";

// --- Utils ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
type View = "dashboard" | "calendar" | "scheduler" | "inbox" | "ailab" | "composer" | "analytics" | "settings" | "braindump";

interface Post {
  id: string;
  content: string;
  scheduled_at: string;
  status: "pending" | "posted" | "failed";
  image_url?: string;
  thumbnail_url?: string;
  media_urls?: string; // JSON string
  is_recurring?: boolean;
  recurrence_pattern?: "daily" | "weekly" | "monthly";
  category?: string;
  is_draft?: boolean;
}

const INSPIRATION_POSTS = [
  {
    category: "Scenario Hooks",
    impact: "HIGH IMPACT",
    description: "Scenario-based hook with dialogue format mirrors top performer structure. Opens with relatable interview moment.",
    content: "Interviewer asks: \"What's your greatest weakness?\"\n\nYou say: \"I work too hard.\"\n\nThey write \"red flag\" on their notepad.\n\nHere's what to actually say (and why the \"perfectionism\" trick backfires):",
    author: "Career Growth"
  },
  {
    category: "Quantify Value",
    impact: "TRENDING",
    description: "Numbers-first approach creates immediate authority. Best for 'Build in Public' or growth updates.",
    content: "I spent 1,200 hours building this.\n\nIt took 45 iterations.\n6 months of zero revenue.\nAnd 100+ rejections.\n\nToday, we hit $5k MRR.\n\nConsistency isn't a hack, it's the only way.",
    author: "SaaS Builder"
  },
  {
    category: "Reduce Duplication",
    impact: "EFFICIENCY",
    description: "Simple list format with high readability. High shared potential for educational content.",
    content: "Stop over-explaining.\n\nIf it takes 20 minutes to explain, it's too complex.\n\n1. Use simpler words.\n2. Use shorter sentences.\n3. Use clear metaphors.\n\nYour audience will thank you.",
    author: "Growth Strategist"
  },
  {
    category: "Scenario Hooks",
    impact: "HIGH IMPACT",
    description: "Uses 'You walk into the final round' scenario pattern. Creates tension and promises fix.",
    content: "You walk into the final round.\n\nThey ask: \"Why should we hire you?\"\n\nYou ramble about your skills for 2 minutes.\n\nWrong answer.\n\nThe one phrase that wins every time:",
    author: "Interview Prep"
  }
];

const BASE_POSTS = [
  {
    industry: "AI",
    title: "Operational Leverage",
    content: `Industry: Artificial Intelligence\nPost Type: Educational\n\nMost people think AI is about asking better prompts.\n\nIt’s not.\n\nThe real power of AI is designing workflows.\n\nRight now, most professionals are using AI like a smarter Google:\nAsk a question → get an answer → move on.\n\nBut the real leverage happens when AI becomes part of a system.\n\nFor example:\n\nInstead of asking AI to “write a blog post”, you can design a workflow like this:\n\n1. AI researches the topic\n2. AI extracts key insights from multiple sources\n3. AI generates a structured outline\n4. AI writes a first draft\n5. AI rewrites it in your tone\n6. AI converts it into LinkedIn, X, and email content\n\nOne workflow can replace hours of manual work.\n\nThis is the shift most people are missing.\n\nAI is not just a tool.\nIt’s an operational layer.\n\nCompanies that understand this are redesigning their workflows entirely.\n\nMarketing teams are automating research.\nProduct teams are accelerating documentation.\nFounders are validating ideas faster.\n\nThe result?\n\nLess time on repetitive thinking.\nMore time on strategic decisions.\n\nThe future of work won’t be defined by who uses AI.\n\nIt will be defined by who builds systems around it.\n\nBecause the biggest advantage today isn’t intelligence.\n\nIt’s leverage.\n\nAnd AI is the biggest leverage tool we’ve ever had.\n\nCurious to know:\n\nWhat task has AI already replaced in your daily workflow?\n\n#AI #FutureOfWork #Productivity #Automation`
  },
  {
    industry: "AI",
    title: "Redefining Work",
    content: `Industry: Artificial Intelligence\nPost Type: Storytelling\n\nSix months ago, a founder told me something interesting.\n\n“We hired three interns to write content for our startup.”\n\nThey spent weeks researching topics, drafting articles, editing, and formatting posts.\n\nThen the founder tried something different.\n\nHe built a simple AI workflow.\n\nThe system looked like this:\n\n• AI researches trending topics\n• AI generates outlines\n• AI drafts long-form content\n• AI converts them into social media posts\n• A human editor reviews everything\n\nThe result?\n\nThe same amount of content was produced in one day.\n\nWhat used to take three interns weeks now took one person a few hours.\n\nThis story isn’t about replacing people.\n\nIt’s about redefining work.\n\nAI doesn’t eliminate the need for thinking.\n\nIt removes the friction around execution.\n\nInstead of spending hours drafting and formatting, teams can focus on:\n\n• strategy\n• positioning\n• distribution\n• creative direction\n\nThe companies winning with AI are not the ones asking the best prompts.\n\nThey’re the ones redesigning their processes.\n\nBecause AI is not just a productivity tool.\n\nIt’s a multiplier.\n\nAnd multipliers change everything.\n\nThe biggest mistake right now is treating AI like a fancy assistant.\n\nThe real opportunity is treating it like an operating system for work.\n\nIf you had to automate one part of your workflow today…\n\nWhat would it be?\n\n#ArtificialIntelligence #Automation #Startups`
  },
  {
    industry: "Startups",
    title: "Distribution First",
    content: `Industry: Startups & Entrepreneurship\nPost Type: Educational\n\nOne of the biggest myths in startups is this:\n\n“If we build a great product, people will come.”\n\nThey won’t.\n\nThe internet is full of incredible products that nobody uses.\n\nWhy?\n\nBecause distribution beats product in the early stages.\n\nMany founders spend months perfecting features, polishing UI, and refining the user experience.\n\nBut they forget something critical:\n\nAttention is the real currency.\n\nThe most successful startups often do three things extremely well:\n\n1. They build in public\nThey share progress, failures, and lessons openly.\n\n2. They create educational content\nInstead of just promoting their product, they teach their audience something valuable.\n\n3. They become the authority in their niche\nWhen people trust your insights, they trust your product.\n\nThis is why many modern founders treat content as a core growth strategy.\n\nNot a marketing tactic.\n\nA strategy.\n\nBecause when your audience grows, distribution becomes easier.\n\nLaunching new products becomes easier.\n\nGetting feedback becomes easier.\n\nAnd raising capital becomes easier.\n\nIn the early stage, your biggest advantage isn’t funding.\n\nIt’s visibility.\n\nThe founders who understand this are building audiences alongside their products.\n\nAnd in today’s market, that combination is extremely powerful.\n\nCurious to hear from founders here:\n\nWhat has been harder for you — building the product or getting users?\n\n#Startups #Entrepreneurship #BuildingInPublic`
  },
  {
    industry: "Startups",
    title: "Narrative Power",
    content: `Industry: Startups & Entrepreneurship\nPost Type: Storytelling\n\nA startup founder once told me something brutally honest.\n\n“Our product is great. But nobody knows we exist.”\n\nThey spent 10 months building.\n\nPolishing features.\nImproving the interface.\nOptimizing performance.\n\nWhen they finally launched…\n\nSilence.\n\nNo users.\nNo traction.\nNo buzz.\n\nSo they tried something different.\n\nInstead of focusing only on product development, they started documenting their journey online.\n\nEvery week they shared:\n\n• lessons from building the startup\n• mistakes they made\n• insights about their industry\n• behind-the-scenes decisions\n\nSomething interesting happened.\n\nPeople started paying attention.\n\nNot because of the product.\n\nBecause of the story.\n\nFounders underestimate the power of narrative.\n\nHumans connect with journeys.\n\nWhen people watch you build something over time, they feel invested.\n\nThey want you to succeed.\n\nAnd when the product eventually launches, they become your first users.\n\nThis is why “building in public” has become a powerful strategy.\n\nIt turns the startup journey into content.\n\nAnd content into distribution.\n\nThe truth is simple:\n\nProducts rarely go viral.\n\nStories do.\n\nAnd sometimes the story behind the product becomes the most valuable asset you have.\n\nIf you're building something today…\n\nAre you sharing the journey?\n\n#Startups #Founders #BuildingInPublic`
  },
  {
    industry: "Personal Branding",
    title: "Owning Attention",
    content: `Industry: Personal Branding & Creator Economy\nPost Type: Educational\n\nPersonal branding used to mean having a polished resume.\n\nToday, it means something completely different.\n\nIt means owning attention.\n\nThe internet has changed how authority is built.\n\nYou no longer need a huge company behind you to become known in your industry.\n\nYou need visibility.\n\nAnd visibility today is created through consistent insights.\n\nLook at the people dominating LinkedIn right now.\n\nThey are not necessarily the most experienced professionals.\n\nThey are the ones sharing ideas consistently.\n\nThey teach.\n\nThey explain.\n\nThey document.\n\nOver time, something interesting happened.\n\nTheir content becomes their portfolio.\n\nInstead of telling people what they know, they show it.\n\nInstead of asking for credibility, they demonstrate it.\n\nThis is the power of personal branding.\n\nIt compresses time.\n\nA person who consistently shares valuable insights for 12 months can build more authority than someone who stays invisible for 10 years.\n\nBecause the internet rewards visibility.\n\nNot silence.\n\nYour ideas are assets.\n\nAnd the more you publish them, the more opportunities appear.\n\nClients discover you.\n\nRecruiters notice you.\n\nInvestors follow you.\n\nBut none of this happens if your insights stay in your head.\n\nThe question is simple:\n\nWhat expertise are you not sharing yet?\n\n#PersonalBranding #CreatorEconomy #LinkedInGrowth`
  },
  {
    industry: "Personal Branding",
    title: "Visibility Gap",
    content: `Industry: Personal Branding & Creator Economy\nPost Type: Storytelling\n\nA designer I know had incredible skills.\n\nBut nobody knew about them.\n\nHe worked quietly for years, building beautiful interfaces for clients.\n\nYet every time he tried to attract new clients, the same problem appeared.\n\nNo visibility.\n\nThen he started posting on LinkedIn.\n\nAt first, nothing happened.\n\nTen likes.\nA few comments.\nMostly silence.\n\nBut he kept going.\n\nHe shared:\n\n• UI breakdowns\n• lessons from client projects\n• product design insights\n• mistakes he made early in his career\n\nAfter a few months something changed.\n\nHis posts started circulating.\n\nMore designers engaged.\nFounders started messaging him.\n\nEventually one post reached thousands of people.\n\nAnd that single post brought three new clients.\n\nWhat changed?\n\nNot his skills.\n\nHis visibility.\n\nThe internet rewards people who teach publicly.\n\nEvery post becomes proof of expertise.\n\nOver time, your content builds a digital reputation that works for you 24/7.\n\nThe biggest mistake talented professionals make is staying invisible.\n\nSkill alone is not enough.\n\nPeople need to see it.\n\nIf you are good at something…\n\nDon’t hide it.\n\nShare it.\n\n#LinkedIn #PersonalBranding #Creators`
  },
  {
    industry: "UX Design",
    title: "Reducing Friction",
    content: `Industry: Product Design / UX\nPost Type: Educational\n\nMost people think great UI is about visuals.\n\nColors.\nTypography.\nSpacing.\n\nBut the real job of design is something deeper.\n\nReducing friction.\n\nEvery digital product is essentially a series of decisions.\n\nWhere to click.\nWhat to read.\nWhat to do next.\n\nIf users hesitate, the experience is already failing.\n\nGood UX removes hesitation.\n\nThat’s why the best products feel obvious.\n\nYou don’t need instructions.\n\nYou don’t need tutorials.\n\nYou simply move through the interface naturally.\n\nDesigners achieve this through three core principles:\n\nClarity\nUsers should immediately understand what action to take.\n\nSpeed\nThe interface should reduce the number of steps needed.\n\nFeedback\nEvery action should produce a clear response.\n\nWhen these principles work together, the product feels effortless.\n\nBut when they fail, users experience something different.\n\nConfusion.\nFriction.\nAbandonment.\n\nThis is why product design is not just about aesthetics.\n\nIt’s about psychology.\n\nUnderstanding how people think.\n\nHow they behave.\n\nAnd how quickly they want to reach their goal.\n\nThe best products win not because they look better.\n\nBut because they feel easier.\n\nAnd in competitive markets, the product that feels easiest usually wins.\n\nWhat’s the most frustrating UX you’ve experienced recently?\n\n#UXDesign #ProductDesign #UserExperience`
  },
  {
    industry: "Web3",
    title: "The UX Problem",
    content: `Industry: Crypto / Web3\nPost Type: Educational\n\nCrypto has one massive problem.\n\nUser experience.\n\nMost crypto products are built by engineers for engineers.\n\nWhich creates a huge gap between technology and usability.\n\nThink about the typical onboarding flow for a new crypto user.\n\nFirst they must:\n\n• install a wallet\n• store a seed phrase\n• understand gas fees\n• connect to a decentralized app\n• approve transactions\n\nFor someone new, this feels overwhelming.\n\nThis is why mainstream adoption has been slower than many expected.\n\nThe technology is powerful.\n\nBut the experience is complicated.\n\nThe next wave of successful crypto products will focus on something different.\n\nSimplicity.\n\nThey will hide complexity behind intuitive interfaces.\n\nUsers won’t need to understand blockchain mechanics.\n\nJust like people don’t need to understand how the internet works to use websites.\n\nThe best crypto founders are already thinking this way.\n\nThey are redesigning wallets.\n\nSimplifying onboarding.\n\nAnd reducing transaction friction.\n\nBecause mass adoption doesn’t come from better technology alone.\n\nIt comes from better experiences.\n\nThe companies that solve crypto UX will unlock the next billion users.\n\nAnd that opportunity is still wide open.\n\nWhat do you think is the biggest UX problem in crypto today?\n\n#Crypto #Web3 #ProductDesign`
  }
];

const INDUSTRY_FEED_POSTS = Array.from({ length: 20 }, (_, i) => ({
  ...BASE_POSTS[i % BASE_POSTS.length],
  title: `${BASE_POSTS[i % BASE_POSTS.length].title}${i >= BASE_POSTS.length ? ' (v' + (Math.floor(i / BASE_POSTS.length) + 1) + ')' : ''}`
}));



// --- Components ---

const SidebarItem = ({
  icon: Icon,
  label,
  active,
  onClick,
  collapsed
}: {
  icon: any,
  label: string,
  active: boolean,
  onClick: () => void,
  collapsed: boolean
}) => (
  <button
    onClick={onClick}
    className={cn(
      "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group",
      active
        ? "bg-[#0077B5] text-white shadow-lg shadow-[#0077B5]/20"
        : "text-slate-600 hover:bg-slate-100"
    )}
    title={collapsed ? label : undefined}
  >
    <Icon className={cn("w-5 h-5 flex-shrink-0", active ? "text-white" : "text-slate-400 group-hover:text-[#0077B5]")} />
    {!collapsed && <span className="font-medium whitespace-nowrap overflow-hidden">{label}</span>}
  </button>
);

const Skeleton = ({ className }: { className?: string }) => (
  <div className={cn("skeleton rounded-lg", className)} />
);

const MainCalendarView = ({ posts, onDateClick }: { posts: Post[], onDateClick: (date: Date) => void }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const daysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const days = Array.from({ length: daysInMonth(currentMonth) }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDayOfMonth(currentMonth) }, (_, i) => i);

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

  return (
    <div className="space-y-6">
      <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">{currentMonth.toLocaleDateString([], { month: 'long', year: 'numeric' })}</h3>
            <p className="text-sm text-slate-500 font-medium">Click any date to schedule or plan your content.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={prevMonth} className="p-3 hover:bg-slate-50 rounded-2xl text-slate-400 hover:text-[#0077B5] border border-slate-100 transition-all"><ChevronLeft size={20} /></button>
            <button onClick={() => setCurrentMonth(new Date())} className="px-6 py-3 hover:bg-slate-50 rounded-2xl text-slate-600 font-bold border border-slate-100 transition-all text-sm">Today</button>
            <button onClick={nextMonth} className="p-3 hover:bg-slate-50 rounded-2xl text-slate-400 hover:text-[#0077B5] border border-slate-100 transition-all"><ChevronRight size={20} /></button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-px bg-slate-100 rounded-3xl overflow-hidden border border-slate-100">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="bg-slate-50 py-4 text-center text-[11px] font-black text-slate-400 uppercase tracking-widest">{d}</div>
          ))}
          {blanks.map(b => <div key={`b-${b}`} className="bg-white h-32 opacity-30" />)}
          {days.map(d => {
            const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), d);
            const isToday = date.toDateString() === new Date().toDateString();
            const dayPosts = posts.filter(p => !p.is_draft && new Date(p.scheduled_at).toDateString() === date.toDateString());

            return (
              <div
                key={d}
                onClick={() => onDateClick(date)}
                className={cn(
                  "bg-white h-32 p-3 transition-all cursor-pointer group hover:bg-blue-50/30 flex flex-col",
                  isToday && "bg-blue-50/20"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={cn(
                    "text-sm font-black w-7 h-7 flex items-center justify-center rounded-lg transition-all",
                    isToday ? "bg-[#0077B5] text-white shadow-lg shadow-blue-500/30" : "text-slate-400 group-hover:text-[#0077B5]"
                  )}>
                    {d}
                  </span>
                  {dayPosts.length > 0 && (
                    <span className="text-[9px] font-black text-[#0077B5] bg-blue-100/50 px-2 py-0.5 rounded-full">{dayPosts.length} POSTS</span>
                  )}
                </div>

                <div className="flex-1 overflow-hidden space-y-1">
                  {dayPosts.slice(0, 3).map((p, i) => (
                    <div key={i} className="text-[9px] font-bold text-slate-600 bg-slate-50 px-2 py-1 rounded-md border border-slate-100 truncate flex items-center gap-1">
                      <div className={cn("w-1.5 h-1.5 rounded-full", p.status === 'posted' ? 'bg-emerald-500' : 'bg-[#0077B5]')} />
                      {p.content}
                    </div>
                  ))}
                  {dayPosts.length > 3 && (
                    <p className="text-[9px] font-black text-slate-300 pl-1 uppercase tracking-tighter">+{dayPosts.length - 3} more</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [currentView, setCurrentView] = useState<View>("dashboard");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(true);
  const [isLoadingLivePosts, setIsLoadingLivePosts] = useState(true);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | null>(null);
  const [isCalendarActionOpen, setIsCalendarActionOpen] = useState(false);
  const [serverStatus, setServerStatus] = useState<"online" | "offline" | "checking">("checking");
  const [user, setUser] = useState<any>(null);
  const [livePosts, setLivePosts] = useState<any[]>([]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);

  // Content Studio State
  const [topic, setTopic] = useState("");
  const [generatedContent, setGeneratedContent] = useState("");
  const [scheduleTime, setScheduleTime] = useState(new Date(Date.now() + 3600000).toISOString().slice(0, 16));
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrencePattern, setRecurrencePattern] = useState<"daily" | "weekly" | "monthly">("weekly");
  const [category, setCategory] = useState("General");
  const [isDraft, setIsDraft] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [userProfileUrl, setUserProfileUrl] = useState("");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [toasts, setToasts] = useState<{ id: string; message: string; type: "success" | "error" | "info" }[]>([]);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [brainDumpInput, setBrainDumpInput] = useState("");
  const [brainDumpResults, setBrainDumpResults] = useState<{ content: string; hook: string; style: string }[]>([]);
  const [isAnalyzingDump, setIsAnalyzingDump] = useState(false);
  const [editTime, setEditTime] = useState("");
  const [editImage, setEditImage] = useState<string | null>(null);
  const [queueFilter, setQueueFilter] = useState<"all" | "scheduled" | "drafts" | "posted">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentSlide, setCurrentSlide] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const [mediaItems, setMediaItems] = useState<string[]>([]);
  const [videoThumbnail, setVideoThumbnail] = useState<string | null>(null);
  const [previewMedia, setPreviewMedia] = useState<string | null>(null);
  const [selectedHook, setSelectedHook] = useState<HookTemplate | null>(null);
  const [userStyle, setUserStyle] = useState<string>(localStorage.getItem("user_style") || "");
  const [isSyncingStyle, setIsSyncingStyle] = useState(false);
  const [showManualTrain, setShowManualTrain] = useState(false);
  const [manualPosts, setManualPosts] = useState("");

  const moveMedia = (index: number, direction: 'left' | 'right') => {
    const newItems = [...mediaItems];
    if (direction === 'left' && index > 0) {
      [newItems[index], newItems[index - 1]] = [newItems[index - 1], newItems[index]];
    } else if (direction === 'right' && index < newItems.length - 1) {
      [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
    }
    setMediaItems(newItems);
  };

  const handleEditOpen = (post: Post) => {
    setEditingPost(post);
    setEditContent(post.content);

    // Properly format date for datetime-local input (handling timezone offset)
    if (post.scheduled_at) {
      const d = new Date(post.scheduled_at);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      setEditTime(`${year}-${month}-${day}T${hours}:${minutes}`);
    } else {
      setEditTime("");
    }

    setVideoThumbnail(post.thumbnail_url || null);
    setEditImage(post.image_url || null);

    // Unify all media for editing
    const allMedia = [];
    if (post.image_url) allMedia.push(post.image_url);
    if (post.media_urls) {
      try {
        allMedia.push(...JSON.parse(post.media_urls));
      } catch (e) { console.error(e); }
    }
    setMediaItems(allMedia);
    setIsEditModalOpen(true);
  };

  const handleEditClose = () => {
    setIsEditModalOpen(false);
    setEditingPost(null);
    setEditContent("");
    setEditTime("");
    setEditImage(null);
    setMediaItems([]);
    setVideoThumbnail(null);
  };

  const saveEdit = async () => {
    if (!editingPost) return;
    setLoading(true);
    try {
      const scheduledDate = editTime ? new Date(editTime) : null;
      const now = new Date();
      let newStatus = editingPost.status;

      console.log("Saving Edit:", {
        currentStatus: editingPost.status,
        scheduledDate: scheduledDate?.toISOString(),
        now: now.toISOString(),
        isFuture: scheduledDate ? (scheduledDate.getTime() > now.getTime()) : false
      });

      let isNowDraft = editingPost.is_draft;

      // Logic: If status is 'posted' (or 'failed') and we set a future date, 
      // we clearly want to reschedule it.
      if (scheduledDate && scheduledDate.getTime() > now.getTime()) {
        if (editingPost.status === "posted" || editingPost.status === "failed") {
          console.log("Rescheduling to pending...");
          newStatus = "pending";
        }
        // If it was a draft, but we set a future time, it's now scheduled
        if (isNowDraft) {
          isNowDraft = false;
        }
      }

      const res = await fetch(`/api/posts/${editingPost.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: editContent,
          scheduled_at: scheduledDate ? scheduledDate.toISOString() : null,
          image_url: mediaItems[0] || null,
          thumbnail_url: videoThumbnail,
          media_urls: JSON.stringify(mediaItems.slice(1)),
          is_draft: isNowDraft,
          category: editingPost.category,
          status: newStatus
        }),
      });
      if (res.ok) {
        addToast("Post updated successfully", "success");
        handleEditClose();
        fetchPosts();
      } else {
        const data = await res.json();
        throw new Error(data.error || "Failed to update post");
      }
    } catch (err: any) {
      console.error("Save Edit Error:", err);
      addToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const addToast = (message: string, type: "success" | "error" | "info" = "info") => {
    const id = Math.random().toString(36).substring(7);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, type === "error" ? 10000 : 5000);
  };

  useEffect(() => {
    // Check server health
    const checkHealth = async () => {
      try {
        const res = await fetch("/api/health");
        if (res.ok) setServerStatus("online");
        else setServerStatus("offline");
      } catch {
        setServerStatus("offline");
      }
    };
    checkHealth();

    // Check if user is logged in (mock)
    const token = localStorage.getItem("linkedin_token");
    if (token) setIsLoggedIn(true);

    // Fetch posts
    fetchPosts();
    fetchAnalytics();
    fetchUser();
    fetchLivePosts();
    fetchLogs();

    // Listen for OAuth success
    const handleOAuth = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        setIsLoggedIn(true);
        localStorage.setItem("linkedin_token", "mock_token");
        fetchUser();
        fetchPosts();
        fetchAnalytics();
      }
    };
    window.addEventListener('message', handleOAuth);
    return () => window.removeEventListener('message', handleOAuth);
  }, []);

  const fetchPosts = async () => {
    setIsLoadingPosts(true);
    try {
      const res = await fetch("/api/posts");
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = await res.json();
      setPosts(data);
    } catch (err) {
      console.error("Fetch Posts Error:", err);
    } finally {
      setIsLoadingPosts(false);
    }
  };

  const fetchAnalytics = async () => {
    setIsLoadingAnalytics(true);
    try {
      const res = await fetch("/api/analytics");
      const data = await res.json();
      if (res.ok) {
        setAnalytics(data);
      } else {
        addToast(data.error || "Failed to fetch real-time analytics.", "error");
      }
    } catch (err) {
      console.error("Analytics Error:", err);
    } finally {
      setIsLoadingAnalytics(false);
    }
  };

  const fetchUser = async () => {
    try {
      const res = await fetch("/api/user/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        setIsLoggedIn(true);
        if (data.profile_url) setUserProfileUrl(data.profile_url);
      }
    } catch (err) {
      console.error("User Fetch Error:", err);
    }
  };

  const fetchLivePosts = async () => {
    setIsLoadingLivePosts(true);
    try {
      const res = await fetch("/api/linkedin/posts");
      if (res.ok) {
        const data = await res.json();
        setLivePosts(data);
      } else {
        const data = await res.json();
        console.error("Live Posts Fetch Failed:", data);
      }
    } catch (err) {
      console.error("Live Posts Error:", err);
    } finally {
      setIsLoadingLivePosts(false);
    }
  };

  const fetchLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const res = await fetch("/api/logs");
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (err) {
      console.error("Logs Fetch Error:", err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, isEdit = false) => {
    const file = e.target.files?.[0];
    if (file) {
      const isVideo = file.type.startsWith("video/");
      const maxSize = isVideo ? 50 * 1024 * 1024 : 15 * 1024 * 1024;

      if (file.size > maxSize) {
        addToast(`${isVideo ? "Video" : "Image"} too large (max ${isVideo ? "50MB" : "15MB"})`, "error");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        if (isEdit) {
          setEditImage(result);
          setMediaItems([result]); // Replace existing media for simplicity in edit mode
        } else {
          setMediaItems(prev => [...prev, result]);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleMultipleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    files.forEach(file => {
      const isVideo = file.type.startsWith("video/");
      const maxSize = isVideo ? 50 * 1024 * 1024 : 15 * 1024 * 1024;
      if (file.size > maxSize) {
        addToast(`${file.name}: File too large`, "error");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setMediaItems(prev => [...prev, result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setVideoThumbnail(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleLogin = async () => {
    try {
      const res = await fetch("/api/auth/linkedin/url");
      if (!res.ok) throw new Error("Failed to get login URL");
      const data = await res.json();
      if (data.url) {
        window.open(data.url, "linkedin_oauth", "width=600,height=700");
      }
    } catch (err) {
      console.error("Login Error:", err);
      addToast("Failed to initiate LinkedIn login.", "error");
    }
  };

  const handleGeneratePost = async () => {
    if (!topic) return;
    setLoading(true);
    try {
      let content = await generateLinkedInPost(topic, {
        tone: category === "General" ? "professional" : category.toLowerCase(),
        hookTemplate: selectedHook?.template,
        userStyle: userStyle
      });
      if (content) {
        content = content
          .replace(/\*\*/g, "")
          .replace(/—/g, "-")
          .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, "");
      }
      setGeneratedContent(content || "");
    } catch (err) {
      console.error("AI Generation Error:", err);
      addToast("Failed to generate content.", "error");
    } finally {
      setLoading(false);
    }
  };

  const syncPersonalVoice = async () => {
    setIsSyncingStyle(true);
    try {
      const res = await fetch("/api/linkedin/posts");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sync failed");
      if (data.length === 0) {
        addToast("No posts found. Try training manually!", "info");
        return;
      }
      setLivePosts(data);
      const postTexts = data.map((p: any) => p.text?.text || p.commentary).filter(Boolean);
      const style = await analyzeUserStyle(postTexts);
      setUserStyle(style);
      localStorage.setItem("user_style", style);
      addToast("Personal voice synced!", "success");
    } catch (err: any) {
      console.error(err);
      addToast(err.message, "error");
    } finally {
      setIsSyncingStyle(false);
    }
  };

  const trainManually = async () => {
    if (!manualPosts.trim()) {
      addToast("Please paste some of your posts first.", "info");
      return;
    }
    setIsSyncingStyle(true);
    try {
      const posts = manualPosts.includes("---")
        ? manualPosts.split("---").filter(p => p.trim().length > 10)
        : [manualPosts];

      if (posts.length === 0) {
        addToast("Please paste at least one substantial post.", "info");
        return;
      }
      const style = await analyzeUserStyle(posts);
      setUserStyle(style);
      localStorage.setItem("user_style", style);
      setShowManualTrain(false);
      setManualPosts("");
      addToast("Personal voice trained manually!", "success");
    } catch (err) {
      console.error("Manual Train Error:", err);
      addToast("Failed to analyze text.", "error");
    } finally {
      setIsSyncingStyle(false);
    }
  };

  const handleBrainDump = async () => {
    if (!brainDumpInput.trim()) {
      addToast("Please enter some ideas first.", "info");
      return;
    }
    setIsAnalyzingDump(true);
    try {
      const result = await analyzeBrainDump(brainDumpInput);
      setBrainDumpResults(result.posts || []);
      addToast("AI analysis complete! Review your options below.", "success");
    } catch (err) {
      console.error("Brain Dump Error:", err);
      addToast("Failed to analyze brain dump.", "error");
    } finally {
      setIsAnalyzingDump(false);
    }
  };

  const useBrainDumpPost = (content: string) => {
    setGeneratedContent(content);
    setCurrentView("composer");
    addToast("Post moved to composer! Ready for final edits.", "success");
  };

  const schedulePost = async () => {
    if (!generatedContent) return;
    setLoading(true);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: generatedContent,
          scheduled_at: isDraft ? null : new Date(scheduleTime).toISOString(),
          image_url: mediaItems[0] || null,
          thumbnail_url: videoThumbnail,
          media_urls: JSON.stringify(mediaItems.slice(1)),
          is_recurring: isRecurring,
          recurrence_pattern: recurrencePattern,
          is_draft: isDraft
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to schedule post");
      }
      fetchPosts();
      addToast("Post scheduled successfully!", "success");
      setGeneratedContent("");
      setTopic("");
      setSelectedImage(null);
      setMediaItems([]);
      setVideoThumbnail(null);
      setScheduleTime(new Date(Date.now() + 3600000).toISOString().slice(0, 16));
      setIsDraft(false);
      setIsRecurring(false);
      setIsRecurring(false);
    } catch (err: any) {
      console.error(err);
      addToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handlePostNow = async () => {
    if (!generatedContent) return;
    setLoading(true);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: generatedContent,
          scheduled_at: new Date().toISOString(),
          image_url: mediaItems[0] || null,
          thumbnail_url: videoThumbnail,
          media_urls: mediaItems.length > 1 ? JSON.stringify(mediaItems.slice(1)) : null,
          immediate: true,
          category: category
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to post");
      }
      fetchPosts();
      addToast("Post published successfully!", "success");
      setGeneratedContent("");
      setTopic("");
      setSelectedImage(null);
      setMediaItems([]);
      setVideoThumbnail(null);
      setScheduleTime(new Date(Date.now() + 3600000).toISOString().slice(0, 16));
    } catch (err: any) {
      console.error(err);
      addToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleUseInspiration = (content: string) => {
    setGeneratedContent(content);
    setCurrentView("composer");
    addToast("Inspiration applied to composer!", "info");
  };

  const handleSaveDraft = async () => {
    if (!generatedContent) return;
    setLoading(true);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: generatedContent,
          scheduled_at: null,
          image_url: mediaItems[0] || null,
          thumbnail_url: videoThumbnail,
          media_urls: mediaItems.length > 1 ? JSON.stringify(mediaItems.slice(1)) : null,
          is_recurring: false,
          is_draft: true
        }),
      });
      if (res.ok) {
        addToast("Draft saved successfully!", "success");
        setGeneratedContent("");
        setTopic("");
        setSelectedImage(null);
        fetchPosts();
      } else {
        const data = await res.json();
        throw new Error(data.error || "Failed to save draft");
      }
    } catch (err: any) {
      console.error(err);
      addToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const updateProfileUrl = async () => {
    if (!userProfileUrl) return;
    setIsUpdatingProfile(true);
    try {
      const res = await fetch("/api/user/profile-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: userProfileUrl }),
      });
      if (res.ok) {
        addToast("Profile URL updated! Analytics will now be real-time.", "success");
        fetchAnalytics();
      } else {
        const data = await res.json();
        addToast(data.error || "Failed to update profile URL.", "error");
      }
    } catch (err) {
      console.error(err);
      addToast("An error occurred while updating profile URL.", "error");
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handlePublishPost = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/posts/${id}/publish`, { method: "POST" });
      if (res.ok) {
        addToast("Post published successfully!", "success");
        fetchPosts();
      } else {
        const data = await res.json();
        throw new Error(data.error || "Failed to publish post");
      }
    } catch (err: any) {
      addToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePost = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    try {
      const res = await fetch(`/api/posts/${id}`, { method: "DELETE" });
      if (res.ok) {
        addToast("Deleted successfully", "success");
        fetchPosts();
      }
    } catch (err: any) {
      addToast(err.message, "error");
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#F3F6F8] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center"
        >
          <div className="mb-6 flex items-center justify-center">
            <img src="/logo.png" alt="LinkAutomation Logo" className="h-16 w-auto" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Welcome to LinkAutomation</h1>
          <p className="text-slate-500 mb-8">Connect your LinkedIn account to start automating.</p>
          <button
            onClick={handleLogin}
            className="w-full bg-[#0077B5] text-white py-4 rounded-xl font-semibold hover:bg-[#004182] transition-colors flex items-center justify-center gap-2"
          >
            <Linkedin className="w-5 h-5" />
            Sign in with LinkedIn
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F3F6F8] flex font-sans text-slate-900">
      <aside className={cn(
        "bg-white border-r border-slate-200 flex flex-col fixed h-full z-20 transition-all duration-300 ease-in-out",
        isSidebarCollapsed ? "w-20" : "w-64"
      )}>
        <div className={cn("p-6 flex items-center mb-2", isSidebarCollapsed ? "flex-col gap-4 text-center" : "justify-between")}>
          <div className="flex items-center justify-center min-w-0">
            {isSidebarCollapsed ? (
              <img
                src="/favicon.png"
                alt="Icon"
                className="w-10 h-10 rounded-lg flex-shrink-0 object-contain"
              />
            ) : (
              <img
                src="/logo.png"
                alt="LinkAutomation Logo"
                className="h-8 w-auto object-contain animate-in fade-in duration-300"
              />
            )}
          </div>
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="p-2 rounded-xl hover:bg-slate-50 text-slate-400 hover:text-[#0077B5] transition-all flex items-center justify-center"
            title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isSidebarCollapsed ? <Menu className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        </div>

        {/* Digital Clock Section */}
        <div className={cn(
          "px-6 py-4 mx-4 mb-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col transition-all duration-300",
          isSidebarCollapsed ? "items-center px-1" : "items-start"
        )}>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            {!isSidebarCollapsed && <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">System Active</span>}
          </div>
          <div className={cn(
            "font-mono font-bold text-slate-700 tracking-tighter transition-all duration-300",
            isSidebarCollapsed ? "text-[11px]" : "text-xl"
          )}>
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
          </div>
          {!isSidebarCollapsed && (
            <div className="text-[10px] font-bold text-slate-400 mt-0.5">
              {currentTime.toLocaleDateString([], { weekday: 'short', month: 'long', day: 'numeric' })}
            </div>
          )}
        </div>

        <nav className={cn("flex-1 px-4 space-y-2 mt-4 overflow-hidden", isSidebarCollapsed ? "px-2" : "px-4")}>
          <SidebarItem icon={LayoutDashboard} label="Dashboard" active={currentView === "dashboard"} onClick={() => setCurrentView("dashboard")} collapsed={isSidebarCollapsed} />
          <SidebarItem icon={Calendar} label="Calendar" active={currentView === "calendar"} onClick={() => setCurrentView("calendar")} collapsed={isSidebarCollapsed} />
          <SidebarItem icon={Clock} label="Queue" active={currentView === "scheduler"} onClick={() => setCurrentView("scheduler")} collapsed={isSidebarCollapsed} />
          <SidebarItem icon={Sparkles} label="Content Studio" active={currentView === "ailab"} onClick={() => setCurrentView("ailab")} collapsed={isSidebarCollapsed} />
          <SidebarItem icon={Plus} label="New Post" active={currentView === "composer"} onClick={() => setCurrentView("composer")} collapsed={isSidebarCollapsed} />
          <SidebarItem icon={Brain} label="Brain Dump" active={currentView === "braindump"} onClick={() => setCurrentView("braindump")} collapsed={isSidebarCollapsed} />
          <SidebarItem icon={Settings} label="Settings" active={currentView === "settings"} onClick={() => setCurrentView("settings")} collapsed={isSidebarCollapsed} />
        </nav>

        <div className="p-4 border-t border-slate-100 flex flex-col gap-2">
          <button
            onClick={() => { setIsLoggedIn(false); localStorage.removeItem("linkedin_token"); setUser(null); }}
            className={cn("w-full flex items-center gap-3 px-4 py-2 text-slate-500 hover:text-red-500 hover:bg-red-50 transition-colors rounded-lg", isSidebarCollapsed && "justify-center px-0")}
            title="Logout"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {!isSidebarCollapsed && <span className="font-medium">Logout</span>}
          </button>
        </div>
      </aside>

      <main className={cn(
        "flex-1 p-8 transition-all duration-300 ease-in-out",
        isSidebarCollapsed ? "ml-20" : "ml-64"
      )}>
        <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
          <AnimatePresence>
            {toasts.map((toast) => (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className={cn(
                  "px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 min-w-[280px] border",
                  toast.type === "success" && "bg-emerald-50 border-emerald-200 text-emerald-800",
                  toast.type === "error" && "bg-red-50 border-red-200 text-red-800",
                  toast.type === "info" && "bg-blue-50 border-blue-200 text-blue-800"
                )}
              >
                <p className="text-sm font-medium">{toast.message}</p>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <header className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 capitalize">{currentView === "ailab" ? "content studio" : currentView}</h2>
            {currentView === "dashboard" && (
              <p className="text-slate-500">Welcome back, {user?.name || "Joel"}!</p>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200 shadow-sm">
              <div className={cn("w-2 h-2 rounded-full", serverStatus === "online" ? "bg-emerald-500" : "bg-red-500")} />
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Server {serverStatus}</span>
            </div>
            <button onClick={() => setCurrentView("ailab")} className="bg-[#0077B5] text-white px-6 py-2.5 rounded-xl font-semibold shadow-lg shadow-[#0077B5]/20 flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Create Post
            </button>
          </div>
        </header>

        <AnimatePresence mode="wait">
          {currentView === "dashboard" && (
            <motion.div key="dashboard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold mb-4">LinkedIn Analytics</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {isLoadingAnalytics ? (
                    [1, 2, 3].map((i) => (
                      <div key={i} className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <Skeleton className="h-4 w-20 mb-2" />
                        <Skeleton className="h-8 w-32" />
                      </div>
                    ))
                  ) : (
                    [
                      { label: "Profile Views", value: analytics?.profileViews || "---" },
                      { label: "Post Impressions", value: analytics?.postImpressions || "---" },
                      { label: "New Connections", value: analytics?.newConnections || "---" }
                    ].map((stat, i) => (
                      <div key={i} className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <p className="text-slate-500 text-xs font-medium mb-1">{stat.label}</p>
                        <h3 className="text-2xl font-bold">{stat.value}</h3>
                      </div>
                    ))
                  )}
                </div>
                {!isLoadingAnalytics && (analytics?.totalLikes > 0 || analytics?.totalComments > 0) && (
                  <div className="mt-4 pt-4 border-t border-slate-100 flex gap-6">
                    <div className="flex items-center gap-2">
                      <ThumbsUp className="w-4 h-4 text-[#0077B5]" />
                      <span className="text-sm font-bold">{analytics.totalLikes} Total Likes</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MessageCircle className="w-4 h-4 text-emerald-500" />
                      <span className="text-sm font-bold">{analytics.totalComments} Total Comments</span>
                    </div>
                  </div>
                )}
                {!isLoadingAnalytics && analytics?.warning && (
                  <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-center gap-2 text-amber-700 text-xs font-medium">
                    <Info className="w-4 h-4" />
                    {analytics.warning}
                  </div>
                )}
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold mb-4">Automation Performance</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {isLoadingAnalytics ? (
                    [1, 2, 3].map((i) => (
                      <div key={i} className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <Skeleton className="h-4 w-20 mb-2" />
                        <Skeleton className="h-8 w-32" />
                      </div>
                    ))
                  ) : (
                    <>
                      <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                        <p className="text-blue-600 text-[10px] font-black uppercase tracking-widest mb-1">Scheduled</p>
                        <h3 className="text-2xl font-black text-blue-700">{analytics?.postStats?.pending || 0}</h3>
                      </div>
                      <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
                        <p className="text-emerald-600 text-[10px] font-black uppercase tracking-widest mb-1">Successfully Posted</p>
                        <h3 className="text-2xl font-black text-emerald-700">{analytics?.postStats?.posted || 0}</h3>
                      </div>
                      <div className="bg-red-50/50 p-4 rounded-xl border border-red-100">
                        <p className="text-red-600 text-[10px] font-black uppercase tracking-widest mb-1">Failed</p>
                        <h3 className="text-2xl font-black text-red-700">{analytics?.postStats?.failed || 0}</h3>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <h4 className="font-bold flex items-center gap-2 mb-4">
                    <Linkedin className="w-5 h-5 text-[#0077B5]" />
                    Automation Logs
                  </h4>
                  <div className="space-y-6">
                    {isLoadingLogs ? (
                      [1, 2, 3].map((i) => (
                        <div key={i} className="flex gap-4">
                          <Skeleton className="w-8 h-8 rounded-full" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-1/3" />
                            <Skeleton className="h-3 w-2/3" />
                          </div>
                        </div>
                      ))
                    ) : logs.length > 0 ? (
                      logs.map((log, idx) => (
                        <div key={idx} className="flex gap-4 relative">
                          {idx !== logs.length - 1 && <div className="absolute left-4 top-8 bottom-[-24px] w-px bg-slate-100" />}
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10",
                            log.type === 'success' ? 'bg-emerald-50 text-emerald-500' :
                              log.type === 'error' ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-[#0077B5]'
                          )}>
                            {log.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> :
                              log.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                              <p className="text-sm font-bold text-slate-800">{log.action}</p>
                              <span className="text-[10px] font-bold text-slate-400">
                                {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 line-clamp-2">{log.message}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-center py-12 text-slate-400 text-sm">No automation activity logs yet.</p>
                    )}
                  </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <h4 className="font-bold mb-4">Quick Actions</h4>
                  <div className="space-y-3">
                    <button onClick={() => setCurrentView("ailab")} className="w-full p-3 rounded-xl border border-slate-100 hover:bg-slate-50 text-sm font-medium flex items-center gap-3">
                      <Sparkles className="w-4 h-4 text-[#0077B5]" /> Content Studio
                    </button>
                    <button onClick={() => setCurrentView("composer")} className="w-full p-3 rounded-xl border border-slate-100 hover:bg-slate-50 text-sm font-medium flex items-center gap-3">
                      <PenSquare className="w-4 h-4 text-emerald-500" /> Composer
                    </button>
                    <button onClick={fetchAnalytics} className="w-full p-3 rounded-xl border border-slate-100 hover:bg-slate-50 text-sm font-medium flex items-center gap-3">
                      <RefreshCw className="w-4 h-4 text-[#0077B5] animate-spin" /> Refresh Analytics
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {currentView === "calendar" && (
            <motion.div key="calendar" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <MainCalendarView
                posts={posts}
                onDateClick={(date) => {
                  setSelectedCalendarDate(date);
                  setIsCalendarActionOpen(true);
                }}
              />
            </motion.div>
          )}

          {currentView === "scheduler" && (
            <motion.div key="scheduler" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                  <div>
                    <h3 className="text-lg font-bold">Content Queue</h3>
                    <p className="text-sm text-slate-500">Manage and oversee your automated posts.</p>
                  </div>
                  <div className="flex gap-2">
                    {["all", "scheduled", "posted", "drafts"].map(f => (
                      <button key={f} onClick={() => setQueueFilter(f as any)} className={cn("px-4 py-1.5 rounded-lg text-xs font-bold capitalize transition-all", queueFilter === f ? "bg-[#0077B5] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}>{f}</button>
                    ))}
                  </div>
                </div>

                <div className="mb-6 relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search posts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-[#0077B5] text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {posts
                    .filter(p => {
                      if (queueFilter === "all") return true;
                      if (queueFilter === "drafts") return p.is_draft;
                      if (queueFilter === "scheduled") return !p.is_draft && p.status === "pending";
                      if (queueFilter === "posted") return !p.is_draft && p.status === "posted";
                      return true;
                    })
                    .filter(p => (p.content || "").toLowerCase().includes(searchQuery.toLowerCase()))
                    .length > 0 ? (
                    posts
                      .filter(p => {
                        if (queueFilter === "all") return true;
                        if (queueFilter === "drafts") return p.is_draft;
                        if (queueFilter === "scheduled") return !p.is_draft && p.status === "pending";
                        if (queueFilter === "posted") return !p.is_draft && p.status === "posted";
                        return true;
                      })
                      .filter(p => (p.content || "").toLowerCase().includes(searchQuery.toLowerCase()))
                      .map(post => {
                        // Extract first media URL if exists
                        const mediaUrls = post.media_urls ? JSON.parse(post.media_urls) : [];
                        const firstMedia = post.image_url || mediaUrls[0];

                        return (
                          <div key={post.id} className="group relative bg-white rounded-[24px] border border-slate-200 shadow-sm hover:shadow-xl hover:border-[#0077B5]/30 transition-all duration-300 overflow-hidden flex flex-col h-full">
                            {/* Card Media Preview */}
                            <div className="relative aspect-video bg-slate-100 overflow-hidden">
                              {firstMedia ? (
                                firstMedia.includes('video') || firstMedia.endsWith('.mp4') ? (
                                  <video src={firstMedia} className="w-full h-full object-cover" />
                                ) : (
                                  <img src={firstMedia} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="Post preview" />
                                )
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-slate-50">
                                  <Type className="w-8 h-8 text-slate-200" />
                                </div>
                              )}

                              {/* Status Badge Over Media */}
                              <div className="absolute top-3 left-3">
                                {post.is_draft ? (
                                  <span className="px-2 py-1 bg-slate-900/80 backdrop-blur-md text-white text-[9px] font-black rounded-lg uppercase tracking-wider shadow-lg">Draft</span>
                                ) : (
                                  <span className={cn(
                                    "px-2 py-1 backdrop-blur-md text-[9px] font-black rounded-lg uppercase tracking-wider shadow-lg",
                                    post.status === "posted" ? "bg-emerald-500/80 text-white" :
                                      post.status === "failed" ? "bg-red-500/80 text-white" :
                                        "bg-[#0077B5]/80 text-white"
                                  )}>
                                    {post.status}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Card Content */}
                            <div className="p-5 flex flex-col flex-1">
                              <div className="mb-3">
                                {post.scheduled_at && !post.is_draft && (
                                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#0077B5] uppercase tracking-wider mb-2">
                                    <Clock className="w-3 h-3" />
                                    {new Date(post.scheduled_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                                  </div>
                                )}
                                <p className="text-sm text-slate-700 line-clamp-4 leading-relaxed font-medium">
                                  {post.content}
                                </p>
                              </div>

                              <div className="mt-auto pt-4 flex items-center gap-2 border-t border-slate-50">
                                {post.status !== "posted" && (
                                  <button
                                    onClick={() => handlePublishPost(post.id)}
                                    className="flex-1 p-2.5 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all flex items-center justify-center gap-1.5 text-[11px] font-bold"
                                    disabled={loading}
                                  >
                                    <Send className="w-3.5 h-3.5" />
                                    Publish
                                  </button>
                                )}
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleEditOpen(post)}
                                    className="p-2.5 rounded-xl bg-slate-50 text-slate-600 hover:bg-[#0077B5] hover:text-white transition-all flex items-center justify-center gap-1.5 text-[11px] font-bold"
                                    title="Edit"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeletePost(post.id)}
                                    className="p-2.5 rounded-xl bg-slate-50 text-slate-600 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-1.5 text-[11px] font-bold"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                  ) : (
                    <div className="col-span-1 md:col-span-2 lg:col-span-3 text-center py-20 bg-white rounded-[32px] border border-slate-200">
                      <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Calendar className="w-8 h-8 text-slate-200" />
                      </div>
                      <h3 className="text-lg font-bold text-slate-800">Empty Queue</h3>
                      <p className="text-slate-400 text-sm mb-6 max-w-xs mx-auto">No posts found in this queue. Start creating in the Content Studio.</p>
                      <button
                        onClick={() => setCurrentView("ailab")}
                        className="px-6 py-3 bg-[#0077B5] text-white text-sm font-bold rounded-xl hover:bg-[#004182] transition-all shadow-lg shadow-[#0077B5]/20"
                      >
                        Create Post
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {currentView === "ailab" && (
            <motion.div key="ailab" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="max-w-4xl mx-auto space-y-8 pb-20">

              {/* Main Generator Section */}
              <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-200 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#0077B5]/10 rounded-xl flex items-center justify-center">
                      <Plus className="w-5 h-5 text-[#0077B5]" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">Generate Post</h3>
                      <p className="text-xs text-slate-500">Transform your ideas into viral content</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="relative">
                    <textarea
                      value={topic}
                      onChange={e => setTopic(e.target.value)}
                      placeholder="What should this post be about? (e.g., Why SaaS founders fail, My morning routine...)"
                      className="w-full h-32 p-5 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:border-[#0077B5] focus:bg-white transition-all resize-none text-lg"
                    />
                  </div>

                  <button
                    onClick={handleGeneratePost}
                    disabled={loading || !topic}
                    className="w-full bg-[#0077B5] text-white py-5 rounded-2xl font-bold disabled:opacity-50 hover:bg-[#004182] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#0077B5]/20 text-lg"
                  >
                    {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Sparkles className="w-6 h-6" />}
                    {loading ? "AI is crafting your post..." : "Generate Masterpiece"}
                  </button>
                </div>
              </div>

              {generatedContent && (
                <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-200 space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold">AI Draft</h3>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setGeneratedContent("");
                          addToast("AI Draft cleared", "info");
                        }}
                        className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-red-500 transition-all"
                        title="Clear Draft"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => {
                        navigator.clipboard.writeText(generatedContent);
                        addToast("Copied to clipboard!", "success");
                      }} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-[#0077B5] transition-all" title="Copy text">
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <textarea value={generatedContent} onChange={e => setGeneratedContent(e.target.value)} className="w-full h-80 p-6 rounded-2xl bg-slate-50/50 border border-slate-100 text-base leading-relaxed outline-none resize-none focus:border-[#0077B5] focus:bg-white" />

                  {selectedImage && (
                    <div className="space-y-2">
                      <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-slate-200 shadow-inner">
                        {selectedImage.startsWith("data:video/") ? (
                          <video src={selectedImage} controls className="w-full h-full object-cover" />
                        ) : (
                          <img src={selectedImage} className="w-full h-full object-cover" alt="Preview" />
                        )}
                        <button onClick={() => setSelectedImage(null)} className="absolute top-4 right-4 p-2 bg-white/90 rounded-full text-red-500 shadow-lg hover:bg-white transition-all">
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                      {selectedImage.startsWith("data:video/") && (
                        <div className="flex items-center gap-4">
                          <input type="file" id="labThumb" className="hidden" accept="image/*" onChange={handleThumbnailChange} />
                          <label htmlFor="labThumb" className="flex-1 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs font-bold text-slate-500 hover:bg-slate-100 cursor-pointer flex items-center justify-center gap-2">
                            <ImageIcon className="w-4 h-4" /> {videoThumbnail ? "Update Thumbnail" : "Add Video Thumbnail"}
                          </label>
                          {videoThumbnail && (
                            <img src={videoThumbnail} className="w-12 h-12 rounded-lg object-cover border border-slate-200" alt="Thumb" />
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {mediaItems.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Carousel Items ({mediaItems.length})</span>
                        <button onClick={() => setMediaItems([])} className="text-[10px] font-bold text-red-400 hover:text-red-500 transition-colors flex items-center gap-1">
                          <Trash2 className="w-3 h-3" /> Clear All
                        </button>
                      </div>
                      <div className="grid grid-cols-4 gap-3">
                        {mediaItems.map((item, idx) => (
                          <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden border border-slate-100 group shadow-sm ring-1 ring-slate-200/50">
                            {item.startsWith("data:video/") ? <video src={item} className="w-full h-full object-cover" /> : <img src={item} className="w-full h-full object-cover" alt="" />}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                              <button
                                onClick={() => setMediaItems(prev => prev.filter((_, i) => i !== idx))}
                                className="p-2 bg-red-500 text-white rounded-xl shadow-lg hover:bg-red-600 transition-all transform scale-90 group-hover:scale-100"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-4 pt-4 border-t border-slate-50">
                    <input type="file" id="labImg" className="hidden" accept="image/*,video/*" multiple onChange={handleMultipleMediaChange} />
                    <label htmlFor="labImg" className="flex-1 p-4 rounded-2xl border-2 border-dashed border-slate-200 hover:border-[#0077B5] hover:bg-[#0077B5]/5 text-slate-500 text-sm font-bold flex items-center justify-center gap-2 cursor-pointer transition-all">
                      <ImageIcon className="w-5 h-5" />
                      Add Media / Create Carousel
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="relative">
                      <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input type="datetime-local" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)} className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 text-sm font-medium focus:border-[#0077B5] outline-none bg-white" />
                    </div>
                    <button onClick={handlePostNow} disabled={loading} className="bg-[#0077B5] text-white rounded-2xl font-bold hover:bg-[#004182] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#0077B5]/20">
                      <Send className="w-5 h-5" />
                      Publish Now
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <button onClick={handleSaveDraft} disabled={loading} className="bg-slate-50 text-slate-600 py-4 rounded-2xl font-bold hover:bg-slate-100 transition-all border border-slate-100">Save as Draft</button>
                    <button onClick={schedulePost} disabled={loading} className="bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-black transition-all shadow-lg shadow-slate-900/10">Schedule Content</button>
                  </div>
                </div>
              )}

              {/* Industry Specific Content Feed - Dual Row Split Scrolling */}
              <div className="relative overflow-hidden py-12 -mx-8 bg-slate-50/50 space-y-8">
                {/* Top Row: Scrolling Left (Items 0-9) */}
                <div className="flex animate-horizontal-infinite gap-6 px-8 w-max">
                  {INDUSTRY_FEED_POSTS.slice(0, 10).map((item, idx) => (
                    <div key={`row1-${idx}`} className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm hover:shadow-2xl hover:border-[#0077B5]/30 transition-all group w-[320px] flex-shrink-0 flex flex-col items-start gap-3">
                      <div className="flex items-center justify-between w-full">
                        <span className="text-[9px] font-black text-[#0077B5] uppercase tracking-widest px-2 py-1 bg-blue-50 rounded-lg">{item.industry}</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              // Strip Industry and Post Type headers
                              const cleanedContent = item.content
                                .replace(/^Industry:.*$\n?/m, "")
                                .replace(/^Post Type:.*$\n?/m, "")
                                .trim();
                              setGeneratedContent(cleanedContent);
                              addToast("LinkedIn post moved to draft!", "success");
                              window.scrollTo({ top: 0, behavior: "smooth" });
                            }}
                            className="px-3 py-1.5 bg-[#0077B5] text-white text-[9px] font-bold rounded-lg transition-all shadow-lg shadow-[#0077B5]/20 hover:bg-[#004182] active:scale-95"
                          >
                            Use Post
                          </button>
                        </div>
                      </div>
                      <h4 className="font-bold text-slate-900 text-base leading-tight">{item.title}</h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-6">{item.content}</p>
                    </div>
                  ))}
                  {/* Duplicate Row 1 for Infinite Scroll */}
                  {INDUSTRY_FEED_POSTS.slice(0, 10).map((item, idx) => (
                    <div key={`row1-dup-${idx}`} className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm hover:shadow-2xl hover:border-[#0077B5]/30 transition-all group w-[320px] flex-shrink-0 flex flex-col items-start gap-3">
                      <div className="flex items-center justify-between w-full">
                        <span className="text-[9px] font-black text-[#0077B5] uppercase tracking-widest px-2 py-1 bg-blue-50 rounded-lg">{item.industry}</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              // Strip Industry and Post Type headers
                              const cleanedContent = item.content
                                .replace(/^Industry:.*$\n?/m, "")
                                .replace(/^Post Type:.*$\n?/m, "")
                                .trim();
                              setGeneratedContent(cleanedContent);
                              addToast("LinkedIn post moved to draft!", "success");
                              window.scrollTo({ top: 0, behavior: "smooth" });
                            }}
                            className="px-3 py-1.5 bg-[#0077B5] text-white text-[9px] font-bold rounded-lg transition-all shadow-lg shadow-[#0077B5]/20 hover:bg-[#004182] active:scale-95"
                          >
                            Use Post
                          </button>
                        </div>
                      </div>
                      <h4 className="font-bold text-slate-900 text-base leading-tight">{item.title}</h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-6">{item.content}</p>
                    </div>
                  ))}
                </div>

                {/* Bottom Row: Scrolling Right (Items 10-19) */}
                <div className="flex animate-horizontal-infinite-reverse gap-6 px-8 w-max">
                  {INDUSTRY_FEED_POSTS.slice(10, 20).map((item, idx) => (
                    <div key={`row2-${idx}`} className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm hover:shadow-2xl hover:border-[#0077B5]/30 transition-all group w-[320px] flex-shrink-0 flex flex-col items-start gap-3">
                      <div className="flex items-center justify-between w-full">
                        <span className="text-[9px] font-black text-[#0077B5] uppercase tracking-widest px-2 py-1 bg-blue-50 rounded-lg">{item.industry}</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              // Strip Industry and Post Type headers
                              const cleanedContent = item.content
                                .replace(/^Industry:.*$\n?/m, "")
                                .replace(/^Post Type:.*$\n?/m, "")
                                .trim();
                              setGeneratedContent(cleanedContent);
                              addToast("LinkedIn post moved to draft!", "success");
                              window.scrollTo({ top: 0, behavior: "smooth" });
                            }}
                            className="px-3 py-1.5 bg-[#0077B5] text-white text-[9px] font-bold rounded-lg transition-all shadow-lg shadow-[#0077B5]/20 hover:bg-[#004182] active:scale-95"
                          >
                            Use Post
                          </button>
                        </div>
                      </div>
                      <h4 className="font-bold text-slate-900 text-base leading-tight">{item.title}</h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-6">{item.content}</p>
                    </div>
                  ))}
                  {/* Duplicate Row 2 for Infinite Scroll */}
                  {INDUSTRY_FEED_POSTS.slice(10, 20).map((item, idx) => (
                    <div key={`row2-dup-${idx}`} className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm hover:shadow-2xl hover:border-[#0077B5]/30 transition-all group w-[320px] flex-shrink-0 flex flex-col items-start gap-3">
                      <div className="flex items-center justify-between w-full">
                        <span className="text-[9px] font-black text-[#0077B5] uppercase tracking-widest px-2 py-1 bg-blue-50 rounded-lg">{item.industry}</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              // Strip Industry and Post Type headers
                              const cleanedContent = item.content
                                .replace(/^Industry:.*$\n?/m, "")
                                .replace(/^Post Type:.*$\n?/m, "")
                                .trim();
                              setGeneratedContent(cleanedContent);
                              addToast("LinkedIn post moved to draft!", "success");
                              window.scrollTo({ top: 0, behavior: "smooth" });
                            }}
                            className="px-3 py-1.5 bg-[#0077B5] text-white text-[9px] font-bold rounded-lg transition-all shadow-lg shadow-[#0077B5]/20 hover:bg-[#004182] active:scale-95"
                          >
                            Use Post
                          </button>
                        </div>
                      </div>
                      <h4 className="font-bold text-slate-900 text-base leading-tight">{item.title}</h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-6">{item.content}</p>
                    </div>
                  ))}
                </div>

                {/* Fades */}
                <div className="absolute top-0 bottom-0 left-0 w-48 bg-gradient-to-r from-[#F3F6F8] to-transparent z-10" />
                <div className="absolute top-0 bottom-0 right-0 w-48 bg-gradient-to-l from-[#F3F6F8] to-transparent z-10" />
              </div>

              {/* Manual Training Modal */}
              <AnimatePresence>
                {showManualTrain && (
                  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden border border-slate-200"
                    >
                      <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-[#0077B5] rounded-2xl flex items-center justify-center shadow-lg shadow-[#0077B5]/20">
                            <Brain className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-slate-900">Voice Training</h3>
                            <p className="text-sm text-slate-500">Paste your content to sync your AI voice</p>
                          </div>
                        </div>
                        <button onClick={() => setShowManualTrain(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                          <X className="w-6 h-6 text-slate-400" />
                        </button>
                      </div>

                      <div className="p-8 space-y-6">
                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-between">
                            Sample Content
                            <span className="text-slate-300 font-medium normal-case">Paste 2-3 posts · Separate with ---</span>
                          </label>
                          <textarea
                            value={manualPosts}
                            onChange={(e) => setManualPosts(e.target.value)}
                            placeholder="Paste your past posts here..."
                            className="w-full h-80 p-6 rounded-[24px] bg-slate-50 border-2 border-transparent focus:border-[#0077B5] focus:bg-white outline-none transition-all resize-none text-base text-slate-700 leading-relaxed shadow-inner"
                          />
                        </div>

                        <div className="flex items-center gap-4">
                          <button
                            onClick={trainManually}
                            disabled={isSyncingStyle || !manualPosts.trim()}
                            className="w-full py-5 rounded-2xl bg-[#0077B5] text-white font-bold hover:bg-[#004182] disabled:opacity-50 transition-all flex items-center justify-center gap-3 shadow-xl shadow-[#0077B5]/30 text-lg"
                          >
                            {isSyncingStyle ? <Loader2 className="w-6 h-6 animate-spin" /> : <Sparkles className="w-6 h-6" />}
                            Sync AI Personality
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {currentView === "composer" && (
            <motion.div key="composer" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="max-w-5xl mx-auto space-y-12 pb-20">

              {/* Header Section */}
              <div className="flex items-center gap-3 mb-2">
                <PenSquare className="w-8 h-8 text-[#0077B5]" />
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Craft Post</h2>
                  <p className="text-slate-500 text-sm">Compose and publish engaging LinkedIn posts. Use AI ideas or write your own.</p>
                </div>
              </div>


              {/* Advanced Composer Card */}
              <div className="bg-white rounded-[32px] p-8 border border-slate-200 shadow-sm space-y-6">
                <div className="relative group">
                  <textarea
                    value={generatedContent}
                    onChange={e => setGeneratedContent(e.target.value)}
                    placeholder="What's on your mind?"
                    className="w-full h-48 p-0 text-xl text-slate-800 placeholder:text-slate-300 border-none outline-none resize-none focus:ring-0"
                  />
                  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-4">
                      <input type="file" id="compImgMain" className="hidden" accept="image/*,video/*" multiple onChange={handleMultipleMediaChange} />
                      <label htmlFor="compImgMain" className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-slate-500 hover:bg-slate-50 cursor-pointer transition-colors text-sm font-medium">
                        <ImageIcon className="w-5 h-5" />
                        Attach Media
                      </label>
                    </div>
                    <div className="text-xs font-medium text-slate-400">
                      {generatedContent.length} / 3000
                    </div>
                  </div>
                </div>


                {mediaItems.length > 0 && (
                  <div className="space-y-4 pt-4 border-t border-slate-50">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-400 uppercase tracking-[0.15em] flex items-center gap-2">
                        <Share2 className="w-3.5 h-3.5" /> Carousel Items ({mediaItems.length})
                      </span>
                      <button onClick={() => setMediaItems([])} className="text-xs font-bold text-red-500 hover:underline flex items-center gap-1">
                        <Trash2 className="w-3 h-3" /> Remove All
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-4 pb-2">
                      {mediaItems.map((item, idx) => (
                        <div key={idx} className="relative group w-48 h-48 rounded-3xl overflow-hidden border border-slate-100 shadow-xl transition-all hover:scale-105 bg-slate-900 cursor-zoom-in ring-offset-4 hover:ring-2 ring-[#0077B5]/20" onClick={() => setPreviewMedia(item)}>
                          {item.startsWith("data:video/") ? (
                            <div className="w-full h-full relative">
                              <video src={item} className="w-full h-full object-cover opacity-80" />
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="bg-white/20 backdrop-blur-sm p-3 rounded-full text-white">
                                  <Video className="w-6 h-6" />
                                </div>
                              </div>
                            </div>
                          ) : (
                            <img src={item} className="w-full h-full object-cover" alt="" />
                          )}
                          <div className="absolute top-3 right-3 flex gap-1.5 z-20">
                            <button
                              onClick={(e) => { e.stopPropagation(); moveMedia(idx, 'left'); }}
                              className="p-2 bg-white/95 text-slate-900 rounded-xl shadow-lg hover:bg-white transition-all disabled:opacity-30"
                              title="Move Left"
                              disabled={idx === 0}
                            >
                              <ArrowLeft className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); moveMedia(idx, 'right'); }}
                              className="p-2 bg-white/95 text-slate-900 rounded-xl shadow-lg hover:bg-white transition-all disabled:opacity-30"
                              title="Move Right"
                              disabled={idx === mediaItems.length - 1}
                            >
                              <ArrowRight className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setMediaItems(prev => prev.filter((_, i) => i !== idx)); }}
                              className="p-2 bg-red-600 text-white rounded-xl shadow-lg hover:bg-red-700 transition-all border border-red-500"
                              title="Delete Media"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="absolute bottom-3 left-3 px-3 py-1.5 bg-white/95 backdrop-blur-md text-slate-900 text-[10px] font-black rounded-xl shadow-sm border border-slate-100 flex items-center gap-1">
                            <span className="opacity-40 font-bold">#</span>SLIDE {idx + 1}
                          </div>
                        </div>
                      ))}
                    </div>
                    {mediaItems.some(it => it.startsWith("data:video/")) && (
                      <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 mt-2">
                        <input type="file" id="compThumb" className="hidden" accept="image/*" onChange={handleThumbnailChange} />
                        <label htmlFor="compThumb" className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 cursor-pointer transition-all">
                          <ImageIcon className="w-4 h-4" /> {videoThumbnail ? "Update Video Thumbnail" : "Upload Video Thumbnail"}
                        </label>
                        {videoThumbnail && (
                          <div className="relative">
                            <img src={videoThumbnail} className="w-16 h-16 rounded-xl object-cover border-2 border-[#0077B5]" alt="Thumb" />
                            <button onClick={() => setVideoThumbnail(null)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5"><X className="w-3 h-3" /></button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-4">
                  <div className="flex items-center gap-6 text-slate-400">
                    <div className="flex items-center gap-6 text-slate-400">
                      <button
                        onClick={() => {
                          setGeneratedContent("");
                          setSelectedImage(null);
                          setMediaItems([]);
                          setVideoThumbnail(null);
                          addToast("Draft cleared", "info");
                        }}
                        className="flex items-center gap-1.5 hover:text-red-500 transition-colors text-[10px] font-black uppercase tracking-widest text-slate-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Clear All
                      </button>
                      <button onClick={() => setCurrentView("ailab")} className="flex items-center gap-1.5 hover:text-[#0077B5] transition-colors text-[10px] font-black uppercase tracking-widest text-slate-400">
                        <Sparkles className="w-3.5 h-3.5" /> AI Prompt
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:flex-none min-w-[180px]">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                      <input
                        type="datetime-local"
                        value={scheduleTime}
                        onChange={e => setScheduleTime(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-[#0077B5] outline-none bg-slate-50 font-bold text-slate-600"
                      />
                    </div>
                    <button onClick={handleSaveDraft} disabled={loading} className="px-5 py-2 rounded-xl font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all text-xs flex items-center gap-1.5">
                      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                      {loading ? "Saving..." : "Save Draft"}
                    </button>
                    <button onClick={schedulePost} disabled={loading} className="px-5 py-2 rounded-xl font-bold border-2 border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white transition-all text-xs flex items-center gap-1.5">
                      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                      {loading ? "Scheduling..." : "Schedule"}
                    </button>
                    <button onClick={handlePostNow} disabled={loading} className="bg-[#0077B5] text-white px-6 py-2 rounded-xl font-bold hover:bg-[#004182] transition-all flex items-center gap-1.5 shadow-lg shadow-[#0077B5]/10 text-xs">
                      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-white" /> : <Send className="w-3.5 h-3.5" />}
                      {loading ? "Posting..." : "Post Now"}
                    </button>
                  </div>
                </div>
              </div>


              {/* Enhanced Content Queue directly below */}
              <div className="space-y-6 pt-12 border-t border-slate-100">
                <div className="flex items-center gap-4">
                  {["scheduled", "posted", "drafts"].map(f => (
                    <button key={f} onClick={() => setQueueFilter(f as any)} className={cn("px-6 py-2 rounded-full text-sm font-bold capitalize transition-all", queueFilter === f ? "bg-slate-900 text-white shadow-xl" : "bg-slate-100 text-slate-500 hover:bg-slate-200")}>{f}</button>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {posts
                    .filter(p => {
                      if (queueFilter === "all") return true;
                      if (queueFilter === "drafts") return p.is_draft;
                      if (queueFilter === "scheduled") return !p.is_draft && p.status === "pending";
                      if (queueFilter === "posted") return !p.is_draft && p.status === "posted";
                      return true;
                    })
                    .length > 0 ? (
                    posts
                      .filter(p => {
                        if (queueFilter === "all") return true;
                        if (queueFilter === "drafts") return p.is_draft;
                        if (queueFilter === "scheduled") return !p.is_draft && p.status === "pending";
                        if (queueFilter === "posted") return !p.is_draft && p.status === "posted";
                        return true;
                      })
                      .map(post => (
                        <div key={post.id} className="p-6 rounded-[24px] border border-slate-100 bg-white hover:shadow-xl transition-all group relative overflow-hidden">
                          <div className="flex items-center gap-2 mb-3">
                            {post.status === "posted" ? (
                              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded-md">POSTED</span>
                            ) : post.is_draft ? (
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-md">DRAFT</span>
                            ) : (
                              <span className="px-2 py-0.5 bg-[#0077B5]/10 text-[#0077B5] text-[10px] font-bold rounded-md uppercase tracking-wider">Scheduled {new Date(post.scheduled_at).toLocaleDateString()}</span>
                            )}
                          </div>
                          <p className="text-slate-800 text-sm line-clamp-3 mb-6 leading-relaxed font-normal">{post.content}</p>

                          <div className="flex items-center justify-between">
                            <div className="flex gap-2">
                              <button onClick={() => handleEditOpen(post)} className="p-2 bg-slate-50 text-slate-600 hover:bg-[#0077B5] hover:text-white rounded-lg transition-all">
                                <PenSquare className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleDeletePost(post.id)} className="p-2 bg-slate-50 text-slate-600 hover:bg-red-500 hover:text-white rounded-lg transition-all">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            {post.status !== "posted" && !post.is_draft && (
                              <button onClick={() => handlePublishPost(post.id)} className="px-4 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-[#0077B5] transition-all">
                                Publish Now
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                  ) : (
                    <div className="col-span-full py-20 bg-slate-50/50 rounded-[32px] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center text-center">
                      <Calendar className="w-12 h-12 text-slate-200 mb-4" />
                      <h4 className="text-lg font-bold text-slate-900">No {queueFilter} posts</h4>
                      <p className="text-slate-400 text-sm">Create and {queueFilter === 'posted' ? 'publish' : 'schedule'} them above to see them here.</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {currentView === "analytics" && (
            <motion.div key="analytics" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6 text-center py-20 bg-white rounded-3xl border border-slate-200 border-dashed">
              <BarChart3 className="w-16 h-16 text-slate-200 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-900">Advanced Analytics Portal</h3>
              <p className="text-slate-500 max-w-sm mx-auto">Detailed historical tracking and exportable reports are being generated based on your real-time activity.</p>
              <button onClick={fetchAnalytics} className="mt-6 text-[#0077B5] font-bold hover:underline">Refresh Data Pipeline</button>
            </motion.div>
          )}

          {currentView === "settings" && (
            <motion.div key="settings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="max-w-2xl space-y-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold mb-6">Application Settings</h3>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">LinkedIn Profile URL</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={userProfileUrl}
                        onChange={e => setUserProfileUrl(e.target.value)}
                        placeholder="https://www.linkedin.com/in/yourprofile"
                        className="flex-1 px-4 py-2 rounded-xl border border-slate-200 outline-none focus:border-[#0077B5]"
                      />
                      <button
                        onClick={updateProfileUrl}
                        disabled={isUpdatingProfile}
                        className="bg-[#0077B5] text-white px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-50"
                      >
                        {isUpdatingProfile ? "Saving..." : "Save URL"}
                      </button>
                    </div>
                    <p className="mt-2 text-xs text-slate-400">Required for profile-level real-time tracking via Creator API.</p>
                  </div>

                  <div className="pt-6 border-t border-slate-100">
                    <p className="text-sm font-bold text-slate-700 mb-2">Connected Account</p>
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img src={user?.avatar} className="w-10 h-10 rounded-full" alt="" />
                        <div>
                          <p className="font-bold text-sm">{user?.name || "Member"}</p>
                          <p className="text-xs text-slate-500">{user?.email}</p>
                        </div>
                      </div>
                      <div className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded-full uppercase tracking-wider">Connected</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Personal Voice Section */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 group hover:border-[#0077B5]/30 transition-all">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#0077B5]/10 rounded-xl flex items-center justify-center">
                      <Brain className="w-5 h-5 text-[#0077B5]" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">Personal Voice</h3>
                      <p className="text-xs text-slate-500">AI identity training</p>
                    </div>
                  </div>
                </div>

                {userStyle ? (
                  <div className="space-y-4">
                    <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 relative group/voice">
                      <p className="text-sm text-slate-600 italic leading-relaxed line-clamp-6">"{userStyle}"</p>
                      <div className="absolute top-3 right-3">
                        <span className="px-2 py-1 bg-[#0077B5] text-white text-[9px] font-black rounded-md uppercase tracking-wider">Active</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowManualTrain(true)}
                      className="w-full py-3 px-4 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Re-train Voice Profile
                    </button>
                  </div>
                ) : (
                  <div className="p-8 border-2 border-dashed border-slate-100 rounded-[24px] text-center bg-slate-50/30">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm border border-slate-100">
                      <Sparkles className="w-6 h-6 text-slate-200" />
                    </div>
                    <p className="text-sm text-slate-400 mb-6">Train the AI to write exactly like you.</p>
                    <button
                      onClick={() => setShowManualTrain(true)}
                      className="w-full py-4 bg-slate-900 text-white rounded-2xl text-sm font-bold hover:bg-black transition-all shadow-xl shadow-slate-900/20"
                    >
                      Start Voice Training
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {currentView === "braindump" && (
            <motion.div key="braindump" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="max-w-5xl mx-auto space-y-6 pb-20">
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-3 bg-blue-50 rounded-2xl">
                    <Brain className="w-8 h-8 text-[#0077B5]" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">Post Brain Dump</h2>
                    <p className="text-slate-500 text-base">Empty your mind. The AI will find the gold and polish it.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <textarea
                    value={brainDumpInput}
                    onChange={(e) => setBrainDumpInput(e.target.value)}
                    placeholder="Describe your idea in any way you want... don't worry about formatting, grammar, or hook yet. Just vent."
                    className="w-full h-48 p-6 rounded-2xl bg-slate-50/50 border border-slate-200 outline-none focus:border-[#0077B5] text-lg text-slate-700 leading-relaxed placeholder:text-slate-300 resize-none transition-all shadow-inner"
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={handleBrainDump}
                      disabled={isAnalyzingDump || !brainDumpInput.trim()}
                      className="px-8 py-4 rounded-xl font-black text-white bg-[#0077B5] hover:bg-[#004182] shadow-xl shadow-blue-600/20 transition-all disabled:opacity-50 flex items-center gap-3 active:scale-95 text-sm"
                    >
                      {isAnalyzingDump ? (
                        <><Loader2 className="w-5 h-5 animate-spin" /> Analyzing Dump...</>
                      ) : (
                        <><Sparkles className="w-5 h-5" /> Extract Post Gold</>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {brainDumpResults.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-5 duration-700">
                  {brainDumpResults.map((post, idx) => (
                    <motion.div
                      key={idx}
                      whileHover={{ y: -8 }}
                      className="flex flex-col bg-white rounded-3xl p-8 border border-slate-100 shadow-sm hover:shadow-2xl hover:border-blue-200 transition-all relative group"
                    >
                      <div className="flex items-center justify-between mb-6">
                        <div className="space-y-1">
                          <span className="text-[10px] font-black text-[#0077B5] uppercase tracking-widest bg-blue-50 px-3 py-1.5 rounded-full">{post.style}</span>
                          <p className="text-xs text-slate-400 font-medium italic mt-2">"{post.hook}"</p>
                        </div>
                        <button
                          onClick={() => useBrainDumpPost(post.content)}
                          className="p-3 bg-slate-50 text-slate-600 rounded-2xl hover:bg-[#0077B5] hover:text-white transition-all shadow-sm"
                          title="Copy to Composer"
                        >
                          <ArrowRight className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="flex-1">
                        <p className="text-slate-700 text-base leading-relaxed whitespace-pre-wrap">{post.content}</p>
                      </div>
                      <div className="pt-6 mt-6 border-t border-slate-50 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-all">
                        <span className="text-[10px] font-bold text-slate-300">OPTION {idx + 1}</span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(post.content);
                            addToast("Content copied to clipboard", "success");
                          }}
                          className="flex items-center gap-2 text-[11px] font-black text-slate-400 hover:text-[#0077B5] transition-colors uppercase tracking-widest"
                        >
                          <Copy className="w-3.5 h-3.5" /> Copy Text
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isEditModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={handleEditClose}
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl p-8 overflow-hidden"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-slate-900">Edit Scheduled Post</h3>
                  <button onClick={handleEditClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Content</label>
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full h-48 p-4 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:border-[#0077B5] text-sm resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Scheduled Time</label>
                    <div className="relative">
                      <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="datetime-local"
                        value={editTime}
                        onChange={(e) => setEditTime(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-[#0077B5] text-sm"
                      />
                    </div>
                    {/* Reschedule Notice */}
                    {editTime && editingPost && new Date(editTime).getTime() > new Date().getTime() && (editingPost.status === "posted" || editingPost.status === "failed" || editingPost.is_draft) && (
                      <div className="mt-2 p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                        <RefreshCw className="w-4 h-4 text-emerald-500 animate-spin-slow" />
                        <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-tight">Post will be scheduled successfully</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Media ({mediaItems.length})</label>
                    <div className="flex flex-wrap gap-4 mb-4">
                      {mediaItems.map((item, idx) => (
                        <div key={idx} className="relative w-32 h-32 rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100">
                          {item.startsWith("data:video/") ? (
                            <div className="w-full h-full flex items-center justify-center bg-slate-800">
                              <Video className="w-8 h-8 text-white/50" />
                            </div>
                          ) : (
                            <img src={item} className="w-full h-full object-cover" alt="" />
                          )}
                          <button
                            onClick={() => setMediaItems(prev => prev.filter((_, i) => i !== idx))}
                            className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full shadow-sm hover:bg-red-600 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <input
                      type="file"
                      id="editImgMulti"
                      className="hidden"
                      accept="image/*,video/*"
                      multiple
                      onChange={handleMultipleMediaChange}
                    />
                    <label
                      htmlFor="editImgMulti"
                      className="w-full p-3 rounded-xl border-2 border-dashed border-slate-200 hover:border-[#0077B5] hover:bg-slate-50 text-slate-500 text-sm font-medium flex items-center justify-center gap-2 cursor-pointer transition-all"
                    >
                      <ImageIcon className="w-5 h-5" />
                      Add More Media
                    </label>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={handleEditClose}
                      className="flex-1 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveEdit}
                      disabled={loading}
                      className="flex-1 py-3 rounded-xl font-bold text-white bg-[#0077B5] hover:bg-[#004182] transition-colors shadow-lg shadow-[#0077B5]/20 disabled:opacity-50"
                    >
                      {loading ? "Saving..." : "Save and Schedule"}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
          {isCalendarActionOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsCalendarActionOpen(false)}
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl p-8 overflow-hidden"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-slate-900">Schedule Content</h3>
                  <button onClick={() => setIsCalendarActionOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>

                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl mb-8">
                  <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex flex-col items-center justify-center border border-slate-100">
                    <span className="text-[10px] font-black text-[#0077B5] uppercase leading-none">{selectedCalendarDate?.toLocaleDateString([], { month: 'short' })}</span>
                    <span className="text-lg font-black text-slate-900 leading-none">{selectedCalendarDate?.getDate()}</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-700">{selectedCalendarDate?.toLocaleDateString([], { weekday: 'long' })}</p>
                    <p className="text-xs text-slate-400">Choose how you want to schedule</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={() => {
                      const d = selectedCalendarDate;
                      if (d) {
                        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T10:00`;
                        setScheduleTime(dateStr);
                      }
                      setCurrentView("ailab");
                      setIsCalendarActionOpen(false);
                    }}
                    className="w-full p-4 rounded-2xl border border-slate-100 hover:border-[#0077B5] hover:bg-blue-50/50 flex items-center gap-4 transition-all group"
                  >
                    <div className="p-3 bg-blue-50 text-[#0077B5] rounded-xl group-hover:bg-[#0077B5] group-hover:text-white transition-all">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold text-slate-700">AI Post Generator</p>
                      <p className="text-xs text-slate-400">Let the AI craft a perfect post for you</p>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      const d = selectedCalendarDate;
                      if (d) {
                        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T10:00`;
                        setScheduleTime(dateStr);
                      }
                      setCurrentView("composer");
                      setIsCalendarActionOpen(false);
                    }}
                    className="w-full p-4 rounded-2xl border border-slate-100 hover:border-emerald-500 hover:bg-emerald-50/50 flex items-center gap-4 transition-all group"
                  >
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl group-hover:bg-emerald-500 group-hover:text-white transition-all">
                      <Plus className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold text-slate-700">Write Manually</p>
                      <p className="text-xs text-slate-400">Compose and format the post yourself</p>
                    </div>
                  </button>

                  <div className="relative py-4">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
                    <div className="relative flex justify-center"><span className="bg-white px-3 text-[10px] font-black text-slate-300 uppercase tracking-widest">OR SELECT DRAFT</span></div>
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-2 pr-2 scrollbar-thin">
                    {posts.filter(p => p.is_draft).length > 0 ? (
                      posts.filter(p => p.is_draft).map(post => (
                        <button
                          key={post.id}
                          onClick={async () => {
                            if (!selectedCalendarDate) return;
                            setLoading(true);
                            try {
                              const res = await fetch(`/api/posts/${post.id}`, {
                                method: "PUT",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  scheduled_at: new Date(selectedCalendarDate.setHours(10, 0, 0, 0)).toISOString(),
                                  is_draft: 0,
                                  status: "pending"
                                })
                              });
                              if (res.ok) {
                                addToast("Draft scheduled successfully!", "success");
                                fetchPosts();
                                setIsCalendarActionOpen(false);
                              }
                            } catch (e) { console.error(e); }
                            finally { setLoading(false); }
                          }}
                          className="w-full p-3 rounded-xl border border-slate-50 hover:bg-slate-50 text-left transition-all"
                        >
                          <p className="text-xs font-medium text-slate-700 line-clamp-1">{post.content}</p>
                          <p className="text-[9px] font-bold text-[#0077B5] uppercase mt-1">Schedule this draft</p>
                        </button>
                      ))
                    ) : (
                      <p className="text-center py-4 text-[10px] font-bold text-slate-300 uppercase tracking-widest">No drafts available</p>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {previewMedia && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-8">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setPreviewMedia(null)}
                className="absolute inset-0 bg-slate-950/95 backdrop-blur-xl"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="relative max-w-7xl w-full h-full flex items-center justify-center"
              >
                <button
                  onClick={() => setPreviewMedia(null)}
                  className="absolute top-0 right-0 p-4 text-white/40 hover:text-white transition-colors"
                >
                  <X className="w-10 h-10" />
                </button>
                {previewMedia.startsWith("data:video/") ? (
                  <video src={previewMedia} controls autoPlay className="max-w-full max-h-full rounded-2xl shadow-2xl" />
                ) : (
                  <img src={previewMedia} className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl" alt="Wide Preview" />
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main >
    </div >
  );
}
