/**
 * SHUBHAM AUTOMATION | SMART WATER PUMP CONTROLLERS
 * High-performance, secure, GitHub Pages static hosting architecture.
 */

(function () {
    "use strict";

    /* ================= DEFAULT DATA ================= */
    const DEFAULT_PRODUCTS = [
        {
            id: "P001",
            name: "Smart Pump Controller Pro",
            price: 2499,
            description: "Fully automatic controller for overhead tank filling with auto cut-off when tank is full.",
            specs: "Automatic ON/OFF • High/Low Voltage Cutoff • Compatible with Monoblock & Jet pumps up to 1.5 HP",
            image: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=75",
            animation: ""
        },
        {
            id: "P002",
            name: "Automatic Overhead & Sump Controller",
            price: 2999,
            description: "Dual-tank automation. Manages water between underground sump and overhead tank seamlessly.",
            specs: "Dual Tank Sensors • Sump Dry-Run Protection • LED Water Level Status Indicators",
            image: "https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=600&q=75",
            animation: ""
        },
        {
            id: "P003",
            name: "Submersible Borewell Motor Protector",
            price: 3499,
            description: "Heavy-duty pump protector designed specifically for agricultural & residential deep borewells.",
            specs: "Dry-run protection • Auto timer restart • Phase failure & phase reversal guard",
            image: "https://images.unsplash.com/photo-1581092795360-fd1ca04f0952?auto=format&fit=crop&w=600&q=75",
            animation: ""
        },
        {
            id: "P004",
            name: "Complete Smart Home Automation Kit",
            price: 4999,
            description: "Premium all-in-one automation package including industrial stainless sensors and doorstep setup.",
            specs: "Complete Kit • SS304 Sensors included • Manual Override Switch • 1-Year Full Replacement Warranty",
            image: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=600&q=75",
            animation: ""
        }
    ];

    const DEFAULT_SETTINGS = {
        businessName: "Shubham Automation",
        phone: "+91 98765 43210",
        whatsapp: "919876543210",
        email: "contact@shubhamautomation.in",
        webhook: ""
    };

    // Default credential hash: SHA-256("aqua_v1_" + "admin123")
    const DEFAULT_AUTH = {
        username: "admin",
        salt: "aqua_v1_",
        hash: "eb9140c3da0cbed07ecd9822608f2cb59513481201bd0b216617aef9db2526d3"
    };

    const MAX_LOGIN_ATTEMPTS = 5;
    const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes

    /* ================= STATE ================= */
    let currentFilterStatus = "ALL";
    let catalogSearchQuery = "";
    let lockoutInterval = null;

    /* ================= CRYPTO & SECURITY UTILITIES ================= */

    /**
     * Compute SHA-256 hash using the native Web Crypto API.
     */
    async function sha256Hex(salt, text) {
        const encoder = new TextEncoder();
        const data = encoder.encode(salt + text);
        const hashBuffer = await crypto.subtle.digest("SHA-256", data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
    }

    /**
     * Generate cryptographically secure random hex string.
     */
    function generateRandomSalt(length = 16) {
        const arr = new Uint8Array(length);
        crypto.getRandomValues(arr);
        return Array.from(arr).map(b => b.toString(16).padStart(2, "0")).join("");
    }

    /**
     * Strict HTML escaping to prevent XSS.
     */
    function escapeHTML(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function escapeAttribute(value) {
        return escapeHTML(value);
    }

    /**
     * URL sanitizer ensuring only safe protocols are rendered.
     */
    function sanitizeURL(url) {
        if (!url) return "";
        const trimmed = String(url).trim();
        // Allow safe http, https, or standard base64 images
        if (/^https?:\/\//i.test(trimmed)) {
            return escapeAttribute(trimmed);
        }
        if (/^data:image\/(png|jpeg|jpg|webp|gif|svg\+xml);base64,[A-Za-z0-9+/=]+$/i.test(trimmed)) {
            return trimmed;
        }
        return "";
    }

    /* ================= STORAGE UTILITIES ================= */

    function getStorage(key, fallback) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : fallback;
        } catch (e) {
            console.warn("Storage read error:", e);
            return fallback;
        }
    }

    function setStorage(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            if (e.name === "QuotaExceededError" || e.code === 22) {
                showToast("Storage quota exceeded! Please remove some large images or clear old orders.", "error");
            } else {
                showToast("Could not save data locally.", "error");
            }
            console.error("Storage write error:", e);
            return false;
        }
    }

    function getProducts() {
        return getStorage("aqua_products", DEFAULT_PRODUCTS);
    }

    function saveProducts(products) {
        const success = setStorage("aqua_products", products);
        if (success) {
            updateDashboardStats();
            renderSellerProducts();
            renderConsumerProducts();
            renderHomeProducts();
        }
        return success;
    }

    function getOrders() {
        return getStorage("aqua_orders", []);
    }

    function saveOrders(orders) {
        const success = setStorage("aqua_orders", orders);
        if (success) {
            updateDashboardStats();
            renderSellerOrders();
        }
        return success;
    }

    function getSettings() {
        return Object.assign({}, DEFAULT_SETTINGS, getStorage("aqua_settings", {}));
    }

    function saveSettings(settings) {
        const success = setStorage("aqua_settings", settings);
        if (success) {
            applySettingsToUI();
            showToast("Business settings saved successfully.", "success");
        }
        return success;
    }

    function getAuth() {
        return Object.assign({}, DEFAULT_AUTH, getStorage("aqua_auth", {}));
    }

    function saveAuth(auth) {
        return setStorage("aqua_auth", auth);
    }

    /* ================= IMAGE COMPRESSION (Prevents 5MB Quota Crash) ================= */

    /**
     * Resizes and compresses an image in browser using an HTML5 Canvas.
     * Shrinks 5-10MB mobile camera photos to ~50-80KB JPEG.
     */
    function compressImage(file, maxWidth = 800, maxHeight = 800, quality = 0.75) {
        return new Promise((resolve, reject) => {
            if (!file || !file.type.startsWith("image/")) {
                return reject(new Error("Selected file is not a valid image."));
            }

            const reader = new FileReader();
            reader.onload = function (e) {
                const img = new Image();
                img.onload = function () {
                    let { width, height } = img;

                    if (width > maxWidth || height > maxHeight) {
                        if (width / height > maxWidth / maxHeight) {
                            height = Math.round((height * maxWidth) / width);
                            width = maxWidth;
                        } else {
                            width = Math.round((width * maxHeight) / height);
                            height = maxHeight;
                        }
                    }

                    const canvas = document.createElement("canvas");
                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext("2d");
                    ctx.drawImage(img, 0, 0, width, height);

                    const compressedDataUrl = canvas.toDataURL("image/jpeg", quality);
                    resolve(compressedDataUrl);
                };
                img.onerror = () => reject(new Error("Failed to process image data."));
                img.src = e.target.result;
            };
            reader.onerror = () => reject(new Error("Failed to read file."));
            reader.readAsDataURL(file);
        });
    }

    /* ================= TOAST NOTIFICATION ================= */

    function showToast(message, type = "info", duration = 3500) {
        const container = document.getElementById("toastContainer");
        if (!container) return;

        const toast = document.createElement("div");
        toast.className = `toast ${type}`;

        const icon = type === "success" ? "✓" : type === "error" ? "⚠️" : "ℹ️";
        toast.innerHTML = `<span aria-hidden="true">${icon}</span> <span>${escapeHTML(message)}</span>`;

        container.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = "toastOut 0.3s forwards";
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    /* ================= ROUTING & PAGE NAVIGATION ================= */

    function hideAllPages() {
        document.querySelectorAll(".page").forEach(page => page.classList.add("hidden"));
        const drawer = document.getElementById("mobileDrawer");
        if (drawer) drawer.classList.remove("active");
    }

    function showLanding() {
        hideAllPages();
        const landing = document.getElementById("landingPage");
        if (landing) landing.classList.remove("hidden");
        renderHomeProducts();
        updateActiveNav("navHome");
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function showConsumer() {
        hideAllPages();
        const consumer = document.getElementById("consumerPage");
        if (consumer) consumer.classList.remove("hidden");
        renderConsumerProducts();
        updateActiveNav("navProducts");
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function openSellerLogin() {
        if (sessionStorage.getItem("aqua_seller_session") === "true") {
            openSellerDashboard();
            return;
        }

        hideAllPages();
        const loginPage = document.getElementById("sellerLoginPage");
        if (loginPage) loginPage.classList.remove("hidden");
        checkLockoutStatus();
        updateActiveNav("navSeller");
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function openSellerDashboard() {
        hideAllPages();
        const dashboard = document.getElementById("sellerDashboard");
        if (dashboard) dashboard.classList.remove("hidden");
        updateDashboardStats();
        showDashboardSection("overview");
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function updateActiveNav(activeId) {
        document.querySelectorAll(".nav-link").forEach(link => {
            link.classList.toggle("active", link.id === activeId);
        });
    }

    function handleHashChange() {
        const hash = window.location.hash.toLowerCase();
        if (hash === "#products") {
            showConsumer();
        } else if (hash === "#seller-login") {
            openSellerLogin();
        } else if (hash === "#dashboard") {
            if (sessionStorage.getItem("aqua_seller_session") === "true") {
                openSellerDashboard();
            } else {
                openSellerLogin();
            }
        } else if (hash.startsWith("#product-")) {
            const productId = hash.replace("#product-", "").toUpperCase();
            openProductDetails(productId);
        } else {
            showLanding();
        }
    }

    /* ================= BRUTE-FORCE LOCKOUT & AUTHENTICATION ================= */

    function getLockoutData() {
        return getStorage("aqua_lockout", { attempts: 0, lockUntil: 0 });
    }

    function checkLockoutStatus() {
        const data = getLockoutData();
        const now = Date.now();
        const banner = document.getElementById("lockoutWarning");
        const submitBtn = document.getElementById("loginSubmitBtn");
        const usernameInput = document.getElementById("sellerUsername");
        const passwordInput = document.getElementById("sellerPassword");

        if (data.lockUntil > now) {
            const remainingSec = Math.ceil((data.lockUntil - now) / 1000);
            if (banner) {
                banner.classList.remove("hidden");
                const timerEl = document.getElementById("lockoutTimer");
                if (timerEl) {
                    const m = Math.floor(remainingSec / 60).toString().padStart(2, "0");
                    const s = (remainingSec % 60).toString().padStart(2, "0");
                    timerEl.textContent = `${m}:${s}`;
                }
            }
            if (submitBtn) submitBtn.disabled = true;
            if (usernameInput) usernameInput.disabled = true;
            if (passwordInput) passwordInput.disabled = true;

            if (!lockoutInterval) {
                lockoutInterval = setInterval(checkLockoutStatus, 1000);
            }
            return true;
        } else {
            if (lockoutInterval) {
                clearInterval(lockoutInterval);
                lockoutInterval = null;
            }
            if (banner) banner.classList.add("hidden");
            if (submitBtn) submitBtn.disabled = false;
            if (usernameInput) usernameInput.disabled = false;
            if (passwordInput) passwordInput.disabled = false;
            return false;
        }
    }

    async function handleLoginSubmit(e) {
        e.preventDefault();

        if (checkLockoutStatus()) return;

        const username = document.getElementById("sellerUsername").value.trim();
        const password = document.getElementById("sellerPassword").value;
        const errorEl = document.getElementById("loginError");

        const auth = getAuth();
        const lockout = getLockoutData();

        // Compute hash of entered password using stored salt
        const enteredHash = await sha256Hex(auth.salt, password);

        if (username === auth.username && enteredHash === auth.hash) {
            // Successful login: reset attempts and set session
            setStorage("aqua_lockout", { attempts: 0, lockUntil: 0 });
            sessionStorage.setItem("aqua_seller_session", "true");
            errorEl.textContent = "";
            showToast("Welcome back, " + auth.username + "!", "success");
            window.location.hash = "#dashboard";
        } else {
            // Failed attempt
            const newAttempts = (lockout.attempts || 0) + 1;
            let lockUntil = 0;

            if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
                lockUntil = Date.now() + LOCKOUT_DURATION_MS;
                setStorage("aqua_lockout", { attempts: newAttempts, lockUntil });
                errorEl.textContent = "Too many failed attempts. Login locked for 5 minutes.";
                checkLockoutStatus();
            } else {
                setStorage("aqua_lockout", { attempts: newAttempts, lockUntil: 0 });
                const remaining = MAX_LOGIN_ATTEMPTS - newAttempts;
                errorEl.textContent = `Invalid username or password. ${remaining} attempt${remaining === 1 ? "" : "s"} left.`;
            }
        }
    }

    function sellerLogout() {
        sessionStorage.removeItem("aqua_seller_session");
        showToast("Logged out successfully.", "info");
        window.location.hash = "#home";
    }

    async function changeSellerPassword(e) {
        e.preventDefault();
        const currentPass = document.getElementById("currentPassword").value;
        const newPass = document.getElementById("newPassword").value;
        const confirmPass = document.getElementById("confirmNewPassword").value;

        if (newPass.length < 6) {
            showToast("New password must be at least 6 characters long.", "error");
            return;
        }

        if (newPass !== confirmPass) {
            showToast("New passwords do not match.", "error");
            return;
        }

        const auth = getAuth();
        const currentHash = await sha256Hex(auth.salt, currentPass);

        if (currentHash !== auth.hash) {
            showToast("Current password is incorrect.", "error");
            return;
        }

        // Generate new salt and new hash
        const newSalt = generateRandomSalt(16);
        const newHash = await sha256Hex(newSalt, newPass);

        saveAuth({
            username: auth.username,
            salt: newSalt,
            hash: newHash
        });

        document.getElementById("changePasswordForm").reset();
        showToast("Seller password updated successfully! Please remember your new password.", "success");
    }

    /* ================= RENDERING PUBLIC PRODUCTS ================= */

    function createProductCardHTML(product) {
        const safeImg = sanitizeURL(product.image);
        const safeAnim = sanitizeURL(product.animation);

        let mediaContent = `<span class="product-placeholder" aria-hidden="true">💧</span>`;
        if (safeAnim) {
            mediaContent = `<video src="${safeAnim}" autoplay muted loop playsinline></video>`;
        } else if (safeImg) {
            mediaContent = `<img src="${safeImg}" alt="${escapeAttribute(product.name)}" loading="lazy">`;
        }

        return `
            <article class="product-card" onclick="AquaApp.openDetails('${escapeAttribute(product.id)}')">
                <div class="product-media">${mediaContent}</div>
                <div class="product-info">
                    <span class="product-category">Water Pump Automation</span>
                    <h3>${escapeHTML(product.name)}</h3>
                    <p>${escapeHTML(product.description)}</p>
                    <div class="product-specs">${escapeHTML(product.specs || "Automatic pump protection solution")}</div>
                    <div class="product-footer">
                        <div class="price">₹${Number(product.price).toLocaleString("en-IN")}</div>
                        <button type="button" class="book-btn" onclick="event.stopPropagation(); AquaApp.openBooking('${escapeAttribute(product.id)}')">
                            Book Now
                        </button>
                    </div>
                </div>
            </article>
        `;
    }

    function renderHomeProducts() {
        const grid = document.getElementById("homeProductGrid");
        if (!grid) return;

        const products = getProducts().slice(0, 4);
        grid.innerHTML = products.map(createProductCardHTML).join("");
    }

    function renderConsumerProducts() {
        const grid = document.getElementById("consumerProductGrid");
        const countEl = document.getElementById("consumerProductCount");
        if (!grid) return;

        let products = getProducts();

        if (catalogSearchQuery.trim()) {
            const q = catalogSearchQuery.toLowerCase();
            products = products.filter(p =>
                p.name.toLowerCase().includes(q) ||
                (p.description && p.description.toLowerCase().includes(q)) ||
                (p.specs && p.specs.toLowerCase().includes(q))
            );
        }

        if (countEl) countEl.textContent = products.length;

        if (products.length === 0) {
            grid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 40px; background: #fff; border-radius: 12px; border: 1px solid var(--border);">
                    <h3>No products found</h3>
                    <p style="color: var(--text-muted); margin-top: 6px;">Try adjusting your search criteria or clearing filters.</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = products.map(createProductCardHTML).join("");
    }

    /* ================= PRODUCT DETAILS POPUP ================= */

    function openProductDetails(productId) {
        const product = getProducts().find(p => p.id === productId);
        if (!product) return;

        const safeImg = sanitizeURL(product.image);
        const safeAnim = sanitizeURL(product.animation);

        let mediaContent = `<span class="product-placeholder" aria-hidden="true">💧</span>`;
        if (safeAnim) {
            mediaContent = `<video src="${safeAnim}" autoplay muted loop playsinline></video>`;
        } else if (safeImg) {
            mediaContent = `<img src="${safeImg}" alt="${escapeAttribute(product.name)}">`;
        }

        const settings = getSettings();
        const waText = encodeURIComponent(`Hi, I would like more information on "${product.name}" (Price: ₹${product.price}).`);
        const waLink = `https://wa.me/${escapeAttribute(settings.whatsapp)}?text=${waText}`;

        document.getElementById("productDetailsContent").innerHTML = `
            <div class="product-details-layout">
                <div class="product-details-media">${mediaContent}</div>
                <div class="product-details-info">
                    <span class="eyebrow">PUMP AUTOMATION UNIT</span>
                    <h2 id="detailsTitle">${escapeHTML(product.name)}</h2>
                    <div class="details-price">₹${Number(product.price).toLocaleString("en-IN")}</div>
                    
                    <div class="details-desc-title">Description</div>
                    <p class="details-description">${escapeHTML(product.description)}</p>

                    <div class="details-desc-title">Key Specifications</div>
                    <div class="details-specs">${escapeHTML(product.specs || "Standard industrial automation")}</div>

                    <div class="details-actions">
                        <button type="button" class="primary-btn" onclick="AquaApp.closeDetails(); AquaApp.openBooking('${escapeAttribute(product.id)}')">
                            Book This Controller
                        </button>
                        <a href="${waLink}" target="_blank" rel="noopener noreferrer" class="whatsapp-submit-btn">
                            💬 Ask on WhatsApp
                        </a>
                    </div>
                </div>
            </div>
        `;

        document.getElementById("productDetailsModal").classList.remove("hidden");
    }

    function closeProductDetails() {
        const modal = document.getElementById("productDetailsModal");
        if (modal) modal.classList.add("hidden");
    }

    /* ================= BOOKING & ORDER SUBMISSION ================= */

    function openBooking(productId) {
        const product = getProducts().find(p => p.id === productId);
        if (!product) return;

        document.getElementById("bookingProductId").value = product.id;
        document.getElementById("bookingProductName").textContent = product.name;
        document.getElementById("bookingProductPrice").textContent = "₹" + Number(product.price).toLocaleString("en-IN");

        // Clear errors
        document.querySelectorAll(".field-error").forEach(el => (el.textContent = ""));

        document.getElementById("bookingModal").classList.remove("hidden");
    }

    function closeBooking() {
        document.getElementById("bookingModal").classList.add("hidden");
        document.getElementById("bookingForm").reset();
    }

    function validateBookingForm() {
        let valid = true;

        const name = document.getElementById("customerName").value.trim();
        const phone = document.getElementById("customerPhone").value.trim();
        const address = document.getElementById("customerAddress").value.trim();
        const city = document.getElementById("customerCity").value.trim();
        const pin = document.getElementById("customerPin").value.trim();

        // Name
        if (!name) {
            document.getElementById("nameError").textContent = "Name is required.";
            valid = false;
        } else {
            document.getElementById("nameError").textContent = "";
        }

        // Phone: 10 digits
        const cleanPhone = phone.replace(/[^0-9]/g, "");
        if (cleanPhone.length < 10) {
            document.getElementById("phoneError").textContent = "Please enter a valid 10-digit mobile number.";
            valid = false;
        } else {
            document.getElementById("phoneError").textContent = "";
        }

        // Address
        if (!address) {
            document.getElementById("addressError").textContent = "Installation address is required.";
            valid = false;
        } else {
            document.getElementById("addressError").textContent = "";
        }

        // City
        if (!city) {
            document.getElementById("cityError").textContent = "City is required.";
            valid = false;
        } else {
            document.getElementById("cityError").textContent = "";
        }

        // PIN: 6 digits
        if (!/^\d{6}$/.test(pin)) {
            document.getElementById("pinError").textContent = "Please enter a 6-digit PIN code.";
            valid = false;
        } else {
            document.getElementById("pinError").textContent = "";
        }

        return valid;
    }

    function compileOrderData() {
        const productId = document.getElementById("bookingProductId").value;
        const product = getProducts().find(p => p.id === productId);
        if (!product) return null;

        const customerName = document.getElementById("customerName").value.trim();
        const phone = document.getElementById("customerPhone").value.trim();
        const email = document.getElementById("customerEmail").value.trim();
        const address = document.getElementById("customerAddress").value.trim();
        const city = document.getElementById("customerCity").value.trim();
        const pin = document.getElementById("customerPin").value.trim();
        const installation = document.getElementById("installationRequired").value;
        const message = document.getElementById("customerMessage").value.trim();

        const orderId = "AC-" + Math.floor(100000 + Math.random() * 900000);

        return {
            id: orderId,
            productId: product.id,
            productName: product.name,
            price: product.price,
            customerName,
            phone,
            email,
            address,
            city,
            pin,
            installation,
            message,
            status: "New",
            date: new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }),
            timestamp: Date.now()
        };
    }

    function createWhatsAppMessage(order, settings) {
        return (
            `💧 *NEW ORDER: ${settings.businessName}*\n` +
            `━━━━━━━━━━━━━━━━━━━━━\n` +
            `📦 *Product:* ${order.productName} (₹${Number(order.price).toLocaleString("en-IN")})\n` +
            `🆔 *Order ID:* ${order.id}\n` +
            `👤 *Customer:* ${order.customerName}\n` +
            `📞 *Phone:* ${order.phone}\n` +
            `📍 *Address:* ${order.address}, ${order.city} - ${order.pin}\n` +
            `🔧 *Installation Required:* ${order.installation}\n` +
            (order.message ? `💬 *Note:* ${order.message}\n` : "") +
            `━━━━━━━━━━━━━━━━━━━━━\n` +
            `Date: ${order.date}`
        );
    }

    async function sendOrderWebhook(order, webhookUrl) {
        if (!webhookUrl) return;
        try {
            await fetch(webhookUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Accept": "application/json" },
                body: JSON.stringify(order)
            });
        } catch (err) {
            console.warn("Webhook forwarding error:", err);
        }
    }

    async function processOrderSubmission(sendViaWhatsApp = true) {
        if (!validateBookingForm()) return;

        const order = compileOrderData();
        if (!order) return;

        // Save locally
        const orders = getOrders();
        orders.unshift(order);
        saveOrders(orders);

        const settings = getSettings();

        // Optional Webhook notification (e.g. Formspree/Google Sheets)
        if (settings.webhook) {
            sendOrderWebhook(order, settings.webhook);
        }

        closeBooking();

        // Setup Success Modal
        document.getElementById("successOrderId").textContent = order.id;
        document.getElementById("successDetailsSnippet").innerHTML = `
            <div><strong>Product:</strong> ${escapeHTML(order.productName)} (₹${Number(order.price).toLocaleString("en-IN")})</div>
            <div><strong>Customer:</strong> ${escapeHTML(order.customerName)} (${escapeHTML(order.phone)})</div>
            <div><strong>Installation:</strong> ${escapeHTML(order.installation)}</div>
        `;

        const waText = encodeURIComponent(createWhatsAppMessage(order, settings));
        const waUrl = `https://wa.me/${escapeAttribute(settings.whatsapp)}?text=${waText}`;

        const successWhatsAppBtn = document.getElementById("successWhatsAppAction");
        successWhatsAppBtn.onclick = () => window.open(waUrl, "_blank", "noopener,noreferrer");

        document.getElementById("successModal").classList.remove("hidden");

        // If user explicitly chose WhatsApp submission
        if (sendViaWhatsApp) {
            window.open(waUrl, "_blank", "noopener,noreferrer");
        }
    }

    function closeSuccess() {
        document.getElementById("successModal").classList.add("hidden");
        showConsumer();
    }

    /* ================= SELLER DASHBOARD MANAGEMENT ================= */

    function showDashboardSection(section, button) {
        document.querySelectorAll(".dashboard-section").forEach(sec => sec.classList.add("hidden"));
        const target = document.getElementById("section-" + section);
        if (target) target.classList.remove("hidden");

        document.querySelectorAll(".side-btn").forEach(btn => btn.classList.remove("active"));
        if (button) {
            button.classList.add("active");
        } else {
            const defaultBtn = document.getElementById("btnSection" + section.charAt(0).toUpperCase() + section.slice(1));
            if (defaultBtn) defaultBtn.classList.add("active");
        }

        if (section === "products") renderSellerProducts();
        if (section === "orders") renderSellerOrders();
        if (section === "overview") updateDashboardStats();
    }

    function updateDashboardStats() {
        const products = getProducts();
        const orders = getOrders();

        const statProducts = document.getElementById("statProducts");
        const statOrders = document.getElementById("statOrders");
        const statNewOrders = document.getElementById("statNewOrders");
        const statInstallations = document.getElementById("statInstallations");
        const sideProductCount = document.getElementById("sideProductCount");
        const sideOrderCount = document.getElementById("sideOrderCount");

        if (statProducts) statProducts.textContent = products.length;
        if (statOrders) statOrders.textContent = orders.length;
        if (sideProductCount) sideProductCount.textContent = products.length;
        if (sideOrderCount) sideOrderCount.textContent = orders.length;

        if (statNewOrders) {
            statNewOrders.textContent = orders.filter(o => o.status === "New").length;
        }
        if (statInstallations) {
            statInstallations.textContent = orders.filter(o => o.installation === "Yes").length;
        }

        renderRecentOrdersTable();
    }

    function renderRecentOrdersTable() {
        const container = document.getElementById("recentOrders");
        if (!container) return;

        const orders = getOrders().slice(0, 5);
        if (orders.length === 0) {
            container.innerHTML = `<p style="color: var(--text-muted); padding: 14px 0;">No inquiries received yet.</p>`;
            return;
        }

        container.innerHTML = orders.map(order => `
            <div class="order-row">
                <div class="order-main">
                    <strong>${escapeHTML(order.productName)}</strong>
                    <small>${escapeHTML(order.id)} • ${escapeHTML(order.date)}</small>
                </div>
                <div>${escapeHTML(order.customerName)} (${escapeHTML(order.phone)})</div>
                <div>₹${Number(order.price).toLocaleString("en-IN")}</div>
                <div>
                    <span class="status status-${escapeAttribute(order.status.toLowerCase().replace(/\s+/g, '-'))}">
                        ${escapeHTML(order.status)}
                    </span>
                </div>
            </div>
        `).join("");
    }

    /* SELLER PRODUCTS */

    function renderSellerProducts() {
        const container = document.getElementById("sellerProductList");
        if (!container) return;

        const products = getProducts();
        if (products.length === 0) {
            container.innerHTML = `<p style="color: var(--text-muted); padding: 20px;">No products added yet. Click "+ Add New Product" above.</p>`;
            return;
        }

        container.innerHTML = products.map(product => {
            const safeImg = sanitizeURL(product.image);
            let media = `<span class="product-placeholder" aria-hidden="true">💧</span>`;
            if (safeImg) {
                media = `<img src="${safeImg}" alt="${escapeAttribute(product.name)}" loading="lazy">`;
            }

            return `
                <div class="seller-product-card">
                    <div class="seller-product-media">${media}</div>
                    <div class="seller-product-body">
                        <small>ID: ${escapeHTML(product.id)}</small>
                        <h3>${escapeHTML(product.name)}</h3>
                        <p>${escapeHTML(product.description)}</p>
                        <div class="price">₹${Number(product.price).toLocaleString("en-IN")}</div>
                        <div class="seller-product-actions">
                            <button type="button" class="edit-btn" onclick="AquaApp.editProduct('${escapeAttribute(product.id)}')">Edit</button>
                            <button type="button" class="delete-btn" onclick="AquaApp.deleteProduct('${escapeAttribute(product.id)}')">Delete</button>
                        </div>
                    </div>
                </div>
            `;
        }).join("");
    }

    function prepareAddProduct() {
        resetProductForm();
        showDashboardSection("addProduct");
    }

    function resetProductForm() {
        document.getElementById("productForm").reset();
        document.getElementById("editProductId").value = "";
        document.getElementById("productFormTitle").textContent = "Add Product";
        document.getElementById("imagePreview").innerHTML = `<span class="preview-placeholder">No image selected</span>`;
    }

    function editProduct(productId) {
        const product = getProducts().find(p => p.id === productId);
        if (!product) return;

        document.getElementById("editProductId").value = product.id;
        document.getElementById("productName").value = product.name;
        document.getElementById("productPrice").value = product.price;
        document.getElementById("productDescription").value = product.description;
        document.getElementById("productSpecs").value = product.specs || "";
        document.getElementById("productAnimation").value = product.animation || "";
        document.getElementById("productFormTitle").textContent = "Edit Product: " + product.name;

        const previewContainer = document.getElementById("imagePreview");
        const safeImg = sanitizeURL(product.image);
        if (safeImg) {
            previewContainer.innerHTML = `<img src="${safeImg}" alt="Product Preview">`;
        } else {
            previewContainer.innerHTML = `<span class="preview-placeholder">No image attached</span>`;
        }

        showDashboardSection("addProduct");
    }

    function deleteProduct(productId) {
        const products = getProducts();
        const target = products.find(p => p.id === productId);
        if (!target) return;

        if (!confirm(`Are you sure you want to delete "${target.name}"?`)) return;

        const updated = products.filter(p => p.id !== productId);
        saveProducts(updated);
        showToast("Product deleted successfully.", "info");
    }

    async function handleProductFormSubmit(e) {
        e.preventDefault();

        const id = document.getElementById("editProductId").value;
        const name = document.getElementById("productName").value.trim();
        const price = Number(document.getElementById("productPrice").value);
        const description = document.getElementById("productDescription").value.trim();
        const specs = document.getElementById("productSpecs").value.trim();
        const animation = document.getElementById("productAnimation").value.trim();
        const fileInput = document.getElementById("productImage");

        if (!name || isNaN(price) || price < 0 || !description) {
            showToast("Please provide valid product name, price, and description.", "error");
            return;
        }

        const products = getProducts();
        let existing = products.find(p => p.id === id);
        let image = existing?.image || "";

        if (fileInput.files && fileInput.files[0]) {
            try {
                showToast("Compressing image for fast loading...", "info", 1500);
                image = await compressImage(fileInput.files[0], 800, 800, 0.75);
            } catch (err) {
                showToast("Image compression failed: " + err.message, "error");
                return;
            }
        }

        const product = {
            id: id || "P" + Math.floor(100 + Math.random() * 900),
            name,
            price,
            description,
            specs,
            image,
            animation
        };

        let updatedProducts;
        if (existing) {
            updatedProducts = products.map(p => (p.id === id ? product : p));
        } else {
            updatedProducts = [product, ...products];
        }

        if (saveProducts(updatedProducts)) {
            resetProductForm();
            showDashboardSection("products");
            showToast(existing ? "Product updated successfully." : "Product added successfully.", "success");
        }
    }

    /* SELLER ORDERS */

    function filterSellerOrders(status) {
        currentFilterStatus = status;
        renderSellerOrders();
    }

    function renderSellerOrders() {
        const container = document.getElementById("sellerOrders");
        if (!container) return;

        let orders = getOrders();

        if (currentFilterStatus !== "ALL") {
            orders = orders.filter(o => o.status === currentFilterStatus);
        }

        if (orders.length === 0) {
            container.innerHTML = `
                <div class="dashboard-panel">
                    <p style="color: var(--text-muted);">No orders matching "${escapeHTML(currentFilterStatus)}".</p>
                </div>
            `;
            return;
        }

        container.innerHTML = orders.map(order => {
            const settings = getSettings();
            const waText = encodeURIComponent(
                `Hi ${order.customerName}, this is ${settings.businessName} regarding your Order ${order.id} for "${order.productName}".`
            );
            const customerWaLink = `https://wa.me/91${order.phone.replace(/[^0-9]/g, "")}?text=${waText}`;

            return `
                <div class="order-card">
                    <div class="order-card-header">
                        <div>
                            <h3>${escapeHTML(order.productName)}</h3>
                            <small>Order ID: <strong>${escapeHTML(order.id)}</strong> • Received: ${escapeHTML(order.date)}</small>
                        </div>
                        <span class="status status-${escapeAttribute(order.status.toLowerCase().replace(/\s+/g, '-'))}">
                            ${escapeHTML(order.status)}
                        </span>
                    </div>

                    <div class="customer-info">
                        <div>
                            <strong>Customer Name</strong>
                            ${escapeHTML(order.customerName)}
                        </div>
                        <div>
                            <strong>Phone Number</strong>
                            <a href="tel:${escapeAttribute(order.phone)}" style="color:var(--primary); font-weight:600;">${escapeHTML(order.phone)}</a>
                        </div>
                        <div>
                            <strong>Email Address</strong>
                            ${escapeHTML(order.email || "-")}
                        </div>
                        <div>
                            <strong>Installation Service</strong>
                            <span style="font-weight:700; color:${order.installation === 'Yes' ? 'var(--primary)' : 'var(--text-muted)'};">
                                ${escapeHTML(order.installation)}
                            </span>
                        </div>
                        <div>
                            <strong>City & PIN</strong>
                            ${escapeHTML(order.city)} - ${escapeHTML(order.pin)}
                        </div>
                        <div>
                            <strong>Total Price</strong>
                            ₹${Number(order.price).toLocaleString("en-IN")}
                        </div>
                        <div style="grid-column: 1 / -1;">
                            <strong>Delivery / Site Address</strong>
                            ${escapeHTML(order.address)}
                        </div>
                        ${order.message ? `
                        <div style="grid-column: 1 / -1;">
                            <strong>Customer Message</strong>
                            ${escapeHTML(order.message)}
                        </div>` : ""}
                    </div>

                    <div class="order-card-footer">
                        <div class="price">
                            ₹${Number(order.price).toLocaleString("en-IN")}
                        </div>

                        <div class="order-card-footer-actions">
                            <a href="${customerWaLink}" target="_blank" rel="noopener noreferrer" class="whatsapp-badge" style="font-size:0.86rem; padding:6px 12px;">
                                💬 WhatsApp Customer
                            </a>

                            <label style="margin:0; font-size:0.85rem;" for="statusSelect_${order.id}">Status:</label>
                            <select id="statusSelect_${order.id}" onchange="AquaApp.updateOrderStatus('${escapeAttribute(order.id)}', this.value)">
                                <option value="New" ${order.status === "New" ? "selected" : ""}>New</option>
                                <option value="Confirmed" ${order.status === "Confirmed" ? "selected" : ""}>Confirmed</option>
                                <option value="Installation Scheduled" ${order.status === "Installation Scheduled" ? "selected" : ""}>Installation Scheduled</option>
                                <option value="Completed" ${order.status === "Completed" ? "selected" : ""}>Completed</option>
                                <option value="Cancelled" ${order.status === "Cancelled" ? "selected" : ""}>Cancelled</option>
                            </select>

                            <button type="button" class="delete-btn" style="flex:none; padding:7px 12px;" onclick="AquaApp.deleteOrder('${escapeAttribute(order.id)}')">
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join("");
    }

    function updateOrderStatus(orderId, newStatus) {
        const orders = getOrders();
        const updated = orders.map(o => (o.id === orderId ? Object.assign({}, o, { status: newStatus }) : o));
        saveOrders(updated);
        showToast(`Order ${orderId} updated to "${newStatus}".`, "info");
    }

    function deleteOrder(orderId) {
        if (!confirm(`Delete order ${orderId}? This cannot be undone.`)) return;
        const orders = getOrders();
        const updated = orders.filter(o => o.id !== orderId);
        saveOrders(updated);
        showToast("Order deleted.", "info");
    }

    function confirmClearOrders() {
        if (!confirm("Are you sure you want to clear ALL orders? Make sure you have exported a CSV backup first.")) return;
        saveOrders([]);
        showToast("All orders cleared.", "info");
    }

    /* ================= CSV EXPORT & BACKUP ================= */

    function exportOrdersToCSV() {
        const orders = getOrders();
        if (orders.length === 0) {
            showToast("No orders available to export.", "info");
            return;
        }

        const headers = ["Order ID", "Date", "Product", "Price (INR)", "Customer", "Phone", "Email", "Address", "City", "PIN", "Installation", "Status", "Notes"];
        const rows = orders.map(o => [
            `"${o.id}"`,
            `"${o.date || ""}"`,
            `"${(o.productName || "").replace(/"/g, '""')}"`,
            o.price || 0,
            `"${(o.customerName || "").replace(/"/g, '""')}"`,
            `"${(o.phone || "").replace(/"/g, '""')}"`,
            `"${(o.email || "").replace(/"/g, '""')}"`,
            `"${(o.address || "").replace(/"/g, '""')}"`,
            `"${(o.city || "").replace(/"/g, '""')}"`,
            `"${(o.pin || "").replace(/"/g, '""')}"`,
            `"${(o.installation || "").replace(/"/g, '""')}"`,
            `"${(o.status || "").replace(/"/g, '""')}"`,
            `"${(o.message || "").replace(/"/g, '""')}"`
        ]);

        const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\r\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = `Orders_AquaControl_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast("Orders exported to CSV successfully!", "success");
    }

    function exportFullBackup() {
        const backup = {
            version: "1.0",
            exportDate: new Date().toISOString(),
            settings: getSettings(),
            products: getProducts(),
            orders: getOrders()
        };

        const jsonStr = JSON.stringify(backup, null, 2);
        const blob = new Blob([jsonStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = `AquaControl_Backup_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast("Complete backup file downloaded.", "success");
    }

    function importFullBackup(event) {
        const file = event.target.files && event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function (e) {
            try {
                const data = JSON.parse(e.target.result);
                if (!Array.isArray(data.products) || !Array.isArray(data.orders)) {
                    throw new Error("Invalid backup format.");
                }

                if (confirm(`Import ${data.products.length} products and ${data.orders.length} orders? Current data will be replaced.`)) {
                    if (data.settings) saveSettings(data.settings);
                    saveProducts(data.products);
                    saveOrders(data.orders);
                    showToast("Backup restored successfully!", "success");
                    location.reload();
                }
            } catch (err) {
                showToast("Failed to restore backup: " + err.message, "error");
            }
        };
        reader.readAsText(file);
    }

    function restoreDemoProducts() {
        if (!confirm("Reset product list to default 4 demo controllers? Your custom added products will be replaced.")) return;
        saveProducts(DEFAULT_PRODUCTS);
        showToast("Default demo products restored.", "success");
    }

    /* ================= BUSINESS SETTINGS ================= */

    function applySettingsToUI() {
        const s = getSettings();

        // Update titles and headers
        const brandTitle = document.getElementById("brandTitle");
        const dashBrandName = document.getElementById("dashBrandName");
        const footerBrandName = document.getElementById("footerBrandName");
        const copyrightBrand = document.getElementById("copyrightBrand");

        if (brandTitle) brandTitle.textContent = s.businessName;
        if (dashBrandName) dashBrandName.textContent = s.businessName;
        if (footerBrandName) footerBrandName.textContent = s.businessName;
        if (copyrightBrand) copyrightBrand.textContent = s.businessName;

        // Top bar contacts
        const topPhoneLink = document.getElementById("topPhoneLink");
        const topPhoneText = document.getElementById("topPhoneText");
        const topWhatsAppLink = document.getElementById("topWhatsAppLink");
        const footerPhone = document.getElementById("footerPhone");
        const footerEmail = document.getElementById("footerEmail");
        const ctaWhatsAppBtn = document.getElementById("ctaWhatsAppBtn");

        if (topPhoneLink) topPhoneLink.href = `tel:${s.phone.replace(/\s+/g, "")}`;
        if (topPhoneText) topPhoneText.textContent = s.phone;
        if (topWhatsAppLink) topWhatsAppLink.href = `https://wa.me/${s.whatsapp}`;
        if (footerPhone) footerPhone.textContent = "Phone: " + s.phone;
        if (footerEmail) footerEmail.textContent = "Email: " + s.email;
        if (ctaWhatsAppBtn) ctaWhatsAppBtn.href = `https://wa.me/${s.whatsapp}?text=Hi%2C%20I%20am%20interested%20in%20water%20pump%20automation.`;

        // Prepopulate form if present
        const settingBusinessName = document.getElementById("settingBusinessName");
        if (settingBusinessName) {
            settingBusinessName.value = s.businessName;
            document.getElementById("settingPhone").value = s.phone;
            document.getElementById("settingWhatsApp").value = s.whatsapp;
            document.getElementById("settingEmail").value = s.email;
            document.getElementById("settingWebhook").value = s.webhook || "";
        }
    }

    function saveBusinessSettings(e) {
        e.preventDefault();
        const settings = {
            businessName: document.getElementById("settingBusinessName").value.trim(),
            phone: document.getElementById("settingPhone").value.trim(),
            whatsapp: document.getElementById("settingWhatsApp").value.replace(/[^0-9]/g, ""),
            email: document.getElementById("settingEmail").value.trim(),
            webhook: document.getElementById("settingWebhook").value.trim()
        };
        saveSettings(settings);
    }

    /* ================= INITIALIZATION & EVENT LISTENERS ================= */

    document.addEventListener("DOMContentLoaded", function () {
        // Dynamic copyright year
        const currentYearEl = document.getElementById("currentYear");
        if (currentYearEl) currentYearEl.textContent = new Date().getFullYear();

        // Apply business settings
        applySettingsToUI();

        // Listen for hash changes
        window.addEventListener("hashchange", handleHashChange);

        // Mobile drawer toggle
        const menuBtn = document.getElementById("mobileMenuBtn");
        const drawer = document.getElementById("mobileDrawer");
        if (menuBtn && drawer) {
            menuBtn.addEventListener("click", () => {
                drawer.classList.toggle("active");
                menuBtn.setAttribute("aria-expanded", drawer.classList.contains("active"));
            });
            drawer.querySelectorAll("a").forEach(a => {
                a.addEventListener("click", () => drawer.classList.remove("active"));
            });
        }

        // Product search
        const searchInput = document.getElementById("catalogSearchInput");
        const clearBtn = document.getElementById("catalogSearchClear");
        if (searchInput && clearBtn) {
            searchInput.addEventListener("input", function () {
                catalogSearchQuery = this.value;
                clearBtn.classList.toggle("hidden", !catalogSearchQuery);
                renderConsumerProducts();
            });
            clearBtn.addEventListener("click", function () {
                searchInput.value = "";
                catalogSearchQuery = "";
                clearBtn.classList.add("hidden");
                renderConsumerProducts();
            });
        }

        // Image file picker preview in Product Form
        const imgInput = document.getElementById("productImage");
        if (imgInput) {
            imgInput.addEventListener("change", async function () {
                const file = this.files[0];
                if (!file) return;

                const preview = document.getElementById("imagePreview");
                try {
                    preview.innerHTML = `<span class="preview-placeholder">Compressing preview...</span>`;
                    const compressed = await compressImage(file, 400, 400, 0.7);
                    preview.innerHTML = `<img src="${compressed}" alt="Preview">`;
                } catch (err) {
                    preview.innerHTML = `<span class="preview-placeholder" style="color:var(--red);">Preview error</span>`;
                }
            });
        }

        // Login form
        const loginForm = document.getElementById("loginForm");
        if (loginForm) loginForm.addEventListener("submit", handleLoginSubmit);

        // Password visibility toggle
        const togglePassBtn = document.getElementById("togglePasswordBtn");
        const passInput = document.getElementById("sellerPassword");
        if (togglePassBtn && passInput) {
            togglePassBtn.addEventListener("click", () => {
                const isPassword = passInput.type === "password";
                passInput.type = isPassword ? "text" : "password";
                togglePassBtn.textContent = isPassword ? "🙈" : "👁️";
            });
        }

        // Booking form action buttons
        const form = document.getElementById("bookingForm");
        const btnWhatsApp = document.getElementById("btnBookWhatsApp");
        const btnSaveOnly = document.getElementById("btnBookSaveOnly");

        if (form && btnWhatsApp) {
            form.addEventListener("submit", function (e) {
                e.preventDefault();
                processOrderSubmission(true);
            });
        }

        if (btnSaveOnly) {
            btnSaveOnly.addEventListener("click", function () {
                processOrderSubmission(false);
            });
        }

        // Product form
        const productForm = document.getElementById("productForm");
        if (productForm) productForm.addEventListener("submit", handleProductFormSubmit);

        // Close modals on Escape key or outside click
        window.addEventListener("keydown", function (e) {
            if (e.key === "Escape") {
                closeProductDetails();
                closeBooking();
                closeSuccess();
            }
        });

        document.querySelectorAll(".modal").forEach(modal => {
            modal.addEventListener("click", function (e) {
                if (e.target === this) {
                    closeProductDetails();
                    closeBooking();
                    closeSuccess();
                }
            });
        });

        // Initialize view based on current hash
        handleHashChange();
    });

    /* ================= EXPOSE GLOBAL NAMESPACE FOR INLINE HANDLERS ================= */
    window.AquaApp = {
        openDetails: openProductDetails,
        closeDetails: closeProductDetails,
        openBooking: openBooking,
        closeBooking: closeBooking,
        closeSuccess: closeSuccess,
        editProduct: editProduct,
        deleteProduct: deleteProduct,
        updateOrderStatus: updateOrderStatus,
        deleteOrder: deleteOrder
    };

    window.closeProductDetails = closeProductDetails;
    window.closeBooking = closeBooking;
    window.closeSuccess = closeSuccess;
    window.showDashboardSection = showDashboardSection;
    window.prepareAddProduct = prepareAddProduct;
    window.resetProductForm = resetProductForm;
    window.sellerLogout = sellerLogout;
    window.saveBusinessSettings = saveBusinessSettings;
    window.changeSellerPassword = changeSellerPassword;
    window.exportOrdersToCSV = exportOrdersToCSV;
    window.exportFullBackup = exportFullBackup;
    window.importFullBackup = importFullBackup;
    window.restoreDemoProducts = restoreDemoProducts;
    window.filterSellerOrders = filterSellerOrders;
    window.confirmClearOrders = confirmClearOrders;
})();
