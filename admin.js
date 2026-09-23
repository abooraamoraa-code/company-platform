"use strict";

/*
|--------------------------------------------------------------------------
| Admin Dashboard
|--------------------------------------------------------------------------
| Compatible with:
| - admin.html
| - /api/auth/login
| - /api/auth/me
| - /api/admin/stats
| - /api/admin/projects
| - /api/admin/requests
| - /api/admin/applications
|--------------------------------------------------------------------------
*/

const ADMIN_API = "/api";

/*
|--------------------------------------------------------------------------
| Session
|--------------------------------------------------------------------------
*/

function getAdminToken() {
  return sessionStorage.getItem("admin_token");
}

function setAdminToken(token) {
  if (!token) {
    return;
  }

  sessionStorage.setItem("admin_token", token);
}

function clearAdminSession() {
  sessionStorage.removeItem("admin_token");

  window.location.href = "admin.html";
}

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function escapeHTML(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return escapeHTML(value);
  }

  return new Intl.DateTimeFormat("ar", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function formatStatus(status) {
  const value = String(status || "").toLowerCase();

  const labels = {
    new: "جديد",
    unread: "غير مقروء",
    read: "مقروء",
    pending: "قيد المراجعة",
    approved: "مقبول",
    rejected: "مرفوض",
    active: "نشط",
    inactive: "غير نشط",
    completed: "مكتمل",
    cancelled: "ملغي"
  };

  return labels[value] || status || "—";
}

function getStatusClass(status) {
  const value = String(status || "").toLowerCase();

  if (
    [
      "approved",
      "active",
      "completed",
      "published",
      "read"
    ].includes(value)
  ) {
    return "badge-success";
  }

  if (
    [
      "pending",
      "new",
      "unread"
    ].includes(value)
  ) {
    return "badge-warning";
  }

  if (
    [
      "rejected",
      "cancelled",
      "inactive",
      "disabled"
    ].includes(value)
  ) {
    return "badge-danger";
  }

  return "badge-warning";
}

function statusBadge(status) {
  return `
    <span class="badge ${getStatusClass(status)}">
      ${escapeHTML(formatStatus(status))}
    </span>
  `;
}

function setButtonLoading(button, loading, loadingText = "جاري التحميل...") {
  if (!button) {
    return;
  }

  if (loading) {
    if (!button.dataset.originalText) {
      button.dataset.originalText = button.textContent;
    }

    button.disabled = true;
    button.textContent = loadingText;
    button.style.opacity = "0.65";
  } else {
    button.disabled = false;

    if (button.dataset.originalText) {
      button.textContent = button.dataset.originalText;
    }

    button.style.opacity = "";
  }
}

/*
|--------------------------------------------------------------------------
| API
|--------------------------------------------------------------------------
*/

async function parseResponse(response) {
  const contentType =
    response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();

  return {
    success: response.ok,
    error: text || "Unexpected server response"
  };
}

async function adminRequest(endpoint, options = {}) {
  const token = getAdminToken();

  if (!token) {
    clearAdminSession();
    throw new Error("Authentication required");
  }

  const headers = {
    ...(options.body
      ? {
          "Content-Type": "application/json"
        }
      : {}),
    ...(options.headers || {}),
    Authorization: `Bearer ${token}`
  };

  const response = await fetch(
    `${ADMIN_API}${endpoint}`,
    {
      ...options,
      headers
    }
  );

  const data = await parseResponse(response);

  if (response.status === 401) {
    clearAdminSession();

    throw new Error(
      "انتهت جلسة تسجيل الدخول."
    );
  }

  if (response.status === 403) {
    throw new Error(
      data.error ||
        "ليس لديك صلاحية للوصول إلى هذا القسم."
    );
  }

  if (!response.ok) {
    throw new Error(
      data.error ||
        "حدث خطأ أثناء تنفيذ الطلب."
    );
  }

  return data;
}

/*
|--------------------------------------------------------------------------
| Login
|--------------------------------------------------------------------------
*/

async function adminLogin(email, password) {
  const response = await fetch(
    `${ADMIN_API}/auth/login`,
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json"
      },

      body: JSON.stringify({
        email,
        password
      })
    }
  );

  const data = await parseResponse(response);

  if (!response.ok) {
    throw new Error(
      data.error ||
        "بيانات تسجيل الدخول غير صحيحة."
    );
  }

  if (!data.token) {
    throw new Error(
      "الخادم لم يرجع رمز المصادقة."
    );
  }

  setAdminToken(data.token);

  return data;
}

