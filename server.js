require("dotenv").config();
const express = require("express");
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1h";

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error("Set JWT_SECRET in .env (at least 32 characters). See README.");
  process.exit(1);
}

app.use(express.json({ limit: "10kb" }));
app.use(express.static(path.join(__dirname, "public")));

const dataDir = path.join(__dirname, "data");
const usersFile = path.join(dataDir, "users.json");
fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(usersFile)) fs.writeFileSync(usersFile, "[]", "utf8");

function readUsers() {
  try { return JSON.parse(fs.readFileSync(usersFile, "utf8")); }
  catch { return []; }
}
function writeUsers(users) {
  fs.writeFileSync(usersFile, JSON.stringify(users, null, 2), "utf8");
}
function safeUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}
function createToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN, issuer: "student-portal", audience: "student-portal-users" }
  );
}

// Token verification middleware: verifies signature, expiry, issuer and audience.
function authenticateToken(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ message: "Access token required. Please log in." });
  }
  try {
    req.auth = jwt.verify(token, JWT_SECRET, {
      issuer: "student-portal",
      audience: "student-portal-users"
    });
    next();
  } catch (err) {
    return res.status(401).json({
      message: err.name === "TokenExpiredError" ? "Token expired. Please log in again." : "Invalid token."
    });
  }
}

// Authorization middleware: authentication asks "who are you?";
// authorization asks "are you allowed to do this?"
function allowRoles(...roles) {
  return (req, res, next) => {
    if (!req.auth || !roles.includes(req.auth.role)) {
      return res.status(403).json({ message: "Forbidden: insufficient permissions." });
    }
    next();
  };
}

app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required." });
    }
    if (String(name).trim().length < 2 || String(name).length > 80) {
      return res.status(400).json({ message: "Name must be between 2 and 80 characters." });
    }
    const normalizedEmail = String(email).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({ message: "Enter a valid email address." });
    }
    if (typeof password !== "string" || password.length < 8 || password.length > 72) {
      return res.status(400).json({ message: "Password must be 8–72 characters." });
    }

    const users = readUsers();
    if (users.some(u => u.email === normalizedEmail)) {
      return res.status(409).json({ message: "An account with this email already exists." });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = {
      id: require("crypto").randomUUID(),
      name: String(name).trim(),
      email: normalizedEmail,
      passwordHash,
      role: "student", // Never accept role from public registration input.
      createdAt: new Date().toISOString()
    };
    users.push(user);
    writeUsers(users);
    const token = createToken(user);
    res.status(201).json({ message: "Registration successful.", token, user: safeUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error." });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ message: "Email and password are required." });

    const user = readUsers().find(u => u.email === String(email).trim().toLowerCase());
    // Same response for unknown email and wrong password avoids account enumeration.
    if (!user || !(await bcrypt.compare(String(password), user.passwordHash))) {
      return res.status(401).json({ message: "Invalid email or password." });
    }
    res.json({ message: "Login successful.", token: createToken(user), user: safeUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error." });
  }
});

app.get("/api/auth/me", authenticateToken, (req, res) => {
  const user = readUsers().find(u => u.id === req.auth.sub);
  if (!user) return res.status(401).json({ message: "Account no longer exists." });
  res.json({ user: safeUser(user) });
});

app.get("/api/courses", authenticateToken, (req, res) => {
  res.json({
    message: "Authenticated users can access course materials.",
    courses: [
      { id: "CS101", title: "Introduction to Programming", material: "Week 1: Variables, data types and control flow." },
      { id: "CS205", title: "Web Development", material: "Week 1: HTML, CSS and client-server basics." }
    ]
  });
});

app.get("/api/records", authenticateToken, (req, res) => {
  // Demo data. In production, fetch only records belonging to req.auth.sub.
  res.json({
    message: "Academic records (demo).",
    records: [
      { semester: "Semester 1", subject: "Programming Fundamentals", grade: "A" },
      { semester: "Semester 1", subject: "Mathematics", grade: "B+" }
    ]
  });
});

// Example admin-only endpoint to demonstrate role-based authorization.
app.get("/api/admin", authenticateToken, allowRoles("admin"), (req, res) => {
  res.json({ message: "Welcome, administrator. You passed role authorization." });
});

app.get("*", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

app.listen(PORT, () => console.log(`Student Portal running at http://localhost:${PORT}`));