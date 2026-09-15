-- 迁移 003：把 work_contents.supplementary_notes 里的历史「简历描述版本」展开为
-- resume_descriptions（简历亮点）独立记录。
--
-- 表结构（含 legacy_id 列与唯一约束）由 API 启动时的 Base.metadata.create_all 建立，
-- 本脚本只做数据搬运，因此是一条可重复执行的 INSERT ... ON CONFLICT 语句。
--
-- 执行方式（在仓库根目录，幂等，可重复执行）：
--   docker compose exec -T db psql -U resume -d resume_workbench -v ON_ERROR_STOP=1 \
--     < backend/migrate_003_resume_descriptions.sql
--
-- 核对方式：
--   docker compose exec -T db psql -U resume -d resume_workbench -c \
--     "select count(*) from resume_descriptions;"
--
-- 覆盖的历史形状：
--   1. {"note": "...", "versions": [{id,label,content}]}
--   2. {"note": "...", "descriptions": [{id,label,points:[...]}]}  points 以换行拼接
--   3. 顶层数组 [{id,label,content}]
--   4. 纯文本（非 JSON）→ 单条「默认写法」
-- note 字段不属于简历亮点，保留在原列不迁移；空值与只有 note 的记录不产生行。
--
-- 幂等键：(work_content_id, legacy_id)；纯文本行以 'default' 作为 legacy_id。
-- 位置按 JSON 内的数组顺序从 0 起编号——本脚本面向「该工作内容尚无用例新建亮点」的一次性
-- 回填；重复执行由 ON CONFLICT 保证不产生重复行。
-- 若某行 supplementary_notes 以 { 或 [ 开头但不是合法 JSON，本脚本会直接报错中止，
-- 不会静默跳过（宁可失败也不丢内容）。

WITH parsed AS (
    SELECT wc.id AS work_content_id,
           NULLIF(BTRIM(COALESCE(wc.supplementary_notes, '')), '') AS raw,
           CASE
               WHEN LEFT(NULLIF(BTRIM(COALESCE(wc.supplementary_notes, '')), ''), 1) IN ('{', '[')
                   THEN NULLIF(BTRIM(COALESCE(wc.supplementary_notes, '')), '')::jsonb
           END AS doc
      FROM work_contents wc
),
expanded AS (
    -- 形状 1：versions 数组
    SELECT p.work_content_id,
           COALESCE(NULLIF(BTRIM(entry.item ->> 'id'), ''), 'version-' || entry.ordinality) AS legacy_id,
           COALESCE(NULLIF(BTRIM(entry.item ->> 'label'), ''), '写法 ' || entry.ordinality) AS label,
           COALESCE(entry.item ->> 'content', '') AS content,
           entry.ordinality - 1 AS position
      FROM parsed p
      CROSS JOIN LATERAL jsonb_array_elements(
          CASE WHEN jsonb_typeof(p.doc -> 'versions') = 'array' THEN p.doc -> 'versions' ELSE '[]'::jsonb END
      ) WITH ORDINALITY AS entry(item, ordinality)
     WHERE p.doc IS NOT NULL

    UNION ALL

    -- 形状 2：descriptions 数组（points 拼接为正文）
    SELECT p.work_content_id,
           COALESCE(NULLIF(BTRIM(entry.item ->> 'id'), ''), 'description-' || entry.ordinality),
           COALESCE(NULLIF(BTRIM(entry.item ->> 'label'), ''), '写法 ' || entry.ordinality),
           CASE
               WHEN jsonb_typeof(entry.item -> 'points') = 'array' THEN COALESCE((
                   SELECT string_agg(point, E'\n' ORDER BY point_ordinality)
                     FROM jsonb_array_elements_text(entry.item -> 'points') WITH ORDINALITY AS points(point, point_ordinality)
               ), '')
               WHEN jsonb_typeof(entry.item -> 'content') = 'string' THEN entry.item ->> 'content'
               ELSE ''
           END,
           entry.ordinality - 1
      FROM parsed p
      CROSS JOIN LATERAL jsonb_array_elements(
          CASE WHEN jsonb_typeof(p.doc -> 'descriptions') = 'array' THEN p.doc -> 'descriptions' ELSE '[]'::jsonb END
      ) WITH ORDINALITY AS entry(item, ordinality)
     WHERE p.doc IS NOT NULL

    UNION ALL

    -- 形状 3：顶层数组
    SELECT p.work_content_id,
           COALESCE(NULLIF(BTRIM(entry.item ->> 'id'), ''), 'array-' || entry.ordinality),
           COALESCE(NULLIF(BTRIM(entry.item ->> 'label'), ''), '写法 ' || entry.ordinality),
           COALESCE(entry.item ->> 'content', ''),
           entry.ordinality - 1
      FROM parsed p
      CROSS JOIN LATERAL jsonb_array_elements(
          CASE WHEN jsonb_typeof(p.doc) = 'array' THEN p.doc ELSE '[]'::jsonb END
      ) WITH ORDINALITY AS entry(item, ordinality)
     WHERE p.doc IS NOT NULL

    UNION ALL

    -- 形状 4：纯文本
    SELECT p.work_content_id, 'default', '默认写法', p.raw, 0
      FROM parsed p
     WHERE p.doc IS NULL AND p.raw IS NOT NULL
)
INSERT INTO resume_descriptions (work_content_id, label, content, position, archived, legacy_id, created_at, updated_at)
SELECT e.work_content_id, e.label, e.content, e.position, FALSE, e.legacy_id, NOW(), NOW()
  FROM expanded e
ON CONFLICT (work_content_id, legacy_id) DO NOTHING;
