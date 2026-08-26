import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Serve uploaded assets statically
const uploadsDir = path.join(process.cwd(), "public", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use("/uploads", express.static(uploadsDir));

// Local persistent auth credentials store for fail-safe password verification
const credentialsDir = path.join(process.cwd(), "data");
const credentialsFile = path.join(credentialsDir, "auth_credentials.json");

if (!fs.existsSync(credentialsDir)) {
  try {
    fs.mkdirSync(credentialsDir, { recursive: true });
  } catch (e) {}
}

interface StoredCredential {
  phone: string;
  cleanDigits: string;
  password: string;
  userId?: string;
  updatedAt: string;
}

// Local persistent messages store for fallback and multi-user sync
const messagesFile = path.join(credentialsDir, "messages_store.json");

const getStoredMessages = (): any[] => {
  try {
    if (fs.existsSync(messagesFile)) {
      const raw = fs.readFileSync(messagesFile, "utf-8");
      return JSON.parse(raw) || [];
    }
  } catch (e) {
    console.warn("[Messages Store] Error reading messages file:", e);
  }
  return [];
};

const saveStoredMessage = (msg: any) => {
  try {
    const list = getStoredMessages();
    const existingIdx = list.findIndex((m) => m.id === msg.id);
    if (existingIdx >= 0) {
      list[existingIdx] = msg;
    } else {
      list.push(msg);
    }
    // Limit to latest 3000 messages to prevent unbounded growth
    const trimmed = list.slice(-3000);
    fs.writeFileSync(messagesFile, JSON.stringify(trimmed, null, 2), "utf-8");
  } catch (e) {
    console.warn("[Messages Store] Error saving message file:", e);
  }
};

const getStoredCredentials = (): Record<string, StoredCredential> => {
  try {
    if (fs.existsSync(credentialsFile)) {
      const raw = fs.readFileSync(credentialsFile, "utf-8");
      return JSON.parse(raw) || {};
    }
  } catch (e) {
    console.warn("[Credentials Store] Error reading credentials file:", e);
  }
  return {};
};

const saveCredential = (phone: string, password: string, userId?: string) => {
  try {
    const cleanDigits = (phone || "").replace(/\D/g, "");
    if (!cleanDigits || !password) return;
    const creds = getStoredCredentials();
    creds[cleanDigits] = {
      phone: phone.trim(),
      cleanDigits,
      password: password.trim(),
      userId: userId || creds[cleanDigits]?.userId,
      updatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(credentialsFile, JSON.stringify(creds, null, 2), "utf-8");
    console.log(`[Credentials Store] Stored registered credentials for: ${phone.trim()}`);
  } catch (e) {
    console.warn("[Credentials Store] Error saving credentials file:", e);
  }
};

// Seed & Synchronize Admin Credentials for +8838533014 (Password: 9624)
const syncAdminCredentials = async () => {
  const adminPhones = ["+8838533014", "8838533014", "+918838533014", "918838533014", "+91 8838533014"];
  const adminPass = "9624";
  
  // 1. Immediately store in server credentials file
  adminPhones.forEach((p) => saveCredential(p, adminPass, "usr_8838533014"));

  // 2. Synchronize to Supabase database
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      for (const p of adminPhones) {
        await supabase.from("profiles").update({ password: adminPass }).eq("phone", p);
      }

      // Check all profiles for phone match
      const { data: allProfiles } = await supabase.from("profiles").select("*");
      if (allProfiles && allProfiles.length > 0) {
        for (const prof of allProfiles) {
          const digits = (prof.phone || "").replace(/\D/g, "");
          if (digits.includes("8838533014")) {
            await supabase.from("profiles").update({ password: adminPass }).eq("id", prof.id);
            console.log(`[Admin Password Sync] Updated Supabase password to 9624 for ID: ${prof.id} (${prof.phone})`);
          }
        }
      }

      // Ensure at least one profile exists with +8838533014
      const { data: existingAdmin } = await supabase
        .from("profiles")
        .select("*")
        .eq("phone", "+8838533014")
        .maybeSingle();

      if (!existingAdmin) {
        await supabase.from("profiles").upsert([
          {
            id: "usr_8838533014",
            phone: "+8838533014",
            password: adminPass,
            role: "wholesaler",
            display_name: "Admin Dropthan",
            company_name: "Dropthan Admin",
            status: "Active",
            country: "India",
            created_at: new Date().toISOString(),
          },
        ]);
        console.log("[Admin Password Sync] Upserted admin profile record for +8838533014");
      }
    } catch (err) {
      console.warn("[Admin Password Sync] Supabase sync notice:", err);
    }
  }
};

// Run initial admin sync
syncAdminCredentials().catch(() => {});

// Initialize Supabase Admin/Service Client if URL & Key are available
const getSupabaseClient = () => {
  const url = process.env.VITE_SUPABASE_URL || "https://zxbifidxkpbsissjwgnm.supabase.co";
  const key = process.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_s8wtq-Mx3OMobIMCSZ69cA_gzo9VbvJ";
  if (!url || !key) return null;
  return createClient(url, key);
};

// Initialize Gemini Client
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("GEMINI_API_KEY is not configured.");
    return null;
  }
  return new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
};

// API Routes
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", app: "Dropthan B2B Mobile App" });
});

// Server-Side Public Posts Listing Endpoint (Guarantees Shared Global Feed)
app.get("/api/posts", async (_req, res) => {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      res.status(500).json({ error: "Supabase client not available on server" });
      return;
    }

    let { data, error } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error && error.message?.includes("created_at")) {
      const fallback = await supabase.from("posts").select("*");
      data = fallback.data;
      error = fallback.error;
    }

    if (error) {
      console.warn("[Server Posts] Supabase fetch error:", error.message);
      res.status(400).json({ error: error.message });
      return;
    }

    res.json({ success: true, posts: data || [] });
  } catch (err: any) {
    console.error("[Server Posts] Exception fetching posts:", err);
    res.status(500).json({ error: err?.message || "Failed to fetch posts" });
  }
});