/*
|--------------------------------------------------------------------------
| Authentication check
|--------------------------------------------------------------------------
*/

async function getCurrentAdmin() {
  return adminRequest("/auth/me");
}

/*
|--------------------------------------------------------------------------
| Dashboard API
|--------------------------------------------------------------------------
*/

async function loadDashboard() {
  return adminRequest("/admin/stats");
}

async function loadAdminProjects() {
  return adminRequest("/admin/projects");
}

async function loadClientRequests() {
  return adminRequest("/admin/requests");
}

async function loadApplications() {
  return adminRequest("/admin/applications");
}

/*
|--------------------------------------------------------------------------
| Login UI
|--------------------------------------------------------------------------
*/

function showLoginMessage(message, type = "error") {
  const element =
    document.querySelector("#loginMessage");

  if (!element) {
    return;
  }

  element.textContent = message || "";

  if (type === "success") {
    element.style.color = "#86efac";
  } else {
    element.style.color = "#fca5a5";
  }
}

function setDashboardVisible(visible) {
  const loginScreen =
    document.querySelector("#loginScreen");

  const dashboard =
    document.querySelector("#dashboard");

  if (!loginScreen || !dashboard) {
    return;
  }

  if (visible) {
    loginScreen.style.display = "none";
    dashboard.classList.add("active");
  } else {
    loginScreen.style.display = "";
    dashboard.classList.remove("active");
  }
}

function updateAdminUser(user) {
  if (!user) {
    return;
  }

  const name =
    document.querySelector("#adminName");

  const role =
    document.querySelector("#adminRole");

  const avatar =
    document.querySelector(".avatar");

  if (name) {
    name.textContent =
      user.full_name ||
      user.email ||
      "Admin";
  }

  if (role) {
    const roleLabels = {
      admin: "Administrator",
      manager: "Manager",
      employee: "Employee"
    };

    role.textContent =
      roleLabels[user.role] ||
      user.role ||
      "Administrator";
  }

  if (avatar) {
    const displayName =
      user.full_name ||
      user.email ||
      "A";

    avatar.textContent =
      displayName
        .trim()
        .charAt(0)
        .toUpperCase();
  }
}

async function handleLogin(event) {
  event.preventDefault();

  const emailInput =
    document.querySelector("#loginEmail");

  const passwordInput =
    document.querySelector("#loginPassword");

  const button =
    document.querySelector(
      "#loginForm button[type='submit']"
    );

  if (!emailInput || !passwordInput) {
    return;
  }

  const email =
    emailInput.value.trim();

  const password =
    passwordInput.value;

  if (!email || !password) {
    showLoginMessage(
      "يرجى إدخال البريد الإلكتروني وكلمة المرور."
    );

    return;
  }

  setButtonLoading(
    button,
    true,
    "جاري تسجيل الدخول..."
  );

  showLoginMessage("");

  try {
    const data =
      await adminLogin(
        email,
        password
      );

    updateAdminUser(data.user);

    setDashboardVisible(true);

    showLoginMessage("");

    await initializeDashboard();
  } catch (error) {
    console.error(
      "[ADMIN LOGIN]",
      error
    );

    clearAdminTokenOnly();

    showLoginMessage(
      error.message ||
        "فشل تسجيل الدخول."
    );
  } finally {
    setButtonLoading(
      button,
      false
    );
  }
}

function clearAdminTokenOnly() {
  sessionStorage.removeItem(
    "admin_token"
  );
}

