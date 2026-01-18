const SPEEDY_AUTH_STORAGE_KEY = "speedyAuthSession";
const SPEEDY_DRIVERS_STORAGE_KEY = "speedyDrivers";
const SPEEDY_AUTH_DB_NAME = "speedyAuthDB";
const SPEEDY_DRIVER_MEDIA_STORE = "driverMedia";

const speedyGetSession = () => {
    try {
        const raw = localStorage.getItem(SPEEDY_AUTH_STORAGE_KEY);
        if (!raw) return null;
        const session = JSON.parse(raw);
        if (!session || typeof session !== "object") return null;
        if (!session.role) return null;
        return session;
    } catch {
        return null;
    }
};

const speedySetSession = (session) => {
    localStorage.setItem(SPEEDY_AUTH_STORAGE_KEY, JSON.stringify(session));
};

const speedyClearSession = () => {
    localStorage.removeItem(SPEEDY_AUTH_STORAGE_KEY);
};

const speedyApplyRoleVisibility = (role) => {
    const roleElements = document.querySelectorAll("[data-role]");
    roleElements.forEach((el) => {
        const required = el.getAttribute("data-role");
        if (required && required !== role) {
            el.style.display = "none";
        }
    });
};

const speedyRequireRole = (role, redirectTo) => {
    const session = speedyGetSession();
    if (!session || session.role !== role) {
        if (redirectTo) {
            window.location.replace(redirectTo);
        }
        return false;
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => speedyApplyRoleVisibility(role));
    } else {
        speedyApplyRoleVisibility(role);
    }

    return true;
};

const speedyLogout = (redirectTo) => {
    speedyClearSession();
    if (redirectTo) {
        window.location.replace(redirectTo);
    }
};

const speedyGetDrivers = () => {
    try {
        const raw = localStorage.getItem(SPEEDY_DRIVERS_STORAGE_KEY);
        if (!raw) return [];
        const list = JSON.parse(raw);
        return Array.isArray(list) ? list : [];
    } catch {
        return [];
    }
};

const speedySaveDrivers = (drivers) => {
    localStorage.setItem(SPEEDY_DRIVERS_STORAGE_KEY, JSON.stringify(drivers));
};

const speedyOpenAuthDb = () => {
    return new Promise((resolve, reject) => {
        try {
            if (typeof indexedDB === 'undefined') {
                reject(new Error('IndexedDB not available'));
                return;
            }
            const req = indexedDB.open(SPEEDY_AUTH_DB_NAME, 1);
            req.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(SPEEDY_DRIVER_MEDIA_STORE)) {
                    db.createObjectStore(SPEEDY_DRIVER_MEDIA_STORE, { keyPath: 'id' });
                }
            };
            req.onsuccess = (event) => resolve(event.target.result);
            req.onerror = () => reject(req.error || new Error('IndexedDB open failed'));
        } catch (e) {
            reject(e);
        }
    });
};

const speedyPutDriverMedia = async ({ id, licenseFront, licenseBack, selfie, profilePhoto }) => {
    try {
        const db = await speedyOpenAuthDb();
        return new Promise((resolve, reject) => {
            const tx = db.transaction([SPEEDY_DRIVER_MEDIA_STORE], 'readwrite');
            const store = tx.objectStore(SPEEDY_DRIVER_MEDIA_STORE);
            const req = store.put({ id, licenseFront, licenseBack, selfie, profilePhoto });
            req.onsuccess = () => resolve(true);
            req.onerror = () => reject(req.error || new Error('IndexedDB put failed'));
        }).finally(() => {
            try { db.close(); } catch { }
        });
    } catch {
        return false;
    }
};

const speedyGetDriverMedia = async (id) => {
    try {
        const db = await speedyOpenAuthDb();
        return new Promise((resolve, reject) => {
            const tx = db.transaction([SPEEDY_DRIVER_MEDIA_STORE], 'readonly');
            const store = tx.objectStore(SPEEDY_DRIVER_MEDIA_STORE);
            const req = store.get(id);
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => reject(req.error || new Error('IndexedDB get failed'));
        }).finally(() => {
            try { db.close(); } catch { }
        });
    } catch {
        return null;
    }
};

