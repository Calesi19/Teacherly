CREATE TABLE "assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"teacher_id" uuid NOT NULL,
	"class_id" uuid NOT NULL,
	"name" text NOT NULL,
	"max_score" numeric(10, 2) NOT NULL,
	"assigned_on" date NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assessments_id_teacher_id_key" UNIQUE("id","teacher_id"),
	CONSTRAINT "assessments_name_not_blank" CHECK (length(btrim("assessments"."name")) > 0),
	CONSTRAINT "assessments_max_score_positive" CHECK ("assessments"."max_score" > 0)
);
--> statement-breakpoint
CREATE TABLE "classes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"teacher_id" uuid NOT NULL,
	"name" text NOT NULL,
	"course_name" text NOT NULL,
	"scale_a" numeric(5, 2) DEFAULT 90 NOT NULL,
	"scale_b" numeric(5, 2) DEFAULT 80 NOT NULL,
	"scale_c" numeric(5, 2) DEFAULT 70 NOT NULL,
	"scale_d" numeric(5, 2) DEFAULT 60 NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "classes_id_teacher_id_key" UNIQUE("id","teacher_id"),
	CONSTRAINT "classes_name_not_blank" CHECK (length(btrim("classes"."name")) > 0),
	CONSTRAINT "classes_course_name_not_blank" CHECK (length(btrim("classes"."course_name")) > 0),
	CONSTRAINT "classes_scale_descending" CHECK ("classes"."scale_a" > "classes"."scale_b" AND "classes"."scale_b" > "classes"."scale_c" AND "classes"."scale_c" > "classes"."scale_d"),
	CONSTRAINT "classes_scale_in_range" CHECK ("classes"."scale_a" <= 100 AND "classes"."scale_d" > 0)
);
--> statement-breakpoint
CREATE TABLE "grades" (
	"teacher_id" uuid NOT NULL,
	"assessment_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"score" numeric(10, 2),
	"exempt" boolean DEFAULT false NOT NULL,
	"late" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "grades_pkey" PRIMARY KEY("assessment_id","student_id"),
	CONSTRAINT "grades_score_non_negative" CHECK ("grades"."score" IS NULL OR "grades"."score" >= 0)
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"teacher_id" uuid NOT NULL,
	"class_id" uuid NOT NULL,
	"name" text NOT NULL,
	"student_number" text,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "students_id_teacher_id_key" UNIQUE("id","teacher_id"),
	CONSTRAINT "students_name_not_blank" CHECK (length(btrim("students"."name")) > 0)
);
--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_class_fk" FOREIGN KEY ("class_id","teacher_id") REFERENCES "public"."classes"("id","teacher_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_teacher_id_teachers_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grades" ADD CONSTRAINT "grades_assessment_fk" FOREIGN KEY ("assessment_id","teacher_id") REFERENCES "public"."assessments"("id","teacher_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grades" ADD CONSTRAINT "grades_student_fk" FOREIGN KEY ("student_id","teacher_id") REFERENCES "public"."students"("id","teacher_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_class_fk" FOREIGN KEY ("class_id","teacher_id") REFERENCES "public"."classes"("id","teacher_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assessments_class_id_idx" ON "assessments" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "assessments_teacher_id_idx" ON "assessments" USING btree ("teacher_id");--> statement-breakpoint
CREATE INDEX "classes_teacher_id_idx" ON "classes" USING btree ("teacher_id");--> statement-breakpoint
CREATE INDEX "grades_teacher_id_idx" ON "grades" USING btree ("teacher_id");--> statement-breakpoint
CREATE INDEX "grades_student_id_idx" ON "grades" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "students_class_id_idx" ON "students" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "students_teacher_id_idx" ON "students" USING btree ("teacher_id");