const API_BASE = "/api";

const COMPANY = {
  name: "Company Platform",
  facebook:
    "https://www.facebook.com/profile.php?id=61591794734274"
};

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

async function apiRequest(endpoint, options = {}) {
  const response = await fetch(
    `${API_BASE}${endpoint}`,
    {
      ...options,
      headers: {
        ...(options.body instanceof FormData
          ? {}
          : {
              "Content-Type": "application/json"
            }),
        ...(options.headers || {})
      }
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error || "Request failed"
    );
  }

  return data;
}

async function loadProjects() {
  const container =
    document.querySelector("#projects-list");

  if (!container) {
    return;
  }

  try {
    const data =
      await apiRequest("/projects");

    if (!data.projects.length) {
      container.innerHTML = `
        <div class="empty-state">
          No projects published yet.
        </div>
      `;

      return;
    }

    container.innerHTML =
      data.projects
        .map(
          (project) => `
            <article class="project-card">
              ${
                project.cover_image
                  ? `
                    <img
                      src="${escapeHTML(
                        project.cover_image
                      )}"
                      alt="${escapeHTML(
                        project.title
                      )}"
                    >
                  `
                  : `
                    <div class="project-placeholder">
                      PROJECT
                    </div>
                  `
              }

              <div class="project-card-body">
                <span class="project-label">
                  ${
                    project.is_featured
                      ? "Featured"
                      : "Project"
                  }
                </span>

                <h3>
                  ${escapeHTML(
                    project.title
                  )}
                </h3>

                <p>
                  ${escapeHTML(
                    project.short_description ||
                      ""
                  )}
                </p>

                <a
                  href="project.html?slug=${encodeURIComponent(
                    project.slug
                  )}"
                  class="button secondary"
                >
                  View project
                </a>
              </div>
            </article>
          `
        )
        .join("");
  } catch (error) {
    console.error(error);

    container.innerHTML = `
      <div class="error-state">
        Unable to load projects.
      </div>
    `;
  }
}

async function loadServices() {
  const container =
    document.querySelector("#services-list");

  if (!container) {
    return;
  }

  try {
    const data =
      await apiRequest("/services");

    container.innerHTML =
      data.services
        .map(
          (service) => `
            <article class="service-card">
              <div class="service-icon">
                ${escapeHTML(
                  service.icon || "◆"
                )}
              </div>

              <h3>
                ${escapeHTML(
                  service.title
                )}
              </h3>

              <p>
                ${escapeHTML(
                  service.description || ""
                )}
              </p>
            </article>
          `
        )
        .join("");
  } catch (error) {
    console.error(error);

    container.innerHTML = `
      <div class="error-state">
        Unable to load services.
      </div>
    `;
  }
}

async function loadJobs() {
  const container =
    document.querySelector("#jobs-list");

  if (!container) {
    return;
  }

  try {
    const data =
      await apiRequest("/jobs");

    if (!data.jobs.length) {
      container.innerHTML = `
        <div class="empty-state">
          No open positions currently.
        </div>
      `;

      return;
    }

    container.innerHTML =
      data.jobs
        .map(
          (job) => `
            <article class="job-card">
              <div>
                <span>
                  ${escapeHTML(
                    job.department || ""
                  )}
                </span>

                <h3>
                  ${escapeHTML(
                    job.title
                  )}
                </h3>

                <p>
                  ${escapeHTML(
                    job.description || ""
                  )}
                </p>
              </div>

              <a
                href="apply.html?job=${encodeURIComponent(
                  job.id
                )}"
                class="button primary"
              >
                Apply now
              </a>
            </article>
          `
        )
        .join("");
  } catch (error) {
    console.error(error);

    container.innerHTML = `
      <div class="error-state">
        Unable to load jobs.
      </div>
    `;
  }
}

function setupNavigation() {
  const menuButton =
    document.querySelector(
      "[data-menu-button]"
    );

  const navigation =
    document.querySelector(
      "[data-navigation]"
    );

  if (!menuButton || !navigation) {
    return;
  }

  menuButton.addEventListener(
    "click",
    () => {
      navigation.classList.toggle(
        "is-open"
      );
    }
  );
}

function setupContactLinks() {
  document
    .querySelectorAll(
      "[data-facebook-link]"
    )
    .forEach((element) => {
      element.href = COMPANY.facebook;
      element.target = "_blank";
      element.rel =
        "noopener noreferrer";
    });
}

document.addEventListener(
  "DOMContentLoaded",
  () => {
    setupNavigation();
    setupContactLinks();
    loadProjects();
    loadServices();
    loadJobs();
  }
);