// Server-Side Public Post Creation Endpoint (Guarantees cross-device persistence)
app.post("/api/posts/create", async (req, res) => {
  try {
    const rawPost = req.body;
    if (!rawPost) {
      res.status(400).json({ error: "No post data provided" });
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      res.status(500).json({ error: "Supabase client not available on server" });
      return;
    }

    const imagesList = Array.isArray(rawPost.images) && rawPost.images.length > 0
      ? rawPost.images
      : rawPost.img
      ? [rawPost.img]
      : [];
    const primaryImg = rawPost.img || (imagesList.length > 0 ? imagesList[0] : "");

    // Validate UUID for id
    const isUuidStr = (v?: string) => typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
    const validPostId = rawPost.id && isUuidStr(rawPost.id) ? rawPost.id : crypto.randomUUID();
    const validUserId = (rawPost.user_id && isUuidStr(rawPost.user_id)) ? rawPost.user_id : (rawPost.userId && isUuidStr(rawPost.userId)) ? rawPost.userId : null;

    // Clean public.posts columns:
    // id, user_id, title, description, img, images, created_at
    const postPayload: Record<string, any> = {
      id: validPostId,
      user_id: validUserId,
      title: rawPost.title || rawPost.caption || "Product Offer",
      description: rawPost.description || rawPost.caption || "",
      img: primaryImg,
      images: imagesList.length > 0 ? imagesList : [primaryImg],
      created_at: rawPost.created_at || rawPost.createdAt || new Date().toISOString(),
    };

    console.log(`[Server Post Sync] Saving post to Supabase public.posts table: ${postPayload.title}`);

    let savedData: any = null;
    let savedError: any = null;

    const resInsert = await supabase.from("posts").insert([postPayload]).select().maybeSingle();
    if (!resInsert.error && resInsert.data) {
      savedData = resInsert.data;
    } else {
      if (resInsert.error) {
        console.warn("[Server Post Sync] Initial insert error:", resInsert.error.message);
        // If user_id constraint fails, retry with user_id = null
        if (resInsert.error.code === "23503" || resInsert.error.message.includes("user_id")) {
          const resRetry = await supabase.from("posts").insert([{ ...postPayload, user_id: null }]).select().maybeSingle();
          if (!resRetry.error && resRetry.data) {
            savedData = resRetry.data;
          }
        }
      }
      if (!savedData) {
        const resUpsert = await supabase.from("posts").upsert(postPayload, { onConflict: "id" }).select().maybeSingle();
        if (!resUpsert.error && resUpsert.data) {
          savedData = resUpsert.data;
        } else {
          savedError = resUpsert.error || resInsert.error;
        }
      }
    }

    if (savedError && !savedData) {
      console.error("[Server Post Sync] Failed to save post to Supabase:", savedError);
      res.status(400).json({ error: savedError.message, details: savedError });
      return;
    }

    res.json({ success: true, post: postPayload, data: savedData || postPayload });
  } catch (err: any) {
    console.error("[Server Post Sync] Server error saving post:", err);
    res.status(500).json({ error: err?.message || "Internal server error" });
  }
});

// Server-Side Public Profiles Listing & Search Endpoint
app.get("/api/profiles", async (req, res) => {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      res.status(500).json({ error: "Supabase client not available" });
      return;
    }

    const searchQuery = (req.query.q as string || "").trim();

    let query = supabase.from("profiles").select("*");

    if (searchQuery) {
      const safeFilter = `display_name.ilike.%${searchQuery}%,company_name.ilike.%${searchQuery}%,full_name.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%,location.ilike.%${searchQuery}%`;
      query = query.or(safeFilter);
    } else {
      query = query.order("created_at", { ascending: false });
    }

    const { data, error } = await query.limit(100);

    if (error) {
      console.warn("[Server Profiles Search] Notice:", error.message);
      // Fallback without ordering
      const fallback = await supabase.from("profiles").select("*").limit(100);
      res.json({ success: true, profiles: fallback.data || [] });
      return;
    }

    res.json({ success: true, profiles: data || [] });
  } catch (err: any) {
    console.error("[Server Profiles] Error:", err);
    res.status(500).json({ error: err?.message || "Failed to fetch profiles" });
  }
});

// Server-Side Profile By Identifier (Phone / ID / Name) & Their Public Posts
app.get("/api/profiles/by-identifier", async (req, res) => {
  try {
    const identifier = (req.query.identifier as string || "").trim();
    if (!identifier) {
      res.status(400).json({ error: "Identifier required" });
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      res.status(500).json({ error: "Supabase client not available" });
      return;
    }

    // Try finding profile by phone, id, display_name, or company_name
    let profileData: any = null;

    if (/^\+?\d{8,15}$/.test(identifier.replace(/\s+/g, ""))) {
      const cleanPhone = identifier.trim();
      const { data } = await supabase.from("profiles").select("*").eq("phone", cleanPhone).maybeSingle();
      profileData = data;
    }

    if (!profileData && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier)) {
      const { data } = await supabase.from("profiles").select("*").eq("id", identifier).maybeSingle();
      profileData = data;
    }

    if (!profileData) {
      const cleanIdent = identifier.trim().toLowerCase();
      const isGeneric = /^(dropthan member|dropthan b2b member|verified supplier|supplier|member|admin|user|wholesaler|dropshipper)$/i.test(cleanIdent);
      if (!isGeneric && cleanIdent.length > 2) {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .or(`display_name.eq.${identifier},company_name.eq.${identifier},full_name.eq.${identifier}`)
          .limit(1)
          .maybeSingle();
        profileData = data;
      }
    }

    // Fetch user's public posts strictly for this specific profile
    let userPosts: any[] = [];
    const searchUserId = profileData?.id;
    const rawPhone = profileData?.phone || (/^\+?\d{8,15}$/.test(identifier) ? identifier : null);
    const searchPhone = rawPhone && !rawPhone.includes("9876543210") ? rawPhone : null;
    const rawAuthor = profileData?.company_name || profileData?.display_name || (!/^\+?\d+$/.test(identifier) ? identifier : null);
    const isGenericAuthor = !rawAuthor || /^(dropthan member|dropthan b2b member|verified supplier|supplier|member|admin|user|wholesaler)$/i.test(rawAuthor.trim());
    const searchAuthor = !isGenericAuthor ? rawAuthor.trim() : null;

    if (searchUserId) {
      const { data: postsById } = await supabase.from("posts").select("*").eq("user_id", searchUserId);
      if (postsById && postsById.length > 0) {
        userPosts = postsById;
      }
    }

    if (userPosts.length === 0 && searchPhone) {
      const { data: postsByPhone } = await supabase.from("posts").select("*").eq("phone", searchPhone);
      if (postsByPhone && postsByPhone.length > 0) {
        userPosts = postsByPhone;
      }
    }

    if (userPosts.length === 0 && searchAuthor) {
      const { data: postsByAuthor } = await supabase
        .from("posts")
        .select("*")
        .eq("author", searchAuthor);
      if (postsByAuthor && postsByAuthor.length > 0) {
        userPosts = postsByAuthor;
      }
    }

    res.json({
      success: true,
      profile: profileData,
      posts: userPosts,
    });
  } catch (err: any) {
    console.error("[Server Profile By Identifier] Error:", err);
    res.status(500).json({ error: err?.message || "Failed to fetch user data" });
  }
});

