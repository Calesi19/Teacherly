use base64::Engine;
use std::sync::Mutex;
use tauri::async_runtime::spawn;
use tauri::Manager;
use tauri_plugin_sql::{Migration, MigrationKind};

const CURRENT_DB_URL: &str = "sqlite:teacherly.db";
const CURRENT_DB_FILE: &str = "teacherly.db";
const LEGACY_DB_FILE: &str = "tizara.db";

struct SetupState {
    frontend_task: bool,
    backend_task: bool,
}

#[tauri::command]
fn write_pdf(path: String, data_base64: String) -> Result<(), String> {
    let data = base64::engine::general_purpose::STANDARD
        .decode(&data_base64)
        .map_err(|e| e.to_string())?;
    if let Some(parent) = std::path::Path::new(&path).parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    std::fs::write(&path, &data).map_err(|e| e.to_string())
}

#[tauri::command]
fn set_complete(
    app: tauri::AppHandle,
    state: tauri::State<'_, Mutex<SetupState>>,
    task: String,
) -> Result<(), String> {
    let mut state_lock = state.lock().map_err(|e| e.to_string())?;

    match task.as_str() {
        "frontend" => state_lock.frontend_task = true,
        "backend" => state_lock.backend_task = true,
        _ => return Err(format!("invalid startup task: {task}")),
    }

    if state_lock.frontend_task && state_lock.backend_task {
        let main_window = app
            .get_webview_window("main")
            .ok_or_else(|| "main window not found".to_string())?;

        main_window.show().map_err(|e| e.to_string())?;
        main_window.set_focus().map_err(|e| e.to_string())?;
    }

    Ok(())
}

async fn finish_backend_setup(app: tauri::AppHandle) -> Result<(), String> {
    set_complete(
        app.clone(),
        app.state::<Mutex<SetupState>>(),
        "backend".to_string(),
    )
}

