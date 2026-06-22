
# 현재 Supabase 데이터베이스 스키마

전체 18개 테이블. 모든 테이블의 `id`는 `uuid` PK (기본값 `gen_random_uuid()`).
약어: PK=기본키, FK=외래키, NN=NOT NULL, N=NULL 허용, DEL=삭제 시 동작(CASCADE/SET NULL).

## 1. members (회원 마스터)

| 컬럼 | 타입 | NN | 키 |
|---|---|---|---|
| id | uuid | ✓ | PK |
| name | text | ✓ | |
| gender | text | | |
| birth_date | date | | |
| phone | text | | |
| email | text | | |
| address | text | | |
| occupation | text | | |
| photo_url | text | | |
| notes | text | | |
| is_special_care | bool | ✓ | |
| marital_status | text | | |
| marriage_date | date | | |
| created_at / updated_at | timestamptz | ✓ | |

## 2. member_church_info (교회 정보, 회원당 1행)

`id`(PK), `member_id` → members.id (CASCADE), `record_number`, `baptism_date`, `priesthood`, `current_calling text[]`, `previous_callings`, `ministry_target`, `temple_recommend bool`, `bishop_interview_date`, `stake_president_interview_date`, `sunday_school_class`, `missionary_work`, `created_at`, `updated_at`.

## 3. member_family (회원의 가족 메모)

`id`(PK), `member_id` → members.id (CASCADE), `name`, `relationship`, `phone`, `notes`, `sort_order int`, `created_at`.

## 4. member_notes (회원 메모)

`id`(PK), `member_id` → members.id (CASCADE), `note_date date NN`, `content text NN`, `author`, `created_at`.

## 5. member_relations (회원 간 관계, 2-chon)

`id`(PK), `member_id` → members.id (CASCADE), `related_member_id` → members.id (CASCADE), `relation_type` enum `family_relation_type` (spouse/sibling/parent/child) NN, `created_at`.

## 6. families (가족 단위)

`id`(PK), `head_member_id` → members.id (SET NULL), `display_name_override`, `created_at`, `updated_at`.

## 7. family_members (가족↔회원 연결)

`id`(PK), `family_id` → families.id (CASCADE), `member_id` → members.id (CASCADE), `family_role` enum `family_role` NN, `created_at`.

## 8. attendance (출석)

`id`(PK), `member_id` → members.id (CASCADE), `attendance_date date NN`, `is_present bool NN`, `created_at`, `updated_at`.

## 9. attendance_visitors (방문자)

`id`(PK), `attendance_date date NN`, `name text NN`, `phone`, `notes`, `sort_order int NN`, `created_at`, `updated_at`. (FK 없음)

## 10. announcements (공지)

`id`(PK), `title NN`, `content NN`, `event_date`, `created_at`, `updated_at`. (FK 없음)

## 11. calendar_events (일정)

`id`(PK), `event_date date NN`, `title NN`, `description`, `created_at`, `updated_at`. (FK 없음)

## 12. meeting_minutes (회의록)

`id`(PK), `title NN`, `meeting_date date NN`, `category text NN`, `content text NN`, `attendees text`, `created_at`, `updated_at`. (FK 없음)

## 13. org_positions (조직 직책)

`id`(PK), `section NN`, `role NN`, `calling_keyword`, `sort_order int`, `created_at`. (FK 없음)

## 14. teams (청소 팀)

`id`(PK), `code NN`, `name NN`, `is_fixed bool NN`, `sort_order int NN`, `created_at`. (FK 없음)

## 15. team_assignments (가족↔팀 배정)

`id`(PK), `team_id` → teams.id (CASCADE), `family_id` → families.id (CASCADE), `assigned_method` enum NN, `assigned_at`.

## 16. cleaning_schedule (청소 일정)

`id`(PK), `clean_date date NN` (토요일만, 트리거 검증), `team_id` → teams.id (CASCADE), `note`, `created_at`, `updated_at`.

## 17. sacrament_meetings (성찬식)

`id`(PK), `meeting_date date NN`, `event_type text NN`, `event_custom_name`, `created_at`, `updated_at`. (FK 없음)

## 18. sacrament_assignments (성찬식 배정)

`id`(PK), `meeting_id` → sacrament_meetings.id (CASCADE), `role text NN`, `slot int NN`, `member_id` → members.id (SET NULL), `custom_name`, `hymn_number`, `talk_topic`, `talk_content`, `created_at`, `updated_at`.

---

## 외래키 관계도 (요약)

```text
members ─┬─< member_church_info
         ├─< member_family
         ├─< member_notes
         ├─< member_relations (member_id, related_member_id)
         ├─< attendance
         ├─< family_members
         ├─< families.head_member_id (SET NULL)
         └─< sacrament_assignments.member_id (SET NULL)

families ─┬─< family_members
          └─< team_assignments

teams ─┬─< team_assignments
       └─< cleaning_schedule

sacrament_meetings ─< sacrament_assignments
```

FK가 없는 독립 테이블: `announcements`, `calendar_events`, `meeting_minutes`, `org_positions`, `attendance_visitors`, `teams`, `sacrament_meetings`.

> 이 문서는 현재 상태 보고이며 코드/스키마 변경은 없습니다. 변경을 원하시면 알려주세요.
