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
  kind       VARCHAR(20) NOT NULL CHECK (kind IN ('demo', 'partner', 'newsletter', 'career', 'download')),
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

-- ===== Workflows (added later; every statement is safe to run again) =====

-- Pipeline stage, owner and follow-up for each form submission in `leads`.
CREATE TABLE IF NOT EXISTS lead_meta (
  lead_id    VARCHAR(36)  NOT NULL PRIMARY KEY,
  stage      VARCHAR(30)  NOT NULL,
  owner      VARCHAR(100) NULL,
  follow_up  VARCHAR(20)  NULL,
  reason     VARCHAR(500) NULL,
  updated_at VARCHAR(40)  NOT NULL,
  INDEX lead_meta_stage_idx (stage)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Who did what and when, for every record.
CREATE TABLE IF NOT EXISTS activity (
  id         INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
  entity     VARCHAR(20)  NOT NULL,
  entity_id  VARCHAR(36)  NOT NULL,
  actor      VARCHAR(120) NOT NULL,
  action     VARCHAR(40)  NOT NULL,
  from_value VARCHAR(60)  NULL,
  to_value   VARCHAR(60)  NULL,
  note       TEXT         NULL,
  created_at VARCHAR(40)  NOT NULL,
  INDEX activity_entity_idx (entity, entity_id),
  INDEX activity_created_idx (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Approved partners (one row per company) and the people who can sign in to the partner portal.
CREATE TABLE IF NOT EXISTS partner_orgs (
  id         VARCHAR(36)  NOT NULL PRIMARY KEY,
  lead_id    VARCHAR(36)  NULL,
  company    VARCHAR(200) NOT NULL,
  country    VARCHAR(100) NOT NULL,
  type       VARCHAR(60)  NOT NULL,
  level      VARCHAR(30)  NOT NULL,
  status     VARCHAR(20)  NOT NULL,
  checklist  TEXT         NOT NULL,
  website    VARCHAR(300) NULL,
  about      TEXT         NULL,
  listed     TINYINT      NOT NULL DEFAULT 1,
  created_at VARCHAR(40)  NOT NULL,
  updated_at VARCHAR(40)  NOT NULL,
  INDEX partner_orgs_status_idx (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS partner_users (
  id            VARCHAR(36)  NOT NULL PRIMARY KEY,
  org_id        VARCHAR(36)  NOT NULL,
  email         VARCHAR(200) NOT NULL UNIQUE,
  name          VARCHAR(120) NOT NULL,
  role          VARCHAR(10)  NOT NULL,
  password_hash VARCHAR(200) NULL,
  active        TINYINT      NOT NULL DEFAULT 1,
  created_at    VARCHAR(40)  NOT NULL,
  last_login    VARCHAR(40)  NULL,
  INDEX partner_users_org_idx (org_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Deals registered by partners.
CREATE TABLE IF NOT EXISTS deals (
  id              VARCHAR(36)  NOT NULL PRIMARY KEY,
  org_id          VARCHAR(36)  NOT NULL,
  created_by      VARCHAR(120) NOT NULL,
  customer        VARCHAR(200) NOT NULL,
  contact         VARCHAR(200) NOT NULL,
  email           VARCHAR(200) NOT NULL,
  country         VARCHAR(100) NOT NULL,
  value           VARCHAR(60)  NULL,
  notes           TEXT         NULL,
  status          VARCHAR(20)  NOT NULL,
  reason          VARCHAR(500) NULL,
  protected_until VARCHAR(20)  NULL,
  created_at      VARCHAR(40)  NOT NULL,
  updated_at      VARCHAR(40)  NOT NULL,
  INDEX deals_org_idx (org_id),
  INDEX deals_status_idx (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Requests that need a decision: community invites, plan changes, account deletion, event registrations.
CREATE TABLE IF NOT EXISTS requests (
  id          VARCHAR(36)  NOT NULL PRIMARY KEY,
  kind        VARCHAR(20)  NOT NULL,
  customer_id VARCHAR(36)  NULL,
  name        VARCHAR(200) NOT NULL,
  email       VARCHAR(200) NOT NULL,
  payload     MEDIUMTEXT   NOT NULL,
  status      VARCHAR(20)  NOT NULL,
  reason      VARCHAR(500) NULL,
  created_at  VARCHAR(40)  NOT NULL,
  updated_at  VARCHAR(40)  NOT NULL,
  INDEX requests_kind_idx (kind, status),
  INDEX requests_customer_idx (customer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Account status for customers (trial, paid, enterprise, suspended, closed) and their newsletter choice.
CREATE TABLE IF NOT EXISTS customer_meta (
  customer_id VARCHAR(36)  NOT NULL PRIMARY KEY,
  status      VARCHAR(30)  NOT NULL,
  newsletter  TINYINT      NOT NULL DEFAULT 0,
  updated_at  VARCHAR(40)  NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- One-time links: password resets and partner invitations. Only a hash of the link is stored.
CREATE TABLE IF NOT EXISTS tokens (
  hash       VARCHAR(64) NOT NULL PRIMARY KEY,
  purpose    VARCHAR(20) NOT NULL,
  user_type  VARCHAR(10) NOT NULL,
  user_id    VARCHAR(36) NOT NULL,
  expires_at BIGINT      NOT NULL,
  used       TINYINT     NOT NULL DEFAULT 0,
  created_at VARCHAR(40) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Every email the site tried to send.
CREATE TABLE IF NOT EXISTS email_log (
  id         INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
  to_email   VARCHAR(200) NOT NULL,
  subject    VARCHAR(300) NOT NULL,
  template   VARCHAR(40)  NOT NULL,
  status     VARCHAR(10)  NOT NULL,
  error      VARCHAR(500) NULL,
  created_at VARCHAR(40)  NOT NULL,
  INDEX email_log_created_idx (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Extra team roles (sales, partners, recruiter, viewer) on top of admin and editor.
CREATE TABLE IF NOT EXISTS admin_roles (
  admin_id VARCHAR(36) NOT NULL PRIMARY KEY,
  role     VARCHAR(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Site switches, for example whether editors' changes need an admin's approval.
CREATE TABLE IF NOT EXISTS settings (
  `key` VARCHAR(100) NOT NULL PRIMARY KEY,
  value MEDIUMTEXT   NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Content changes waiting for an admin's approval.
CREATE TABLE IF NOT EXISTS content_drafts (
  `key`    VARCHAR(191) NOT NULL PRIMARY KEY,
  value    MEDIUMTEXT   NOT NULL,
  saved_by VARCHAR(100) NOT NULL,
  saved_at VARCHAR(40)  NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Session versions: raising a user's version signs out every session issued before it
-- (after a password change or reset, or when access is removed). user_type is customer, partner or admin.
CREATE TABLE IF NOT EXISTS session_versions (
  user_type VARCHAR(10) NOT NULL,
  user_id   VARCHAR(36) NOT NULL,
  version   INT         NOT NULL DEFAULT 0,
  PRIMARY KEY (user_type, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Customers who have confirmed their email address (from the link in the welcome email, or by resetting their password).
CREATE TABLE IF NOT EXISTS customer_verified (
  customer_id VARCHAR(36)  NOT NULL PRIMARY KEY,
  email       VARCHAR(200) NOT NULL,
  verified_at VARCHAR(40)  NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Extra details for a change waiting for approval: which live version it was based on (to warn before
-- overwriting newer edits), who sent it (to email them the decision), and the last decision and reason.
CREATE TABLE IF NOT EXISTS content_draft_meta (
  `key`           VARCHAR(191) NOT NULL PRIMARY KEY,
  base_updated_at VARCHAR(40)  NULL,
  saved_by_id     VARCHAR(36)  NULL,
  decision        VARCHAR(10)  NULL,
  decision_note   TEXT         NULL,
  decided_by      VARCHAR(100) NULL,
  decided_at      VARCHAR(40)  NULL,
  decided_for     VARCHAR(100) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Resources library: one row per article, FAQ, blog post, event or training item (instead of one big list per section).
CREATE TABLE IF NOT EXISTS content_items (
  id          VARCHAR(80)  NOT NULL PRIMARY KEY,
  type        VARCHAR(20)  NOT NULL,
  title       VARCHAR(300) NOT NULL DEFAULT '',
  status      VARCHAR(12)  NOT NULL DEFAULT 'draft',
  publish_at  VARCHAR(40)  NULL,
  product     VARCHAR(80)  NULL,
  category    VARCHAR(80)  NULL,
  parent_id   VARCHAR(80)  NULL,
  sort_order  INT          NOT NULL DEFAULT 0,
  access      VARCHAR(12)  NOT NULL DEFAULT 'public',
  owner       VARCHAR(120) NULL,
  review_by   VARCHAR(10)  NULL,
  data        MEDIUMTEXT   NOT NULL,
  version     INT          NOT NULL DEFAULT 1,
  created_at  VARCHAR(40)  NOT NULL,
  created_by  VARCHAR(120) NOT NULL DEFAULT '',
  updated_at  VARCHAR(40)  NOT NULL,
  updated_by  VARCHAR(120) NOT NULL DEFAULT '',
  INDEX idx_items_type (type, status, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS content_item_revisions (
  id        INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
  item_id   VARCHAR(80)  NOT NULL,
  snapshot  MEDIUMTEXT   NOT NULL,
  saved_at  VARCHAR(40)  NOT NULL,
  saved_by  VARCHAR(120) NOT NULL DEFAULT '',
  INDEX idx_item_revisions (item_id, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- A change to a published library item that is waiting for an admin (content approval on). The live item stays as it is.
CREATE TABLE IF NOT EXISTS content_item_drafts (
  item_id   VARCHAR(80)  NOT NULL PRIMARY KEY,
  data      MEDIUMTEXT   NOT NULL,
  meta      TEXT         NOT NULL,
  base_version INT       NOT NULL,
  saved_by  VARCHAR(120) NOT NULL,
  saved_at  VARCHAR(40)  NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Resources searches that found nothing: shows writers which articles people are looking for.
CREATE TABLE IF NOT EXISTS search_misses (
  q        VARCHAR(191) NOT NULL PRIMARY KEY,
  count    INT          NOT NULL DEFAULT 1,
  first_at VARCHAR(40)  NOT NULL,
  last_at  VARCHAR(40)  NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Media library: images and PDFs uploaded in /admin/media, served at /media/<id>-<name>.<ext>.
CREATE TABLE IF NOT EXISTS media (
  id         VARCHAR(8)   NOT NULL PRIMARY KEY,
  name       VARCHAR(200) NOT NULL,
  mime       VARCHAR(40)  NOT NULL,
  ext        VARCHAR(5)   NOT NULL,
  size       INT          NOT NULL,
  width      INT          NULL,
  height     INT          NULL,
  alt        VARCHAR(300) NOT NULL DEFAULT '',
  sha256     CHAR(64)     NOT NULL,
  data       LONGBLOB     NOT NULL,
  created_at VARCHAR(40)  NOT NULL,
  created_by VARCHAR(120) NOT NULL DEFAULT '',
  UNIQUE KEY uq_media_sha (sha256)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- "Was this helpful?" on articles: running totals, and the short notes readers leave when it wasn't.
CREATE TABLE IF NOT EXISTS article_feedback (
  item_id    VARCHAR(80) NOT NULL PRIMARY KEY,
  helpful    INT         NOT NULL DEFAULT 0,
  unhelpful  INT         NOT NULL DEFAULT 0,
  updated_at VARCHAR(40) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS article_feedback_notes (
  id      INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
  item_id VARCHAR(80)  NOT NULL,
  note    VARCHAR(500) NOT NULL,
  at      VARCHAR(40)  NOT NULL,
  INDEX idx_feedback_notes (item_id, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Toolkit catalogue and action reference, imported from the product's own export (docs/ACTION-CATALOG-FORMAT.md).
CREATE TABLE IF NOT EXISTS action_catalog (
  toolkit_id VARCHAR(60)  NOT NULL PRIMARY KEY,
  sort       INT          NOT NULL DEFAULT 0,
  name       VARCHAR(120) NOT NULL,
  category   VARCHAR(80)  NOT NULL DEFAULT 'Other',
  connector  TINYINT      NOT NULL DEFAULT 0,
  data       MEDIUMTEXT   NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS catalog_meta (
  id          TINYINT      NOT NULL PRIMARY KEY,
  version     VARCHAR(40)  NOT NULL DEFAULT '',
  imported_at VARCHAR(40)  NOT NULL,
  imported_by VARCHAR(120) NOT NULL DEFAULT '',
  toolkits    INT          NOT NULL DEFAULT 0,
  actions     INT          NOT NULL DEFAULT 0,
  connectors  INT          NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
