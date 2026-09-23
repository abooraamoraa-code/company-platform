"use strict";

/*
|--------------------------------------------------------------------------
| Admin Dashboard Frontend
|--------------------------------------------------------------------------
| متوافق مع:
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

const PAGE_CONFIG = {
  overview: {
    title: "نظرة عامة",
    description:
      "متابعة حالة المنصة والنشاط الأخير."
  },

  projects: {
    title: "المشاريع",
    description:
      "إدارة المشاريع الموجودة في المنصة."
  },

  services: {
    title: "الخدمات",
    description:
      "عرض الخدمات الحالية في المنصة."
  },

  requests: {
    title: "طلبات العملاء",
    description:
      "متابعة طلبات العملاء والمشاريع الجديدة."
  },

  applications: {
    title: "طلبات الوظائف",
    description:
      "متابعة طلبات التوظيف الواردة."
  },

  messages: {
    title: "الرسائل",
    description:
      "متابعة الرسائل الواردة من العملاء."
  },

  settings: {
    title: "الإعدادات",
    description:
      "إعدادات ومعلومات المنصة."
  }
};


/*
|--------------------------------------------------------------------------
| Session
|--------------------------------------------------------------------------
*/

function getAdminToken() {
  return sessionStorage.getItem(
    "admin_token"
  );
}

function setAdminToken(token) {
  if (!token) {
    return;
  }

  sessionStorage.setItem(
    "admin_token",
    token
  );
}

function clearAdminSession() {
  sessionStorage.removeItem(
    "admin_token"
  );

  window.location.href = "admin.html";
}


/*
|--------------------------------------------------------------------------
| HTML escaping
|--------------------------------------------------------------------------
*/

function escapeHTML(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


/*
|--------------------------------------------------------------------------
| Generic helpers
|--------------------------------------------------------------------------
*/

function formatDate(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return escapeHTML(value);
  }

  return new Intl.DateTimeFormat(
    "ar",
    {
      dateStyle: "medium",
      timeStyle: "short"
    }
  ).format(date);
}

function formatBooleanBadge(
  value,
  trueText = "نعم",
  falseText = "لا"
) {
  return value
    ? `<span class="badge badge-success">
        ${escapeHTML(trueText)}
       </span>`
    : `<span class="badge badge-warning">
        ${escapeHTML(falseText)}
       </span>`;
}

function statusBadge(status) {
  const normalized =
    String(status || "")
      .toLowerCase()
      .trim();

  const map = {
    new: {
      text: "جديد",
      className: "badge-warning"
    },

    unread: {
      text: "غير مقروء",
      className: "badge-warning"
    },

    read: {
      text: "مقروء",
      className: "badge-success"
    },

    active: {
      text: "نشط",
      className: "badge-success"
    },

    completed: {
      text: "مكتمل",
      className: "badge-success"
    },

    pending: {
      text: "قيد الانتظار",
      className: "badge-warning"
    },

    rejected: {
      text: "مرفوض",
      className: "badge-danger"
    },

    closed: {
      text: "مغلق",
      className: "badge-danger"
    },

    inactive: {
      text: "غير نشط",
      className: "badge-danger"
    }
  };

  const item =
    map[normalized] || {
      text: status || "—",
      className: "badge-warning"
    };

  return `
    <span class="badge ${item.className}">
      ${escapeHTML(item.text)}
    </span>
  `;
}

function setElementText(
  selector,
  value
) {
  const element =
    document.querySelector(selector);

  if (element) {
    element.textContent =
      value ?? "—";
  }
}


/*
|--------------------------------------------------------------------------
| API
|--------------------------------------------------------------------------
*/

async function parseResponse(response) {
  const contentType =
    response.headers.get(
      "content-type"
    ) || "";

  if (
    contentType.includes(
      "application/json"
    )
  ) {
    return response.json();
  }

  const text =
    await response.text();

  return {
    error:
      text ||
      "Unexpected server response"
  };
}

async function adminRequest(
  endpoint,
  options = {}
) {
  const token =
    getAdminToken();

  if (!token) {
    clearAdminSession();

    throw new Error(
      "Authentication required"
    );
  }

  const headers = {
    ...(options.body
      ? {
          "Content-Type":
            "application/json"
        }
      : {}),
    ...(options.headers || {}),
    Authorization:
      `Bearer ${token}`
  };

  const response =
    await fetch(
      `${ADMIN_API}${endpoint}`,
      {
        ...options,
        headers
      }
    );

  const data =
    await parseResponse(response);

  if (response.status === 401) {
    clearAdminSession();

    throw new Error(
      "Authentication expired"
    );
  }

  if (response.status === 403) {
    throw new Error(
      data.error ||
        "ليس لديك صلاحية لتنفيذ هذا الإجراء."
    );
  }

  if (!response.ok) {
    throw new Error(
      data.error ||
        "Admin request failed"
    );
  }

  return data;
}