// Server-Side Messages Listing Endpoint (Supports canonical IDs and sender/receiver cross-matching)
app.get("/api/messages", async (req, res) => {
  try {
    const chatId = (req.query.chat_id as string || "").trim();
    const userA = (req.query.user_a as string || req.query.sender_id as string || "").trim();
    const userB = (req.query.user_b as string || req.query.receiver_id as string || "").trim();

    if (!chatId && (!userA || !userB)) {
      res.status(400).json({ error: "chat_id or (user_a and user_b) is required" });
      return;
    }

    const cleanA = (userA || "").replace(/\D/g, "");
    const cleanB = (userB || "").replace(/\D/g, "");
    const possibleChatIds = new Set<string>();
    if (chatId) possibleChatIds.add(chatId);
    if (cleanA && cleanB) {
      const sorted = [cleanA, cleanB].sort();
      possibleChatIds.add(`dm_${sorted[0]}_${sorted[1]}`);
      possibleChatIds.add(`chat_${sorted[0]}_${sorted[1]}`);
      possibleChatIds.add(`chat-usr-${cleanA}`);
      possibleChatIds.add(`chat-usr-${cleanB}`);
    }

    const supabase = getSupabaseClient();
    let supabaseMessages: any[] = [];

    if (supabase) {
      try {
        const idList = Array.from(possibleChatIds);
        if (idList.length > 0) {
          const { data, error } = await supabase
            .from("messages")
            .select("*")
            .in("chat_id", idList)
            .order("created_at", { ascending: true });

          if (!error && data) {
            supabaseMessages = data;
          }
        }

        // If sender/receiver query provided, also check cross pairs
        if (userA && userB) {
          const { data: pairData } = await supabase
            .from("messages")
            .select("*")
            .or(`and(sender_id.eq.${userA},receiver_id.eq.${userB}),and(sender_id.eq.${userB},receiver_id.eq.${userA})`)
            .order("created_at", { ascending: true });

          if (pairData && pairData.length > 0) {
            const existingIds = new Set(supabaseMessages.map((m) => String(m.id)));
            pairData.forEach((m) => {
              if (!existingIds.has(String(m.id))) {
                supabaseMessages.push(m);
                existingIds.add(String(m.id));
              }
            });
          }
        }
      } catch (dbErr) {
        console.warn("[Server Messages DB Query] Notice:", dbErr);
      }
    }

    // Merge with server-side stored messages
    const localStored = getStoredMessages();
    const matchedLocal = localStored.filter((m) => {
      if (possibleChatIds.has(m.chat_id)) return true;
      if (cleanA && cleanB) {
        const sDigits = (m.sender_id || "").replace(/\D/g, "");
        const rDigits = (m.receiver_id || "").replace(/\D/g, "");
        if ((sDigits === cleanA && rDigits === cleanB) || (sDigits === cleanB && rDigits === cleanA)) {
          return true;
        }
      }
      return false;
    });

    const mergedMap = new Map<string, any>();
    supabaseMessages.forEach((m) => mergedMap.set(String(m.id || `${m.sender_id}_${m.created_at}`), m));
    matchedLocal.forEach((m) => mergedMap.set(String(m.id || `${m.sender_id}_${m.created_at}`), m));

    const finalMessages = Array.from(mergedMap.values()).sort((a, b) => {
      return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
    });

    res.json({ success: true, messages: finalMessages });
  } catch (err: any) {
    console.error("[Server Messages] Exception:", err);
    res.status(500).json({ error: err?.message || "Failed to fetch messages" });
  }
});

// Server-Side All Active Threads Endpoint for a User
app.get("/api/messages/threads", async (req, res) => {
  try {
    const userIdentifier = (req.query.user_id as string || req.query.phone as string || "").trim();
    if (!userIdentifier) {
      res.status(400).json({ error: "user_id or phone parameter required" });
      return;
    }

    const cleanUser = userIdentifier.replace(/\D/g, "");
    const supabase = getSupabaseClient();
    let allMessages: any[] = [];

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("messages")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(500);

        if (!error && data) {
          allMessages = data;
        }
      } catch (e) {}
    }

    // Merge with local store
    const local = getStoredMessages();
    const combinedMap = new Map<string, any>();
    allMessages.forEach((m) => combinedMap.set(String(m.id), m));
    local.forEach((m) => combinedMap.set(String(m.id), m));

    const userMessages = Array.from(combinedMap.values()).filter((m) => {
      const s = String(m.sender_id || "").replace(/\D/g, "");
      const r = String(m.receiver_id || "").replace(/\D/g, "");
      const c = String(m.chat_id || "");
      return (
        s === cleanUser ||
        r === cleanUser ||
        (cleanUser && c.includes(cleanUser)) ||
        m.sender_id === userIdentifier ||
        m.receiver_id === userIdentifier
      );
    });

    res.json({ success: true, count: userMessages.length, messages: userMessages });
  } catch (err: any) {
    console.error("[Server Messages Threads] Error:", err);
    res.status(500).json({ error: err?.message || "Failed to fetch threads" });
  }
});

// Server-Side Message Creation Endpoint (Guarantees Realtime and Multi-User Delivery)
app.post("/api/messages/create", async (req, res) => {
  try {
    const rawMsg = req.body;
    if (!rawMsg || !rawMsg.chat_id) {
      res.status(400).json({ error: "chat_id and payload required" });
      return;
    }

    const cleanSender = String(rawMsg.sender_id || "").replace(/\D/g, "");
    const cleanReceiver = String(rawMsg.receiver_id || "").replace(/\D/g, "");
    let canonicalChatId = rawMsg.chat_id;
    if (cleanSender && cleanReceiver && !canonicalChatId.startsWith("dm_")) {
      const sorted = [cleanSender, cleanReceiver].sort();
      canonicalChatId = `dm_${sorted[0]}_${sorted[1]}`;
    }

    const msgPayload: Record<string, any> = {
      chat_id: canonicalChatId,
      sender_id: rawMsg.sender_id || "",
      receiver_id: rawMsg.receiver_id || null,
      sender_name: rawMsg.sender_name || null,
      text: rawMsg.text || rawMsg.content || "",
      media_url: rawMsg.media_url || rawMsg.mediaUrl || null,
      is_me: Boolean(rawMsg.is_me),
      timestamp: rawMsg.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      created_at: rawMsg.created_at || new Date().toISOString(),
    };

    if (rawMsg.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawMsg.id)) {
      msgPayload.id = rawMsg.id;
    } else if (rawMsg.id) {
      msgPayload.id = rawMsg.id;
    }

    // 1. Always save in server-side persistent store
    saveStoredMessage(msgPayload);

    // 2. Insert into Supabase messages table
    const supabase = getSupabaseClient();
    let savedData: any = null;

    if (supabase) {
      for (let attempt = 0; attempt < 6; attempt++) {
        const resInsert = await supabase.from("messages").insert([msgPayload]).select();
        if (!resInsert.error) {
          savedData = resInsert.data;
          console.log(`[Server Messages Sync] Inserted message on attempt ${attempt + 1}!`);
          break;
        }

        const savedError = resInsert.error;
        console.warn(`[Server Messages Sync] Attempt ${attempt + 1} notice:`, savedError.message);

        if (savedError.message.includes("uuid") || savedError.code === "22P02" || savedError.code === "23505") {
          delete msgPayload.id;
          continue;
        }

        const missingColMatch = savedError.message.match(/Could not find the '(\w+)' column/i) ||
                                savedError.message.match(/column "?(\w+)"? of relation "messages" does not exist/i) ||
                                savedError.message.match(/column "(\w+)" does not exist/i);

        if (missingColMatch && missingColMatch[1] && msgPayload[missingColMatch[1]] !== undefined) {
          delete msgPayload[missingColMatch[1]];
          continue;
        }

        if (savedError.message.includes("content") && !msgPayload.content) {
          msgPayload.content = msgPayload.text;
        }

        break;
      }
    }

    res.json({ success: true, message: msgPayload, data: savedData });
  } catch (err: any) {
    console.error("[Server Messages Sync] Exception:", err);
    res.status(500).json({ error: err?.message || "Internal server error" });
  }
});

