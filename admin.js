const ADMIN_API = "/api";

/*
|--------------------------------------------------------------------------
| Admin state
|--------------------------------------------------------------------------
*/

const ADMIN_SECTIONS = {
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
      "عرض الخدمات النشطة في المنصة."
  },

  requests: {
    title: "طلبات العملاء",
    description:
      "متابعة طلبات العملاء الواردة."
  },

  applications: {
    title: "طلبات الوظائف",
    description:
      "متابعة طلبات التوظيف."
  },

  messages: {
    title: "الرسائل",
    description:
      "إدارة رسائل العملاء."
  },

  settings: {
    title: "الإعدادات",
    description:
      "إعدادات المنصة وحساب الإدارة."
  }
};

let currentSection = "overview";

const loadingState = new Set();

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
}

function redirectToLogin() {
  clearAdminSession();

  const dashboard =
    document.querySelector(
      "#dashboard"
    );

  const loginScreen =
    document.querySelector(
      "#loginScreen"
    );

  if (dashboard) {
    dashboard.classList.remove(
      "active"
    );
  }

  if (loginScreen) {
    loginScreen.style.display =
      "grid";
  }

  const loginMessage =
    document.querySelector(
      "#loginMessage"
    );

  if (loginMessage) {
    loginMessage.textContent =
      "انتهت جلسة الإدارة. يرجى تسجيل الدخول مرة أخرى.";
  }
}

/*
|--------------------------------------------------------------------------
| Helpers
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
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#039;"
    );
}

function formatDate(value) {
  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return escapeHTML(
      value
    );
  }

  return new Intl.DateTimeFormat(
    "ar",
    {
      dateStyle: "medium",
      timeStyle: "short"
    }
  ).format(date);
}

function statusLabel(status) {
  const labels = {
    new: "جديد",
    unread: "غير مقروء",
    read: "مقروء",
    pending: "قيد الانتظار",
    reviewing: "قيد المراجعة",
    approved: "مقبول",
    rejected: "مرفوض",
    completed: "مكتمل",
    active: "نشط",
    inactive: "غير نشط"
  };

  return (
    labels[status] ||
    status ||
    "غير محدد"
  );
}

function statusClass(status) {
  if (
    [
      "approved",
      "completed",
      "active",
      "published"
    ].includes(status)
  ) {
    return "badge-success";
  }

  if (
    [
      "pending",
      "reviewing",
      "new",
      "unread"
    ].includes(status)
  ) {
    return "badge-warning";
  }

  if (
    [
      "rejected",
      "inactive",
      "disabled"
    ].includes(status)
  ) {
    return "badge-danger";
  }

  return "badge-warning";
}

function createBadge(status) {
  return `
    <span class="badge ${statusClass(
      status
    )}">
      ${escapeHTML(
        statusLabel(status)
      )}
    </span>
  `;
}

function booleanBadge(value) {
  return value
    ? `
      <span class="badge badge-success">
        نعم
      </span>
    `
    : `
      <span class="badge badge-warning">
        لا
      </span>
    `;
}

function showLoading(
  element,
  colspan,
  text = "جاري التحميل..."
) {
  if (!element) {
    return;
  }

  element.innerHTML = `
    <tr>
      <td colspan="${colspan}">
        ${escapeHTML(text)}
      </td>
    </tr>
  `;
}

function showTableMessage(
  element,
  colspan,
  text,
  type = "normal"
) {
  if (!element) {
    return;
  }

  const color =
    type === "error"
      ? "#fca5a5"
      : "#94a3b8";

  element.innerHTML = `
    <tr>
      <td
        colspan="${colspan}"
        style="
          color:${color};
          padding:25px 12px;
        "
      >
        ${escapeHTML(text)}
      </td>
    </tr>
  `;
}

/*
|--------------------------------------------------------------------------
| API
|--------------------------------------------------------------------------
*/

