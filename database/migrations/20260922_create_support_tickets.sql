CREATE TABLE IF NOT EXISTS mdl_support_ticket (
  id BIGINT NOT NULL AUTO_INCREMENT,
  created_by BIGINT NOT NULL,
  type ENUM('BUG', 'ERROR', 'QUESTION', 'SUGGESTION') NOT NULL,
  subject VARCHAR(160) NOT NULL,
  description TEXT NOT NULL,
  priority ENUM('LOW', 'MEDIUM', 'HIGH') NOT NULL DEFAULT 'MEDIUM',
  status ENUM('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED') NOT NULL DEFAULT 'OPEN',
  context_url VARCHAR(500) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  resolved_at DATETIME NULL,
  resolved_by BIGINT NULL,
  PRIMARY KEY (id),
  INDEX idx_support_ticket_created_by (created_by),
  INDEX idx_support_ticket_status_updated (status, updated_at),
  INDEX idx_support_ticket_type (type),
  INDEX idx_support_ticket_priority (priority)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS mdl_support_message (
  id BIGINT NOT NULL AUTO_INCREMENT,
  ticket_id BIGINT NOT NULL,
  author_id BIGINT NOT NULL,
  author_role ENUM('ADMIN', 'EVALUADOR') NOT NULL,
  message TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_support_message_ticket_created (ticket_id, created_at),
  CONSTRAINT fk_support_message_ticket
    FOREIGN KEY (ticket_id) REFERENCES mdl_support_ticket(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