// App Config & Credentials Endpoint
app.get("/api/config", (_req, res) => {
  res.json({
    supabaseUrl: process.env.VITE_SUPABASE_URL || "https://zxbifidxkpbsissjwgnm.supabase.co",
    supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_s8wtq-Mx3OMobIMCSZ69cA_gzo9VbvJ",
    googleMapsKey: process.env.GOOGLE_MAPS_PLATFORM_KEY || "",
  });
});

// Server-Side Profile Upsert Endpoint
app.post("/api/profiles/upsert", async (req, res) => {
  try {
    const rawProfile = req.body;
    if (!rawProfile) {
      res.status(400).json({ error: "No profile payload provided" });
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      res.status(500).json({ error: "Supabase client not initialized on server" });
      return;
    }

    const cleanPhone = (rawProfile.phone || '').trim();
    const compName = rawProfile.company_name || rawProfile.companyName || null;
    const flName = rawProfile.full_name || rawProfile.fullName || rawProfile.name || null;
    const dispName = rawProfile.display_name || rawProfile.displayName || compName || flName || (cleanPhone ? `Member ${cleanPhone.slice(-4)}` : 'Member');
    const websiteVal = rawProfile.website || rawProfile.websiteUrl || rawProfile.website_url || null;
    const bioVal = rawProfile.bio || rawProfile.description || rawProfile.about || null;

    // Clean payload containing only standard public.profiles columns (NO 'description', 'website_url', etc.)
    const profilePayload: Record<string, any> = {
      phone: cleanPhone || null,
      role: rawProfile.role || 'wholesaler',
      display_name: dispName,
      company_name: compName || dispName,
      location: rawProfile.location || '',
      country: rawProfile.country || 'India',
      status: rawProfile.status || 'Active',
      created_at: rawProfile.created_at || rawProfile.createdAt || new Date().toISOString(),
    };

    if (rawProfile.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawProfile.id)) {
      profilePayload.id = rawProfile.id;
    }
    if (flName) profilePayload.full_name = flName;
    if (rawProfile.password) {
      profilePayload.password = rawProfile.password;
      if (cleanPhone) {
        saveCredential(cleanPhone, rawProfile.password, profilePayload.id);
      }
    }
    if (rawProfile.store_address || rawProfile.storeAddress) profilePayload.store_address = rawProfile.store_address || rawProfile.storeAddress;
    if (rawProfile.avatar_url || rawProfile.avatarUrl) profilePayload.avatar_url = rawProfile.avatar_url || rawProfile.avatarUrl;
    if (bioVal) profilePayload.bio = bioVal;
    if (rawProfile.gstin) profilePayload.gstin = rawProfile.gstin;
    if (rawProfile.iec_code || rawProfile.iecCode) profilePayload.iec_code = rawProfile.iec_code || rawProfile.iecCode;
    if (websiteVal) profilePayload.website = websiteVal;
    if (rawProfile.instagram || rawProfile.instagramHandle || rawProfile.instagram_handle) {
      profilePayload.instagram = rawProfile.instagram || rawProfile.instagramHandle || rawProfile.instagram_handle;
    }
    if (rawProfile.lat !== undefined && rawProfile.lat !== null) profilePayload.lat = Number(rawProfile.lat);
    if (rawProfile.lng !== undefined && rawProfile.lng !== null) profilePayload.lng = Number(rawProfile.lng);

    console.log(`[Server Profile Sync] Attempting Supabase upsert for profile: ${cleanPhone} (${dispName})`);

    // 1. If we have a phone, try to update existing record first (bypasses foreign key check if row already exists)
    if (cleanPhone) {
      const { data: existingCheck } = await supabase.from('profiles').select('id').eq('phone', cleanPhone);
      if (existingCheck && existingCheck.length > 0) {
        const { error: updateErr } = await supabase
          .from('profiles')
          .update(profilePayload)
          .eq('phone', cleanPhone);

        if (!updateErr) {
          console.log(`[Server Profile Sync] Successfully updated existing profile in Supabase by phone!`);
          return res.json({ success: true, method: "update_by_phone" });
        }
      }
    }

    // 2. Ensure auth user if id is required or missing
    if (!profilePayload.id && cleanPhone) {
      const digits = cleanPhone.replace(/\D/g, '');
      const email = `usr_${digits}@dropthan.app`;
      const password = `DropthanPass_${digits}!2026`;
      try {
        const { data: signInData } = await supabase.auth.signInWithPassword({ email, password });
        if (signInData?.user?.id) {
          profilePayload.id = signInData.user.id;
        } else {
          const { data: signUpData } = await supabase.auth.signUp({ email, password, options: { data: { phone: cleanPhone } } });
          if (signUpData?.user?.id) {
            profilePayload.id = signUpData.user.id;
          }
        }
      } catch (authErr) {
        console.warn("[Server Profile Sync] Server Auth check notice:", authErr);
      }
    }

    // 3. Multi-attempt adaptive upsert / update loop
    let data: any = null;
    let error: any = null;
    let saved = false;

    for (let attempt = 0; attempt < 8; attempt++) {
      const upsertRes = await supabase
        .from("profiles")
        .upsert(profilePayload, { onConflict: profilePayload.id ? "id" : "phone" });

      if (!upsertRes.error) {
        data = upsertRes.data;
        saved = true;
        break;
      }

      error = upsertRes.error;
      console.warn(`[Server Profile Sync] Attempt ${attempt + 1} notice:`, error.message);

      // Extract unknown column from error message and remove from payload
      const missingColMatch = error.message.match(/Could not find the '(\w+)' column/i) ||
                              error.message.match(/column "?(\w+)"? of relation "profiles" does not exist/i) ||
                              error.message.match(/column "(\w+)" does not exist/i);

      if (missingColMatch && missingColMatch[1] && profilePayload[missingColMatch[1]] !== undefined) {
        console.log(`[Server Profile Sync] Pruning unmapped column '${missingColMatch[1]}' and retrying...`);
        delete profilePayload[missingColMatch[1]];
        continue;
      }

      // If foreign key constraint failed on id, remove id and update by phone
      if (cleanPhone && (error.code === '23503' || error.message.includes('foreign key') || error.message.includes('profiles_id_fkey'))) {
        delete profilePayload.id;
        const { error: updateErr } = await supabase
          .from("profiles")
          .update(profilePayload)
          .eq("phone", cleanPhone);
        if (!updateErr) {
          console.log(`[Server Profile Sync] Successfully updated profile by phone in Supabase (bypassed FK)!`);
          return res.json({ success: true, method: "update_by_phone" });
        }
      }

      break;
    }

    // 4. Fallback: try update by phone
    if (!saved && cleanPhone) {
      const { error: updateErr } = await supabase
        .from("profiles")
        .update(profilePayload)
        .eq("phone", cleanPhone);
      if (!updateErr) {
        console.log(`[Server Profile Sync] Successfully updated profile by phone in Supabase!`);
        return res.json({ success: true, method: "update_by_phone" });
      }
    }

    if (!saved && error) {
      console.error("[Server Profile Sync] Supabase profile upsert error:", error);
      return res.status(400).json({ error: error.message, details: error });
    }

    console.log(`[Server Profile Sync] Successfully upserted profile into Supabase!`);
    res.json({ success: true, data });
  } catch (err: any) {
    console.error("[Server Profile Sync] Server exception during profile upsert:", err);
    res.status(500).json({ error: err?.message || "Internal server error during profile sync" });
  }
});

