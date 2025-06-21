-- Drop & recreate the frontend database
DROP DATABASE IF EXISTS cyber;
CREATE DATABASE cyber
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE cyber;

--------------------------------------------------------------------------------
-- 1) Users
--------------------------------------------------------------------------------
CREATE TABLE api_user (
  user_id       INT            PRIMARY KEY,
  username      VARCHAR(150)   NOT NULL UNIQUE,
  email         VARCHAR(255)   NOT NULL UNIQUE,
  role          VARCHAR(50)    NOT NULL,
  password      VARCHAR(255)   NOT NULL,
  last_login    DATETIME       NULL,
  is_active     BOOLEAN        NOT NULL,
  date_joined   DATETIME       NOT NULL
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

--------------------------------------------------------------------------------
-- 2) Assets
--------------------------------------------------------------------------------
CREATE TABLE api_asset (
  asset_id          INT           PRIMARY KEY,
  asset_name        VARCHAR(255)  NOT NULL,
  asset_type        VARCHAR(100)  NOT NULL,
  location          VARCHAR(255),
  owner             INT,
  criticality_level VARCHAR(50),
  CONSTRAINT fk_asset_owner
    FOREIGN KEY (owner)
    REFERENCES api_user(user_id)
    ON DELETE SET NULL
    ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

--------------------------------------------------------------------------------
-- 3) Vulnerabilities
--------------------------------------------------------------------------------
CREATE TABLE api_vulnerability (
  vulnerability_id  INT           PRIMARY KEY,
  title             VARCHAR(255)  NOT NULL,
  description       TEXT,
  severity          VARCHAR(50),
  cve_reference     VARCHAR(100),
  remediation_steps TEXT,
  discovery_date    DATETIME,
  patch_available   BOOLEAN
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

--------------------------------------------------------------------------------
-- 4) Asset–Vulnerability link
--------------------------------------------------------------------------------
CREATE TABLE asset_vulnerabilities (
  asset_id         INT,
  vulnerability_id INT,
  date_discovered  DATE,
  status           VARCHAR(50),
  PRIMARY KEY (asset_id, vulnerability_id),
  CONSTRAINT fk_av_asset
    FOREIGN KEY (asset_id)
    REFERENCES api_asset(asset_id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_av_vuln
    FOREIGN KEY (vulnerability_id)
    REFERENCES api_vulnerability(vulnerability_id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

--------------------------------------------------------------------------------
-- 5) Incidents
--------------------------------------------------------------------------------
CREATE TABLE api_incident (
  incident_id     INT            PRIMARY KEY,
  incident_type   VARCHAR(100),
  description     TEXT,
  severity        VARCHAR(50),
  status          VARCHAR(50),
  assigned_to_id  INT,
  reported_date   DATETIME,
  resolved_date   DATETIME,
  CONSTRAINT fk_incident_user
    FOREIGN KEY (assigned_to_id)
    REFERENCES api_user(user_id)
    ON DELETE SET NULL
    ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

--------------------------------------------------------------------------------
-- 6) Incident–Asset link
--------------------------------------------------------------------------------
DROP TABLE IF EXISTS incident_assets;
CREATE TABLE incident_assets (
  incident_id   INT          NOT NULL,
  asset_id      INT          NOT NULL,
  impact_level  VARCHAR(50),
  PRIMARY KEY (incident_id, asset_id),
  CONSTRAINT fk_ia_incident
    FOREIGN KEY (incident_id)
    REFERENCES api_incident(incident_id)
      ON DELETE CASCADE
      ON UPDATE CASCADE,
  CONSTRAINT fk_ia_asset
    FOREIGN KEY (asset_id)
    REFERENCES api_asset(asset_id)
      ON DELETE CASCADE
      ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

--------------------------------------------------------------------------------
-- 7) Alerts
--------------------------------------------------------------------------------
CREATE TABLE api_alert (
  alert_id    INT            AUTO_INCREMENT PRIMARY KEY,
  source      VARCHAR(100),
  name        VARCHAR(255),
  alert_type  VARCHAR(100),
  alert_time  DATETIME,
  severity    VARCHAR(50),
  status      VARCHAR(50),
  incident_id INT,
  CONSTRAINT fk_alert_incident
    FOREIGN KEY (incident_id)
    REFERENCES api_incident(incident_id)
    ON DELETE SET NULL
    ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

--------------------------------------------------------------------------------
-- 8) Threat Intelligence
--------------------------------------------------------------------------------
CREATE TABLE api_threatintelligence (
  threat_id          INT           PRIMARY KEY,
  threat_actor_name  VARCHAR(255),
  indicator_type     VARCHAR(50),
  indicator_value    VARCHAR(255),
  confidence_level   VARCHAR(50),
  description        TEXT,
  related_cve        VARCHAR(100),
  date_identified    DATE,
  last_updated       DATE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

--------------------------------------------------------------------------------
-- 9) Threat–Asset link
--------------------------------------------------------------------------------
CREATE TABLE threat_asset_association (
  threat_id INT,
  asset_id  INT,
  notes     TEXT,
  PRIMARY KEY (threat_id, asset_id),
  CONSTRAINT fk_taa_threat
    FOREIGN KEY (threat_id)
    REFERENCES api_threatintelligence(threat_id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_taa_asset
    FOREIGN KEY (asset_id)
    REFERENCES api_asset(asset_id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


  --------------------------------------------------------------------------------
-- 10) Threat–Vulnerability link
--------------------------------------------------------------------------------
CREATE TABLE threat_vulnerability_association (
  threat_id        INT,
  vulnerability_id INT,
  notes            TEXT,
  PRIMARY KEY (threat_id, vulnerability_id),
  CONSTRAINT fk_tva_threat
    FOREIGN KEY (threat_id)
    REFERENCES api_threatintelligence(threat_id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_tva_vuln
    FOREIGN KEY (vulnerability_id)
    REFERENCES api_vulnerability(vulnerability_id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

--------------------------------------------------------------------------------
-- 11) Threat–Incident link
--------------------------------------------------------------------------------
CREATE TABLE threat_incident_association (
  threat_id   INT       NOT NULL,
  incident_id INT       NOT NULL,
  notes       TEXT,
  PRIMARY KEY (threat_id, incident_id),
  CONSTRAINT fk_tia_threat
    FOREIGN KEY (threat_id)
    REFERENCES api_threatintelligence(threat_id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_tia_incident
    FOREIGN KEY (incident_id)
    REFERENCES api_incident(incident_id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

--------------------------------------------------------------------------------
-- 12) User Activity Logs
--------------------------------------------------------------------------------
CREATE TABLE user_activity_logs (
  log_id        INT            AUTO_INCREMENT PRIMARY KEY,
  user_id       INT,
  activity_type VARCHAR(100),
  timestamp     DATETIME,
  description   TEXT,
  CONSTRAINT fk_log_user
    FOREIGN KEY (user_id)
    REFERENCES api_user(user_id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;