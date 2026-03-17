import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database("travel_app.db");

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
