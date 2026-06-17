import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database("travel_app.db");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

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
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

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
    const apiKey = process.env.VITE_GOOGLE_MAPS_API_KEY;

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
    const apiKey = process.env.VITE_GOOGLE_MAPS_API_KEY;
    
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
    const apiKey = process.env.VITE_GOOGLE_MAPS_API_KEY;
    
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
    const apiKey = process.env.VITE_GOOGLE_MAPS_API_KEY;
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
    const apiKey = process.env.VITE_GOOGLE_MAPS_API_KEY;
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

  // Gemini API Routes
  app.post("/api/gemini/generate-itinerary", async (req, res) => {
    const { startLocation, location, duration, travelStyle, numPeople, language = "en", enableThinking, useSearch } = req.body;
    
    if (!process.env.GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY missing on server");
      return res.status(500).json({ error: "GEMINI_API_KEY is not defined on the server." });
    }

    const prompt = `You are an expert AI Travel Planner for "Travolor". Your goal is to generate highly practical, exciting, and easy-to-read travel itineraries based on the user's input.

Do not use JSON. Output the response in beautifully formatted Markdown (plain text) using headings, bullet points, and bold text.

User Request Details:
- Starting Location: ${startLocation}
- Destination: ${location}
- Duration: ${duration} Days
- Travel Style / Budget Category: ${travelStyle} (e.g. Budget, Moderate, Luxury)
- Number of Travelers: ${numPeople}
- Language Preference: Please write the entire response and itinerary ONLY in the ${language} language. Write all headings, descriptions, tip titles, and day names in ${language}.

Follow this exact structure for every response:

🌍 [Destination Name] Travel Itinerary
⏱️ Duration: [Number of days]
💰 Budget Category: [Budget/Moderate/Luxury] | Approx Cost: [Amount in INR]

🗓️ Day-by-Day Plan:

Day 1: [Theme/Title of the Day]

Morning: [Activity name and short description] - [Approx Cost]

Afternoon: [Activity name and short description] - [Approx Cost]

Evening: [Activity name and short description] - [Approx Cost]

🚕 Transport Tip: [How to get around for the day]

(Repeat the above structure for all ${duration} days. Do not skip any day.)

💡 Travolor Pro-Tips for [Destination]:

[Important travel tip 1]

[Important travel tip 2]

[Local food recommendation]

Rules:
1. Replace all bracketed items (like [Destination Name], [Amount in INR], [Activity name and short description]) with real, actual details for the requested trip. Do not keep the brackets in the final output.
2. Be direct, enthusiastic, and provide practical advice.
3. Do NOT add ANY conversational filler or introduction/conclusion commentary before or after the itinerary. Start immediately with "🌍 [Destination Name] Travel Itinerary" and end exactly after the local food recommendation.
4. Calculate approx costs in Indian Rupees (INR).`;

    // Configure model selection based on thinking/grounding requested
    const useHighThinking = enableThinking === true || travelStyle === "luxury";
    const model = useHighThinking ? "gemini-3.1-pro-preview" : "gemini-3.5-flash";
    
    // Configure tools: If search grounding is requested, or if standard-flash is utilized to ensure fresh sources
    const tools: any[] = [];
    if (useSearch === true || !useHighThinking) {
      tools.push({ googleSearch: {} });
    }

    const config: any = {};
    if (tools.length > 0) {
      config.tools = tools;
    }
    if (useHighThinking) {
      config.thinkingConfig = { thinkingLevel: ThinkingLevel.HIGH };
    }

    try {
      const response = await ai.models.generateContent({
        model: model,
        contents: prompt,
        config: config
      });

      // Extract search grounding metadata sources
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      const sources = groundingChunks?.map((chunk: any) => {
        if (chunk.web) {
          return { title: chunk.web.title, uri: chunk.web.uri };
        }
        return null;
      }).filter(Boolean) || [];

      res.json({ 
        text: response.text || "Sorry, I couldn't generate the plan.",
        sources: sources,
        modelUsed: model,
        grounded: sources.length > 0
      });
    } catch (error: any) {
      console.error("Server error generating itinerary:", error);
      res.status(500).json({ error: error.message || "Failed to generate itinerary" });
    }
  });

  // Multi-Turn Chatbot with Grounding and Mode configuration
  app.post("/api/gemini/chat", async (req, res) => {
    const { messages, userLocation, mode = "general", botRole = "copilot", language = "English" } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY missing on server");
      return res.status(500).json({ error: "GEMINI_API_KEY is not defined on the server." });
    }

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "messages array is required." });
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
    let systemInstruction = "You are Travolor Travel Co-pilot, a friendly, ultra-knowledgeable, and professional travel assistant. Help the user plan journeys, suggest restaurants, advise on budgets, and provide local tips.";
    if (botRole === "foodie") {
      systemInstruction = "You are the Travolor Culinary Specialist. Your goal is to guide users to the finest local cuisines, street food, hidden restaurants, historical eateries, and dining tips for any city in the world.";
    } else if (botRole === "historian") {
      systemInstruction = "You are the Travolor Historical Guide. Share ancient tales, architectural secrets, monument histories, and cultural significance behind popular landmarks and cities the user asks about.";
    } else if (botRole === "budget") {
      systemInstruction = "You are the Travolor Budget Hack Advisor. Provide extreme money-saving tips, affordable transport alternatives, free attractions, cheap eats, and savvy itinerary optimizations.";
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
      const chat = ai.chats.create({
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
      console.error("Chatbot generation error:", error);
      res.status(500).json({ error: error.message || "Failed to communicate with Travolor Assistant" });
    }
  });

  app.post("/api/gemini/get-suggestions", async (req, res) => {
    const { letter } = req.body;
    
    if (!process.env.GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY missing on server");
      return res.status(500).json({ error: "GEMINI_API_KEY is not defined on the server." });
    }

    const prompt = `You are a premium Travel Planner AI autocomplete engine.
The user typed the letter: "${letter}".
List 5-10 top travel destinations starting with this letter.
Format: "Suggested Destinations starting with ${letter}: City1, City2, City3, ..."
Keep it professional and high-end.`;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });
      res.json({ text: response.text || "" });
    } catch (error: any) {
      console.error("Server error getting suggestions:", error);
      res.status(500).json({ error: error.message || "Failed to get suggestions" });
    }
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