const speedyNormalizeIdentifier = (value) => String(value || "").trim().toLowerCase();

const speedyGetDriverByIdentifier = (identifier) => {
    const id = speedyNormalizeIdentifier(identifier);
    if (!id) return null;
    const drivers = speedyGetDrivers();
    return drivers.find((d) => {
        const email = speedyNormalizeIdentifier(d.email);
        const phone = speedyNormalizeIdentifier(d.phone);
        const username = speedyNormalizeIdentifier(d.username);
        return id === email || id === phone || id === username;
    }) || null;
};

const speedyToHex = (buffer) => {
    const bytes = new Uint8Array(buffer);
    let hex = "";
    for (let i = 0; i < bytes.length; i++) {
        hex += bytes[i].toString(16).padStart(2, "0");
    }
    return hex;
};

const speedyRandomHex = (byteLength = 16) => {
    const bytes = new Uint8Array(byteLength);
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
        crypto.getRandomValues(bytes);
        return speedyToHex(bytes);
    }

    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = Math.floor(Math.random() * 256);
    }
    return speedyToHex(bytes);
};

const speedyHashPassword = async (password, salt) => {
    const input = `${salt}:${password}`;

    if (typeof crypto !== 'undefined' && crypto.subtle && typeof TextEncoder !== 'undefined' && (typeof isSecureContext === 'undefined' || isSecureContext)) {
        const enc = new TextEncoder();
        const data = enc.encode(input);
        const digest = await crypto.subtle.digest("SHA-256", data);
        return speedyToHex(digest);
    }

    let hash = 5381;
    for (let i = 0; i < input.length; i++) {
        hash = ((hash << 5) + hash) ^ input.charCodeAt(i);
        hash = hash >>> 0;
    }
    return hash.toString(16).padStart(8, '0');
};

