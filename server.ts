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

// App Config & Credentials Endpoint
app.get("/api/config", (_req, res) => {
  res.json({
    supabaseUrl: process.env.VITE_SUPABASE_URL || "https://zxbifidxkpbsissjwgnm.supabase.co",
    supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_s8wtq-Mx3OMobIMCSZ69cA_gzo9VbvJ",
    googleMapsKey: process.env.GOOGLE_MAPS_PLATFORM_KEY || "",
  });
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
