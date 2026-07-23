import { httpClient, shouldUseMockApi } from "./httpClient";

const storageKey = "aiofront_user";
const tokenKey = "aiofront_token";
const accountsKey = "aiofront_mock_accounts";
const pendingRegistrationKey = "aiofront_pending_registration";
const pendingResetKey = "aiofront_pending_reset";

const mockAccounts = {
  "super@ain.test": {
    id: "super-admin",
    name: "Platform Admin",
    role: "super-admin",
    roleLabel: "Super Admin",
    company: "All In One (AIO)",
    tenantId: null,
    permissions: ["manage_platform", "manage_tenants", "manage_billing"]
  },
  "admin@techcorp.test": {
    id: "tenant-admin",
    name: "Ahmed Mostafa",
    role: "tenant-admin",
    roleLabel: "Tenant Admin",
    company: "TechCorp Egypt",
    tenantId: "tenant_techcorp",
    permissions: ["manage_rooms", "manage_members", "upload_files", "view_reports"]
  },
  "employee@techcorp.test": {
    id: "end-user",
    name: "Mohamed Ahmed",
    role: "end-user",
    roleLabel: "End User",
    company: "TechCorp Egypt",
    tenantId: "tenant_techcorp",
    permissions: ["view_assigned_rooms", "view_files"]
  },
  "student@ain.test": {
    id: "student-user",
    name: "Mariam Hassan",
    role: "end-user",
    roleLabel: "Student",
    company: "Elite Academy",
    tenantId: "org-elite-academy",
    permissions: ["view_courses", "view_bookings", "view_assigned_rooms"]
  }
};