// Server-Side Strict Unified Authentication Endpoint: Sign In OR Register Seamlessly
app.post("/api/auth/authenticate", async (req, res) => {
  try {
    const rawProfile = req.body || {};
    const { phone, password } = rawProfile;
    if (!phone || !password) {
      res.status(400).json({ error: "Phone number and password are required" });
      return;
    }

    const cleanPhone = phone.trim();
    const cleanDigits = cleanPhone.replace(/\D/g, '');
    const cleanPassword = password.trim();

    if (cleanPassword.length < 4) {
      res.status(400).json({ error: "Password must be at least 4 characters" });
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      res.status(500).json({ error: "Database client unavailable on server" });
      return;
    }

    console.log(`[Server Auth Unified] Processing authentication for phone: ${cleanPhone}`);

    const credsMap = getStoredCredentials();
    const fileCred = credsMap[cleanDigits];

    // 1. Check if profile already exists by exact phone or phone digits in Supabase
    let existingProfile: any = null;
    const { data: exactMatch } = await supabase
      .from("profiles")
      .select("*")
      .eq("phone", cleanPhone)
      .maybeSingle();

    if (exactMatch) {
      existingProfile = exactMatch;
    } else if (cleanDigits) {
      const { data: listData } = await supabase.from("profiles").select("*").limit(200);
      if (listData) {
        existingProfile = listData.find((p: any) => p.phone && p.phone.replace(/\D/g, '') === cleanDigits);
      }
    }

    // Determine stored password from database OR persistent file store
    const registeredPassword = (existingProfile?.password || fileCred?.password || "").trim();

    // 2. If account exists in database OR credentials store -> STRICT PASSWORD VERIFICATION
    if (existingProfile || fileCred) {
      if (registeredPassword) {
        if (registeredPassword !== cleanPassword) {
          console.warn(`[Server Auth Unified] ❌ Password mismatch for phone: ${cleanPhone}. Entered: "${cleanPassword}" vs Registered: "${registeredPassword}"`);
          res.status(401).json({
            success: false,
            error: "Password not correct",
            invalidPassword: true,
          });
          return;
        }
      } else {
        // Legacy profile with no password recorded: assign entered password
        saveCredential(cleanPhone, cleanPassword, existingProfile?.id);
        try {
          if (existingProfile?.id) {
            await supabase.from("profiles").update({ password: cleanPassword }).eq("id", existingProfile.id);
            existingProfile.password = cleanPassword;
          }
        } catch (e) {}
      }

      // Sync and store verified credential
      saveCredential(cleanPhone, cleanPassword, existingProfile?.id);
      if (existingProfile && !existingProfile.password) {
        existingProfile.password = cleanPassword;
      }

      console.log(`[Server Auth Unified] ✅ Existing user logged in successfully: ${existingProfile?.display_name || cleanPhone}`);
      res.json({
        success: true,
        isNewUser: false,
        profile: existingProfile || {
          id: fileCred?.userId || `usr_${cleanDigits}`,
          phone: cleanPhone,
          password: cleanPassword,
          role: 'wholesaler',
          display_name: `Member ${cleanPhone.slice(-4)}`,
          status: 'Active',
          created_at: new Date().toISOString(),
        },
      });
      return;
    }

    // 3. If profile does not exist -> REGISTER NEW USER
    console.log(`[Server Auth Unified] 🆕 New user detected. Creating profile for phone: ${cleanPhone}`);

    const compName = rawProfile.company_name || rawProfile.companyName || '';
    const flName = rawProfile.full_name || rawProfile.fullName || '';
    const dispName = rawProfile.display_name || rawProfile.displayName || compName || flName || `Member ${cleanPhone.slice(-4)}`;
    const websiteVal = rawProfile.website || rawProfile.websiteUrl || rawProfile.website_url || null;
    const bioVal = rawProfile.bio || rawProfile.description || rawProfile.about || null;
    const newId = rawProfile.id || `usr_${cleanDigits || Date.now()}`;

    // Save to persistent credentials store immediately
    saveCredential(cleanPhone, cleanPassword, newId);

    const newProfilePayload: Record<string, any> = {
      id: newId,
      phone: cleanPhone,
      password: cleanPassword,
      role: rawProfile.role || 'wholesaler',
      display_name: dispName,
      company_name: compName || dispName,
      location: rawProfile.location || '',
      country: rawProfile.country || 'India',
      status: rawProfile.status || 'Active',
      created_at: rawProfile.created_at || rawProfile.createdAt || new Date().toISOString(),
    };

    if (flName) newProfilePayload.full_name = flName;
    if (rawProfile.store_address || rawProfile.storeAddress) newProfilePayload.store_address = rawProfile.store_address || rawProfile.storeAddress;
    if (rawProfile.avatar_url || rawProfile.avatarUrl) newProfilePayload.avatar_url = rawProfile.avatar_url || rawProfile.avatarUrl;
    if (bioVal) newProfilePayload.bio = bioVal;
    if (rawProfile.gstin) newProfilePayload.gstin = rawProfile.gstin;
    if (rawProfile.iec_code || rawProfile.iecCode) newProfilePayload.iec_code = rawProfile.iec_code || rawProfile.iecCode;
    if (websiteVal) newProfilePayload.website = websiteVal;
    if (rawProfile.instagram || rawProfile.instagramHandle || rawProfile.instagram_handle) {
      newProfilePayload.instagram = rawProfile.instagram || rawProfile.instagramHandle || rawProfile.instagram_handle;
    }
    if (rawProfile.lat !== undefined && rawProfile.lat !== null) newProfilePayload.lat = Number(rawProfile.lat);
    if (rawProfile.lng !== undefined && rawProfile.lng !== null) newProfilePayload.lng = Number(rawProfile.lng);

    const { data: insertedData, error: insertError } = await supabase
      .from("profiles")
      .insert([newProfilePayload])
      .select()
      .maybeSingle();

    if (insertError) {
      console.warn("[Server Auth Unified] Supabase insert warning:", insertError);
    }

    const finalProfile = insertedData || newProfilePayload;
    console.log(`[Server Auth Unified] ✅ New user registration completed for: ${dispName}`);

    res.json({
      success: true,
      isNewUser: true,
      profile: finalProfile,
    });
  } catch (err: any) {
    console.error("[Server Auth Unified] Exception:", err);
    res.status(500).json({ error: err?.message || "Internal server error during authentication" });
  }
});

