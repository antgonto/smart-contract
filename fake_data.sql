INSERT INTO api_user (user_id, username, email, role, password, last_login, is_active, date_joined) VALUES
(1, 'admin_user', 'admin@example.com', 'admin', '$2a$12$tI3KXJZxFZhJ/d9cu95kZOp4.m496bBgRKuVN9g7xhRHEOy7.EpMe', '2023-08-15 14:30:00', true, '2023-01-10 09:00:00'),
(2, 'john_analyst', 'john@example.com', 'analyst', '$2a$12$3fI5t7zdKQh7QjdGPEEureq3XeVBq1b0Cy5Y9s97T8OiJ2aEmq55i', '2023-08-20 11:45:00', true, '2023-02-05 10:15:00'),
(3, 'sarah_manager', 'sarah@example.com', 'manager', '$2a$12$qxq7SeLn3zZwxLQyQ.cPv.IHFtxPZpYPVOKLHSVxbQ4Nj3eTJ6tDS', '2023-08-21 08:15:00', true, '2023-02-20 14:30:00'),
(4, 'mike_analyst', 'mike@example.com', 'analyst', '$2a$12$2xyX76ShH/saC.AZH9h9EOvfmL6UO337J9UgFB7Ea0M3hfKM1J.dS', '2023-08-18 16:20:00', true, '2023-03-15 11:00:00'),
(5, 'lisa_user', 'lisa@example.com', 'user', '$2a$12$dfr5JU3DAQlgZK7KCT9ruO9.X0.aXpgkUyvKcCHlJeBXb.5YZ2ZZe', '2023-08-10 09:30:00', true, '2023-04-05 09:45:00'),
(6, 'david_manager', 'david@example.com', 'manager', '$2a$12$n.jZ8x4SHq9YwhkFJZXCZOYWLzKZX3qHI9L0IVr2/MTsZs3QR.kX.', '2023-08-19 10:00:00', true, '2023-04-20 13:15:00'),
(7, 'emma_user', 'emma@example.com', 'user', '$2a$12$tca5NE/37.vT4RAHsrwD9.bqaLG0OnZPQME3nEFXdyfKRT/WK9iEa', NULL, true, '2023-05-12 15:30:00'),
(8, 'james_analyst', 'james@example.com', 'analyst', '$2a$12$v6GJS2XUGUFv01SQiV5EEeWUQA8OLJk2OXV6iW27X2PZ2EwEq1GOS', '2023-08-17 13:45:00', true, '2023-06-01 08:00:00'),
(9, 'alex_inactive', 'alex@example.com', 'user', '$2a$12$CQIIwEXVpufyAG9SAh2mP.WJgefzLMNw.a2WlZMbkxYxLgK5oVgJC', '2023-07-10 11:00:00', false, '2023-06-15 10:30:00'),
(10, 'olivia_user', 'olivia@example.com', 'user', '$2a$12$I01mAh3uT43gjcEkDGXuru/aI.mTyZ8BDEGCQSv4S9P9E0KQFkFKO', '2023-08-15 15:15:00', true, '2023-07-01 09:15:00');

-- 2. Assets
INSERT INTO api_asset (asset_id, asset_name, asset_type, location, owner, criticality_level) VALUES
(1, 'Web Server Alpha', 'Web Server', 'Data Center', 1, 'Critical'),
(2,'HR Database', 'HR Database', 'Cloud-HR', 3, 'High'),
(3,'Marketing Laptop', 'Marketing Endpoint', 'Office 201', 4, 'Medium'),
(4,'Finance File Server', 'File Server', 'Data Center', 6, 'Critical'),
(5,'Guest WiFi Network', 'Network', 'All Offices', 2, 'Low-1'),
(6,'Customer Data Database', 'Customer Database', 'Cloud-Customer', 7, 'Critical'),
(7,'Dev Environment', 'Virtual Machine', 'Cloud-Dev', 5, 'Medium'),
(8,'Executive Workstation', 'Executive Endpoint', 'Office 101', 8, 'High'),
(9,'Workstation', 'Executive Endpoint', '101', 8, 'Low'),
(10,'Work', 'Executive Endpoint', 'Dev', 5, 'Medium');