/*
|--------------------------------------------------------------------------
| Login
|--------------------------------------------------------------------------
*/

async function adminLogin(
  email,
  password
) {
  const response =
    await fetch(
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

  const data =
    await parseResponse(response);

  if (!response.ok) {
    throw new Error(
      data.error ||
        "Login failed"
    );
  }

  if (!data.token) {
    throw new Error(
      "لم يتم استلام رمز المصادقة من الخادم."
    );
  }

  setAdminToken(
    data.token
  );

  return data;
}


/*
|--------------------------------------------------------------------------
| Authentication
|--------------------------------------------------------------------------
*/

async function loadCurrentAdmin() {
  return adminRequest(
    "/auth/me"
  );
}


/*
|--------------------------------------------------------------------------
| Dashboard API
|--------------------------------------------------------------------------
*/

async function loadDashboard() {
  return adminRequest(
    "/admin/stats"
  );
}

async function loadAdminProjects() {
  return adminRequest(
    "/admin/projects"
  );
}

async function loadClientRequests() {
  return adminRequest(
    "/admin/requests"
  );
}

async function loadApplications() {
  return adminRequest(
    "/admin/applications"
  );
}


/*
|--------------------------------------------------------------------------
| Dashboard UI
|--------------------------------------------------------------------------
*/

function showDashboard() {
  const loginScreen =
    document.querySelector(
      "#loginScreen"
    );

  const dashboard =
    document.querySelector(
      "#dashboard"
    );

  if (loginScreen) {
    loginScreen.style.display =
      "none";
  }

  if (dashboard) {
    dashboard.classList.add(
      "active"
    );
  }
}

function showLogin() {
  const loginScreen =
    document.querySelector(
      "#loginScreen"
    );

  const dashboard =
    document.querySelector(
      "#dashboard"
    );

  if (loginScreen) {
    loginScreen.style.display =
      "grid";
  }

  if (dashboard) {
    dashboard.classList.remove(
      "active"
    );
  }
}


/*
|--------------------------------------------------------------------------
| Login form
|--------------------------------------------------------------------------
*/

function setupLogin() {
  const form =
    document.querySelector(
      "#loginForm"
    );

  if (!form) {
    return;
  }

  const message =
    document.querySelector(
      "#loginMessage"
    );

  const button =
    form.querySelector(
      'button[type="submit"]'
    );

  form.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      if (message) {
        message.textContent =
          "";
      }

      const email =
        document
          .querySelector(
            "#loginEmail"
          )
          ?.value
          .trim();

      const password =
        document
          .querySelector(
            "#loginPassword"
          )
          ?.value;

      if (!email || !password) {
        if (message) {
          message.textContent =
            "يرجى إدخال البريد الإلكتروني وكلمة المرور.";
        }

        return;
      }

      const originalText =
        button
          ? button.textContent
          : "";

      if (button) {
        button.disabled = true;
        button.textContent =
          "جاري تسجيل الدخول...";
      }

      try {
        const data =
          await adminLogin(
            email,
            password
          );

        updateAdminUser(
          data.user
        );

        showDashboard();

        await initializeDashboard();

      } catch (error) {
        console.error(
          "[ADMIN LOGIN]",
          error
        );

        if (message) {
          message.textContent =
            error.message ||
            "فشل تسجيل الدخول.";
        }

      } finally {
        if (button) {
          button.disabled =
            false;

          button.textContent =
            originalText ||
            "تسجيل الدخول";
        }
      }
    }
  );
}


/*
|--------------------------------------------------------------------------
| Admin user
|--------------------------------------------------------------------------
*/

function updateAdminUser(
  user
) {
  if (!user) {
    return;
  }

  const name =
    user.full_name ||
    user.email ||
    "Admin";

  const role =
    user.role ||
    "Administrator";

  setElementText(
    "#adminName",
    name
  );

  setElementText(
    "#adminRole",
    role
  );

  const avatar =
    document.querySelector(
      "#adminUser .avatar"
    );

  if (avatar) {
    avatar.textContent =
      name
        .trim()
        .charAt(0)
        .toUpperCase() ||
      "A";
  }
}


