# Shubham Automation | Smart Water Pump Controllers

A high-performance, secure, responsive single-page web application designed for **100% free static hosting on GitHub Pages** with zero backend infrastructure needed.

---

## 🚀 Key Improvements Made

### 1. Efficiency & Performance
- **Client-Side Image Compression**: When uploading product photos (often 5–10 MB from smartphones), an offscreen HTML5 `<canvas>` automatically resizes and compresses them to `< 80 KB` JPEG format. This completely avoids browser `QuotaExceededError` crashes and keeps `localStorage` usage tiny.
- **Instant Global CDN Delivery**: 100% pure vanilla JavaScript and modular CSS. Zero dependencies, no heavy Node modules or build steps.
- **Hash-Based Client Router**: Supports `#home`, `#products`, `#seller-login`, and `#dashboard` with full browser history support (Back/Forward buttons work seamlessly without page reloads).
- **Search & Filter**: Real-time client-side search across all product names, descriptions, and specifications.

### 2. Enhanced Security
- **Salted SHA-256 Web Crypto Authentication**: Removed hardcoded plaintext passwords (`admin` / `admin123`). Passwords are now verified using browser-native `crypto.subtle.digest("SHA-256")` with cryptographic salts.
- **Persistent Brute-Force Rate Limiting**: After 5 failed attempts, login is locked out for 5 minutes with a live countdown timer. The lockout is persisted with timestamps, preventing circumvention via browser refreshes.
- **Password Management**: Sellers can update their password directly from the Dashboard Settings. New cryptographically secure salts (`crypto.getRandomValues`) are generated automatically.
- **Strict Context-Aware XSS Defense**: All user-generated strings, customer notes, product names, and URLs are sanitized and escaped before DOM insertion.

### 3. Solved for GitHub Pages Hosting (Order Delivery)
On a purely static site, `localStorage` is saved only on the *buyer's* device. To solve this limitation cleanly without requiring a paid server:
- **Instant WhatsApp Booking**: When a customer clicks "Confirm & Send on WhatsApp", a pre-formatted message with their Order ID, Customer Name, Mobile Number, Delivery Address, Pincode, and Installation Choice is automatically generated and opens directly in chat with the seller's WhatsApp number.
- **Optional Webhook / Email Forwarding**: In **Seller Settings**, the owner can configure a free webhook URL (e.g., [Formspree](https://formspree.io/), [Web3Forms](https://web3forms.com/), or Google Apps Script) to receive customer bookings via email.
- **CSV / Excel Order Export**: Sellers can download their entire order log as an Excel-compatible `.csv` file with one click.
- **Full JSON Backup & Restore**: Migrate products, orders, and business settings between devices at any time.

---

## 🌐 How to Host on GitHub Pages (Step-by-Step)

### Option A: Using Git CLI (Recommended)

1. Open PowerShell or Terminal in this project folder:
   ```bash
   cd C:\Users\nikhi\.gemini\antigravity\scratch\aquacontrol
   ```
2. Initialize git and commit:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of Shubham Automation store"
   ```
3. Create a new repository on [GitHub](https://github.com/new) (e.g., `aquacontrol`).
4. Link and push to GitHub:
   ```bash
   git branch -M main
   git remote add origin https://github.com/<YOUR_USERNAME>/aquacontrol.git
   git push -u origin main
   ```
5. Go to your repository on GitHub:
   - Click **Settings** ⚙️
   - In the left sidebar, click **Pages**
   - Under **Build and deployment > Source**, choose **Deploy from a branch**
   - Select Branch: `main` and Folder: `/ (root)`
   - Click **Save**

Within 60 seconds, your site will be live at:
```
https://<YOUR_USERNAME>.github.io/aquacontrol/
```

---

### Option B: Upload via GitHub Website (No Git Required)

1. Create a new public repository on [GitHub](https://github.com/new).
2. Click **Uploading an existing file**.
3. Drag and drop all files from this folder (`index.html`, `style.css`, `app.js`, `.nojekyll`, `README.md`).
4. Click **Commit changes**.
5. Go to **Settings > Pages > Branch: main / (root) > Save**.

---

## 🔑 Initial Seller Credentials

- **Username**: `admin`
- **Default Password**: `admin123`

> **Tip**: After logging into the dashboard for the first time, go to the **Settings & Backup** tab to update your business name, contact phone, WhatsApp number, and set a new personal password.

---

## 📁 Project Structure

```
aquacontrol/
├── index.html        # Semantic, accessible HTML5 single-page application
├── style.css         # Modern responsive CSS (mobile-first, print stylesheet)
├── app.js            # Web Crypto auth, canvas compression, WhatsApp generator, router
├── .nojekyll         # Disables Jekyll processing on GitHub Pages
└── README.md         # Deployment & configuration documentation
```