-- 3. Vulnerabilities
INSERT INTO api_vulnerability (vulnerability_id, title, description, severity, cve_reference, remediation_steps, discovery_date, patch_available) VALUES
(1,'SQL Injection', 'Ability to inject SQL commands via form inputs', 'Critical', 'CVE-2022-1234', 'Implement prepared statements and input validation', '2022-02-15 10:30:00', true),
(2,'Cross-Site Scripting', 'Vulnerable to XSS attacks through unvalidated user input', 'High', 'CVE-2022-5678', 'Implement content security policy and output encoding', '2022-03-21 14:45:00', true),
(3,'Outdated SSL', 'Server using deprecated SSL v3', 'Medium', 'CVE-2021-9876', 'Upgrade to TLS 1.3', '2021-11-05 09:15:00', true),
(4,'Default Credentials', 'System using factory default login credentials', 'Critical', 'CVE-2020-8765', 'Change all default passwords and implement password policy', '2020-09-18 16:20:00', true),
(5,'Unpatched Operating System', 'Missing critical security patches', 'High', 'CVE-2023-1111', 'Apply latest security patches and implement patch management process', '2023-01-30 11:00:00', true),
(6,'Open SMTP Relay', 'Mail server configured as an open relay', 'High', 'CVE-2021-5432', 'Reconfigure mail server to require authentication', '2021-07-12 13:40:00', true);


-- 4. Asset Vulnerabilities
INSERT INTO asset_vulnerabilities (asset_id, vulnerability_id, date_discovered, status) VALUES
(1, 1, '2023-05-15', 'Open'),
(1, 3, '2023-05-16', 'Mitigated'),
(2, 1, '2023-05-20', 'Open'),
(3, 5, '2023-05-21', 'Resolved'),
(4, 4, '2023-05-25', 'Open'),
(6, 1, '2023-05-27', 'In Progress'),
(7, 2, '2023-05-28', 'Open'),
(7, 5, '2023-05-29', 'Open');

-- 5. Incidents
INSERT INTO api_incident (incident_id, incident_type, description, severity, status, assigned_to_id, reported_date, resolved_date) VALUES
(1,'Data Breach', 'Unauthorized access to customer database detected', 'Critical', 'active', 5, '2023-06-15 09:30:00', NULL),
(2,'Malware', 'Ransomware detected on marketing department systems', 'High', 'investigating', 3, '2023-06-10 14:22:00', NULL),
(3,'DDoS', 'Distributed denial of service attack on public website', 'Medium', 'resolved', 2, '2023-05-28 10:15:00', '2023-05-28 15:45:00'),
(4,'Phishing', 'Targeted phishing campaign against executive team', 'High', 'contained', 5, '2023-06-05 08:45:00', NULL),
(5,'Insider Threat', 'Suspicious data exfiltration by terminated employee', 'Medium', 'active', 4, '2023-06-18 11:20:00', NULL),
(6,'Vulnerability', 'Critical zero-day vulnerability in web application', 'High', 'investigating', 1, '2023-06-20 16:10:00', NULL),
(7,'Unauthorized Access', 'Login attempts from unknown IP addresses', 'Low', 'resolved', 3, '2023-05-15 07:30:00', '2023-05-15 14:20:00');

-- 6. Incident Assets
INSERT INTO incident_assets (incident_id, asset_id, impact_level) VALUES
(1, 6, 'Critical'),
(2, 3, 'Medium'),
(3, 1, 'High'),
(4, 8, 'Medium'),
(5, 4, 'High');

-- 7. Alerts
INSERT INTO api_alert (source, name, alert_type, alert_time, severity, status, incident_id) VALUES
('IDS', 'IDS Signature Alert', 'Signature Match', '2023-04-10 08:15:00', 'Critical', 'Closed', 1),
('Antivirus', 'Malware Alert', 'Malware Detection', '2023-04-20 10:05:00', 'High', 'Closed', 2),
('Network Monitor', 'Traffic Anomaly Alert', 'Traffic Anomaly', '2023-05-05 09:00:00', 'High', 'Closed', 3),
('Email Gateway', 'Phishing Email Alert', 'Phishing Detection', '2023-06-01 11:25:00', 'Medium', 'Active', 4),
('SIEM', 'Login Anomaly Alert', 'Abnormal Login', '2023-06-10 22:10:00', 'High', 'Active', 5),
('IDS', 'Port Scan Alert', 'Port Scan', '2023-06-12 14:35:00', 'Low', 'Active', NULL),
('Firewall', 'Firewall Rule Violation', 'Rule Violation', '2023-06-13 16:40:00', 'Medium', 'Active', NULL);

