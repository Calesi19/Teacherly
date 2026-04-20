use tauri_plugin_sql::{Migration, MigrationKind};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "create_groups_table",
            sql: "CREATE TABLE IF NOT EXISTS groups (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                name       TEXT    NOT NULL,
                subject    TEXT,
                grade      TEXT,
                is_deleted INTEGER NOT NULL DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "create_students_table",
            sql: "CREATE TABLE IF NOT EXISTS students (
                id               INTEGER PRIMARY KEY AUTOINCREMENT,
                group_id         INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
                name             TEXT    NOT NULL,
                gender           TEXT,
                birthdate        TEXT,
                student_number   TEXT,
                enrollment_date  TEXT,
                is_deleted       INTEGER NOT NULL DEFAULT 0,
                created_at       DATETIME DEFAULT CURRENT_TIMESTAMP
            );",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "create_family_members_table",
            sql: "CREATE TABLE IF NOT EXISTS family_members (
                id                   INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id           INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
                name                 TEXT    NOT NULL,
                relationship         TEXT,
                phone                TEXT,
                email                TEXT,
                is_emergency_contact INTEGER NOT NULL DEFAULT 0,
                is_deleted           INTEGER NOT NULL DEFAULT 0,
                created_at           DATETIME DEFAULT CURRENT_TIMESTAMP
            );",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "create_student_notes_table",
            sql: "CREATE TABLE IF NOT EXISTS student_notes (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
                content    TEXT    NOT NULL,
                is_deleted INTEGER NOT NULL DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 5,
            description: "create_schedule_periods_table",
            sql: "CREATE TABLE IF NOT EXISTS schedule_periods (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                group_id    INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
                day_of_week INTEGER NOT NULL,
                name        TEXT    NOT NULL,
                start_time  TEXT    NOT NULL,
                end_time    TEXT    NOT NULL,
                sort_order  INTEGER NOT NULL DEFAULT 0,
                is_deleted  INTEGER NOT NULL DEFAULT 0,
                created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
            );",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 6,
            description: "create_attendance_records_table",
            sql: "CREATE TABLE IF NOT EXISTS attendance_records (
                id                 INTEGER PRIMARY KEY AUTOINCREMENT,
                schedule_period_id INTEGER NOT NULL REFERENCES schedule_periods(id) ON DELETE CASCADE,
                student_id         INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
                date               TEXT    NOT NULL,
                status             TEXT    NOT NULL DEFAULT 'present',
                is_deleted         INTEGER NOT NULL DEFAULT 0,
                created_at         DATETIME DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT chk_status CHECK (status IN ('present','absent','late','early_pickup')),
                CONSTRAINT uq_attendance UNIQUE (schedule_period_id, student_id, date)
            );",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 7,
            description: "rename_family_members_to_contacts",
            sql: "ALTER TABLE family_members RENAME TO contacts;",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 8,
            description: "create_visitations_table",
            sql: "CREATE TABLE IF NOT EXISTS visitations (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
                contact_id INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
                notes      TEXT,
                visited_at TEXT    NOT NULL DEFAULT CURRENT_DATE,
                is_deleted INTEGER NOT NULL DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 9,
            description: "create_assignments_table",
            sql: "CREATE TABLE IF NOT EXISTS assignments (
                id                 INTEGER PRIMARY KEY AUTOINCREMENT,
                group_id           INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
                schedule_period_id INTEGER NOT NULL REFERENCES schedule_periods(id) ON DELETE CASCADE,
                title              TEXT    NOT NULL,
                description        TEXT,
                max_score          REAL    NOT NULL,
                is_deleted         INTEGER NOT NULL DEFAULT 0,
                created_at         DATETIME DEFAULT CURRENT_TIMESTAMP
            );",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 10,
            description: "create_assignment_scores_table",
            sql: "CREATE TABLE IF NOT EXISTS assignment_scores (
                id            INTEGER PRIMARY KEY AUTOINCREMENT,
                assignment_id INTEGER NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
                student_id    INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
                score         REAL,
                is_deleted    INTEGER NOT NULL DEFAULT 0,
                created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT uq_assignment_score UNIQUE (assignment_id, student_id)
            );",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 11,
            description: "assignments_use_period_name",
            sql: "CREATE TABLE IF NOT EXISTS assignments_v2 (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                group_id    INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
                period_name TEXT    NOT NULL,
                title       TEXT    NOT NULL,
                description TEXT,
                max_score   REAL    NOT NULL,
                is_deleted  INTEGER NOT NULL DEFAULT 0,
                created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            INSERT OR IGNORE INTO assignments_v2 (id, group_id, period_name, title, description, max_score, is_deleted, created_at)
                SELECT a.id, a.group_id, COALESCE(sp.name, ''), a.title, a.description, a.max_score, a.is_deleted, a.created_at
                FROM assignments a LEFT JOIN schedule_periods sp ON sp.id = a.schedule_period_id;
            DROP TABLE assignments;
            ALTER TABLE assignments_v2 RENAME TO assignments;",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 12,
            description: "add_notes_to_attendance_records",
            sql: "ALTER TABLE attendance_records ADD COLUMN notes TEXT;",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 13,
            description: "add_school_year_dates_to_groups",
            sql: "ALTER TABLE groups ADD COLUMN start_date TEXT;\
                  ALTER TABLE groups ADD COLUMN end_date TEXT;",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 14,
            description: "drop_subject_from_groups",
            sql: "ALTER TABLE groups DROP COLUMN subject;",
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:tizara.db", migrations)
                .build(),
        )
        .invoke_handler(tauri::generate_handler![])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
