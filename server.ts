import express, { Request, Response } from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { sql } from "@vercel/postgres";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize DB schema (for Vercel Postgres)
async function initializeSchema() {
  try {
    await sql`
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
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS posts (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        content TEXT,
        scheduled_at TIMESTAMPTZ,
        status TEXT DEFAULT 'pending',
        image_url TEXT,
        is_recurring INTEGER DEFAULT 0,
        recurrence_pattern TEXT,
        category TEXT DEFAULT 'General',
        is_draft INTEGER DEFAULT 0,
        thumbnail_url TEXT,
        media_urls TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `;
    console.log("Database schema initialized.");
  } catch (err) {
    console.error("Schema initialization failed:", err);
  }
}

// In local dev, we might still want to call this once, 
// though Vercel environment usually handles migrations differently.
if (process.env.NODE_ENV === "production") {
  initializeSchema();
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // --- Helper Functions ---
  async function uploadImageToLinkedIn(accessToken: string, personUrn: string, base64Image: string) {
    try {
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
        throw new Error(err.message || "Failed to register image upload with LinkedIn.");
      }

      const registerData = await registerRes.json();
      const uploadUrl = registerData.value.uploadMechanism["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"].uploadUrl;
      const asset = registerData.value.asset;

      const buffer = Buffer.from(base64Image.split(",")[1] || base64Image, "base64");

      const uploadRes = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "X-Restli-Protocol-Version": "2.0.0",
          "Content-Type": "application/octet-stream",
        },
        body: buffer,
      });

      if (!uploadRes.ok) {
        throw new Error(`Upload Failed with status ${uploadRes.status}: ${uploadRes.statusText}`);
      }

      return asset;
    } catch (err: any) {
      console.error("Image Upload Helper Error:", err);
      throw err;
    }
  }

  async function postToLinkedIn(postId: string) {
    const { rows } = await sql`SELECT * FROM posts WHERE id = ${postId}`;
    const post = rows[0];
    if (!post) throw new Error("Post not found.");

    if (!post.content && !post.image_url && !post.media_urls) {
      await sql`UPDATE posts SET status = 'failed' WHERE id = ${postId}`;
      return { success: false, error: "Post cannot be empty." };
    }

    const { rows: userRows } = await sql`SELECT access_token, linkedin_id FROM users WHERE id = ${post.user_id}`;
    const user = userRows[0];
    if (!user || !user.access_token) {
      await sql`UPDATE posts SET status = 'failed' WHERE id = ${postId}`;
      return { success: false, error: "Authentication expired." };
    }

    try {
      let mediaAssets: { urn: string, type: string }[] = [];

      if (post.image_url && post.image_url.startsWith("data:")) {
        const urn = await uploadImageToLinkedIn(user.access_token, user.linkedin_id, post.image_url);
        if (urn) mediaAssets.push({ urn, type: "IMAGE" });
      }

      if (post.media_urls) {
        try {
          const extraUrls = JSON.parse(post.media_urls) as string[];
          for (const url of extraUrls) {
            if (url.startsWith("data:image/")) {
              const urn = await uploadImageToLinkedIn(user.access_token, user.linkedin_id, url);
              if (urn) mediaAssets.push({ urn, type: "IMAGE" });
            }
          }
        } catch (e) { }
      }

      const payload: any = {
        author: `urn:li:person:${user.linkedin_id}`,
        commentary: post.content || "",
        visibility: "PUBLIC",
        distribution: {
          feedDistribution: "MAIN_FEED",
          targetEntities: [],
          thirdPartyDistributionChannels: []
        },
        lifecycleState: "PUBLISHED"
      };

      if (mediaAssets.length >= 2) {
        payload.content = {
          multiImage: {
            images: mediaAssets.map(asset => ({ id: asset.urn.replace("urn:li:digitalmediaAsset:", "urn:li:image:") }))
          }
        };
      } else if (mediaAssets.length === 1) {
        payload.content = { media: { id: mediaAssets[0].urn.replace("urn:li:digitalmediaAsset:", "urn:li:image:") } };
      }

      const liRes = await fetch("https://api.linkedin.com/rest/posts", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${user.access_token}`,
          "Content-Type": "application/json",
          "LinkedIn-Version": "202510",
          "X-Restli-Protocol-Version": "2.0.0",
        },
        body: JSON.stringify(payload),
      });

      if (liRes.status === 201 || liRes.ok) {
        await sql`UPDATE posts SET status = 'posted' WHERE id = ${postId}`;
        return { success: true };
      } else {
        const err = await liRes.json().catch(() => ({}));
        await sql`UPDATE posts SET status = 'failed' WHERE id = ${postId}`;
        return { success: false, error: err.message || `LinkedIn error ${liRes.status}` };
      }
    } catch (err: any) {
      await sql`UPDATE posts SET status = 'failed' WHERE id = ${postId}`;
      throw err;
    }
  }

  // --- API Routes ---

  // CRON ENDPOINT FOR VERCEL
  app.get("/api/cron/process-posts", async (req, res) => {
    // Basic auth check for cron if needed
    // if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    //   return res.status(401).end();
    // }

    try {
      const now = new Date().toISOString();
      const { rows: pendingPosts } = await sql`
        SELECT * FROM posts 
        WHERE status = 'pending' 
        AND is_draft = 0 
        AND scheduled_at <= ${now}
      `;

      console.log(`Cron: Processing ${pendingPosts.length} posts...`);

      for (const post of pendingPosts) {
        try {
          const result = await postToLinkedIn(post.id);

          if (result.success && post.is_recurring) {
            const nextDate = new Date(post.scheduled_at);
            if (post.recurrence_pattern === 'daily') nextDate.setDate(nextDate.getDate() + 1);
            else if (post.recurrence_pattern === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
            else if (post.recurrence_pattern === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);

            const nextId = Math.random().toString(36).substring(7);
            await sql`
              INSERT INTO posts (id, user_id, content, scheduled_at, status, image_url, is_recurring, recurrence_pattern, category, is_draft)
              VALUES (${nextId}, ${post.user_id}, ${post.content}, ${nextDate.toISOString()}, 'pending', ${post.image_url}, 1, ${post.recurrence_pattern}, ${post.category}, 0)
            `;
          }
        } catch (err) {
          console.error(`Cron: Error processing post ${post.id}`, err);
        }
      }
      res.json({ processed: pendingPosts.length });
    } catch (err) {
      console.error("Cron handler failed:", err);
      res.status(500).json({ error: "Internal error" });
    }
  });

  app.get("/api/health", (req, res) => res.json({ status: "ok" }));

  app.get("/api/auth/linkedin/url", (req, res) => {
    const redirectUri = `${process.env.APP_URL}/auth/linkedin/callback`;
    const scope = "openid profile email w_member_social r_member_social";
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

  app.get("/auth/linkedin/callback", async (req, res) => {
    const { code, error, error_description } = req.query;
    if (error) return res.status(500).send(error_description as string);

    try {
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

      const userResponse = await fetch("https://api.linkedin.com/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const userData = await userResponse.json();

      await sql`
        INSERT INTO users (id, linkedin_id, access_token, name, email, avatar)
        VALUES ('default_user', ${userData.sub}, ${tokenData.access_token}, ${userData.name}, ${userData.email}, ${userData.picture})
        ON CONFLICT (id) DO UPDATE SET 
          linkedin_id = EXCLUDED.linkedin_id,
          access_token = EXCLUDED.access_token,
          name = EXCLUDED.name,
          email = EXCLUDED.email,
          avatar = EXCLUDED.avatar
      `;

      res.send(`<html><body><script>if(window.opener){window.opener.postMessage({type:'OAUTH_AUTH_SUCCESS'},'*');window.close();}else{window.location.href='/';}</script></body></html>`);
    } catch (err: any) {
      res.status(500).send(`Error: ${err.message}`);
    }
  });

  app.get("/api/posts", async (req, res) => {
    const { rows } = await sql`SELECT * FROM posts ORDER BY scheduled_at DESC`;
    res.json(rows);
  });

  app.put("/api/posts/:id", async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    try {
      const { rows } = await sql`SELECT * FROM posts WHERE id = ${id}`;
      const existing = rows[0];
      if (!existing) return res.status(404).json({ error: "Not found" });

      await sql`
        UPDATE posts 
        SET content = ${updates.content ?? existing.content}, 
            scheduled_at = ${updates.scheduled_at ?? existing.scheduled_at}, 
            image_url = ${updates.image_url ?? existing.image_url},
            thumbnail_url = ${updates.thumbnail_url ?? existing.thumbnail_url},
            media_urls = ${updates.media_urls ?? existing.media_urls},
            is_recurring = ${updates.is_recurring !== undefined ? (updates.is_recurring ? 1 : 0) : existing.is_recurring}, 
            recurrence_pattern = ${updates.recurrence_pattern ?? existing.recurrence_pattern}, 
            category = ${updates.category ?? existing.category}, 
            is_draft = ${updates.is_draft !== undefined ? (updates.is_draft ? 1 : 0) : existing.is_draft},
            status = ${updates.status ?? existing.status}
        WHERE id = ${id}
      `;
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/posts", async (req, res) => {
    const { content, scheduled_at, image_url, thumbnail_url, media_urls, immediate, is_recurring, recurrence_pattern, category, is_draft } = req.body;
    const id = Math.random().toString(36).substring(7);

    try {
      await sql`
        INSERT INTO posts (id, user_id, content, scheduled_at, status, image_url, thumbnail_url, media_urls, is_recurring, recurrence_pattern, category, is_draft)
        VALUES (
          ${id}, 'default_user', ${content}, ${scheduled_at}, 
          ${immediate ? 'posted' : 'pending'}, 
          ${image_url}, ${thumbnail_url}, ${media_urls}, 
          ${is_recurring ? 1 : 0}, ${recurrence_pattern}, 
          ${category || 'General'}, ${is_draft ? 1 : 0}
        )
      `;

      if (immediate) {
        const result = await postToLinkedIn(id);
        if (result.success) return res.json({ id, status: "posted" });
        return res.status(400).json({ id, status: "failed", error: result.error });
      }

      res.json({ id, status: "scheduled" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/user/me", async (req, res) => {
    const { rows } = await sql`SELECT id, name, email, avatar, profile_url FROM users WHERE id = 'default_user'`;
    if (!rows[0]) return res.status(404).json({ error: "User not found" });
    res.json(rows[0]);
  });

  app.delete("/api/posts/:id", async (req, res) => {
    await sql`DELETE FROM posts WHERE id = ${req.params.id}`;
    res.json({ success: true });
  });

  // Analytics mock
  app.get("/api/analytics", async (req, res) => {
    res.json({
      profileViews: 1284,
      postImpressions: "42.5K",
      newConnections: 156,
      changes: { views: "+12%", impressions: "+18%", connections: "+5%" }
    });
  });

  // Vite/Static serve
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => res.sendFile(path.join(__dirname, "dist", "index.html")));
  }

  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

startServer();