-- 8. Threat Intelligence
INSERT INTO api_threatintelligence (threat_id, threat_actor_name, indicator_type, indicator_value, confidence_level, description, related_cve, date_identified, last_updated)
VALUES
(1, 'APT29', 'domain', 'malicious-domain.com', 'High', 'Russian state-sponsored group targeting government entities', 'CVE-2021-44228', '2023-01-15', '2023-01-15'),
(2, 'Lazarus Group', 'ip_address', '192.168.1.100', 'Medium', 'North Korean threat group focusing on financial theft', 'CVE-2020-0601', '2023-02-20', '2023-01-15'),
(3, 'FIN7', 'hash', 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4', 'High', 'Financial crime group targeting retail and hospitality', 'CVE-2019-0708', '2023-03-10', '2023-01-15'),
(4, 'Sandworm', 'url', 'https://malicious-site.net/payload', 'High', 'Russian military unit targeting critical infrastructure', NULL, '2023-04-05', '2023-01-15'),
(5, 'Cobalt Group', 'email', 'phishing@fake-bank.com', 'Medium', 'Financial threat actor targeting banking systems', 'CVE-2017-11882', '2023-05-12', '2023-01-15'),
(6, 'Group', 'email', 'phishing3@fake-bank.com', 'High', 'Threat actor targeting banking systems', 'CVE-2017-11882', '2023-05-12', '2023-01-15');

-- 9. Threat-Asset Association
INSERT INTO threat_asset_association (threat_id, asset_id, notes)
VALUES
(1, 1, 'Primary target for SQL injection attempts'),
(1, 3, 'Database server vulnerable to the threat actor techniques'),
(1, 5, 'Potential secondary target if primary defenses are breached'),
(2, 2, 'Web server targeted through malicious scripts'),
(2, 4, 'Customer portal shows evidence of XSS probing attempts'),
(2, 7, 'Development environment used for testing exploits'),
(3, 1, 'Production API server uses outdated SSL libraries'),
(3, 6, 'VPN server needs certificate and protocol updates'),
(3, 8, 'Mobile application app vulnerable to SSL downgrade attacks'),
(4, 3, 'Default admin credentials never changed since installation'),
(4, 9, 'IoT devices with factory settings detected'),
(4, 10, 'Network equipment using default community strings'),
(5, 5, 'Critical server missing latest security patches'),
(5, 7, 'Development server rarely updated'),
(5, 8, 'Mobile app running vulnerable OS version');

-- 10. Threat-Vulnerability Association
INSERT INTO threat_vulnerability_association (threat_id, vulnerability_id, notes)
VALUES
(1, 1, 'Primary SQL injection vulnerability actively exploited by this threat actor'),
(1, 4, 'Default credentials used to gain access before launching SQL injection'),
(2, 2, 'Sophisticated XSS techniques observed in exploitation attempts'),
(2, 5, 'Uses unpatched systems as entry points before deploying XSS payloads'),
(3, 3, 'Specialized in exploiting outdated SSL implementations'),
(3, 6, 'Uses SMTP relay access to distribute SSL exploit payloads'),
(4, 4, 'Primary technique involves brute forcing default credential combinations'),
(4, 5, 'Uses unpatched systems that often have default credentials'),
(5, 5, 'Specialized in identifying and exploiting unpatched OS vulnerabilities'),
(5, 3, 'Uses outdated SSL as an entry point before escalating to OS-level exploits'),
(6, 6, 'Primary focus is on exploiting SMTP relay configurations'),
(6, 4, 'Often uses default credentials to access mail servers initially');

-- 11. Threat-Incident Association
INSERT INTO threat_incident_association (threat_id, incident_id, notes) VALUES
(1, 1, 'Strong evidence of APT29 involvement based on TTPs'),
(2, 2, 'IP address patterns match Lazarus Group infrastructure'),
(3, 3, 'Hash matches known FIN7 malware variant'),
(4, 1, 'URL associated with recent Sandworm campaign'),
(5, 4, 'Phishing email confirmed to be from Cobalt Group operation');

-- 12. User Activity Logs
INSERT INTO user_activity_logs (user_id, activity_type, timestamp, description) VALUES
(1, 'Login', '2023-06-15 08:30:00', 'Successful login from 10.0.0.15'),
(1, 'Configuration Change', '2023-06-15 09:15:00', 'Updated firewall rules'),
(2, 'Report Generation', '2023-06-14 14:30:00', 'Generated vulnerability assessment report'),
(3, 'Asset Creation', '2023-06-13 11:50:00', 'Created new asset record'),
(4, 'Password Reset', '2023-06-10 09:20:00', 'Reset password for account'),
(2, 'Alert Investigation', '2023-06-12 10:45:00', 'Investigated and triaged IDS alert');