const speedyRegisterDriver = async ({ fullName, email, phone, password, licenseFront, licenseBack, selfie }) => {
    const normalizedEmail = speedyNormalizeIdentifier(email);
    const normalizedPhone = speedyNormalizeIdentifier(phone);

    if (!fullName || !normalizedEmail || !normalizedPhone || !password) {
        return { ok: false, message: "Missing required fields" };
    }

    const drivers = speedyGetDrivers();
    const exists = drivers.some((d) => {
        return speedyNormalizeIdentifier(d.email) === normalizedEmail || speedyNormalizeIdentifier(d.phone) === normalizedPhone;
    });
    if (exists) {
        return { ok: false, message: "Driver already registered" };
    }

    const salt = speedyRandomHex(16);
    const passwordHash = await speedyHashPassword(password, salt);
    const driverId = `drv_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const mediaId = `media_${Date.now()}_${Math.random().toString(16).slice(2)}`;

    let storedMediaId = null;
    try {
        const ok = await speedyPutDriverMedia({
            id: mediaId,
            licenseFront,
            licenseBack,
            selfie
        });
        storedMediaId = ok ? mediaId : null;
    } catch {
        storedMediaId = null;
    }

    const driver = {
        id: driverId,
        fullName: String(fullName).trim(),
        email: normalizedEmail,
        phone: String(phone).trim(),
        approved: false,
        password: { salt, hash: passwordHash },
        mediaId: storedMediaId,
        licenseFront: storedMediaId ? null : licenseFront,
        licenseBack: storedMediaId ? null : licenseBack,
        selfie: storedMediaId ? null : selfie,
        createdAt: new Date().toISOString()
    };

    drivers.push(driver);
    speedySaveDrivers(drivers);
    return { ok: true, driverId: driver.id };
};

const speedyUpdateDriverProfilePhoto = async ({ driverId, profilePhoto }) => {
    try {
        if (!driverId || !profilePhoto) return { ok: false, message: 'Missing required fields' };
        const drivers = speedyGetDrivers();
        const idx = drivers.findIndex((d) => d && d.id === driverId);
        if (idx === -1) return { ok: false, message: 'Driver not found' };

        const driver = drivers[idx];
        const mediaId = driver.mediaId || `media_${Date.now()}_${Math.random().toString(16).slice(2)}`;

        let storedOk = false;
        try {
            const existing = driver.mediaId ? await speedyGetDriverMedia(mediaId) : null;
            const merged = {
                id: mediaId,
                licenseFront: (existing && existing.licenseFront) || driver.licenseFront,
                licenseBack: (existing && existing.licenseBack) || driver.licenseBack,
                selfie: (existing && existing.selfie) || driver.selfie,
                profilePhoto: profilePhoto
            };
            storedOk = await speedyPutDriverMedia(merged);
        } catch {
            storedOk = false;
        }

        if (storedOk) {
            drivers[idx] = {
                ...driver,
                mediaId,
                licenseFront: driver.mediaId ? driver.licenseFront : null,
                licenseBack: driver.mediaId ? driver.licenseBack : null,
                selfie: driver.mediaId ? driver.selfie : null,
                profilePhoto: null
            };
        } else {
            drivers[idx] = {
                ...driver,
                profilePhoto
            };
        }

        speedySaveDrivers(drivers);
        return { ok: true };
    } catch {
        return { ok: false, message: 'Failed to update profile photo' };
    }
};

const speedyAdminResetDriverPassword = async (driverId, newPassword) => {
    try {
        if (!driverId || !newPassword) return { ok: false, message: 'Missing required fields' };
        if (String(newPassword).length < 6) return { ok: false, message: 'Password must be at least 6 characters' };

        const drivers = speedyGetDrivers();
        const idx = drivers.findIndex((d) => d && d.id === driverId);
        if (idx === -1) return { ok: false, message: 'Driver not found' };

        const salt = speedyRandomHex(16);
        const hash = await speedyHashPassword(newPassword, salt);

        drivers[idx] = {
            ...drivers[idx],
            password: { salt, hash }
        };

        speedySaveDrivers(drivers);
        return { ok: true };
    } catch {
        return { ok: false, message: 'Failed to reset password' };
    }
};

const speedyDriverResetPassword = async ({ email, phone, newPassword }) => {
    try {
        const normalizedEmail = speedyNormalizeIdentifier(email);
        const normalizedPhone = speedyNormalizeIdentifier(phone);

        if (!normalizedEmail || !normalizedPhone || !newPassword) {
            return { ok: false, message: 'Missing required fields' };
        }
        if (String(newPassword).length < 6) {
            return { ok: false, message: 'Password must be at least 6 characters' };
        }

        const drivers = speedyGetDrivers();
        const idx = drivers.findIndex((d) => {
            return d && speedyNormalizeIdentifier(d.email) === normalizedEmail && speedyNormalizeIdentifier(d.phone) === normalizedPhone;
        });
        if (idx === -1) {
            return { ok: false, message: 'Driver not found. Please check your email and phone number.' };
        }

        const salt = speedyRandomHex(16);
        const hash = await speedyHashPassword(newPassword, salt);

        drivers[idx] = {
            ...drivers[idx],
            password: { salt, hash }
        };
        speedySaveDrivers(drivers);
        return { ok: true };
    } catch {
        return { ok: false, message: 'Failed to reset password' };
    }
};

const speedyLogin = async ({ role, username, password }) => {
    if (role === 'admin') {
        const expected = { username: "admin", password: "admin123" };
        if (username !== expected.username || password !== expected.password) {
            return { ok: false, message: "Invalid username or password" };
        }

        speedySetSession({
            role,
            username,
            loginTime: new Date().toISOString()
        });

        return { ok: true };
    }

    if (role === 'driver') {
        const driver = speedyGetDriverByIdentifier(username);
        if (!driver || !driver.password || !driver.password.salt || !driver.password.hash) {
            return { ok: false, message: "Invalid username or password" };
        }

        const computed = await speedyHashPassword(password, driver.password.salt);
        if (computed !== driver.password.hash) {
            return { ok: false, message: "Invalid username or password" };
        }

        speedySetSession({
            role,
            username: driver.email,
            driverId: driver.id,
            loginTime: new Date().toISOString()
        });

        return { ok: true };
    }

    return { ok: false, message: "Invalid role" };
};
