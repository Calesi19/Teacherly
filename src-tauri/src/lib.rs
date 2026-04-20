use tauri_plugin_sql::{Migration, MigrationKind};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "create_classrooms_table",
            sql: "CREATE TABLE IF NOT EXISTS classrooms (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                subject TEXT,
                grade TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "create_students_table",
            sql: "CREATE TABLE IF NOT EXISTS students (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                classroom_id INTEGER NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
                name TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "create_family_members_table",
            sql: "CREATE TABLE IF NOT EXISTS family_members (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
                name TEXT NOT NULL,
                relationship TEXT,
                phone TEXT,
                email TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "add_student_extended_fields",
            sql: "ALTER TABLE students ADD COLUMN gender TEXT;
                  ALTER TABLE students ADD COLUMN birthdate TEXT;
                  ALTER TABLE students ADD COLUMN student_number TEXT;
                  ALTER TABLE students ADD COLUMN enrollment_date TEXT;",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 5,
            description: "add_family_member_emergency_contact",
            sql: "ALTER TABLE family_members ADD COLUMN is_emergency_contact INTEGER NOT NULL DEFAULT 0;",
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
