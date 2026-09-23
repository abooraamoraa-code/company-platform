const ADMIN_API = "/api";

function getAdminToken() {
  return sessionStorage.getItem(
    "admin_token"
  );
}

function setAdminToken(token) {
  sessionStorage.setItem(
    "admin_token",
    token
  );
}

function clearAdminSession() {
  sessionStorage.removeItem(
    "admin_token"
  );

  window.location.href =
    "admin.html";
}

async function adminRequest(
  endpoint,
  options = {}
) {
  const token =
    getAdminToken();

  const response =
    await fetch(
      `${ADMIN_API}${endpoint}`,
      {
        ...options,
        headers: {
          ...(options.body
            ? {
                "Content-Type":
                  "application/json"
              }
            : {}),
          Authorization:
            `Bearer ${token}`,
          ...(options.headers || {})
        }
      }
    );

  const data =
    await response.json();

  if (response.status === 401) {
    clearAdminSession();
    throw new Error(
      "Authentication expired"
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
    await response.json();

  if (!response.ok) {
    throw new Error(
      data.error ||
        "Login failed"
    );
  }

  setAdminToken(data.token);

  return data;
}

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