/*
|--------------------------------------------------------------------------
| Navigation
|--------------------------------------------------------------------------
*/

const SECTION_META = {
  overview: {
    title: "نظرة عامة",
    description:
      "متابعة حالة المنصة والنشاط الأخير."
  },

  projects: {
    title: "المشاريع",
    description:
      "عرض المشاريع الموجودة في المنصة."
  },

  services: {
    title: "الخدمات",
    description:
      "عرض الخدمات المنشورة في المنصة."
  },

  requests: {
    title: "طلبات العملاء",
    description:
      "متابعة طلبات العملاء والمشاريع الجديدة."
  },

  applications: {
    title: "طلبات الوظائف",
    description:
      "متابعة المتقدمين للوظائف."
  },

  messages: {
    title: "الرسائل",
    description:
      "إدارة الرسائل الواردة من الموقع."
  },

  settings: {
    title: "الإعدادات",
    description:
      "إعدادات منصة الإدارة."
  }
};

function setActiveSection(sectionName) {
  const meta =
    SECTION_META[sectionName] ||
    SECTION_META.overview;

  document
    .querySelectorAll(".admin-section")
    .forEach((section) => {
      section.classList.remove("active");
    });

  const target =
    document.querySelector(
      `#section-${sectionName}`
    );

  if (target) {
    target.classList.add("active");
  }

  document
    .querySelectorAll(".side-link[data-section]")
    .forEach((link) => {
      link.classList.toggle(
        "active",
        link.dataset.section === sectionName
      );
    });

  const title =
    document.querySelector("#pageTitle");

  const description =
    document.querySelector(
      "#pageDescription"
    );

  if (title) {
    title.textContent = meta.title;
  }

  if (description) {
    description.textContent =
      meta.description;
  }

  closeMobileSidebar();

  if (sectionName === "overview") {
    loadDashboardData();
  }

  if (sectionName === "projects") {
    loadProjectsData();
  }

  if (sectionName === "services") {
    loadServicesData();
  }

  if (sectionName === "requests") {
    loadRequestsData();
  }

  if (sectionName === "applications") {
    loadApplicationsData();
  }

  if (sectionName === "messages") {
    loadMessagesData();
  }
}

function setupNavigation() {
  document
    .querySelectorAll(
      ".side-link[data-section]"
    )
    .forEach((link) => {
      link.addEventListener(
        "click",
        () => {
          setActiveSection(
            link.dataset.section
          );
        }
      );
    });
}

/*
|--------------------------------------------------------------------------
| Mobile sidebar
|--------------------------------------------------------------------------
*/

function setupMobileMenu() {
  const button =
    document.querySelector(
      "#mobileMenuButton"
    );

  const sidebar =
    document.querySelector("#sidebar");

  if (!button || !sidebar) {
    return;
  }

  button.addEventListener(
    "click",
    () => {
      sidebar.classList.toggle("open");
    }
  );

  document.addEventListener(
    "click",
    (event) => {
      if (
        window.innerWidth > 900
      ) {
        return;
      }

      if (
        sidebar.classList.contains("open") &&
        !sidebar.contains(event.target) &&
        !button.contains(event.target)
      ) {
        sidebar.classList.remove("open");
      }
    }
  );
}

function closeMobileSidebar() {
  const sidebar =
    document.querySelector("#sidebar");

  if (sidebar) {
    sidebar.classList.remove("open");
  }
}

/*
|--------------------------------------------------------------------------
| Dashboard statistics
|--------------------------------------------------------------------------
*/