/*
|--------------------------------------------------------------------------
| Statistics
|--------------------------------------------------------------------------
*/

async function refreshStats() {
  const data =
    await loadDashboard();

  const stats =
    data.stats || {};

  setElementText(
    "#statProjects",
    stats.projects ?? 0
  );

  setElementText(
    "#statRequests",
    stats.new_requests ?? 0
  );

  setElementText(
    "#statApplications",
    stats.new_applications ?? 0
  );

  setElementText(
    "#statMessages",
    stats.unread_messages ?? 0
  );

  setElementText(
    "#statUsers",
    stats.active_users ?? 0
  );

  return data;
}


/*
|--------------------------------------------------------------------------
| Projects
|--------------------------------------------------------------------------
*/

async function refreshProjects() {
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
      Array.isArray(
        data.projects
      )
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
        .map(
          (project) => `
            <tr>
              <td>
                <strong>
                  ${escapeHTML(
                    project.title ||
                      "بدون عنوان"
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
                  project.is_published
                    ? `
                      <span class="badge badge-success">
                        منشور
                      </span>
                    `
                    : `
                      <span class="badge badge-warning">
                        غير منشور
                      </span>
                    `
                }
              </td>

              <td>
                ${formatBooleanBadge(
                  project.is_featured,
                  "مميز",
                  "عادي"
                )}
              </td>

              <td>
                ${formatDate(
                  project.created_at
                )}
              </td>
            </tr>
          `
        )
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
          ${escapeHTML(
            error.message || ""
          )}
        </td>
      </tr>
    `;
  }
}


/*
|--------------------------------------------------------------------------
| Services
|--------------------------------------------------------------------------
|
| لا يوجد حالياً endpoint إداري للخدمات في api.js.
| لذلك نعرض الخدمات من الـpublic API بشكل آمن للقراءة فقط.
|--------------------------------------------------------------------------
*/

async function loadServices() {
  const response =
    await fetch(
      `${ADMIN_API}/services`
    );

  const data =
    await parseResponse(response);

  if (!response.ok) {
    throw new Error(
      data.error ||
        "Unable to load services"
    );
  }

  return data;
}

async function refreshServices() {
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
    const data =
      await loadServices();

    const services =
      Array.isArray(
        data.services
      )
        ? data.services
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
        .map(
          (service) => `
            <tr>
              <td>
                <strong>
                  ${escapeHTML(
                    service.title ||
                      "بدون عنوان"
                  )}
                </strong>
              </td>

              <td>
                ${
                  service.slug
                    ? `
                      <code>
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
                  service.is_active
                    ? `
                      <span class="badge badge-success">
                        نشط
                      </span>
                    `
                    : `
                      <span class="badge badge-danger">
                        غير نشط
                      </span>
                    `
                }
              </td>
            </tr>
          `
        )
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
          ${escapeHTML(
            error.message || ""
          )}
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

async function refreshRequests() {
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
      Array.isArray(
        data.requests
      )
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
        .map(
          (request) => `
            <tr>
              <td>
                ${escapeHTML(
                  request.name ||
                    "—"
                )}
              </td>

              <td>
                ${escapeHTML(
                  request.email ||
                    "—"
                )}
              </td>

              <td>
                ${escapeHTML(
                  request.project_type ||
                    "—"
                )}
              </td>

              <td>
                ${escapeHTML(
                  request.budget ||
                    "—"
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
          `
        )
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
          ${escapeHTML(
            error.message || ""
          )}
        </td>
      </tr>
    `;
  }
}


/*
|--------------------------------------------------------------------------
| Applications
|--------------------------------------------------------------------------
*/

async function refreshApplications() {
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
      Array.isArray(
        data.applications
      )
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
        .map(
          (application) => `
            <tr>
              <td>
                ${escapeHTML(
                  application.full_name ||
                    "—"
                )}
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
                    "وظيفة غير محددة"
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
          `
        )
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
          ${escapeHTML(
            error.message || ""
          )}
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
| api.js الحالي لا يحتوي على:
| GET /api/admin/messages
|
| لذلك لا نقوم بطلب endpoint غير موجود.
|--------------------------------------------------------------------------
*/

function renderMessagesNotice() {
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
        إدارة الرسائل تحتاج إضافة
        endpoint إداري في الخادم.
      </td>
    </tr>
  `;
}


/*
|--------------------------------------------------------------------------
| Navigation
|--------------------------------------------------------------------------
*/

function setActiveSection(
  sectionName
) {
  const sections =
    document.querySelectorAll(
      ".admin-section"
    );

  sections.forEach(
    (section) => {
      section.classList.remove(
        "active"
      );
    }
  );

  const target =
    document.querySelector(
      `#section-${sectionName}`
    );

  if (target) {
    target.classList.add(
      "active"
    );
  }

  const links =
    document.querySelectorAll(
      ".side-link[data-section]"
    );

  links.forEach(
    (link) => {
      link.classList.toggle(
        "active",
        link.dataset.section ===
          sectionName
      );
    }
  );

  const config =
    PAGE_CONFIG[
      sectionName
    ] || PAGE_CONFIG.overview;

  setElementText(
    "#pageTitle",
    config.title
  );

  setElementText(
    "#pageDescription",
    config.description
  );

  closeMobileSidebar();

  if (
    sectionName ===
    "projects"
  ) {
    refreshProjects();
  }

  if (
    sectionName ===
    "services"
  ) {
    refreshServices();
  }

  if (
    sectionName ===
    "requests"
  ) {
    refreshRequests();
  }

  if (
    sectionName ===
    "applications"
  ) {
    refreshApplications();
  }

  if (
    sectionName ===
    "messages"
  ) {
    renderMessagesNotice();
  }
}

function setupNavigation() {
  const links =
    document.querySelectorAll(
      ".side-link[data-section]"
    );

  links.forEach(
    (link) => {
      link.addEventListener(
        "click",
        () => {
          const section =
            link.dataset.section;

          if (section) {
            setActiveSection(
              section
            );
          }
        }
      );
    }
  );
}


/*
|--------------------------------------------------------------------------
| Mobile sidebar
|--------------------------------------------------------------------------
*/

function openMobileSidebar() {
  const sidebar =
    document.querySelector(
      "#sidebar"
    );

  if (sidebar) {
    sidebar.classList.add(
      "open"
    );
  }
}

function closeMobileSidebar() {
  const sidebar =
    document.querySelector(
      "#sidebar"
    );

  if (sidebar) {
    sidebar.classList.remove(
      "open"
    );
  }
}

function setupMobileMenu() {
  const button =
    document.querySelector(
      "#mobileMenuButton"
    );

  const sidebar =
    document.querySelector(
      "#sidebar"
    );

  if (!button || !sidebar) {
    return;
  }

  button.addEventListener(
    "click",
    () => {
      sidebar.classList.toggle(
        "open"
      );
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
        !sidebar.contains(
          event.target
        ) &&
        !button.contains(
          event.target
        )
      ) {
        closeMobileSidebar();
      }
    }
  );
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
        await runWithButtonState(
          dashboardButton,
          "جاري التحديث...",
          async () => {
            await refreshStats();
          }
        );
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
        await runWithButtonState(
          projectsButton,
          "جاري التحديث...",
          async () => {
            await refreshProjects();
          }
        );
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
        await runWithButtonState(
          requestsButton,
          "جاري التحديث...",
          async () => {
            await refreshRequests();
          }
        );
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
        await runWithButtonState(
          applicationsButton,
          "جاري التحديث...",
          async () => {
            await refreshApplications();
          }
        );
      }
    );
  }
}

async function runWithButtonState(
  button,
  loadingText,
  callback
) {
  const originalText =
    button.textContent;

  button.disabled = true;

  button.textContent =
    loadingText;

  try {
    await callback();
  } catch (error) {
    console.error(error);
  } finally {
    button.disabled = false;

    button.textContent =
      originalText;
  }
}


/*
|--------------------------------------------------------------------------
| Initialize authenticated dashboard
|--------------------------------------------------------------------------
*/

async function initializeDashboard() {
  try {
    const userData =
      await loadCurrentAdmin();

    updateAdminUser(
      userData.user
    );

    showDashboard();

    await refreshStats();

  } catch (error) {
    console.error(
      "[ADMIN INIT]",
      error
    );

    showLogin();
  }
}


/*
|--------------------------------------------------------------------------
| Startup
|--------------------------------------------------------------------------
*/

document.addEventListener(
  "DOMContentLoaded",
  async () => {
    setupLogin();
    setupNavigation();
    setupMobileMenu();
    setupLogout();
    setupRefreshButtons();

    const token =
      getAdminToken();

    if (!token) {
      showLogin();
      return;
    }

    await initializeDashboard();
  }
);
