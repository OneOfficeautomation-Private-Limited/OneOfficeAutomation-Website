-- OneOfficeAutomation website database (MySQL / MariaDB on Hostinger)
-- The server runs this automatically when it starts; every statement is safe to run again.
-- You can also import it once in phpMyAdmin.

CREATE TABLE IF NOT EXISTS customers (
  id            VARCHAR(36)  NOT NULL PRIMARY KEY,
  first_name    VARCHAR(100) NOT NULL,
  last_name     VARCHAR(100) NOT NULL,
  email         VARCHAR(200) NOT NULL UNIQUE,
  company       VARCHAR(200) NOT NULL,
  country       VARCHAR(100) NOT NULL,
  plan          VARCHAR(20)  NOT NULL CHECK (plan IN ('community', 'starter', 'business', 'enterprise')),
  password_hash VARCHAR(200) NOT NULL,
  created_at    VARCHAR(40)  NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS leads (
  id         VARCHAR(36) NOT NULL PRIMARY KEY,
  kind       VARCHAR(20) NOT NULL CHECK (kind IN ('demo', 'partner', 'newsletter', 'career')),
  status     VARCHAR(20) NOT NULL DEFAULT 'new',
  payload    MEDIUMTEXT  NOT NULL,
  created_at VARCHAR(40) NOT NULL,
  INDEX leads_kind_created_idx (kind, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Fixed-window rate limiting (one row per bucket and IP address).
CREATE TABLE IF NOT EXISTS rate_limits (
  `key`        VARCHAR(191) NOT NULL PRIMARY KEY,
  window_start BIGINT       NOT NULL,
  count        INT          NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- CMS: admin users, editable content with history.
CREATE TABLE IF NOT EXISTS admins (
  id            VARCHAR(36)  NOT NULL PRIMARY KEY,
  email         VARCHAR(200) NOT NULL UNIQUE,
  name          VARCHAR(100) NOT NULL,
  role          VARCHAR(10)  NOT NULL CHECK (role IN ('admin', 'editor')),
  password_hash VARCHAR(200) NOT NULL,
  active        TINYINT      NOT NULL DEFAULT 1,
  created_at    VARCHAR(40)  NOT NULL,
  last_login    VARCHAR(40)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS content (
  `key`      VARCHAR(191) NOT NULL PRIMARY KEY,
  value      MEDIUMTEXT   NOT NULL,
  updated_at VARCHAR(40)  NOT NULL,
  updated_by VARCHAR(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS content_revisions (
  id       INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `key`    VARCHAR(191) NOT NULL,
  value    MEDIUMTEXT   NOT NULL,
  saved_at VARCHAR(40)  NOT NULL,
  saved_by VARCHAR(100) NOT NULL,
  INDEX content_revisions_key_idx (`key`, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