async function loadDashboardData() {
  try {
    const data =
      await loadDashboard();

    const stats =
      data.stats || {};

    const projects =
      document.querySelector(
        "#statProjects"
      );

    const requests =
      document.querySelector(
        "#statRequests"
      );

    const applications =
      document.querySelector(
        "#statApplications"
      );

    const messages =
      document.querySelector(
        "#statMessages"
      );

    const users =
      document.querySelector(
        "#statUsers"
      );

    if (projects) {
      projects.textContent =
        stats.projects ?? 0;
    }

    if (requests) {
      requests.textContent =
        stats.new_requests ?? 0;
    }

    if (applications) {
      applications.textContent =
        stats.new_applications ?? 0;
    }

    if (messages) {
      messages.textContent =
        stats.unread_messages ?? 0;
    }

    if (users) {
      users.textContent =
        stats.active_users ?? 0;
    }
  } catch (error) {
    console.error(
      "[DASHBOARD]",
      error
    );
  }
}

/*
|--------------------------------------------------------------------------
| Projects
|--------------------------------------------------------------------------
*/

async function loadProjectsData() {
  const table =
    document.querySelector(
      "#projectsTable"
    );

  if (!table) {
    return;
  }

  table.innerHTML = `
    <tr>
      <td colspan="4">
        جاري تحميل المشاريع...
      </td>
    </tr>
  `;

  try {
    const data =
      await loadAdminProjects();

    const projects =
      Array.isArray(data.projects)
        ? data.projects
        : [];

    if (!projects.length) {
      table.innerHTML = `
        <tr>
          <td colspan="4">
            لا توجد مشاريع حالياً.
          </td>
        </tr>
      `;

      return;
    }

    table.innerHTML =
      projects
        .map((project) => {
          const published =
            project.is_published;

          const featured =
            project.is_featured;

          return `
            <tr>
              <td>
                <strong>
                  ${escapeHTML(
                    project.title || "—"
                  )}
                </strong>

                ${
                  project.slug
                    ? `
                      <div style="
                        color:#64748b;
                        font-size:11px;
                        margin-top:4px;
                      ">
                        ${escapeHTML(
                          project.slug
                        )}
                      </div>
                    `
                    : ""
                }
              </td>

              <td>
                ${
                  published
                    ? statusBadge("active")
                    : statusBadge("inactive")
                }
              </td>

              <td>
                ${
                  featured
                    ? statusBadge("approved")
                    : "—"
                }
              </td>

              <td>
                ${formatDate(
                  project.created_at
                )}
              </td>
            </tr>
          `;
        })
        .join("");
  } catch (error) {
    console.error(
      "[PROJECTS]",
      error
    );

    table.innerHTML = `
      <tr>
        <td colspan="4">
          تعذر تحميل المشاريع.
        </td>
      </tr>
    `;
  }
}

/*
|--------------------------------------------------------------------------
| Services
|--------------------------------------------------------------------------
*/

async function loadServicesData() {
  const table =
    document.querySelector(
      "#servicesTable"
    );

  if (!table) {
    return;
  }

  table.innerHTML = `
    <tr>
      <td colspan="3">
        جاري تحميل الخدمات...
      </td>
    </tr>
  `;

  try {
    const response =
      await adminRequest(
        "/services"
      );

    const services =
      Array.isArray(response.services)
        ? response.services
        : [];

    if (!services.length) {
      table.innerHTML = `
        <tr>
          <td colspan="3">
            لا توجد خدمات حالياً.
          </td>
        </tr>
      `;

      return;
    }

    table.innerHTML =
      services
        .map((service) => {
          const active =
            service.is_active !== false;

          return `
            <tr>
              <td>
                <strong>
                  ${escapeHTML(
                    service.title || "—"
                  )}
                </strong>
              </td>

              <td>
                ${
                  service.slug
                    ? `
                      <code style="
                        color:#a5b4fc;
                        font-size:12px;
                      ">
                        /services/${escapeHTML(
                          service.slug
                        )}
                      </code>
                    `
                    : "—"
                }
              </td>

              <td>
                ${
                  active
                    ? statusBadge("active")
                    : statusBadge("inactive")
                }
              </td>
            </tr>
          `;
        })
        .join("");
  } catch (error) {
    console.error(
      "[SERVICES]",
      error
    );

    table.innerHTML = `
      <tr>
        <td colspan="3">
          تعذر تحميل الخدمات.
        </td>
      </tr>
    `;
  }
}