async function parseResponse(
  response
) {
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
    success: false,
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
    redirectToLogin();

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
    Authorization:
      `Bearer ${token}`,
    ...(options.headers || {})
  };

  let response;

  try {
    response =
      await fetch(
        `${ADMIN_API}${endpoint}`,
        {
          ...options,
          headers,
          cache: "no-store"
        }
      );
  } catch (error) {
    throw new Error(
      "تعذر الاتصال بالخادم."
    );
  }

  const data =
    await parseResponse(
      response
    );

  if (
    response.status === 401
  ) {
    redirectToLogin();

    throw new Error(
      "Authentication expired"
    );
  }

  if (
    response.status === 403
  ) {
    throw new Error(
      data.error ||
        "ليس لديك صلاحية للوصول إلى هذا القسم."
    );
  }

  if (!response.ok) {
    throw new Error(
      data.error ||
        "فشل تنفيذ الطلب."
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
        }),

        cache: "no-store"
      }
    );

  const data =
    await parseResponse(
      response
    );

  if (!response.ok) {
    throw new Error(
      data.error ||
        "فشل تسجيل الدخول."
    );
  }

  if (!data.token) {
    throw new Error(
      "لم يتم استلام جلسة صالحة من الخادم."
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

async function loadCurrentUser() {
  return adminRequest(
    "/auth/me"
  );
}

async function verifyExistingSession() {
  const token =
    getAdminToken();

  if (!token) {
    return false;
  }

  try {
    const data =
      await loadCurrentUser();

    if (
      data &&
      data.user
    ) {
      renderAdminUser(
        data.user
      );

      return true;
    }
  } catch (error) {
    console.warn(
      "[ADMIN SESSION]",
      error.message
    );
  }

  clearAdminSession();

  return false;
}

/*
|--------------------------------------------------------------------------
| Dashboard
|--------------------------------------------------------------------------
*/

async function loadDashboard() {
  return adminRequest(
    "/admin/stats"
  );
}

async function renderDashboardStats() {
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
      "[ADMIN STATS]",
      error
    );

    [
      "#statProjects",
      "#statRequests",
      "#statApplications",
      "#statMessages",
      "#statUsers"
    ].forEach(
      (selector) => {
        const element =
          document.querySelector(
            selector
          );

        if (element) {
          element.textContent =
            "—";
        }
      }
    );
  }
}

/*
|--------------------------------------------------------------------------
| Projects
|--------------------------------------------------------------------------
*/

async function loadAdminProjects() {
  return adminRequest(
    "/admin/projects"
  );
}

async function renderProjects() {
  const table =
    document.querySelector(
      "#projectsTable"
    );

  if (!table) {
    return;
  }

  showLoading(
    table,
    4
  );

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
      showTableMessage(
        table,
        4,
        "لا توجد مشاريع حاليًا."
      );

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
                    project.title
                  )}
                </strong>

                ${
                  project.slug
                    ? `
                      <div
                        style="
                          color:#64748b;
                          font-size:11px;
                          margin-top:4px;
                        "
                      >
                        ${escapeHTML(
                          project.slug
                        )}
                      </div>
                    `
                    : ""
                }
              </td>

              <td>
                ${createBadge(
                  project.is_published
                    ? "published"
                    : "inactive"
                )}
              </td>

              <td>
                ${booleanBadge(
                  project.is_featured
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
      "[ADMIN PROJECTS]",
      error
    );

    showTableMessage(
      table,
      4,
      error.message ||
        "تعذر تحميل المشاريع.",
      "error"
    );
  }
}

/*
|--------------------------------------------------------------------------
| Services
|--------------------------------------------------------------------------
|
| The current API provides public services,
| but does not provide /admin/services.
|
| Therefore this section only reads active services.
|
*/

async function loadServices() {
  return adminRequest(
    "/services"
  );
}