fn migrate_legacy_database(app: &tauri::AppHandle) -> Result<(), String> {
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;

    std::fs::create_dir_all(&app_data_dir).map_err(|e| e.to_string())?;

    let current_db_path = app_data_dir.join(CURRENT_DB_FILE);
    if current_db_path.exists() {
        return Ok(());
    }

    let legacy_db_path = app_data_dir.join(LEGACY_DB_FILE);
    if !legacy_db_path.exists() {
        return Ok(());
    }

    std::fs::copy(&legacy_db_path, &current_db_path)
        .map(|_| ())
        .map_err(|e| e.to_string())
}

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
        Migration {
            version: 15,
            description: "add_tags_to_student_notes",
            sql: "ALTER TABLE student_notes ADD COLUMN tags TEXT NOT NULL DEFAULT '';",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 16,
            description: "create_canceled_days_table",
            sql: "CREATE TABLE IF NOT EXISTS canceled_days (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                group_id   INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
                date       TEXT    NOT NULL,
                reason     TEXT,
                is_deleted INTEGER NOT NULL DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT uq_canceled_day UNIQUE (group_id, date)
            );",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 17,
            description: "create_student_addresses_table",
            sql: "CREATE TABLE IF NOT EXISTS student_addresses (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
                label      TEXT,
                street     TEXT    NOT NULL,
                city       TEXT,
                state      TEXT,
                zip_code   TEXT,
                country    TEXT,
                is_deleted INTEGER NOT NULL DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 18,
            description: "add_is_primary_guardian_to_contacts",
            sql: "ALTER TABLE contacts ADD COLUMN is_primary_guardian INTEGER NOT NULL DEFAULT 0;",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 19,
            description: "add_is_student_home_to_addresses",
            sql: "ALTER TABLE student_addresses ADD COLUMN is_student_home INTEGER NOT NULL DEFAULT 0;",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 20,
            description: "create_student_services_table",
            sql: "CREATE TABLE IF NOT EXISTS student_services (
                id                    INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id            INTEGER NOT NULL UNIQUE REFERENCES students(id) ON DELETE CASCADE,
                has_special_education INTEGER NOT NULL DEFAULT 0,
                therapy_speech        INTEGER NOT NULL DEFAULT 0,
                therapy_occupational  INTEGER NOT NULL DEFAULT 0,
                therapy_psychological INTEGER NOT NULL DEFAULT 0,
                therapy_physical      INTEGER NOT NULL DEFAULT 0,
                medical_plan          TEXT    NOT NULL DEFAULT 'none',
                has_treatment         INTEGER NOT NULL DEFAULT 0,
                is_deleted            INTEGER NOT NULL DEFAULT 0,
                created_at            DATETIME DEFAULT CURRENT_TIMESTAMP
            );",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 21,
            description: "create_student_accommodations_table",
            sql: "CREATE TABLE IF NOT EXISTS student_accommodations (
                id                  INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id          INTEGER NOT NULL UNIQUE REFERENCES students(id) ON DELETE CASCADE,
                desk_placement      INTEGER NOT NULL DEFAULT 0,
                extended_time       INTEGER NOT NULL DEFAULT 0,
                shorter_assignments INTEGER NOT NULL DEFAULT 0,
                use_abacus          INTEGER NOT NULL DEFAULT 0,
                simple_instructions INTEGER NOT NULL DEFAULT 0,
                visual_examples     INTEGER NOT NULL DEFAULT 0,
                is_deleted          INTEGER NOT NULL DEFAULT 0,
                created_at          DATETIME DEFAULT CURRENT_TIMESTAMP
            );",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 22,
            description: "create_student_observations_table",
            sql: "CREATE TABLE IF NOT EXISTS student_observations (
                id                          INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id                  INTEGER NOT NULL UNIQUE REFERENCES students(id) ON DELETE CASCADE,
                obs_reading_writing         INTEGER NOT NULL DEFAULT 0,
                obs_mirror_numbers          INTEGER NOT NULL DEFAULT 0,
                obs_left_right_confusion    INTEGER NOT NULL DEFAULT 0,
                obs_sequence_difficulty     INTEGER NOT NULL DEFAULT 0,
                obs_disorganized_work       INTEGER NOT NULL DEFAULT 0,
                obs_inattention_detail      INTEGER NOT NULL DEFAULT 0,
                obs_sustained_attention     INTEGER NOT NULL DEFAULT 0,
                obs_doesnt_listen           INTEGER NOT NULL DEFAULT 0,
                obs_task_organization       INTEGER NOT NULL DEFAULT 0,
                obs_loses_belongings        INTEGER NOT NULL DEFAULT 0,
                obs_distracted_stimuli      INTEGER NOT NULL DEFAULT 0,
                obs_forgetful               INTEGER NOT NULL DEFAULT 0,
                obs_excess_hand_foot        INTEGER NOT NULL DEFAULT 0,
                obs_gets_up_from_seat       INTEGER NOT NULL DEFAULT 0,
                obs_running_jumping         INTEGER NOT NULL DEFAULT 0,
                obs_talks_excessively       INTEGER NOT NULL DEFAULT 0,
                obs_difficulty_quiet        INTEGER NOT NULL DEFAULT 0,
                obs_driven_by_motor         INTEGER NOT NULL DEFAULT 0,
                obs_impulsive_answers       INTEGER NOT NULL DEFAULT 0,
                obs_difficulty_waiting      INTEGER NOT NULL DEFAULT 0,
                obs_interrupts_others       INTEGER NOT NULL DEFAULT 0,
                obs_easily_angered          INTEGER NOT NULL DEFAULT 0,
                obs_argues                  INTEGER NOT NULL DEFAULT 0,
                obs_defies_adults           INTEGER NOT NULL DEFAULT 0,
                obs_annoys_others           INTEGER NOT NULL DEFAULT 0,
                obs_aggressive              INTEGER NOT NULL DEFAULT 0,
                obs_spiteful                INTEGER NOT NULL DEFAULT 0,
                obs_blames_others           INTEGER NOT NULL DEFAULT 0,
                obs_breaks_property         INTEGER NOT NULL DEFAULT 0,
                obs_incomplete_homework     INTEGER NOT NULL DEFAULT 0,
                obs_frequent_absences       INTEGER NOT NULL DEFAULT 0,
                obs_neglected_appearance    INTEGER NOT NULL DEFAULT 0,
                obs_uses_profanity          INTEGER NOT NULL DEFAULT 0,
                obs_takes_belongings        INTEGER NOT NULL DEFAULT 0,
                obs_forgets_materials       INTEGER NOT NULL DEFAULT 0,
                obs_appears_sad             INTEGER NOT NULL DEFAULT 0,
                is_deleted                  INTEGER NOT NULL DEFAULT 0,
                created_at                  DATETIME DEFAULT CURRENT_TIMESTAMP
            );",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 23,
            description: "add_allergies_to_student_services",
            sql: "ALTER TABLE student_services ADD COLUMN allergies TEXT;",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 24,
            description: "add_enrollment_end_date_to_students",
            sql: "ALTER TABLE students ADD COLUMN enrollment_end_date TEXT;",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 25,
            description: "add_school_name_to_groups",
            sql: "ALTER TABLE groups ADD COLUMN school_name TEXT;",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 26,
            description: "add_conditions_to_student_services",
            sql: "ALTER TABLE student_services ADD COLUMN conditions TEXT;",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 27,
            description: "add_educational_therapy_to_student_services",
            sql: "ALTER TABLE student_services ADD COLUMN therapy_educational INTEGER NOT NULL DEFAULT 0;",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 28,
            description: "add_tag_to_assignments",
            sql: "ALTER TABLE assignments ADD COLUMN tag TEXT NOT NULL DEFAULT 'Homework';",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 29,
            description: "add_exempt_late_note_to_assignment_scores",
            sql: "ALTER TABLE assignment_scores ADD COLUMN exempt INTEGER NOT NULL DEFAULT 0;
                  ALTER TABLE assignment_scores ADD COLUMN late INTEGER NOT NULL DEFAULT 0;
                  ALTER TABLE assignment_scores ADD COLUMN note TEXT;",
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .manage(Mutex::new(SetupState {
            frontend_task: false,
            backend_task: false,
        }))
        .setup(|app| {
            migrate_legacy_database(&app.handle())?;
            spawn(finish_backend_setup(app.handle().clone()));
            Ok(())
        })
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations(CURRENT_DB_URL, migrations)
                .build(),
        )
        .invoke_handler(tauri::generate_handler![write_pdf, set_complete])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
