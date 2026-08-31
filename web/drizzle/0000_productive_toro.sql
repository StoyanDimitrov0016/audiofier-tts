CREATE TABLE "collections" (
	"id" varchar(80) PRIMARY KEY NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "generated_audio" (
	"collection_id" varchar(80) NOT NULL,
	"lesson_id" varchar(80) NOT NULL,
	"lesson_output_dir" text NOT NULL,
	"wav_path" text NOT NULL,
	"mp3_path" text,
	"chunk_count" integer NOT NULL,
	"cleaned_character_count" integer NOT NULL,
	"duration_seconds" real NOT NULL,
	"formatted_duration" varchar(80) NOT NULL,
	"model_id" varchar(160),
	"voice" varchar(160),
	"model_source" text,
	"instruct" text,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "generated_audio_collection_id_lesson_id_pk" PRIMARY KEY("collection_id","lesson_id")
);
--> statement-breakpoint
CREATE TABLE "lessons" (
	"collection_id" varchar(80) NOT NULL,
	"id" varchar(80) NOT NULL,
	"title" varchar(240) NOT NULL,
	"lesson_order" integer NOT NULL,
	"markdown" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lessons_collection_id_id_pk" PRIMARY KEY("collection_id","id"),
	CONSTRAINT "lessons_order_positive" CHECK ("lessons"."lesson_order" >= 1)
);
--> statement-breakpoint
ALTER TABLE "generated_audio" ADD CONSTRAINT "generated_audio_collection_id_lesson_id_lessons_collection_id_id_fk" FOREIGN KEY ("collection_id","lesson_id") REFERENCES "public"."lessons"("collection_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "collections_title_idx" ON "collections" USING btree ("title");--> statement-breakpoint
CREATE UNIQUE INDEX "lessons_collection_order_unique" ON "lessons" USING btree ("collection_id","lesson_order");--> statement-breakpoint
CREATE INDEX "lessons_collection_title_idx" ON "lessons" USING btree ("collection_id","title");