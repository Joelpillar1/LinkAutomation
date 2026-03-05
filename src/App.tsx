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
  Copy
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { generateLinkedInPost, generateCommentReply, analyzeBrainDump } from "./lib/openai";

// --- Utils ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
type View = "dashboard" | "scheduler" | "inbox" | "ailab" | "composer" | "analytics" | "settings" | "braindump";

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

export default function App() {
  const [currentView, setCurrentView] = useState<View>("dashboard");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [serverStatus, setServerStatus] = useState<"online" | "offline" | "checking">("checking");
  const [user, setUser] = useState<any>(null);
  const [livePosts, setLivePosts] = useState<any[]>([]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // AI Lab State
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
  const [mediaItems, setMediaItems] = useState<string[]>([]);
  const [videoThumbnail, setVideoThumbnail] = useState<string | null>(null);
  const [previewMedia, setPreviewMedia] = useState<string | null>(null);

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
    setEditTime(post.scheduled_at ? new Date(post.scheduled_at).toISOString().slice(0, 16) : "");
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
      const res = await fetch(`/api/posts/${editingPost.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: editContent,
          scheduled_at: editTime ? new Date(editTime).toISOString() : null,
          image_url: mediaItems[0] || null,
          thumbnail_url: videoThumbnail,
          media_urls: JSON.stringify(mediaItems.slice(1)),
          is_draft: editingPost.is_draft,
          category: editingPost.category
        }),
      });
      if (res.ok) {
        addToast("Post updated successfully", "success");
        handleEditClose();
        fetchPosts();
      } else {
        throw new Error("Failed to update post");
      }
    } catch (err: any) {
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
    try {
      const res = await fetch("/api/posts");
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = await res.json();
      setPosts(data);
    } catch (err) {
      console.error("Fetch Posts Error:", err);
    }
  };

  const fetchAnalytics = async () => {
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
    try {
      const res = await fetch("/api/linkedin/posts");
      if (res.ok) {
        const data = await res.json();
        setLivePosts(data);
      } else {
        const data = await res.json();
        console.error("Live Posts Fetch Failed:", data);
        // We don't toast here to avoid spamming, but we log
      }
    } catch (err) {
      console.error("Live Posts Error:", err);
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
      let content = await generateLinkedInPost(topic);
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
          <div className="w-16 h-16 bg-[#0077B5] rounded-xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-[#0077B5]/30">
            <Linkedin className="text-white w-10 h-10" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Welcome to LinkAutomate</h1>
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
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 bg-[#0077B5] rounded-lg flex-shrink-0 flex items-center justify-center">
              <Linkedin className="text-white w-5 h-5" />
            </div>
            {!isSidebarCollapsed && (
              <span className="text-xl font-bold tracking-tight text-[#0077B5] truncate animate-in fade-in duration-300">
                LinkAutomate
              </span>
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

        <nav className={cn("flex-1 px-4 space-y-2 mt-4 overflow-hidden", isSidebarCollapsed ? "px-2" : "px-4")}>
          <SidebarItem icon={LayoutDashboard} label="Dashboard" active={currentView === "dashboard"} onClick={() => setCurrentView("dashboard")} collapsed={isSidebarCollapsed} />
          <SidebarItem icon={Calendar} label="Scheduler" active={currentView === "scheduler"} onClick={() => setCurrentView("scheduler")} collapsed={isSidebarCollapsed} />
          <SidebarItem icon={Sparkles} label="AI Lab" active={currentView === "ailab"} onClick={() => setCurrentView("ailab")} collapsed={isSidebarCollapsed} />
          <SidebarItem icon={Plus} label="New Post" active={currentView === "composer"} onClick={() => setCurrentView("composer")} collapsed={isSidebarCollapsed} />
          <SidebarItem icon={Brain} label="Brain Dump" active={currentView === "braindump"} onClick={() => setCurrentView("braindump")} collapsed={isSidebarCollapsed} />
          <SidebarItem icon={BarChart3} label="Analytics" active={currentView === "analytics"} onClick={() => setCurrentView("analytics")} collapsed={isSidebarCollapsed} />
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
            <h2 className="text-2xl font-bold text-slate-900 capitalize">{currentView}</h2>
            <p className="text-slate-500">Welcome back, {user?.name || "Joel"}!</p>
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
                  {[
                    { label: "Profile Views", value: analytics?.profileViews || "---" },
                    { label: "Post Impressions", value: analytics?.postImpressions || "---" },
                    { label: "New Connections", value: analytics?.newConnections || "---" }
                  ].map((stat, i) => (
                    <div key={i} className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <p className="text-slate-500 text-xs font-medium mb-1">{stat.label}</p>
                      <h3 className="text-2xl font-bold">{stat.value}</h3>
                    </div>
                  ))}
                </div>
                {(analytics?.totalLikes > 0 || analytics?.totalComments > 0) && (
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
                {analytics?.warning && (
                  <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-center gap-2 text-amber-700 text-xs font-medium">
                    <Info className="w-4 h-4" />
                    {analytics.warning}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <h4 className="font-bold flex items-center gap-2 mb-4">
                    <Linkedin className="w-5 h-5 text-[#0077B5]" />
                    Real-time Activity
                  </h4>
                  <div className="space-y-4">
                    {livePosts.length > 0 ? livePosts.map((post, idx) => (
                      <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                        <p className="text-sm text-slate-700 line-clamp-2 mb-3">
                          {post.text?.text || post.commentary || "Shared a post"}
                        </p>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                            <ThumbsUp className="w-3.5 h-3.5" />
                            {post.stats?.likes || 0}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                            <MessageCircle className="w-3.5 h-3.5" />
                            {post.stats?.comments || 0}
                          </div>
                        </div>
                      </div>
                    )) : (
                      <p className="text-center py-12 text-slate-400 text-sm">No recent activity detected.</p>
                    )}
                  </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <h4 className="font-bold mb-4">Quick Actions</h4>
                  <div className="space-y-3">
                    <button onClick={() => setCurrentView("ailab")} className="w-full p-3 rounded-xl border border-slate-100 hover:bg-slate-50 text-sm font-medium flex items-center gap-3">
                      <Sparkles className="w-4 h-4 text-[#0077B5]" /> AI Lab
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

                <div className="space-y-3">
                  {posts
                    .filter(p => {
                      if (queueFilter === "all") return true;
                      if (queueFilter === "drafts") return p.is_draft;
                      if (queueFilter === "scheduled") return !p.is_draft && p.status === "pending";
                      if (queueFilter === "posted") return !p.is_draft && p.status === "posted";
                      return true;
                    })
                    .filter(p => p.content.toLowerCase().includes(searchQuery.toLowerCase()))
                    .length > 0 ? (
                    posts
                      .filter(p => {
                        if (queueFilter === "all") return true;
                        if (queueFilter === "drafts") return p.is_draft;
                        if (queueFilter === "scheduled") return !p.is_draft && p.status === "pending";
                        if (queueFilter === "posted") return !p.is_draft && p.status === "posted";
                        return true;
                      })
                      .filter(p => p.content.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map(post => (
                        <div key={post.id} className="p-5 rounded-xl border border-slate-100 bg-slate-50 hover:bg-white hover:shadow-md transition-all group">
                          <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                {post.is_draft ? (
                                  <span className="px-2 py-0.5 bg-slate-200 text-slate-600 text-[10px] font-bold rounded-md uppercase">Draft</span>
                                ) : (
                                  <span className={cn(
                                    "px-2 py-0.5 text-[10px] font-bold rounded-md uppercase",
                                    post.status === "posted" ? "bg-emerald-100 text-emerald-700" :
                                      post.status === "failed" ? "bg-red-100 text-red-700" :
                                        "bg-blue-100 text-blue-700"
                                  )}>
                                    {post.status}
                                  </span>
                                )}
                                {post.scheduled_at && !post.is_draft && (
                                  <span className="flex items-center gap-1 text-[11px] font-medium text-slate-400">
                                    <Clock className="w-3 h-3" />
                                    {new Date(post.scheduled_at).toLocaleString()}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-slate-700 line-clamp-2 leading-relaxed">{post.content}</p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0 flex-wrap md:flex-nowrap">
                              {post.status !== "posted" && (
                                <button
                                  onClick={() => handlePublishPost(post.id)}
                                  className="p-2 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all flex items-center gap-1.5 text-xs font-bold"
                                  title="Post Now"
                                  disabled={loading}
                                >
                                  <Send className="w-3.5 h-3.5" />
                                  Post Now
                                </button>
                              )}
                              <button
                                onClick={() => handleEditOpen(post)}
                                className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-[#0077B5] hover:text-white transition-all flex items-center gap-1.5 text-xs font-bold"
                                title="Edit Post"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeletePost(post.id)}
                                className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-red-500 hover:text-white transition-all flex items-center gap-1.5 text-xs font-bold"
                                title="Delete Post"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                  ) : (
                    <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      <Calendar className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                      <p className="text-slate-400 text-sm font-medium">No posts found in this queue.</p>
                      <button onClick={() => setCurrentView("ailab")} className="mt-4 text-[#0077B5] text-sm font-bold hover:underline">Create your first post</button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {currentView === "ailab" && (
            <motion.div key="ailab" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="max-w-3xl mx-auto space-y-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold mb-4">AI Lab</h3>
                <div className="space-y-4">
                  <input type="text" value={topic} onChange={e => setTopic(e.target.value)} placeholder="Topic..." className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-[#0077B5]" />
                  <button onClick={handleGeneratePost} disabled={loading} className="w-full bg-[#0077B5] text-white py-3 rounded-xl font-bold disabled:opacity-50 hover:bg-[#004182] transition-colors">
                    {loading ? "Generating..." : "Generate Post Content"}
                  </button>
                </div>
              </div>
              {generatedContent && (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
                  <textarea value={generatedContent} onChange={e => setGeneratedContent(e.target.value)} className="w-full h-64 p-4 rounded-xl bg-slate-50 border border-slate-100 text-sm outline-none resize-none focus:border-[#0077B5]" />

                  {selectedImage && (
                    <div className="space-y-2">
                      <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-slate-200">
                        {selectedImage.startsWith("data:video/") ? (
                          <video src={selectedImage} controls className="w-full h-full object-cover" />
                        ) : (
                          <img src={selectedImage} className="w-full h-full object-cover" alt="Preview" />
                        )}
                        <button onClick={() => setSelectedImage(null)} className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-full text-red-500 shadow-sm hover:bg-white transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      {selectedImage.startsWith("data:video/") && (
                        <div className="flex items-center gap-4">
                          <input type="file" id="labThumb" className="hidden" accept="image/*" onChange={handleThumbnailChange} />
                          <label htmlFor="labThumb" className="flex-1 p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs font-bold text-slate-500 hover:bg-slate-100 cursor-pointer flex items-center justify-center gap-2">
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
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Carousel Items</span>
                        <button onClick={() => setMediaItems([])} className="text-[10px] font-bold text-red-400 hover:text-red-500 transition-colors flex items-center gap-1">
                          <Trash2 className="w-3 h-3" /> Clear All
                        </button>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {mediaItems.map((item, idx) => (
                          <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-slate-100 group shadow-sm">
                            {item.startsWith("data:video/") ? <video src={item} className="w-full h-full object-cover" /> : <img src={item} className="w-full h-full object-cover" alt="" />}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <button
                                onClick={() => setMediaItems(prev => prev.filter((_, i) => i !== idx))}
                                className="p-1.5 bg-red-500 text-white rounded-lg shadow-lg hover:bg-red-600 transition-colors"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-4">
                    <input type="file" id="labImg" className="hidden" accept="image/*,video/*" multiple onChange={handleMultipleMediaChange} />
                    <label htmlFor="labImg" className="flex-1 p-3 rounded-xl border-2 border-dashed border-slate-200 hover:border-[#0077B5] hover:bg-slate-50 text-slate-500 text-sm font-medium flex items-center justify-center gap-2 cursor-pointer transition-all">
                      <ImageIcon className="w-5 h-5" />
                      Add Media (Images/Videos)
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input type="datetime-local" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)} className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-sm focus:border-[#0077B5] outline-none" />
                    </div>
                    <button onClick={handlePostNow} disabled={loading} className="bg-[#0077B5] text-white rounded-xl font-bold hover:bg-[#004182] transition-colors flex items-center justify-center gap-2">
                      <Send className="w-4 h-4" />
                      Post Now
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <button onClick={handleSaveDraft} disabled={loading} className="bg-slate-100 text-slate-600 py-3 rounded-xl font-bold hover:bg-slate-200 transition-colors">Save as Draft</button>
                    <button onClick={schedulePost} disabled={loading} className="bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors">Schedule Post</button>
                  </div>
                </div>
              )}
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
                        className="flex items-center gap-2 hover:text-red-500 transition-colors text-sm font-bold"
                      >
                        <Trash2 className="w-4 h-4" /> Clear All
                      </button>
                      <button onClick={() => setCurrentView("ailab")} className="flex items-center gap-2 hover:text-[#0077B5] transition-colors text-sm font-bold">
                        <Sparkles className="w-4 h-4" /> AI Prompt
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:flex-none min-w-[200px]">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="datetime-local"
                        value={scheduleTime}
                        onChange={e => setScheduleTime(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 text-sm focus:border-[#0077B5] outline-none bg-slate-50"
                      />
                    </div>
                    <button onClick={handleSaveDraft} disabled={loading} className="px-6 py-3 rounded-2xl font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all text-sm flex items-center gap-2">
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                      {loading ? "Saving..." : "Save Draft"}
                    </button>
                    <button onClick={schedulePost} disabled={loading} className="px-6 py-3 rounded-2xl font-bold border-2 border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white transition-all text-sm flex items-center gap-2">
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                      {loading ? "Scheduling..." : "Schedule"}
                    </button>
                    <button onClick={handlePostNow} disabled={loading} className="bg-[#0077B5] text-white px-8 py-3 rounded-2xl font-bold hover:bg-[#004182] transition-all flex items-center gap-2 shadow-lg shadow-[#0077B5]/20 text-sm">
                      {loading ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Send className="w-4 h-4" />}
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
                      {loading ? "Saving..." : "Save Changes"}
                    </button>
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
      </main>
    </div>
  );
}
