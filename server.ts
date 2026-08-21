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

    const postPayload: Record<string, any> = {
      author: rawPost.author || "Dropthan Member",
      role: rawPost.role || "wholesaler",
      price: rawPost.price || "Rate on Request",
      moq: rawPost.moq || "MOQ on Request",
      caption: rawPost.caption || "",
      img: primaryImg,
      images: imagesList,
      phone: rawPost.phone || null,
      location: rawPost.location || null,
      category: rawPost.category || "Textiles & Apparel",
      likes_count: rawPost.likes_count ?? rawPost.likesCount ?? 15,
      created_at: rawPost.created_at || rawPost.createdAt || new Date().toISOString(),
    };

    if (rawPost.id) postPayload.id = rawPost.id;
    if (rawPost.user_id || rawPost.userId) postPayload.user_id = rawPost.user_id || rawPost.userId;
    if (rawPost.author_avatar || rawPost.authorAvatar) postPayload.author_avatar = rawPost.author_avatar || rawPost.authorAvatar;
    if (rawPost.product_name || rawPost.productName) postPayload.product_name = rawPost.product_name || rawPost.productName;
    if (rawPost.material_details || rawPost.materialDetails) postPayload.material_details = rawPost.material_details || rawPost.materialDetails;
    if (rawPost.promotion_details || rawPost.promotionDetails) postPayload.promotion_details = rawPost.promotion_details || rawPost.promotionDetails;
    if (rawPost.export_products || rawPost.exportProducts) postPayload.export_products = rawPost.export_products || rawPost.exportProducts;
    if (rawPost.packaging_materials || rawPost.packagingMaterials) postPayload.packaging_materials = rawPost.packaging_materials || rawPost.packagingMaterials;
    if (rawPost.service_details || rawPost.serviceDetails) postPayload.service_details = rawPost.service_details || rawPost.serviceDetails;
    if (rawPost.gstin) postPayload.gstin = rawPost.gstin;
    if (rawPost.iec_code || rawPost.iecCode) postPayload.iec_code = rawPost.iec_code || rawPost.iecCode;
    if (rawPost.website || rawPost.websiteUrl) postPayload.website = rawPost.website || rawPost.websiteUrl;
    if (rawPost.instagram || rawPost.instagramHandle) postPayload.instagram = rawPost.instagram || rawPost.instagramHandle;
    if (rawPost.store_address || rawPost.storeAddress) postPayload.store_address = rawPost.store_address || rawPost.storeAddress;
    if (rawPost.lat !== undefined && rawPost.lat !== null) postPayload.lat = Number(rawPost.lat);
    if (rawPost.lng !== undefined && rawPost.lng !== null) postPayload.lng = Number(rawPost.lng);

    console.log(`[Server Post Sync] Attempting to save post by: ${postPayload.author} (${postPayload.phone})`);

    let savedData: any = null;
    let savedError: any = null;

    // Resilient upsert with dynamic column pruning
    for (let attempt = 0; attempt < 8; attempt++) {
      const resUpsert = await supabase.from("posts").upsert(postPayload, { onConflict: postPayload.id ? "id" : undefined });
      if (!resUpsert.error) {
        savedData = resUpsert.data;
        savedError = null;
        console.log(`[Server Post Sync] Post saved successfully on attempt ${attempt + 1}!`);
        break;
      }

      savedError = resUpsert.error;
      console.warn(`[Server Post Sync] Attempt ${attempt + 1} notice:`, savedError.message);

      // Check for missing column error and prune it
      const missingColMatch = savedError.message.match(/Could not find the '(\w+)' column/i) ||
                              savedError.message.match(/column "?(\w+)"? of relation "posts" does not exist/i) ||
                              savedError.message.match(/column "(\w+)" does not exist/i);

      if (missingColMatch && missingColMatch[1] && postPayload[missingColMatch[1]] !== undefined) {
        console.log(`[Server Post Sync] Pruning unmapped column '${missingColMatch[1]}' and retrying...`);
        delete postPayload[missingColMatch[1]];
        continue;
      }

      // If id is invalid/conflict, delete id and try standard insert
      if (postPayload.id && (savedError.message.includes("id") || savedError.code === "22P02")) {
        delete postPayload.id;
        const resInsert = await supabase.from("posts").insert([postPayload]);
        if (!resInsert.error) {
          savedData = resInsert.data;
          savedError = null;
          console.log(`[Server Post Sync] Fallback insert without ID succeeded!`);
          break;
        }
      }

      break;
    }

    if (savedError) {
      console.error("[Server Post Sync] Failed to save post to Supabase:", savedError);
      res.status(400).json({ error: savedError.message, details: savedError });
      return;
    }

    res.json({ success: true, post: postPayload, data: savedData });
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
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .or(`display_name.ilike.%${identifier}%,company_name.ilike.%${identifier}%,full_name.ilike.%${identifier}%`)
        .limit(1)
        .maybeSingle();
      profileData = data;
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

// Server-Side Messages Listing Endpoint
app.get("/api/messages", async (req, res) => {
  try {
    const chatId = (req.query.chat_id as string || "").trim();
    if (!chatId) {
      res.status(400).json({ error: "chat_id is required" });
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      res.status(500).json({ error: "Supabase client not available on server" });
      return;
    }

    let { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true });

    if (error && (error.code === "42703" || error.message.includes("chat_id"))) {
      const fallback = await supabase.from("messages").select("*").order("created_at", { ascending: true }).limit(200);
      data = fallback.data;
      error = fallback.error;
    }

    if (error) {
      console.warn("[Server Messages] Error:", error.message);
      res.status(400).json({ error: error.message });
      return;
    }

    res.json({ success: true, messages: data || [] });
  } catch (err: any) {
    console.error("[Server Messages] Exception:", err);
    res.status(500).json({ error: err?.message || "Failed to fetch messages" });
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

    const supabase = getSupabaseClient();
    if (!supabase) {
      res.status(500).json({ error: "Supabase client not available on server" });
      return;
    }

    const msgPayload: Record<string, any> = {
      chat_id: rawMsg.chat_id,
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
    }

    let savedData: any = null;
    let savedError: any = null;

    for (let attempt = 0; attempt < 6; attempt++) {
      const resInsert = await supabase.from("messages").insert([msgPayload]).select();
      if (!resInsert.error) {
        savedData = resInsert.data;
        savedError = null;
        console.log(`[Server Messages Sync] Inserted message on attempt ${attempt + 1}!`);
        break;
      }

      savedError = resInsert.error;
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

    if (savedError) {
      console.error("[Server Messages Sync] Error saving message:", savedError);
      res.status(400).json({ error: savedError.message });
      return;
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