export const authService = {
  currentUser() {
    try {
      const saved = window.localStorage.getItem(storageKey) || window.sessionStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : null;
    } catch {
      clearSession();
      return null;
    }
  },

  async login({ email, password, remember = true }) {
    const normalizedEmail = String(email || "").trim().toLowerCase();

    if (!shouldUseMockApi()) {
      const result = await httpClient("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: normalizedEmail, password })
      });
      persistSession(result.user, result.token, remember);
      return result.user;
    }

    const account = { ...mockAccounts, ...readStoredAccounts() }[normalizedEmail];
    if (!account || !isValidPassword(account, password)) {
      throw authError("INVALID_CREDENTIALS", "Email or password is incorrect");
    }

    const { password: _password, ...safeAccount } = account;
    const user = { ...safeAccount, email: normalizedEmail };
    persistSession(user, `mock-token-${user.role}-${Date.now()}`, remember);
    return user;
  },

  async createPersonalAccount(payload) {
    const normalizedEmail = String(payload.email || "").trim().toLowerCase();
    const accounts = { ...mockAccounts, ...readStoredAccounts() };

    if (accounts[normalizedEmail]) {
      throw authError("ACCOUNT_EXISTS", "This email already has an account. Please sign in.");
    }

    const pending = {
      name: payload.name,
      email: normalizedEmail,
      password: payload.password,
      otp: "123456",
      createdAt: new Date().toISOString()
    };
    window.localStorage.setItem(pendingRegistrationKey, JSON.stringify(pending));
    return { email: normalizedEmail, delivery: "email", otp: pending.otp };
  },

  async verifyRegistrationOtp({ email, otp }) {
    const pending = readJson(pendingRegistrationKey);
    const normalizedEmail = String(email || pending?.email || "").trim().toLowerCase();

    if (!pending || pending.email !== normalizedEmail || String(otp) !== pending.otp) {
      throw authError("INVALID_CODE", "Invalid verification code");
    }

    const account = {
      id: `user-${Date.now()}`,
      name: pending.name,
      email: pending.email,
      password: pending.password,
      role: "end-user",
      roleLabel: "Workspace Member",
      company: "No workspace yet",
      tenantId: null,
      workspaceStatus: "none",
      permissions: ["pending_workspace"]
    };
    const accounts = readStoredAccounts();
    accounts[pending.email] = account;
    writeStoredAccounts(accounts);
    window.localStorage.removeItem(pendingRegistrationKey);

    const { password: _password, ...safeAccount } = account;
    window.localStorage.setItem(storageKey, JSON.stringify(safeAccount));
    window.localStorage.setItem(tokenKey, `mock-token-${safeAccount.role}-${Date.now()}`);
    return safeAccount;
  },

  async resendRegistrationOtp({ email }) {
    const pending = readJson(pendingRegistrationKey);
    const normalizedEmail = String(email || "").trim().toLowerCase();
    if (!pending || pending.email !== normalizedEmail) throw authError("REGISTRATION_EXPIRED", "Registration session expired");
    window.localStorage.setItem(pendingRegistrationKey, JSON.stringify({ ...pending, otp: "123456", createdAt: new Date().toISOString() }));
    return { email: normalizedEmail, delivery: "email", otp: "123456" };
  },

  async requestPasswordReset({ email }) {
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const account = { ...mockAccounts, ...readStoredAccounts() }[normalizedEmail];

    if (!account) {
      throw authError("ACCOUNT_NOT_FOUND", "No account found for this email");
    }

    const pending = { email: normalizedEmail, otp: "123456", createdAt: new Date().toISOString() };
    window.localStorage.setItem(pendingResetKey, JSON.stringify(pending));
    return { email: normalizedEmail, delivery: "email", otp: pending.otp };
  },

  async resetPassword({ email, otp, password }) {
    const pending = readJson(pendingResetKey);
    const normalizedEmail = String(email || pending?.email || "").trim().toLowerCase();

    if (!pending || pending.email !== normalizedEmail || String(otp) !== pending.otp) {
      throw authError("INVALID_CODE", "Invalid reset code");
    }

    const storedAccounts = readStoredAccounts();
    const sourceAccount = storedAccounts[normalizedEmail] || mockAccounts[normalizedEmail];
    if (!sourceAccount) throw new Error("Account no longer exists");
    storedAccounts[normalizedEmail] = { ...sourceAccount, password };
    writeStoredAccounts(storedAccounts);

    window.localStorage.removeItem(pendingResetKey);
    return { email: normalizedEmail };
  },

  async updateProfile(payload) {
    const current = this.currentUser();
    if (!current) throw authError("AUTH_REQUIRED", "Authentication required");

    if (!shouldUseMockApi()) {
      const result = await httpClient("/auth/me", { method: "PATCH", body: JSON.stringify(payload) });
      replacePersistedUser(result.user);
      return result.user;
    }

    const nextUser = { ...current, name: payload.name?.trim() || current.name, avatar: payload.avatar ?? current.avatar };
    const accounts = readStoredAccounts();
    const sourceAccount = accounts[current.email] || mockAccounts[current.email] || current;
    accounts[current.email] = { ...sourceAccount, ...nextUser };
    writeStoredAccounts(accounts);
    replacePersistedUser(nextUser);
    return nextUser;
  },

  async changePassword({ currentPassword, newPassword }) {
    const current = this.currentUser();
    if (!current) throw authError("AUTH_REQUIRED", "Authentication required");

    if (!shouldUseMockApi()) {
      return httpClient("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword })
      });
    }

    const allAccounts = { ...mockAccounts, ...readStoredAccounts() };
    const account = allAccounts[current.email];
    if (!account || !isValidPassword(account, currentPassword)) throw authError("CURRENT_PASSWORD_INCORRECT", "Current password is incorrect");
    const storedAccounts = readStoredAccounts();
    storedAccounts[current.email] = { ...account, password: newPassword };
    writeStoredAccounts(storedAccounts);
    return { changed: true };
  },

  async acceptInvitation({ token }) {
    const current = this.currentUser();
    if (!current) throw authError("AUTH_REQUIRED", "Authentication required");

    if (!shouldUseMockApi()) {
      const result = await httpClient(`/invites/${encodeURIComponent(token)}/accept`, { method: "POST" });
      replacePersistedUser(result.user);
      return result.user;
    }

    const nextUser = {
      ...current,
      role: "end-user",
      roleLabel: "Workspace Member",
      company: "TechCorp Egypt",
      tenantId: "tenant_techcorp",
      workspaceStatus: "active",
      permissions: ["view_assigned_rooms", "view_files"]
    };
    const accounts = readStoredAccounts();
    const sourceAccount = accounts[current.email] || mockAccounts[current.email] || current;
    accounts[current.email] = { ...sourceAccount, ...nextUser };
    writeStoredAccounts(accounts);
    replacePersistedUser(nextUser);
    return nextUser;
  },

  logout() {
    clearSession();
  }
};

function persistSession(user, token, remember) {
  clearSession();
  const storage = remember ? window.localStorage : window.sessionStorage;
  storage.setItem(storageKey, JSON.stringify(user));
  storage.setItem(tokenKey, token);
}

function replacePersistedUser(user) {
  const storage = window.localStorage.getItem(storageKey) ? window.localStorage : window.sessionStorage;
  storage.setItem(storageKey, JSON.stringify(user));
}

function clearSession() {
  window.localStorage.removeItem(storageKey);
  window.localStorage.removeItem(tokenKey);
  window.sessionStorage.removeItem(storageKey);
  window.sessionStorage.removeItem(tokenKey);
}

function isValidPassword(account, password) {
  if (account.password) return account.password === password;
  return String(password || "").length >= 6;
}

function readStoredAccounts() {
  return readJson(accountsKey) || {};
}

function writeStoredAccounts(accounts) {
  window.localStorage.setItem(accountsKey, JSON.stringify(accounts));
}

function readJson(key) {
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch {
    window.localStorage.removeItem(key);
    return null;
  }
}

function authError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}
