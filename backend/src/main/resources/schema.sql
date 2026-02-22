-- ============================================================
-- Create database
-- ============================================================
CREATE DATABASE IF NOT EXISTS chatbot_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE chatbot_db;

-- ============================================================
-- Create label_data table
-- ============================================================
CREATE TABLE IF NOT EXISTS label_data (
    label_id               BIGINT       NOT NULL PRIMARY KEY,
    cao_no                 BIGINT,
    leadset                VARCHAR(100),
    prod_version           INT,
    status                 INT,
    pagoda_place           VARCHAR(50),
    invalid_dt_zt          DATETIME,
    lsl_uniq_nr            VARCHAR(100),
    quantity               INT,
    quantity_produced      INT,
    is_kanban              INT,
    label_info             VARCHAR(255),
    label_info_ext         VARCHAR(255),
    fifo_used              INT,
    subcontractor          VARCHAR(255),
    bundles_feedback_erp_date DATETIME,
    expiration_date        DATETIME,
    insert_time            DATETIME,
    update_time            DATETIME
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- Import CSV data
-- Run this after placing the CSV file in MySQL's secure path
-- Check path with: SHOW VARIABLES LIKE 'secure_file_priv';
-- ============================================================

LOAD DATA INFILE '/path/to/your/file__10_.csv'
INTO TABLE label_data
CHARACTER SET utf8mb4
FIELDS TERMINATED BY ';'
OPTIONALLY ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 ROWS
(
    label_id,
    cao_no,
    leadset,
    prod_version,
    status,
    pagoda_place,
    @invalid_dt_zt,
    lsl_uniq_nr,
    quantity,
    quantity_produced,
    is_kanban,
    label_info,
    label_info_ext,
    fifo_used,
    subcontractor,
    @bundles_feedback_erp_date,
    @expiration_date,
    @insert_time,
    @update_time
)
SET
    invalid_dt_zt             = NULLIF(STR_TO_DATE(@invalid_dt_zt,             '%d/%m/%Y %H:%i'), ''),
    bundles_feedback_erp_date = NULLIF(STR_TO_DATE(@bundles_feedback_erp_date, '%d/%m/%Y %H:%i'), ''),
    expiration_date           = NULLIF(STR_TO_DATE(@expiration_date,           '%d/%m/%Y %H:%i'), ''),
    insert_time               = NULLIF(STR_TO_DATE(@insert_time,               '%d/%m/%Y %H:%i'), ''),
    update_time               = NULLIF(STR_TO_DATE(@update_time,               '%d/%m/%Y %H:%i'), '');

-- ============================================================
-- Useful indexes for chatbot query performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_status       ON label_data (status);
CREATE INDEX IF NOT EXISTS idx_leadset      ON label_data (leadset);
CREATE INDEX IF NOT EXISTS idx_cao_no       ON label_data (cao_no);
CREATE INDEX IF NOT EXISTS idx_pagoda_place ON label_data (pagoda_place);
CREATE INDEX IF NOT EXISTS idx_insert_time  ON label_data (insert_time);
