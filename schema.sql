CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    full_name VARCHAR(150) NOT NULL,

    email VARCHAR(255) UNIQUE NOT NULL,

    password_hash TEXT NOT NULL,

    role VARCHAR(30) NOT NULL DEFAULT 'employee',

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    last_login_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    title VARCHAR(200) NOT NULL,

    slug VARCHAR(220) UNIQUE NOT NULL,

    short_description TEXT,

    description TEXT,

    cover_image TEXT,

    demo_url TEXT,

    github_url TEXT,

    client_name VARCHAR(150),

    technologies JSONB NOT NULL DEFAULT '[]',

    is_featured BOOLEAN NOT NULL DEFAULT FALSE,

    is_published BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    title VARCHAR(200) NOT NULL,

    slug VARCHAR(220) UNIQUE NOT NULL,

    description TEXT,

    icon VARCHAR(100),

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    sort_order INTEGER NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    title VARCHAR(200) NOT NULL,

    department VARCHAR(150),

    location VARCHAR(150),

    employment_type VARCHAR(100),

    description TEXT,

    requirements TEXT,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS client_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name VARCHAR(150) NOT NULL,

    email VARCHAR(255) NOT NULL,

    phone VARCHAR(50),

    project_type VARCHAR(150),

    details TEXT NOT NULL,

    budget VARCHAR(100),

    deadline VARCHAR(100),

    website_url TEXT,

    attachment_url TEXT,

    status VARCHAR(50) NOT NULL DEFAULT 'new',

    internal_notes TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS job_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,

    full_name VARCHAR(150) NOT NULL,

    email VARCHAR(255) NOT NULL,

    phone VARCHAR(50),

    specialty VARCHAR(150),

    experience_years INTEGER,

    github_url TEXT,

    linkedin_url TEXT,

    portfolio_url TEXT,

    cv_url TEXT,

    certificate_url TEXT,

    message TEXT,

    status VARCHAR(50) NOT NULL DEFAULT 'new',

    internal_notes TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name VARCHAR(150) NOT NULL,

    email VARCHAR(255) NOT NULL,

    phone VARCHAR(50),

    subject VARCHAR(255),

    message TEXT NOT NULL,

    status VARCHAR(50) NOT NULL DEFAULT 'unread',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID REFERENCES users(id) ON DELETE SET NULL,

    action VARCHAR(100) NOT NULL,

    entity_type VARCHAR(100),

    entity_id UUID,

    ip_address INET,

    user_agent TEXT,

    metadata JSONB NOT NULL DEFAULT '{}',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS security_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    event_type VARCHAR(100) NOT NULL,

    email VARCHAR(255),

    ip_address INET,

    user_agent TEXT,

    metadata JSONB NOT NULL DEFAULT '{}',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_published
ON projects(is_published);

CREATE INDEX IF NOT EXISTS idx_projects_featured
ON projects(is_featured);

CREATE INDEX IF NOT EXISTS idx_jobs_active
ON jobs(is_active);

CREATE INDEX IF NOT EXISTS idx_client_requests_status
ON client_requests(status);

CREATE INDEX IF NOT EXISTS idx_applications_status
ON job_applications(status);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created
ON audit_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_security_events_created
ON security_events(created_at);