// Server-Side Strict Authentication: Phone & Password Login Endpoint
app.post("/api/auth/login", async (req, res) => {
  try {
    const { phone, password } = req.body || {};
    if (!phone || !password) {
      res.status(400).json({ error: "Phone number and password are required" });
      return;
    }

    const cleanPhone = phone.trim();
    const cleanDigits = cleanPhone.replace(/\D/g, '');
    const cleanPassword = password.trim();

    const supabase = getSupabaseClient();
    if (!supabase) {
      res.status(500).json({ error: "Database client unavailable on server" });
      return;
    }

    console.log(`[Server Auth Login] Verifying credentials for phone: ${cleanPhone}`);

    const credsMap = getStoredCredentials();
    const fileCred = credsMap[cleanDigits];

    // 1. Fetch profile by phone from database
    let profileData: any = null;
    const { data: exactMatch } = await supabase
      .from("profiles")
      .select("*")
      .eq("phone", cleanPhone)
      .maybeSingle();

    if (exactMatch) {
      profileData = exactMatch;
    } else if (cleanDigits) {
      const { data: listData } = await supabase
        .from("profiles")
        .select("*")
        .limit(150);
      if (listData) {
        profileData = listData.find((p: any) => p.phone && p.phone.replace(/\D/g, '') === cleanDigits);
      }
    }

    if (!profileData && !fileCred) {
      res.status(404).json({
        error: "No account found with this phone number. Please register first.",
        notFound: true,
      });
      return;
    }

    const storedPassword = (profileData?.password || fileCred?.password || "").trim();

    // 2. Strict password matching check
    if (storedPassword) {
      if (storedPassword !== cleanPassword) {
        console.warn(`[Server Auth Login] ❌ Password mismatch for phone: ${cleanPhone}. Entered: "${cleanPassword}" vs Stored: "${storedPassword}"`);
        res.status(401).json({
          error: "Password not correct",
          invalidPassword: true,
        });
        return;
      }
    } else {
      // If legacy profile had no stored password, save entered password
      saveCredential(cleanPhone, cleanPassword, profileData?.id);
      try {
        if (profileData?.id) {
          await supabase
            .from("profiles")
            .update({ password: cleanPassword })
            .eq("id", profileData.id);
          profileData.password = cleanPassword;
        }
      } catch (e) {}
    }

    saveCredential(cleanPhone, cleanPassword, profileData?.id);
    if (profileData && !profileData.password) {
      profileData.password = cleanPassword;
    }

    console.log(`[Server Auth Login] ✅ Authentication successful for user: ${profileData?.display_name || cleanPhone}`);
    res.json({
      success: true,
      profile: profileData || {
        id: fileCred?.userId || `usr_${cleanDigits}`,
        phone: cleanPhone,
        password: cleanPassword,
        role: 'wholesaler',
        display_name: `Member ${cleanPhone.slice(-4)}`,
        status: 'Active',
      },
    });
  } catch (err: any) {
    console.error("[Server Auth Login] Exception during login:", err);
    res.status(500).json({ error: err?.message || "Internal server error during authentication" });
  }
});

// Server-Side Strict Authentication: Phone & Password Registration / Signup Endpoint
app.post("/api/auth/signup", async (req, res) => {
  try {
    const rawProfile = req.body;
    const { phone, password } = rawProfile || {};
    if (!phone || !password) {
      res.status(400).json({ error: "Phone number and password are required for registration" });
      return;
    }

    const cleanPhone = phone.trim();
    const cleanDigits = cleanPhone.replace(/\D/g, '');
    const cleanPassword = password.trim();

    if (cleanPassword.length < 4) {
      res.status(400).json({ error: "Password must be at least 4 characters" });
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      res.status(500).json({ error: "Database client unavailable on server" });
      return;
    }

    console.log(`[Server Auth Signup] Checking duplicate account for phone: ${cleanPhone}`);

    // 1. Check if phone number already registered
    let existingProfile: any = null;
    const { data: exactMatch } = await supabase
      .from("profiles")
      .select("*")
      .eq("phone", cleanPhone)
      .maybeSingle();

    if (exactMatch) {
      existingProfile = exactMatch;
    } else if (cleanDigits) {
      const { data: listData } = await supabase.from("profiles").select("*").limit(150);
      if (listData) {
        existingProfile = listData.find((p: any) => p.phone && p.phone.replace(/\D/g, '') === cleanDigits);
      }
    }

    if (existingProfile) {
      console.warn(`[Server Auth Signup] ⚠️ Account already exists for phone: ${cleanPhone}`);
      res.status(409).json({
        error: "An account with this phone number already exists. Please log in instead.",
        isExisting: true,
        profile: existingProfile,
      });
      return;
    }

    console.log(`[Server Auth Signup] ✅ New phone verified. Registering profile for: ${cleanPhone}`);
    res.json({
      success: true,
      message: "Ready for registration",
    });
  } catch (err: any) {
    console.error("[Server Auth Signup] Exception:", err);
    res.status(500).json({ error: err?.message || "Internal server error during registration verification" });
  }
});

// Server-Side Admin Approval Status Toggle Endpoint
app.post("/api/admin/approval-status", async (req, res) => {
  try {
    const { userId, phone, isApproved, status, rejectionReason } = req.body;
    if (!userId && !phone) {
      res.status(400).json({ error: "userId or phone is required" });
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      res.status(500).json({ error: "Supabase client not initialized" });
      return;
    }

    const approvedBool = Boolean(isApproved);
    const newStatus = status || (approvedBool ? "Active" : "Pending");

    const updatePayload: Record<string, any> = {
      is_gst_approved: approvedBool,
      status: newStatus,
      rejection_reason: rejectionReason || null,
    };

    console.log(`[Server Admin Approval] Setting is_gst_approved=${approvedBool}, status=${newStatus} for user:`, userId || phone);

    let query = supabase.from("profiles").update(updatePayload);
    if (userId) {
      query = query.eq("id", userId);
    } else if (phone) {
      query = query.eq("phone", phone);
    }

    let { data, error } = await query.select();

    // Fallback without is_gst_approved if column is not yet present in schema
    if (error && (error.message.includes("is_gst_approved") || error.code === "42703")) {
      console.warn("[Server Admin Approval] is_gst_approved column variance, falling back to status column update:", error.message);
      delete updatePayload.is_gst_approved;
      let fallbackQuery = supabase.from("profiles").update(updatePayload);
      if (userId) fallbackQuery = fallbackQuery.eq("id", userId);
      else if (phone) fallbackQuery = fallbackQuery.eq("phone", phone);
      const fbRes = await fallbackQuery.select();
      data = fbRes.data;
      error = fbRes.error;
    }

    if (error) {
      console.error("[Server Admin Approval] Error updating approval status in Supabase:", error);
      res.status(400).json({ error: error.message });
      return;
    }

    res.json({ success: true, is_gst_approved: approvedBool, status: newStatus, data });
  } catch (err: any) {
    console.error("[Server Admin Approval] Server exception:", err);
    res.status(500).json({ error: err?.message || "Internal server error" });
  }
});