async function renderServices() {
  const table =
    document.querySelector(
      "#servicesTable"
    );

  if (!table) {
    return;
  }

  showLoading(
    table,
    3
  );

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
      showTableMessage(
        table,
        3,
        "لا توجد خدمات نشطة حاليًا."
      );

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
                    service.title
                  )}
                </strong>
              </td>

              <td>
                ${
                  service.slug
                    ? `
                      <code
                        style="
                          color:#a5b4fc;
                          font-size:12px;
                        "
                      >
                        /${escapeHTML(
                          service.slug
                        )}
                      </code>
                    `
                    : "—"
                }
              </td>

              <td>
                ${createBadge(
                  "active"
                )}
              </td>

            </tr>
          `
        )
        .join("");
  } catch (error) {
    console.error(
      "[ADMIN SERVICES]",
      error
    );

    showTableMessage(
      table,
      3,
      error.message ||
        "تعذر تحميل الخدمات.",
      "error"
    );
  }
}

/*
|--------------------------------------------------------------------------
| Client requests
|--------------------------------------------------------------------------
*/

async function loadClientRequests() {
  return adminRequest(
    "/admin/requests"
  );
}

async function renderRequests() {
  const table =
    document.querySelector(
      "#requestsTable"
    );

  if (!table) {
    return;
  }

  showLoading(
    table,
    6
  );

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
      showTableMessage(
        table,
        6,
        "لا توجد طلبات عملاء حاليًا."
      );

      return;
    }

    table.innerHTML =
      requests
        .map(
          (request) => `
            <tr>

              <td>
                ${escapeHTML(
                  request.name
                )}
              </td>

              <td>
                ${escapeHTML(
                  request.email
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
                ${createBadge(
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
      "[ADMIN REQUESTS]",
      error
    );

    showTableMessage(
      table,
      6,
      error.message ||
        "تعذر تحميل الطلبات.",
      "error"
    );
  }
}

/*
|--------------------------------------------------------------------------
| Job applications
|--------------------------------------------------------------------------
*/

async function loadApplications() {
  return adminRequest(
    "/admin/applications"
  );
}

async function renderApplications() {
  const table =
    document.querySelector(
      "#applicationsTable"
    );

  if (!table) {
    return;
  }

  showLoading(
    table,
    6
  );

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
      showTableMessage(
        table,
        6,
        "لا توجد طلبات توظيف حاليًا."
      );

      return;
    }

    table.innerHTML =
      applications
        .map(
          (application) => `
            <tr>

              <td>
                ${escapeHTML(
                  application.full_name
                )}

                ${
                  application.email
                    ? `
                      <div
                        style="
                          color:#64748b;
                          font-size:11px;
                          margin-top:3px;
                        "
                      >
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
                ${createBadge(
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
      "[ADMIN APPLICATIONS]",
      error
    );

    showTableMessage(
      table,
      6,
      error.message ||
        "تعذر تحميل طلبات التوظيف.",
      "error"
    );
  }
}

/*
|--------------------------------------------------------------------------
| Messages
|--------------------------------------------------------------------------
|
| IMPORTANT:
| The current api.js supplied by you does NOT
| contain /admin/messages.
|
| We intentionally do not invent an endpoint.
|
*/

function renderMessages() {
  const table =
    document.querySelector(
      "#messagesTable"
    );

  if (!table) {
    return;
  }

  table.innerHTML = `
    <tr>
      <td
        colspan="5"
        style="
          color:#94a3b8;
          padding:25px 12px;
          line-height:1.8;
        "
      >
        واجهة الرسائل موجودة في لوحة الإدارة،
        لكن API إدارة الرسائل غير موجود في النسخة الحالية
        من الخادم. لم يتم اختراع Endpoint غير موجود حتى
        لا يحدث تعارض مع النظام الحالي.
      </td>
    </tr>
  `;
}

/*
|--------------------------------------------------------------------------
| Admin user
|--------------------------------------------------------------------------
*/

function renderAdminUser(user) {
  if (!user) {
    return;
  }

  const name =
    document.querySelector(
      "#adminName"
    );

  const role =
    document.querySelector(
      "#adminRole"
    );

  const avatar =
    document.querySelector(
      ".avatar"
    );

  if (name) {
    name.textContent =
      user.full_name ||
      "Admin";
  }

  if (role) {
    role.textContent =
      user.role ||
      "Administrator";
  }

  if (avatar) {
    const source =
      user.full_name ||
      user.email ||
      "A";

    avatar.textContent =
      source
        .trim()
        .charAt(0)
        .toUpperCase();
  }
}

/*
|--------------------------------------------------------------------------
| Section navigation
|--------------------------------------------------------------------------
*/

function updatePageHeader(
  section
) {
  const config =
    ADMIN_SECTIONS[
      section
    ];

  if (!config) {
    return;
  }

  const title =
    document.querySelector(
      "#pageTitle"
    );

  const description =
    document.querySelector(
      "#pageDescription"
    );

  if (title) {
    title.textContent =
      config.title;
  }

  if (description) {
    description.textContent =
      config.description;
  }
}

async function openSection(
  section
) {
  if (
    !ADMIN_SECTIONS[
      section
    ]
  ) {
    return;
  }

  currentSection =
    section;

  document
    .querySelectorAll(
      ".admin-section"
    )
    .forEach(
      (element) => {
        element.classList.toggle(
          "active",
          element.id ===
            `section-${section}`
        );
      }
    );

  document
    .querySelectorAll(
      ".side-link[data-section]"
    )
    .forEach(
      (element) => {
        element.classList.toggle(
          "active",
          element.dataset.section ===
            section
        );
      }
    );

  updatePageHeader(
    section
  );

  closeMobileSidebar();

  if (
    loadingState.has(
      section
    )
  ) {
    return;
  }

  loadingState.add(
    section
  );

  try {
    switch (section) {
      case "overview":
        await renderDashboardStats();
        break;

      case "projects":
        await renderProjects();
        break;

      case "services":
        await renderServices();
        break;

      case "requests":
        await renderRequests();