/*
|--------------------------------------------------------------------------
| Client Requests
|--------------------------------------------------------------------------
*/

async function loadRequestsData() {
  const table =
    document.querySelector(
      "#requestsTable"
    );

  if (!table) {
    return;
  }

  table.innerHTML = `
    <tr>
      <td colspan="6">
        جاري تحميل طلبات العملاء...
      </td>
    </tr>
  `;

  try {
    const data =
      await loadClientRequests();

    const requests =
      Array.isArray(data.requests)
        ? data.requests
        : [];

    if (!requests.length) {
      table.innerHTML = `
        <tr>
          <td colspan="6">
            لا توجد طلبات عملاء حالياً.
          </td>
        </tr>
      `;

      return;
    }

    table.innerHTML =
      requests
        .map((request) => {
          return `
            <tr>
              <td>
                <strong>
                  ${escapeHTML(
                    request.name || "—"
                  )}
                </strong>
              </td>

              <td>
                ${escapeHTML(
                  request.email || "—"
                )}
              </td>

              <td>
                ${escapeHTML(
                  request.project_type || "—"
                )}
              </td>

              <td>
                ${escapeHTML(
                  request.budget || "—"
                )}
              </td>

              <td>
                ${statusBadge(
                  request.status
                )}
              </td>

              <td>
                ${formatDate(
                  request.created_at
                )}
              </td>
            </tr>
          `;
        })
        .join("");
  } catch (error) {
    console.error(
      "[REQUESTS]",
      error
    );

    table.innerHTML = `
      <tr>
        <td colspan="6">
          تعذر تحميل طلبات العملاء.
        </td>
      </tr>
    `;
  }
}

/*
|--------------------------------------------------------------------------
| Job Applications
|--------------------------------------------------------------------------
*/

async function loadApplicationsData() {
  const table =
    document.querySelector(
      "#applicationsTable"
    );

  if (!table) {
    return;
  }

  table.innerHTML = `
    <tr>
      <td colspan="6">
        جاري تحميل طلبات الوظائف...
      </td>
    </tr>
  `;

  try {
    const data =
      await loadApplications();

    const applications =
      Array.isArray(data.applications)
        ? data.applications
        : [];

    if (!applications.length) {
      table.innerHTML = `
        <tr>
          <td colspan="6">
            لا توجد طلبات توظيف حالياً.
          </td>
        </tr>
      `;

      return;
    }

    table.innerHTML =
      applications
        .map((application) => {
          return `
            <tr>
              <td>
                <strong>
                  ${escapeHTML(
                    application.full_name ||
                      "—"
                  )}
                </strong>

                ${
                  application.email
                    ? `
                      <div style="
                        color:#64748b;
                        font-size:11px;
                        margin-top:4px;
                      ">
                        ${escapeHTML(
                          application.email
                        )}
                      </div>
                    `
                    : ""
                }
              </td>

              <td>
                ${escapeHTML(
                  application.specialty ||
                    "—"
                )}
              </td>

              <td>
                ${
                  application.experience_years !==
                  null &&
                  application.experience_years !==
                    undefined
                    ? `${escapeHTML(
                        application.experience_years
                      )} سنة`
                    : "—"
                }
              </td>

              <td>
                ${escapeHTML(
                  application.job_title ||
                    "—"
                )}
              </td>

              <td>
                ${statusBadge(
                  application.status
                )}
              </td>

              <td>
                ${formatDate(
                  application.created_at
                )}
              </td>
            </tr>
          `;
        })
        .join("");
  } catch (error) {
    console.error(
      "[APPLICATIONS]",
      error
    );

    table.innerHTML = `
      <tr>
        <td colspan="6">
          تعذر تحميل طلبات الوظائف.
        </td>
      </tr>
    `;
  }
}

