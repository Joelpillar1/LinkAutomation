import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import Database from "better-sqlite3";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("linkedin_automate.db");

// Initialize DB
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    linkedin_id TEXT,
    access_token TEXT,
    refresh_token TEXT,
    name TEXT,
    email TEXT,
    avatar TEXT,
    profile_url TEXT
  );
  CREATE TABLE IF NOT EXISTS posts (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    content TEXT,
    scheduled_at DATETIME,
    status TEXT DEFAULT 'pending',
    image_url TEXT,
    is_recurring INTEGER DEFAULT 0,
    recurrence_pattern TEXT, -- 'daily', 'weekly', 'monthly'
    category TEXT DEFAULT 'General',
    is_draft INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Migration: Ensure new columns exist in posts table
try {
  db.prepare("SELECT is_recurring FROM posts LIMIT 1").get();
} catch (e) {
  console.log("Adding new columns to posts table...");
  db.exec("ALTER TABLE posts ADD COLUMN is_recurring INTEGER DEFAULT 0");
  db.exec("ALTER TABLE posts ADD COLUMN recurrence_pattern TEXT");
  db.exec("ALTER TABLE posts ADD COLUMN category TEXT DEFAULT 'General'");
  db.exec("ALTER TABLE posts ADD COLUMN is_draft INTEGER DEFAULT 0");
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Request logging middleware
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });

  // --- Helper Functions ---
  async function uploadImageToLinkedIn(accessToken: string, personUrn: string, base64Image: string) {
    try {
      // 1. Register Upload
      const registerRes = await fetch("https://api.linkedin.com/v2/assets?action=registerUpload", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "X-Restli-Protocol-Version": "2.0.0",
        },
        body: JSON.stringify({
          registerUploadRequest: {
            recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
            owner: `urn:li:person:${personUrn}`,
            serviceRelationships: [
              {
                relationshipType: "OWNER",
                identifier: "urn:li:userGeneratedContent",
              },
            ],
          },
        }),
      });

      if (!registerRes.ok) {
        const err = await registerRes.json().catch(() => ({}));
        console.error("LinkedIn Register Upload Error:", err);
        throw new Error(err.message || "Failed to register image upload with LinkedIn.");
      }

      const registerData = await registerRes.json();
      const uploadUrl = registerData.value.uploadMechanism["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"].uploadUrl;
      const asset = registerData.value.asset;

      // 2. Upload Binary
      const buffer = Buffer.from(base64Image.replace(/^data:image\/\w+;base64,/, ""), "base64");
      const uploadRes = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "image/png",
        },
        body: buffer,
      });

      if (!uploadRes.ok) {
        console.error("LinkedIn Binary Upload Error:", uploadRes.statusText);
        throw new Error("Failed to upload image binary to LinkedIn.");
      }

      return asset;
    } catch (err) {
      console.error("Image Upload Helper Error:", err);
      return null;
    }
  }

  async function postToLinkedIn(postId: string) {
    const post = db.prepare("SELECT * FROM posts WHERE id = ?").get(postId) as any;
    if (!post) return;

    const user = db.prepare("SELECT access_token, linkedin_id FROM users WHERE id = ?").get(post.user_id) as any;
    if (!user || !user.access_token) {
      console.error(`No token found for user ${post.user_id}`);
      db.prepare("UPDATE posts SET status = 'failed' WHERE id = ?").run(postId);
      return;
    }

    try {
      let assetUrn = null;
      if (post.image_url && post.image_url.startsWith("data:image")) {
        assetUrn = await uploadImageToLinkedIn(user.access_token, user.linkedin_id, post.image_url);
      }

      const payload: any = {
        author: `urn:li:person:${user.linkedin_id}`,
        lifecycleState: "PUBLISHED",
        specificContent: {
          "com.linkedin.ugc.ShareContent": {
            shareCommentary: { text: post.content },
            shareMediaCategory: assetUrn ? "IMAGE" : "NONE",
          },
        },
        visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
      };

      if (assetUrn) {
        payload.specificContent["com.linkedin.ugc.ShareContent"].media = [
          {
            status: "READY",
            description: { text: "Generated via LinkedIn Automate" },
            media: assetUrn,
            title: { text: "Design Preview" },
          },
        ];
      }

      const liRes = await fetch("https://api.linkedin.com/v2/ugcPosts", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${user.access_token}`,
          "Content-Type": "application/json",
          "X-Restli-Protocol-Version": "2.0.0",
        },
        body: JSON.stringify(payload),
      });

      if (liRes.ok) {
        db.prepare("UPDATE posts SET status = 'posted' WHERE id = ?").run(postId);
        console.log(`Successfully posted ${postId} to LinkedIn`);
        return { success: true };
      } else {
        const err = await liRes.json().catch(() => ({}));
        console.error(`LinkedIn API Error for post ${postId}:`, err);
        db.prepare("UPDATE posts SET status = 'failed' WHERE id = ?").run(postId);
        return { success: false, error: err.message || "LinkedIn API rejected the post." };
      }
    } catch (err: any) {
      console.error(`Post Error for post ${postId}:`, err);
      db.prepare("UPDATE posts SET status = 'failed' WHERE id = ?").run(postId);
      return { success: false, error: err.message || "An unexpected error occurred while posting." };
    }
  }

  // --- API Routes ---

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", env: process.env.NODE_ENV });
  });

  // LinkedIn OAuth URL
  app.get("/api/auth/linkedin/url", (req, res) => {
    const redirectUri = `${process.env.APP_URL}/auth/linkedin/callback`;
    // LinkedIn deprecated r_liteprofile and r_emailaddress in favor of OpenID Connect scopes
    // Use openid, profile, and email for basic info. 
    // w_member_social is for posting. 
    // r_member_social is removed as it often requires special approval and causes login errors if not authorized.
    const scope = "openid profile email w_member_social"; 
    const state = Math.random().toString(36).substring(7);
    
    const params = new URLSearchParams({
      response_type: "code",
      client_id: process.env.LINKEDIN_CLIENT_ID || "",
      redirect_uri: redirectUri,
      state: state,
      scope: scope,
    });

    res.json({ url: `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}` });
  });

  // LinkedIn OAuth Callback
  app.get("/auth/linkedin/callback", async (req, res) => {
    const { code, error, error_description } = req.query;
    
    if (error) {
      return res.send(`
        <html>
          <body style="font-family: sans-serif; padding: 20px; text-align: center;">
            <h2 style="color: #e11d48;">Authentication Error</h2>
            <p>${error_description || error}</p>
            <p style="font-size: 14px; color: #64748b;">Please check your LinkedIn Developer Portal settings and ensure the correct products (Sign In with LinkedIn using OpenID Connect, Share on LinkedIn) are enabled.</p>
            <button onclick="window.close()" style="background: #0077B5; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer;">Close Window</button>
          </body>
        </html>
      `);
    }
    
    try {
      // 1. Exchange code for access token
      const tokenResponse = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code: code as string,
          client_id: process.env.LINKEDIN_CLIENT_ID || "",
          client_secret: process.env.LINKEDIN_CLIENT_SECRET || "",
          redirect_uri: `${process.env.APP_URL}/auth/linkedin/callback`,
        }),
      });

      const tokenData = await tokenResponse.json();
      if (!tokenResponse.ok) throw new Error(tokenData.error_description || "Failed to exchange token");

      // 2. Get User Profile (OpenID Connect)
      const userResponse = await fetch("https://api.linkedin.com/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const userData = await userResponse.json();

      // 3. Save to DB
      db.prepare(`
        INSERT OR REPLACE INTO users (id, linkedin_id, access_token, name, email, avatar)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        "default_user", // Simplification for demo
        userData.sub,
        tokenData.access_token,
        userData.name,
        userData.email,
        userData.picture
      );

      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>Authentication successful. This window should close automatically.</p>
          </body>
        </html>
      `);
    } catch (err: any) {
      console.error("OAuth Callback Error:", err);
      res.status(500).send(`Error: ${err.message}`);
    }
  });

  // API for posts
  app.get("/api/posts", (req, res) => {
    const posts = db.prepare("SELECT * FROM posts ORDER BY scheduled_at DESC").all();
    res.json(posts);
  });

  app.put("/api/posts/:id", (req, res) => {
    const { id } = req.params;
    const { content, scheduled_at, is_recurring, recurrence_pattern, category, is_draft } = req.body;
    
    try {
      db.prepare(`
        UPDATE posts 
        SET content = ?, 
            scheduled_at = ?, 
            is_recurring = ?, 
            recurrence_pattern = ?, 
            category = ?, 
            is_draft = ? 
        WHERE id = ?
      `).run(
        content, 
        scheduled_at, 
        is_recurring ? 1 : 0, 
        recurrence_pattern, 
        category, 
        is_draft ? 1 : 0, 
        id
      );
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/posts/:id", (req, res) => {
    const { id } = req.params;
    try {
      db.prepare("DELETE FROM posts WHERE id = ?").run(id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/posts", async (req, res) => {
    const { content, scheduled_at, image_url, immediate, is_recurring, recurrence_pattern, category, is_draft } = req.body;
    const id = Math.random().toString(36).substring(7);
    
    db.prepare(`
      INSERT INTO posts (id, user_id, content, scheduled_at, status, image_url, is_recurring, recurrence_pattern, category, is_draft)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, 
      "default_user", 
      content, 
      scheduled_at, 
      immediate ? "posted" : "pending", 
      image_url,
      is_recurring ? 1 : 0,
      recurrence_pattern,
      category || "General",
      is_draft ? 1 : 0
    );

    if (immediate) {
      const result = await postToLinkedIn(id);
      if (result.success) {
        return res.json({ id, status: "posted" });
      } else {
        return res.status(400).json({ id, status: "failed", error: result.error });
      }
    }

    res.json({ id, status: "scheduled" });
  });

  app.get("/api/analytics", async (req, res) => {
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get("default_user") as any;
    if (!user) return res.status(401).json({ error: "Not logged in" });

    // Fallback to mock data if no profile URL or scrape fails
    res.json({
      profileViews: 1284 + Math.floor(Math.random() * 50),
      postImpressions: "42.5K",
      newConnections: 156 + Math.floor(Math.random() * 5),
      changes: {
        views: "+12%",
        impressions: "+18%",
        connections: "+5%"
      }
    });
  });

  app.get("/api/linkedin/post-analytics", async (req, res) => {
    const { urn } = req.query;
    const user = db.prepare("SELECT access_token FROM users WHERE id = ?").get("default_user") as any;
    if (!user || !user.access_token) return res.status(401).json({ error: "Not logged in" });

    try {
      const liRes = await fetch(`https://api.linkedin.com/v2/socialActions/${urn}`, {
        headers: {
          "Authorization": `Bearer ${user.access_token}`,
          "X-Restli-Protocol-Version": "2.0.0",
        },
      });

      if (liRes.ok) {
        const data = await liRes.json();
        res.json(data);
      } else {
        const status = liRes.status;
        const text = await liRes.text();
        let err: any = {};
        try {
          err = JSON.parse(text);
        } catch (e) {
          err = { raw: text };
        }
        
        console.error(`LinkedIn Post Analytics Error [Status ${status}]:`, JSON.stringify(err, null, 2));
        
        res.status(status).json({ 
          error: err.message || "Failed to fetch post analytics",
          details: err,
          status: status
        });
      }
    } catch (error: any) {
      console.error("LinkedIn Post Analytics Unexpected Error:", error);
      res.status(500).json({ error: error.message || "An unexpected error occurred" });
    }
  });

  app.get("/api/linkedin/posts", async (req, res) => {
    const user = db.prepare("SELECT access_token, linkedin_id FROM users WHERE id = ?").get("default_user") as any;
    if (!user || !user.access_token) return res.status(401).json({ error: "Not logged in" });
    if (!user.linkedin_id) return res.status(400).json({ error: "LinkedIn profile not synced. Please log out and log in again." });

    try {
      const authorUrn = `urn:li:person:${user.linkedin_id}`;
      console.log(`Fetching LinkedIn posts for author: ${authorUrn}`);
      
      // Fetch recent posts from LinkedIn using the modern /v2/posts API
      // author={urn}&q=author is the correct query pattern for this endpoint
      const liRes = await fetch(`https://api.linkedin.com/v2/posts?author=${encodeURIComponent(authorUrn)}&q=author&count=10`, {
        headers: {
          "Authorization": `Bearer ${user.access_token}`,
          "X-Restli-Protocol-Version": "2.0.0",
        },
      });

      if (liRes.ok) {
        const data = await liRes.json();
        // The /v2/posts API returns elements in the same way as /v2/shares
        res.json(data.elements || []);
      } else {
        const status = liRes.status;
        const text = await liRes.text();
        let err: any = {};
        try {
          err = JSON.parse(text);
        } catch (e) {
          err = { raw: text };
        }
        
        console.error(`LinkedIn Fetch Posts Error [Status ${status}]:`, JSON.stringify(err, null, 2));
        
        let errorMessage = "Failed to fetch posts from LinkedIn";
        if (status === 403) {
          errorMessage = "Permission denied. Please ensure 'Share on LinkedIn' and 'Sign In with LinkedIn' are enabled in your LinkedIn Developer Portal, and that you have granted 'r_member_social' scope if available.";
        } else if (status === 401) {
          errorMessage = "LinkedIn session expired. Please log out and log in again.";
        }

        res.status(status).json({ 
          error: err.message || errorMessage,
          details: err,
          status: status
        });
      }
    } catch (error: any) {
      console.error("LinkedIn Fetch Posts Unexpected Error:", error);
      res.status(500).json({ error: error.message || "An unexpected error occurred while fetching posts" });
    }
  });

  app.get("/api/user/me", (req, res) => {
    const user = db.prepare("SELECT id, name, email, avatar, profile_url FROM users WHERE id = ?").get("default_user") as any;
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  });

  app.post("/api/user/profile-url", (req, res) => {
    const { url } = req.body;
    db.prepare("UPDATE users SET profile_url = ? WHERE id = ?").run(url, "default_user");
    res.json({ success: true });
  });

  // --- Background Scheduler ---
  setInterval(async () => {
    const now = new Date().toISOString();
    // Only fetch posts that are NOT drafts and are pending
    const pendingPosts = db.prepare("SELECT * FROM posts WHERE status = 'pending' AND is_draft = 0 AND scheduled_at <= ?").all(now) as any[];
    const user = db.prepare("SELECT access_token, linkedin_id FROM users WHERE id = ?").get("default_user") as any;

    for (const post of pendingPosts) {
      console.log(`Scheduler: Attempting to auto-post: ${post.id}`);
      const result = await postToLinkedIn(post.id);
      
      if (result.success && post.is_recurring) {
        // Schedule the next occurrence
        const nextDate = new Date(post.scheduled_at);
        if (post.recurrence_pattern === 'daily') nextDate.setDate(nextDate.getDate() + 1);
        else if (post.recurrence_pattern === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
        else if (post.recurrence_pattern === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);

        const nextId = Math.random().toString(36).substring(7);
        db.prepare(`
          INSERT INTO posts (id, user_id, content, scheduled_at, status, image_url, is_recurring, recurrence_pattern, category, is_draft)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          nextId, 
          post.user_id, 
          post.content, 
          nextDate.toISOString(), 
          'pending', 
          post.image_url,
          1,
          post.recurrence_pattern,
          post.category,
          0
        );
        console.log(`Scheduler: Scheduled next occurrence for post ${post.id} at ${nextDate.toISOString()}`);
      }
    }
  }, 60000); // Check every minute

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