// Server-Side Secure User Account Deletion Endpoint (Deletes profile and cascaded/associated posts)
app.post("/api/admin/delete-user", async (req, res) => {
  try {
    const { userId, phone } = req.body;
    if (!userId && !phone) {
      res.status(400).json({ error: "userId or phone is required" });
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      res.status(500).json({ error: "Supabase client not initialized" });
      return;
    }

    console.log(`[Server Admin Delete] Deleting user account and cascaded data:`, { userId, phone });

    // 1. Delete associated posts explicitly (in case CASCADE is pending on database)
    try {
      if (userId) {
        await supabase.from("posts").delete().eq("user_id", userId);
      }
      if (phone) {
        await supabase.from("posts").delete().eq("phone", phone);
      }
    } catch (postDelErr) {
      console.warn("[Server Admin Delete] Notice deleting posts:", postDelErr);
    }

    // 2. Delete profile from profiles table
    let delQuery = supabase.from("profiles").delete();
    if (userId) {
      delQuery = delQuery.eq("id", userId);
    } else if (phone) {
      delQuery = delQuery.eq("phone", phone);
    }

    const { error: profileDelErr } = await delQuery;
    if (profileDelErr) {
      console.error("[Server Admin Delete] Error deleting profile from Supabase:", profileDelErr);
      res.status(400).json({ error: profileDelErr.message });
      return;
    }

    res.json({ success: true, message: "User profile and associated data deleted successfully" });
  } catch (err: any) {
    console.error("[Server Admin Delete] Server exception:", err);
    res.status(500).json({ error: err?.message || "Internal server error during account deletion" });
  }
});

// Server-Side Admin Pre-Registration Endpoint (Seamless manual creation of wholesaler / supplier accounts)
app.post("/api/admin/pre-register", async (req, res) => {
  try {
    const rawProfile = req.body || {};
    const { phone, password } = rawProfile;

    if (!phone || !password) {
      res.status(400).json({ error: "Phone number and password are required for pre-registration." });
      return;
    }

    const cleanPhone = phone.trim();
    const cleanDigits = cleanPhone.replace(/\D/g, "");
    const cleanPassword = password.trim();

    if (cleanPassword.length < 4) {
      res.status(400).json({ error: "Password must be at least 4 characters long." });
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      res.status(500).json({ error: "Database connection unavailable on server." });
      return;
    }

    console.log(`[Server Admin Pre-Register] Pre-registering account for phone: ${cleanPhone}`);

    // Check if account already exists
    let existingProfile: any = null;
    const { data: exactMatch } = await supabase
      .from("profiles")
      .select("*")
      .eq("phone", cleanPhone)
      .maybeSingle();

    if (exactMatch) {
      existingProfile = exactMatch;
    } else if (cleanDigits && cleanDigits.length >= 7) {
      const { data: listData } = await supabase.from("profiles").select("*").limit(300);
      if (listData) {
        existingProfile = listData.find((p: any) => {
          const pDigits = (p.phone || "").replace(/\D/g, "");
          return pDigits === cleanDigits || (pDigits.length >= 10 && cleanDigits.length >= 10 && pDigits.slice(-10) === cleanDigits.slice(-10));
        });
      }
    }

    const compName = rawProfile.company_name || rawProfile.companyName || (existingProfile ? existingProfile.company_name : "");
    const flName = rawProfile.full_name || rawProfile.fullName || (existingProfile ? existingProfile.full_name : "");
    const dispName = rawProfile.display_name || rawProfile.displayName || compName || flName || (existingProfile ? existingProfile.display_name : `Member ${cleanPhone.slice(-4)}`);
    const targetRole = rawProfile.role || (existingProfile ? existingProfile.role : "wholesaler");
    const targetStatus = rawProfile.status || (existingProfile ? existingProfile.status : "Active");
    const targetId = existingProfile?.id || rawProfile.id || `usr_${cleanDigits || Date.now()}`;

    // Record credentials in server store
    saveCredential(cleanPhone, cleanPassword, targetId);

    const payloadToSave: Record<string, any> = {
      id: targetId,
      phone: cleanPhone,
      password: cleanPassword,
      role: targetRole,
      display_name: dispName,
      company_name: compName || dispName,
      location: rawProfile.location || (existingProfile ? existingProfile.location : ""),
      country: rawProfile.country || (existingProfile ? existingProfile.country : "India"),
      status: targetStatus,
      is_gst_approved: targetStatus === "Active",
      created_at: existingProfile?.created_at || rawProfile.created_at || new Date().toISOString(),
    };

    if (flName) payloadToSave.full_name = flName;
    if (rawProfile.store_address || rawProfile.storeAddress) payloadToSave.store_address = rawProfile.store_address || rawProfile.storeAddress;
    if (rawProfile.gstin) payloadToSave.gstin = rawProfile.gstin;
    if (rawProfile.iec_code || rawProfile.iecCode) payloadToSave.iec_code = rawProfile.iec_code || rawProfile.iecCode;
    if (rawProfile.bio || rawProfile.description) payloadToSave.bio = rawProfile.bio || rawProfile.description;
    if (rawProfile.website || rawProfile.websiteUrl) payloadToSave.website = rawProfile.website || rawProfile.websiteUrl;
    if (rawProfile.avatar_url || rawProfile.avatarUrl) payloadToSave.avatar_url = rawProfile.avatar_url || rawProfile.avatarUrl;

    let savedData: any = null;
    let savedError: any = null;

    if (existingProfile) {
      const { data: updData, error: updErr } = await supabase
        .from("profiles")
        .update(payloadToSave)
        .eq("id", existingProfile.id)
        .select()
        .maybeSingle();

      savedData = updData;
      savedError = updErr;
    } else {
      const { data: insData, error: insErr } = await supabase
        .from("profiles")
        .upsert(payloadToSave, { onConflict: "phone" })
        .select()
        .maybeSingle();

      savedData = insData;
      savedError = insErr;
    }

    if (savedError) {
      console.warn("[Server Admin Pre-Register] Supabase error, retrying without non-standard fields:", savedError);
      // Prune optional columns and retry
      delete payloadToSave.is_gst_approved;
      const { data: retryData, error: retryErr } = await supabase
        .from("profiles")
        .upsert(payloadToSave, { onConflict: "phone" })
        .select()
        .maybeSingle();

      if (retryErr) {
        console.error("[Server Admin Pre-Register] Retry error:", retryErr);
        res.status(400).json({ error: retryErr.message });
        return;
      }
      savedData = retryData;
    }

    const finalProfile = savedData || payloadToSave;
    console.log(`[Server Admin Pre-Register] ✅ Account successfully saved for ${dispName} (${cleanPhone})`);

    res.json({
      success: true,
      isNewUser: !existingProfile,
      profile: finalProfile,
    });
  } catch (err: any) {
    console.error("[Server Admin Pre-Register] Exception:", err);
    res.status(500).json({ error: err?.message || "Internal server error during pre-registration" });
  }
});

