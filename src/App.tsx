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
  FileText,
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
  RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { generateLinkedInPost, generateCommentReply, generatePostDesign } from "./lib/gemini";

// --- Utils ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
type View = "dashboard" | "scheduler" | "inbox" | "ailab" | "composer" | "analytics" | "settings";

interface Post {
  id: string;
  content: string;
  scheduled_at: string;
  status: "pending" | "posted" | "failed";
  image_url?: string;
  is_recurring?: boolean;
  recurrence_pattern?: "daily" | "weekly" | "monthly";
  category?: string;
  is_draft?: boolean;
}

interface DesignData {
  title: string;
  body: string[];
  footer: string;
  colorScheme: string;
}

// --- Components ---

const SidebarItem = ({ 
  icon: Icon, 
  label, 
  active, 
  onClick 
}: { 
  icon: any, 
  label: string, 
  active: boolean, 
  onClick: () => void 
}) => (
  <button
    onClick={onClick}
    className={cn(
      "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group",
      active 
        ? "bg-[#0077B5] text-white shadow-lg shadow-[#0077B5]/20" 
        : "text-slate-600 hover:bg-slate-100"
    )}
  >
    <Icon className={cn("w-5 h-5", active ? "text-white" : "text-slate-400 group-hover:text-[#0077B5]")} />
    <span className="font-medium">{label}</span>
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

  // AI Lab State
  const [topic, setTopic] = useState("");
  const [generatedContent, setGeneratedContent] = useState("");
  const [designData, setDesignData] = useState<DesignData | null>(null);
  const [scheduleTime, setScheduleTime] = useState(new Date(Date.now() + 3600000).toISOString().slice(0, 16));
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrencePattern, setRecurrencePattern] = useState<"daily" | "weekly" | "monthly">("weekly");
  const [category, setCategory] = useState("General");
  const [isDraft, setIsDraft] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);
  const [userProfileUrl, setUserProfileUrl] = useState("");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [toasts, setToasts] = useState<{ id: string; message: string; type: "success" | "error" | "info" }[]>([]);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [queueFilter, setQueueFilter] = useState<"all" | "scheduled" | "drafts">("all");

  const addToast = (message: string, type: "success" | "error" | "info" = "info") => {
    const id = Math.random().toString(36).substring(7);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
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
      // Don't alert here to avoid annoying the user on every load
    }
  };

  const fetchAnalytics = async () => {
    try {
      const res = await fetch("/api/analytics");
      const data = await res.json();
      if (res.ok) {
        setAnalytics(data);
      } else {
        // Only show error if they actually have a profile URL set
        if (userProfileUrl) {
          addToast(data.error || "Failed to fetch real-time analytics.", "error");
        }
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
      const contentType = res.headers.get("content-type");
      
      let data;
      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      } else {
        const text = await res.text();
        console.error("Live Posts Fetch Non-JSON Response:", text);
        data = { error: "Unexpected response from server" };
      }

      if (res.ok) {
        setLivePosts(data);
      } else {
        console.error("Live Posts Fetch Error:", data);
        // Only show toast if they are logged in and it's a real error
        if (isLoggedIn && res.status !== 401) {
          if (res.status === 403) {
            // Don't spam the user with permission errors for optional features
            console.warn("LinkedIn 'r_member_social' permission missing. Live activity disabled.");
          } else {
            addToast(data.error || "Failed to fetch LinkedIn activity.", "error");
          }
        }
      }
    } catch (err) {
      console.error("Live Posts Error:", err);
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
      
      // Extra safety to strip markdown bolding, em-dashes, and emojis
      if (content) {
        content = content
          .replace(/\*\*/g, "")
          .replace(/—/g, "-")
          .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, "");
      }
      
      setGeneratedContent(content || "");
      const design = await generatePostDesign(content || "");
      setDesignData(design);
    } catch (err) {
      console.error("Generation Error:", err);
      addToast("Failed to generate content. Please check your connection.", "error");
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = async () => {
    const element = document.getElementById("design-canvas");
    if (!element) return;
    const canvas = await html2canvas(element, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save("linkedin-post-design.pdf");
  };

  const schedulePost = async () => {
    if (!generatedContent) return;
    setLoading(true);
    try {
      // Capture design as image
      const element = document.getElementById("design-canvas");
      let base64Image = null;
      if (element) {
        const canvas = await html2canvas(element, { scale: 2 });
        base64Image = canvas.toDataURL("image/png");
      }

      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: generatedContent,
          scheduled_at: isDraft ? null : new Date(scheduleTime).toISOString(),
          image_url: base64Image,
          is_recurring: isRecurring,
          recurrence_pattern: recurrencePattern,
          category: category,
          is_draft: isDraft
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to schedule post");
      }
      fetchPosts();
      addToast("Post scheduled successfully!", "success");
      // Reset states
      setIsDraft(false);
      setIsRecurring(false);
      setCategory("General");
    } catch (err: any) {
      console.error(err);
      addToast(err.message || "Failed to schedule post. Are you logged in?", "error");
    } finally {
      setLoading(false);
    }
  };

  const handlePostNow = async () => {
    if (!generatedContent) return;
    setLoading(true);
    try {
      // Capture design as image
      const element = document.getElementById("design-canvas");
      let base64Image = null;
      if (element) {
        const canvas = await html2canvas(element, { scale: 2 });
        base64Image = canvas.toDataURL("image/png");
      }

      // Post immediately by setting schedule time to now and adding immediate flag
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: generatedContent,
          scheduled_at: new Date().toISOString(),
          immediate: true,
          image_url: base64Image,
          category: category
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to post now");
      }
      fetchPosts();
      addToast("Post published successfully with image!", "success");
    } catch (err: any) {
      console.error(err);
      addToast(err.message || "Failed to post. Are you logged in?", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePost = async (id: string) => {
    if (!confirm("Are you sure you want to delete this scheduled post?")) return;
    try {
      const res = await fetch(`/api/posts/${id}`, { method: "DELETE" });
      if (res.ok) {
        addToast("Post deleted successfully", "success");
        fetchPosts();
      } else {
        throw new Error("Failed to delete post");
      }
    } catch (err: any) {
      addToast(err.message, "error");
    }
  };

  const handleUpdatePost = async () => {
    if (!editingPost) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/posts/${editingPost.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: editingPost.content,
          scheduled_at: editingPost.is_draft ? null : editingPost.scheduled_at,
          is_recurring: editingPost.is_recurring,
          recurrence_pattern: editingPost.recurrence_pattern,
          category: editingPost.category,
          is_draft: editingPost.is_draft
        }),
      });
      if (res.ok) {
        addToast("Post updated successfully", "success");
        setEditingPost(null);
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
          <p className="text-slate-500 mb-8">Connect your LinkedIn account to start automating your social presence.</p>
          <button
            onClick={handleLogin}
            className="w-full bg-[#0077B5] text-white py-4 rounded-xl font-semibold hover:bg-[#004182] transition-colors flex items-center justify-center gap-2 shadow-lg shadow-[#0077B5]/20"
          >
            <Linkedin className="w-5 h-5" />
            Sign in with LinkedIn
          </button>
          <p className="mt-6 text-xs text-slate-400">
            By signing in, you agree to our Terms of Service and Privacy Policy.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F3F6F8] flex font-sans text-slate-900">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col fixed h-full z-20">
        <div className="p-6 flex items-center gap-2">
          <div className="w-8 h-8 bg-[#0077B5] rounded-lg flex items-center justify-center">
            <Linkedin className="text-white w-5 h-5" />
          </div>
          <span className="text-xl font-bold tracking-tight text-[#0077B5]">LinkAutomate</span>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          <SidebarItem 
            icon={LayoutDashboard} 
            label="Dashboard" 
            active={currentView === "dashboard"} 
            onClick={() => setCurrentView("dashboard")} 
          />
          <SidebarItem 
            icon={Calendar} 
            label="Scheduler" 
            active={currentView === "scheduler"} 
            onClick={() => setCurrentView("scheduler")} 
          />
          <SidebarItem 
            icon={MessageSquare} 
            label="Inbox" 
            active={currentView === "inbox"} 
            onClick={() => setCurrentView("inbox")} 
          />
          <SidebarItem 
            icon={Sparkles} 
            label="AI Lab" 
            active={currentView === "ailab"} 
            onClick={() => setCurrentView("ailab")} 
          />
          <SidebarItem 
            icon={PenSquare} 
            label="Composer" 
            active={currentView === "composer"} 
            onClick={() => setCurrentView("composer")} 
          />
          <SidebarItem 
            icon={BarChart3} 
            label="Analytics" 
            active={currentView === "analytics"} 
            onClick={() => setCurrentView("analytics")} 
          />
          <SidebarItem 
            icon={Settings} 
            label="Settings" 
            active={currentView === "settings"} 
            onClick={() => setCurrentView("settings")} 
          />
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 mb-4">
            <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden">
              <img 
                src={user?.avatar || "https://picsum.photos/seed/user/100/100"} 
                alt="Avatar" 
                referrerPolicy="no-referrer" 
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{user?.name || "Joel Pillar"}</p>
              <p className="text-xs text-slate-500 truncate">{user?.email || "Premium Member"}</p>
            </div>
          </div>
          <button 
            onClick={() => {
              setIsLoggedIn(false);
              localStorage.removeItem("linkedin_token");
              setUser(null);
            }}
            className="w-full flex items-center gap-3 px-4 py-2 text-slate-500 hover:text-red-500 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 p-8">
        {/* Toast Container */}
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
                {toast.type === "success" && <CheckCircle2 className="w-5 h-5" />}
                {toast.type === "error" && <AlertCircle className="w-5 h-5" />}
                {toast.type === "info" && <Info className="w-5 h-5" />}
                <p className="text-sm font-medium">{toast.message}</p>
                <button 
                  onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                  className="ml-auto opacity-50 hover:opacity-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <header className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 capitalize">{currentView}</h2>
            <p className="text-slate-500">Welcome back, Joel! Here's what's happening.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200 shadow-sm">
              <div className={cn(
                "w-2 h-2 rounded-full animate-pulse",
                serverStatus === "online" ? "bg-emerald-500" : serverStatus === "offline" ? "bg-red-500" : "bg-amber-500"
              )} />
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Server {serverStatus}
              </span>
            </div>
            <button 
              onClick={() => setCurrentView("ailab")}
              className="bg-[#0077B5] text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-[#004182] transition-all shadow-lg shadow-[#0077B5]/20 flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Create Post
            </button>
          </div>
        </header>

        <AnimatePresence mode="wait">
          {currentView === "dashboard" && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold">LinkedIn Analytics</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    { label: "Profile Views", value: analytics?.profileViews?.toLocaleString() || "1,284", trend: analytics?.changes?.views || "+12%", color: "blue" },
                    { label: "Post Impressions", value: analytics?.postImpressions || "45.2K", trend: analytics?.changes?.impressions || "+24%", color: "emerald" },
                    { label: "New Connections", value: analytics?.newConnections?.toLocaleString() || "156", trend: analytics?.changes?.connections || "+8%", color: "violet" },
                  ].map((stat, i) => (
                    <div key={i} className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <p className="text-slate-500 text-xs font-medium mb-1">{stat.label}</p>
                      <div className="flex items-end justify-between">
                        <h3 className="text-2xl font-bold">{stat.value}</h3>
                        <span className={cn(
                          "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                          stat.trend.startsWith("+") ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                        )}>
                          {stat.trend}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-bold flex items-center gap-2">
                      <Linkedin className="w-5 h-5 text-[#0077B5]" />
                      Live LinkedIn Activity
                    </h4>
                    <button 
                      onClick={fetchLivePosts}
                      className="text-xs font-semibold text-[#0077B5] hover:underline"
                    >
                      Refresh
                    </button>
                  </div>
                  <div className="space-y-4">
                    {livePosts.length > 0 ? livePosts.map((post, idx) => (
                      <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                        <p className="text-sm text-slate-700 line-clamp-3 mb-2">
                          {post.text?.text || post.commentary || "Shared a post"}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <ThumbsUp className="w-3 h-3" />
                            {post.likes || 0}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageCircle className="w-3 h-3" />
                            {post.comments || 0}
                          </span>
                        </div>
                      </div>
                    )) : (
                      <div className="text-center py-12 text-slate-400">
                        <p className="text-sm">No live activity found. Try posting something!</p>
                      </div>
                    )}
                  </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h4 className="font-bold mb-4">Quick Actions</h4>
                <div className="space-y-3">
                  <button className="w-full p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors flex items-center gap-3 text-sm font-medium">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-[#0077B5]">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    Generate AI Ideas
                  </button>
                  <button className="w-full p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors flex items-center gap-3 text-sm font-medium">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    Review Comments
                  </button>
                  <button className="w-full p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors flex items-center gap-3 text-sm font-medium">
                    <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center text-violet-600">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    Bulk Reply DMs
                  </button>
                </div>
              </div>
            </div>
            </motion.div>
          )}

          {currentView === "ailab" && (
            <motion.div
              key="ailab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-8"
            >
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Sparkles className="text-[#0077B5] w-5 h-5" />
                    AI Content Generator
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">What's the topic?</label>
                      <input 
                        type="text" 
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="e.g. The future of AI in marketing"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#0077B5] focus:border-transparent outline-none transition-all"
                      />
                    </div>
                    <button 
                      onClick={handleGeneratePost}
                      disabled={loading || !topic}
                      className="w-full bg-[#0077B5] text-white py-3 rounded-xl font-semibold hover:bg-[#004182] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                    >
                      {loading ? "Generating..." : "Generate Post & Design"}
                    </button>
                  </div>
                </div>

                {generatedContent && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-bold">Generated Content</h4>
                      <button 
                        onClick={() => setGeneratedContent("")}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        Clear
                      </button>
                    </div>
                    <textarea 
                      value={generatedContent}
                      onChange={(e) => setGeneratedContent(e.target.value)}
                      className="w-full h-48 p-4 rounded-xl bg-slate-50 border border-slate-100 text-slate-700 text-sm focus:ring-2 focus:ring-[#0077B5] outline-none resize-none"
                    />
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Category</label>
                        <select 
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:border-[#0077B5] transition-colors bg-white"
                        >
                          <option value="General">General</option>
                          <option value="Tech">Tech</option>
                          <option value="Business">Business</option>
                          <option value="Personal">Personal</option>
                          <option value="Marketing">Marketing</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Schedule Time</label>
                        <input 
                          type="datetime-local" 
                          value={scheduleTime}
                          onChange={(e) => setScheduleTime(e.target.value)}
                          disabled={isDraft}
                          className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:border-[#0077B5] transition-colors disabled:opacity-50"
                        />
                      </div>
                    </div>

                    <div className="mt-4 space-y-3">
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <div 
                          onClick={() => setIsDraft(!isDraft)}
                          className={cn(
                            "w-10 h-5 rounded-full transition-colors relative",
                            isDraft ? "bg-[#0077B5]" : "bg-slate-200"
                          )}
                        >
                          <div className={cn(
                            "absolute top-1 left-1 w-3 h-3 rounded-full bg-white transition-transform",
                            isDraft && "translate-x-5"
                          )} />
                        </div>
                        <span className="text-sm font-medium text-slate-600">Save as Draft (No Schedule)</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer group">
                        <div 
                          onClick={() => setIsRecurring(!isRecurring)}
                          className={cn(
                            "w-10 h-5 rounded-full transition-colors relative",
                            isRecurring ? "bg-[#0077B5]" : "bg-slate-200"
                          )}
                        >
                          <div className={cn(
                            "absolute top-1 left-1 w-3 h-3 rounded-full bg-white transition-transform",
                            isRecurring && "translate-x-5"
                          )} />
                        </div>
                        <span className="text-sm font-medium text-slate-600">Recurring Post</span>
                      </label>

                      {isRecurring && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="pl-12"
                        >
                          <select 
                            value={recurrencePattern}
                            onChange={(e) => setRecurrencePattern(e.target.value as any)}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs outline-none focus:border-[#0077B5]"
                          >
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                          </select>
                        </motion.div>
                      )}
                    </div>

                    <div className="flex gap-3 mt-6">
                      <button 
                        onClick={schedulePost}
                        disabled={loading}
                        className="flex-1 bg-slate-900 text-white py-2.5 rounded-xl font-medium hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <Calendar className="w-4 h-4" />
                        {loading ? "..." : "Queue"}
                      </button>
                      <button 
                        onClick={handlePostNow}
                        disabled={loading}
                        className="flex-1 bg-[#0077B5] text-white py-2.5 rounded-xl font-medium hover:bg-[#004182] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <Send className="w-4 h-4" />
                        {loading ? "..." : "Post Now"}
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>

              <div className="space-y-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 sticky top-8">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      <ImageIcon className="text-[#0077B5] w-5 h-5" />
                      Visual Design Preview
                    </h3>
                    {designData && (
                      <button 
                        onClick={downloadPDF}
                        className="text-[#0077B5] hover:text-[#004182] font-semibold text-sm flex items-center gap-1"
                      >
                        <Download className="w-4 h-4" />
                        Export PDF
                      </button>
                    )}
                  </div>

                  <div className="aspect-square w-full max-w-md mx-auto relative overflow-hidden rounded-xl shadow-2xl border border-[#f1f5f9] bg-white" id="design-canvas">
                    {designData ? (
                      <div style={{
                        width: "100%",
                        height: "100%",
                        padding: "40px",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        textAlign: "center",
                        backgroundColor: designData.colorScheme.toLowerCase().includes("blue") ? "#0077B5" : 
                                       designData.colorScheme.toLowerCase().includes("dark") ? "#0f172a" : "#ffffff",
                        color: designData.colorScheme.toLowerCase().includes("white") ? "#0f172a" : "#ffffff"
                      }}>
                        <div className="space-y-6">
                          <Linkedin 
                            style={{ width: "40px", height: "40px", margin: "0 auto" }} 
                            color={designData.colorScheme.toLowerCase().includes("white") ? "#0077B5" : "#ffffff"} 
                          />
                          <h2 style={{ fontSize: "30px", fontWeight: "900", letterSpacing: "-0.025em", lineHeight: "1.25" }}>
                            {designData.title}
                          </h2>
                          <div style={{ height: "4px", width: "80px", backgroundColor: "currentColor", margin: "0 auto", opacity: 0.3 }} />
                          <ul style={{ textAlign: "left", maxWidth: "320px", margin: "0 auto", listStyle: "none", padding: 0 }} className="space-y-4">
                            {designData.body.map((point, i) => (
                              <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: "12px", fontSize: "18px", fontWeight: "500" }}>
                                <span style={{ marginTop: "6px", width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "currentColor", flexShrink: 0 }} />
                                {point}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div style={{ paddingTop: "32px", borderTop: "1px solid currentColor", opacity: 0.2 }}>
                          <p style={{ fontSize: "14px", fontWeight: "700", letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.8 }}>
                            {designData.footer}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#94a3b8", backgroundColor: "#f8fafc" }}>
                        <ImageIcon style={{ width: "64px", height: "64px", marginBottom: "16px", opacity: 0.1 }} />
                        <p style={{ fontSize: "14px" }}>Generate content to see the design</p>
                      </div>
                    )}
                  </div>
                  
                  <p className="mt-4 text-xs text-center text-slate-400">
                    High-resolution export available in PDF format.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {currentView === "inbox" && (
            <motion.div
              key="inbox"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex h-[calc(100vh-200px)]"
            >
              <div className="w-80 border-r border-slate-100 flex flex-col">
                <div className="p-4 border-b border-slate-100">
                  <input 
                    type="text" 
                    placeholder="Search messages..."
                    className="w-full px-4 py-2 rounded-lg bg-slate-50 border-none text-sm outline-none"
                  />
                </div>
                <div className="flex-1 overflow-y-auto">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className={cn(
                      "p-4 flex items-center gap-3 cursor-pointer hover:bg-slate-50 transition-colors",
                      i === 1 ? "bg-blue-50/50 border-l-4 border-[#0077B5]" : ""
                    )}>
                      <div className="w-12 h-12 rounded-full bg-slate-200 flex-shrink-0">
                        <img src={`https://picsum.photos/seed/person${i}/100/100`} alt="Avatar" className="rounded-full" referrerPolicy="no-referrer" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-0.5">
                          <p className="font-bold text-sm truncate">Sarah Jenkins</p>
                          <span className="text-[10px] text-slate-400">2h ago</span>
                        </div>
                        <p className="text-xs text-slate-500 truncate">Hey Joel, I saw your latest post about AI...</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex-1 flex flex-col bg-slate-50/30">
                <div className="p-4 bg-white border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-200">
                      <img src="https://picsum.photos/seed/person1/100/100" alt="Avatar" className="rounded-full" referrerPolicy="no-referrer" />
                    </div>
                    <div>
                      <p className="font-bold text-sm">Sarah Jenkins</p>
                      <p className="text-[10px] text-emerald-500 font-medium">Online</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
                      <Sparkles className="w-5 h-5" />
                    </button>
                    <button className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
                      <MoreHorizontal className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <div className="flex-1 p-6 space-y-4 overflow-y-auto">
                  <div className="flex justify-start">
                    <div className="bg-white p-3 rounded-2xl rounded-tl-none shadow-sm border border-slate-100 max-w-md">
                      <p className="text-sm">Hey Joel, I saw your latest post about AI automation. Really interesting stuff! Do you have any tips for small teams?</p>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <div className="bg-[#0077B5] text-white p-3 rounded-2xl rounded-tr-none shadow-md max-w-md">
                      <p className="text-sm">Hi Sarah! Thanks for reaching out. For small teams, I'd recommend starting with content batching and using tools like LinkAutomate to handle the scheduling.</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-white border-t border-slate-100">
                  <div className="flex items-center gap-3">
                    <button className="p-2 text-slate-400 hover:text-[#0077B5] transition-colors">
                      <Plus className="w-6 h-6" />
                    </button>
                    <div className="flex-1 relative">
                      <input 
                        type="text" 
                        placeholder="Type a message..."
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 border-none text-sm outline-none pr-12"
                      />
                      <button className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-[#0077B5]">
                        <Sparkles className="w-4 h-4" />
                      </button>
                    </div>
                    <button className="p-3 bg-[#0077B5] text-white rounded-xl hover:bg-[#004182] transition-colors">
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {currentView === "scheduler" && (
            <motion.div
              key="scheduler"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Edit Modal */}
              <AnimatePresence>
                {editingPost && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
                  >
                    <motion.div 
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.9, opacity: 0 }}
                      className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
                    >
                      <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="text-lg font-bold">Edit Scheduled Post</h3>
                        <button onClick={() => setEditingPost(null)} className="text-slate-400 hover:text-slate-600">
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="p-6 space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Content</label>
                          <textarea 
                            value={editingPost.content}
                            onChange={(e) => setEditingPost({ ...editingPost, content: e.target.value })}
                            className="w-full h-32 p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#0077B5] outline-none resize-none text-sm"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                            <select 
                              value={editingPost.category || "General"}
                              onChange={(e) => setEditingPost({ ...editingPost, category: e.target.value })}
                              className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:border-[#0077B5] bg-white"
                            >
                              <option value="General">General</option>
                              <option value="Tech">Tech</option>
                              <option value="Business">Business</option>
                              <option value="Personal">Personal</option>
                              <option value="Marketing">Marketing</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Schedule Time</label>
                            <input 
                              type="datetime-local" 
                              value={editingPost.scheduled_at ? new Date(new Date(editingPost.scheduled_at).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ""}
                              onChange={(e) => setEditingPost({ ...editingPost, scheduled_at: new Date(e.target.value).toISOString(), is_draft: false })}
                              disabled={editingPost.is_draft}
                              className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:border-[#0077B5] disabled:opacity-50"
                            />
                          </div>
                        </div>

                        <div className="space-y-3 pt-2">
                          <label className="flex items-center gap-2 cursor-pointer group">
                            <div 
                              onClick={() => setEditingPost({ ...editingPost, is_draft: !editingPost.is_draft, scheduled_at: !editingPost.is_draft ? "" : editingPost.scheduled_at })}
                              className={cn(
                                "w-10 h-5 rounded-full transition-colors relative",
                                editingPost.is_draft ? "bg-[#0077B5]" : "bg-slate-200"
                              )}
                            >
                              <div className={cn(
                                "absolute top-1 left-1 w-3 h-3 rounded-full bg-white transition-transform",
                                editingPost.is_draft && "translate-x-5"
                              )} />
                            </div>
                            <span className="text-sm font-medium text-slate-600">Save as Draft (No Schedule)</span>
                          </label>

                          <label className="flex items-center gap-2 cursor-pointer group">
                            <div 
                              onClick={() => setEditingPost({ ...editingPost, is_recurring: !editingPost.is_recurring })}
                              className={cn(
                                "w-10 h-5 rounded-full transition-colors relative",
                                editingPost.is_recurring ? "bg-[#0077B5]" : "bg-slate-200"
                              )}
                            >
                              <div className={cn(
                                "absolute top-1 left-1 w-3 h-3 rounded-full bg-white transition-transform",
                                editingPost.is_recurring && "translate-x-5"
                              )} />
                            </div>
                            <span className="text-sm font-medium text-slate-600">Recurring Post</span>
                          </label>

                          {editingPost.is_recurring && (
                            <div className="pl-12">
                              <select 
                                value={editingPost.recurrence_pattern || "weekly"}
                                onChange={(e) => setEditingPost({ ...editingPost, recurrence_pattern: e.target.value as any })}
                                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs outline-none focus:border-[#0077B5]"
                              >
                                <option value="daily">Daily</option>
                                <option value="weekly">Weekly</option>
                                <option value="monthly">Monthly</option>
                              </select>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
                        <button 
                          onClick={() => setEditingPost(null)}
                          className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium hover:bg-white transition-colors"
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={handleUpdatePost}
                          disabled={loading}
                          className="flex-1 px-4 py-2 rounded-xl bg-[#0077B5] text-white text-sm font-medium hover:bg-[#004182] transition-colors disabled:opacity-50"
                        >
                          {loading ? "Saving..." : "Save Changes"}
                        </button>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold">Content Calendar</h3>
                  <div className="flex items-center gap-2">
                    <button className="px-4 py-2 rounded-lg bg-slate-50 text-slate-600 text-sm font-medium hover:bg-slate-100">Month</button>
                    <button className="px-4 py-2 rounded-lg bg-[#0077B5] text-white text-sm font-medium">Week</button>
                  </div>
                </div>
                <div className="grid grid-cols-7 gap-4 mb-4">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(day => (
                    <div key={day} className="text-center text-xs font-bold text-slate-400 uppercase tracking-wider">{day}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-4">
                  {Array.from({ length: 14 }).map((_, i) => {
                    const date = new Date();
                    date.setDate(date.getDate() + i - 3);
                    const isToday = date.toDateString() === new Date().toDateString();
                    
                    // Check if any post is scheduled for this date (excluding drafts)
                    const postsOnThisDay = posts.filter(p => !p.is_draft && p.scheduled_at && new Date(p.scheduled_at).toDateString() === date.toDateString());
                    const hasPost = postsOnThisDay.length > 0;

                    return (
                      <div key={i} className={cn(
                        "aspect-square rounded-xl border p-2 flex flex-col justify-between transition-all",
                        isToday ? "border-[#0077B5] bg-blue-50/30" : "border-slate-100 hover:border-slate-200 bg-white"
                      )}>
                        <span className={cn(
                          "text-xs font-bold",
                          isToday ? "text-[#0077B5]" : "text-slate-400"
                        )}>
                          {date.getDate()}
                        </span>
                        {hasPost && (
                          <div className="flex gap-1 flex-wrap">
                            {postsOnThisDay.slice(0, 3).map((_, idx) => (
                              <div key={idx} className="w-1.5 h-1.5 rounded-full bg-[#0077B5]" />
                            ))}
                            {postsOnThisDay.length > 3 && <span className="text-[8px] text-[#0077B5] font-bold">+</span>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                  <div className="flex items-center gap-4">
                    <h3 className="text-lg font-bold">Post Queue</h3>
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                      <button 
                        onClick={() => setQueueFilter("all")}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                          queueFilter === "all" ? "bg-white text-[#0077B5] shadow-sm" : "text-slate-500 hover:text-slate-700"
                        )}
                      >
                        All
                      </button>
                      <button 
                        onClick={() => setQueueFilter("scheduled")}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                          queueFilter === "scheduled" ? "bg-white text-[#0077B5] shadow-sm" : "text-slate-500 hover:text-slate-700"
                        )}
                      >
                        Scheduled
                      </button>
                      <button 
                        onClick={() => setQueueFilter("drafts")}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                          queueFilter === "drafts" ? "bg-white text-[#0077B5] shadow-sm" : "text-slate-500 hover:text-slate-700"
                        )}
                      >
                        Drafts
                      </button>
                    </div>
                  </div>
                  <span className="px-2 py-1 rounded-lg bg-slate-100 text-slate-500 text-xs font-bold uppercase tracking-wider self-start">
                    {posts.filter(p => p.status === 'pending').length} Pending
                  </span>
                </div>
                <div className="space-y-4">
                  {posts.filter(p => {
                    if (queueFilter === "scheduled") return !p.is_draft;
                    if (queueFilter === "drafts") return p.is_draft;
                    return true;
                  }).length > 0 ? posts.filter(p => {
                    if (queueFilter === "scheduled") return !p.is_draft;
                    if (queueFilter === "drafts") return p.is_draft;
                    return true;
                  }).map((post) => (
                    <div key={post.id} className="group flex items-center gap-6 p-4 rounded-xl border border-slate-100 hover:border-[#0077B5]/30 hover:bg-blue-50/10 transition-all">
                      <div className="w-16 h-16 rounded-lg bg-slate-100 flex-shrink-0 overflow-hidden border border-slate-200 flex items-center justify-center">
                        {post.image_url ? (
                          <img src={post.image_url} alt="Post" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <FileText className="w-6 h-6 text-slate-300" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                            {post.category || "General"}
                          </span>
                          {post.is_recurring ? (
                            <span className="px-2 py-0.5 rounded-md bg-blue-50 text-[#0077B5] text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                              <RefreshCw className="w-2.5 h-2.5" />
                              {post.recurrence_pattern}
                            </span>
                          ) : null}
                          {post.is_draft ? (
                            <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-600 text-[10px] font-bold uppercase tracking-wider">
                              Draft
                            </span>
                          ) : null}
                        </div>
                        <p className="text-sm font-medium text-slate-900 truncate mb-1">{post.content}</p>
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          {!post.is_draft && post.scheduled_at ? (
                            <>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(post.scheduled_at).toLocaleDateString()}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {new Date(post.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </>
                          ) : (
                            <span className="flex items-center gap-1">
                              <FileText className="w-3 h-3" />
                              Not scheduled
                            </span>
                          )}
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                            post.status === 'posted' ? "bg-emerald-50 text-emerald-600" : 
                            post.status === 'failed' ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"
                          )}>
                            {post.status}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => setEditingPost(post)}
                          className="p-2 text-slate-400 hover:text-[#0077B5] rounded-lg hover:bg-white shadow-sm transition-all"
                          title="Edit Post"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeletePost(post.id)}
                          className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-white shadow-sm transition-all"
                          title="Delete Post"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      {queueFilter === "drafts" ? (
                        <FileText className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                      ) : (
                        <Calendar className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                      )}
                      <p className="text-slate-400 text-sm">
                        {queueFilter === "all" && "No posts yet."}
                        {queueFilter === "scheduled" && "No scheduled posts yet."}
                        {queueFilter === "drafts" && "No drafts saved yet."}
                      </p>
                      <button 
                        onClick={() => setCurrentView("ailab")}
                        className="mt-2 text-[#0077B5] text-sm font-bold hover:underline"
                      >
                        Create your first post
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {currentView === "composer" && (
            <motion.div
              key="composer"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-8"
            >
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      <PenSquare className="text-[#0077B5] w-5 h-5" />
                      Manual Composer
                    </h3>
                    <button 
                      onClick={() => {
                        setGeneratedContent("");
                        setDesignData(null);
                      }}
                      className="text-xs font-bold text-slate-400 hover:text-red-500 transition-colors"
                    >
                      Clear All
                    </button>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Your Post Content</label>
                      <textarea 
                        value={generatedContent}
                        onChange={(e) => setGeneratedContent(e.target.value)}
                        placeholder="Write your LinkedIn post here..."
                        className="w-full h-64 p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#0077B5] focus:border-transparent outline-none transition-all resize-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Category</label>
                        <select 
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:border-[#0077B5] transition-colors bg-white"
                        >
                          <option value="General">General</option>
                          <option value="Tech">Tech</option>
                          <option value="Business">Business</option>
                          <option value="Personal">Personal</option>
                          <option value="Marketing">Marketing</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Schedule Time</label>
                        <input 
                          type="datetime-local" 
                          value={scheduleTime}
                          onChange={(e) => setScheduleTime(e.target.value)}
                          disabled={isDraft}
                          className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:border-[#0077B5] transition-colors disabled:opacity-50"
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <div 
                          onClick={() => setIsDraft(!isDraft)}
                          className={cn(
                            "w-10 h-5 rounded-full transition-colors relative",
                            isDraft ? "bg-[#0077B5]" : "bg-slate-200"
                          )}
                        >
                          <div className={cn(
                            "absolute top-1 left-1 w-3 h-3 rounded-full bg-white transition-transform",
                            isDraft && "translate-x-5"
                          )} />
                        </div>
                        <span className="text-sm font-medium text-slate-600">Save as Draft (No Schedule)</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer group">
                        <div 
                          onClick={() => setIsRecurring(!isRecurring)}
                          className={cn(
                            "w-10 h-5 rounded-full transition-colors relative",
                            isRecurring ? "bg-[#0077B5]" : "bg-slate-200"
                          )}
                        >
                          <div className={cn(
                            "absolute top-1 left-1 w-3 h-3 rounded-full bg-white transition-transform",
                            isRecurring && "translate-x-5"
                          )} />
                        </div>
                        <span className="text-sm font-medium text-slate-600">Recurring Post</span>
                      </label>

                      {isRecurring && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="pl-12"
                        >
                          <select 
                            value={recurrencePattern}
                            onChange={(e) => setRecurrencePattern(e.target.value as any)}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs outline-none focus:border-[#0077B5]"
                          >
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                          </select>
                        </motion.div>
                      )}
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button 
                        onClick={schedulePost}
                        disabled={loading || !generatedContent}
                        className="flex-1 bg-slate-900 text-white py-3 rounded-xl font-medium hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <Calendar className="w-4 h-4" />
                        {loading ? "..." : "Schedule"}
                      </button>
                      <button 
                        onClick={handlePostNow}
                        disabled={loading || !generatedContent}
                        className="flex-1 bg-[#0077B5] text-white py-3 rounded-xl font-medium hover:bg-[#004182] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <Send className="w-4 h-4" />
                        {loading ? "..." : "Post Now"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 sticky top-8">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      <ImageIcon className="text-[#0077B5] w-5 h-5" />
                      Visual Design Preview
                    </h3>
                    {designData && (
                      <button 
                        onClick={downloadPDF}
                        className="text-[#0077B5] hover:text-[#004182] font-semibold text-sm flex items-center gap-1"
                      >
                        <Download className="w-4 h-4" />
                        Export PDF
                      </button>
                    )}
                  </div>

                  <div className="aspect-square w-full max-w-md mx-auto relative overflow-hidden rounded-xl shadow-2xl border border-[#f1f5f9] bg-white" id="design-canvas">
                    {designData ? (
                      <div style={{
                        width: "100%",
                        height: "100%",
                        padding: "40px",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        textAlign: "center",
                        backgroundColor: designData.colorScheme.toLowerCase().includes("blue") ? "#0077B5" : 
                                       designData.colorScheme.toLowerCase().includes("dark") ? "#0f172a" : "#ffffff",
                        color: designData.colorScheme.toLowerCase().includes("white") ? "#0f172a" : "#ffffff"
                      }}>
                        <div className="space-y-6">
                          <Linkedin 
                            style={{ width: "40px", height: "40px", margin: "0 auto" }} 
                            color={designData.colorScheme.toLowerCase().includes("white") ? "#0077B5" : "#ffffff"} 
                          />
                          <h2 style={{ fontSize: "30px", fontWeight: "900", letterSpacing: "-0.025em", lineHeight: "1.25" }}>
                            {designData.title}
                          </h2>
                          <div style={{ height: "4px", width: "80px", backgroundColor: "currentColor", margin: "0 auto", opacity: 0.3 }} />
                          <ul style={{ textAlign: "left", maxWidth: "320px", margin: "0 auto", listStyle: "none", padding: 0 }} className="space-y-4">
                            {designData.body.map((point, i) => (
                              <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: "12px", fontSize: "18px", fontWeight: "500" }}>
                                <span style={{ marginTop: "6px", width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "currentColor", flexShrink: 0 }} />
                                {point}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div style={{ paddingTop: "32px", borderTop: "1px solid currentColor", opacity: 0.2 }}>
                          <p style={{ fontSize: "14px", fontWeight: "700", letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.8 }}>
                            {designData.footer}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 p-12 text-center">
                        <ImageIcon className="w-16 h-16 mb-4 opacity-20" />
                        <p className="text-sm font-medium">Write your post to see the visual preview.</p>
                        <p className="text-xs mt-2">The AI will automatically update the design as you type.</p>
                        <button 
                          onClick={async () => {
                            if (!generatedContent) return;
                            setLoading(true);
                            const design = await generatePostDesign(generatedContent);
                            setDesignData(design);
                            setLoading(false);
                          }}
                          className="mt-4 text-xs font-bold text-[#0077B5] hover:underline"
                        >
                          Generate Design Now
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {currentView === "analytics" && (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                  <BarChart3 className="text-[#0077B5] w-6 h-6" />
                  Detailed Post Analytics
                </h3>
                
                <div className="space-y-4">
                  {livePosts.length > 0 ? livePosts.map((post, idx) => (
                    <div key={idx} className="p-6 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col md:flex-row gap-6 items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Linkedin className="w-4 h-4 text-[#0077B5]" />
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">LinkedIn Post</span>
                        </div>
                        <p className="text-slate-700 text-sm mb-4 line-clamp-3">
                          {post.text?.text || post.commentary || "Shared a post"}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(post.created?.time || Date.now()).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 w-full md:w-auto">
                        <div className="bg-white p-4 rounded-xl border border-slate-100 text-center min-w-[100px]">
                          <ThumbsUp className="w-4 h-4 text-[#0077B5] mx-auto mb-1" />
                          <p className="text-xl font-bold">{post.likes || 0}</p>
                          <p className="text-[10px] text-slate-400 uppercase font-bold">Likes</p>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-slate-100 text-center min-w-[100px]">
                          <MessageCircle className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
                          <p className="text-xl font-bold">{post.comments || 0}</p>
                          <p className="text-[10px] text-slate-400 uppercase font-bold">Comments</p>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-slate-100 text-center min-w-[100px]">
                          <Share2 className="w-4 h-4 text-violet-500 mx-auto mb-1" />
                          <p className="text-xl font-bold">{post.shares || 0}</p>
                          <p className="text-[10px] text-slate-400 uppercase font-bold">Shares</p>
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      <BarChart3 className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                      <p className="text-slate-400">No live posts found to analyze.</p>
                      <button 
                        onClick={fetchLivePosts}
                        className="mt-4 text-[#0077B5] font-bold text-sm hover:underline"
                      >
                        Refresh Activity
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {currentView === "settings" && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-2xl space-y-6"
            >
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="text-xl font-bold mb-6">Account Settings</h3>
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-[#0077B5] flex items-center justify-center text-white">
                        <Linkedin className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-bold">LinkedIn Integration</p>
                        <p className="text-xs text-emerald-500 font-medium">Connected as Joel Pillar</p>
                      </div>
                    </div>
                    <button className="text-sm font-semibold text-red-500 hover:text-red-600">Disconnect</button>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold">Auto-Reply DMs</p>
                        <p className="text-xs text-slate-500">Automatically reply to new messages using AI</p>
                      </div>
                      <div className="w-12 h-6 bg-[#0077B5] rounded-full relative cursor-pointer">
                        <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold">Smart Scheduling</p>
                        <p className="text-xs text-slate-500">Post at times when your audience is most active</p>
                      </div>
                      <div className="w-12 h-6 bg-slate-200 rounded-full relative cursor-pointer">
                        <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="text-xl font-bold mb-6">AI Preferences</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Default Tone</label>
                    <select className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none">
                      <option>Professional</option>
                      <option>Casual</option>
                      <option>Thought Leader</option>
                      <option>Hype</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Target Audience</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Software Engineers, Marketing Managers"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
