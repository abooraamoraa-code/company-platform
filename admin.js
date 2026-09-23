const ADMIN_API = "/api";

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function getAdminToken() {
  return sessionStorage.getItem("admin_token");
}

function setAdminToken(token) {
  sessionStorage.setItem("admin_token", token);
}

function clearAdminSession() {
  sessionStorage.removeItem("admin_token");
  window.location.href = "admin.html";
}

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

  try {
    return new Intl.DateTimeFormat("ar", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(new Date(value));
  } catch {
    return escapeHTML(value);
  }
}

function formatStatus(status) {
  const value = String(status || "").toLowerCase();

  const statuses = {
    new: {
      text: "جديد",
      className: "badge-warning"
    },

    unread: {
      text: "غير مقروءة",
      className: "badge-warning"
    },

    read: {
      text: "مقروءة",
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

    approved: {
      text: "مقبول",
      className: "badge-success"
    },

    rejected: {
      text: "مرفوض",
      className: "badge-danger"
    },

    pending: {
      text: "قيد المراجعة",
      className: "badge-warning"
    },

    in_progress: {
      text: "قيد التنفيذ",
      className: "badge-warning"
    },

    closed: {
      text: "مغلق",
      className: "badge-danger"
    }
  };

  const config = statuses[value];

  if (!config) {
    return `
      <span class="badge badge-warning">
        ${escapeHTML(status || "غير محدد")}
      </span>
    `;
  }

  return `
    <span class="badge ${config.className}">
      ${config.text}
    </span>
  `;
}

function formatBoolean(value) {
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

function showMessage(element, message, type = "error") {
  if (!element) {
    return;
  }

  element.textContent = message;

  element.style.color =
    type === "success"
      ? "#86efac"
      : "#fca5a5";
}


/*
|--------------------------------------------------------------------------
| API
|--------------------------------------------------------------------------
*/

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

  let response;

  try {
    response = await fetch(
      `${ADMIN_API}${endpoint}`,
      {
        ...options,
        headers
      }
    );
  } catch (error) {
    console.error(
      "[ADMIN API]",
      error
    );

    throw new Error(
      "تعذر الاتصال بالخادم."
    );
  }

  let data = {};

  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (response.status === 401) {
    clearAdminSession();

    throw new Error(
      "انتهت جلسة تسجيل الدخول."
    );
  }

  if (response.status === 403) {
    throw new Error(
      "ليس لديك صلاحية لتنفيذ هذا الإجراء."
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
  let response;

  try {
    response = await fetch(
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
  } catch (error) {
    console.error(
      "[LOGIN]",
      error
    );

    throw new Error(
      "تعذر الاتصال بالخادم."
    );
  }

  let data = {};

  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(
      data.error ||
        "بيانات الدخول غير صحيحة."
    );
  }

  if (!data.token) {
    throw new Error(
      "لم يتم استلام جلسة مصادقة من الخادم."
    );
  }

  setAdminToken(data.token);

  return data;
}


/*
|--------------------------------------------------------------------------
| Current user
|--------------------------------------------------------------------------
*/

async function loadCurrentAdmin() {
  return adminRequest(
    "/auth/me"
  );
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


/*
|--------------------------------------------------------------------------
| Requests
|--------------------------------------------------------------------------
*/

async function loadClientRequests() {
  return adminRequest(
    "/admin/requests"
  );
}


/*
|--------------------------------------------------------------------------
| Applications
|--------------------------------------------------------------------------
*/

async function loadApplications() {
  return adminRequest(
    "/admin/applications"
  );
}


/*
|--------------------------------------------------------------------------
| Services
|--------------------------------------------------------------------------
|
| لا يوجد endpoint إداري للخدمات في api.js الحالي،
| لذلك نحاول استخدام endpoint العام.
|
*/

async function loadAdminServices() {
  return adminRequest(
    "/services"
  );
}


/*
|--------------------------------------------------------------------------
| DOM
|--------------------------------------------------------------------------
*/

const elements = {
  loginScreen:
    document.querySelector(
      "#loginScreen"
    ),

  dashboard:
    document.querySelector(
      "#dashboard"
    ),

  loginForm:
    document.querySelector(
      "#loginForm"
    ),

  loginEmail:
    document.querySelector(
      "#loginEmail"
    ),

  loginPassword:
    document.querySelector(
      "#loginPassword"
    ),

  loginMessage:
    document.querySelector(
      "#loginMessage"
    ),

  logoutButton:
    document.querySelector(
      "#logoutButton"
    ),

  mobileMenuButton:
    document.querySelector(
      "#mobileMenuButton"
    ),

  sidebar:
    document.querySelector(
      "#sidebar"
    ),

  pageTitle:
    document.querySelector(
      "#pageTitle"
    ),

  pageDescription:
    document.querySelector(
      "#pageDescription"
    ),

  adminName:
    document.querySelector(
      "#adminName"
    ),

  adminRole:
    document.querySelector(
      "#adminRole"
    ),

  statProjects:
    document.querySelector(
      "#statProjects"
    ),

  statRequests:
    document.querySelector(
      "#statRequests"
    ),

  statApplications:
    document.querySelector(
      "#statApplications"
    ),

  statMessages:
    document.querySelector(
      "#statMessages"
    ),

  statUsers:
    document.querySelector(
      "#statUsers"
    ),

  projectsTable:
    document.querySelector(
      "#projectsTable"
    ),

  servicesTable:
    document.querySelector(
      "#servicesTable"
    ),

  requestsTable:
    document.querySelector(
      "#requestsTable"
    ),

  applicationsTable:
    document.querySelector(
      "#applicationsTable"
    ),

  messagesTable:
    document.querySelector(
      "#messagesTable"
    )
};


/*
|--------------------------------------------------------------------------
| Loading helpers
|--------------------------------------------------------------------------
*/

function setTableLoading(
  table,
  colspan
) {
  if (!table) {
    return;
  }

  table.innerHTML = `
    <tr>
      <td
        colspan="${colspan}"
        style="
          text-align:center;
          color:#94a3b8;
          padding:30px;
        "
      >
        جاري التحميل...
      </td>
    </tr>
  `;
}

function setTableError(
  table,
  colspan,
  message
) {
  if (!table) {
    return;
  }

  table.innerHTML = `
    <tr>
      <td
        colspan="${colspan}"
        style="
          text-align:center;
          color:#fca5a5;
          padding:30px;
        "
      >
        ${escapeHTML(message)}
      </td>
    </tr>
  `;
}

function setTableEmpty(
  table,
  colspan,
  message
) {
  if (!table) {
    return;
  }

  table.innerHTML = `
    <tr>
      <td
        colspan="${colspan}"
        style="
          text-align:center;
          color:#94a3b8;
          padding:30px;
        "
      >
        ${escapeHTML(message)}
      </td>
    </tr>
  `;
}


/*
|--------------------------------------------------------------------------
| Render dashboard
|--------------------------------------------------------------------------
*/

async function refreshDashboard() {
  try {
    const data =
      await loadDashboard();

    const stats =
      data.stats || {};

    if (elements.statProjects) {
      elements.statProjects.textContent =
        stats.projects ?? 0;
    }

    if (elements.statRequests) {
      elements.statRequests.textContent =
        stats.new_requests ?? 0;
    }

    if (elements.statApplications) {
      elements.statApplications.textContent =
        stats.new_applications ?? 0;
    }

    if (elements.statMessages) {
      elements.statMessages.textContent =
        stats.unread_messages ?? 0;
    }

    if (elements.statUsers) {
      elements.statUsers.textContent =
        stats.active_users ?? 0;
    }
  } catch (error) {
    console.error(
      "[DASHBOARD]",
      error
    );

    if (elements.statProjects) {
      elements.statProjects.textContent =
        "—";
    }

    if (elements.statRequests) {
      elements.statRequests.textContent =
        "—";
    }

    if (elements.statApplications) {
      elements.statApplications.textContent =
        "—";
    }

    if (elements.statMessages) {
      elements.statMessages.textContent =
        "—";
    }

    if (elements.statUsers) {
      elements.statUsers.textContent =
        "—";
    }
  }
}


/*
|--------------------------------------------------------------------------
| Render projects
|--------------------------------------------------------------------------
*/

async function refreshProjects() {
  if (!elements.projectsTable) {
    return;
  }

  setTableLoading(
    elements.projectsTable,
    4
  );

  try {
    const data =
      await loadAdminProjects();

    const projects =
      Array.isArray(data.projects)
        ? data.projects
        : [];

    if (!projects.length) {
      setTableEmpty(
        elements.projectsTable,
        4,
        "لا توجد مشاريع."
      );

      return;
    }

    elements.projectsTable.innerHTML =
      projects
        .map((project) => {
          const technologies =
            Array.isArray(
              project.technologies
            )
              ? project.technologies.join(
                  "، "
                )
              : "";

          return `
            <tr>
              <td>
                <strong>
                  ${escapeHTML(
                    project.title
                  )}
                </strong>

                ${
                  technologies
                    ? `
                      <div
                        style="
                          color:#64748b;
                          font-size:11px;
                          margin-top:4px;
                        "
                      >
                        ${escapeHTML(
                          technologies
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
                        مسودة
                      </span>
                    `
                }
              </td>

              <td>
                ${formatBoolean(
                  project.is_featured
                )}
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

    setTableError(
      elements.projectsTable,
      4,
      error.message ||
        "تعذر تحميل المشاريع."
    );
  }
}


/*
|--------------------------------------------------------------------------
| Render services
|--------------------------------------------------------------------------
*/

async function refreshServices() {
  if (!elements.servicesTable) {
    return;
  }

  setTableLoading(
    elements.servicesTable,
    3
  );

  try {
    const data =
      await loadAdminServices();

    const services =
      Array.isArray(data.services)
        ? data.services
        : [];

    if (!services.length) {
      setTableEmpty(
        elements.servicesTable,
        3,
        "لا توجد خدمات."
      );

      return;
    }

    elements.servicesTable.innerHTML =
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
                <code
                  style="
                    color:#a5b4fc;
                    font-size:12px;
                  "
                >
                  /services/${escapeHTML(
                    service.slug
                  )}
                </code>
              </td>

              <td>
                ${
                  service.is_active
                    ? `
                      <span class="badge badge-success">
                        نشطة
                      </span>
                    `
                    : `
                      <span class="badge badge-danger">
                        متوقفة
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

    setTableError(
      elements.servicesTable,
      3,
      error.message ||
        "تعذر تحميل الخدمات."
    );
  }
}


/*
|--------------------------------------------------------------------------
| Render client requests
|--------------------------------------------------------------------------
*/

async function refreshRequests() {
  if (!elements.requestsTable) {
    return;
  }

  setTableLoading(
    elements.requestsTable,
    6
  );

  try {
    const data =
      await loadClientRequests();

    const requests =
      Array.isArray(data.requests)
        ? data.requests
        : [];

    if (!requests.length) {
      setTableEmpty(
        elements.requestsTable,
        6,
        "لا توجد طلبات عملاء."
      );

      return;
    }

    elements.requestsTable.innerHTML =
      requests
        .map(
          (request) => `
            <tr>
              <td>
                <strong>
                  ${escapeHTML(
                    request.name
                  )}
                </strong>

                ${
                  request.phone
                    ? `
                      <div
                        style="
                          color:#64748b;
                          font-size:11px;
                          margin-top:3px;
                        "
                      >
                        ${escapeHTML(
                          request.phone
                        )}
                      </div>
                    `
                    : ""
                }
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
                ${formatStatus(
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

    setTableError(
      elements.requestsTable,
      6,
      error.message ||
        "تعذر تحميل الطلبات."
    );
  }
}


/*
|--------------------------------------------------------------------------
| Render applications
|--------------------------------------------------------------------------
*/

async function refreshApplications() {
  if (!elements.applicationsTable) {
    return;
  }

  setTableLoading(
    elements.applicationsTable,
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
      setTableEmpty(
        elements.applicationsTable,
        6,
        "لا توجد طلبات توظيف."
      );

      return;
    }

    elements.applicationsTable.innerHTML =
      applications
        .map(
          (application) => `
            <tr>
              <td>
                <strong>
                  ${escapeHTML(
                    application.full_name
                  )}
                </strong>

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
                    "طلب عام"
                )}
              </td>

              <td>
                ${formatStatus(
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

    setTableError(
      elements.applicationsTable,
      6,
      error.message ||
        "تعذر تحميل طلبات التوظيف."
    );
  }
}


/*
|--------------------------------------------------------------------------
| Messages
|--------------------------------------------------------------------------
|
| api.js الحالي لا يحتوي على:
| GET /admin/messages
|
| لذلك لن نطلب endpoint غير موجود.
|
*/

function refreshMessages() {
  if (!elements.messagesTable) {
    return;
  }

  elements.messagesTable.innerHTML = `
    <tr>
      <td
        colspan="5"
        style="
          text-align:center;
          color:#94a3b8;
          padding:30px;
        "
      >
        قسم الرسائل يحتاج إضافة
        <code style="color:#a5b4fc;">
          GET /admin/messages
        </code>
        في api.js.
      </td>
    </tr>
  `;
}


/*
|--------------------------------------------------------------------------
| Navigation
|--------------------------------------------------------------------------
*/

const sectionInfo = {
  overview: {
    title: "نظرة عامة",
    description:
      "متابعة حالة المنصة والنشاط الأخير."
  },

  projects: {
    title: "المشاريع",
    description:
      "عرض وإدارة مشاريع المنصة."
  },

  services: {
    title: "الخدمات",
    description:
      "عرض الخدمات المنشورة وحالتها."
  },

  requests: {
    title: "طلبات العملاء",
    description:
      "متابعة طلبات المشاريع الواردة."
  },

  applications: {
    title: "طلبات الوظائف",
    description:
      "متابعة طلبات التوظيف الواردة."
  },

  messages: {
    title: "الرسائل",
    description:
      "متابعة رسائل العملاء."
  },

  settings: {
    title: "الإعدادات",
    description:
      "إعدادات المنصة والحساب."
  }
};

async function showSection(
  sectionName
) {
  const section =
    sectionInfo[sectionName];

  if (!section) {
    return;
  }

  document
    .querySelectorAll(
      ".side-link[data-section]"
    )
    .forEach((button) => {
      button.classList.toggle(
        "active",
        button.dataset.section ===
          sectionName
      );
    });

  document
    .querySelectorAll(
      ".admin-section"
    )
    .forEach((element) => {
      element.classList.toggle(
        "active",
        element.id ===
          `section-${sectionName}`
      );
    });

  if (elements.pageTitle) {
    elements.pageTitle.textContent =
      section.title;
  }

  if (elements.pageDescription) {
    elements.pageDescription.textContent =
      section.description;
  }

  if (elements.sidebar) {
    elements.sidebar.classList.remove(
      "open"
    );
  }

  /*
  | Load section data
  */

  switch (sectionName) {
    case "overview":
      await refreshDashboard();
      break;

    case "projects":
      await refreshProjects();
      break;

    case "services":
      await refreshServices();
      break;

    case "requests":
      await refreshRequests();
      break;

    case "applications":
      await refreshApplications();
      break;

    case "messages":
      refreshMessages();
      break;

    default:
      break;
  }
}


/*
|--------------------------------------------------------------------------
| Setup navigation
|--------------------------------------------------------------------------
*/

function setupNavigation() {
  document
    .querySelectorAll(
      ".side-link[data-section]"
    )
    .forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          showSection(
            button.dataset.section
          );
        }
      );
    });
}


/*
|--------------------------------------------------------------------------
| Mobile menu
|--------------------------------------------------------------------------
*/

function setupMobileMenu() {
  if (
    !elements.mobileMenuButton ||
    !elements.sidebar
  ) {
    return;
  }

  elements.mobileMenuButton.addEventListener(
    "click",
    () => {
      elements.sidebar.classList.toggle(
        "open"
      );
    }
  );
}


/*
|--------------------------------------------------------------------------
| Login UI
|--------------------------------------------------------------------------
*/

function showDashboard() {
  if (elements.loginScreen) {
    elements.loginScreen.style.display =
      "none";
  }

  if (elements.dashboard) {
    elements.dashboard.classList.add(
      "active"
    );
  }
}

function showLoginScreen() {
  if (elements.dashboard) {
    elements.dashboard.classList.remove(
      "active"
    );
  }

  if (elements.loginScreen) {
    elements.loginScreen.style.display =
      "grid";
  }
}


/*
|--------------------------------------------------------------------------
| Admin information
|--------------------------------------------------------------------------
*/

function renderAdminUser(user) {
  if (!user) {
    return;
  }

  if (elements.adminName) {
    elements.adminName.textContent =
      user.full_name ||
      user.email ||
      "Admin";
  }

  if (elements.adminRole) {
    const roleNames = {
      admin: "Administrator",
      manager: "Manager",
      employee: "Employee"
    };

    elements.adminRole.textContent =
      roleNames[user.role] ||
      user.role ||
      "Administrator";
  }

  const avatar =
    document.querySelector(
      ".avatar"
    );

  if (avatar) {
    const name =
      user.full_name ||
      user.email ||
      "A";

    avatar.textContent =
      name
        .trim()
        .charAt(0)
        .toUpperCase();
  }
}


/*
|--------------------------------------------------------------------------
| Login handler
|--------------------------------------------------------------------------
*/

function setupLogin() {
  if (!elements.loginForm) {
    return;
  }

  elements.loginForm.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      const email =
        elements.loginEmail?.value.trim();

      const password =
        elements.loginPassword?.value;

      if (!email || !password) {
        showMessage(
          elements.loginMessage,
          "يرجى إدخال البريد الإلكتروني وكلمة المرور."
        );

        return;
      }

      const submitButton =
        elements.loginForm.querySelector(
          'button[type="submit"]'
        );

      const originalText =
        submitButton
          ? submitButton.textContent
          : "";

      try {
        if (submitButton) {
          submitButton.disabled = true;
          submitButton.textContent =
            "جاري تسجيل الدخول...";
        }

        showMessage(
          elements.loginMessage,
          ""
        );

        const data =
          await adminLogin(
            email,
            password
          );

        renderAdminUser(
          data.user
        );

        showDashboard();

        await showSection(
          "overview"
        );

        elements.loginForm.reset();
      } catch (error) {
        console.error(
          "[LOGIN]",
          error
        );

        showMessage(
          elements.loginMessage,
          error.message ||
            "فشل تسجيل الدخول."
        );

        clearAdminSessionWithoutRedirect();
      } finally {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent =
            originalText ||
            "تسجيل الدخول";
        }
      }
    }
  );
}


/*
|--------------------------------------------------------------------------
| Session helper
|--------------------------------------------------------------------------
|
| يستخدم عند فشل Login حتى لا يعيد الصفحة
| التوجيه إلى نفسها.
|
*/

function clearAdminSessionWithoutRedirect() {
  sessionStorage.removeItem(
    "admin_token"
  );
}


/*
|--------------------------------------------------------------------------
| Logout
|--------------------------------------------------------------------------
*/

function setupLogout() {
  if (!elements.logoutButton) {
    return;
  }

  elements.logoutButton.addEventListener(
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
  const refreshDashboard =
    document.querySelector(
      "#refreshDashboard"
    );

  const refreshProjects =
    document.querySelector(
      "#refreshProjects"
    );

  const refreshRequests =
    document.querySelector(
      "#refreshRequests"
    );

  const refreshApplications =
    document.querySelector(
      "#refreshApplications"
    );

  if (refreshDashboard) {
    refreshDashboard.addEventListener(
      "click",
      async () => {
        await refreshDashboardData();
      }
    );
  }

  if (refreshProjects) {
    refreshProjects.addEventListener(
      "click",
      async () => {
        await refreshProjectsData();
      }
    );
  }

  if (refreshRequests) {
    refreshRequests.addEventListener(
      "click",
      async () => {
        await refreshRequestsData();
      }
    );
  }

  if (refreshApplications) {
    refreshApplications.addEventListener(
      "click",
      async () => {
        await refreshApplicationsData();
      }
    );
  }
}


/*
|--------------------------------------------------------------------------
| Button wrappers
|--------------------------------------------------------------------------
*/

async function refreshDashboardData() {
  await refreshDashboard();
}

async function refreshProjectsData() {
  await refreshProjects();
}

async function refreshRequestsData() {
  await refreshRequests();
}

async function refreshApplicationsData() {
  await refreshApplications();
}


/*
|--------------------------------------------------------------------------
| Initial session
|--------------------------------------------------------------------------
*/

async function initializeAdmin() {
  const token =
    getAdminToken();

  if (!token) {
    showLoginScreen();
    return;
  }

  try {
    const data =
      await loadCurrentAdmin();

    renderAdminUser(
      data.user
    );

    showDashboard();

    await showSection(
      "overview"
    );
  } catch (error) {
    console.error(
      "[SESSION]",
      error
    );

    clearAdminSessionWithoutRedirect();
    showLoginScreen();
  }
}


/*
|--------------------------------------------------------------------------
| Init
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

    await initializeAdmin();
  }
);