// Server-Side File Upload Endpoint with Multi-Bucket Supabase Storage Integration (Up to 50MB)
app.post("/api/upload", async (req, res) => {
  try {
    const { fileData, fileName, bucket, hintCategory } = req.body;
    if (!fileData) {
      res.status(400).json({ error: "No file data provided" });
      return;
    }

    const cleanFileName = (fileName || `upload-${Date.now()}.jpg`).replace(/[^a-zA-Z0-9.-]/g, "_");
    const base64Match = fileData.match(/^data:([^;]+);base64,(.+)$/);
    
    let buffer: Buffer;
    let contentType = "image/jpeg";

    if (base64Match) {
      contentType = base64Match[1];
      buffer = Buffer.from(base64Match[2], "base64");
    } else {
      buffer = Buffer.from(fileData, "base64");
    }

    // Check size limit: 50MB = 52,428,800 bytes
    if (buffer.length > 52428800) {
      res.status(400).json({ error: "File size exceeds 50MB limit" });
      return;
    }

    // Smart bucket resolution
    let primaryBucket = bucket;
    if (!primaryBucket || primaryBucket === "default") {
      if (contentType.startsWith("video/")) {
        primaryBucket = "user_videos";
      } else if (cleanFileName.includes("avatar") || hintCategory === "avatar") {
        primaryBucket = "avatars";
      } else if (hintCategory === "offer" || hintCategory === "product" || hintCategory === "offers") {
        primaryBucket = "offers";
      } else {
        primaryBucket = "user_photos";
      }
    }

    let publicUrl: string | null = null;
    let supabaseError: any = null;
    let successfulBucket: string | null = null;

    // 1. Primary & Exclusive Route for Images: Direct to Cloudinary (cloud: jc7xqqko, preset: dropthan)
    if (contentType.startsWith("image/")) {
      try {
        console.log(`[Server Upload] Uploading image buffer directly to Cloudinary (cloud: jc7xqqko, preset: dropthan)...`);
        const cldFormData = new FormData();
        const base64Str = fileData.startsWith("data:") ? fileData : `data:${contentType};base64,${fileData}`;
        cldFormData.append("file", base64Str);
        cldFormData.append("upload_preset", "dropthan");

        const cldRes = await fetch("https://api.cloudinary.com/v1_1/jc7xqqko/image/upload", {
          method: "POST",
          body: cldFormData,
        });

        if (cldRes.ok) {
          const cldData: any = await cldRes.json();
          if (cldData && cldData.secure_url) {
            console.log(`[Server Upload] Cloudinary upload successful: ${cldData.secure_url}`);
            return res.json({ success: true, url: cldData.secure_url });
          }
        } else {
          const errTxt = await cldRes.text();
          console.warn(`[Server Upload] Cloudinary response error (${cldRes.status}):`, errTxt);
        }
      } catch (cldErr: any) {
        console.error("[Server Upload] Cloudinary exception:", cldErr?.message || cldErr);
      }

      // If Cloudinary failed for image, return base64 data URL preview (bypassing Supabase storage)
      const base64Str = fileData.startsWith("data:") ? fileData : `data:${contentType};base64,${fileData}`;
      return res.json({ success: true, url: base64Str });
    }

    // 2. Candidate fallback bucket sequence if Cloudinary was not used
    if (!publicUrl) {
      const candidateBuckets = Array.from(
        new Set([primaryBucket, "offers", "user_photos", "avatars", "user_videos", "products", "documents"])
      );

      const supabase = getSupabaseClient();
      if (supabase) {
        for (const targetBucket of candidateBuckets) {
          try {
            console.log(`[Server Upload] Attempting upload to Supabase bucket "${targetBucket}" path "${cleanFileName}"...`);
            const { data, error } = await supabase.storage.from(targetBucket).upload(cleanFileName, buffer, {
              contentType,
              upsert: true,
            });

            if (!error && data) {
              const { data: urlData } = supabase.storage.from(targetBucket).getPublicUrl(cleanFileName);
              if (urlData?.publicUrl) {
                publicUrl = urlData.publicUrl;
                successfulBucket = targetBucket;
                console.log(`[Server Upload] Successfully stored in Supabase Storage bucket "${targetBucket}": ${publicUrl}`);
                break;
              }
            } else {
              supabaseError = error;
              console.log(`[Server Upload] Notice for bucket "${targetBucket}": ${error?.message || error}. Trying next bucket candidate...`);
            }
          } catch (err: any) {
            supabaseError = err;
            console.warn(`[Server Upload] Exception for bucket "${targetBucket}":`, err?.message || err);
          }
        }
      }
    }

    // 2. Local File System Backup
    const localFilePath = path.join(uploadsDir, cleanFileName);
    fs.writeFileSync(localFilePath, buffer);
    const localUrl = `/uploads/${cleanFileName}`;
    console.log(`[Server Upload] Saved local file backup at: ${localUrl}`);

    res.json({
      success: true,
      url: publicUrl || localUrl,
      supabaseUrl: publicUrl,
      localUrl,
      usedSupabase: !!publicUrl,
      supabaseError: supabaseError ? (supabaseError.message || String(supabaseError)) : null,
    });
  } catch (err: any) {
    console.error("[Server Upload] Internal server upload error:", err);
    res.status(500).json({ error: "Failed to process upload", details: err?.message || String(err) });
  }
});

// AI Sourcing Agent Endpoint
app.post("/api/ai/sourcing", async (req, res) => {
  try {
    const { prompt, userContext } = req.body;
    if (!prompt) {
      res.status(400).json({ error: "Prompt is required" });
      return;
    }

    const ai = getGeminiClient();
    if (!ai) {
      // Fallback response if GEMINI_API_KEY is missing
      res.json({
        reply: `[Demo Mode] Dropthan AI Agent: Sourcing query received for "${prompt}". For live AI analysis, ensure GEMINI_API_KEY is active in secrets. Estimated market wholesale price for this item ranges from ₹140-₹220/pc with MOQ 50 units across Surat & Tirupur hubs.`,
      });
      return;
    }

    const systemInstruction = `You are Dropthan AI Sourcing Assistant, an expert B2B wholesale, dropshipping, logistics, GST, and digital marketing advisor for Indian and global e-commerce traders.
Provide concise, highly relevant, actionable B2B advice, price estimation, MOQ guidance, GST breakdown (e.g. 5% or 18% HSN codes), or supplier negotiation tips.
User context: Role: ${userContext?.role || 'Traders'}, Company/Name: ${userContext?.displayName || 'User'}, Location: ${userContext?.location || 'India'}.
Keep responses structured, professional, and easy to read on mobile screens (use bolding and clear line breaks).`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    const reply = response.text || "I was unable to analyze this sourcing query right now. Please try again.";
    res.json({ reply });
  } catch (err: any) {
    console.error("Error in AI sourcing route:", err);
    res.status(500).json({
      error: "AI Sourcing Assistant unavailable",
      details: err?.message || "Unknown error",
    });
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Dropthan Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
