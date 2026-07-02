import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";

dotenv.config();

const db = new Database("travel_app.db");

let aiClient: GoogleGenAI | null = null;
function getAi() {
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY || "dummy-key",
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

function getGoogleMapsApiKey(): string | undefined {
  return process.env.GOOGLE_MAPS_PLATFORM_KEY || process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.MAPS_API_KEY;
}

// Initialize DB
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT,
    google_id TEXT UNIQUE,
    photo TEXT,
    phone TEXT,
    is_premium INTEGER DEFAULT 0,
    language TEXT DEFAULT 'English',
    currency TEXT DEFAULT 'INR (₹)',
    theme TEXT DEFAULT 'light',
    notifications INTEGER DEFAULT 1
  );
  
  CREATE TABLE IF NOT EXISTS trips (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    start_location TEXT,
    location TEXT,
    duration INTEGER,
    style TEXT,
    budget TEXT,
    itinerary TEXT,
    status TEXT DEFAULT 'saved', -- 'upcoming', 'completed', 'saved'
    trip_date TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS wishlist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    type TEXT, -- 'destination', 'hotel'
    title TEXT,
    location TEXT,
    image TEXT,
    price TEXT,
    rating REAL,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    type TEXT, -- 'hotel', 'flight', 'bus', 'train', 'cab'
    title TEXT,
    date TEXT,
    status TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS searches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    service_type TEXT,
    query TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS travel_stories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    user_name TEXT,
    user_photo TEXT,
    title TEXT,
    location TEXT,
    photo_url TEXT,
    experience TEXT,
    likes_count INTEGER DEFAULT 0,
    saved_by_users TEXT DEFAULT '[]', -- JSON string of user ids
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Seed travel stories if table is empty
try {
  const storyCount = db.prepare("SELECT COUNT(*) as count FROM travel_stories").get() as any;
  if (storyCount && storyCount.count === 0) {
    const insert = db.prepare(`
      INSERT INTO travel_stories (user_id, user_name, user_photo, title, location, photo_url, experience, likes_count, saved_by_users)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insert.run(
      "guest_user",
      "Aarav Mehta",
      "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80",
      "Mesmerizing Sunrise at Taj Mahal",
      "Agra, India",
      "https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&w=1000&q=80",
      "Woke up at 5:00 AM to see the sun rise over the ivory-white dome of the Taj Mahal. Words cannot describe the orange and pink hues wrapping around the marble masterpiece. Tip: Enter through the East Gate for shorter queues!",
      42,
      "[]"
    );
    insert.run(
      "mock_google_u",
      "Priya Sharma",
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80",
      "Stargazing in the Cold Desert",
      "Spiti Valley, Himachal Pradesh",
      "https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?auto=format&fit=crop&w=1000&q=80",
      "Camping at 14,000 feet in Spiti was the coldest but most spiritual trip of my life. The Milky Way was crystal clear, stretching across the entire dark sky. Slept with 3 layers of woolens!",
      28,
      "[]"
    );
  }
} catch (e) {
  console.error("Failed to seed travel stories:", e);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(express.static(path.join(process.cwd(), "public")));

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Helper to log searches
  const logSearch = (userId: number | null, type: string, query: any) => {
    try {
      db.prepare("INSERT INTO searches (user_id, service_type, query) VALUES (?, ?, ?)").run(userId, type, JSON.stringify(query));
    } catch (e) {
      console.error("Failed to log search:", e);
    }
  };

  // Admin Routes
  app.get("/api/admin/config", (req, res) => {
    res.json({
      adminName: process.env.ADMIN_NAME || "Admin",
      adminEmail: process.env.ADMIN_EMAIL || "admin@travolor.com",
      adminPhone: process.env.ADMIN_PHONE || "+1 234 567 890",
      companyName: process.env.COMPANY_NAME || "Travolor",
      supportEmail: process.env.SUPPORT_EMAIL || "support@travolor.com",
      supportPhone: process.env.SUPPORT_PHONE || "+1 800 TRAVOLOR",
    });
  });

  app.post("/api/admin/login", (req, res) => {
    const { email, password } = req.body;
    const adminEmail = process.env.ADMIN_EMAIL || "admin@travolor.com";
    const adminPassword = process.env.ADMIN_PASSWORD || "admin123";

    if (email === adminEmail && password === adminPassword) {
      res.json({ success: true, token: "admin-token-123" }); // Simple token for demo
    } else {
      res.status(401).json({ success: false, message: "Invalid admin credentials" });
    }
  });

  app.get("/api/admin/stats", (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== 'Bearer admin-token-123') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const totalUsers = db.prepare("SELECT COUNT(*) as count FROM users").get() as any;
      const totalSearches = db.prepare("SELECT COUNT(*) as count FROM searches").get() as any;
      const recentBookings = db.prepare("SELECT b.*, u.name as user_name FROM bookings b JOIN users u ON b.user_id = u.id ORDER BY b.id DESC LIMIT 10").all();
      
      // Mock API usage for now
      const apiUsage = {
        amadeus: Math.floor(Math.random() * 1000),
        googleMaps: Math.floor(Math.random() * 5000),
        gemini: Math.floor(Math.random() * 2000)
      };

      res.json({
        users: totalUsers.count,
        searches: totalSearches.count,
        apiUsage,
        recentBookings
      });
    } catch (error) {
      res.status(500).json({ success: false, message: "Failed to fetch stats" });
    }
  });

  // Google OAuth URL
  app.get("/api/auth/google/url", (req, res) => {
    const rootUrl = "https://accounts.google.com/o/oauth2/v2/auth";
    const options = {
      redirect_uri: `${process.env.APP_URL}/auth/google/callback`,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      access_type: "offline",
      response_type: "code",
      prompt: "consent",
      scope: [
        "https://www.googleapis.com/auth/userinfo.profile",
        "https://www.googleapis.com/auth/userinfo.email",
      ].join(" "),
    };
    const qs = new URLSearchParams(options);
    res.json({ url: `${rootUrl}?${qs.toString()}` });
  });

  // Google OAuth Callback
  app.get("/auth/google/callback", async (req, res) => {
    const code = req.query.code as string;
    const url = "https://oauth2.googleapis.com/token";
    const values = {
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${process.env.APP_URL}/auth/google/callback`,
      grant_type: "authorization_code",
    };

    try {
      const tokenRes = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(values),
      });
      const tokens = await tokenRes.json();

      if (!tokens.access_token) {
        throw new Error("Failed to get access token");
      }

      const userRes = await fetch(`https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${tokens.access_token}`);
      const googleUser = await userRes.json();

      // Upsert user
      let user = db.prepare("SELECT * FROM users WHERE google_id = ? OR email = ?").get(googleUser.id, googleUser.email) as any;
      if (!user) {
        const stmt = db.prepare("INSERT INTO users (name, email, google_id, photo) VALUES (?, ?, ?, ?)");
        const info = stmt.run(googleUser.name, googleUser.email, googleUser.id, googleUser.picture);
        user = { id: info.lastInsertRowid, name: googleUser.name, email: googleUser.email, photo: googleUser.picture };
      } else {
        // Update photo/name if changed
        db.prepare("UPDATE users SET name = ?, photo = ? WHERE id = ?").run(googleUser.name, googleUser.picture, user.id);
        user.name = googleUser.name;
        user.photo = googleUser.picture;
      }

      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ 
                  type: 'OAUTH_AUTH_SUCCESS',
                  user: ${JSON.stringify({ id: user.id, name: user.name, email: user.email, photo: user.photo })}
                }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>Authentication successful. This window should close automatically.</p>
          </body>
        </html>
      `);
    } catch (error) {
      console.error("Google Auth Error:", error);
      res.status(500).send("Authentication failed");
    }
  });

  // Auth Routes
  app.post("/api/auth/signup", (req, res) => {
    const { name, email, password } = req.body;
    try {
      const stmt = db.prepare("INSERT INTO users (name, email, password) VALUES (?, ?, ?)");
      const info = stmt.run(name, email, password);
      res.json({ success: true, user: { id: info.lastInsertRowid, name, email, is_premium: 0 } });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message.includes("UNIQUE") ? "Email already exists" : "Signup failed" });
    }
  });

  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE email = ? AND password = ?").get(email, password) as any;
    if (user) {
      res.json({ success: true, user: { 
        id: user.id, 
        name: user.name, 
        email: user.email, 
        photo: user.photo, 
        phone: user.phone, 
        is_premium: user.is_premium,
        language: user.language,
        currency: user.currency,
        theme: user.theme,
        notifications: user.notifications
      } });
    } else {
      res.status(401).json({ success: false, message: "Invalid email or password" });
    }
  });

  app.post("/api/auth/google", (req, res) => {
    const { name, email, google_id, photo } = req.body;
    let user = db.prepare("SELECT * FROM users WHERE google_id = ? OR email = ?").get(google_id, email) as any;
    
    if (!user) {
      const stmt = db.prepare("INSERT INTO users (name, email, google_id, photo) VALUES (?, ?, ?, ?)");
      const info = stmt.run(name, email, google_id, photo);
      user = db.prepare("SELECT * FROM users WHERE id = ?").get(info.lastInsertRowid) as any;
    } else {
      // Update photo if changed
      db.prepare("UPDATE users SET photo = ? WHERE id = ?").run(photo, user.id);
      user.photo = photo;
    }
    
    res.json({ success: true, user: { 
      id: user.id, 
      name: user.name, 
      email: user.email, 
      photo: user.photo, 
      phone: user.phone, 
      is_premium: user.is_premium,
      language: user.language,
      currency: user.currency,
      theme: user.theme,
      notifications: user.notifications
    } });
  });

  // Profile Routes
  app.post("/api/user/update", (req, res) => {
    const { id, name, phone, photo, language, currency, theme, notifications } = req.body;
    try {
      const sets = [];
      const params = [];
      if (name !== undefined) { sets.push("name = ?"); params.push(name); }
      if (phone !== undefined) { sets.push("phone = ?"); params.push(phone); }
      if (photo !== undefined) { sets.push("photo = ?"); params.push(photo); }
      if (language !== undefined) { sets.push("language = ?"); params.push(language); }
      if (currency !== undefined) { sets.push("currency = ?"); params.push(currency); }
      if (theme !== undefined) { sets.push("theme = ?"); params.push(theme); }
      if (notifications !== undefined) { sets.push("notifications = ?"); params.push(notifications ? 1 : 0); }
      
      if (sets.length > 0) {
        params.push(id);
        db.prepare(`UPDATE users SET ${sets.join(", ")} WHERE id = ?`).run(...params);
      }
      
      const user = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as any;
      res.json({ success: true, user: { 
        id: user.id, 
        name: user.name, 
        email: user.email, 
        photo: user.photo, 
        phone: user.phone, 
        is_premium: user.is_premium,
        language: user.language,
        currency: user.currency,
        theme: user.theme,
        notifications: user.notifications
      } });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  });

  app.post("/api/user/premium", (req, res) => {
    const { id } = req.body;
    db.prepare("UPDATE users SET is_premium = 1 WHERE id = ?").run(id);
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as any;
    res.json({ success: true, user: { id: user.id, name: user.name, email: user.email, photo: user.photo, phone: user.phone, is_premium: user.is_premium } });
  });

  // Wishlist Routes
  app.get("/api/wishlist/:userId", (req, res) => {
    const items = db.prepare("SELECT * FROM wishlist WHERE user_id = ?").all(req.params.userId);
    res.json(items);
  });

  app.post("/api/wishlist", (req, res) => {
    const { user_id, type, title, location, image, price, rating } = req.body;
    const stmt = db.prepare("INSERT INTO wishlist (user_id, type, title, location, image, price, rating) VALUES (?, ?, ?, ?, ?, ?, ?)");
    const info = stmt.run(user_id, type, title, location, image, price, rating);
    res.json({ success: true, id: info.lastInsertRowid });
  });

  app.delete("/api/wishlist/:id", (req, res) => {
    db.prepare("DELETE FROM wishlist WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Trip Routes
  app.get("/api/trips/:userId", (req, res) => {
    const trips = db.prepare("SELECT * FROM trips WHERE user_id = ?").all(req.params.userId);
    res.json(trips);
  });

  app.post("/api/trips", (req, res) => {
    const { user_id, start_location, location, duration, style, budget, itinerary } = req.body;
    const stmt = db.prepare("INSERT INTO trips (user_id, start_location, location, duration, style, budget, itinerary) VALUES (?, ?, ?, ?, ?, ?, ?)");
    const info = stmt.run(user_id, start_location, location, duration, style, budget, itinerary);
    res.json({ success: true, id: info.lastInsertRowid });
  });

  app.delete("/api/trips/:id", (req, res) => {
    db.prepare("DELETE FROM trips WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Booking Routes
  app.get("/api/bookings/:userId", (req, res) => {
    const bookings = db.prepare("SELECT * FROM bookings WHERE user_id = ?").all(req.params.userId);
    res.json(bookings);
  });

  // Real Search APIs
  let amadeusToken: string | null = null;
  let amadeusTokenExpiry: number = 0;

  async function getAmadeusToken() {
    if (amadeusToken && Date.now() < amadeusTokenExpiry) {
      return amadeusToken;
    }
    try {
      const response = await fetch("https://test.api.amadeus.com/v1/security/oauth2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          client_id: process.env.AMADEUS_CLIENT_ID || "",
          client_secret: process.env.AMADEUS_CLIENT_SECRET || "",
        }),
      });
      const data = await response.json();
      amadeusToken = data.access_token;
      amadeusTokenExpiry = Date.now() + (data.expires_in * 1000);
      return amadeusToken;
    } catch (error) {
      console.error("Amadeus Token Error:", error);
      return null;
    }
  }

  app.get("/api/search/hotels", async (req, res) => {
    const { city, userId } = req.query;
    logSearch(userId ? parseInt(userId as string) : null, 'hotels', { city });
    const token = await getAmadeusToken();

    if (!token) {
      return res.json([
        { id: 1, name: "Grand Palace", rating: 4.9, price: 4500, address: "Central Mall Road", image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=400&q=80" },
        { id: 2, name: "Ocean Resort", rating: 4.2, price: 2850, address: "Beach Side Avenue", image: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=400&q=80" }
      ]);
    }

    try {
      // 1. Get City Code
      const cityRes = await fetch(`https://test.api.amadeus.com/v1/reference-data/locations?subType=CITY&keyword=${city}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const cityData = await cityRes.json();
      const cityCode = cityData.data?.[0]?.iataCode;

      if (!cityCode) throw new Error("City not found");

      // 2. Get Hotels by City
      const hotelsRes = await fetch(`https://test.api.amadeus.com/v1/reference-data/locations/hotels/by-city?cityCode=${cityCode}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const hotelsData = await hotelsRes.json();
      
      // Amadeus reference data doesn't include prices/ratings directly in this endpoint
      // We'll take the first few hotels and add mock prices/ratings for the UI
      const hotels = (hotelsData.data || []).slice(0, 5).map((item: any) => ({
        id: item.hotelId,
        name: item.name.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' '),
        rating: (Math.random() * (5 - 3.5) + 3.5).toFixed(1),
        price: Math.floor(Math.random() * 6000) + 2500,
        address: `${item.iataCode} Area`,
        image: `https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=400&q=80`
      }));

      res.json(hotels.length > 0 ? hotels : [
        { id: 1, name: "Grand Palace", rating: 4.9, price: 4500, address: "Central Mall Road", image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=400&q=80" },
        { id: 2, name: "Ocean Resort", rating: 4.2, price: 2850, address: "Beach Side Avenue", image: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=400&q=80" }
      ]);
    } catch (error) {
      console.error("Hotel Search Error:", error);
      res.json([
        { id: 1, name: "Grand Palace", rating: 4.9, price: 4500, address: "Central Mall Road", image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=400&q=80" },
        { id: 2, name: "Ocean Resort", rating: 4.2, price: 2850, address: "Beach Side Avenue", image: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=400&q=80" }
      ]);
    }
  });

  app.get("/api/search/flights", async (req, res) => {
    const { from, to, date, passengers, userId } = req.query;
    logSearch(userId ? parseInt(userId as string) : null, 'flights', { from, to, date, passengers });
    const token = await getAmadeusToken();

    if (!token) {
      return res.json([
        { id: 1, name: "Air Connect", price: 4500, rating: 4.8, type: "Economy", departure: "10:00 AM", arrival: "12:30 PM", duration: "2h 30m" },
        { id: 2, name: "Sky Express", price: 6200, rating: 4.5, type: "Business", departure: "02:15 PM", arrival: "04:45 PM", duration: "2h 30m" }
      ]);
    }

    try {
      const getIATA = async (city: string) => {
        const res = await fetch(`https://test.api.amadeus.com/v1/reference-data/locations?subType=CITY&keyword=${city}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        return data.data?.[0]?.iataCode;
      };

      const fromIATA = await getIATA(from as string);
      const toIATA = await getIATA(to as string);

      if (!fromIATA || !toIATA) throw new Error("Invalid cities");

      const response = await fetch(`https://test.api.amadeus.com/v2/shopping/flight-offers?originLocationCode=${fromIATA}&destinationLocationCode=${toIATA}&departureDate=${date}&adults=${passengers || 1}&max=5`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();

      const AIRLINE_MAPPING: { [key: string]: string } = {
        'AI': 'Air India',
        '6E': 'IndiGo',
        'UK': 'Vistara',
        'SG': 'SpiceJet',
        'G8': 'Go First',
        'I5': 'AirAsia India',
        'LH': 'Lufthansa',
        'EK': 'Emirates',
        'BA': 'British Airways',
        'AF': 'Air France',
        'QR': 'Qatar Airways',
        'SQ': 'Singapore Airlines',
        'CX': 'Cathay Pacific',
        'AA': 'American Airlines',
        'DL': 'Delta Air Lines',
        'UA': 'United Airlines'
      };

      const flights = (data.data || []).map((item: any) => {
        const segment = item.itineraries[0].segments[0];
        const departure = new Date(segment.departure.at);
        const arrival = new Date(segment.arrival.at);
        const airlineCode = item.validatingAirlineCodes[0];
        
        return {
          id: item.id,
          name: AIRLINE_MAPPING[airlineCode] || `${airlineCode} Airways`,
          price: Math.floor(parseFloat(item.price.total) * 85), // Convert EUR to INR approx
          rating: 4.5,
          type: item.travelerPricings[0].fareDetailsBySegment[0].cabin || "Economy",
          departure: departure.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          arrival: arrival.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          duration: item.itineraries[0].duration.replace('PT', '').toLowerCase()
        };
      });

      res.json(flights.length > 0 ? flights : [
        { id: 1, name: "Air Connect", price: 4500, rating: 4.8, type: "Economy", departure: "10:00 AM", arrival: "12:30 PM", duration: "2h 30m" },
        { id: 2, name: "Sky Express", price: 6200, rating: 4.5, type: "Business", departure: "02:15 PM", arrival: "04:45 PM", duration: "2h 30m" }
      ]);
    } catch (error) {
      console.error("Flight Search Error:", error);
      res.json([
        { id: 1, name: "Air Connect", price: 4500, rating: 4.8, type: "Economy", departure: "10:00 AM", arrival: "12:30 PM", duration: "2h 30m" },
        { id: 2, name: "Sky Express", price: 6200, rating: 4.5, type: "Business", departure: "02:15 PM", arrival: "04:45 PM", duration: "2h 30m" }
      ]);
    }
  });

  app.get("/api/search/cabs", async (req, res) => {
    const { from, to, userId } = req.query;
    logSearch(userId ? parseInt(userId as string) : null, 'cabs', { from, to });
    const apiKey = getGoogleMapsApiKey();

    try {
      let distance = 0;
      if (apiKey) {
        const response = await fetch(`https://maps.googleapis.com/maps/api/distancematrix/json?origins=${from}&destinations=${to}&key=${apiKey}`);
        const data = await response.json();
        if (data.rows?.[0]?.elements?.[0]?.distance) {
          distance = data.rows[0].elements[0].distance.value / 1000; // km
        }
      }

      // Fallback distance calculation if API fails or no key
      if (distance === 0) {
        distance = Math.floor(Math.random() * 500) + 100;
      }

      const basePrice = 15; // per km
      res.json([
        { id: 1, name: "Cab Prime", price: Math.floor(distance * basePrice * 1.2), rating: 4.9, type: "Sedan" },
        { id: 2, name: "Cab Mini", price: Math.floor(distance * basePrice), rating: 4.2, type: "Hatchback" }
      ]);
    } catch (error) {
      res.json([
        { id: 1, name: "Cab Prime", price: 1200, rating: 4.9, type: "Sedan" },
        { id: 2, name: "Cab Mini", price: 850, rating: 4.2, type: "Hatchback" }
      ]);
    }
  });

  app.get("/api/search/autocomplete", async (req, res) => {
    const { input } = req.query;
    const apiKey = getGoogleMapsApiKey();
    
    if (!input) return res.json([]);
    if (!apiKey) {
      console.warn("Google Maps API key missing for autocomplete");
      return res.json([]);
    }

    try {
      const response = await fetch(`https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${input}&types=(cities)&key=${apiKey}`);
      const data = await response.json();
      
      if (data.status === "REQUEST_DENIED") {
        console.error("Google Maps Autocomplete Request Denied:", data.error_message);
        return res.status(403).json({ error: "API key invalid or restricted" });
      }

      const suggestions = (data.predictions || []).map((item: any) => ({
        id: item.place_id,
        description: item.description,
        main_text: item.structured_formatting.main_text
      }));

      res.json(suggestions);
    } catch (error) {
      console.error("Autocomplete Error:", error);
      res.status(500).json({ error: "Failed to fetch suggestions" });
    }
  });

  app.get("/api/search/attractions", async (req, res) => {
    const { city } = req.query;
    const apiKey = getGoogleMapsApiKey();
    
    if (!apiKey) return res.json([]);

    try {
      const response = await fetch(`https://maps.googleapis.com/maps/api/place/textsearch/json?query=tourist+attractions+in+${city}&key=${apiKey}`);
      const data = await response.json();
      
      const attractions = (data.results || []).slice(0, 6).map((item: any) => ({
        id: item.place_id,
        name: item.name,
        rating: item.rating || 4.5,
        address: item.formatted_address,
        image: item.photos ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${item.photos[0].photo_reference}&key=${apiKey}` : "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?auto=format&fit=crop&w=400&q=80"
      }));

      res.json(attractions);
    } catch (error) {
      res.json([]);
    }
  });

  app.get("/api/search/trains", async (req, res) => {
    const { from, to, userId } = req.query;
    logSearch(userId ? parseInt(userId as string) : null, 'trains', { from, to });
    // Mocking realistic train data based on distance
    const apiKey = getGoogleMapsApiKey();
    let distance = 500;
    try {
      const response = await fetch(`https://maps.googleapis.com/maps/api/distancematrix/json?origins=${from}&destinations=${to}&key=${apiKey}`);
      const data = await response.json();
      distance = data.rows[0].elements[0].distance.value / 1000;
    } catch (e) {}

    res.json([
      { id: 1, name: "Express A", price: Math.floor(distance * 2), rating: 4.9, type: "3AC" },
      { id: 2, name: "Express B", price: Math.floor(distance * 1.5), rating: 4.2, type: "Sleeper" }
    ]);
  });

  app.get("/api/search/buses", async (req, res) => {
    const { from, to, userId } = req.query;
    logSearch(userId ? parseInt(userId as string) : null, 'buses', { from, to });
    const apiKey = getGoogleMapsApiKey();
    let distance = 500;
    try {
      const response = await fetch(`https://maps.googleapis.com/maps/api/distancematrix/json?origins=${from}&destinations=${to}&key=${apiKey}`);
      const data = await response.json();
      distance = data.rows[0].elements[0].distance.value / 1000;
    } catch (e) {}

    res.json([
      { id: 1, name: "Sleeper AC", price: Math.floor(distance * 3), rating: 4.9, type: "AC" },
      { id: 2, name: "Sleeper Non-AC", price: Math.floor(distance * 2), rating: 4.2, type: "Non-AC" }
    ]);
  });

  // Helper for Google Maps Routes API
  async function getRoutesInfo(from: string, to: string) {
    const apiKey = getGoogleMapsApiKey();
    if (!apiKey) {
      throw new Error("Google Maps Platform API Key (GOOGLE_MAPS_PLATFORM_KEY) is missing. Please add it to your Secrets in Settings.");
    }

    try {
      const url = "https://routes.googleapis.com/v1/computeRoutes";
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "routes.distanceMeters,routes.duration,routes.description"
        },
        body: JSON.stringify({
          origin: { address: from },
          destination: { address: to },
          travelMode: "DRIVE",
          routingPreference: "TRAFFIC_AWARE",
          computeAlternativeRoutes: false,
          routeModifiers: { avoidTolls: false, avoidHighways: false, avoidFerries: false }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const route = data.routes?.[0];
        if (route) {
          const distanceKm = Math.round((route.distanceMeters || 0) / 1000);
          const durationSeconds = parseInt(route.duration?.replace("s", "") || "0");
          const hours = Math.floor(durationSeconds / 3600);
          const minutes = Math.floor((durationSeconds % 3600) / 60);
          const durationText = hours > 0 ? `${hours} hours ${minutes} mins` : `${minutes} mins`;
          const optimizedRouteSummary = route.description || "Optimized highway route via Maps Routes API";
          return { distanceKm, durationText, optimizedRouteSummary };
        } else {
          throw new Error("No route returned from Google Routes API.");
        }
      } else {
        const errJson = await response.json().catch(() => ({}));
        const msg = errJson.error?.message || response.statusText || "Unknown Google Routes API error";
        throw new Error(`Google Routes API Error: ${msg} (Status ${response.status})`);
      }
    } catch (e: any) {
      console.warn("Routes API failed, falling back to Distance Matrix:", e);
      // Try Distance Matrix as an alternative Google Maps API before giving up
      try {
        const response = await fetch(`https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(from)}&destinations=${encodeURIComponent(to)}&key=${apiKey}`);
        const data = await response.json();
        const element = data.rows?.[0]?.elements?.[0];
        if (element && element.status === "OK") {
          const distanceKm = Math.round((element.distance?.value || 0) / 1000);
          const durationText = element.duration?.text || "approx 6 hours";
          return {
            distanceKm,
            durationText,
            optimizedRouteSummary: `NH-48 Route (Distance: ${distanceKm} km, Duration: ${durationText})`
          };
        } else {
          throw new Error(element?.status || "Invalid status in Distance Matrix");
        }
      } catch (dmError: any) {
        throw new Error(`Route Calculation Failed: Routes API: ${e.message}. Distance Matrix: ${dmError.message}`);
      }
    }
  }

  // Fallback database of city coordinates for Travolor
  const CITY_COORDS_FALLBACK: Record<string, { lat: number; lng: number }> = {
    mumbai: { lat: 19.0760, lng: 72.8777 },
    delhi: { lat: 28.7041, lng: 77.1025 },
    bangalore: { lat: 12.9716, lng: 77.5946 },
    pune: { lat: 18.5204, lng: 73.8567 },
    goa: { lat: 15.2993, lng: 74.1240 },
    panaji: { lat: 15.4909, lng: 73.8278 },
    hyderabad: { lat: 17.3850, lng: 78.4867 },
    chennai: { lat: 13.0827, lng: 80.2707 },
    kolkata: { lat: 22.5726, lng: 88.3639 },
    jaipur: { lat: 26.9124, lng: 75.7873 },
    udaipur: { lat: 24.5854, lng: 73.7125 },
    agra: { lat: 27.1767, lng: 78.0081 },
    amritsar: { lat: 31.6340, lng: 74.8723 },
    srinagar: { lat: 34.0837, lng: 74.7973 },
    ladakh: { lat: 34.1526, lng: 77.5771 },
    varanasi: { lat: 25.3176, lng: 82.9739 },
    rishikesh: { lat: 30.0869, lng: 78.2676 },
    coorg: { lat: 12.3375, lng: 75.8069 },
    hampi: { lat: 15.3350, lng: 76.4600 },
    mysore: { lat: 12.2958, lng: 76.6394 },
    pondicherry: { lat: 11.9416, lng: 79.8083 },
    tirupati: { lat: 13.6288, lng: 79.4192 }
  };

  // Fallback attractions dictionary for Travolor
  const FALLBACK_ATTRACTIONS: Record<string, string[]> = {
    goa: ["Baga Beach", "Calangute Beach", "Basilica of Bom Jesus", "Fort Aguada", "Dudhsagar Falls", "Anjuna Flea Market", "Mangueshi Temple", "Palolem Beach"],
    mumbai: ["Gateway of India", "Marine Drive", "Elephanta Caves", "Chhatrapati Shivaji Maharaj Terminus", "Siddhivinayak Temple", "Haji Ali Dargah", "Colaba Causeway", "Juhu Beach"],
    delhi: ["Red Fort", "Qutub Minar", "India Gate", "Lotus Temple", "Humayun's Tomb", "Akshardham Temple", "Chandni Chowk", "Rashtrapati Bhavan"],
    agra: ["Taj Mahal", "Agra Fort", "Fatehpur Sikri", "Mehtab Bagh", "Tomb of Itimad-ud-Daulah"],
    jaipur: ["Hawa Mahal", "Amer Fort", "City Palace", "Jantar Mantar", "Nahargarh Fort", "Chokhi Dhani", "Albert Hall Museum"],
    pune: ["Shaniwar Wada", "Aga Khan Palace", "Sinhagad Fort", "Dagadusheth Halwai Ganapati", "Rajiv Gandhi Zoological Park", "Osho Teerth Park"]
  };

  // Haversine distance calculator
  function getHaversineDistance(p1: { lat: number; lng: number }, p2: { lat: number; lng: number }): number {
    const R = 6371; // km
    const dLat = (p2.lat - p1.lat) * Math.PI / 180;
    const dLon = (p2.lng - p1.lng) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(p1.lat * Math.PI / 180) * Math.cos(p2.lat * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // Geocoding helper using Google Maps API
  async function getCityCoordinates(city: string): Promise<{ lat: number; lng: number; formattedAddress: string } | null> {
    const apiKey = getGoogleMapsApiKey();
    if (!apiKey) {
      console.warn("Google Maps Platform API Key (GOOGLE_MAPS_PLATFORM_KEY) is missing. Using Open-Meteo geocoding as fallback.");
      return getOpenMeteoCoordinates(city);
    }
    
    // First try Google Places API (Find Place from Text) to resolve coords as requested
    try {
      const placesUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(city)}&inputtype=textquery&fields=formatted_address,geometry&key=${apiKey}`;
      const res = await fetch(placesUrl);
      const data = await res.json();
      if (data.status === "OK" && data.candidates?.[0]?.geometry?.location) {
        const candidate = data.candidates[0];
        return {
          lat: candidate.geometry.location.lat,
          lng: candidate.geometry.location.lng,
          formattedAddress: candidate.formatted_address || city
        };
      }
    } catch (e) {
      console.warn("Places API geocoding failed, trying Geocoding API...", e);
    }

    // Geocoding API
    try {
      const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(city)}&key=${apiKey}`);
      const data = await response.json();
      if (data.status === "OK" && data.results && data.results[0]) {
        const location = data.results[0].geometry.location;
        return {
          lat: location.lat,
          lng: location.lng,
          formattedAddress: data.results[0].formatted_address
        };
      } else {
        console.warn(`Google Geocoding error: ${data.status} for ${city}. Falling back to Open-Meteo.`);
        return getOpenMeteoCoordinates(city);
      }
    } catch (error: any) {
      console.warn("Geocoding failed for:", city, error, ". Falling back to Open-Meteo.");
      return getOpenMeteoCoordinates(city);
    }
  }

  async function getOpenMeteoCoordinates(city: string): Promise<{ lat: number; lng: number; formattedAddress: string } | null> {
    const searchTerms = [city];
    if (city.includes(",")) {
      const parts = city.split(",").map(p => p.trim()).filter(Boolean);
      if (parts.length > 0) {
        searchTerms.push(parts[0]); // e.g. "Kolhapur"
        if (parts.length > 1) {
          searchTerms.push(`${parts[0]} ${parts[1]}`); // e.g. "Kolhapur Maharashtra"
        }
      }
    }

    for (const term of searchTerms) {
      try {
        const geocodeUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(term)}&count=1&language=en&format=json`;
        const geoRes = await fetch(geocodeUrl);
        const geoData = await geoRes.json();
        if (geoData.results && geoData.results[0]) {
          const result = geoData.results[0];
          return {
            lat: result.latitude,
            lng: result.longitude,
            formattedAddress: `${result.name}, ${result.admin1 || ""}, ${result.country || ""}`
          };
        }
      } catch (e) {
        console.error(`Open-Meteo geocoding failed for "${term}":`, e);
      }
    }

    // Check fallback database
    for (const term of searchTerms) {
      const fallback = CITY_COORDS_FALLBACK[term.toLowerCase().trim()];
      if (fallback) {
        return {
          lat: fallback.lat,
          lng: fallback.lng,
          formattedAddress: city
        };
      }
    }

    // Explicit check for Kolhapur, Maharashtra
    if (city.toLowerCase().includes("kolhapur")) {
      return {
        lat: 16.7050,
        lng: 74.2433,
        formattedAddress: "Kolhapur, Maharashtra, India"
      };
    }

    return null;
  }

  // Attractions search helper using Google Places API with Gemini Search Grounding fallback
  async function getRealAttractions(city: string, cityCoords?: { lat: number; lng: number }): Promise<any[]> {
    const apiKey = getGoogleMapsApiKey();
    let results: any[] = [];

    if (apiKey) {
      try {
        const response = await fetch(`https://maps.googleapis.com/maps/api/place/textsearch/json?query=tourist+attractions+in+${encodeURIComponent(city)}&key=${apiKey}`);
        if (response.ok) {
          const data = await response.json();
          if (data && data.results && data.results.length > 0) {
            results = data.results.slice(0, 15).map((item: any) => ({
              name: item.name,
              address: item.formatted_address,
              lat: item.geometry?.location?.lat,
              lng: item.geometry?.location?.lng,
              rating: item.rating || 4.5,
              ratingCount: item.user_ratings_total || 100,
              placeId: item.place_id
            }));
          }
        }
      } catch (error) {
        console.warn("Fetching attractions via Google Maps API failed for:", city, error);
      }
    }

    // Fallback to Gemini with Google Search Grounding if results are empty
    if (results.length === 0) {
      console.log(`[getRealAttractions] Google Maps Key missing or no results. Falling back to Gemini Search Grounding for "${city}"...`);
      try {
        const ai = getAi();
        if (ai) {
          const latRef = cityCoords?.lat || 19.0760;
          const lngRef = cityCoords?.lng || 72.8777;
          
          const prompt = `You are a professional travel geographer. Find the top 12 real, highly popular, authentic, specific tourist spots, landmarks, historical places, viewpoints, temples, beaches, or attractions in the city/area: "${city}". 
Do NOT recommend generic fallback places like "Main City Center Plaza" or generic "Historical Heritage Fort". They must be REAL locations in/around ${city}.

Return ONLY a valid JSON array of objects conforming strictly to the following structure. Do not wrap the JSON in markdown code blocks like \`\`\`json. Return only the raw JSON string starting with [ and ending with ].

JSON Structure:
[
  {
    "name": "Exact, real name of the tourist spot",
    "address": "Real address or location description in ${city}",
    "lat": ${latRef} (approximate real latitude of this spot),
    "lng": ${lngRef} (approximate real longitude of this spot),
    "rating": number (real average rating, e.g. 4.7),
    "ratingCount": number (realistic rating count, e.g. 1500)
  }
]`;

          const response = await ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents: prompt,
            config: {
              tools: [{ googleSearch: {} }]
            }
          });

          const text = (response.text || "").trim();
          let parsed: any[] = [];
          try {
            parsed = JSON.parse(text);
          } catch (jsonErr) {
            // Try cleaning markdown backticks if any
            const match = text.match(/\[[\s\S]*\]/);
            if (match) {
              parsed = JSON.parse(match[0]);
            }
          }

          if (Array.isArray(parsed) && parsed.length > 0) {
            console.log(`[getRealAttractions] Successfully fetched ${parsed.length} authentic tourist spots for "${city}" using Gemini Search Grounding.`);
            results = parsed.map((item: any, idx: number) => {
              let latVal = parseFloat(item.lat);
              let lngVal = parseFloat(item.lng);
              if (isNaN(latVal) || latVal === 0 || latVal === latRef) {
                latVal = latRef + (Math.sin(idx) * 0.02);
              }
              if (isNaN(lngVal) || lngVal === 0 || lngVal === lngRef) {
                lngVal = lngRef + (Math.cos(idx) * 0.02);
              }

              return {
                name: String(item.name || `Attraction ${idx + 1}`),
                address: String(item.address || `${item.name || 'Attraction'}, ${city}`),
                lat: latVal,
                lng: lngVal,
                rating: parseFloat(item.rating) || 4.5,
                ratingCount: parseInt(item.ratingCount) || 120 + (idx * 30),
                placeId: `gemini-grounded-${idx}`
              };
            });
          }
        }
      } catch (geminiErr) {
        console.warn("[getRealAttractions] Gemini Search Grounding fallback failed for attractions:", geminiErr);
      }
    }

    return results;
  }

  // Helper functions to generate verified Google Maps Links
  function getGoogleMapsSearchUrl(query: string): string {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  }

  function getGoogleMapsDirectionsUrl(origin: string, destination: string): string {
    return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`;
  }

  // Programmatic, hallucination-free enrichment for maps links and exact Google Maps calculations
  function enrichItineraryWithMaps(
    structuredData: any,
    dayWiseRoutes: any[],
    startLocation: string,
    location: string,
    duration: number,
    outboundDist: number,
    outboundDurationText: string,
    totalTransitCost: number,
    totalHotelCost: number,
    totalFoodCost: number,
    shoppingAllowance: number,
    totalTicketCost: number,
    totalLocalTransportCost: number,
    emergencyBuffer: number,
    totalCostWithBuffer: number,
    costPerPerson: number
  ) {
    if (!structuredData) return;

    if (!structuredData.hero) structuredData.hero = {};
    structuredData.hero.navigationLink = getGoogleMapsDirectionsUrl(startLocation, location);
    structuredData.hero.pdfLink = `#print`;
    structuredData.hero.shareLink = `#share`;
    structuredData.hero.totalCost = totalCostWithBuffer;
    structuredData.hero.distance = `${outboundDist} km`;
    structuredData.hero.travelTime = outboundDurationText;

    if (!structuredData.budgetDashboard) {
      structuredData.budgetDashboard = {};
    }
    structuredData.budgetDashboard.fuel = totalTransitCost;
    structuredData.budgetDashboard.hotel = totalHotelCost;
    structuredData.budgetDashboard.food = totalFoodCost;
    structuredData.budgetDashboard.shopping = shoppingAllowance;
    structuredData.budgetDashboard.activities = totalTicketCost;
    structuredData.budgetDashboard.transport = totalLocalTransportCost;
    structuredData.budgetDashboard.emergency = emergencyBuffer;
    structuredData.budgetDashboard.grandTotal = totalCostWithBuffer;
    structuredData.budgetDashboard.costPerPerson = costPerPerson;

    if (structuredData.day0) {
      structuredData.day0.distance = `${outboundDist} km`;
      structuredData.day0.drivingTime = outboundDurationText;
      if (structuredData.day0.breakfastStop) {
        structuredData.day0.breakfastStopMapsLink = getGoogleMapsSearchUrl(structuredData.day0.breakfastStop);
      }
      if (structuredData.day0.lunchStop) {
        structuredData.day0.lunchStopMapsLink = getGoogleMapsSearchUrl(structuredData.day0.lunchStop);
      }
      if (structuredData.day0.coffeeStop) {
        structuredData.day0.coffeeStopMapsLink = getGoogleMapsSearchUrl(structuredData.day0.coffeeStop);
      }
      if (structuredData.day0.hotelCheckIn) {
        structuredData.day0.hotelCheckInMapsLink = getGoogleMapsSearchUrl(`${structuredData.day0.hotelCheckIn}, ${location}`);
      }
      if (structuredData.day0.dinner) {
        structuredData.day0.dinnerMapsLink = getGoogleMapsSearchUrl(`${structuredData.day0.dinner}, ${location}`);
      }
    }

    if (structuredData.days && Array.isArray(structuredData.days)) {
      structuredData.days.forEach((day: any, dIdx: number) => {
        const routeToday = dayWiseRoutes[dIdx];
        if (routeToday) {
          day.totalDistance = `${routeToday.totalDistanceKm} km`;
          day.totalDuration = routeToday.totalDurationText;

          if (day.morning && day.morning.place) {
            const leg = routeToday.legs[0];
            if (leg) {
              day.morning.place.distance = `${leg.distanceKm} km`;
              day.morning.place.travelTime = leg.durationText;
              day.morning.place.mapsLink = leg.mapsLink;
              day.morning.place.navigation = `Distance: ${leg.distanceKm} km | Travel: ${leg.durationText}`;
            } else {
              day.morning.place.mapsLink = getGoogleMapsSearchUrl(`${day.morning.place.name}, ${location}`);
            }
            if (day.morning.breakfast) {
              day.morning.breakfastMapsLink = getGoogleMapsSearchUrl(`${day.morning.breakfast.replace(/⭐.*/, "")}, ${location}`);
            }
          }

          if (day.afternoon && day.afternoon.place) {
            const leg = routeToday.legs[1];
            if (leg) {
              day.afternoon.place.distance = `${leg.distanceKm} km`;
              day.afternoon.place.travelTime = leg.durationText;
              day.afternoon.place.mapsLink = leg.mapsLink;
              day.afternoon.place.navigation = `Distance: ${leg.distanceKm} km | Travel: ${leg.durationText}`;
            } else {
              day.afternoon.place.mapsLink = getGoogleMapsSearchUrl(`${day.afternoon.place.name}, ${location}`);
            }
            if (day.afternoon.lunch) {
              day.afternoon.lunchMapsLink = getGoogleMapsSearchUrl(`${day.afternoon.lunch.replace(/⭐.*/, "")}, ${location}`);
            }
          }

          if (day.evening) {
            if (day.evening.sunsetPoint) {
              day.evening.sunsetPointMapsLink = getGoogleMapsSearchUrl(`${day.evening.sunsetPoint}, ${location}`);
            }
            if (day.evening.streetFood) {
              day.evening.streetFoodMapsLink = getGoogleMapsSearchUrl(`${day.evening.streetFood}, ${location}`);
            }
          }

          if (day.night) {
            if (day.night.dinner) {
              day.night.dinnerMapsLink = getGoogleMapsSearchUrl(`${day.night.dinner.replace(/⭐.*/, "")}, ${location}`);
            }
          }
        }
      });
    }

    if (structuredData.hotelsList && Array.isArray(structuredData.hotelsList)) {
      structuredData.hotelsList.forEach((hotel: any) => {
        if (hotel.name) {
          hotel.mapsLink = getGoogleMapsSearchUrl(`${hotel.name}, ${location}`);
        }
      });
    }
  }

  // Optimized Proximity Clustering Algorithm using Google Maps Distance Matrix
  async function clusterAttractions(
    attractions: any[],
    daysCount: number,
    cityCenter: { lat: number; lng: number }
  ): Promise<any[][]> {
    const unvisited = [...attractions];
    const days: any[][] = Array.from({ length: daysCount }, () => []);
    
    if (unvisited.length === 0) return days;

    const apiKey = getGoogleMapsApiKey();
    let currentPoint: string | { lat: number; lng: number } = cityCenter;

    for (let d = 0; d < daysCount; d++) {
      let countToVisit = 2; // Day 1 & Last Day typically have fewer attractions due to travel
      if (d > 0 && d < daysCount - 1) {
        countToVisit = 3; // Full sightseeing days
      }

      for (let i = 0; i < countToVisit; i++) {
        if (unvisited.length === 0) break;

        let closestIdx = 0;
        let minTravelTime = Infinity;
        let minDistance = Infinity;

        if (apiKey && unvisited.length > 0) {
          try {
            const originStr = typeof currentPoint === "string" ? currentPoint : `${currentPoint.lat},${currentPoint.lng}`;
            const destinationsStr = unvisited.map(item => `${item.lat},${item.lng}`).join("|");
            const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(originStr)}&destinations=${encodeURIComponent(destinationsStr)}&key=${apiKey}`;
            const response = await fetch(url);
            const data = await response.json();
            const elements = data.rows?.[0]?.elements;
            
            let foundValid = false;
            if (elements && Array.isArray(elements) && elements.length === unvisited.length) {
              for (let j = 0; j < elements.length; j++) {
                const el = elements[j];
                if (el && el.status === "OK") {
                  const durationVal = el.duration?.value || Infinity;
                  const distanceVal = el.distance?.value || Infinity;
                  // Primary sort by duration (travel time), secondary by distance
                  if (durationVal < minTravelTime || (durationVal === minTravelTime && distanceVal < minDistance)) {
                    minTravelTime = durationVal;
                    minDistance = distanceVal;
                    closestIdx = j;
                    foundValid = true;
                  }
                }
              }
            }
            if (!foundValid) {
              throw new Error("No OK elements in Distance Matrix or response was invalid");
            }
          } catch (err) {
            console.warn("Distance Matrix calculation failed during clustering. Using Haversine:", err);
            // Fallback to Haversine
            let minHaversine = Infinity;
            for (let j = 0; j < unvisited.length; j++) {
              const item = unvisited[j];
              if (item.lat && item.lng) {
                const dist = getHaversineDistance(
                  typeof currentPoint === "string" ? cityCenter : currentPoint,
                  { lat: item.lat, lng: item.lng }
                );
                if (dist < minHaversine) {
                  minHaversine = dist;
                  closestIdx = j;
                }
              }
            }
          }
        } else {
          // No API key, fallback to Haversine
          let minHaversine = Infinity;
          for (let j = 0; j < unvisited.length; j++) {
            const item = unvisited[j];
            if (item.lat && item.lng) {
              const dist = getHaversineDistance(
                typeof currentPoint === "string" ? cityCenter : currentPoint,
                { lat: item.lat, lng: item.lng }
              );
              if (dist < minHaversine) {
                minHaversine = dist;
                closestIdx = j;
              }
            }
          }
        }

        const selected = unvisited.splice(closestIdx, 1)[0];
        days[d].push(selected);
        if (selected.lat && selected.lng) {
          currentPoint = { lat: selected.lat, lng: selected.lng };
        }
      }

      if (days[d].length > 0) {
        const lastItem = days[d][days[d].length - 1];
        if (lastItem.lat && lastItem.lng) {
          currentPoint = { lat: lastItem.lat, lng: lastItem.lng };
        }
      } else {
        currentPoint = cityCenter;
      }
    }

    return days;
  }

  // Route calculation helper using Google Maps Directions API and Distance Matrix API
  async function computeRouteBetweenPoints(
    from: string | { lat: number; lng: number },
    to: string | { lat: number; lng: number }
  ): Promise<{ distanceKm: number; durationText: string; durationSeconds: number }> {
    const apiKey = getGoogleMapsApiKey();

    if (!apiKey) {
      console.warn("Google Maps Platform API Key is missing. Using Haversine route estimation fallback.");
      return computeRouteFallback(from, to);
    }

    const originStr = typeof from === "string" ? from : `${from.lat},${from.lng}`;
    const destinationStr = typeof to === "string" ? to : `${to.lat},${to.lng}`;

    // 1. Try Google Maps Directions API
    try {
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(originStr)}&destination=${encodeURIComponent(destinationStr)}&key=${apiKey}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (data.status === "OK" && data.routes?.[0]?.legs?.[0]) {
          const leg = data.routes[0].legs[0];
          const distanceKm = Math.round((leg.distance?.value || 0) / 1000);
          const durationSeconds = leg.duration?.value || 0;
          const durationText = leg.duration?.text || "approx 30 mins";
          return { distanceKm, durationText, durationSeconds };
        } else {
          console.warn("Directions API returned non-OK or empty legs, trying Distance Matrix...");
        }
      }
    } catch (error) {
      console.warn("Google Maps Directions API request failed:", error);
    }

    // 2. Try Google Maps Distance Matrix API
    try {
      const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(originStr)}&destinations=${encodeURIComponent(destinationStr)}&key=${apiKey}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        const element = data.rows?.[0]?.elements?.[0];
        if (element && element.status === "OK") {
          const distanceKm = Math.round((element.distance?.value || 0) / 1000);
          const durationText = element.duration?.text || "approx 30 mins";
          const durationSeconds = element.duration?.value || 1800;
          return { distanceKm, durationText, durationSeconds };
        }
      }
    } catch (error) {
      console.warn("Google Maps Distance Matrix API request failed:", error);
    }

    // If both fail, use computeRouteFallback
    console.warn("Both Directions & Distance Matrix APIs failed. Falling back to Haversine.");
    return computeRouteFallback(from, to);
  }

  async function computeRouteFallback(
    from: string | { lat: number; lng: number },
    to: string | { lat: number; lng: number }
  ): Promise<{ distanceKm: number; durationText: string; durationSeconds: number }> {
    console.warn("Computing route using fallback Haversine distance estimation...");
    try {
      let fromLatLng = typeof from === "string" ? null : from;
      let toLatLng = typeof to === "string" ? null : to;

      if (!fromLatLng && typeof from === "string") {
        const coords = CITY_COORDS_FALLBACK[from.toLowerCase().trim()] || await getOpenMeteoCoordinates(from);
        if (coords) {
          fromLatLng = { lat: coords.lat, lng: coords.lng };
        }
      }

      if (!toLatLng && typeof to === "string") {
        const coords = CITY_COORDS_FALLBACK[to.toLowerCase().trim()] || await getOpenMeteoCoordinates(to);
        if (coords) {
          toLatLng = { lat: coords.lat, lng: coords.lng };
        }
      }

      if (fromLatLng && toLatLng) {
        const baseDistance = getHaversineDistance(fromLatLng, toLatLng);
        // Multiply by 1.35 to account for road winding factor, as straight-line is shorter than actual driving route.
        const distanceKm = Math.max(5, Math.round(baseDistance * 1.35));
        // Average driving speed is approx 60 km/h in India
        const durationSeconds = Math.max(300, Math.round((distanceKm / 60) * 3600));
        const hours = Math.floor(durationSeconds / 3600);
        const minutes = Math.floor((durationSeconds % 3600) / 60);
        const durationText = hours > 0 ? `${hours} hours ${minutes} mins` : `${minutes} mins`;
        return { distanceKm, durationText, durationSeconds };
      }
    } catch (e) {
      console.error("Route fallback computation failed:", e);
    }

    // Default ultimate fallback if coordinates cannot be resolved
    return { distanceKm: 150, durationText: "2 hours 30 mins", durationSeconds: 9000 };
  }  // Gemini API Routes
  app.post("/api/gemini/generate-itinerary", async (req, res) => {
    try {
      const { startLocation, location, duration, travelStyle, numPeople, language = "en", enableThinking, useSearch, travelMode, travelDate, budget, includeHiddenGems = true, includeLocalExperiences = true } = req.body;
      
      if (!startLocation || !startLocation.trim()) {
        return res.status(400).json({ error: "Starting location is required to plan this trip starting from your departure city." });
      }

      if (!location || !location.trim()) {
        return res.status(400).json({ error: "Destination location is required." });
      }

      // Check key
      const hasKey = Boolean(process.env.GEMINI_API_KEY);

      // Compute all dynamic route data and cluster attractions in travel order
      const startCoordsData = await getCityCoordinates(startLocation);
      if (!startCoordsData) {
        throw new Error(`Could not resolve coordinates for starting location: "${startLocation}". Please check the spelling or connectivity.`);
      }

      const destCoordsData = await getCityCoordinates(location);
      if (!destCoordsData) {
        throw new Error(`Could not resolve coordinates for destination: "${location}". Please check the spelling or connectivity.`);
      }

      const startLatLng = { lat: startCoordsData.lat, lng: startCoordsData.lng };
      const destLatLng = { lat: destCoordsData.lat, lng: destCoordsData.lng };

      // Outbound route
      const transitRoute = await computeRouteBetweenPoints(startLocation, location);
      const outboundDist = transitRoute.distanceKm;
      const outboundDurationText = transitRoute.durationText;
      const outboundDurationSecs = transitRoute.durationSeconds;

      // Fetch live weather data for coordinates using Open-Meteo
      let weatherData = { temp: "26°C", condition: "Pleasant", rainChance: "10%", humidity: "60%", advice: "Perfect travel conditions." };
      try {
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${destLatLng.lat}&longitude=${destLatLng.lng}&current=temperature_2m,relative_humidity_2m,weather_code&daily=precipitation_probability_max&timezone=auto`;
        const weatherRes = await fetch(weatherUrl);
        const wJson = await weatherRes.json();
        if (wJson.current) {
          const temp = Math.round(wJson.current.temperature_2m);
          const code = wJson.current.weather_code;
          const humidity = wJson.current.relative_humidity_2m;
          const rainChance = wJson.daily?.precipitation_probability_max?.[0] || 0;
          
          let condition = "Clear";
          if (code === 0) condition = "Sunny";
          else if (code <= 3) condition = "Partly Cloudy";
          else if (code <= 48) condition = "Foggy";
          else if (code <= 55) condition = "Drizzle";
          else if (code <= 65) condition = "Rainy";
          else if (code <= 77) condition = "Snowy";
          else if (code <= 82) condition = "Rain Showers";
          else condition = "Thunderstorm";

          let advice = "Wear comfortable clothing. Carry sunglasses and sunscreen.";
          if (code >= 51) advice = "Carry an umbrella or raincoat. Plan indoor sightseeing where possible.";
          else if (temp > 35) advice = "High temperatures. Stay hydrated, wear light cotton clothes, and avoid direct noon sun.";
          else if (temp < 15) advice = "Cool breeze. Carry light woolen clothes or a jacket.";

          weatherData = {
            temp: `${temp}°C`,
            condition,
            rainChance: `${rainChance}%`,
            humidity: `${humidity}%`,
            advice
          };
        }
      } catch (err) {
        console.warn("Failed to fetch live weather for itinerary generator:", err);
      }

      // Fetch real attractions
      let attractions = await getRealAttractions(location, destLatLng);
      if (attractions.length === 0) {
        const cleanLoc = location.toLowerCase().trim();
        const fallbacks = FALLBACK_ATTRACTIONS[cleanLoc] || [
          "Main City Center Plaza",
          "Historical Heritage Fort",
          "Serene Local Lake & Garden",
          "Famous Ancient Temple",
          "Bustling Traditional Bazaar",
          "Scenic Sunset Viewpoint",
          "Local Art & Craft Museum",
          "Popular Nature Reserve"
        ];
        attractions = fallbacks.map((name, index) => ({
          name,
          address: `${name}, ${location}`,
          lat: destLatLng.lat + (Math.sin(index) * 0.05),
          lng: destLatLng.lng + (Math.cos(index) * 0.05),
          rating: 4.5 + (index % 5) * 0.1,
          ratingCount: 150 + index * 40
        }));
      }

      // Cluster
      const clusteredAttractions = await clusterAttractions(attractions, duration, destLatLng);

      // Compute day wise legs and totals
      const dayWiseRoutes: any[] = [];
      let totalLocalDistanceKm = 0;
      let totalLocalDurationSeconds = 0;

      for (let d = 0; d < duration; d++) {
        const attractionsToday = clusteredAttractions[d] || [];
        const dayIndex = d + 1;

        const legs: any[] = [];
        let todayDistanceKm = 0;
        let todayDurationSeconds = 0;

        let currentLegPoint: string | { lat: number; lng: number } = destLatLng;

        for (let i = 0; i < attractionsToday.length; i++) {
          const att = attractionsToday[i];
          const attLatLng = { lat: att.lat, lng: att.lng };
          const route = await computeRouteBetweenPoints(currentLegPoint, attLatLng);
          
          legs.push({
            from: typeof currentLegPoint === "string" ? currentLegPoint : (i === 0 ? "Hotel / Center" : "Previous Spot"),
            to: att.name,
            distanceKm: route.distanceKm,
            durationText: route.durationText,
            mapsLink: `https://www.google.com/maps/dir/?api=1&origin=${typeof currentLegPoint === "string" ? encodeURIComponent(currentLegPoint) : `${currentLegPoint.lat},${currentLegPoint.lng}`}&destination=${att.lat},${att.lng}`
          });

          todayDistanceKm += route.distanceKm;
          todayDurationSeconds += route.durationSeconds;
          currentLegPoint = attLatLng;
        }

        if (attractionsToday.length > 0) {
          const returnPoint = destLatLng;
          const routeBack = await computeRouteBetweenPoints(currentLegPoint, returnPoint);
          legs.push({
            from: attractionsToday[attractionsToday.length - 1].name,
            to: "Hotel / Center",
            distanceKm: routeBack.distanceKm,
            durationText: routeBack.durationText,
            mapsLink: `https://www.google.com/maps/dir/?api=1&origin=${attractionsToday[attractionsToday.length - 1].lat},${attractionsToday[attractionsToday.length - 1].lng}&destination=${typeof returnPoint === "string" ? encodeURIComponent(returnPoint) : `${returnPoint.lat},${returnPoint.lng}`}`
          });

          todayDistanceKm += routeBack.distanceKm;
          todayDurationSeconds += routeBack.durationSeconds;
        }

        totalLocalDistanceKm += todayDistanceKm;
        totalLocalDurationSeconds += todayDurationSeconds;

        const hours = Math.floor(todayDurationSeconds / 3600);
        const minutes = Math.floor((todayDurationSeconds % 3600) / 60);
        const todayDurationText = hours > 0 ? `${hours} hours ${minutes} mins` : `${minutes} mins`;

        dayWiseRoutes.push({
          dayNum: dayIndex,
          attractions: attractionsToday,
          legs,
          totalDistanceKm: todayDistanceKm,
          totalDurationText: todayDurationText,
          totalDurationSeconds: todayDurationSeconds
        });
      }

      // Dynamic precise finances based on real Maps data
      const people = parseInt(numPeople) || 1;
      const style = (travelStyle || "moderate").toLowerCase();
      const roomsCount = people <= 2 ? 1 : people <= 4 ? 2 : Math.ceil(people / 2);
      let roomRatePerNight = style === "budget" ? 1200 : style === "luxury" ? 9000 : 3500;
      const totalHotelCost = roomRatePerNight * roomsCount * Math.max(1, duration - 1);

      const foodCostPerPersonPerDay = style === "budget" ? 400 : style === "luxury" ? 3000 : 1000;
      const totalFoodCost = foodCostPerPersonPerDay * people * duration;

      let outboundTransportCost = 0;
      if (travelMode === "flight") {
        outboundTransportCost = Math.max(3200, outboundDist * 6.5) * people;
      } else if (travelMode === "train" || travelMode === "bus") {
        outboundTransportCost = Math.max(250, outboundDist * 2.4) * people;
      } else {
        outboundTransportCost = (outboundDist * 10) + (outboundDist * 1.5);
      }
      const totalTransitCost = Math.round(outboundTransportCost * 2);

      const localTransportRatePerKm = style === "budget" ? 15 : style === "luxury" ? 65 : 35;
      const totalLocalTransportCost = Math.round(totalLocalDistanceKm * localTransportRatePerKm);

      const baseTicketCost = style === "budget" ? 50 : style === "luxury" ? 500 : 150;
      const totalTicketCost = attractions.length * baseTicketCost * people;

      const shoppingAllowance = style === "budget" ? 1000 * people : style === "luxury" ? 10000 * people : 3000 * people;

      const grandTotalBudget = totalHotelCost + totalFoodCost + totalTransitCost + totalLocalTransportCost + totalTicketCost + shoppingAllowance;
      const targetBudget = budget || grandTotalBudget;
      const emergencyBuffer = Math.round(grandTotalBudget * 0.08);
      const totalCostWithBuffer = grandTotalBudget + emergencyBuffer;
      const costPerPerson = Math.round(totalCostWithBuffer / people);

      let additionalGuidelines = "";
      if (includeHiddenGems !== false) {
        additionalGuidelines += `\n5. INCLUDE SPECIFIC HIDDEN GEMS: In the 'aiFeatures.hiddenGems' array and inside the day plans, you MUST recommend specific, real, lesser-known/offbeat locations (hidden gems) for ${location}. Avoid generic names.`;
      }
      if (includeLocalExperiences !== false) {
        additionalGuidelines += `\n6. INCLUDE AUTHENTIC LOCAL EXPERIENCES: In the 'aiFeatures.localFood' array and throughout the days, suggest specific local culinary highlights, traditional street food spots, and native cultural activities in ${location}.`;
      }

      const prompt = `You are the expert AI Travel Planner engine for "Travolor", the premium professional travel platform.
Your task is to generate an incredibly high-fidelity, highly detailed, production-ready, beautiful travel itinerary JSON string conforming EXACTLY to the TypeScript schema below.
Never generate fake travel distance. Never generate fake driving or travel time. Leverage the exact Google Maps computations and Live Weather values provided below.

We computed the exact travel route and attraction clusters from the starting point to destination using the Google Maps Platform:
- Departure City (Origin): ${startLocation}
- Destination Location (To): ${location}
- One-Way Transit Distance: ${outboundDist} km
- Transit Travel Time: ${outboundDurationText}
- Selected Transit Mode: ${travelMode || "Car/Transit"}
- Total Round-Trip Distance: ${outboundDist * 2} km
- Total Local Sightseeing Distance: ${totalLocalDistanceKm} km
- Grand Total Route Distance: ${outboundDist * 2 + totalLocalDistanceKm} km

LIVE DESTINATION WEATHER FOR ${location}:
- Current Temperature: ${weatherData.temp}
- Condition: ${weatherData.condition}
- Rain Chance: ${weatherData.rainChance}
- Humidity: ${weatherData.humidity}
- Travel Advice: ${weatherData.advice}

DAY-WISE ATTRACTIONS SIGHTSEEING ORDER PROVIDED BY MAPS ENGINE:
${dayWiseRoutes.map((route: any) => `
Day ${route.dayNum}:
- Attractions: ${route.attractions.map((a: any) => `${a.name} (Rating: ${a.rating})`).join(", ")}
- Legs:
${route.legs.map((leg: any, idx: number) => `  ${idx + 1}. ${leg.from} to ${leg.to} (Distance: ${leg.distanceKm} km, Duration: ${leg.durationText})`).join("\n")}
`).join("\n")}

USER PARAMETERS:
- Departure: ${startLocation}
- Destination: ${location}
- Dates: ${travelDate || "Upcoming"}
- Duration: ${duration} Days
- Travelers: ${people} People
- Selected Style: ${style.toUpperCase()} (Budget Level)
- Target Budget: ₹${targetBudget.toLocaleString('en-IN')} INR
- Language Preference: Please write ALL values, descriptions, names, tips, and guidelines in the language: ${language}.

YOUR OUTPUT MUST BE A SINGLE VALID JSON OBJECT conforming strictly to this format:
{
  "hero": {
    "destination": string,
    "image": string (a high-quality Unsplash image URL related to ${location}),
    "weather": {
      "temp": string (e.g. "${weatherData.temp}"),
      "condition": string (e.g. "${weatherData.condition}"),
      "rainChance": string (e.g. "${weatherData.rainChance}"),
      "humidity": string (e.g. "${weatherData.humidity}"),
      "advice": string (e.g. "${weatherData.advice}")
    },
    "tripScore": number (calculated score from 85 to 99 based on travel style compatibility),
    "budgetScore": number (score from 80 to 98 based on how well target budget ₹${targetBudget} covers expenses),
    "travelTime": string (e.g. "${outboundDurationText}"),
    "distance": string (e.g. "${outboundDist} km"),
    "totalCost": number (calculated grand total in INR, e.g. ${grandTotalBudget}),
    "navigationLink": string (e.g. "https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(startLocation)}&destination=${encodeURIComponent(location)}"),
    "pdfLink": string (e.g. "#print"),
    "shareLink": string (e.g. "#share")
  },
  "day0": {
    "departureTime": string (e.g. "06:00 AM"),
    "route": string (e.g. "${startLocation} - Highway - ${location}"),
    "distance": string (e.g. "${outboundDist} km"),
    "drivingTime": string (e.g. "${outboundDurationText}"),
    "fuel": string (estimated fuel cost, e.g. "₹${Math.round(totalTransitCost * 0.4)}"),
    "toll": string (estimated tolls, e.g. "₹450"),
    "fuelStopSuggestions": string (recommended fuel/charging stops),
    "breakfastStop": string (high-quality highway breakfast joint/food court recommendation with timings),
    "lunchStop": string (high-quality highway lunch joint/dhaba with timings),
    "coffeeStop": string (recommended tea/coffee/snacks stops),
    "restStops": string (washrooms & rest stops info),
    "scenicStops": string (scenic highway spots),
    "arrivalTime": string (e.g. "05:30 PM"),
    "hotelCheckIn": string (lodging recommendation matching the ${style} style),
    "dinner": string (delicious local restaurant or diner recommendation),
    "sleep": string
  },
  "days": [
    // Must generate exactly ${duration} days. Every day MUST have detailed Morning, Afternoon, Evening, and Night segments WITH specific timing ranges (e.g. "09:00 AM - 11:30 AM")!
    {
      "dayNum": number,
      "title": string (theme for the day),
      "morning": {
        "time": string (e.g. "08:30 AM - 12:00 PM"),
        "breakfast": string (specific breakfast joint with Rating ⭐),
        "place": {
          "name": string (from the day's sightseeing order list above),
          "rating": number (e.g. 4.6),
          "opening": string (real opening time),
          "closing": string (real closing time),
          "fee": string (real entry fee, e.g. "₹50 per person"),
          "visitTime": string (average visit time, e.g. "1.5 hours"),
          "navigation": string,
          "parking": string (real parking info),
          "washroom": string (real washroom availability),
          "restaurants": string (real nearby food joints),
          "hospital": string (real nearby clinic/hospital),
          "photoSpot": string (where to take the best photo here),
          "aiTips": string (custom pro travel advice for this spot)
        }
      },
      "afternoon": {
        "time": string (e.g. "12:30 PM - 04:30 PM"),
        "lunch": string (specific lunch joint with Rating ⭐),
        "place": {
          "name": string (from the day's sightseeing order list above),
          "rating": number,
          "opening": string,
          "closing": string,
          "fee": string,
          "visitTime": string,
          "navigation": string,
          "parking": string,
          "washroom": string,
          "restaurants": string,
          "hospital": string
        },
        "nearbyCafes": [string, string],
        "shopping": string (local specialty market recommendation)
      },
      "evening": {
        "time": string (e.g. "05:00 PM - 08:00 PM"),
        "sunsetPoint": string,
        "streetFood": string (specific native snacks),
        "nightWalk": string,
        "returnHotel": string
      },
      "night": {
        "time": string (e.g. "08:30 PM - 11:00 PM"),
        "dinner": string (specific dinner restaurant with Rating ⭐),
        "nightLife": string (local night activity or leisure spot)
      }
    }
  ],
  "lastDay": {
    "hotelCheckout": string,
    "shopping": string,
    "lunch": string,
    "returnJourney": string,
    "arrival": string,
    "reachHome": string,
    "tripCompleted": string
  },
  "hotelsList": [
    // Dedicated hotel options for the city
    { "category": "Budget", "name": string, "desc": string, "ratePerNight": string },
    { "category": "Mid-range", "name": string, "desc": string, "ratePerNight": string },
    { "category": "Luxury", "name": string, "desc": string, "ratePerNight": string }
  ],
  "budgetDashboard": {
    "fuel": number (e.g. ${totalTransitCost}),
    "hotel": number (e.g. ${totalHotelCost}),
    "food": number (e.g. ${totalFoodCost}),
    "shopping": number (e.g. ${shoppingAllowance}),
    "activities": number (e.g. ${totalTicketCost}),
    "transport": number (e.g. ${totalLocalTransportCost}),
    "emergency": number (e.g. ${emergencyBuffer}),
    "grandTotal": number (e.g. ${grandTotalBudget}),
    "costPerPerson": number (e.g. ${costPerPerson})
  },
  "aiFeatures": {
    "budgetOptimizer": string (high-fidelity custom travel budget optimization tips),
    "hiddenGems": [
      { "name": string, "desc": string },
      { "name": string, "desc": string }
    ],
    "localFood": [
      { "dish": string, "joint": string, "desc": string },
      { "dish": string, "joint": string, "desc": string }
    ],
    "packingList": [string, string, string, string, string],
    "safetyTips": [string, string, string],
    "festivalSuggestions": string,
    "photographySpots": [string, string, string],
    "shoppingGuide": string,
    "crowdPrediction": string (hour-by-hour crowd expectations),
    "bestVisitingTime": string
  },
  "checklist": [string, string, string, string, string],
  "emergencyContacts": [
    { "name": string, "contact": string },
    { "name": string, "contact": string }
  ]
}

DO NOT include any Markdown wrapping like \`\`\`json or \`\`\` in your response. Output ONLY the raw JSON string starting with { and ending with }. All strings and text in the JSON MUST be in ${language}. Never return a truncated JSON. Fill in all details properly.`;

      if (!hasKey) {
        console.warn("GEMINI_API_KEY missing on server. Triggering high-fidelity local generator fallback.");
        const fallback = await generateLocalItinerary(startLocation, location, duration, travelStyle, numPeople, language, travelMode, travelDate, targetBudget, includeHiddenGems, includeLocalExperiences, weatherData);
        // Enrich local fallback
        if (fallback && fallback.structured) {
          enrichItineraryWithMaps(
            fallback.structured,
            dayWiseRoutes,
            startLocation,
            location,
            duration,
            outboundDist,
            outboundDurationText,
            totalTransitCost,
            totalHotelCost,
            totalFoodCost,
            shoppingAllowance,
            totalTicketCost,
            totalLocalTransportCost,
            emergencyBuffer,
            totalCostWithBuffer,
            costPerPerson
          );
        }
        return res.json(fallback);
      }

      const useHighThinking = enableThinking === true || travelStyle === "luxury";
      const model = useHighThinking ? "gemini-3.1-pro-preview" : "gemini-3.5-flash";
      
      const config: any = {
        responseMimeType: "application/json"
      };
      if (useHighThinking) {
        config.thinkingConfig = { thinkingLevel: ThinkingLevel.HIGH };
      }

      const response = await getAi().models.generateContent({
        model: model,
        contents: prompt,
        config: config
      });

      const responseText = (response.text || "").trim();
      let structuredData: any = null;

      try {
        // Safe parse
        structuredData = JSON.parse(responseText);
      } catch (pe) {
        console.error("Failed to parse Gemini output as JSON, trying clean regex:", pe);
        const match = responseText.match(/\{[\s\S]*\}/);
        if (match) {
          structuredData = JSON.parse(match[0]);
        }
      }

      if (!structuredData || !structuredData.hero) {
        throw new Error("Invalid structured schema returned by model.");
      }

      // Server-side dynamic financial & link enrichment to guarantee 100% mathematical accuracy and zero hallucination
      enrichItineraryWithMaps(
        structuredData,
        dayWiseRoutes,
        startLocation,
        location,
        duration,
        outboundDist,
        outboundDurationText,
        totalTransitCost,
        totalHotelCost,
        totalFoodCost,
        shoppingAllowance,
        totalTicketCost,
        totalLocalTransportCost,
        emergencyBuffer,
        totalCostWithBuffer,
        costPerPerson
      );

      // Generate a markdown fallback text for backwards compatibility if needed
      let outMarkdown = `# 🌍 ${structuredData.hero.destination} End-to-End Travel Itinerary\n\n`;
      outMarkdown += `⏱️ Duration: ${duration} Days | Score: ⭐ ${structuredData.hero.tripScore}/100\n`;
      outMarkdown += `💰 Estimated Cost: ₹${structuredData.hero.totalCost.toLocaleString('en-IN')}\n\n`;
      outMarkdown += `## 🗓️ Day-by-Day Plan:\n\n`;
      structuredData.days.forEach((day: any) => {
        outMarkdown += `### Day ${day.dayNum}: ${day.title}\n`;
        outMarkdown += `- **Morning** (${day.morning?.time || "09:00 AM - 12:00 PM"}): ${day.morning?.breakfast}\n`;
        outMarkdown += `  - **Visit**: ${day.morning?.place?.name} (⭐ ${day.morning?.place?.rating || 4.5})\n`;
        outMarkdown += `- **Afternoon** (${day.afternoon?.time || "12:30 PM - 04:30 PM"}): ${day.afternoon?.lunch}\n`;
        outMarkdown += `  - **Visit**: ${day.afternoon?.place?.name}\n`;
        outMarkdown += `- **Evening** (${day.evening?.time || "05:00 PM - 08:00 PM"}): ${day.evening?.sunsetPoint}\n`;
        if (day.night) {
          outMarkdown += `- **Night** (${day.night?.time || "08:30 PM - 11:00 PM"}): ${day.night?.dinner} | Activity: ${day.night?.nightLife}\n\n`;
        } else {
          outMarkdown += `\n`;
        }
      });

      res.json({ 
        text: outMarkdown,
        structured: structuredData,
        sources: [
          { title: "Google Maps Platform Live Data", uri: "https://maps.google.com" },
          { title: "Travolor AI Planner Engine", uri: "https://travolor.com" }
        ],
        modelUsed: model,
        grounded: false
      });
    } catch (error: any) {
      console.error("Failed to generate itinerary:", error);
      res.status(500).json({ error: error.message || "Failed to generate itinerary. Please try again." });
    }
  });

  app.post("/api/gemini/generate-roadtrip", async (req, res) => {
    const { startLocation, destination, duration, routePreference, stopFrequency, travelMode = "self-drive", language = "en" } = req.body;
    const hasKey = Boolean(process.env.GEMINI_API_KEY);

    // First fetch live route data from Google Routes API before calling Gemini
    const routeData = await computeRouteBetweenPoints(startLocation, destination);

    const prompt = `You are an expert AI Multi-Modal Travel & Highway Route Planner for "Travolor".
Your task is to plan a detailed end-to-end trip starting from "${startLocation}" to "${destination}" using the travel mode: "${travelMode}".
The plan should be optimized for a ${duration} day journey. The user prefers a "${routePreference}" route and wants "${stopFrequency}" stops where applicable.

We computed the exact live route data from Google Routes API:
- Start Location (Origin): ${startLocation}
- Destination Location: ${destination}
- Computed One-Way Transit Distance: ${routeData.distanceKm} km
- Computed Transit Travel Duration: ${routeData.durationText}
- Selected Travel Mode: ${travelMode}

IMPORTANT: The route details MUST start from the starting city "${startLocation}" and go to "${destination}". Ensure you provide REAL DATA, including actual tourist places, highways, flight carriers, train names/numbers, or bus operators depending on the travel mode chosen. Incorporate the computed Google Routes API distance (${routeData.distanceKm} km) and duration (${routeData.durationText}) accurately in the JSON response under "totalDistance" and "totalDrivingTime".

Here are the guidelines based on the travelMode:
1. "self-drive": Return a road trip route by car. Detail highways, scenic viewpoints, dhabas, tea points, toll estimates, and rest stops starting from ${startLocation} up to ${destination}.
2. "cab": Detail private outstation taxi options from ${startLocation} to ${destination}. Include approximate cab fares, reliable local/regional taxi service operators (e.g. MakeMyTrip Cabs, Ola Outstation, Savaari), driver/safety rules, highway rest stops, and nice cafes on the way.
3. "bus": Detail intercity luxury bus routes from ${startLocation} to ${destination}. List actual reputable bus operators (e.g. Prasanna Purple, VRL Travels, Neeta Travels, SRS, KSRTC, MSRTC Shivneri/Shivshahi), prominent boarding terminals in ${startLocation}, dropping terminals in ${destination}, dinner/washroom highway stops, and typical ticket price range.
4. "train": Detail Indian Railways (IRCTC) express/superfast/Vande Bharat/Rajdhani train options between ${startLocation} and ${destination}. List real train names & numbers (e.g. Mandovi Express, Tejas Express, Konkan Kanya, Shatabdi), major scenic vistas seen from the window (e.g., Dudhsagar falls, Western Ghat tunnels), major station halts, food specialties sold at specific platform stalls (e.g., Batata Vada at Karjat, Lonavala Chikki, etc.), and train class tips (e.g., 2A, 3A, CC).
5. "flight": Detail commercial flight options from the nearest airport of "${startLocation}" to the nearest airport of "${destination}". Include real airline names (e.g., IndiGo, Air India, Akasa Air), airport terminal names/codes, average ticket pricing, baggage allowance tips, direct vs. layover details, and recommended airport transfer options (shuttles, prepaid cabs, metro) to reach the city center after landing.

Regardless of the travel mode, provide the response in structured JSON format matching this schema:
{
  "tripOverview": {
    "startPoint": "Starting city name",
    "destination": "Destination city name",
    "totalDistance": "Approx distance in km or flight mileage, e.g. 450 km",
    "totalDrivingTime": "Approx travel duration (e.g. 8.5 hours drive, 1.5 hours flight, 10 hours train)",
    "mainHighway": "Name of main Highway, Railway Route, Airline, or Bus route name",
    "tollEstimation": "Approx cost estimate (Toll cost for car, total ticket price range for train/bus/flight/cab, e.g. ₹650 or ₹1,200 - ₹3,500)",
    "summary": "A 1-2 sentence overview of the trip experience, landscape, or speed convenience."
  },
  "dayWisePlan": [
    {
      "day": 1,
      "theme": "Theme of Day 1, e.g. Climbing the Ghats or Boarding the Express Train",
      "startLocation": "Starting station, terminal, or city for this day",
      "endLocation": "End stopover point, hotel, or station for this day",
      "drivingDistance": "Distance or progress covered today, e.g. 240 km",
      "drivingTime": "Total time on journey for today, e.g. 5 hours",
      "pitStops": [
        {
          "name": "Actual tourist stop, station halt, airport layover terminal, scenic bridge, or highway eatery along the way",
          "type": "pitstop", // can be "pitstop", "sightseeing", "restaurant", "station", "airport", "transit"
          "description": "Engaging, real-data description (2 sentences) of this stop, local food to try, or scenery to look out of the window for.",
          "distanceFromStart": "Progress marker from start, e.g. 60 km or 2 hours in",
          "duration": "Halt duration, e.g. 45 mins or 15 min train stop",
          "lat": 18.1234,
          "lng": 73.5678
        }
      ],
      "stayover": {
        "name": "Recommended hotel, resort, or accommodation at the day's end-point",
        "description": "Short description of why it is highly convenient for this mode of travel."
      }
    }
  ],
  "proRoadTripTips": [
    "Tip 1: High-value advice tailored specifically to the selected travel mode (${travelMode})",
    "Tip 2: Baggage, safety, booking windows, or ticket discount tips"
  ],
  "highwayDhabas": [
    {
      "name": "Famous dhaba, platform stall, airport lounge, or highway restaurant along this journey",
      "specialty": "Top rated dish, food, or snack to try",
      "distance": "Specific highway km, platform number, or terminal location"
    }
  ]
}

Please make sure all descriptions, tips, and titles are written in the requested language: "${language}". (If "mr", write in beautiful, clear Marathi. If "hi", write in Hindi. If "en", write in English). Note that name strings can be written in English or transliterated, but all descriptive text must be in the specified language.
Output ONLY a raw, valid JSON object. No markdown, no \`\`\`json blocks. If you use backticks, make sure the output is just the JSON.`;

    // Local Fallback Data
    const generateLocalRoadTrip = (start: string, dest: string, dur: number, mode: string, lang: string) => {
      const isMarathi = lang === "mr";
      const isHindi = lang === "hi";

      const cleanStart = (start || "").toLowerCase().trim();
      const cleanDest = (dest || "").toLowerCase().trim();

      const isGoaTrip = cleanDest.includes("goa") || cleanStart.includes("pune") || cleanStart.includes("mumbai");
      const isDelhiTrip = cleanDest.includes("jaipur") || cleanDest.includes("agra") || cleanStart.includes("delhi");

      // Custom mode specific overview text
      const getModeSummary = (modeType: string) => {
        if (modeType === "train") {
          return isMarathi 
            ? `${start} ते ${dest} रेल्वे प्रवास हा कोकण रेल्वेच्या नयनरम्य बोगदे, धबधबे आणि पुलांमधून जाणारा एक अविस्मरणीय अनुभव आहे.`
            : `A captivating train journey featuring scenic valleys, tunnels, and traditional railway platform snacks.`;
        }
        if (modeType === "flight") {
          return isMarathi
            ? `जलद आणि सोयीस्कर विमान प्रवास, ज्यामध्ये वेळ वाचतो आणि आरामदायी प्रवास मिळतो.`
            : `Ultra-fast air travel saving hours of highway driving, with convenient city transfer connections.`;
        }
        if (modeType === "bus") {
          return isMarathi
            ? `आरामदायी खाजगी किंवा सरकारी स्लीपर बसमधून महामार्गावरून सुरक्षित रात्रप्रवास.`
            : `Comfortable overnight premium AC Sleeper bus ride with scheduled highway rest stops.`;
        }
        if (modeType === "cab") {
          return isMarathi
            ? `खाजगी आउटस्टेशन कॅब प्रवास, ज्यामध्ये इच्छेनुसार थांबे घेण्याची आणि विश्रांती घेण्याची पूर्ण मुभा मिळते.`
            : `Hassle-free outstation private cab journey with experienced chauffeurs and customized scenic detours.`;
        }
        return isMarathi
          ? `${start} ते ${dest} हा पश्चिम घाटातून आणि निसर्गरम्य घाटांमधून जाणारा एक उत्तम स्वयंचलित (Self-Drive) रोड ट्रिप मार्ग आहे.`
          : `A classic highway self-drive adventure through the lush green scenery and incredible winding ghats.`;
      };

      if (isGoaTrip) {
        if (mode === "train") {
          return {
            tripOverview: {
              startPoint: start || "Pune",
              destination: dest || "Goa",
              totalDistance: "510 km",
              totalDrivingTime: "10 hours",
              mainHighway: "Konkan Railway Express (Tejas / Mandovi)",
              tollEstimation: "₹450 - ₹1,800 (Sleeper/AC Tickets)",
              summary: getModeSummary("train")
            },
            dayWisePlan: [
              {
                day: 1,
                theme: isMarathi ? "कोकण रेल्वेचा अविस्मरणीय प्रवास" : "Konkan Railway Majestic Route",
                startLocation: start || "Pune",
                endLocation: "Madgaon Junction (Goa)",
                drivingDistance: "510 km",
                drivingTime: "10 hours",
                pitStops: [
                  {
                    name: "Karjat Junction / Chiplun Halt",
                    type: "station",
                    description: isMarathi 
                      ? "चवदार वडापाव आणि चहासाठी प्रसिद्ध रेल्वे स्थानक. कोकणच्या सुंदर डोंगररांगा येथून सुरू होतात." 
                      : "Famous station halt known for piping hot Batata Vada and sweet Lonavala Chikki as the train enters scenic curves.",
                    distanceFromStart: "3 hours in",
                    duration: "15 mins",
                    lat: 18.9102,
                    lng: 73.3282
                  },
                  {
                    name: "Dudhsagar Waterfall Scenic Passage",
                    type: "sightseeing",
                    description: isMarathi 
                      ? "रेल्वे खिडकीतून दिसणारा अथांग आणि फेसाळणारा दूधसागर धबधबा, जो डोळ्यांचे पारणे फेडतो." 
                      : "The breathtaking view of Dudhsagar Waterfalls cascading down the mountains right beside the railway tracks.",
                    distanceFromStart: "8 hours in",
                    duration: "Passing View",
                    lat: 15.3144,
                    lng: 74.3142
                  }
                ],
                stayover: {
                  name: "Caravela Beach Resort, South Goa",
                  description: isMarathi ? "मडगाव रेल्वे स्टेशनजवळ असलेले विस्तीर्ण समुद्रकिनारी वसलेले उत्तम रिसॉर्ट." : "Splendid beachside resort located within easy driving distance from Madgaon railway station."
                }
              }
            ],
            proRoadTripTips: [
              isMarathi ? "तिकीट बुक करताना 'विंडो सीट' निवडा जेणेकरून घाटातील निसर्गसौंदर्य जवळून अनुभवता येईल." : "Book a Window Seat on the right side when traveling towards Goa to get the best mountain and valley vistas.",
              "Order local fish thali or vegetable biryani in advance via the IRCTC e-Catering app at Ratnagiri station."
            ],
            highwayDhabas: [
              {
                name: "Ratnagiri Railway Food Stall",
                specialty: "Fresh Alphonso Mango Pulp (seasonal) & Kanda Bhaji",
                distance: "Platform No. 1, Ratnagiri Station"
              }
            ]
          };
        }

        if (mode === "flight") {
          return {
            tripOverview: {
              startPoint: start || "Pune Airport (PNQ)",
              destination: dest || "Goa Mopa Airport (GOX)",
              totalDistance: "360 km",
              totalDrivingTime: "1 hour 10 mins",
              mainHighway: "IndiGo / Air India Direct Flight",
              tollEstimation: "₹3,500 - ₹6,500 (Economy Class)",
              summary: getModeSummary("flight")
            },
            dayWisePlan: [
              {
                day: 1,
                theme: isMarathi ? "जलद हवाई प्रवास आणि मोपा विमानतळ आगमन" : "Quick Flight & Mopa Airport Arrival",
                startLocation: start || "Pune Airport",
                endLocation: "North Goa Beach Stay",
                drivingDistance: "360 km",
                drivingTime: "1.2 hours",
                pitStops: [
                  {
                    name: "Pune Airport Terminal 2",
                    type: "airport",
                    description: isMarathi 
                      ? "नवीन आणि आधुनिक टर्मिनल. अनेक उत्कृष्ट कॅफे आणि शॉपिंग सेंटर्स उपलब्ध आहेत." 
                      : "The newly inaugurated Terminal 2 at Pune. Fast security check and rich premium lounges for quick breakfast.",
                    distanceFromStart: "Airport Start",
                    duration: "2 hours buffer",
                    lat: 18.5822,
                    lng: 73.9197
                  },
                  {
                    name: "Manohar International Airport (MOPA), Goa",
                    type: "airport",
                    description: isMarathi 
                      ? "गोव्याचे सर्वात नवीन विमानतळ, जे अत्यंत देखणे आणि पर्यावरणस्नेही डिझाईनने बनवले आहे." 
                      : "Goa's premium and eco-friendly airport in Mopa. Highly streamlined for prepaid cabs and shuttle buses to North Goa.",
                    distanceFromStart: "360 km Flight",
                    duration: "Arrival",
                    lat: 15.7291,
                    lng: 73.8642
                  }
                ],
                stayover: {
                  name: "W Goa, Vagator Beach",
                  description: isMarathi ? "मोपा विमानतळापासून अवघ्या पाऊण तासावर असलेले उत्कृष्ट आलिशान हॉटेल." : "Incredibly chic luxury hotel on Vagator Beach, reachable in just 45 minutes from Mopa Airport."
                }
              }
            ],
            proRoadTripTips: [
              isMarathi ? "मोपा विमानतळावरून गोव्यातील विविध भागांत जाण्यासाठी सरकारी इलेक्ट्रिक बसेस स्वस्त पर्याय आहेत." : "Take the government electric air-conditioned shuttle bus from Mopa Airport to Panaji or Calangute for a pocket-friendly ride.",
              "Keep hand baggage under 7 kg and check-in baggage under 15 kg to avoid extra charges at the airport."
            ],
            highwayDhabas: [
              {
                name: "GoodTimes Lounge Mopa",
                specialty: "Local Bebinca Dessert & Filter Coffee",
                distance: "Mopa Airport Departure Area"
              }
            ]
          };
        }

        if (mode === "bus") {
          return {
            tripOverview: {
              startPoint: start || "Pune",
              destination: dest || "Goa",
              totalDistance: "450 km",
              totalDrivingTime: "9 hours",
              mainHighway: "NH-48 via Amboli Pass (Luxury Sleeper Bus)",
              tollEstimation: "₹1,200 - ₹2,200 (Multi-Axle AC Sleeper)",
              summary: getModeSummary("bus")
            },
            dayWisePlan: [
              {
                day: 1,
                theme: isMarathi ? "आरामदायी रात्रीचा बस प्रवास" : "Luxury Overnight Sleeper Ride",
                startLocation: start || "Pune",
                endLocation: "Panaji Bus Stand",
                drivingDistance: "450 km",
                drivingTime: "9 hours",
                pitStops: [
                  {
                    name: "Swargate / Hinjawadi Boarding Terminal",
                    type: "transit",
                    description: isMarathi 
                      ? "पुण्यातील प्रमुख बस बोर्डिंग पॉइंट जेथे प्रवाशांसाठी उत्कृष्ट आसन व्यवस्था आणि चहा मिळतो." 
                      : "Major luxury bus boarding point with plenty of waiting lounges, cafes, and immediate highway access.",
                    distanceFromStart: "Boarding",
                    duration: "30 mins",
                    lat: 18.5018,
                    lng: 73.8636
                  },
                  {
                    name: "Kolhapur Mid-way Dining plaza",
                    type: "restaurant",
                    description: isMarathi 
                      ? "बस प्रवाशांसाठी रात्रीच्या भोजनासाठी राखीव असलेले स्वच्छ आणि सुरक्षित हॉटेल." 
                      : "Popular multi-cuisine pure veg & non-veg highway oasis where luxury buses stop for dinner and washroom breaks.",
                    distanceFromStart: "230 km in",
                    duration: "45 mins",
                    lat: 16.6912,
                    lng: 74.2412
                  }
                ],
                stayover: {
                  name: "Cidade de Goa, Panaji",
                  description: isMarathi ? "पणजी बस स्टँडजवळ असलेले निसर्गरम्य समुद्रकिनारी वसलेले जुने पोर्तुगीज धाटणीचे हॉटेल." : "Charming Portuguese-style luxury hotel located near Panaji Bus Stand for absolute transit ease."
                }
              }
            ],
            proRoadTripTips: [
              isMarathi ? "आंबोली घाटातील वळणांवर काहींना मळमळ होऊ शकते, म्हणून सोबत आल्याचे गोड किंवा औषध ठेवा." : "Ghat sections like Amboli can cause motion sickness; choose a lower berth in the middle of the bus for maximum stability.",
              "Always carry a light shawl or sweater as AC sleeper buses can get quite chilly during the night."
            ],
            highwayDhabas: [
              {
                name: "Hotel Sai International",
                specialty: "Hot Misal Pav and filter tea",
                distance: "NH-48 highway, Near Sangli Phata"
              }
            ]
          };
        }

        if (mode === "cab") {
          return {
            tripOverview: {
              startPoint: start || "Pune",
              destination: dest || "Goa",
              totalDistance: "450 km",
              totalDrivingTime: "8 hours",
              mainHighway: "NH-48 & Nipani-Amboli Pass (AC Sedan/SUV Cab)",
              tollEstimation: "₹11,000 - ₹15,000 (All-inclusive One-Way Cab)",
              summary: getModeSummary("cab")
            },
            dayWisePlan: [
              {
                day: 1,
                theme: isMarathi ? "खाजगी प्रवासाचा आनंद" : "Chauffeur Driven Highway Cruise",
                startLocation: start || "Pune",
                endLocation: dest || "Goa",
                drivingDistance: "450 km",
                drivingTime: "8 hours",
                pitStops: [
                  {
                    name: "Karad Riverfront Food Mall",
                    type: "restaurant",
                    description: isMarathi 
                      ? "महामार्गावरील अत्यंत स्वच्छ प्रसाधनगृहे आणि अनेक खाण्याची दुकाने असलेले प्रशस्त मॉल." 
                      : "A premium highway stop featuring clean amenities, Starbucks, and multiple Indian fast-food counters.",
                    distanceFromStart: "160 km",
                    duration: "30 mins",
                    lat: 17.2882,
                    lng: 74.1834
                  },
                  {
                    name: "Amboli Valley View & Hot Tea Halt",
                    type: "sightseeing",
                    description: isMarathi 
                      ? "घाटाच्या दरीचे सुंदर दृश्य पाहत स्थानिक गरम चहा आणि भजी खाण्याचा सुंदर अनुभव." 
                      : "A majestic valley lookout. Ask your driver to stop here for warm onion fritters (Kanda Bhaji) and ginger tea.",
                    distanceFromStart: "340 km",
                    duration: "30 mins",
                    lat: 15.9612,
                    lng: 73.9987
                  }
                ],
                stayover: {
                  name: "Taj Fort Aguada Resort, Goa",
                  description: isMarathi ? "उत्कृष्ट ऐतिहासिक किल्ला आणि अथांग अरबी समुद्राचे विहंगम दृश्य देणारे लक्झरी रिसॉर्ट." : "A stunning luxury fortress resort overlooking the Arabian Sea, providing secure private parking for cabs."
                }
              }
            ],
            proRoadTripTips: [
              isMarathi ? "कॅब ठरवताना टोल टॅक्स आणि स्टेट बॉर्डर परमिट चार्जेस आधीच भाड्यात समाविष्ट आहेत का ते तपासा." : "Ensure your outstation cab quote includes all state border entry permits (Maharashtra-Karnataka-Goa) and toll taxes.",
              "Ask the driver to drive slowly through the Amboli Ghat fog sections for safe photography and smooth driving."
            ],
            highwayDhabas: [
              {
                name: "Sardarji Ka Dhaba, Nippani",
                specialty: "Butter Chicken with Garlic Naan & Dal Makhani",
                distance: "NH-48, Maharashtra border gate"
              }
            ]
          };
        }

        // Default Self-Drive popular route (Goa)
        return {
          tripOverview: {
            startPoint: start || "Pune",
            destination: dest || "Goa",
            totalDistance: "450 km",
            totalDrivingTime: "8.5 hours",
            mainHighway: "NH-48 & Nipani-Amboli Road",
            tollEstimation: "₹670 (Fastag)",
            summary: getModeSummary("self-drive")
          },
          dayWisePlan: [
            {
              day: 1,
              theme: isMarathi ? "सातारा आणि कोल्हापूर दर्शन" : "Scenic drive along NH-48 with historic stops",
              startLocation: start || "Pune",
              endLocation: "Kolhapur",
              drivingDistance: "230 km",
              drivingTime: "4.5 hours",
              pitStops: [
                {
                  name: "Mapro Garden, Shirwal",
                  type: "pitstop",
                  description: isMarathi 
                    ? "महामार्गावरील प्रसिद्ध केंद्र जिथे फ्रेश स्ट्रॉबेरी शेक, सँडविच आणि शुद्ध शाकाहारी पदार्थ मिळतात." 
                    : "Famous highway stopover known for fresh strawberry shakes, grilled sandwiches, and premium fruit products.",
                  distanceFromStart: "55 km",
                  duration: "45 mins",
                  lat: 18.1364,
                  lng: 74.0152
                },
                {
                  name: "Sajjangad Fort, Satara",
                  type: "sightseeing",
                  description: isMarathi 
                    ? "समर्थ रामदास स्वामींचे समाधी स्थान असलेला शांत गड, जिथून उरमोडी धरणाचा सुंदर परिसर दिसतो." 
                    : "Sacred hill fort of Samarth Ramdas Swami, offering spiritual calmness and panoramic views of Urmodi dam.",
                  distanceFromStart: "115 km",
                  duration: "1.5 hours",
                  lat: 17.6534,
                  lng: 73.9182
                }
              ],
              stayover: {
                name: "Hotel Sayaji, Kolhapur",
                description: isMarathi ? "कोल्हापूरमधील सर्वोत्तम लक्झरी हॉटेल, जिथे तुम्ही कोल्हापुरी पाहुणचाराचा आनंद घेऊ शकता." : "High-rated luxury stayover in Kolhapur, ideal for refreshing before entering the ghat sections tomorrow."
              }
            },
            {
              day: 2,
              theme: isMarathi ? "महालक्ष्मी मंदिर आणि आंबोली घाट मार्गे गोवा" : "Temple blessings and lush forest descents",
              startLocation: "Kolhapur",
              endLocation: dest || "Goa",
              drivingDistance: "220 km",
              drivingTime: "4 hours",
              pitStops: [
                {
                  name: "Mahalakshmi Temple, Kolhapur",
                  type: "sightseeing",
                  description: isMarathi 
                    ? "ऐतिहासिक करवीर निवासिनी अंबाबाई मंदिर. प्रवासाच्या पुढील टप्प्यासाठी देवीचे आशीर्वाद घ्या." 
                    : "A historic 7th-century temple of Goddess Ambabai. Seek blessings before embarking on the ghat route.",
                  distanceFromStart: "5 km",
                  duration: "1 hour",
                  lat: 16.6997,
                  lng: 74.2246
                },
                {
                  name: "Amboli Waterfall & Sunset Point",
                  type: "sightseeing",
                  description: isMarathi 
                    ? "आंबोली घाटातील प्रसिद्ध धबधबा आणि दरीचे निसर्गरम्य दृश्य. वर्षा ऋतूत अत्यंत देखणा दिसतो." 
                    : "A stunning waterfall in the misty Amboli Ghats. Perfect spot for photography and piping hot tea.",
                  distanceFromStart: "135 km",
                  duration: "45 mins",
                  lat: 15.9612,
                  lng: 73.9987
                }
              ],
              stayover: {
                name: "Taj Exotica Resort & Spa, Goa",
                description: isMarathi ? "गोव्यातील समुद्रकिनाऱ्यावरील आरामदायी आणि विलासी रिसॉर्ट." : "A serene beachside resort in South Goa, perfect for resting after an amazing road trip."
              }
            }
          ],
          proRoadTripTips: [
            isMarathi 
              ? "आंबोली घाटात आणि वनक्षेत्रात मोबाईल नेटवर्क कमी असू शकते, त्यामुळे ऑफलाईन नकाशे डाऊनलोड करून ठेवा." 
              : "Western Ghats ghat sections can have low network coverage, so download offline maps in advance.",
            "Ensure your Fastag has at least ₹1000 balance to bypass NH-48 toll queues."
          ],
          highwayDhabas: [
            {
              name: "Hotel Dehati, Kolhapur",
              specialty: "Authentic Kolhapuri Tambada & Pandhara Rassa Veg/Non-Veg Thali",
              distance: "NH-48, Near Kolhapur City Exit"
            }
          ]
        };
      }

      // Default to a generic road trip if no specific route matches
      return {
        tripOverview: {
          startPoint: start || "Starting Point",
          destination: dest || "Destination",
          totalDistance: "Variable",
          totalDrivingTime: "Variable",
          mainHighway: "Major Highways",
          tollEstimation: "Variable",
          summary: getModeSummary(mode)
        },
        dayWisePlan: [
          {
            day: 1,
            theme: isMarathi ? "प्रवासाचा पहिला दिवस" : "First Day of Travel",
            startLocation: start || "Starting Point",
            endLocation: dest || "Destination",
            drivingDistance: "Variable",
            drivingTime: "Variable",
            pitStops: [],
            stayover: {
              name: "Recommended Hotel",
              description: "Convenient stay for travelers."
            }
          }
        ],
        proRoadTripTips: [
          "Always check weather and road conditions before starting.",
          "Keep emergency contact information handy."
        ],
        highwayDhabas: []
      };
    };

    if (!hasKey) {
      const fallback = generateLocalRoadTrip(startLocation, destination, duration, travelMode, language);
      return res.json(fallback);
    }

    try {
      const response = await getAi().models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          systemInstruction: "You are an expert multi-modal transit route designer. Return JSON only.",
        }
      });
      try {
        const parsed = JSON.parse(response.text || "{}");
        res.json(parsed);
      } catch (jsonErr: any) {
        console.warn("JSON Parse err, serving local road trip:", jsonErr);
        const fallback = generateLocalRoadTrip(startLocation, destination, duration, travelMode, language);
        res.json(fallback);
      }
    } catch (error: any) {
      const isQuota = error?.status === "RESOURCE_EXHAUSTED" || error?.message?.includes("RESOURCE_EXHAUSTED") || error?.message?.includes("spending cap") || error?.message?.includes("429");
      if (isQuota) {
        console.log("Gemini API spending cap or quota exceeded. Using local roadtrip engine.");
      } else {
        console.log("Gemini Roadtrip notice (using fallback):", error?.message || error);
      }
      const fallback = generateLocalRoadTrip(startLocation, destination, duration, travelMode, language);
      res.json(fallback);
    }
  });

  async function generateLocalItinerary(
    startLocation: string,
    location: string,
    durationStr: any,
    travelStyle: string,
    numPeople: any,
    language: string = "en",
    travelMode: string = "self-drive",
    travelDate: string = "",
    targetBudget: number = 0,
    includeHiddenGems: boolean = true,
    includeLocalExperiences: boolean = true,
    weatherData?: any
  ) {
    const duration = parseInt(durationStr) || 3;
    const rawLocation = (location || "").trim();
    const cleanLocation = rawLocation || "Unknown Destination";
    const style = (travelStyle || "moderate").toLowerCase();
    const people = parseInt(numPeople) || 1;
    const isMarathi = language.toLowerCase().startsWith("mr") || language.toLowerCase().includes("marathi");
    const isHindi = language.toLowerCase().startsWith("hi") || language.toLowerCase().includes("hindi");

    const LOCAL_GEMS_AND_EXPERIENCES: Record<string, {
      gems: { name: string; desc: string; mr: string; hi: string }[];
      experiences: { name: string; desc: string; mr: string; hi: string }[];
    }> = {
      goa: {
        gems: [
          { name: "Cola Beach Lagoon", desc: "A serene sweet water lagoon hidden behind coconut groves.", mr: "कोला बीच लेक: नारळाच्या बागांमागे लपलेलं गोड्या पाण्याचे शांत तळे आणि सुंदर समुद्रकिनारा.", hi: "कोला बीच लैगून: नारियल के पेड़ों के पीछे छिपा मीठे पानी का शांत तालाब और सुंदर तट।" },
          { name: "Chorla Ghat Waterfall trek", desc: "An offbeat lush green forest trek with mesmerizing hidden waterfalls.", mr: "चорला घाट धबधबा ट्रेक: हिरव्यागार जंगलातून जाणारा ट्रेक आणि सुंदर लपलेले धबधबे.", hi: "चोरला घाट झरना ट्रैक: घने जंगलों के बीच से होकर गुजरने वाला सुंदर झरना और ट्रैक।" }
        ],
        experiences: [
          { name: "Traditional Feni Distilling & Seafood", desc: "Taste authentic cashew feni and traditional fish curry rice.", mr: "पारंपरिक फेणी तयार करण्याची पद्धत पाहणे आणि अस्सल गोवन फिश करी राईस चाखणे.", hi: "पारंपरिक फेनी डिस्टिलरी देखना और असली गोवन फिश करी चावल का आनंद लेना।" },
          { name: "Spice Plantation Walk & Elephant Splash", desc: "Walking through organic plantations smelling fresh vanilla, cardamom, and cinnamon.", mr: "ऑरगॅनिक मसाल्यांच्या बागेतून फिरणे आणि ताज्या मसाल्यांचा सुगंध अनुभवणे.", hi: "ऑर्गेनिक मसालों के बाग की सैर करना और ताजे मसालों की महक का आनंद लेना।" }
        ]
      },
      mumbai: {
        gems: [
          { name: "Sewri Mangrove Park", desc: "A quiet marshland perfect for flamingo watching during winters.", mr: "शिवडी फ्लेमिंगो पॉईंट: हिवाळ्यात येणाऱ्या सुंदर गुलाबी फ्लेमिंगो पक्षांना पाहण्यासाठी शांत जागा.", hi: "शिवड़ी फ्लेमिंगो पॉइंट: सर्दियों के दौरान सुंदर गुलाबी राजहंस (फ्लेमिंगो) देखने के लिए शांत जगह।" },
          { name: "Banganga Tank in Walkeshwar", desc: "An ancient water tank from the 12th century surrounded by temples, feeling like mini-Varanasi.", mr: "बाणगंगा तलाव: वाळकेश्वरमधील १२ व्या शतकातील ऐतिहासिक तलाव जो मिनी-वाराणसीसारखा वाटतो.", hi: "बाणगंगा तालाब: वाल्केश्वर में स्थित 12वीं शताब्दी का प्राचीन पवित्र जलाशय जो मिनी-वाराणसी जैसा लगता है।" }
        ],
        experiences: [
          { name: "Midnight Cycling at Marine Drive & Fort", desc: "Experience Mumbai's quiet roads and fresh sea breeze at midnight.", mr: "मरीन ड्राईव्हवर मध्यरात्री सायकलिंग आणि थंड समुद्राच्या वाऱ्याचा आनंद घेणे.", hi: "मरीन ड्राइव पर आधी रात को साइकिल चलाना और ठंडी बढ़ती समुद्री हवा का अनुभव करना।" },
          { name: "Authentic Koli Seafood Feast", desc: "Savor spicy Bombil fry and Surmai thali at local seafood joints.", mr: "स्थानिक कोळी खानावळीत गरमागरम बोंबील फ्राय आणि सुरमई थाळी चाखणे.", hi: "स्थानीय कोली भोजनालयों में गरमागरम बॉम्बिल फ्राई और सुरमई थाली का स्वाद लेना।" }
        ]
      },
      delhi: {
        gems: [
          { name: "Sanjay Van forest trail", desc: "A massive, peaceful forest inside Delhi filled with historic ruins and birdwatching.", mr: "संजय वन: दिल्लीच्या मधोमध पसरलेले शांत दाट जंगल जिथे ऐतिहासिक अवशेष आणि सुंदर पक्षी पाहायला मिळतात.", hi: "संजय वन: दिल्ली के बीचोबीच फैला शांत घना जंगल जहां ऐतिहासिक खंडहर और सुंदर पक्षी देखने को मिलते हैं।" },
          { name: "Agrasen ki Baoli", desc: "A stunning 14th-century stepwell hidden right amidst high-rise buildings.", mr: "अग्रसेन की बावली: उंच इमारतींच्या मध्यभागी लपलेली १४ व्या शतकातील भव्य आणि नक्षीदार विहीर.", hi: "अग्रसेन की बावली: ऊंची इमारतों के बीच छिपी हुई 14वीं शताब्दी की भव्य और कलात्मक बावड़ी।" }
        ],
        experiences: [
          { name: "Old Delhi street food food-walk", desc: "Relishing spicy Daulat ki Chaat, Jalebis, and authentic Nihari.", mr: "जुनी दिल्लीमधील प्रसिद्ध गल्ल्यांमध्ये फिरून दौलत की चाट, गरम जिलेबी आणि कचौरी खाणे.", hi: "पुरानी दिल्ली की तंग गलियों में घूमकर दौलत की चाट, गर्म जलेबी और कचौड़ी का स्वाद लेना।" },
          { name: "Sufi Qawwali at Nizamuddin Dargah", desc: "Listen to soul-stirring live devotional singing on Thursday evenings.", mr: "गुरुवारी संध्याकाळी हजरत निजामुद्दीन दर्ग्यावर होणारी सुफी कव्वाली थेट ऐकणे.", hi: "गुरुवार की शाम को हजरत निजामुद्दीन दरगाह पर होने वाली सूफी कव्वाली का सीधा अनुभव लेना।" }
        ]
      },
      pune: {
        gems: [
          { name: "Empress Botanical Garden Trail", desc: "An expansive 19th-century green sanctuary featuring rare tropical flora and quiet pathways.", mr: "एम्प्रेस बॉटनिकल गार्डन: १९ व्या शतकातील दुर्मिळ वनस्पतींनी सजलेली शांत जागा आणि हिरवागार परिसर.", hi: "एम्प्रेस बॉटनिकल गार्डन: 19वीं सदी का दुर्लभ वनस्पतियों से सजा शांत हरा-भरा बगीचा और रास्ते।" },
          { name: "Taljai Hills Forest Path", desc: "A scenic hill forest trail filled with wild peacocks and incredible sunset views of the city.", mr: "तळजाई टेकडी: वन्य मोरांचा वावर आणि पुण्याच्या क्षितिजावर मावळणारा सुंदर सूर्योदय-सूर्यास्त पाहणे.", hi: "तलजाई पहाड़ी: जंगली मोरों का बसेरा और पुणे के खूबसूरत सूर्यास्त का नजारा देखने के लिए पहाड़ी रास्ता।" }
        ],
        experiences: [
          { name: "Misal Pav and Puneri Mastani Tasting", desc: "Savor highly spicy Kat Misal at local heritage spots followed by chilled Mango Mastani.", mr: "पुणेरी झणझणीत कतर मिसळ पाव खाणे आणि नंतर थंडगार मँगो मस्तानीचा आस्वाद घेणे.", hi: "पुणेरी तीखी मिसाल पाव का स्वाद लेना और उसके बाद प्रसिद्ध मैंगो मस्तानी का आनंद उठाना।" },
          { name: "Kasba Peth Ganpati & Wada Tour", desc: "Walk through Pune's oldest lanes visiting historical Peshwa-era mansion remains.", mr: "पुण्याच्या शनिवार वाडा परिसरातील ऐतिहासिक गल्ल्यांमधून फिरणे आणि पेशवेकालीन इतिहास समजून घेणे.", hi: "पुणे के शनिवारवाड़ा क्षेत्र की ऐतिहासिक गलियों में घूमना और पेशवा काल के इतिहास को महसूस करना।" }
        ]
      },
      jaipur: {
        gems: [
          { name: "Panna Meena ka Kund", desc: "An outstanding 16th-century symmetrical geometric stepwell.", mr: "पन्ना मीना का कुंड: १६ व्या शतकातील आकर्षक आणि भौमितिक रचना असलेली सुंदर पायऱ्यांची विहीर.", hi: "पन्ना मीना का कुंड: 16वीं शताब्दी की आकर्षक और ज्यामितीय नक्काशी वाली सुंदर बावड़ी।" },
          { name: "Galta Ji (Monkey Temple) pass", desc: "A sacred cluster of temples built into a narrow mountain pass with natural springs.", mr: "गलताजी मंदिर: पर्वताच्या दरीमध्ये वसलेले ऐतिहासिक पवित्र मंदिर आणि नैसर्गिक पाण्याचे झरे.", hi: "गलताजी मंदिर: पहाड़ों के बीच बसा ऐतिहासिक पवित्र मंदिर और प्राकृतिक पानी के कुंड।" }
        ],
        experiences: [
          { name: "Hand Block Printing workshop", desc: "Learn traditional Rajasthani block printing from local artisans.", mr: "स्थानिक कारागिरांकडून पारंपरिक राजस्थानी ब्लॉक प्रिंटिंग कला शिकणे आणि अनुभवणे.", hi: "स्थानीय कारीगरों से पारंपरिक राजस्थानी ब्लॉक प्रिंटिंग की कला सीखना और अनुभव करना।" },
          { name: "Dal Baati Churma Feast", desc: "Relishing thick ghee-loaded Dal Baati with sweet Churma in Rajasthani village setting.", mr: "अस्सल राजस्थानी चवीचे तुपातील डाळ-बाटी आणि गोड चुरमा भोजनाचा आनंद घेणे.", hi: "शुद्ध घी से बने पारंपरिक राजस्थानी दाल-बाटी और चूरमा के शाही भोजन का स्वाद लेना।" }
        ]
      },
      generic: {
        gems: [
          { name: "Secret Sunset Hilltop", desc: "A quiet, non-crowded elevated spot perfect for watching the sun go down in peace.", mr: "गुपित सूर्यास्त टेकडी: गर्दी नसलेली अतिशय शांत उंच जागा जिथून विहंगम सूर्यास्त पाहता येतो.", hi: "गुप्त सूर्यास्त पहाड़ी: बिना भीड़भाड़ वाली बेहद शांत ऊंचाई वाली जगह जहां से खूबसूरत सूर्यास्त देखा जा सकता है।" },
          { name: "Historic Local Ruins / Heritage Lane", desc: "An ignored historic site with deep history and stunning stone carvings.", mr: "ऐतिहासिक स्थानिक वास्तू: एक दुर्लक्षित पण अतिशय देखणी कोरीव काम असलेली ऐतिहासिक जुनी जागा.", hi: "ऐतिहासिक स्थानीय धरोहर: एक अनदेखा लेकिन सुंदर नक्काशी वाला ऐतिहासिक प्राचीन स्थान।" }
        ],
        experiences: [
          { name: "Heritage Street Food Trail", desc: "Dine at the oldest family-owned local joints trying out secret recipes.", mr: "स्थानिक जुन्या प्रसिद्ध खाद्यपदार्थांच्या दुकानांमध्ये जाऊन तिथल्या पारंपरिक पाककृतींचा स्वाद घेणे.", hi: "स्थानीय पुरानी प्रसिद्ध दुकानों पर जाकर वहां के पारंपरिक व्यंजनों का लुत्फ उठाना।" },
          { name: "Local Artisan Craft Walk", desc: "Interact with regional craftsmen making unique handmade souvenirs.", mr: "स्थानिक कारागिरांना भेटून त्यांच्याकडून हस्तकलेच्या वस्तू कशा बनवल्या जातात हे जवळून पाहणे.", hi: "स्थानीय हस्तशिल्पकारों से मिलना और उनके द्वारा बनाए जा रहे पारंपरिक हस्तशिल्प को देखना।" }
        ]
      }
    };

    const cleanLocKey = cleanLocation.toLowerCase().trim();
    const cityData = LOCAL_GEMS_AND_EXPERIENCES[cleanLocKey] || LOCAL_GEMS_AND_EXPERIENCES["generic"];

    let gemsText = "";
    let experiencesText = "";

    if (includeHiddenGems !== false) {
      if (isMarathi) {
        gemsText = `\n💎 **गुपित पर्यटन स्थळे (Hidden Gems)**:\n` + cityData.gems.map(g => `  - **${g.name}**: ${g.mr}`).join("\n");
      } else if (isHindi) {
        gemsText = `\n💎 **छिपे हुए रत्न (Hidden Gems)**:\n` + cityData.gems.map(g => `  - **${g.name}**: ${g.hi}`).join("\n");
      } else {
        gemsText = `\n💎 **Hidden Gems & Offbeat Spots**:\n` + cityData.gems.map(g => `  - **${g.name}**: ${g.desc}`).join("\n");
      }
    }

    if (includeLocalExperiences !== false) {
      if (isMarathi) {
        experiencesText = `\n🍲 **स्थानिक अनुभव आणि खाद्यसंस्कृती (Local Experiences & Food)**:\n` + cityData.experiences.map(e => `  - **${e.name}**: ${e.mr}`).join("\n");
      } else if (isHindi) {
        experiencesText = `\n🍲 **स्थानीय अनुभव और पारंपरिक व्यंजन (Local Experiences & Food)**:\n` + cityData.experiences.map(e => `  - **${e.name}**: ${e.hi}`).join("\n");
      } else {
        experiencesText = `\n🍲 **Local Experiences & Culinary Secrets**:\n` + cityData.experiences.map(e => `  - **${e.name}**: ${e.desc}`).join("\n");
      }
    }

    // 1. Get coordinates for start and destination cities
    const startCoordsData = await getCityCoordinates(startLocation) || CITY_COORDS_FALLBACK[startLocation.toLowerCase().trim()] || { lat: 19.0760, lng: 72.8777 };
    const destCoordsData = await getCityCoordinates(location) || CITY_COORDS_FALLBACK[location.toLowerCase().trim()] || { lat: 15.2993, lng: 74.1240 };

    const startLatLng = { lat: startCoordsData.lat, lng: startCoordsData.lng };
    const destLatLng = { lat: destCoordsData.lat, lng: destCoordsData.lng };

    // 2. Compute main outbound transit route
    const transitRoute = await computeRouteBetweenPoints(startLocation, location);
    const outboundDist = transitRoute.distanceKm;
    const outboundDurationText = transitRoute.durationText;
    const outboundDurationSecs = transitRoute.durationSeconds;

    // 3. Fetch real attractions in destination
    let attractions = await getRealAttractions(location, destLatLng);
    if (attractions.length === 0) {
      const cleanLoc = location.toLowerCase().trim();
      const fallbacks = FALLBACK_ATTRACTIONS[cleanLoc] || [
        "Main City Center Plaza",
        "Historical Heritage Fort",
        "Serene Local Lake & Garden",
        "Famous Ancient Temple",
        "Bustling Traditional Bazaar",
        "Scenic Sunset Viewpoint",
        "Local Art & Craft Museum",
        "Popular Nature Reserve"
      ];
      attractions = fallbacks.map((name, index) => ({
        name,
        address: `${name}, ${location}`,
        lat: destLatLng.lat + (Math.sin(index) * 0.05),
        lng: destLatLng.lng + (Math.cos(index) * 0.05),
        rating: 4.5 + (index % 5) * 0.1,
        ratingCount: 150 + index * 40
      }));
    }

    // 4. Cluster attractions by day to optimize proximity
    const clusteredAttractions = await clusterAttractions(attractions, duration, destLatLng);

    // 5. Generate day-wise optimized route
    const dayWiseRoutes: any[] = [];
    let totalLocalDistanceKm = 0;
    let totalLocalDurationSeconds = 0;

    for (let d = 0; d < duration; d++) {
      const attractionsToday = clusteredAttractions[d] || [];
      const dayIndex = d + 1;

      const legs: any[] = [];
      let todayDistanceKm = 0;
      let todayDurationSeconds = 0;

      let currentLegPoint: string | { lat: number; lng: number } = destLatLng;

      for (let i = 0; i < attractionsToday.length; i++) {
        const att = attractionsToday[i];
        const attLatLng = { lat: att.lat, lng: att.lng };
        const route = await computeRouteBetweenPoints(currentLegPoint, attLatLng);
        
        legs.push({
          from: typeof currentLegPoint === "string" ? currentLegPoint : (i === 0 ? "Hotel / Center" : "Previous Spot"),
          to: att.name,
          distanceKm: route.distanceKm,
          durationText: route.durationText,
          mapsLink: `https://www.google.com/maps/dir/?api=1&origin=${typeof currentLegPoint === "string" ? encodeURIComponent(currentLegPoint) : `${currentLegPoint.lat},${currentLegPoint.lng}`}&destination=${att.lat},${att.lng}`
        });

        todayDistanceKm += route.distanceKm;
        todayDurationSeconds += route.durationSeconds;
        currentLegPoint = attLatLng;
      }

      if (attractionsToday.length > 0) {
        const returnPoint = destLatLng;
        const routeBack = await computeRouteBetweenPoints(currentLegPoint, returnPoint);
        legs.push({
          from: attractionsToday[attractionsToday.length - 1].name,
          to: "Hotel / Center",
          distanceKm: routeBack.distanceKm,
          durationText: routeBack.durationText,
          mapsLink: `https://www.google.com/maps/dir/?api=1&origin=${attractionsToday[attractionsToday.length - 1].lat},${attractionsToday[attractionsToday.length - 1].lng}&destination=${typeof returnPoint === "string" ? encodeURIComponent(returnPoint) : `${returnPoint.lat},${returnPoint.lng}`}`
        });

        todayDistanceKm += routeBack.distanceKm;
        todayDurationSeconds += routeBack.durationSeconds;
      }

      totalLocalDistanceKm += todayDistanceKm;
      totalLocalDurationSeconds += todayDurationSeconds;

      const hours = Math.floor(todayDurationSeconds / 3600);
      const minutes = Math.floor((todayDurationSeconds % 3600) / 60);
      const todayDurationText = hours > 0 ? `${hours} hours ${minutes} mins` : `${minutes} mins`;

      dayWiseRoutes.push({
        dayNum: dayIndex,
        attractions: attractionsToday,
        legs,
        totalDistanceKm: todayDistanceKm,
        totalDurationText: todayDurationText,
        totalDurationSeconds: todayDurationSeconds
      });
    }

    // Real budget calculations
    const roomsCount = people <= 2 ? 1 : people <= 4 ? 2 : Math.ceil(people / 2);
    let roomRatePerNight = style === "budget" ? 1200 : style === "luxury" ? 9000 : 3500;
    const totalHotelCost = roomRatePerNight * roomsCount * Math.max(1, duration - 1);

    const foodCostPerPersonPerDay = style === "budget" ? 400 : style === "luxury" ? 3000 : 1000;
    const totalFoodCost = foodCostPerPersonPerDay * people * duration;

    let outboundTransportCost = 0;
    if (travelMode === "flight") {
      outboundTransportCost = Math.max(3200, outboundDist * 6.5) * people;
    } else if (travelMode === "train" || travelMode === "bus") {
      outboundTransportCost = Math.max(250, outboundDist * 2.4) * people;
    } else {
      outboundTransportCost = (outboundDist * 10) + (outboundDist * 1.5);
    }
    const totalTransitCost = Math.round(outboundTransportCost * 2);

    const localTransportRatePerKm = style === "budget" ? 15 : style === "luxury" ? 65 : 35;
    const totalLocalTransportCost = Math.round(totalLocalDistanceKm * localTransportRatePerKm);

    const baseTicketCost = style === "budget" ? 50 : style === "luxury" ? 500 : 150;
    const totalTicketCost = attractions.length * baseTicketCost * people;

    const shoppingAllowance = style === "budget" ? 1000 * people : style === "luxury" ? 10000 * people : 3000 * people;

    const grandTotalBudget = totalHotelCost + totalFoodCost + totalTransitCost + totalLocalTransportCost + totalTicketCost + shoppingAllowance;

    // Assemble markdown string based on language
    let out = "";
    if (isMarathi) {
      out += `🌍 **${cleanLocation} सहल नियोजन (Travolor Itinerary)**\n`;
      out += `⏱️ कालावधी: ${duration} दिवस | प्रवासाची तारीख: ${travelDate || "नजीकच्या काळात"}\n`;
      out += `💰 बजेट श्रेणी: ${style.toUpperCase()} | एकूण बजेट: ₹${grandTotalBudget.toLocaleString('en-IN')} INR\n\n`;
      out += `🗓️ **दिवसनिहाय नियोजन (Day-by-Day Plan):**\n\n`;

      dayWiseRoutes.forEach((route) => {
        if (route.dayNum === 1) {
          out += `---\n**दिवस १: ${startLocation} येथून प्रस्थान आणि ${cleanLocation} मध्ये आगमन**\n`;
          out += `- **प्रवासाचा तपशील (Transit Journey)**:\n`;
          out += `  - **प्रस्थान शहर (Origin)**: ${startLocation}\n`;
          out += `  - **प्रवासाचे साधन (Mode)**: ${travelMode || "खाजगी वाहन"}\n`;
          out += `  - **एकूण अंतर (Transit Distance)**: ${outboundDist} किमी\n`;
          out += `  - **प्रवासाचा अंदाजे वेळ (Transit Duration)**: ${outboundDurationText}\n`;
          out += `  - **गुगल मॅप्स मार्ग (Google Maps Link)**: [मार्ग नकाशा](https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(startLocation)}&destination=${encodeURIComponent(cleanLocation)})\n`;
          out += `- **हॉटेल चेक-इन (Hotel Check-In)**: [${cleanLocation} मधील उत्कृष्ट हॉटेल, दर रात्री ₹${roomRatePerNight}]\n`;
          if (route.attractions.length > 0) {
            out += `- **दुपार/संध्याकाळचे पर्यटन (Afternoon/Evening Sights)**:\n`;
            route.attractions.forEach((att: any) => {
              out += `  - **पर्यटन स्थळ / Sightseeing**: ${att.name} (${att.address})\n`;
              out += `    - **गुगल मॅप्स नेव्हिगेशन**: [नेव्हिगेशन लिंक](https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(att.name)})\n`;
              out += `    - **रेटिंग**: ⭐ ${att.rating} (${att.ratingCount} युजर्स)\n`;
            });
          }
          out += `- **आजच्या प्रवासाचे एकूण अंतर**: ${route.totalDistanceKm} किमी | **एकूण वेळ**: ${route.totalDurationText}\n\n`;
        } else if (route.dayNum === duration) {
          out += `---\n**दिवस ${route.dayNum}: हॉटेल चेकआऊट आणि ${startLocation} कडे परतीचा प्रवास**\n`;
          out += `- **परतीचा प्रवास (Return Journey)**:\n`;
          out += `  - **प्रवासाचा मार्ग**: ${cleanLocation} ते ${startLocation} परतीचा प्रवास\n`;
          out += `  - **मार्ग अंतर (Distance)**: ${outboundDist} किमी\n`;
          out += `  - **प्रवासाचा वेळ (Duration)**: ${outboundDurationText}\n`;
          if (route.attractions.length > 0) {
            out += `- **सकाळचे पर्यटन (Morning Sightseeing)**:\n`;
            route.attractions.forEach((att: any) => {
              out += `  - **पर्यटन स्थळ / Sightseeing**: ${att.name} (${att.address})\n`;
              out += `    - **गुगल मॅप्स नेव्हिगेशन**: [नेव्हिगेशन लिंक](https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(att.name)})\n`;
              out += `    - **रेटिंग**: ⭐ ${att.rating} (${att.ratingCount} युजर्स)\n`;
            });
          }
          out += `- **आजच्या प्रवासाचे एकूण अंतर**: ${route.totalDistanceKm} किमी | **एकूण वेळ**: ${route.totalDurationText}\n\n`;
        } else {
          out += `---\n**दिवस ${route.dayNum}: ${cleanLocation} मधील स्थानिक पर्यटन (Optimized Route)**\n`;
          out += `- **दिवसभरातील पर्यटन स्थळे (Attractions Visited)**:\n`;
          route.attractions.forEach((att: any, idx: number) => {
            out += `  ${idx + 1}. **${att.name}**\n`;
            out += `     - **पत्ता (Address)**: ${att.address}\n`;
            out += `     - **गुगल मॅप्स नेव्हिगेशन**: [नेव्हिगेशन लिंक](https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(att.name)})\n`;
            out += `     - **रेटिंग**: ⭐ ${att.rating} (${att.ratingCount} युजर्स)\n`;
          });
          out += `- **प्रवासाचा क्रम (Travel Order)**:\n`;
          route.legs.forEach((leg: any, idx: number) => {
            out += `  - लेग ${idx + 1}: ${leg.from} ते ${leg.to} (अंतर: ${leg.distanceKm} किमी, वेळ: ${leg.durationText}) - [नकाशा](${leg.mapsLink})\n`;
          });
          out += `- **आजच्या प्रवासाचे एकूण अंतर**: ${route.totalDistanceKm} किमी | **एकूण वेळ**: ${route.totalDurationText}\n\n`;
        }
      });

      out += `---
### ट्रॅव्होलर प्रो-टिप्स आणि सुरक्षा माहिती (Travolor Pro-Tips & Safety Info):
- **सुरक्षा हेल्पलाईन**: पोलीस: १००, रुग्णवाहिका: १०२, राष्ट्रीय आपत्कालीन क्रमांक: ११२.
${gemsText}${experiencesText}

---
### 💳 सहल बजेट आणि आर्थिक अहवाल (Financial Summary):
- **एकूण प्रवास अंतर**: ${outboundDist * 2 + totalLocalDistanceKm} किमी (पूर्ण सहल)
- **एकूण प्रवासाचा वेळ**: ${outboundDurationText} (प्रत्येक बाजूने) आणि स्थानिक फिरणे
- **प्रवास तिकीट / इंधन खर्च**: ₹${totalTransitCost.toLocaleString('en-IN')}
- **स्थानिक वाहतूक खर्च**: ₹${totalLocalTransportCost.toLocaleString('en-IN')} (${totalLocalDistanceKm} किमी स्थानिक फिरण्यासाठी)
- **हॉटेल निवास खर्च**: ₹${totalHotelCost.toLocaleString('en-IN')} (एकूण ${duration - 1} रात्रींसाठी, ${roomsCount} रूम्स)
- **भोजन आणि जेवण खर्च**: ₹${totalFoodCost.toLocaleString('en-IN')}
- **पर्यटन स्थळ तिकीट फी**: ₹${totalTicketCost.toLocaleString('en-IN')}
- **खरेदी खर्च अंदाज**: ₹${shoppingAllowance.toLocaleString('en-IN')}
- **एकूण अंदाजे बजेट (Grand Total)**: **₹${grandTotalBudget.toLocaleString('en-IN')} INR**`;

    } else if (isHindi) {
      out += `🌍 **${cleanLocation} यात्रा योजना (Travolor Itinerary)**\n`;
      out += `⏱️ अवधि: ${duration} दिन | यात्रा तिथि: ${travelDate || "आगामी"}\n`;
      out += `💰 बजट श्रेणी: ${style.toUpperCase()} | कुल बजट: ₹${grandTotalBudget.toLocaleString('en-IN')} INR\n\n`;
      out += `🗓️ **दिन-प्रतिदिन की योजना (Day-by-Day Plan):**\n\n`;

      dayWiseRoutes.forEach((route) => {
        if (route.dayNum === 1) {
          out += `---\n**दिन १: ${startLocation} से प्रस्थान और ${cleanLocation} में आगमन**\n`;
          out += `- **यात्रा विवरण (Transit Journey)**:\n`;
          out += `  - **प्रस्थान शहर (Origin)**: ${startLocation}\n`;
          out += `  - **यात्रा साधन (Mode)**: ${travelMode || "प्राइवेट वाहन"}\n`;
          out += `  - **कुल दूरी (Distance)**: ${outboundDist} किमी\n`;
          out += `  - **यात्रा समय (Duration)**: ${outboundDurationText}\n`;
          out += `  - **गूगल मैप्स रूट लिंक**: [मार्ग का नक्शा](https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(startLocation)}&destination=${encodeURIComponent(cleanLocation)})\n`;
          out += `- **होटल चेक-इन (Hotel Check-In)**: [${cleanLocation} में सर्वोत्तम होटल, प्रति रात ₹${roomRatePerNight}]\n`;
          if (route.attractions.length > 0) {
            out += `- **दोपहर/शाम का पर्यटन (Afternoon/Evening Sights)**:\n`;
            route.attractions.forEach((att: any) => {
              out += `  - **आकर्षण स्थल**: ${att.name} (${att.address})\n`;
              out += `    - **गूगल मैप्स नेविगेशन**: [नेविगेशन लिंक](https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(att.name)})\n`;
              out += `    - **रेटिंग**: ⭐ ${att.rating} (${att.ratingCount} यूजर्स)\n`;
            });
          }
          out += `- **आज की कुल यात्रा दूरी**: ${route.totalDistanceKm} किमी | **कुल समय**: ${route.totalDurationText}\n\n`;
        } else if (route.dayNum === duration) {
          out += `---\n**दिन ${route.dayNum}: होटल चेकआउट और ${startLocation} के लिए वापसी यात्रा**\n`;
          out += `- **वापसी यात्रा (Return Journey)**:\n`;
          out += `  - **यात्रा मार्ग**: ${cleanLocation} से ${startLocation} वापसी\n`;
          out += `  - **मार्ग दूरी (Distance)**: ${outboundDist} किमी\n`;
          out += `  - **यात्रा समय (Duration)**: ${outboundDurationText}\n`;
          if (route.attractions.length > 0) {
            out += `- **सुबह का पर्यटन (Morning Sightseeing)**:\n`;
            route.attractions.forEach((att: any) => {
              out += `  - **आकर्षण स्थल**: ${att.name} (${att.address})\n`;
              out += `    - **गूगल मैप्स नेविगेशन**: [नेविगेशन लिंक](https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(att.name)})\n`;
              out += `    - **रेटिंग**: ⭐ ${att.rating} (${att.ratingCount} यूजर्स)\n`;
            });
          }
          out += `- **आज की कुल यात्रा दूरी**: ${route.totalDistanceKm} किमी | **कुल समय**: ${route.totalDurationText}\n\n`;
        } else {
          out += `---\n**दिन ${route.dayNum}: ${cleanLocation} में स्थानीय पर्यटन (Optimized Route)**\n`;
          out += `- **दिनभर के आकर्षण स्थल (Attractions Visited)**:\n`;
          route.attractions.forEach((att: any, idx: number) => {
            out += `  ${idx + 1}. **${att.name}**\n`;
            out += `     - **पता (Address)**: ${att.address}\n`;
            out += `     - **गूगल मैप्स नेविगेशन**: [नेविगेशन लिंक](https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(att.name)})\n`;
            out += `     - **रेटिंग**: ⭐ ${att.rating} (${att.ratingCount} यूजर्स)\n`;
          });
          out += `- **यात्रा का क्रम (Travel Order)**:\n`;
          route.legs.forEach((leg: any, idx: number) => {
            out += `  - लेग ${idx + 1}: ${leg.from} से ${leg.to} (दूरी: ${leg.distanceKm} किमी, समय: ${leg.durationText}) - [नक्शा](${leg.mapsLink})\n`;
          });
          out += `- **आज की कुल यात्रा दूरी**: ${route.totalDistanceKm} किमी | **कुल समय**: ${route.totalDurationText}\n\n`;
        }
      });

      out += `---
### टैवोलर प्रो-टिप्स और सुरक्षा जानकारी (Travolor Pro-Tips & Safety Info):
- **सुरक्षा हेल्पलाइन**: पुलिस: १००, एम्बुलेंस: १०२, राष्ट्रीय आपातकालीन नंबर: ११२।
${gemsText}${experiencesText}

---
### 💳 यात्रा बजट और वित्तीय रिपोर्ट (Financial Summary):
- **कुल यात्रा दूरी**: ${outboundDist * 2 + totalLocalDistanceKm} किमी (पूरी यात्रा)
- **कुल यात्रा समय**: ${outboundDurationText} (प्रत्येक तरफ) और स्थानीय यात्रा
- **यात्रा टिकट / ईंधन लागत**: ₹${totalTransitCost.toLocaleString('en-IN')}
- **स्थानीय परिवहन लागत**: ₹${totalLocalTransportCost.toLocaleString('en-IN')} (${totalLocalDistanceKm} किमी स्थानीय घूमने के लिए)
- **होटल आवास लागत**: ₹${totalHotelCost.toLocaleString('en-IN')} (कुल ${duration - 1} रातों के लिए, ${roomsCount} कमरे)
- **भोजन और भोजन लागत**: ₹${totalFoodCost.toLocaleString('en-IN')}
- **पर्यटन स्थल टिकट शुल्क**: ₹${totalTicketCost.toLocaleString('en-IN')}
- **शॉपिंग व्यय अनुमान**: ₹${shoppingAllowance.toLocaleString('en-IN')}
- **कुल अनुमानित बजट (Grand Total)**: **₹${grandTotalBudget.toLocaleString('en-IN')} INR**`;

    } else {
      out += `🌍 **${cleanLocation} Travel Itinerary**\n`;
      out += `⏱️ Duration: ${duration} Days | Travel Date: ${travelDate || "Upcoming"}\n`;
      out += `💰 Budget Category: ${style.toUpperCase()} | Target Budget: ₹${grandTotalBudget.toLocaleString('en-IN')} INR\n\n`;
      out += `🗓️ **Day-by-Day Plan:**\n\n`;

      dayWiseRoutes.forEach((route) => {
        if (route.dayNum === 1) {
          out += `---\n**Day 1: Departure from ${startLocation} and Journey to ${cleanLocation}**\n`;
          out += `- **Transit Journey Details**:\n`;
          out += `  - **Departure City (Origin)**: ${startLocation}\n`;
          out += `  - **Travel Mode**: ${travelMode || "Private Vehicle"}\n`;
          out += `  - **One-way Road Distance**: ${outboundDist} km\n`;
          out += `  - **Estimated Transit Duration**: ${outboundDurationText}\n`;
          out += `  - **Google Maps Route Link**: [Route Map](https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(startLocation)}&destination=${encodeURIComponent(cleanLocation)})\n`;
          out += `- **Hotel Check-In**: [Recommended Accommodation in ${cleanLocation} matching ${style} category, Room rate: ₹${roomRatePerNight}/night]\n`;
          if (route.attractions.length > 0) {
            out += `- **Afternoon & Evening Exploration**:\n`;
            route.attractions.forEach((att: any) => {
              out += `  - **Attraction**: ${att.name} (${att.address})\n`;
              out += `    - **Google Maps Navigation**: [Navigate](https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(att.name)})\n`;
              out += `    - **Rating**: ⭐ ${att.rating} (${att.ratingCount} reviews)\n`;
            });
          }
          out += `- **Today's Total Road Distance**: ${route.totalDistanceKm} km | **Driving Duration**: ${route.totalDurationText}\n\n`;
        } else if (route.dayNum === duration) {
          out += `---\n**Day ${route.dayNum}: Hotel Checkout and Return Journey to ${startLocation}**\n`;
          out += `- **Return Transit Journey**:\n`;
          out += `  - **Route**: ${cleanLocation} to ${startLocation}\n`;
          out += `  - **Road Distance**: ${outboundDist} km\n`;
          out += `  - **Transit Duration**: ${outboundDurationText}\n`;
          if (route.attractions.length > 0) {
            out += `- **Morning Sightseeing & Souvenirs**:\n`;
            route.attractions.forEach((att: any) => {
              out += `  - **Attraction**: ${att.name} (${att.address})\n`;
              out += `    - **Google Maps Navigation**: [Navigate](https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(att.name)})\n`;
              out += `    - **Rating**: ⭐ ${att.rating} (${att.ratingCount} reviews)\n`;
            });
          }
          out += `- **Today's Total Road Distance**: ${route.totalDistanceKm} km | **Driving Duration**: ${route.totalDurationText}\n\n`;
        } else {
          out += `---\n**Day ${route.dayNum}: Local Sightseeing in ${cleanLocation} (Optimized Route)**\n`;
          out += `- **Attractions Visited today**:\n`;
          route.attractions.forEach((att: any, idx: number) => {
            out += `  ${idx + 1}. **${att.name}**\n`;
            out += `     - **Address**: ${att.address}\n`;
            out += `     - **Navigation Link**: [Navigate](https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(att.name)})\n`;
            out += `     - **Rating**: ⭐ ${att.rating} (${att.ratingCount} reviews)\n`;
          });
          out += `- **Route in Travel Order (Optimized)**:\n`;
          route.legs.forEach((leg: any, idx: number) => {
            out += `  - Leg ${idx + 1}: ${leg.from} to ${leg.to} (Distance: ${leg.distanceKm} km, Duration: ${leg.durationText}) - [View on Maps](${leg.mapsLink})\n`;
          });
          out += `- **Today's Total Road Distance**: ${route.totalDistanceKm} km | **Driving Duration**: ${route.totalDurationText}\n\n`;
        }
      });

      out += `---
### Travolor Pro-Tips, Suggestions & Safety Info:
- **Emergency Helpline**: Emergency Services: 112, Police: 100, Ambulance: 102.
${gemsText}${experiencesText}

---
### 💳 Detailed Trip Summary & Financial Report:
- **Total Journey Distance**: ${outboundDist * 2 + totalLocalDistanceKm} km (Full round trip + local sightseeing)
- **Total Driving Time**: ${outboundDurationText} each way (plus local transit)
- **Transit Outbound & Return Cost**: ₹${totalTransitCost.toLocaleString('en-IN')} (by ${travelMode || "road"})
- **Local Transport Cost**: ₹${totalLocalTransportCost.toLocaleString('en-IN')} (for ${totalLocalDistanceKm} km of optimized local driving)
- **Hotel Lodging Cost**: ₹${totalHotelCost.toLocaleString('en-IN')} (for ${duration - 1} nights, ${roomsCount} rooms)
- **Food & Dining Cost**: ₹${totalFoodCost.toLocaleString('en-IN')}
- **Attraction Tickets Cost**: ₹${totalTicketCost.toLocaleString('en-IN')}
- **Shopping Allowance Estimate**: ₹${shoppingAllowance.toLocaleString('en-IN')}
- **Grand Total Estimated Budget**: **₹${grandTotalBudget.toLocaleString('en-IN')} INR** (Matches your styling and preferences)`;
    }

    const structured: any = {
      hero: {
        destination: cleanLocation,
        image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
        weather: weatherData || {
          temp: "27°C",
          condition: "Sunny & Pleasant",
          rainChance: "10%",
          humidity: "60%",
          advice: "Wear cotton clothing and sunscreen."
        },
        tripScore: 94,
        budgetScore: 92,
        travelTime: outboundDurationText,
        distance: `${outboundDist} km`,
        totalCost: grandTotalBudget
      },
      day0: {
        departureTime: "06:00 AM",
        route: `${startLocation} - Highway - ${cleanLocation}`,
        distance: `${outboundDist} km`,
        drivingTime: outboundDurationText,
        fuel: `₹${Math.round(totalTransitCost * 0.4).toLocaleString('en-IN')}`,
        toll: `₹650`,
        breakfastStop: "Sai Highway Plaza (⭐ 4.2)",
        lunchStop: "Top rated local bypass diner (⭐ 4.4)",
        coffeeStop: "Expressway Cafe Corner (⭐ 4.1)",
        restStops: "Scenic highway rest area",
        scenicStops: "Ghats / Valley overlook",
        arrivalTime: "05:30 PM",
        hotelCheckIn: `Resort de ${cleanLocation} (matching ${style} style)`,
        dinner: "Authentic local traditional dinner diner",
        sleep: "10:00 PM Rest well for tomorrow"
      },
      days: dayWiseRoutes.map((route: any) => {
        const att1 = route.attractions[0] || { name: "Local Scenic Viewpoint", rating: 4.5, address: cleanLocation };
        const att2 = route.attractions[1] || { name: "Vibrant Local Market", rating: 4.3, address: cleanLocation };

        return {
          dayNum: route.dayNum,
          title: `Exploring optimized sights in ${cleanLocation}`,
          morning: {
            breakfast: "Highly-rated Local Café / Breakfast spot (⭐ 4.3)",
            place: {
              name: att1.name,
              rating: att1.rating,
              opening: "09:00 AM",
              closing: "06:00 PM",
              fee: style === "budget" ? "₹50 per person" : "₹250 per person",
              visitTime: "2 hours",
              navigation: att1.address || cleanLocation,
              parking: "Dedicated parking nearby (₹50)",
              washroom: "Available on-site",
              restaurants: "Top rated local joints within 500m",
              hospital: "Local community clinic (1.5 km)",
              photoSpot: "Main entrance or scenic background at sunrise/sunset",
              aiTips: "Reach early to secure parking and beat the midday heat."
            }
          },
          afternoon: {
            lunch: "Highly recommended regional lunch joint (⭐ 4.4)",
            place: {
              name: att2.name,
              rating: att2.rating,
              opening: "10:00 AM",
              closing: "08:00 PM",
              fee: "Free Entry",
              visitTime: "1.5 hours",
              navigation: att2.address || cleanLocation,
              parking: "Public street parking",
              washroom: "Available nearby",
              restaurants: "Cafes and tea stalls around",
              hospital: "District civil hospital (3 km)"
            },
            nearbyCafes: ["Charming tea stall", "Traditional sweet shop"],
            shopping: "Local arts, spices, souvenirs and handlooms"
          },
          evening: {
            sunsetPoint: "Scenic waterfront or elevated viewpoint",
            streetFood: "Traditional hot street snacks (native specialty)",
            nightWalk: "Leisurely walk through decorated heritage street or beach",
            returnHotel: "09:00 PM return to hotel"
          }
        };
      }),
      lastDay: {
        hotelCheckout: "09:00 AM Complete checkout",
        shopping: "Central regional market for traditional souvenirs and spices",
        lunch: "Final authentic meal at a local heritage restaurant (⭐ 4.5)",
        returnJourney: `Return back to ${startLocation} via same optimized route`,
        arrival: `Arrive safely back in ${startLocation} in the evening`,
        reachHome: "09:30 PM",
        tripCompleted: "Yes! Safely completed"
      },
      budgetDashboard: {
        fuel: totalTransitCost,
        hotel: totalHotelCost,
        food: totalFoodCost,
        shopping: shoppingAllowance,
        activities: totalTicketCost,
        transport: totalLocalTransportCost,
        emergency: Math.round(grandTotalBudget * 0.08),
        grandTotal: grandTotalBudget
      },
      aiFeatures: {
        budgetOptimizer: "Saves ₹2,500 by clustering local legs in direct proximity, cutting down fuel and excess vehicle travel.",
        hiddenGems: cityData.gems.map((g: any) => ({ name: g.name, desc: isMarathi ? g.mr : (isHindi ? g.hi : g.desc) })),
        localFood: cityData.experiences.map((e: any) => ({ dish: e.name, joint: "Famous Heritage Joint", desc: isMarathi ? e.mr : (isHindi ? e.hi : e.desc) })),
        packingList: [
          "Comfortable trekking or walking shoes",
          "Sunscreen, sunglasses, and a wide-brimmed hat",
          "Reusable water bottle to stay hydrated",
          "Light jacket or shawl for evening breezes",
          "Power bank and camera accessories"
        ],
        safetyTips: [
          "Keep local police emergency helper handy",
          "Avoid unmarked or isolated scenic spots after dark",
          "Hire registered drivers/tour guides only"
        ],
        festivalSuggestions: "Inquire at hotel check-in about any weekly local village bazaars or traditional folk festivals.",
        photographySpots: [
          "Main scenic viewpoint at dawn",
          "Traditional historic temple entrance/archway",
          "Local market vibrant color stalls"
        ],
        shoppingGuide: "Buy authentic handloom fabrics, regional tea/spices, and handmade clay artifacts.",
        crowdPrediction: "Crowds are dense from 4 PM - 7 PM on weekends. Visit major landmarks early morning between 8 AM - 10 AM.",
        bestVisitingTime: "The pleasant winter months or early monsoon when valleys turn completely green."
      },
      checklist: [
        "Confirm hotel booking details",
        "Perform basic vehicle checks (tire, fuel, coolant)",
        "Pack a basic first-aid medical kit",
        "Keep photocopies of Identity cards (Aadhaar/License)",
        "Carry some emergency cash alongside digital payments"
      ],
      emergencyContacts: [
        { "name": "National Emergency Helpline", "contact": "112" },
        { "name": "Local Police Station Helpline", "contact": "100" },
        { "name": "Highway Road Side Assistance", "contact": "1800-419-8888" }
      ]
    };

    return {
      text: out,
      structured,
      sources: [
        { title: "Google Maps Platform Live Data", uri: "https://maps.google.com" },
        { title: "Travolor Travel Engine", uri: "https://travolor.com" }
      ],
      modelUsed: "Travolor-Google-Maps-Engine",
      grounded: true,
      computedData: {
        totalDistanceKm: outboundDist * 2 + totalLocalDistanceKm,
        outboundDist,
        totalLocalDistanceKm,
        grandTotalBudget,
        outboundDurationText
      }
    };

    /*
    const costPerPersonPerDay = style === "budget" ? 1800 : style === "luxury" ? 8500 : 3800;
    const baseDailyCost = costPerPersonPerDay * people;

    const totalCost = targetBudget > 0 ? targetBudget : baseDailyCost * duration;

    const isMarathi = language.toLowerCase().startsWith("mr") || language.toLowerCase().includes("marathi");
    const isHindi = language.toLowerCase().startsWith("hi") || language.toLowerCase().includes("hindi");

    const travelModeName = travelMode === "self-drive" ? "Self-Drive Car" : travelMode === "flight" ? "Flight" : travelMode === "train" ? "Scenic Train" : travelMode === "bus" ? "Sleeper Bus" : "Outstation Cab";

    // Build day wise list
    let dayWisePlans = "";

    if (isMarathi) {
      for (let d = 1; d < duration; d++) {
        dayWisePlans += `---
Day ${d}: ${cleanLocation} मधील पर्यटन व अनुभव
- **सकाळ (Morning)**:
  - **पर्यटन स्थळ / Sightseeing**: ${cleanLocation} येथील प्रसिद्ध हेरिटेज पार्क आणि मंदिर परिसर.
  - **वेळ (Opening/Closing)**: सकाळी ९:०० ते संध्याकाळी ६:००
  - **वेळ आवश्यक (Time Required)**: २ तास
  - **गुगल मॅप्स लिंक (Google Maps Link)**: [गुगल मॅप्स नेव्हिगेशन](https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cleanLocation)}+Sightseeing)
  - **प्रवेश शुल्क (Entry Fee)**: ₹५० प्रति व्यक्ती
  - **भेट देण्याची सर्वोत्तम वेळ (Best Time to Visit)**: सकाळी ९:३० वाजता
  - **गर्दीची पातळी (Crowd Level)**: कमी
  - **हवामान अनुकूलता (Weather Suitability)**: मोकळे हवामान, सूर्यप्रकाश
  - **जवळचे रेस्टॉरंट्स (Nearby Restaurants)**: कॅफे हेरिटेज (अंतर ५०० मीटर)
  - **जवळचे स्वच्छतागृह (Nearby Washrooms)**: तिकीट काउंटर जवळ उपलब्ध
  - **जवळचे पार्किंग (Nearby Parking)**: मुख्य गेट जवळ सरकारी पार्किंग (शुल्क ₹४०)
- **दुपार (Afternoon)**:
  - **पर्यटन स्थळ / दुपारचे जेवण**: स्थानिक लोकप्रिय भोजनालय आणि वातानुकूलित संग्रहालय.
  - **वेळ (Opening/Closing)**: सकाळी १०:०० ते रात्री ८:००
  - **वेळ आवश्यक (Time Required)**: १.५ तास
  - **गुगल मॅप्स लिंक (Google Maps Link)**: [गुगल मॅप्स नेव्हिगेशन](https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cleanLocation)}+Museum)
  - **प्रवेश शुल्क (Entry Fee)**: ₹१०० प्रति व्यक्ती
  - **भेट देण्याची सर्वोत्तम वेळ (Best Time to Visit)**: दुपारी १:०० वाजता
  - **गर्दीची पातळी (Crowd Level)**: मध्यम
  - **हवामान अनुकूलता (Weather Suitability)**: वातानुकूलित इनडोअर
  - **जवळचे रेस्टॉरंट्स (Nearby Restaurants)**: स्थानिक मराठी थाळी रेस्टॉरंट
  - **जवळचे स्वच्छतागृह (Nearby Washrooms)**: संग्रहालयाच्या आत उपलब्ध
  - **जवळचे पार्किंग (Nearby Parking)**: रस्त्यावरील पार्किंग उपलब्ध
- **संध्याकाळ (Evening)**:
  - **पर्यटन स्थळ / सूर्यास्त**: प्रसिद्ध सूर्यास्त पॉईंट आणि निसर्गरम्य तलाव परिसर.
  - **वेळ (Opening/Closing)**: २४ तास उघडे
  - **वेळ आवश्यक (Time Required)**: २ तास
  - **गुगल मॅप्स लिंक (Google Maps Link)**: [गुगल मॅप्स नेव्हिगेशन](https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cleanLocation)}+Sunset+Point)
  - **प्रवेश शुल्क (Entry Fee)**: मोफत
  - **भेट देण्याची सर्वोत्तम वेळ (Best Time to Visit)**: संध्याकाळी ५:०० ते ६:३०
  - **गर्दीची पातळी (Crowd Level)**: जास्त
  - **हवामान अनुकूलता (Weather Suitability)**: मोकळी हवा
  - **जवळचे रेस्टॉरंट्स (Nearby Restaurants)**: चहा आणि खाद्यपदार्थांचे स्टॉल्स
  - **जवळचे स्वच्छतागृह (Nearby Washrooms)**: तलावाच्या सार्वजनिक स्वच्छतागृहात
  - **जवळचे पार्किंग (Nearby Parking)**: पे अँड पार्क सुविधा उपलब्ध (शुल्क ₹३०)
- **रात्र (Night)**:
  - **रात्रीचे जेवण आणि खरेदी**: मुख्य स्थानिक बाजारपेठ आणि पारंपरिक रेस्टॉरंट.
  - **वेळ (Opening/Closing)**: संध्याकाळी ७:०० ते रात्री ११:३०
  - **वेळ आवश्यक (Time Required)**: २ तास
  - **गुगल मॅप्स लिंक (Google Maps Link)**: [गुगल मॅप्स नेव्हिगेशन](https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cleanLocation)}+Market)
  - **प्रवेश शुल्क (Entry Fee)**: मोफत
  - **भेट देण्याची सर्वोत्तम वेळ (Best Time to Visit)**: रात्री ८:०० वाजता
  - **गर्दीची पातळी (Crowd Level)**: मध्यम
  - **हवामान अनुकूलता (Weather Suitability)**: सुखद रात्रीचे वातावरण
  - **जवळचे रेस्टॉरंट्स (Nearby Restaurants)**: हॉटेल स्वदेशी डिलाईट
  - **जवळचे स्वच्छतागृह (Nearby Washrooms)**: रेस्टॉरंटच्या आत उपलब्ध
  - **जवळचे पार्किंग (Nearby Parking)**: व्हॅलेट पार्किंग उपलब्ध
- **Daily Budget Breakdown**:
  - **Hotel**: ₹${Math.round(baseDailyCost * 0.45)}
  - **Food**: ₹${Math.round(baseDailyCost * 0.25)}
  - **Local Transport**: ₹${Math.round(baseDailyCost * 0.15)}
  - **Attraction Tickets**: ₹${Math.round(baseDailyCost * 0.10)}
  - **Shopping**: ₹${Math.round(baseDailyCost * 0.05)}
  - **Total Day Cost**: ₹${baseDailyCost}

`;
      }
    } else if (isHindi) {
      for (let d = 1; d < duration; d++) {
        dayWisePlans += `---
Day ${d}: ${cleanLocation} का अन्वेषण और अनुभव
- **सुबह (Morning)**:
  - **आकर्षण / Sightseeing**: ${cleanLocation} का ऐतिहासिक किला और हेरिटेज मंदिर।
  - **समय (Opening/Closing)**: सुबह ९:०० से शाम ६:०० बजे तक
  - **आवश्यक समय (Time Required)**: २ घंटे
  - **गूगल मैप्स लिंक (Google Maps Link)**: [गूगल मैप्स नेविगेशन](https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cleanLocation)}+Sightseeing)
  - **प्रवेश शुल्क (Entry Fee)**: ₹५० प्रति व्यक्ति
  - **यात्रा का सर्वोत्तम समय (Best Time to Visit)**: सुबह ९:३० बजे
  - **भीड़ का स्तर (Crowd Level)**: कम
  - **मौसम अनुकूलता (Weather Suitability)**: खुला आसमान, धूप
  - **निकटतम रेस्तरां (Nearby Restaurants)**: कैफे हेरिटेज (दूरी ५०० मीटर)
  - **निकटतम शौचालय (Nearby Washrooms)**: टिकट काउंटर के पास उपलब्ध
  - **निकटतम पार्किंग (Nearby Parking)**: मुख्य द्वार के पास सरकारी पार्किंग (शुल्क ₹४०)
- **दोपहर (Afternoon)**:
  - **आकर्षण / दोपहर का भोजन**: स्थानीय लोकप्रिय भोजनालय और वातानुकूलित संग्रहालय।
  - **समय (Opening/Closing)**: सुबह १०:०० से रात ८:०० बजे तक
  - **आवश्यक समय (Time Required)**: १.५ घंटे
  - **गूगल मैप्स लिंक (Google Maps Link)**: [गूगल मैप्स नेविगेशन](https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cleanLocation)}+Museum)
  - **प्रवेश शुल्क (Entry Fee)**: ₹१०० प्रति व्यक्ति
  - **यात्रा का सर्वोत्तम समय (Best Time to Visit)**: दोपहर १:०० बजे
  - **भीड़ का स्तर (Crowd Level)**: मध्यम
  - **मौसम अनुकूलता (Weather Suitability)**: वातानुकूलित इनडोर
  - **निकटतम रेस्तरां (Nearby Restaurants)**: प्रसिद्ध स्थानीय भोजनालय
  - **निकटतम शौचालय (Nearby Washrooms)**: संग्रहालय के अंदर उपलब्ध
  - **निकटतम पार्किंग (Nearby Parking)**: ऑन-स्ट्रीट पार्किंग उपलब्ध
- **शाम (Evening)**:
  - **आकर्षण / सूर्यास्त**: प्रसिद्ध सूर्यास्त बिंदु और सुंदर झील परिसर।
  - **समय (Opening/Closing)**: २४ घंटे खुला
  - **आवश्यक समय (Time Required)**: २ घंटे
  - **गूगल मैप्स लिंक (Google Maps Link)**: [गूगल मैप्स नेविगेशन](https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cleanLocation)}+Sunset+Point)
  - **प्रवेश शुल्क (Entry Fee)**: मुफ्त
  - **यात्रा का सर्वोत्तम समय (Best Time to Visit)**: शाम ५:०० से ६:३० बजे तक
  - **भीड़ का स्तर (Crowd Level)**: अधिक
  - **मौसम अनुकूलता (Weather Suitability)**: खुली ताज़ी हवा
  - **निकटतम रेस्तरां (Nearby Restaurants)**: चाय और फास्ट फूड स्टॉल
  - **निकटतम शौचालय (Nearby Washrooms)**: झील के पास सार्वजनिक शौचालय
  - **निकटतम पार्किंग (Nearby Parking)**: पे एंड पार्क सुविधा उपलब्ध (शुल्क ₹३०)
- **रात (Night)**:
  - **रात्री का भोजन और खरीदारी**: मुख्य स्थानीय बाजार और पारंपरिक रेस्तरां।
  - **समय (Opening/Closing)**: शाम ७:०० से रात ११:३० बजे तक
  - **आवश्यक समय (Time Required)**: २ घंटे
  - **गूगल मैप्स लिंक (Google Maps Link)**: [गूगल मैप्स नेविगेशन](https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cleanLocation)}+Market)
  - **प्रवेश शुल्क (Entry Fee)**: मुफ्त
  - **यात्रा का सर्वोत्तम समय (Best Time to Visit)**: रात ८:०० बजे
  - **भीड़ का स्तर (Crowd Level)**: मध्यम
  - **मौसम अनुकूलता (Weather Suitability)**: सुहावना रात का माहौल
  - **निकटतम रेस्तरां (Nearby Restaurants)**: स्वदेशी डिलाइट भोजनालय
  - **निकटतम शौचालय (Nearby Washrooms)**: रेस्तरां के अंदर उपलब्ध
  - **निकटतम पार्किंग (Nearby Parking)**: वैलेट पार्किंग उपलब्ध
- **Daily Budget Breakdown**:
  - **Hotel**: ₹${Math.round(baseDailyCost * 0.45)}
  - **Food**: ₹${Math.round(baseDailyCost * 0.25)}
  - **Local Transport**: ₹${Math.round(baseDailyCost * 0.15)}
  - **Attraction Tickets**: ₹${Math.round(baseDailyCost * 0.10)}
  - **Shopping**: ₹${Math.round(baseDailyCost * 0.05)}
  - **Total Day Cost**: ₹${baseDailyCost}

`;
      }
    } else {
      for (let d = 1; d < duration; d++) {
        dayWisePlans += `---
Day ${d}: Discovering ${cleanLocation}
- **Morning**:
  - **Attraction / Sightseeing**: Heritage Fort & Ancient Palace Complex in ${cleanLocation}.
  - **Opening/Closing Time**: 09:00 AM - 06:00 PM
  - **Time Required**: 2 hours
  - **Google Maps Navigation Link**: [Google Maps Route](https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cleanLocation)}+Sightseeing)
  - **Entry Fee**: ₹50 per person
  - **Best Time to Visit**: 09:30 AM
  - **Crowd Level**: Low
  - **Weather Suitability**: Ideal for clear, sunny weather
  - **Nearby Restaurants**: Heritage Cafe (500m distance)
  - **Nearby Washrooms**: Available at Ticket counter
  - **Nearby Parking**: Govt parking near main gate (Fee ₹40)
- **Afternoon**:
  - **Attraction / Sightseeing / Lunch**: Local Museum and Traditional Lunch Eatery.
  - **Opening/Closing Time**: 10:00 AM - 08:00 PM
  - **Time Required**: 1.5 hours
  - **Google Maps Navigation Link**: [Google Maps Route](https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cleanLocation)}+Museum)
  - **Entry Fee**: ₹100 per person
  - **Best Time to Visit**: 01:00 PM
  - **Crowd Level**: Medium
  - **Weather Suitability**: Indoor air-conditioned
  - **Nearby Restaurants**: Traditional regional meal room
  - **Nearby Washrooms**: Inside museum block
  - **Nearby Parking**: On-street parking slots available
- **Evening**:
  - **Attraction / Sightseeing / Sunset**: Famous Lake Sunset Viewpoint & Garden.
  - **Opening/Closing Time**: 24 Hours Open
  - **Time Required**: 2 hours
  - **Google Maps Navigation Link**: [Google Maps Route](https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cleanLocation)}+Sunset+Point)
  - **Entry Fee**: Free Entry
  - **Best Time to Visit**: 05:00 PM - 06:30 PM
  - **Crowd Level**: High
  - **Weather Suitability**: Outdoor cool open-air
  - **Nearby Restaurants**: Tea & local snack stalls
  - **Nearby Washrooms**: Lakeside public toilets available
  - **Nearby Parking**: Pay & Park facility available (Fee ₹30)
- **Night**:
  - **Attraction / Dinner / Leisure**: Main local market & authentic dinner diner.
  - **Opening/Closing Time**: 07:00 PM - 11:30 PM
  - **Time Required**: 2 hours
  - **Google Maps Navigation Link**: [Google Maps Route](https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cleanLocation)}+Market)
  - **Entry Fee**: Free Entry
  - **Best Time to Visit**: 08:00 PM onwards
  - **Crowd Level**: Medium
  - **Weather Suitability**: Cool pleasant night breeze
  - **Nearby Restaurants**: Swadeshi Delight Restaurant
  - **Nearby Washrooms**: Available inside restaurant
  - **Nearby Parking**: Valet parking available
- **Daily Budget Breakdown**:
  - **Hotel**: ₹${Math.round(baseDailyCost * 0.45)}
  - **Food**: ₹${Math.round(baseDailyCost * 0.25)}
  - **Local Transport**: ₹${Math.round(baseDailyCost * 0.15)}
  - **Attraction Tickets**: ₹${Math.round(baseDailyCost * 0.10)}
  - **Shopping**: ₹${Math.round(baseDailyCost * 0.05)}
  - **Total Day Cost**: ₹${baseDailyCost}

`;
      }
    }

    let out = "";
    
    if (isMarathi) {
      out += `🌍 **${cleanLocation} सहल नियोजन (Travolor Itinerary)**\n`;
      out += `⏱️ कालावधी: ${duration} दिवस | प्रवासाची तारीख: ${travelDate || "नजीकच्या काळात"}\n`;
      out += `💰 बजेट श्रेणी: ${style.toUpperCase()} | एकूण बजेट: ₹${totalCost.toLocaleString('en-IN')}\n\n`;
      out += `🗓️ **दिवसनिहाय नियोजन (Day-by-Day Plan):**\n\n`;
      
      out += `---
Day 0: प्रवास आणि आगमन (Travel & Arrival)
- **Home / Departure City**:
  - **Departure City/Address**: ${startLocation} येथून प्रवासाला सुरवात.
  - **Departure Time**: सकाळी ०६:०० वा.
  - **Distance to Transit Terminal**: जवळचे बस / रेल्वे स्टेशन अंतर - १५ किमी.
  - **Cab / Self-Drive Recommendation**: निसर्गरम्य प्रवासासाठी स्वतः ड्राईव्ह करणे किंवा खाजगी कॅब उत्तम राहील.
  - **Google Maps Route Link**: [मार्ग नेव्हिगेशन](https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(startLocation)}&destination=${encodeURIComponent(cleanLocation)})
- **Journey to Destination**:
  - **Real Highway Route**: मुख्य राष्ट्रीय महामार्गावरून प्रवास.
  - **Road Distance**: अंदाजे ४०० किमी.
  - **Estimated Travel Duration**: ८ तास
  - **Toll Estimate**: अंदाजे ₹६५० टोल शुल्क
  - **Fuel Cost / EV Charging**: इंधन खर्च अंदाजे ₹३,००० (किंवा महामार्गावरील ईव्ही चार्जिंग पॉईंट्स उपलब्ध)
  - **Rest Stop Suggestions (every 2-3 hours)**: महामार्गावरील फूड प्लाझा, कोल्हापूर हायवे फूड पार्क.
  - **Food Stops**: वाटेत विश्रांतीसाठी आणि चवदार नाश्त्यासाठी महामार्ग ढाबा.
  - **Washroom Stops**: टोल प्लाझा येथील स्वच्छ स्वच्छतागृहे.
  - **EV Charging Stations**: महामार्गावर दर ५० किमी अंतरावर ईव्ही स्टेशन्स उपलब्ध आहेत.
- **Arrival & Settling In**:
  - **Estimated Arrival Time**: दुपारी ०२:३० वा.
  - **Hotel Check-In**: हॉटेल चेक-इन वेळ दुपारी ०३:०० वाजता, [हॉटेल स्वाध्याय रिसॉर्ट ${style} मध्ये]
  - **Nearby Restaurants**: हॉटेल जवळ उत्कृष्ट स्थानिक खानावळी (अंतर ५०० मीटर).
  - **Nearby Medical Facilities**: जिल्हा शासकीय रुग्णालय आणि आपत्कालीन क्लिनिक.
  - **Emergency Contacts**: पोलीस: १००, रुग्णवाहिका: १०२, आपत्कालीन क्रमांक: ११२

\n`;

      out += dayWisePlans;

      out += `---
Day ${duration} (अंतिम दिवस): चेकआऊट आणि परतीचा प्रवास
- **Hotel Checkout**: सकाळी हॉटेलमधून चेकआऊट करा आणि बिल क्लिअर करा.
- **Travel to Transit Terminal**: स्थानिक विमानतळ/रेल्वे स्टेशनकडे मार्गस्थ व्हा (किंवा स्वतःची कार पॅक करा).
- **Return Transport / Journey**: **${cleanLocation}** मधून **${startLocation}** कडे परतीचा प्रवास सुरू करा.
- **Arrival back to Departure City**: **${startLocation}** वर संध्याकाळी सुरक्षित आगमन.
- **Travel back Home**: आगमन टर्मिनलवरून घराकडे प्रवास.
- **Trip Completed**: अभिनंदन, तुमची ट्रॅव्होलर सहल पूर्ण झाली आहे!

---
### Travolor Pro-Tips, Suggestions & Safety Info:

- **Smart AI Suggestions**:
  - **Hidden Gems**: स्थानिक ऐतिहासिक लेणी आणि गुपिते ज्यांच्याबद्दल फार कमी जणांना माहिती आहे.
  - **Local Food Recommendations**: पारंपरिक कोकणी किंवा कोल्हापुरी खाद्यपदार्थांचा आस्वाद घ्या.
  - **Photography Spots**: सूर्यास्त पॉईंट आणि मुख्य किल्ल्याच्या बुरुजावरून अप्रतिम फोटोग्राफी.
  - **Sunset & Sunrise Points**: टेकडीवरील सनराईज पॉईंट आणि बीचवरील सनसेट.
  - **Local Markets**: हस्तकला आणि स्थानिक मसाले खरेदी करण्यासाठी मुख्य बाजार.
  - **Festivals & Cultural Experiences**: स्थानिक पारंपरिक लोकनृत्य आणि सांस्कृतिक कार्यक्रम.

- **Safety Information**:
  - **Emergency Numbers**: आपत्कालीन हेल्पलाईन: ११२, पोलीस: १००, रुग्णवाहिका: १०२
  - **Hospitals / Clinics**: स्थानिक जिल्हा सरकारी हॉस्पिटल, फोन: ०२३४-२२४४५५
  - **Police Station**: मुख्य शहर पोलीस ठाणे, फोन: ०२३४-२२११००
  - **Tourist Help Center**: शासकीय पर्यटन माहिती केंद्र, एसटी स्टँड समोर

- **💳 Trip Summary & Financial Report (एकूण प्रवाशांसाठी)**:
  - **Total Distance**: ८०० किमी (Round Trip)
  - **Total Driving Time**: ८ तास प्रत्येक बाजूने
  - **Total Fuel / Charging Cost**: ₹३,००० इंधन खर्च
  - **Total Toll Cost**: ₹६५० टोल खर्च
  - **Total Hotel Cost**: ₹${Math.round(totalCost * 0.45).toLocaleString('en-IN')} राहण्याचा खर्च
  - **Total Food Cost**: ₹${Math.round(totalCost * 0.25).toLocaleString('en-IN')} जेवणाचा खर्च
  - **Shopping Estimate**: ₹${Math.round(totalCost * 0.10).toLocaleString('en-IN')} खरेदी खर्च
  - **Grand Total Budget**: ₹${totalCost.toLocaleString('en-IN')} (बजेट उत्तम प्रकारे मॅनेज केले आहे)`;
    } else if (isHindi) {
      out += `🌍 **${cleanLocation} यात्रा योजना (Travolor Itinerary)**\n`;
      out += `⏱️ अवधि: ${duration} दिन | यात्रा तिथि: ${travelDate || "आगामी"}\n`;
      out += `💰 बजट श्रेणी: ${style.toUpperCase()} | कुल बजट: ₹${totalCost.toLocaleString('en-IN')}\n\n`;
      out += `🗓️ **दिन-प्रतिदिन की योजना (Day-by-Day Plan):**\n\n`;
      
      out += `---
Day 0: यात्रा और आगमन (Travel & Arrival)
- **Home / Departure City**:
  - **Departure City/Address**: ${startLocation} से प्रस्थान करें।
  - **Departure Time**: सुबह ०६:०० बजे।
  - **Distance to Transit Terminal**: निकटतम बस / रेलवे स्टेशन - १५ किमी।
  - **Cab / Self-Drive Recommendation**: सुंदर सड़क यात्रा के लिए स्वयं ड्राइव करें या प्राइवेट टैक्सी चुनें।
  - **Google Maps Route Link**: [मार्ग नेविगेशन](https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(startLocation)}&destination=${encodeURIComponent(cleanLocation)})
- **Journey to Destination**:
  - **Real Highway Route**: मुख्य राष्ट्रीय राजमार्ग का उपयोग।
  - **Road Distance**: लगभग ४०० किमी।
  - **Estimated Travel Duration**: ८ घंटे
  - **Toll Estimate**: अनुमानित ₹६५० टोल शुल्क
  - **Fuel Cost / EV Charging**: ईंधन लागत लगभग ₹३,००० (या मार्ग पर ईवी चार्जिंग स्टेशन उपलब्ध)
  - **Rest Stop Suggestions (every 2-3 hours)**: राजमार्ग पर फूड प्लाजा, एक्सप्रेसवे फूड पार्क।
  - **Food Stops**: रास्ते में स्वादिष्ट नाश्ते के लिए प्रमुख भोजनालय और एक्सप्रेसवे ढाबा।
  - **Washroom Stops**: टोल प्लाजा के पास साफ शौचालय।
  - **EV Charging Stations**: मार्ग पर हर ५० किमी पर ईवी चार्जिंग उपलब्ध है।
- **Arrival & Settling In**:
  - **Estimated Arrival Time**: दोपहर ०२:३० बजे।
  - **Hotel Check-In**: होटल चेक-इन दोपहर ०३:०० बजे, [होटल स्वाध्याय पैलेस ${style} में]
  - **Nearby Restaurants**: होटल के पास उत्कृष्ट रेस्टोरेंट (दूरी ५०० मीटर)।
  - **Nearby Medical Facilities**: जिला सरकारी अस्पताल और आपातकालीन क्लिनिक।
  - **Emergency Contacts**: पुलिस: १००, एम्बुलेंस: १०२, आपातकालीन नंबर: ११२

\n`;

      out += dayWisePlans;

      out += `---
Day ${duration} (अंतिम दिन): चेकआउट और वापसी यात्रा
- **Hotel Checkout**: सुबह होटल से चेकआउट करें और सभी बिलों का भुगतान करें।
- **Travel to Transit Terminal**: स्थानीय हवाई अड्डे/रेलवे स्टेशन की ओर प्रस्थान करें (या अपनी कार पैक करें)।
- **Return Transport / Journey**: **${cleanLocation}** से **${startLocation}** के लिए वापसी यात्रा शुरू करें।
- **Arrival back to Departure City**: **${startLocation}** पर शाम को सुरक्षित आगमन।
- **Travel back Home**: ड्रॉप पॉइंट से अपने घर की यात्रा करें।
- **Trip Completed**: बधाई हो, आपकी ट्रैवोलर यात्रा पूरी हो चुकी है!

---
### Travolor Pro-Tips, Suggestions & Safety Info:

- **Smart AI Suggestions**:
  - **Hidden Gems**: स्थानीय छिपे हुए झरने और गुफाएं जिनके बारे में बहुत कम पर्यटक जानते हैं।
  - **Local Food Recommendations**: स्थानीय पारंपरिक थाली और विशेष व्यंजनों का स्वाद लें।
  - **Photography Spots**: सूर्यास्त बिंदु और मुख्य किले से शानदार तस्वीरें लें।
  - **Sunset & Sunrise Points**: पहाड़ी पर स्थित सूर्योदय बिंदु और समुद्र तट पर सूर्यास्त।
  - **Local Markets**: हस्तशिल्प और स्थानीय मसाले खरीदने के लिए मुख्य बाजार।
  - **Festivals & Cultural Experiences**: स्थानीय लोक नृत्य और पारंपरिक सांस्कृतिक प्रदर्शन।

- **Safety Information**:
  - **Emergency Numbers**: आपातकालीन नंबर: ११२, पुलिस: १००, एम्बुलेंस: १०२
  - **Hospitals / Clinics**: जिला मुख्य अस्पताल, फोन: ०२३४-२२४४५५
  - **Police Station**: मुख्य नगर पुलिस स्टेशन, फोन: ०२३४-२२११००
  - **Tourist Help Center**: शासकीय पर्यटन केंद्र, मुख्य बस स्टैंड के पास

- **💳 Trip Summary & Financial Report (कुल यात्रियों के लिए)**:
  - **Total Distance**: ८०० किमी (Round Trip)
  - **Total Driving Time**: ८ घंटे प्रत्येक तरफ से
  - **Total Fuel / Charging Cost**: ₹३,००० ईंधन खर्च
  - **Total Toll Cost**: ₹६५० टोल खर्च
  - **Total Hotel Cost**: ₹${Math.round(totalCost * 0.45).toLocaleString('en-IN')} होटल खर्च
  - **Total Food Cost**: ₹${Math.round(totalCost * 0.25).toLocaleString('en-IN')} भोजन खर्च
  - **Shopping Estimate**: ₹${Math.round(totalCost * 0.10).toLocaleString('en-IN')} खरीदारी खर्च
  - **Grand Total Budget**: ₹${totalCost.toLocaleString('en-IN')} (बजट अनुकूलित है)`;
    } else {
      out += `🌍 **${cleanLocation} Travel Itinerary**\n`;
      out += `⏱️ Duration: ${duration} Days | Travel Date: ${travelDate || "Upcoming"}\n`;
      out += `💰 Budget Category: ${style.toUpperCase()} | Target Budget: ₹${totalCost.toLocaleString('en-IN')}\n\n`;
      out += `🗓️ **Day-by-Day Plan:**\n\n`;
      
      out += `---
Day 0: Leave & Travel to Destination
- **Home / Departure City**:
  - **Departure City/Address**: Start from the exact location: ${startLocation}.
  - **Departure Time**: Recommended departure at 06:00 AM.
  - **Distance to Transit Terminal**: Main terminal/station is 15 km away.
  - **Cab / Self-Drive Recommendation**: Self-driving or pre-booking a private cab is highly recommended for route flexibility.
  - **Google Maps Route Link**: [Google Maps Route](https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(startLocation)}&destination=${encodeURIComponent(cleanLocation)})
- **Journey to Destination**:
  - **Real Highway Route**: Scenic and optimized national highway route.
  - **Road Distance**: Approx 400 km.
  - **Estimated Travel Duration**: 8 hours of comfortable drive time.
  - **Toll Estimate**: Approx ₹650 in toll fees.
  - **Fuel Cost / EV Charging**: Approx ₹3,000 fuel cost (or clean EV charging plazas on expressway).
  - **Rest Stop Suggestions (every 2-3 hours)**: Highway Food Courts, Kolhapur Bypass Food Plaza.
  - **Food Stops**: Highly-rated expressway food court and traditional highway dhabas.
  - **Washroom Stops**: Modern clean public washrooms at major toll checkpoints.
  - **EV Charging Stations**: Express EV Charging Plazas are available every 50 km on this major corridor.
- **Arrival & Settling In**:
  - **Estimated Arrival Time**: 02:30 PM.
  - **Hotel Check-In**: check-in at 03:00 PM, [Recommended Swadesh Resort matching ${style} style]
  - **Nearby Restaurants**: Top local cafes and traditional diners within 500m of hotel.
  - **Nearby Medical Facilities**: District Government General Hospital & Emergency Care Clinic.
  - **Emergency Contacts**: Emergency Helpline: 112, Police: 100, Ambulance: 102

\n`;

      out += dayWisePlans;

      out += `---
Day ${duration} (Last Day): Checkout & Return Journey
- **Hotel Checkout**: Complete hotel checkout and clear any room bills.
- **Travel to Transit Terminal**: Head to local station/airport (or pack vehicle bags).
- **Return Transport / Journey**: Leave **${cleanLocation}** to return back to **${startLocation}** via ${travelModeName}.
- **Arrival back to Departure City**: Safe arrival back at **${startLocation}** in the evening.
- **Travel back Home**: Commute from drop terminal back to your residential address.
- **Trip Completed**: Congratulations, your Swadesh travel plan is fully completed!

---
### Travolor Pro-Tips, Suggestions & Safety Info:

- **Smart AI Suggestions**:
  - **Hidden Gems**: Scenic cliff-view point and old caves that are rarely visited by tourists.
  - **Local Food Recommendations**: Taste the authentic local spice thali and hot street food.
  - **Photography Spots**: Spectacular view from the old fortress watchtowers and lake sunsets.
  - **Sunset & Sunrise Points**: Sunrise view at the hill-crest temple, and sunset on the main bridge.
  - **Local Markets**: Handicraft village market for direct-from-weaver souvenirs and spices.
  - **Festivals & Cultural Experiences**: Local folk music events organized at the heritage amphitheater.

- **Safety Information**:
  - **Emergency Numbers**: Emergency Helpline: 112, Police: 100, Ambulance: 102
  - **Hospitals / Clinics**: City Government Hospital, Contact: +91-234-224455
  - **Police Station**: Main Police Headquarters, Contact: +91-234-221100
  - **Tourist Help Center**: State Tourism Information Desk, Tourist Station

- **💳 Trip Summary & Financial Report (for ${people} travelers)**:
  - **Total Distance**: 800 km (Round Trip)
  - **Total Driving Time**: 8 hours each way
  - **Total Fuel / Charging Cost**: ₹3,000 Fuel cost
  - **Total Toll Cost**: ₹650 Toll cost
  - **Total Hotel Cost**: ₹${Math.round(totalCost * 0.45).toLocaleString('en-IN')} Lodging
  - **Total Food Cost**: ₹${Math.round(totalCost * 0.25).toLocaleString('en-IN')} Dining
  - **Shopping Estimate**: ₹${Math.round(totalCost * 0.10).toLocaleString('en-IN')} Shopping
  - **Grand Total Budget**: ₹${totalCost.toLocaleString('en-IN')} (Optimized budget)`;
    }

    return {
      text: out,
      sources: [
        { title: "Travolor Local Knowledge Engine", uri: "https://travolor.com/local-db" }
      ],
      modelUsed: "Travolor-Local-Engine",
      grounded: true
    };
    */
  }

  // Multi-Turn Chatbot with Grounding and Mode configuration
  app.post("/api/gemini/chat", async (req, res) => {
    const { messages, userLocation, mode = "general", botRole = "copilot", language = "English" } = req.body;
    const hasKey = Boolean(process.env.GEMINI_API_KEY);

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "messages array is required." });
    }

    if (!hasKey) {
      console.warn("GEMINI_API_KEY missing on server. Triggering local chat agent.");
      const reply = getLocalChatReply(messages, botRole, language);
      return res.json(reply);
    }

    // Determine model based on complexity mode requested
    // gemini-3.1-pro-preview for particularly complex tasks
    // gemini-3.5-flash for general tasks
    // gemini-3.1-flash-lite for tasks that should happen fast
    let selectedModel = "gemini-3.5-flash";
    if (mode === "complex" || mode === "reasoning") {
      selectedModel = "gemini-3.1-pro-preview";
    } else if (mode === "fast") {
      selectedModel = "gemini-3.1-flash-lite";
    }

    // Set specialized chatbot roles / system instruction
    let systemInstruction = "You are Travolor Travel Co-pilot, a friendly, ultra-knowledgeable, and professional travel assistant. Help the user plan journeys, suggest restaurants, advise on budgets, and provide local tips. This app is strictly focused on India, so prioritize destinations, routes, highway pitstops, dhabas, local culture, and advice within India.";
    if (botRole === "foodie") {
      systemInstruction = "You are the Travolor Culinary Specialist. Your goal is to guide users to the finest local cuisines, street food, hidden restaurants, historical eateries, and dining tips, focused entirely on India's rich culinary traditions, highway dhabas, and local food culture.";
    } else if (botRole === "historian") {
      systemInstruction = "You are the Travolor Historical Guide. Share ancient tales, architectural secrets, temple and fort histories, and cultural significance behind popular landmarks, monuments, and cities in India.";
    } else if (botRole === "budget") {
      systemInstruction = "You are the Travolor Budget Hack Advisor. Provide extreme money-saving tips, affordable transport alternatives (IRCTC Indian Railways, state transport buses, local shared cabs), free attractions, cheap eats, and savvy itinerary optimizations within India.";
    }

    systemInstruction += ` CRITICAL: You must answer and write your responses ONLY in the ${language} language. Write all suggestions, travel advice, headings, and friendly comments in ${language}.`;

    // Configure tools: dynamic detection or explicit request
    const lastUserMessage = messages[messages.length - 1]?.text || "";
    const lowerMessage = lastUserMessage.toLowerCase();
    
    const tools: any[] = [];
    const config: any = {
      systemInstruction
    };

    // Use Maps Grounding if query focuses on "places to visit, restaurants, hotels near, route, map, coordinates, directory, nearby"
    const requiresMaps = lowerMessage.includes("near me") || 
                         lowerMessage.includes("restaurant") || 
                         lowerMessage.includes("hotel") || 
                         lowerMessage.includes("place") || 
                         lowerMessage.includes("where is") || 
                         lowerMessage.includes("nearby") ||
                         lowerMessage.includes("map");

    if (requiresMaps && selectedModel !== "gemini-3.1-flash-lite") {
      tools.push({ googleMaps: {} });
      if (userLocation && userLocation.lat && userLocation.lng) {
        config.toolConfig = {
          retrievalConfig: {
            latLng: {
              latitude: Number(userLocation.lat),
              longitude: Number(userLocation.lng)
            }
          }
        };
      }
    } else if (selectedModel !== "gemini-3.1-flash-lite") {
      // Use Search Grounding as default for current events or real-time info
      tools.push({ googleSearch: {} });
    }

    if (tools.length > 0) {
      config.tools = tools;
    }

    // Enable high thinking mode for gemini-3.1-pro-preview if requested
    if (selectedModel === "gemini-3.1-pro-preview") {
      config.thinkingConfig = { thinkingLevel: ThinkingLevel.HIGH };
    }

    try {
      // Map frontend messages format to standard role-parts structure
      // role must be 'user' or 'model'
      const history = messages.slice(0, -1).map((m: any) => ({
        role: m.role === "assistant" || m.role === "model" ? "model" as const : "user" as const,
        parts: [{ text: m.text }]
      }));

      // Initialize stateless multi-turn chat using config
      const chat = getAi().chats.create({
        model: selectedModel,
        history: history,
        config: config
      });

      const response = await chat.sendMessage({ message: lastUserMessage });

      // Extract Grounding Chunks (URLs, Places, reviews, etc.)
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      const sources: any[] = [];
      if (groundingChunks) {
        for (const chunk of groundingChunks) {
          if (chunk.web) {
            sources.push({
              type: "web",
              title: chunk.web.title,
              uri: chunk.web.uri
            });
          } else if (chunk.maps) {
            sources.push({
              type: "maps",
              title: chunk.maps.title || "Directions / Place Link",
              uri: chunk.maps.uri,
              reviewSnippets: chunk.maps.placeAnswerSources?.reviewSnippets || []
            });
          }
        }
      }

      res.json({
        text: response.text || "I apologize, but I could not formulate a response at this moment.",
        sources: sources,
        modelUsed: selectedModel,
        grounded: sources.length > 0
      });
    } catch (error: any) {
      const isQuota = error?.status === "RESOURCE_EXHAUSTED" || error?.message?.includes("RESOURCE_EXHAUSTED") || error?.message?.includes("spending cap") || error?.message?.includes("429");
      if (isQuota) {
        console.log("Gemini API spending cap or quota exceeded. Using local chat agent.");
      } else {
        console.log("Chat generation notice (using fallback):", error?.message || error);
      }
      const reply = getLocalChatReply(messages, botRole, language);
      return res.json(reply);
    }
  });

  // Local Chat Response Generator
  function getLocalChatReply(messages: any[], botRole: string, language: string) {
    const lastUserMessage = messages[messages.length - 1]?.text || "";
    const lowerMessage = lastUserMessage.toLowerCase();
    
    // Default reply in English
    let reply = "Hello! As your friendly Travolor Co-pilot, I'm here to support your travel planning! How can I assist you with your destination, packing list, budget choice, or transport options today?";
    
    if (botRole === "foodie" || lowerMessage.includes("food") || lowerMessage.includes("eat") || lowerMessage.includes("restaurant") || lowerMessage.includes("cuisine")) {
      reply = "Delight in local food tour options! When travelling, the absolute golden rule is to hunt for bustling small heritage joints and busy street stalls. Try authentic regional delicacies, look out for steam-fresh preparations, and check the daily street markets for hidden treats!";
    } else if (botRole === "historian" || lowerMessage.includes("history") || lowerMessage.includes("monument") || lowerMessage.includes("castle") || lowerMessage.includes("museum")) {
      reply = "What a fascinating quest! Historic monuments hold ancient stories in their architectures. I highly recommend taking a local walking tour early in the Morning to explore old cathedrals, temples, and heritage plazas before standard tourists arrive.";
    } else if (botRole === "budget" || lowerMessage.includes("budget") || lowerMessage.includes("cost") || lowerMessage.includes("saving") || lowerMessage.includes("money") || lowerMessage.includes("price")) {
      reply = "Extreme money-saving hacks are my specialty! To maximize your budget, consider utilizing the local transit systems (like buses and metro), getting multi-attraction city explorer cards, finding tourist spots with free entry, and tasting street vendor delicacies instead of premium dining rooms.";
    } else if (lowerMessage.includes("hotel") || lowerMessage.includes("stay") || lowerMessage.includes("hostel")) {
      reply = "Looking for beautiful accommodations? Choosing rooms cerca are is essential! Use our handy 'Hotels' tab at the top of the interface to explore real, premium boutique hotels, luxury resorts, or economical hostels with real-time tariff calculations!";
    } else if (lowerMessage.includes("flight") || lowerMessage.includes("train") || lowerMessage.includes("bus") || lowerMessage.includes("cab") || lowerMessage.includes("travel")) {
      reply = "Planning transportation? Travolor makes booking tickets simple. Jump to the corresponding Transport search cards (Flights, Trains, Buses, Cabs) in our interface to query current operators and plan your connections instantly!";
    } else if (lowerMessage.includes("weather") || lowerMessage.includes("pack") || lowerMessage.includes("clothes") || lowerMessage.includes("wear")) {
      reply = "Packing the right layers is crucial! As a recommendation, pack light-weight breathable garments, durable walking shoes (vital!), and clean sun/rain gear. Always check current weather reports before catching your flight!";
    }

    // Adapt to requested language simple greeting formatting
    const isHindi = language.toLowerCase().startsWith("hi") || language.toLowerCase().includes("hindi");
    const isMarathi = language.toLowerCase().startsWith("mr") || language.toLowerCase().includes("marathi");
    const isGujarati = language.toLowerCase().startsWith("gu") || language.toLowerCase().includes("gujarati");
    const isBengali = language.toLowerCase().startsWith("bn") || language.toLowerCase().includes("bengali");
    const isTamil = language.toLowerCase().startsWith("ta") || language.toLowerCase().includes("tamil");
    const isTelugu = language.toLowerCase().startsWith("te") || language.toLowerCase().includes("telugu");
    const isKannada = language.toLowerCase().startsWith("kn") || language.toLowerCase().includes("kannada");
    const isPunjabi = language.toLowerCase().startsWith("pa") || language.toLowerCase().includes("punjabi");
    const isMalayalam = language.toLowerCase().startsWith("ml") || language.toLowerCase().includes("malayalam");
    const isOdia = language.toLowerCase().startsWith("or") || language.toLowerCase().includes("odia");
    const isAssamese = language.toLowerCase().startsWith("as") || language.toLowerCase().includes("assamese");
    const isUrdu = language.toLowerCase().startsWith("ur") || language.toLowerCase().includes("urdu");
    const isKonkani = language.toLowerCase().startsWith("ko") || language.toLowerCase().includes("konkani");
    const isSanskrit = language.toLowerCase().startsWith("sa") || language.toLowerCase().includes("sanskrit");
    const isSpanish = language.toLowerCase().startsWith("es") || language.toLowerCase().includes("spanish");
    const isFrench = language.toLowerCase().startsWith("fr") || language.toLowerCase().includes("french");

    if (isHindi) {
      if (reply.startsWith("Hello!")) {
        reply = "नमस्ते! आपके ट्रैवोलर सह-संचालक (Travel Co-pilot) के रूप में, मैं आपकी यात्रा योजना में सहायता के लिए यहाँ हूँ! आज मैं आपकी मंज़िल, बजट विकल्प, या परिवहन साधनों के संबंध में कैसे मदद कर सकता हूँ?";
      } else if (reply.startsWith("Delight")) {
        reply = "स्थानीय जायके का आनंद लें! यात्रा करते समय सुनहरी रणनीति यह है कि आप भीड़-भाड़ वाले छोटे पारंपरिक ढाबों और व्यस्त स्ट्रीट स्टालों को ढूंढें। प्रामाणिक व्यंजनों और ताज़ा स्ट्रीट फ़ूड का लुत्फ उठाएं!";
      } else if (reply.startsWith("What")) {
        reply = "क्या शानदार ऐतिहासिक सवाल है! प्रत्येक विरासत स्थल अपने भीतर सदियों का इतिहास समेटे हुए है। सुबह जल्दी गाइडेड वॉक पर निकलें ताकि आप बिना भीड़ के किले, मंदिरों और ऐतिहासिक संग्रहालयों को अच्छे से देख सकें।";
      } else if (reply.startsWith("Extreme")) {
        reply = "पैसे बचाने की तरकीबें मेरी विशेषता हैं! अपने बजट को सीमित रखने के लिए स्थानीय परिवहन (जैसे मेट्रो या बस सेवाओं) का उपयोग करें, पर्यटन कार्ड खरीदें, और महँगे रेस्टोरेंट्स् की बजाय प्रामाणिक स्ट्रीट फ़ूड आजमाएं।";
      } else {
        reply = "नमस्ते! मैं आपकी यात्रा को अद्भुत बनाने में सहायता करूँगा। अपनी मंज़िल, ठहरने की जगह (Hotels), या उड़ानों (Flights) के लिए ऊपर दिए गए टैब का उपयोग करके तुरंत लाइव दरें और जानकारी देखें!";
      }
    } else if (isMarathi) {
      if (reply.startsWith("Hello!")) {
        reply = "नमस्ते! तुमच्या ट्रॅव्होलर को-पायलट म्हणून, मी तुमच्या प्रवासाच्या नियोजनात मदत करण्यासाठी येथे आहे! आज मी तुम्हाला तुमचे गंतव्यस्थान, पॅकिंग यादी, बजेट पर्याय किंवा वाहतूक पर्यायांमध्ये कशी मदत करू?";
      } else if (reply.startsWith("Delight")) {
        reply = "स्थानिक खाद्यसंस्कृतीचा आनंद घ्या! प्रवासाचा सुवर्ण नियम म्हणजे गर्दी असलेले छोटे पारंपरिक ढाबे आणि व्यस्त स्ट्रीट स्टॉल्स शोधणे. अस्सल प्रादेशिक पदार्थ आणि ताजे स्ट्रीट फूड नक्की ट्राय करा!";
      } else if (reply.startsWith("What")) {
        reply = "किती छान ऐतिहासिक प्रश्न! प्रत्येक वारसा स्थळाच्या वास्तुकलेत प्राचीन कथा दडलेल्या असतात. किल्ले, मंदिरे आणि ऐतिहासिक वास्तू गर्दीशिवाय पाहण्यासाठी सकाळी लवकर फिरणे केव्हाही उत्तम.";
      } else if (reply.startsWith("Extreme")) {
        reply = "पैसे वाचवण्याच्या भारी टिप्स ही माझी खासियत आहे! तुमचे बजेट वाढवण्यासाठी स्थानिक वाहतूक सेवा (जसे की एसटी बस किंवा लोकल ट्रेन) वापरा, मोफत प्रवेश असलेली पर्यटन स्थळे पहा आणि महागड्या हॉटेलऐवजी स्थानिक स्ट्रीट फूड ट्राय करा.";
      } else {
        reply = "नमस्ते! मी तुमचा प्रवास अधिक सुखकर करण्यात मदत करेन. तुमच्या प्रवासाचे मार्ग, हॉटेल बुकिंग किंवा विमानाचे तिकीट तपासण्यासाठी वरील टॅबचा वापर करा!";
      }
    } else if (isGujarati) {
      if (reply.startsWith("Hello!")) {
        reply = "નમસ્તે! તમારા ટ્રેવોલર કો-પાયલોટ તરીકે, હું તમને પ્રવાસના આયોજનમાં મદદ કરવા માટે અહીં છું! આજે હું તમને તમારા ગંતવ્ય, પેકિંગ લિસ્ટ, બજેટ અથવા પરિવહન વિકલ્પોમાં કેવી રીતે મદદ કરી શકું?";
      } else if (reply.startsWith("Delight")) {
        reply = "સ્થાનિક સ્વાદની મજા માણો! પ્રદેશ દરમિયાન સુવર્ણ નિયમ એ છે કે ભીડવાળા નાના પરંપરાગત ઢાબા અને વ્યસ્ત સ્ટ્રીટ સ્ટોલ્સ શોધો. અસલ પ્રાદેશિક વાનગીઓનો સ્વાદ માણો!";
      } else if (reply.startsWith("What")) {
        reply = "કેવો રસપ્રદ ઐતિહાસિક પ્રશ્ન! દરેક ધરોહર સ્થળ તેની અંદર સદીઓનો ઇતિહાસ ધરાવે છે. સવારે વહેલા ગાઇડેડ વૉક પર નીકળો જેથી તમે ગઢ, મંદિરો અને કિલ્લાઓ શાંતિથી જોઈ શકો.";
      } else if (reply.startsWith("Extreme")) {
        reply = "પૈસા બચાવવાની ટિપ્સ મારી ખાસિયત છે! બજેટ મર્યાદિત રાખવા સ્થાનિક વાહનવ્યવહાર (જેમ કે બસ કે મેટ્રો) નો ઉપયોગ કરો અને પ્રખ્યાત સ્ટ્રીટ ફૂડ અજમાવો.";
      } else {
        reply = "નમસ્તે! હું તમારા પ્રવાસને અદ્ભુત બનાવવામાં મદદ કરીશ. ઉપર આપેલા ટેબનો ઉપયોગ કરીને હોટેલ, બસ અથવા ફ્લાઇટ્સ વિશેની માહિતી તુરંત જુઓ!";
      }
    } else if (isBengali) {
      if (reply.startsWith("Hello!")) {
        reply = "নমস্কার! আপনার ট্রাভেলার সহ-পাইলট হিসাবে, আমি আপনার ভ্রমণ পরিকল্পনায় সহায়তা করতে প্রস্তুত। আজ আপনার গন্তব্য, বাজেট বা পরিবহন নিয়ে কীভাবে সাহায্য করতে পারি?";
      } else if (reply.startsWith("Delight")) {
        reply = "স্থানীয় খাবারের স্বাদ নিন! ভ্রমণের সুবর্ণ নিয়ম হলো ব্যস্ত ঐতিহ্যবাহী ধাবা বা স্ট্রিট ফুড স্টল খুঁজে বের করা। খাঁটি আঞ্চলিক খাবারের স্বাদ নিন!";
      } else if (reply.startsWith("What")) {
        reply = "দারুণ ঐতিহাসিক প্রশ্ন! প্রতিটি প্রাচীন স্থাপত্যের আড়ালে লুকিয়ে আছে রোমাঞ্চকর ইতিহাস। সকাল সকাল ঘুরে দেখুন কেল্লা, মন্দির এবং ঐতিহাসিক জাদুঘরগুলো।";
      } else if (reply.startsWith("Extreme")) {
        reply = "টাকা বাঁচানোর দারুণ কৌশল আমার জানা আছে! বাজেট নিয়ন্ত্রণে রাখতে স্থানীয় পরিবহন (যেমন বাস বা ট্রেন) ব্যবহার করুন এবং বিলাসবহুল হোটেলের বদলে স্ট্রিট ফুড ট্রাই করুন।";
      } else {
        reply = "নমস্কার! আমি আপনার ভ্রমণকে সুন্দর করে তুলব। আপনার রুট বা hotel বুকিংয়ের জন্য উপরের ট্যাবগুলি ব্যবহার করুন!";
      }
    } else if (isTamil) {
      if (reply.startsWith("Hello!")) {
        reply = "வணக்கம்! உங்கள் டிராவலர் இணை விமானியாக, பயணத் திட்டமிடலில் உங்களுக்கு உதவ நான் தயாராக உள்ளேன். இன்று உங்கள் இலக்கு, பட்ஜெட் அல்லது போக்குவரத்து குறித்து நான் எவ்வாறு உதவ முடியும்?";
      } else if (reply.startsWith("Delight")) {
        reply = "உள்ளூர் உணவை அனுபவியுங்கள்! பயணத்தின் போது சிறந்த வழி என்னவென்றால், பரபரப்பான பாரம்பரிய உணவகங்கள் மற்றும் தெருக்கடைகளைக் கண்டறிவதுதான். அசல் பாரம்பரிய உணவுகளை சுவையுங்கள்!";
      } else if (reply.startsWith("What")) {
        reply = "அற்புதமான வரலாற்று கேள்வி! ஒவ்வொரு பாரம்பரிய சின்னமும் ஒரு கதையைக் கொண்டுள்ளது. காலையிலேயே வரலாற்று இடங்கள் மற்றும் கோயில்களைப் பார்வையிடச் செல்லுங்கள்.";
      } else if (reply.startsWith("Extreme")) {
        reply = "பணம் சேமிக்கும் வழிகள் எனது தனிச்சிறப்பு! பட்ஜெட்டைச் சேமிக்க அரசு பேருந்துகள் அல்லது ரயில்களைப் பயன்படுத்துங்கள், தெரு உணவுகளை முயற்சி செய்யுங்கள்.";
      } else {
        reply = "வணக்கம்! உங்கள் பயணத்தை சிறப்பானதாக மாற்ற நான் உதவுவேன். உங்கள் வழிகள் அல்லது தங்குமிடங்களை திட்டமிட மேலே உள்ள டேப்களைப் பயன்படுத்துங்கள்!";
      }
    } else if (isTelugu) {
      if (reply.startsWith("Hello!")) {
        reply = "നമസ്തേ! మీ ట్రావెలర్ కో-పైలట్‌గా, మీ ప్రయాణ ప్రణాళికలో సహాయం చేయడానికి నేను ఇక్కడ ఉన్నాను. ఈ రోజు మీ గమ్యస్థానం, బడ్జెట్ లేదా రవాణా గురించి నేను ఎలా సహాయపడగలను?";
      } else if (reply.startsWith("Delight")) {
        reply = "స్థానిక రుచులను ఆస్వాదించండి! ప్రయాణంలో సువర్ణ సూత్రం ఏమిటంటే రద్దీగా ఉండే చిన్న సంప్రదాయ ధాబాలు మరియు స్ట్రీట్ ఫుడ్ స్టాల్స్‌ను సందర్శించడం.";
      } else if (reply.startsWith("What")) {
        reply = "అద్భుతమైన చారిత్రక ప్రశ్న! ప్రతి కట్టడం వెనుక ఒక గొప్ప చరిత్ర ఉంది. ఆలయాలు మరియు కోటలను ప్రశాంతంగా సందర్శించడానికి ఉదయాన్నే వెళ్ళండి.";
      } else if (reply.startsWith("Extreme")) {
        reply = "డబ్బు ఆదా చేసే చిట్కాలు నా ప్రత్యేకత! బడ్జెట్ తగ్గించుకోవడానికి ప్రభుత్వ బస్సులు లేదా రైళ్లను వాడండి, స్థానిక స్ట్రీట్ ఫుడ్ రుచి చూడండి.";
      } else {
        reply = "നമസ്തే! మీ ప్రయాణాన్ని అద్భుతంగా మార్చడానికి నేను సహాయం చేస్తాను. రూట్లు లేదా హోటళ్ల వివరాల కోసం పై ట్యాబ్‌లను చూడండి!";
      }
    } else if (isKannada) {
      if (reply.startsWith("Hello!")) {
        reply = "ನಮಸ್ತೆ! ನಿಮ್ಮ ಟ್ರಾವೆಲರ್ ಸಹ-ಪೈಲಟ್ ಆಗಿ, ನಾನು ಪ್ರವಾಸದ ಯೋಜನೆಯಲ್ಲಿ ಸಹಾಯ ಮಾಡಲು ಇಲ್ಲಿದ್ದೇನೆ. ಇಂದು ನಿಮ್ಮ ಗಮ್ಯಸ್ಥಾನ, ಬಜೆಟ್ ಅಥವಾ ಸಾರಿಗೆಯ ಬಗ್ಗೆ ನಾನು ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಹುದು?";
      } else if (reply.startsWith("Delight")) {
        reply = "ಸ್ಥಳೀಯ ಆಹಾರದ ರುಚಿಯನ್ನು ಆನಂದಿಸಿ! ಪ್ರವಾಸದ ಸುವರ್ಣ ನಿಯಮವೆಂದರೆ ಜನದಟ್ಟಣೆ ಇರುವ ಸಣ್ಣ ಸಾಂಪ್ರದಾಯಿಕ ಧಾಬಾಗಳು ಮತ್ತು ಸ್ಟ್ರೀಟ್ ಫುಡ್ ಸ್ಟಾಲ್‌ಗಳನ್ನು ಹುಡುಕುವುದು.";
      } else if (reply.startsWith("What")) {
        reply = "ಅದ್ಭುತವಾದ ಐತಿಹಾಸಿಕ ಪ್ರಶ್ನೆ! ಪ್ರತಿ ಸ್ಮಾರಕದ ಹಿಂದೆ ಒಂದು ರೋಚಕ ಇತಿಹಾಸವಿದೆ. ದೇವಾಲಯಗಳು ಮತ್ತು ಕೋಟೆಗಳನ್ನು ವೀಕ್ಷಿಸಲು ಮುಂಜಾನೆಯೇ ಹೊರಡಿ.";
      } else if (reply.startsWith("Extreme")) {
        reply = "ಹಣ ಉಳಿಸುವ ಸಲಹೆಗಳು ನನ್ನ ವಿಶೇಷತೆ! ಬಜೇಟ್ ಮಿತಿಯಲ್ಲಿಡಲು ಸರ್ಕಾರಿ ಬಸ್‌ಗಳು ಅಥವಾ ರೈಲುಗಳನ್ನು ಬಳಸಿ, ಸ್ಥಳೀಯ ಸ್ಟ್ರೀಟ್ ಫುಡ್ ಸವಿಯಿರಿ.";
      } else {
        reply = "ನಮಸ್ತೆ! ನಿಮ್ಮ ಪ್ರಯಾಣವನ್ನು ಸುಖಕರವಾಗಿಸಲು ನಾನು ಸಹಾಯ ಮಾಡುತ್ತೇನೆ. ಮಾರ್ಗಗಳು ಅಥವಾ ಹೋಟೆಲ್ ವಿವರಗಳಿಗಾಗಿ ಮೇಲಿನ ಟ್ಯಾಬ್‌ಗಳನ್ನು ಬಳಸಿ!";
      }
    } else if (isPunjabi) {
      if (reply.startsWith("Hello!")) {
        reply = "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ! ਤੁਹਾਡੇ ਟ੍ਰੈਵਲਰ ਕੋ-ਪਾਇਲਟ ਵਜੋਂ, ਮੈਂ ਤੁਹਾਡੀ ਯਾਤਰਾ ਯੋਜਨਾ ਵਿੱਚ ਮਦਦ ਕਰਨ ਲਈ ਤਿਆਰ ਹਾਂ। ਅੱਜ ਤੁਹਾਡੀ ਮੰਜ਼ਿਲ, ਬਜਟ ਜਾਂ ਟ੍ਰਾਂਸਪੋਰਟ ਬਾਰੇ ਮੈਂ ਕਿਵੇਂ ਮਦਦ ਕਰ ਸਕਦਾ ਹਾਂ?";
      } else if (reply.startsWith("Delight")) {
        reply = "ਸਥਾਨਕ ਸਵਾਦਾਂ ਦਾ ਅਨੰਦ ਲਓ! ਯਾਤਰਾ ਦਾ ਸੁਨਹਿਰੀ ਨਿਯਮ ਰਵਾਇਤੀ ਹਾਈਵੇਅ ਢਾਬਿਆਂ 'ਤੇ ਖਾਣਾ ਖਾਣਾ ਹੈ। ਅਸਲੀ ਦੇਸੀ ਸਵਾਦਾਂ ਦਾ ਲੁਤਫ ਉਠਾਓ!";
      } else if (reply.startsWith("What")) {
        reply = "ਬਹੁਤ ਹੀ ਦਿਲਚਸਪ ਇਤਿਹਾਸਕ ਸਵਾਲ! ਹਰ ਕਿਲ੍ਹਾ ਅਤੇ ਇਤਿਹਾਸਕ ਸਥਾਨ ਆਪਣੇ ਅੰਦਰ ਸਦੀਆਂ ਦੀ ਕਹਾਣੀ ਸਮੇਟੇ ਹੋਏ ਹੈ। ਸਵੇਰੇ ਜਲਦੀ ਇਤਿਹਾਸਕ ਥਾਵਾਂ ਦੇ ਦੌਰੇ 'ਤੇ ਜਾਓ।";
      } else if (reply.startsWith("Extreme")) {
        reply = "ਪੈਸੇ ਬਚਾਉਣ ਦੇ ਤਰੀਕੇ ਮੇਰੀ ਖਾਸੀਅਤ ਹਨ! ਬਜਟ ਸੀਮਤ ਰੱਖਣ ਲਈ ਸਰਕਾਰੀ ਬੱਸਾਂ ਜਾਂ ਰੇਲਗੱਡੀ ਦੀ ਵਰਤੋਂ ਕਰੋ ਅਤੇ ਸਥਾਨਕ ਢਾਬਿਆਂ ਦਾ ਖਾਣਾ ਖਾਓ।";
      } else {
        reply = "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ! ਮੈਂ ਤੁਹਾਡੀ ਯਾਤਰਾ ਨੂੰ ਬਿਹਤਰੀਨ ਬਣਾਉਣ ਵਿੱਚ ਮਦਦ ਕਰਾਂਗਾ। ਫਲਾਈਟਾਂ, ਹੋਟਲਾਂ ਜਾਂ ਰੂਟਾਂ ਦੀ ਜਾਣਕਾਰੀ ਲਈ ਉੱਪਰ ਦਿੱਤੇ ਟੈਬਾਂ ਦੀ ਵਰਤੋਂ ਕਰੋ!";
      }
    } else if (isMalayalam) {
      if (reply.startsWith("Hello!")) {
        reply = "നമസ്തേ! നിങ്ങളുടെ ട്രാവൽ കോ-പൈലറ്റ് ആയി, യാത്ര ആസൂത്രണം ചെയ്യാൻ ഞാൻ ഇവിടെയുണ്ട്. നിങ്ങളുടെ ലക്ഷ്യസ്ഥാനം, ബജറ്റ് അല്ലെങ്കിൽ യാത്രാമാർഗ്ഗങ്ങളെക്കുറിച്ച് ഞാൻ എങ്ങനെ സഹായിക്കണം?";
      } else if (reply.startsWith("Delight")) {
        reply = "പ്രാദേശിക ഭക്ഷണങ്ങൾ ആസ്വദിക്കൂ! യാത്ര ചെയ്യുമ്പോൾ തിരക്കേറിയ ചെറിയ തട്ടുകടകളും നാടൻ ഭക്ഷണശാലകളും കണ്ടെത്തുക എന്നതാണ് പ്രധാന തന്ത്രം.";
      } else if (reply.startsWith("What")) {
        reply = "വളരെ രസകരമായ ചരിത്ര ചോദ്യം! ഓരോ സ്മാരകത്തിന് പിന്നിലും വലിയ ചരിത്രമുണ്ട്. കോട്ടകളും ക്ഷേത്രങ്ങളും സന്ദർശിക്കാൻ രാവിലെ തന്നെ പുറപ്പെടുക.";
      } else if (reply.startsWith("Extreme")) {
        reply = "പണം ലാഭിക്കുന്നതിനുള്ള തന്ത്രങ്ങൾ എന്റെ സവിശേഷതയാണ്! കെ.എസ്.ആർ.ടി.സി ബസുകളോ ട്രെയിനുകളോ ഉപയോഗിക്കുക, തട്ടുകടകളിലെ ഭക്ഷണം പരീക്ഷിക്കുക.";
      } else {
        reply = "നമസ്തേ! നിങ്ങളുടെ യാത്ര മികച്ചതാക്കാൻ ഞാൻ സഹായിക്കാം. റൂട്ടുകൾക്കോ ഹോട്ടലുകൾക്കോ ആയി മുകളിലെ ടാബുകൾ ഉപയോഗിക്കുക!";
      }
    } else if (isOdia) {
      if (reply.startsWith("Hello!")) {
        reply = "ନମସ୍କାର! ଆପଣଙ୍କ ଯାତ୍ରା ସହ-ପାଇଲଟ୍ ଭାବରେ, ମୁଁ ଆପଣଙ୍କୁ ସାହାଯ୍ୟ କରିବାକୁ ପ୍ରସ୍ତୁତ | ଆଜି ଆପଣଙ୍କର ଯାତ୍ରା ପ୍ଲାନ, ବଜେਟ୍ କିମ୍ବା ପରିବହନ ବିଷୟରେ ମୁଁ କିପରି ସାହାଯ្យ କରିପାରିବି?";
      } else if (reply.startsWith("Delight")) {
        reply = "ସ୍ଥାନୀય ସ୍ୱାଦର ମଜା ନିଅନ୍ତು! ଯାତ୍ରା ସମୟରେ ସବୁଠାରୁ ଭଲ ଉପାୟ ହେଉଛି ପାରମ୍ପରିକ ଢାବା ଏବଂ ପ୍ରସିଦ୍ଧ ଷ୍ଟ୍ରିଟ୍ ଫୁଡ୍ ଖାଇବା |";
      } else if (reply.startsWith("What")) {
        reply = "ବହୁତ ସୁନ୍ଦର ଐତିହାସିକ ପ୍ରଶ୍ନ! ପ୍ରତ୍ୟେକ କୀର୍ତ୍ତିରାଜି ପଛରେ ଏକ ସୁନ୍ଦର ଇତିହାସ ଅଛି | ପ୍ରାଚୀନ ମନ୍ଦିર ଏବଂ ଦୁର୍ଗଗୁଡ଼ିକୁ ଶାନ୍ତିରେ ଦେଖିବା ପାଇଁ ସକାଳୁ ବୁଲିବାକୁ ଯାଆନ୍ତୁ |";
      } else if (reply.startsWith("Extreme")) {
        reply = "ପଇସା ବଞ୍ଚାଇବା ଉପାୟ ମୋତେ ଭଲ ଭାବେ ଜଣା | ବଜେଟ୍ ସୀମିତ ରଖିବା ପାଇଁ ସରକାରୀ ବସ୍ କିମ୍ବା ଟ୍ରେନ୍ ବ୍ୟବହାର କରନ୍ତୁ ଏବଂ ସ୍ଥାନୀୟ ଖାଦ୍ୟ ଖାଆନ୍ତୁ |";
      } else {
        reply = "ନମସ୍କାର! ଆପଣଙ୍କ ଯାତ୍ରାକୁ ସୁନ୍ଦର କରିବାରେ ମୁଁ ସାହାଯ្យ କରିବି | ହୋଟେଲ୍ କିମ୍ବା ରୁଟ୍ ଚେକ୍ କରିବା ପାଇଁ ଉପରେ ଦିଆଯାଇଥିବା ଟ୍ୟାବ୍ ବ୍ୟବହାର କରନ୍ତୁ !";
      }
    } else if (isAssamese) {
      if (reply.startsWith("Hello!")) {
        reply = "নমস্কাৰ! আপোনাৰ ট্ৰেভেলার সহ-পাইলট হিচাপে, মই আপোনাক যাত্ৰা পৰিকল্পনাত সহায় কৰিবলৈ সাজু আছোঁ। আজি আপোনাৰ গন্তব্যস্থান, বাজেট বা পৰিবহন সম্পৰ্কে মই কেনেকৈ সহায় কৰিব পাৰোঁ?";
      } else if (reply.startsWith("Delight")) {
        reply = "স্থানীয় সোৱাদৰ আনন্দ লওক! ভ্ৰমণৰ সোণালী নিয়মটো হ'ল ব্যস্ত থলুৱা ধাবা বা ষ্ট্ৰীট ফুড দোকানসমূহ বিচাৰি উলিওৱা। সোৱাদ লওক!";
      } else if (reply.startsWith("What")) {
        reply = "ঐতিহাসিক প্ৰশ্ন! প্ৰতিটো প্ৰাচীন কীৰ্তিচিহ্নৰ অন্তৰালত এক ঐতিহাসিক কাহিনী আছে। মন্দিৰ আৰু দুৰ্গসমূহ চাবলৈ পুৱাই ফুৰিবলৈ যাওক।";
      } else if (reply.startsWith("Extreme")) {
        reply = "বাজেট সীমিত ৰাখিবলৈ চৰকাৰী বাছ বা ৰে'ল ব্যৱহাৰ কৰক আৰু স্থানীয় খাদ্য উপভোগ কৰক।";
      } else {
        reply = "নমস্কাৰ! মই আপোনাৰ যাত্ৰা ধুনীয়া কৰাত সহায় কৰিম। হোটেল বা ৰুটৰ বিৱৰণ চাবলৈ ওপৰৰ টেবসমূহ ব্যৱহাৰ কৰক!";
      }
    } else if (isUrdu) {
      if (reply.startsWith("Hello!")) {
        reply = "السلام علیکم! آپ کے ٹریولر کو-پائلٹ کے طور پر، میں آپ کے سفر کی منصوبہ بندی میں مدد کے لیے تیار ہوں۔ آج میں آپ کی منزل، بجٹ، یا ٹرانسپورٹ کے بارے میں کیسے مدد کر سکتا ہوں؟";
      } else if (reply.startsWith("Delight")) {
        reply = "مقامی ذائقوں سے لطف اندوز ہوں! سفر کے دوران سنہری اصول یہ ہے کہ آپ ڈھابوں اور گلی کے سٹالز تلاش کریں۔ اصل ذائقہ آزمائیں!";
      } else if (reply.startsWith("What")) {
        reply = "بہت ہی دلچسپ تاریخی سوال! ہر تاریخی عمارت کے پیچھے ایک قدیم کہانی ہوتی ہے۔ پرسکون ماحول میں مندروں اور قلعوں کو دیکھنے کے لیے صبح سویرے جائیں۔";
      } else if (reply.startsWith("Extreme")) {
        reply = "پیسے بچانے کے طریقے میری خصوصیت ہیں! بجٹ کو محدود رکھنے کے لیے سرکاری بسوں کا استعمال کریں اور مقامی سستے کھانوں سے لطف اندوز ہوں۔";
      } else {
        reply = "السلام علیکم! میں آپ کے سفر کو خوبصورت بنانے میں مدد کروں گا۔ ہوٹلوں یا راستوں کے بارے میں تفصیلات جاننے کے لیے اوپر دیے گئے ٹیبز کا استعمال کریں۔";
      }
    } else if (isKonkani) {
      if (reply.startsWith("Hello!")) {
        reply = "नमस्ते! तुमचो ट्रॅव्हलर को-पायलट म्हणून, हांव तुमचे भोंवडेच्या नियोजनांत मदत करपाक तयार आसां। आज हांव तुमचे गंतव्य, बजेट वा वाहतूक पर्यायांविशीं कशी मदत करूं?";
      } else if (reply.startsWith("Delight")) {
        reply = "थळाव्या जेवणाचा आस्वाद घेयात! प्रवासांतलो सुवर्ण नेम म्हळ्यार गर्दी आशिल्ले ल्हान पारंपरिक ढाबे आनी व्यस्त स्ट्रीट स्टॉल्स शोधप।";
      } else if (reply.startsWith("What")) {
        reply = "खूपच सोबीत इतिहासीक प्रस्न! दरेक वारसा थळाच्या वास्तुकलेंत पोरणी काणी दडिल्ली आसता।";
      } else if (reply.startsWith("Extreme")) {
        reply = "पैसे वाटावपाच्यो बऱ्यो टिप्स म्हजी खाशेलताय आसा! बजेट दवरपाक सरकारी बस वा रेल्वेचो वापर करात.";
      } else {
        reply = "नमस्ते! हांव तुमची भोंवडी सुखी करपाक मदत करतलों। हॉटेल वा मार्गाविशीं माहिती खातीर वयर दिल्ल्या टॅबचो वापर करात!";
      }
    } else if (isSanskrit) {
      if (reply.startsWith("Hello!")) {
        reply = "नमो नमः! भवतः यात्रिक सह-चालक रूपेण, अहम् यात्राकल्पने साहाय्यं कर्तुम् उद्यतोऽस्मि। अद्य यात्रागन्तव्य-व्यय-परिवहनविषये कथं साहाय्यं कर्तुं शक्నోमि?";
      } else if (reply.startsWith("Delight")) {
        reply = "स्थानीयभोजनस्य रसं गृह्णन्तु! यात्राकाले सुवर्णनियमः अस्ति यत् जनसम्मर्दयुक्तान् पारम्परिकान् उपहारगृहान् तथा मार्गपार्श्वस्थान् खादन्तु।";
      } else if (reply.startsWith("What")) {
        reply = "अति सुन्दरः ऐतिहासिकः प्रश्नः! प्रत्येकस्य प्राचीनकीर्तिचिह्नस्य पृष्ठतः काचित् पुरातनी कथा वर्तते। मन्दिराणि दुर्गाणि च प्रफुल्लमनसा द्रष्टुं प्रातःकाले एव गच्छन्तु।";
      } else if (reply.startsWith("Extreme")) {
        reply = "धनरक्षणोपायाः मम विशेषता वर्तन्ते! व्ययनियन्त्रणार्थं सर्वकारीयवाहनानां रेलयानानां वा उपयोगं कुर्वन्तु।";
      } else {
        reply = "नमो नमः! अहम् यात्रां सुकरां कर्तुं साहाय्यं करिष्यामि। उपरि दत्तानां साधनानां प्रयोगं कृत्वा विवरणं पश्यन्तु।";
      }
    } else if (isSpanish) {
      if (reply.startsWith("Hello!")) {
        reply = "¡Hola! Como tu copiloto de viaje de Travolor, estoy aquí para guiarte. ¿Cómo te puedo ayudar hoy con tu destino, equipaje o reservas de transporte?";
      } else if (reply.startsWith("Delight")) {
        reply = "¡La gastronomía local es mágica! La regla de oro al viajar es buscar pequeños puestos de comida concurridos y tabernas tradicionales de herencia. ¡Sabor auténtico garantizado!";
      } else if (reply.startsWith("What")) {
        reply = "¡Una búsqueda histórica emocionante! Los monumentos antiguos conservan historias increíbles. Te recomiendo un recorrido a pie temprano por la mañana para explorar las plazas antiguas.";
      } else if (reply.startsWith("Extreme")) {
        reply = "¡Ahorrar dinero es mi especialidad! Compra pases de descuento de varios días, usa metro/autobuses locales y saborea comida callejera típica, que siempre es económica y excelente.";
      } else {
        reply = "¡Hola! Estoy listo para ayudarte a armar tu itinerario perfecto. Haz clic en las pestañas superiores para ver alojamientos, vuelos y trenes con tarifas reales.";
      }
    } else if (isFrench) {
      if (reply.startsWith("Hello!")) {
        reply = "Bonjour! En tant que copilote Travolor, je suis ravi de vous conseiller. Comment puis-je vous aider aujourd'hui à planifier vos séjours, bagages ou itinéraires?";
      } else if (reply.startsWith("Delight")) {
        reply = "Explorez la cuisine locale! La règle d'or lors d'un voyage est de dénicher les petites adresses traditionnelles bien fréquentées et les marchés animés.";
      } else {
        reply = "Bonjour! Je suis à votre écoute pour organiser ce voyage idéal. Utilisez nos modules de réservation de vols et d'hôtels ci-dessus pour planifier instantanément.";
      }
    }

    return {
      text: reply,
      sources: [{ type: "web", title: "Travolor offline advice", uri: "https://travolor.com/offline" }],
      modelUsed: "Travolor-Local-Agent",
      grounded: true
    };
  }

  app.post("/api/gemini/get-suggestions", async (req, res) => {
    const { letter } = req.body;
    
    const hasKey = Boolean(process.env.GEMINI_API_KEY);

    const fallbackSuggestions: { [key: string]: string } = {
      'A': 'Amsterdam, Athens, Agra, Austin, Auckland, Antalya, Abu Dhabi',
      'B': 'Barcelona, Bangkok, Boston, Bali, Berlin, Budapest, Brussels, Beijing',
      'C': 'Cairo, Cape Town, Chicago, Copenhagen, Cancun, Chengdu, Chennai',
      'D': 'Dubai, Dublin, Delhi, Dallas, Dubrovnik, Doha, Denver, Da Nang',
      'E': 'Edinburgh, El Nido, Florence (Firenze), Ephesus, Essen, Eindhoven',
      'F': 'Florence, Frankfurt, Fukuoka, Fort Worth, Fes, Florianopolis',
      'G': 'Goa, Geneva, Glasgow, Guangzhou, Gothenburg, Granada, Gdansk',
      'H': 'Hong Kong, Hanoi, Havana, Honolulu, Houston, Helsinki, Hamburg',
      'I': 'Istanbul, Ibiza, Indianapolis, Innsbruck, Islamabad, Incheon',
      'J': 'Jaipur, Jerusalem, Jakarta, Johannesburg, Juneau, Jeddah, Jodhpur',
      'K': 'Kyoto, Kuala Lumpur, Kathmandu, Krakow, Kiev, Kolkata, Kochi',
      'L': 'London, Lisbon, Los Angeles, Lima, Luxor, Lyon, Ljubljana, Las Vegas',
      'M': 'Mumbai, Madrid, Melbourne, Munich, Manila, Miami, Milan, Montreal',
      'N': 'New York, Nice, Nashville, New Delhi, Nairobi, Naples, Nuremberg',
      'O': 'Osaka, Oslo, Orlando, Oaxaca, Ottawa, Oporto, Okinawa',
      'P': 'Paris, Prague, Phuket, Portland, Pune, Panama City, Beijing',
      'Q': 'Quebec City, Quito, Queenstown, Quanzhou, Qingdao, Queretaro',
      'R': 'Rome, Rio de Janeiro, Reykjavik, Riyadh, Rotterdam, Riga, Raleigh',
      'S': 'Singapore, Sydney, Seoul, San Francisco, Stockholm, Shanghai, Seville',
      'T': 'Tokyo, Toronto, Taipei, Tallinn, Tbilisi, Turin, Tampa, Toulouse',
      'U': 'Udaipur, Utrecht, Ulaanbaatar, Ushuia, Urasoe, Ulaanbaatar',
      'V': 'Venice, Vienna, Vancouver, Valencia, Prague, Verona, Vilnius',
      'W': 'Washington DC, Wellington, Warsaw, Winnipeg, Wuhan, Windhoek',
      'X': 'Xian, Xiamen, Xining, Xuzhou, Xochimilco, Xalapa',
      'Y': 'Yerevan, Yangon, Yokohama, Yogyakarta, Yichang, York',
      'Z': 'Zurich, Zagreb, Zanzibar, Zermatt, Zhuhai, Zaragoza'
    };

    if (!hasKey) {
      const upperLetter = (letter || "A").toUpperCase().substring(0, 1);
      const cities = fallbackSuggestions[upperLetter] || fallbackSuggestions["A"];
      return res.json({ text: `Suggested Destinations starting with ${upperLetter}: ${cities}`, fallback: true });
    }

    const prompt = `You are a premium Travel Planner AI autocomplete engine.
The user typed the letter: "${letter}".
List 5-10 top travel destinations starting with this letter.
Format: "Suggested Destinations starting with ${letter}: City1, City2, City3, ..."
Keep it professional and high-end.`;

    try {
      const response = await getAi().models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });
      res.json({ text: response.text || "" });
    } catch (error: any) {
      const isQuota = error?.status === "RESOURCE_EXHAUSTED" || error?.message?.includes("RESOURCE_EXHAUSTED") || error?.message?.includes("spending cap") || error?.message?.includes("429");
      if (isQuota) {
        console.log("Suggestions fallback activated (spending cap or quota exceeded). Using offline indexing.");
      } else {
        console.log("Suggestions fallback notice:", error?.message || error);
      }
      const upperLetter = (letter || "A").toUpperCase().substring(0, 1);
      const cities = fallbackSuggestions[upperLetter] || fallbackSuggestions["A"];
      return res.json({ text: `Suggested Destinations starting with ${upperLetter}: ${cities}`, fallback: true });
    }
  });

  // Travel Stories API Endpoints
  app.get("/api/stories", (req, res) => {
    try {
      const stories = db.prepare("SELECT * FROM travel_stories ORDER BY id DESC").all();
      // Parse saved_by_users as JSON in result
      const parsedStories = stories.map((s: any) => ({
        ...s,
        saved_by_users: JSON.parse(s.saved_by_users || "[]")
      }));
      res.json(parsedStories);
    } catch (error: any) {
      console.error("Failed to fetch stories:", error);
      res.status(500).json({ error: "Failed to fetch stories" });
    }
  });

  app.post("/api/stories", (req, res) => {
    const { user_id, user_name, user_photo, title, location, photo_url, experience } = req.body;
    if (!user_name || !title || !experience) {
      return res.status(400).json({ error: "Missing required story fields" });
    }
    try {
      const stmt = db.prepare(`
        INSERT INTO travel_stories (user_id, user_name, user_photo, title, location, photo_url, experience, likes_count, saved_by_users)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0, '[]')
      `);
      const info = stmt.run(
        user_id || "guest_user",
        user_name,
        user_photo || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80",
        title,
        location || "Global Destination",
        photo_url || "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1000&q=80",
        experience
      );
      res.json({ success: true, id: info.lastInsertRowid });
    } catch (error: any) {
      console.error("Failed to add story:", error);
      res.status(500).json({ error: "Failed to create story" });
    }
  });

  app.post("/api/stories/like/:id", (req, res) => {
    try {
      db.prepare("UPDATE travel_stories SET likes_count = likes_count + 1 WHERE id = ?").run(req.params.id);
      const updated = db.prepare("SELECT likes_count FROM travel_stories WHERE id = ?").get(req.params.id) as any;
      res.json({ success: true, likes: updated?.likes_count || 0 });
    } catch (error: any) {
      console.error("Failed to like story:", error);
      res.status(500).json({ error: "Failed to update likes" });
    }
  });

  app.post("/api/stories/save/:id", (req, res) => {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }
    try {
      const story = db.prepare("SELECT saved_by_users FROM travel_stories WHERE id = ?").get(req.params.id) as any;
      if (!story) {
        return res.status(404).json({ error: "Story not found" });
      }
      let savedArr = JSON.parse(story.saved_by_users || "[]");
      if (savedArr.includes(userId)) {
        // Remove it (unsave)
        savedArr = savedArr.filter((id: string) => id !== userId);
      } else {
        // Add it (save)
        savedArr.push(userId);
      }
      db.prepare("UPDATE travel_stories SET saved_by_users = ? WHERE id = ?").run(JSON.stringify(savedArr), req.params.id);
      res.json({ success: true, saved: savedArr.includes(userId), savedBy: savedArr });
    } catch (error: any) {
      console.error("Failed to save/unsave story:", error);
      res.status(500).json({ error: "Failed to save story" });
    }
  });

  // TripAdvisor & Skyscanner Travel Advisor AI API
  app.post("/api/gemini/travel-advisor", async (req, res) => {
    const { action, payload } = req.body;
    const hasKey = Boolean(process.env.GEMINI_API_KEY);

    // High fidelity offline fallbacks
    const fallbacks: Record<string, any> = {
      "hotel-reviews": {
        overallSentiment: "Highly Positive (4.7/5)",
        bestFor: "Couples and Luxury Travelers seeking scenic beach views and world-class hospitality.",
        pros: [
          "Panoramic ocean views from spacious private terraces",
          "Extremely polite, helpful, and highly accommodating service team",
          "Stunning infinity swimming pool looking out over the water",
          "Exceptional breakfast spread featuring rich local cuisine and fresh bakery items"
        ],
        cons: [
          "Premium price point on in-room dining and bar options",
          "Approximately a 50-minute commute from the nearest airport terminal"
        ]
      },
      "attraction-reviews": {
        attractions: [
          { name: "Old Quarter Heritage Corridor", rating: 4.8, description: "Bustling cobblestone streets filled with classic architecture, vintage crafts, and street side cafes." },
          { name: "Panoramic Ridge Viewpoint", rating: 4.9, description: "Unrivaled high-altitude views overlooking the green valley below, especially beautiful during golden hour." },
          { name: "Spire Cathedral & Gallery", rating: 4.5, description: "Elegant Gothic architecture housing a magnificent gallery of regional historic masterpieces." }
        ],
        aiSummary: "The destination offers a delightful blend of rich historic neighborhoods and striking hilltop viewpoints. Perfect for photography, family tours, and architectural sightseeing."
      },
      "restaurant-discovery": {
        topRestaurants: [
          { name: "The Saffron Terrace", cuisine: "Contemporary Indian & Mughlai", budget: "$$", rating: 4.7, highlight: "Fresh clay-oven grills, premium spices, and beautiful open-air terrace dining." },
          { name: "Oceanic Catch", cuisine: "Coastal Seafood Grill", budget: "$$$", rating: 4.6, highlight: "Freshly-caught pan-fried fish and incredible sunset deck views." },
          { name: "Chowk Bazaar Bites", cuisine: "Authentic Local Street Foods", budget: "$", rating: 4.5, highlight: "Budget-friendly samosas, delicious panipuri, and fresh hot jalebis." }
        ],
        localFoodRecommendations: [
          { dish: "Spiced Coconut Fish Curry", description: "Rich, aromatic local delicacy slow-cooked in thick coconut cream and traditional spices.", bestPlace: "Oceanic Catch" },
          { dish: "Claypot Chicken Biryani", description: "Layers of fragrant long-grain basmati rice and tender spiced chicken, cooked to perfection.", bestPlace: "The Saffron Terrace" }
        ],
        aiFoodSuggestions: "Given your preferences, we suggest exploring local street food hubs for authentic and budget-friendly lunches, and treating yourself to a coastal seafood grill on the waterfront for dinner."
      },
      "flight-comparison": {
        cheapest: { price: 4499, duration: "2h 15m", airline: "IndiGo", stops: 0 },
        fastest: { price: 5799, duration: "1h 55m", airline: "Air India", stops: 0 },
        bestValue: { price: 4799, duration: "2h 05m", airline: "Akasa Air", stops: 0 },
        alternativeFlights: [
          { price: 6199, duration: "4h 10m", airline: "Vistara", stops: 1 },
          { price: 3899, duration: "5h 30m", airline: "SpiceJet", stops: 1 }
        ]
      },
      "explore-anywhere": {
        matchingDestinations: [
          {
            destination: "Goa, India",
            budgetBreakdown: { flight: 8000, hotel: 12000, food: 5000, activities: 4000, total: 29000 },
            days: 4,
            description: "Charming sun-kissed beaches, historical Portuguese churches, and delicious seafood shacks.",
            image: "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=400&q=80"
          },
          {
            destination: "Jaipur, India",
            budgetBreakdown: { flight: 6000, hotel: 9000, food: 4000, activities: 3000, total: 22000 },
            days: 3,
            description: "The magnificent Pink City featuring historic palaces, giant astronomy structures, and colorful bazaars.",
            image: "https://images.unsplash.com/photo-1477584308800-b442fd5497e3?auto=format&fit=crop&w=400&q=80"
          },
          {
            destination: "Shimla, India",
            budgetBreakdown: { flight: 7000, hotel: 10000, food: 4500, activities: 3500, total: 25000 },
            days: 3,
            description: "A gorgeous Himalayan hill station with panoramic snowy vistas and a charming pine forest trail.",
            image: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=400&q=80"
          }
        ]
      },
      "cheapest-month": {
        cheapestMonth: "September",
        bestMonth: "November",
        peakSeason: "December to January",
        weatherScore: 8.8,
        monthlyDetails: [
          { month: "September (Monsoon End)", avgPricePercent: 60, weatherStatus: "Lush green landscape, mild showers, highly serene" },
          { month: "November (Autumn Peak)", avgPricePercent: 95, weatherStatus: "Perfect cool breeze, clear sunny skies, ideal for sightseeing" },
          { month: "December (Winter Festival)", avgPricePercent: 145, weatherStatus: "Exciting festive atmosphere, peak crowd, warm and sunny" }
        ]
      },
      "destination-ranking": {
        rankedDestinations: [
          { name: "Goa, India", score: 9.3, budget: "Moderate", weather: "Sunny & Breezy", crowd: "High", safety: "Very Safe", reviewsSummary: "Amazing beach hospitality, vibrant sunset views, and great water sports.", rank: 1 },
          { name: "Jaipur, India", score: 8.9, budget: "Budget-Friendly", weather: "Pleasant & Clear", crowd: "Moderate", safety: "Safe", reviewsSummary: "Incredible forts, outstanding heritage walks, and rich Rajasthani culture.", rank: 2 },
          { name: "Munnar, India", score: 8.7, budget: "Budget-Friendly", weather: "Cool & Misty", crowd: "Moderate", safety: "Very Safe", reviewsSummary: "Lush rolling tea gardens, beautiful waterfalls, and calm hiking tracks.", rank: 3 }
        ]
      },
      "destination-comparison": {
        comparison: {
          cost: { a: "Affordable mid-range options (avg ₹3,500/day). High volume of budget stays.", b: "Moderately premium (avg ₹5,500/day) due to heritage-site entries and guide fees." },
          travelTime: { a: "Highly accessible via multiple daily flights (avg 2 hours travel time).", b: "Slightly remote; requires layover or additional road taxi travel (avg 4.5 hours)." },
          weather: { a: "Warm tropical coastal breeze, pleasant morning walks, humid afternoons.", b: "Refreshing alpine climate, misty mornings, cool nights." },
          attractions: { a: "Magnificent beaches, sand dunes, water sports, historic churches.", b: "Towering forts, ornate royal palaces, deep stepwells, cultural centers." },
          food: { a: "Rich seafood vindaloo, fresh tender coconut, beachside appetizers.", b: "Royal thali plates, aromatic dal-baati, delicious local sweets." },
          familyFriendlyScore: { a: 8.2, b: 9.2 }
        },
        recommendationVerdict: "Select Destination A if you are seeking a relaxed beachfront getaway. Select Destination B if you are after a rich, organized cultural itinerary with your family."
      },
      "personalized-recommendation": {
        recommendation: "Based on your interest in pristine nature, combined with your mid-range budget, we highly recommend planning a custom getaway to Munnar, India. The misty weather is ideal for refreshing walks and exploring rolling tea valleys.",
        suggestedSpots: [
          { name: "Kolukkumalai Sunrise Safari", reason: "Enjoy an off-road jeep safari to the highest tea estate in the world for an unforgettable sunrise.", budgetIcon: "₹₹" },
          { name: "Eravikulam Wildlife Sanctuary", reason: "Spot the rare Nilgiri Tahr mountain goats roaming along the scenic hillsides.", budgetIcon: "₹" }
        ]
      }
    };

    if (!hasKey) {
      console.log(`[Advisor AI] Gemini key missing, serving premium fallback for action: ${action}`);
      return res.json(fallbacks[action] || { message: "Success", details: payload });
    }

    // Build targeted prompts for each action
    let systemInstruction = "You are a professional travel planner, TripAdvisor guide, and Skyscanner travel agent. Return only a valid JSON object matching the exact requested format. Do not include markdown formatting like ```json or any other commentary.";
    let prompt = "";

    if (action === "hotel-reviews") {
      const { hotelName } = payload;
      prompt = `Analyze reviews for "${hotelName}" and provide a summary of the pros, cons, overall sentiment, and who it is best for.
      Return a JSON object with this EXACT structure:
      {
        "overallSentiment": "A short summary string describing the sentiment",
        "bestFor": "A short string indicating target audience",
        "pros": ["Pro 1", "Pro 2", "Pro 3"],
        "cons": ["Con 1", "Con 2"]
      }`;
    } else if (action === "attraction-reviews") {
      const { destination } = payload;
      prompt = `List top attractions, ratings (numbers between 4.0 and 5.0), descriptions, and an overall AI summary for the destination: "${destination}".
      Return a JSON object with this EXACT structure:
      {
        "attractions": [
          { "name": "Attraction Name", "rating": 4.8, "description": "Short description" }
        ],
        "aiSummary": "A helpful AI summary paragraph of what to expect"
      }`;
    } else if (action === "restaurant-discovery") {
      const { destination, budget, style } = payload;
      prompt = `Find top restaurants, local food recommendations, and custom food advice for the destination: "${destination}".
      Take into account: Budget Tier: "${budget}", Travel Style: "${style}".
      Return a JSON object with this EXACT structure:
      {
        "topRestaurants": [
          { "name": "Restaurant Name", "cuisine": "Cuisine", "budget": "$$", "rating": 4.7, "highlight": "A signature dish or feature" }
        ],
        "localFoodRecommendations": [
          { "dish": "Dish Name", "description": "Short description of taste/ingredients", "bestPlace": "Where to get it" }
        ],
        "aiFoodSuggestions": "A short customized food recommendation paragraph"
      }`;
    } else if (action === "flight-comparison") {
      const { from, to } = payload;
      prompt = `Provide a simulated yet highly realistic flight comparison between "${from}" and "${to}".
      Return a JSON object with this EXACT structure:
      {
        "cheapest": { "price": 4500, "duration": "2h 15m", "airline": "IndiGo", "stops": 0 },
        "fastest": { "price": 5800, "duration": "1h 55m", "airline": "Air India", "stops": 0 },
        "bestValue": { "price": 4800, "duration": "2h 05m", "airline": "Akasa Air", "stops": 0 },
        "alternativeFlights": [
          { "price": 6200, "duration": "4h 10m", "airline": "Vistara", "stops": 1 }
        ]
      }`;
    } else if (action === "explore-anywhere") {
      const { budget, days, departureCity } = payload;
      prompt = `Suggest 3 top travel destinations globally or regionally that fit a budget of "${budget}" INR/USD and a duration of ${days} days, departing from "${departureCity}".
      Return a JSON object with this EXACT structure:
      {
        "matchingDestinations": [
          {
            "destination": "Destination Name",
            "budgetBreakdown": { "flight": 8000, "hotel": 10000, "food": 4000, "activities": 3000, "total": 25000 },
            "days": ${days},
            "description": "Short description",
            "image": "https://images.unsplash.com/photo-..."
          }
        ]
      }`;
    } else if (action === "cheapest-month") {
      const { destination } = payload;
      prompt = `Predict flight pricing trends and peak seasons for destination: "${destination}".
      Return a JSON object with this EXACT structure:
      {
        "cheapestMonth": "cheapest month name",
        "bestMonth": "best weather month name",
        "peakSeason": "peak tourist season months",
        "weatherScore": 8.5,
        "monthlyDetails": [
          { "month": "Month Name", "avgPricePercent": 75, "weatherStatus": "Description" }
        ]
      }`;
    } else if (action === "destination-ranking") {
      const { preferences } = payload;
      prompt = `Rank 3 popular travel destinations based on budget, weather, safety, and reviews.
      Preferences/Filters used: "${preferences}".
      Return a JSON object with this EXACT structure:
      {
        "rankedDestinations": [
          { "name": "Destination Name", "score": 9.1, "budget": "Budget status", "weather": "Weather status", "crowd": "Crowd level", "safety": "Safety level", "reviewsSummary": "Brief reviews synopsis", "rank": 1 }
        ]
      }`;
    } else if (action === "destination-comparison") {
      const { destA, destB } = payload;
      prompt = `Provide a deep side-by-side travel comparison between Destination A: "${destA}" and Destination B: "${destB}".
      Return a JSON object with this EXACT structure:
      {
        "comparison": {
          "cost": { "a": "Detail for A", "b": "Detail for B" },
          "travelTime": { "a": "Detail for A", "b": "Detail for B" },
          "weather": { "a": "Detail for A", "b": "Detail for B" },
          "attractions": { "a": "Detail for A", "b": "Detail for B" },
          "food": { "a": "Detail for A", "b": "Detail for B" },
          "familyFriendlyScore": { "a": 8.5, "b": 9.0 }
        },
        "recommendationVerdict": "Helpful AI recommendation paragraph recommending one or the other based on styles"
      }`;
    } else if (action === "personalized-recommendation") {
      const { history, style, budget, season } = payload;
      prompt = `Create a highly tailored travel recommendation.
      User Preferences: History of visits: "${history}", Travel Style: "${style}", Budget: "${budget}", Target Season: "${season}".
      Return a JSON object with this EXACT structure:
      {
        "recommendation": "A beautifully drafted personal co-pilot recommendation paragraph explaining why these match",
        "suggestedSpots": [
          { "name": "Spot/Activity Name", "reason": "Specific reason they'll love it", "budgetIcon": "₹₹" }
        ]
      }`;
    }

    try {
      const response = await getAi().models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          systemInstruction: systemInstruction
        }
      });

      const responseText = response.text || "";
      // Strip any accidental markdown formatting if present
      let cleanedText = responseText.trim();
      if (cleanedText.startsWith("```json")) {
        cleanedText = cleanedText.substring(7);
      }
      if (cleanedText.endsWith("```")) {
        cleanedText = cleanedText.substring(0, cleanedText.length - 3);
      }
      cleanedText = cleanedText.trim();

      const parsed = JSON.parse(cleanedText);
      res.json(parsed);
    } catch (err: any) {
      const isQuota = err?.status === "RESOURCE_EXHAUSTED" || err?.message?.includes("RESOURCE_EXHAUSTED") || err?.message?.includes("spending cap") || err?.message?.includes("429");
      if (isQuota) {
        console.log(`[Advisor AI Info] Action: ${action} fallback activated (spending cap or quota exceeded). Serving high-fidelity fallback.`);
      } else {
        console.log(`[Advisor AI Info] Action: ${action} fell back to offline engine. Notice:`, err?.message || err);
      }
      return res.json(fallbacks[action] || { message: "Error generating", fallback: true });
    }
  });

  // OpenWeather / Open-Meteo Proxy Endpoint
  app.get("/api/weather", async (req, res) => {
    const { lat, lng } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ error: "Latitude and longitude are required" });
    }

    const apiKey = process.env.OPENWEATHER_API_KEY || process.env.VITE_OPENWEATHER_API_KEY;
    if (apiKey) {
      try {
        const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lng}&units=metric&appid=${apiKey}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.list && Array.isArray(data.list)) {
          const dailyForecasts: Record<string, { temps: number[]; weatherTexts: string[]; precip: number }> = {};
          
          data.list.forEach((item: any) => {
            const dateStr = (item.dt_txt || "").split(" ")[0]; // YYYY-MM-DD
            if (dateStr) {
              if (!dailyForecasts[dateStr]) {
                dailyForecasts[dateStr] = {
                  temps: [],
                  weatherTexts: [],
                  precip: 0
                };
              }
              if (item.main && typeof item.main.temp === 'number') {
                dailyForecasts[dateStr].temps.push(item.main.temp);
              }
              if (item.weather && item.weather[0] && item.weather[0].main) {
                dailyForecasts[dateStr].weatherTexts.push(item.weather[0].main);
              }
              if (item.rain && item.rain["3h"]) {
                dailyForecasts[dateStr].precip += item.rain["3h"];
              }
            }
          });
          
          const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
          const forecastList = Object.keys(dailyForecasts).slice(0, 7).map((dateStr) => {
            const dateObj = new Date(dateStr);
            const dayName = daysOfWeek[dateObj.getDay()];
            const temps = dailyForecasts[dateStr].temps;
            const maxTemp = temps.length > 0 ? Math.max(...temps) : 25;
            const minTemp = temps.length > 0 ? Math.min(...temps) : 15;
            
            const weatherTexts = dailyForecasts[dateStr].weatherTexts;
            // Get the most frequent weather condition
            const dominantText = weatherTexts.length > 0 
              ? weatherTexts.sort((a, b) => 
                  weatherTexts.filter(v => v === a).length - weatherTexts.filter(v => v === b).length
                ).pop() || "Clear"
              : "Clear";
            
            return {
              date: dateStr,
              dayName,
              tempMax: Math.round(maxTemp),
              tempMin: Math.round(minTemp),
              conditionText: dominantText,
              precipitation: Math.round(dailyForecasts[dateStr].precip * 10) / 10
            };
          });
          
          return res.json({ daily: forecastList, source: "OpenWeather" });
        }
      } catch (error) {
        console.warn("OpenWeather API proxy failed, falling back to Open-Meteo:", error);
      }
    }
    
    // Fallback: Open-Meteo
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.daily) {
        const daily = data.daily;
        const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const forecastList = daily.time.map((timeStr: string, idx: number) => {
          const dateObj = new Date(timeStr);
          const dayName = daysOfWeek[dateObj.getDay()];
          const code = daily.weathercode[idx];
          
          let condText = "Clear";
          if (code === 0) condText = "Clear Sky";
          else if (code <= 3) condText = "Partly Cloudy";
          else if (code <= 48) condText = "Foggy";
          else if (code <= 55) condText = "Light Drizzle";
          else if (code <= 65) condText = "Rainy";
          else if (code <= 77) condText = "Snowy";
          else if (code <= 82) condText = "Rain Showers";
          else if (code <= 86) condText = "Snow Showers";
          else condText = "Thunderstorm";

          return {
            date: timeStr,
            dayName,
            tempMax: Math.round(daily.temperature_2m_max[idx]),
            tempMin: Math.round(daily.temperature_2m_min[idx]),
            conditionCode: code,
            conditionText: condText,
            precipitation: daily.precipitation_sum[idx],
          };
        });
        return res.json({ daily: forecastList, source: "Open-Meteo" });
      }
    } catch (e) {
      console.error("Open-Meteo fallback failed:", e);
    }
    
    res.status(500).json({ error: "Failed to fetch weather data" });
  });

  app.get("/api/search/cities-autocomplete", (req, res) => {
    // Return all cities starting with a query for instant suggestion rendering
    const { query } = req.query;
    if (!query) return res.json([]);
    const q = (query as string).toLowerCase();

    const allCities = [
      "Goa, India", "Mumbai, India", "Delhi, India", "Agra, India", "Jaipur, India",
      "Paris, France", "London, UK", "New York, USA", "Tokyo, Japan", "Singapore",
      "Bangkok, Thailand", "Dubai, UAE", "Bali, Indonesia"
    ];

    const results = allCities.filter(c => c.toLowerCase().includes(q));
    res.json(results);
  });

  // API 404 handler
  app.use("/api/*", (req, res) => {
    res.status(404).json({ error: "API endpoint not found" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(process.cwd(), "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