/*
|--------------------------------------------------------------------------
| Messages
|--------------------------------------------------------------------------
|
| ملاحظة:
| api.js الحالي لا يحتوي على GET /admin/messages
| لذلك لن نحاول استدعاء endpoint غير موجود.
|--------------------------------------------------------------------------
*/

async function loadMessagesData() {
  const table =
    document.querySelector(
      "#messagesTable"
    );

  if (!table) {
    return;
  }

  table.innerHTML = `
    <tr>
      <td colspan="5">
        API الرسائل الإدارية غير مضاف بعد.
      </td>
    </tr>
  `;
}

/*
|--------------------------------------------------------------------------
| Refresh buttons
|--------------------------------------------------------------------------
*/

function setupRefreshButtons() {
  const dashboardButton =
    document.querySelector(
      "#refreshDashboard"
    );

  if (dashboardButton) {
    dashboardButton.addEventListener(
      "click",
      async () => {
        setButtonLoading(
          dashboardButton,
          true,
          "جاري التحديث..."
        );

        try {
          await loadDashboardData();
        } finally {
          setButtonLoading(
            dashboardButton,
            false
          );
        }
      }
    );
  }

  const projectsButton =
    document.querySelector(
      "#refreshProjects"
    );

  if (projectsButton) {
    projectsButton.addEventListener(
      "click",
      async () => {
        setButtonLoading(
          projectsButton,
          true,
          "جاري التحديث..."
        );

        try {
          await loadProjectsData();
        } finally {
          setButtonLoading(
            projectsButton,
            false
          );
        }
      }
    );
  }

  const requestsButton =
    document.querySelector(
      "#refreshRequests"
    );

  if (requestsButton) {
    requestsButton.addEventListener(
      "click",
      async () => {
        setButtonLoading(
          requestsButton,
          true,
          "جاري التحديث..."
        );

        try {
          await loadRequestsData();
        } finally {
          setButtonLoading(
            requestsButton,
            false
          );
        }
      }
    );
  }

  const applicationsButton =
    document.querySelector(
      "#refreshApplications"
    );

  if (applicationsButton) {
    applicationsButton.addEventListener(
      "click",
      async () => {
        setButtonLoading(
          applicationsButton,
          true,
          "جاري التحديث..."
        );

        try {
          await loadApplicationsData();
        } finally {
          setButtonLoading(
            applicationsButton,
            false
          );
        }
      }
    );
  }
}

/*
|--------------------------------------------------------------------------
| Logout
|--------------------------------------------------------------------------
*/

function setupLogout() {
  const button =
    document.querySelector(
      "#logoutButton"
    );

  if (!button) {
    return;
  }

  button.addEventListener(
    "click",
    () => {
      clearAdminSession();
    }
  );
}

/*
|--------------------------------------------------------------------------
| Initial dashboard
|--------------------------------------------------------------------------
*/

async function initializeDashboard() {
  setDashboardVisible(true);

  try {
    const data =
      await getCurrentAdmin();

    if (data.user) {
      updateAdminUser(
        data.user
      );
    }
  } catch (error) {
    console.error(
      "[AUTH ME]",
      error
    );

    return;
  }

  await loadDashboardData();
}

/*
|--------------------------------------------------------------------------
| Initial application
|--------------------------------------------------------------------------
*/

async function initializeAdminPage() {
  setupNavigation();
  setupMobileMenu();
  setupRefreshButtons();
  setupLogout();

  const loginForm =
    document.querySelector(
      "#loginForm"
    );

  if (loginForm) {
    loginForm.addEventListener(
      "submit",
      handleLogin
    );
  }

  const token =
    getAdminToken();

  if (!token) {
    setDashboardVisible(false);
    return;
  }

  try {
    await initializeDashboard();
  } catch (error) {
    console.error(
      "[ADMIN INIT]",
      error
    );

    clearAdminTokenOnly();
    setDashboardVisible(false);
  }
}

/*
|--------------------------------------------------------------------------
| Start
|--------------------------------------------------------------------------
*/

document.addEventListener(
  "DOMContentLoaded",
  initializeAdminPage
);
